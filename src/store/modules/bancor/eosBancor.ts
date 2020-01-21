import { VuexModule, action, Module, mutation } from "vuex-class-component";
import {
  ProposedTransaction,
  ProposedConvertTransaction,
  TokenPrice
} from "@/types/bancor";
import { bancorApi } from "@/api/bancor";
import { getTokenBalances } from "@/api/helpers";

interface ViewToken {
  symbol: string;
  name: string;
  price: number;
  liqDepth: number;
  logo: string;
  change24h: number;
  volume24h: number;
  balance?: string;
}

interface TokenPriceExtended extends TokenPrice {
  balance: number;
}

@Module({ namespacedPath: "eosBancor/" })
export class EosBancorModule extends VuexModule {
  tokensList: TokenPrice[] | TokenPriceExtended[] = [];
  usdPrice = 0;

  get tokens(): ViewToken[] {
    // @ts-ignore
    return this.tokensList.map((token: TokenPrice | TokenPriceExtended) => ({
      symbol: token.code,
      name: token.name,
      price: token.price,
      liqDepth: token.liquidityDepth * this.usdPrice,
      logo: token.primaryCommunityImageName,
      change24h: token.change24h,
      volume24h: token.volume24h.USD,
      // @ts-ignore
      balance: token.balance || "0"
    }));
  }

  get token(): (arg0: string) => ViewToken | undefined {
    return (symbolName: string) =>
      this.tokens.find(token => token.symbol == symbolName);
  }

  get backgroundToken(): (arg0: string) => TokenPrice | TokenPriceExtended {
    return (symbolName: string) => {
      const res = this.tokensList.find(token => token.code == symbolName);
      if (!res)
        throw new Error(`Failed to find ${symbolName} on this.tokensList`);
      return res;
    };
  }

  @action async fetchUsdPrice() {
    this.setUsdPrice(Number(await bancorApi.getRate("BNT", "USD")));
  }

  @action async init() {
    const [usdValueOfEth, tokens] = await Promise.all([
      bancorApi.getTokenTicker("ETH"),
      bancorApi.getTokens()
    ]);
    this.setUsdPrice(Number(usdValueOfEth.price));
    this.setTokens(tokens);
  }

  @action async fetchBalances() {
    // @ts-ignore
    const isAuthenticated = this.$store.rootGetters[
      "eosWallet/isAuthenticated"
    ];

    const balances = await getTokenBalances(isAuthenticated);

    this.setTokens(
      // @ts-ignore
      this.tokensList.map((token: any) => {
        // @ts-ignore
        const existingToken = balances.tokens.find(
          balanceObj => balanceObj.symbol == token.code
        );
        return {
          ...token,
          balance: (existingToken && String(existingToken.amount)) || "0"
        };
      })
    );
  }

  @action async convert({
    fromAmount,
    fromSymbol,
    toAmount,
    toSymbol
  }: ProposedConvertTransaction) {
    // @ts-ignore
    const accountName = this.$store.rootState.eosWallet.walletState.auth
      .accountName;
    const [fromObj, toObj] = await Promise.all([
      this.getEosTokenWithDecimals(fromSymbol),
      this.getEosTokenWithDecimals(toSymbol)
    ]);

    const res = await bancorApi.convert({
      fromCurrencyId: fromObj.id,
      toCurrencyId: toObj.id,
      amount: String((fromAmount * Math.pow(10, fromObj.decimals)).toFixed(0)),
      minimumReturn: String(
        (toAmount * 0.98 * Math.pow(10, toObj.decimals)).toFixed(0)
      ),
      ownerAddress: accountName
    });

    const { actions } = res.data[0];
    const txRes = await this.triggerTx(actions);
    return txRes.transaction_id;
  }

  @action async getEosTokenWithDecimals(symbolName: string): Promise<any> {
    const token = this.backgroundToken(symbolName);
    // @ts-ignore
    if (token.decimals) {
      return token;
    } else {
      const detailApiInstance = await bancorApi.getTokenTicker(symbolName);
      this.setTokens(
        // @ts-ignore
        this.tokensList.map(
          (existingToken: TokenPrice | TokenPriceExtended) => ({
            ...existingToken,
            ...(existingToken.code == symbolName && {
              decimals: detailApiInstance.decimals
            })
          })
        )
      );
      return this.getEosTokenWithDecimals(symbolName);
    }
  }

  @action async getReturn({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction) {
    const [fromToken, toToken] = await Promise.all([
      this.getEosTokenWithDecimals(fromSymbol),
      this.getEosTokenWithDecimals(toSymbol)
    ]);

    const reward = await bancorApi.calculateReturn(
      fromToken.id,
      toToken.id,
      String(amount * Math.pow(10, fromToken.decimals))
    );
    return { amount: String(Number(reward) / Math.pow(10, toToken.decimals)) };
  }

  @action async getCost({ fromSymbol, toSymbol, amount }: ProposedTransaction) {
    const [fromToken, toToken] = await Promise.all([
      this.getEosTokenWithDecimals(fromSymbol),
      this.getEosTokenWithDecimals(toSymbol)
    ]);
    const result = await bancorApi.calculateCost(
      fromToken.id,
      toToken.id,
      String(amount * Math.pow(10, toToken.decimals))
    );
    return {
      amount: String(Number(result) / Math.pow(10, fromToken.decimals))
    };
  }

  @action async triggerTx(actions: any[]) {
    // @ts-ignore
    return this.$store.dispatch("eosWallet/tx", actions, { root: true });
  }

  @mutation setTokens(tokens: any) {
    this.tokensList = tokens.map((token: any) => {
      if (token.code == "BNT") {
        return { ...token, decimals: 10 };
      } else {
        return token;
      }
    });
  }

  @mutation setUsdPrice(price: number) {
    this.usdPrice = price;
  }
}

export const eosBancor = EosBancorModule.ExtractVuexModule(EosBancorModule);
