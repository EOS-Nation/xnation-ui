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
  TokenBalanceParam
} from "@/types/bancor";
import { getBalance, getTokenBalances } from "@/api/helpers";
import _ from "lodash";

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
    if (params.cachedOk) {
      const haveAllBalances = params.tokens.every(token =>
        this.balances.find(balance => tokenIsEqual(token, balance))
      );
      if (haveAllBalances) {
        const res = params.tokens.map(
          token => this.balances.find(balance => tokenIsEqual(token, balance))!
        );
        return res;
      }
    }
    const tokenBalances = await getTokenBalances(this.isAuthenticated);
    const equalisedBalances: TokenBalanceReturn[] = tokenBalances.tokens.map(
      token => ({ ...token, balance: token.amount })
    );
    const missedTokens = _.differenceWith(
      params.tokens,
      equalisedBalances,
      tokenIsEqual
    );
    if (missedTokens.length > 0) {
      const missedBalances = await this.fetchBulkBalances(missedTokens);
      const merged = [...equalisedBalances, ...missedBalances];
      this.setTokenBalances(merged);
      return params.tokens.map(
        token => merged.find(balance => tokenIsEqual(token, balance))!
      );
    } else {
      this.setTokenBalances(equalisedBalances);
      return params.tokens.map(
        token =>
          equalisedBalances.find(balance => tokenIsEqual(token, balance))!
      );
    }
  }

  @mutation setTokenBalances(tokens: TokenBalanceReturn[]) {
    const balancesNotBeingUpdated = _.differenceWith(
      this.tokenBalances,
      tokens,
      (a, b) => a.symbol == b.symbol && a.contract == b.contract
    );
    this.tokenBalances = [...balancesNotBeingUpdated, ...tokens];
  }
}

export const eosNetwork = EosNetworkModule.ExtractVuexModule(EosNetworkModule);
