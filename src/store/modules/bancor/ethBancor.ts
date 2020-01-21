import { VuexModule, mutation, action, Module } from "vuex-class-component";
import {
  ProposedTransaction,
  ProposedConvertTransaction
} from "@/types/bancor";
import { ethBancorApi } from "@/api/bancor";
import { getEthRelays, web3 } from "@/api/helpers";
import { getTokenBalancesEthplorer } from "@/api/helpers";
import { vxm } from "@/store";

@Module({ namespacedPath: "ethBancor/" })
export class EthBancorModule extends VuexModule {
  tokensList: any[] = [];
  usdPrice: number = 0;
  relaysList: any[] = [];

  get tokens(): any {
    const ethToken = this.tokensList.find((token: any) => token.code == "ETH")!;
    if (!ethToken) return [];
    // @ts-ignore
    return this.tokensList.map((token: any) => ({
      symbol: token.code,
      name: token.name,
      price: token.price,
      liqDepth: token.liquidityDepth * Number(ethToken.price),
      logo: token.primaryCommunityImageName,
      change24h: token.change24h,
      volume24h: token.volume24h.USD,
      tokenAddress: token.tokenAddress || "",
      balance: token.balance || ""
    }));
  }

  get token(): (arg0: string) => any {
    return (symbolName: string) =>
      this.tokens.find((token: any) => token.symbol == symbolName);
  }

  get backgroundToken(): (arg0: string) => any {
    return (symbolName: string) => {
      const res = this.tokensList.find(token => token.code == symbolName);
      if (!res)
        throw new Error(`Failed to find ${symbolName} on this.tokensList`);
      return res;
    };
  }

  get relay() {
    return (symbolName: string) =>
      this.relays.find((relay: any) => relay.smartTokenSymbol == symbolName);
  }

  get relays() {
    return this.relaysList
      .filter(relay => relay.connectorType == "BNT")
      .map(relay => {
        const ethToken = this.token(relay.symbol)!;
        if (!ethToken) return;
        return {
          reserves: [
            {
              symbol: ethToken.symbol,
              logo: ethToken.logo
            },
            {
              symbol: relay.connectorType,
              logo: this.token(relay.connectorType)!.logo
            }
          ],
          owner: relay.owner,
          fee: relay.conversionFee,
          decimals: relay.tokenDecimals,
          symbol: relay.symbol,
          smartTokenSymbol: relay.smartTokenSymbol,
          converterAddress: relay.converterAddress,
          smartTokenAddress: relay.smartTokenAddress,
          tokenAddress: relay.tokenAddress,
          meta: { ...relay },
          // @ts-ignore
          liqDepth: ethToken.liqDepth
        };
      })
      .filter(relay => !!relay);
  }

  @action async fetchUsdPrice() {
    this.setUsdPrice(Number(await ethBancorApi.getRate("BNT", "USD")));
  }

  @mutation setUsdPrice(price: number) {
    this.usdPrice = price;
  }

  @action async triggerTx(actions: any[]) {
    // @ts-ignore
    return this.$store.dispatch("ethWallet/tx", actions, { root: true });
  }

  @action async init() {
    const [tokens, relays] = await Promise.all([
      ethBancorApi.getTokens(),
      getEthRelays(),
      this.fetchUsdPrice()
    ]);
    this.setRelaysList(relays);
    const tokensWithAddresses = tokens.map(token => ({
      ...token,
      tokenAddress:
        relays.find(relay => relay.symbol == token.code) &&
        relays.find(relay => relay.symbol == token.code)!.tokenAddress
    }));
    this.setTokensList(tokensWithAddresses);
  }

  @action async focusSymbol(symbolName: string) {
    // @ts-ignore
    const isAuthenticated = this.$store.rootGetters[
      "ethWallet/isAuthenticated"
    ];
    if (!isAuthenticated) return;
    const token = this.token(symbolName);
    if (!token.balance) {
      const balance = await vxm.ethWallet.getBalance({
        accountHolder: isAuthenticated,
        tokenContractAddress: token.tokenAddress
      });
      this.updateBalance([symbolName, balance]);
    }
  }

  @mutation updateBalance([symbolName, balance]: [string, string]) {
    this.tokensList = this.tokensList.map(token =>
      token.code == symbolName ? { ...token, balance } : token
    );
  }

  @mutation resetBalances() {
    this.tokensList = this.tokensList.map(token => ({
      ...token,
      balance: undefined
    }));
  }

  @action async fetchBalances(symbols: string[]) {
    this.resetBalances();
    if (symbols) {
      symbols.forEach(symbol => this.focusSymbol(symbol));
    }
  }

  @mutation setTokensList(tokens: any) {
    this.tokensList = tokens;
  }

  @mutation setRelaysList(relaysList: any) {
    this.relaysList = relaysList;
  }

  @action async convert({
    fromSymbol,
    toSymbol,
    fromAmount,
    toAmount
  }: ProposedConvertTransaction) {
    const fromObj = this.backgroundToken(fromSymbol);
    const toObj = this.backgroundToken(toSymbol);

    const fromAmountWei = web3.utils.toWei(String(fromAmount));
    const toAmountWei = web3.utils.toWei(String(toAmount));
    const minimumReturnWei = String((Number(toAmountWei) * 0.98).toFixed(0));

    // @ts-ignore
    const ownerAddress = this.$store.rootGetters["ethWallet/isAuthenticated"];
    const convertPost = {
      fromCurrencyId: fromObj.id,
      toCurrencyId: toObj.id,
      amount: fromAmountWei,
      minimumReturn: minimumReturnWei,
      ownerAddress
    };
    const res = await ethBancorApi.convert(convertPost);
    if (res.errorCode) {
      throw new Error(res.errorCode);
    }
    const params = res.data;
    const txRes = await this.triggerTx(params[0]);
    return txRes;
  }

  @action async getReturn({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction) {
    const fromSymbolApiInstance = this.backgroundToken(fromSymbol);
    const toSymbolApiInstance = this.backgroundToken(toSymbol);
    const [fromTokenDecimals, toTokenDecimals] = await Promise.all([
      this.getDecimals(fromSymbolApiInstance.id),
      this.getDecimals(toSymbolApiInstance.id)
    ]);
    const result = await ethBancorApi.calculateReturn(
      fromSymbolApiInstance.id,
      toSymbolApiInstance.id,
      String(amount * Math.pow(10, fromTokenDecimals))
    );
    return {
      amount: String(Number(result) / Math.pow(10, toTokenDecimals))
    };
  }

  @action async getCost({ fromSymbol, toSymbol, amount }: ProposedTransaction) {
    const fromSymbolApiInstance = this.backgroundToken(fromSymbol);
    const toSymbolApiInstance = this.backgroundToken(toSymbol);
    const [fromTokenDetail, toTokenDetail] = await Promise.all([
      this.getDecimals(fromSymbolApiInstance.id),
      this.getDecimals(toSymbolApiInstance.id)
    ]);
    const result = await ethBancorApi.calculateCost(
      fromSymbolApiInstance.id,
      toSymbolApiInstance.id,
      String(amount * Math.pow(10, toTokenDetail.decimals))
    );
    return {
      amount: String(Number(result) / Math.pow(10, fromTokenDetail.decimals))
    };
  }

  @mutation updateEthToken(token: any) {
    this.tokensList = this.tokensList.map((existingToken: any) =>
      token.id == existingToken.id ? token : existingToken
    );
  }

  @action async getDecimals(symbolId: string) {
    const existingDecimals = this.tokensList.find(
      (token: any) => token.id == symbolId && token.decimals
    );
    if (existingDecimals) {
      return existingDecimals.decimals;
    } else {
      const res = await ethBancorApi.getTokenTicker(symbolId);
      const existingToken = this.tokensList.find(
        (existingToken: any) => existingToken.id == symbolId
      );
      this.updateEthToken({
        ...existingToken,
        decimals: res.decimals
      });
      return res.decimals;
    }
  }
}

export const ethBancor = EthBancorModule.ExtractVuexModule(EthBancorModule);
