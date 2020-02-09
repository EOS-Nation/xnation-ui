import { VuexModule, mutation, action, Module } from "vuex-class-component";
import {
  ProposedTransaction,
  ProposedConvertTransaction
} from "@/types/bancor";
import { ethBancorApi } from "@/api/bancor";
import {
  getEthRelays,
  web3,
  Relay,
  Token,
  fetchReserveBalance
} from "@/api/helpers";
import { ABIConverter } from "@/api/ethConfig";

import { vxm } from "@/store";

const getPoolReserveToken = (
  relay: Relay,
  networkSymbols = ["BNT", "USDB"]
) => {
  return (
    relay.reserves.find(reserve =>
      networkSymbols.every(networkSymbol => reserve.symbol !== networkSymbol)
    ) || relay.reserves[0]
  );
};

@Module({ namespacedPath: "ethBancor/" })
export class EthBancorModule extends VuexModule {
  tokensList: any[] = [];
  usdPrice: number = 0;
  relaysList: Relay[] = [];
  tokenBalances: { symbol: string; balance: string }[] = [];

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
    return (symbolName: string) => {
      const bancorApiToken = this.tokens.find(
        (token: any) => token.symbol == symbolName
      );
      if (bancorApiToken) return bancorApiToken;

      const reserve = this.relaysList
        .find(relay =>
          relay.reserves.some(reserve => reserve.symbol == symbolName)
        )!
        .reserves.find(reserve => reserve.symbol == symbolName)!;

      return {
        ...reserve,
        tokenAddress: reserve.contract,
        logo: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${reserve.contract}/logo.png`,
        balance:
          (this.tokenBalances.find(balance => balance.symbol == symbolName) &&
            this.tokenBalances.find(balance => balance.symbol == symbolName)!
              .balance) ||
          ""
      };
    };
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
    const relays = this.relaysList.map(relay => {
      const reserveToken = getPoolReserveToken(relay);
      const reserveTokenMeta = this.token(reserveToken.symbol);
      const networkTokenIsBnt = relay.reserves.some(
        reserve =>
          reserve.contract == "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c"
      );
      return {
        reserves: relay.reserves.map(reserve => ({
          symbol: reserve.symbol,
          logo: [
            this.token(reserve.symbol) && this.token(reserve.symbol).logo,
            `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${reserveToken.contract}/logo.png`,
            "https://via.placeholder.com/50"
          ].filter(Boolean)
        })),
        owner: relay.owner,
        fee: relay.fee,
        decimals: reserveToken.decimals,
        symbol: reserveToken.symbol,
        smartTokenSymbol: relay.smartToken.symbol,
        converterAddress: relay.contract,
        smartTokenAddress: relay.smartToken.contract,
        tokenAddress: getPoolReserveToken(relay).contract,
        version: relay.version,
        liqDepth:
          relay.liqDepth ||
          (networkTokenIsBnt && reserveTokenMeta && reserveTokenMeta.liqDepth)
      };
    });
    // .filter(relay => relay.liqDepth);

    const duplicated = relays
      .map(relay => relay.smartTokenSymbol)
      .filter(
        (smartTokenSymbol, index, array) =>
          array.indexOf(smartTokenSymbol) !== index
      );

    console.log(
      relays.every(relay => relay.reserves.every(reserve => reserve.symbol))
    );

    return relays.filter(relay =>
      duplicated.every(dup => dup !== relay.smartTokenSymbol)
    );
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
      ...(relays.find((relay: Relay) =>
        relay.reserves.find(reserve => reserve.symbol == token.code)
      ) && {
        tokenAddress: relays
          .find((relay: Relay) =>
            relay.reserves.find(reserve => reserve.symbol == token.code)
          )!
          .reserves.find(reserve => reserve.symbol == token.code)!.contract
      })
    }));

    const relaysNotTrackedOnApi = relays.filter(
      relay =>
        !tokens.find(token => token.code == getPoolReserveToken(relay).symbol)
    );
    this.fetchLiquidityDepths(relaysNotTrackedOnApi);

    this.setTokensList(tokensWithAddresses);
  }

  @action async fetchLiquidityDepths(relays: Relay[]) {
    const relaysCaredAbout = relays.sort((a, b) =>
      a.reserves.some(reserve => reserve.symbol.includes("USD")) ? -1 : 1
    );
    const newRelays: Relay[] = await Promise.all(
      relaysCaredAbout.map(async relay => {
        try {
          const [balance, networkReserveSymbol] = await this.getNetworkReserve(
            relay
          );
          const liqDepthN = networkReserveSymbol == "BNT" ? this.usdPrice : 1;
          const liqDepth = String(
            liqDepthN * Number(web3.utils.fromWei(balance))
          );
          return {
            ...relay,
            liqDepth
          };
        } catch (e) {
          console.log(
            "Failed fetching",
            relay.reserves.map(x => x.symbol),
            e
          );
          return relay;
        }
      })
    );

    const allRelays = [
      ...newRelays.filter(x => x.liqDepth),
      ...this.relaysList
    ].filter(
      (item, index, arr) =>
        arr.findIndex(x => x.smartToken == item.smartToken) == index
    );
    this.setRelaysList(allRelays.filter(Boolean));

    // for (const relay in relaysCaredAbout) {
    //   const x = relaysCaredAbout[relay];
    // const liqDepthN = x.smartToken.symbol == "BNT" ? this.usdPrice : 1;
    // const liqDepth = String(liqDepthN * Number(web3.utils.fromWei(balance)));
    //   const relays = this.relaysList.map(relay =>
    //     relay.smartToken.symbol == x.smartToken.symbol
    //       ? { ...relay, liqDepth }
    //       : relay
    //   );
    //   this.setRelaysList(relays);
    // }
  }

  @action async getNetworkReserve(relay: Relay) {
    const converterContract = new web3.eth.Contract(
      // @ts-ignore
      ABIConverter,
      relay.contract
    );
    const tokenReserve = getPoolReserveToken(relay);
    const networkReserve = relay.reserves.find(
      reserve => reserve.symbol !== tokenReserve.symbol
    )!;

    const reserveBalance = await fetchReserveBalance(
      converterContract,
      networkReserve.contract,
      relay.version
    );
    return [reserveBalance, networkReserve.symbol];
  }

  @action async focusSymbol(symbolName: string) {
    // @ts-ignore
    const isAuthenticated = this.$store.rootGetters[
      "ethWallet/isAuthenticated"
    ];
    if (!isAuthenticated) return;
    const token = this.token(symbolName);
    console.log(token, "was the token for focus symbol");
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
    const newBalances = this.tokenBalances.filter(
      balance => balance.symbol !== symbolName
    );
    newBalances.push({ symbol: symbolName, balance });
    this.tokenBalances = newBalances;
  }

  @mutation resetBalances() {
    this.tokensList = this.tokensList.map(token => ({
      ...token,
      balance: undefined
    }));
  }

  @action async refreshBalances(symbols: string[]) {
    this.resetBalances();
    if (symbols) {
      symbols.forEach(symbol => this.focusSymbol(symbol));
    }
  }

  @mutation setTokensList(tokens: any) {
    this.tokensList = tokens;
  }

  @mutation setRelaysList(relaysList: Relay[]) {
    this.relaysList = relaysList.sort((a, b) =>
      this.tokensList.find(token =>
        a.reserves.find(reserve => reserve.symbol == token.code)
      )
        ? -1
        : 1
    );
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
