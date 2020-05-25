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
  TransferParam,
  TokenBalance
} from "@/types/bancor";
import { getBalance, getTokenBalances, compareString } from "@/api/helpers";
import { vxm } from "@/store";

import _ from "lodash";
import { multiContract } from "@/api/multiContractTx";
import wait from "waait";

const compareToken = (
  a: TokenBalanceParam | TokenBalanceReturn,
  b: TokenBalanceParam | TokenBalanceReturn
) => compareString(a.contract, b.contract) && compareString(a.symbol, b.symbol);

const tokenBalanceToTokenBalanceReturn = (
  token: TokenBalance
): TokenBalanceReturn => ({ ...token, balance: token.amount });

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
    return new Promise(async (resolve, reject) => {
      for (let i = 0; i < maxPings; i++) {
        const newBalanceArray = await this.getBalances({
          tokens: originalBalances,
          disableSetting: true
        });
        const allBalancesDifferent = originalBalances.every(
          balance =>
            newBalanceArray.find(b => compareString(b.symbol, balance.symbol))!
              .balance !== balance.balance
        );
        if (allBalancesDifferent) {
          console.log(
            newBalanceArray.map(x => [x.balance, x.symbol].join(" ")),
            "balance has changed!",
            originalBalances.map(x => [x.balance, x.symbol].join(" "))
          );
          this.updateTokenBalances(newBalanceArray);
          break;
        } else {
          console.log(
            "Balance has not updated yet, trying again in",
            interval,
            "milliseconds",
            "as attempt #",
            i
          );
          await wait(interval);
        }
      }
      resolve();
    });
  }

  @action async transfer({ to, amount, id, memo }: TransferParam) {
    const symbol = id;
    const dirtyReserve = vxm.eosBancor.relaysList
      .flatMap(relay => relay.reserves)
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
    if (!this.isAuthenticated) return [];
    if (!params) {
      const tokenBalances = await getTokenBalances(this.isAuthenticated);
      const equalisedBalances: TokenBalanceReturn[] = tokenBalances.tokens.map(
        tokenBalanceToTokenBalanceReturn
      );
      this.updateTokenBalances(equalisedBalances);
      return equalisedBalances;
    }

    const tokens = _.uniqWith(params.tokens, compareToken);

    if (params.slow) {
      const bulkTokens = await getTokenBalances(this.isAuthenticated);
      const equalisedBalances = bulkTokens.tokens.map(
        tokenBalanceToTokenBalanceReturn
      );
      this.updateTokenBalances(equalisedBalances);
      const missedTokens = _.differenceWith(
        tokens,
        equalisedBalances,
        compareToken
      );
      const remainingBalances = await this.fetchBulkBalances(missedTokens);
      this.updateTokenBalances(remainingBalances);
      return [...equalisedBalances, ...remainingBalances].filter(balance =>
        tokens.some(token => compareToken(balance, token))
      );
    }

    const [directTokens, bonusTokens] = await Promise.all([
      this.fetchBulkBalances(tokens),
      getTokenBalances(this.isAuthenticated).catch(() => ({
        tokens: [] as TokenBalance[]
      }))
    ]);

    const equalisedBalances: TokenBalanceReturn[] = bonusTokens.tokens.map(
      tokenBalanceToTokenBalanceReturn
    );
    const merged = _.uniqWith(
      [...directTokens, ...equalisedBalances],
      compareToken
    );
    if (!params.disableSetting) {
      this.updateTokenBalances(merged);
    }
    return directTokens;
  }

  @mutation updateTokenBalances(tokens: TokenBalanceReturn[]) {
    this.tokenBalances = _.uniqWith(
      [...tokens, ...this.tokenBalances],
      compareToken
    );
  }
}

export const eosNetwork = EosNetworkModule.ExtractVuexModule(EosNetworkModule);
