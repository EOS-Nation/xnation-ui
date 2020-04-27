import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from "vuex-class-component";
import {
  NetworkModule,
  TokenBalanceReturn,
  GetBalanceParam,
  TokenBalanceParam,
  TransferParam
} from "@/types/bancor";
import { getBalance, getTokenBalances, compareString } from "@/api/helpers";
import { vxm } from "@/store";

import _ from "lodash";
import { multiContract } from "@/api/multiContractTx";
import wait from "waait";

const tokenProps = ["contract", "symbol"];

const tokenIsEqual = (
  a: TokenBalanceParam | TokenBalanceReturn,
  b: TokenBalanceParam | TokenBalanceReturn
) => _.isEqual(_.pick(a, tokenProps), _.pick(b, tokenProps));

@Module({ namespacedPath: "eosNetwork/" })
export class EosNetworkModule extends VuexModule implements NetworkModule {
  tokenBalances: TokenBalanceReturn[] = [];

  get balances() {
    return this.tokenBalances;
  }

  get balance() {
    return ({ contract, symbol }: { contract: string; symbol: string }) => {
      return this.balances.find(
        x => x.symbol == symbol && x.contract == contract
      );
    };
  }

  get isAuthenticated() {
    // @ts-ignore
    return this.$store.rootGetters["eosWallet/isAuthenticated"];
  }

  get networkId() {
    return "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906";
  }

  get protocol() {
    return "eosio";
  }

  @action async pingTillChange({
    originalBalances,
    maxPings = 20,
    interval = 1000
  }: {
    originalBalances: TokenBalanceReturn[];
    maxPings?: number;
    interval?: number;
  }) {
    return Promise.all(
      originalBalances.map(
        async originalBalance =>
          new Promise(async (resolve, reject) => {
            for (var i = 0; i < maxPings; i++) {
              let newBalanceArray = await this.getBalances({
                tokens: [originalBalance]
              });
              let newBalance = newBalanceArray.find(balance =>
                compareString(balance.symbol, originalBalance.symbol)
              )!;
              if (newBalance.balance !== originalBalance.balance) {
                console.log(
                  newBalance.symbol,
                  "balance has changed!",
                  newBalance.balance,
                  originalBalance.balance
                );
                break;
              } else {
                console.log(
                  newBalance.symbol,
                  "has not changed, trying again in",
                  interval,
                  "milliseconds"
                );
                await wait(interval);
              }
            }
            resolve();
          })
      )
    );
  }

  @action async transfer({ to, amount, id, memo }: TransferParam) {
    const symbol = id;
    const dirtyReserve = vxm.eosBancor.relaysList
      .map(relay => relay.reserves)
      .flat(1)
      .find(reserve => compareString(reserve.symbol, symbol));
    if (!dirtyReserve) throw new Error("Failed finding dirty reserve");

    const { contract, precision } = dirtyReserve;

    const actions = await multiContract.tokenTransfer(contract, {
      to,
      quantity: `${String(Number(amount).toFixed(precision))} ${symbol}`,
      memo
    });

    const originalBalances = await this.getBalances({
      tokens: [{ contract, symbol }]
    });
    await vxm.eosWallet.tx(actions);
    this.pingTillChange({ originalBalances });
  }

  @action async fetchBulkBalances(
    tokens: GetBalanceParam["tokens"]
  ): Promise<TokenBalanceReturn[]> {
    const balances = await Promise.all(
      tokens.map(async token => {
        const balance = await getBalance(token.contract, token.symbol);
        return { ...token, balance: Number(balance.split(" ")[0]) };
      })
    );
    return balances;
  }

  @action public async getBalances(params?: GetBalanceParam) {
    if (!params) {
      const tokenBalances = await getTokenBalances(this.isAuthenticated);
      const equalisedBalances: TokenBalanceReturn[] = tokenBalances.tokens.map(
        token => ({ ...token, balance: token.amount })
      );
      return equalisedBalances;
    }

    const [directTokens, bonusTokens] = await Promise.all([
      this.fetchBulkBalances(params.tokens),
      getTokenBalances(this.isAuthenticated)
    ]);

    const equalisedBalances: TokenBalanceReturn[] = bonusTokens.tokens.map(
      token => ({ ...token, balance: token.amount })
    );
    const merged = _.uniqWith(
      [...directTokens, ...equalisedBalances],
      (a, b) =>
        compareString(a.contract, b.contract) &&
        compareString(b.symbol, b.symbol)
    );
    this.updateTokenBalances(merged);
    return directTokens;
  }

  @mutation updateTokenBalances(tokens: TokenBalanceReturn[]) {
    const balancesNotBeingUpdated = _.differenceWith(
      this.tokenBalances,
      tokens,
      (a, b) =>
        compareString(a.symbol, b.symbol) &&
        compareString(a.contract, b.contract)
    );
    this.tokenBalances = [...balancesNotBeingUpdated, ...tokens];
  }
}

export const eosNetwork = EosNetworkModule.ExtractVuexModule(EosNetworkModule);
