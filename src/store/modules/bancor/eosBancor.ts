import { VuexModule, action, Module, mutation } from "vuex-class-component";
import {
  ProposedTransaction,
  ProposedConvertTransaction,
  TokenPrice,
  TradingModule,
  LiquidityModule,
  TokenPriceExtended,
  ViewToken,
  ConvertReturn,
  LiquidityParams,
  OpposingLiquidParams,
  OpposingLiquid,
  EosMultiRelay,
  AgnosticToken
} from "@/types/bancor";
import { bancorApi } from "@/api/bancor";
import {
  getTokenBalances,
  fetchRelays,
  getBalance,
  fetchTokenStats,
  fetchTokenMeta
} from "@/api/helpers";
import { Symbol, split, double_to_asset } from "eos-common";
import { tableApi } from "@/api/TableWrapper";
import { multiContract } from "@/api/multiContractTx";
import { multiContractAction } from "@/contracts/multi";
import { vxm } from "@/store";


@Module({ namespacedPath: "eosBancor/" })
export class EosBancorModule extends VuexModule
  implements TradingModule, LiquidityModule {
  tokensList: TokenPrice[] | TokenPriceExtended[] = [];
  relaysList: EosMultiRelay[] = [];
  usdPrice = 0;

  get wallet() {
    return "eos";
  }

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
      balance: token.balance || "0",
      // @ts-ignore
      ...(token.contract && { contract: token.contract })
    }));
  }

  // @ts-ignore
  get token(): (arg0: string) => ViewToken {
    // @ts-ignore
    return (symbolName: string) => {
      const token = this.tokens.find(token => token.symbol == symbolName);
      if (!token) {
        console.warn("Failed finding token", symbolName)
        return { symbol: symbolName, logo: 'https://via.placeholder.com/50'}
      }
      return token;
    };
  }

  get backgroundToken(): (arg0: string) => TokenPrice | TokenPriceExtended {
    return (symbolName: string) => {
      const res = this.tokensList.find(token => token.code == symbolName);
      if (!res)
        throw new Error(`Failed to find ${symbolName} on this.tokensList`);
      return res;
    };
  }

  get relay() {
    return (symbolName: string) => {
      const relay = this.relays.find(
        (relay: any) => relay.smartTokenSymbol == symbolName
      );
      if (!relay)
        throw new Error(`Failed to find relay with ID of ${symbolName}`);
      return relay;
    };
  }

  get relays() {
    return this.relaysList.map(relay => ({
      ...relay,
      symbol: relay.reserves.find(reserve => reserve.symbol !== "BNT")!.symbol,
      smartTokenSymbol: relay.smartToken.symbol,
      liqDepth: 4,
      reserves: relay.reserves.map((reserve: AgnosticToken) => ({
        ...reserve,
        logo: [this.token(reserve.symbol).logo]
      }))
    }));
  }

  @action async fetchUsdPrice() {
    this.setUsdPrice(Number(await bancorApi.getRate("BNT", "USD")));
  }

  @action async init() {
    const [usdValueOfEth, tokens, relays]: [
      any,
      any,
      EosMultiRelay[]
    ] = await Promise.all([
      bancorApi.getTokenTicker("ETH"),
      bancorApi.getTokens(),
      fetchRelays(),
    ]);
    this.setUsdPrice(Number(usdValueOfEth.price));
    this.setTokens(tokens);
    this.refreshBalances();
    this.setRelays(relays);
  }

  @action async refreshBalances(symbols: string[] = []) {
    // @ts-ignore
    const isAuthenticated = this.$store.rootGetters[
      "eosWallet/isAuthenticated"
    ];
    if (!isAuthenticated) return;
    const balances = await getTokenBalances(isAuthenticated);

    this.setTokens(
      // @ts-ignore
      this.tokensList.map((token: any) => {
        const existingToken = balances.tokens.find(
          balanceObj => balanceObj.symbol == token.code
        );
        return {
          ...token,
          balance: (existingToken && String(existingToken.amount)) || "0",
          ...(existingToken && { contract: existingToken.contract })
        };
      })
    );
  }

  @action async addLiquidity({
    fundAmount,
    smartTokenSymbol,
    token1Amount,
    token1Symbol,
    token2Amount,
    token2Symbol
  }: LiquidityParams) {
    const relay = this.relay(smartTokenSymbol);
    const deposits = [
      { symbol: token1Symbol, amount: token1Amount },
      { symbol: token2Symbol, amount: token2Amount }
    ];
    const tokenAmounts = deposits.map(deposit => {
      const { precision, contract, symbol } = relay.reserves.find(
        reserve => reserve.symbol == deposit.symbol
      )!;
      return {
        contract,
        amount: double_to_asset(
          Number(deposit.amount),
          new Symbol(symbol, precision)
        )
      };
    });

    const addLiquidityActions = multiContract.addLiquidityActions(
      smartTokenSymbol,
      // @ts-ignore
      tokenAmounts
    );
    const fundAction = multiContractAction.fund(
      vxm.wallet.isAuthenticated,
      double_to_asset(
        Number(fundAmount),
        new Symbol(smartTokenSymbol, 4)
      ).to_string()
    );

    const actions = [...addLiquidityActions, fundAction]
    return this.triggerTx(actions);
  }

  @action async removeLiquidity({
    fundAmount,
    smartTokenSymbol
  }: LiquidityParams) {}

  @action async getUserBalances(symbolName: string) {
    const relay = this.relay(symbolName);
    const [
      token1Balance,
      token2Balance,
      smartTokenBalance,
      [token1, token2],
      supply
    ] = await Promise.all([
      getBalance(relay.reserves[0].contract, relay.reserves[0].symbol),
      getBalance(relay.reserves[1].contract, relay.reserves[1].symbol),
      getBalance(relay.smartToken.contract, relay.smartToken.symbol),
      tableApi.getReservesMulti(symbolName),
      fetchTokenStats(relay.smartToken.contract, symbolName)
    ]);

    const smartSupply = supply.supply.to_double();
    const token1ReserveBalance = token1.balance.to_double();
    const token2ReserveBalance = token2.balance.to_double();
    console.log({ smartTokenBalance, symbolName, relay })
    const percent = split(smartTokenBalance).to_double() / smartSupply;
    const token1MaxWithdraw = percent * token1ReserveBalance;
    const token2MaxWithdraw = percent * token2ReserveBalance;

    return {
      token1MaxWithdraw: `${token1MaxWithdraw}`,
      token2MaxWithdraw: `${token2MaxWithdraw}`,
      token1Balance: token1Balance.split(" ")[0],
      token2Balance: token2Balance.split(" ")[0],
      smartTokenBalance
    };
  }

  @action async calculateOpposingDeposit(
    suggestedDeposit: OpposingLiquidParams
  ): Promise<OpposingLiquid> {
    const relay = this.relay(suggestedDeposit.smartTokenSymbol);
    const [tokenReserves, supply] = await Promise.all([
      tableApi.getReservesMulti(suggestedDeposit.smartTokenSymbol),
      fetchTokenStats(
        relay.smartToken.contract,
        suggestedDeposit.smartTokenSymbol
      )
    ]);

    const smartSupply = supply.supply.to_double();

    const sameReserve = tokenReserves.find(
      reserve =>
        reserve.balance.symbol.code().to_string() ==
        suggestedDeposit.tokenSymbol
    )!;
    const opposingReserve = tokenReserves.find(
      reserve =>
        reserve.balance.symbol.code().to_string() !==
        suggestedDeposit.tokenSymbol
    )!;

    const reserveBalance = sameReserve.balance.to_double();
    const percent = Number(suggestedDeposit.tokenAmount) / reserveBalance;

    return {
      opposingAmount: String(percent * opposingReserve.balance.to_double()),
      smartTokenAmount: String(percent * smartSupply)
    };
  }

  @action async calculateOpposingWithdraw(
    suggestWithdraw: OpposingLiquidParams
  ): Promise<OpposingLiquid> {
    const relay = this.relay(suggestWithdraw.smartTokenSymbol);
    const [tokenReserves, supply, smartUserBalanceString] = await Promise.all([
      tableApi.getReservesMulti(suggestWithdraw.smartTokenSymbol),
      fetchTokenStats(
        relay.smartToken.contract,
        suggestWithdraw.smartTokenSymbol
      ),
      getBalance(relay.smartToken.contract, relay.smartToken.symbol) as Promise<
        string
      >
    ]);
    const smartUserBalance = split(smartUserBalanceString);
    const smartSupply = supply.supply.to_double();
    const sameReserve = tokenReserves.find(
      reserve =>
        reserve.balance.symbol.code().to_string() == suggestWithdraw.tokenSymbol
    )!;
    const opposingReserve = tokenReserves.find(
      reserve =>
        reserve.balance.symbol.code().to_string() !==
        suggestWithdraw.tokenSymbol
    )!;

    const reserveBalance = sameReserve.balance.to_double();
    const percent = Number(suggestWithdraw.tokenAmount) / reserveBalance;

    const smartTokenAmount = percent * smartSupply;

    return {
      opposingAmount: String(percent * opposingReserve.balance.to_double()),
      smartTokenAmount:
        smartTokenAmount / smartUserBalance.to_double() > 0.99
          ? String(smartUserBalance.to_double())
          : String(smartTokenAmount)
    };
  }

  // Focus Symbol is called when the UI focuses on a Symbol
  // Should have token balances
  // Could be an oppurtunity to get precision
  @action async focusSymbol(symbolName: string) {}

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
  }: ProposedTransaction): Promise<ConvertReturn> {
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

  @action async getCost({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction): Promise<ConvertReturn> {
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

  @mutation setRelays(relays: EosMultiRelay[]) {
    this.relaysList = relays;
  }

  @mutation setTokens(tokens: any[]) {
    this.tokensList = tokens.map((token: any) => {
      if (token.code == "BNT") {
        return { ...token, decimals: 10 };
      } else {
        return token;
      }
    })
  }

  @mutation setUsdPrice(price: number) {
    this.usdPrice = price;
  }
}

export const eosBancor = EosBancorModule.ExtractVuexModule(EosBancorModule);
