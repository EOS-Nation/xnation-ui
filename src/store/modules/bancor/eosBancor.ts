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
  AgnosticToken,
  CreatePoolModule,
  ModalChoice,
  NetworkChoice,
  TokenBalances,
  FeeParams,
  NewOwnerParams
} from "@/types/bancor";
import { bancorApi } from "@/api/bancor";
import {
  getTokenBalances,
  fetchRelays,
  getBalance,
  fetchTokenStats
} from "@/api/helpers";
import {
  Sym as Symbol,
  Asset,
  asset_to_number,
  number_to_asset,
  asset,
  Sym,
  symbol
} from "eos-common";
import { tableApi } from "@/api/TableWrapper";
import { multiContract } from "@/api/multiContractTx";
import { multiContractAction } from "@/contracts/multi";
import { vxm } from "@/store";
import axios, { AxiosResponse } from "axios";
import { rpc } from "@/api/rpc";
import { client } from "@/api/dFuse";
import {
  calculateReturn,
  findCost,
  relaysToConvertPaths,
  composeMemo,
  ConvertPath,
  createPath,
  DryRelay,
  HydratedRelay,
  findReturn
} from "@/api/bancorCalc";

enum ConvertType {
  API,
  Multi,
  APItoMulti,
  MultiToApi
}

export interface ViewTokenMinusLogo {
  symbol: string;
  name: string;
  price: number;
  liqDepth: number;
  logo: string;
  change24h: number;
  volume24h: number;
  balance?: string;
}

const relayToToken = ({
  relay,
  tokenSymbol,
  bntPrice
}: {
  relay: EosMultiRelay;
  tokenSymbol: string;
  bntPrice: number;
}): ViewTokenMinusLogo => {
  const networkTokenIndex = relay.reserves.findIndex(
    reserve => reserve.symbol == "BNT" || reserve.symbol == "USDB"
  )!;
  const tokenIndex = relay.reserves.findIndex(
    reserve => reserve.symbol == tokenSymbol
  );
  const networkTokenIsBnt = relay.reserves[networkTokenIndex].symbol == "BNT";
  const { symbol, precision, contract } = relay.reserves[tokenIndex];
  const liqDepth =
    relay.reserves[networkTokenIndex].amount *
    (networkTokenIsBnt ? bntPrice : 1);

  const networkToken = relay.reserves[networkTokenIndex];
  const token = relay.reserves[tokenIndex];
  const tokenSymbolInit = new Symbol(token.symbol, token.precision);

  let price;
  try {
    const { reward } = calculateReturn(
      number_to_asset(token.amount, tokenSymbolInit),
      number_to_asset(
        networkToken.amount,
        new Symbol(networkToken.symbol, networkToken.precision)
      ),
      number_to_asset(1, tokenSymbolInit)
    );
    price = asset_to_number(reward) * (networkTokenIsBnt ? bntPrice : 1);
  } catch (e) {
    price = 0;
  }

  return {
    symbol,
    name: symbol,
    price,
    liqDepth,
    change24h: 0,
    volume24h: 0,
    balance: "0",
    // @ts-ignore
    source: "multi",
    precision,
    contract
  };
};

const relayToTokens = (relay: EosMultiRelay, bntPrice: number) => {
  return relay.reserves.map(reserve =>
    relayToToken({ relay, tokenSymbol: reserve.symbol, bntPrice })
  );
};

const arraysContainBoth = (searchString: string, arr: string[][]) =>
  arr.every(array => array.includes(searchString));

const determineConvertType = (sources: string[][]): ConvertType => {
  const [token1Sources, token2Sources] = sources;
  if (arraysContainBoth("multi", sources)) return ConvertType.Multi;
  else if (arraysContainBoth("api", sources)) return ConvertType.API;
  else if (token1Sources.includes("api") && token2Sources.includes("multi"))
    return ConvertType.APItoMulti;
  else if (token1Sources.includes("multi") && token2Sources.includes("api"))
    return ConvertType.MultiToApi;
  else throw new Error("Failed to determine the conversion type");
};

const getEosioTokenPrecision = async (
  symbol: string,
  contract: string
): Promise<number> => {
  const res = await rpc.get_table_rows({
    code: contract,
    table: "stat",
    scope: symbol
  });
  if (res.rows.length == 0) throw new Error("Failed to find token");
  return res.rows[0].supply.split(" ")[0].split(".")[1].length;
};

const chopSecondSymbol = (one: string, two: string, maxLength = 8) => {
  return one + two.slice(0, maxLength - one.length);
};

const chopSecondLastChar = (text: string, backUp: number) => {
  const secondLastIndex = text.length - backUp - 1;
  return text
    .split("")
    .filter((value, index) => index !== secondLastIndex)
    .join("");
};

const tokenStrategies: Array<(one: string, two: string) => string> = [
  chopSecondSymbol,
  (one, two) => chopSecondSymbol(one, chopSecondLastChar(two, 1)),
  (one, two) => chopSecondSymbol(one, chopSecondLastChar(two, 2)),
  (one, two) => chopSecondSymbol(one, chopSecondLastChar(two, 3))
];

const generateSmartTokenSymbol = async (
  symbolOne: string,
  symbolTwo: string,
  multiTokenContract: string
) => {
  for (const strat in tokenStrategies) {
    let draftedToken = tokenStrategies[strat](symbolOne, symbolTwo);
    try {
      await getEosioTokenPrecision(draftedToken, multiTokenContract);
    } catch (e) {
      return draftedToken;
    }
  }
  throw new Error("Failed to find a new SmartTokenSymbol!");
};

const tokenMetaDataEndpoint =
  "https://raw.githubusercontent.com/eoscafe/eos-airdrops/master/tokens.json";

interface TokenMeta {
  name: string;
  logo: string;
  logo_lg: string;
  symbol: string;
  account: string;
  chain: string;
}

const getTokenMeta = async (): Promise<TokenMeta[]> => {
  const res: AxiosResponse<{
    name: string;
    logo: string;
    logo_lg: string;
    symbol: string;
    account: string;
    chain: string;
  }[]> = await axios.get(tokenMetaDataEndpoint);
  return res.data.filter(
    token => token.chain.toLowerCase() == "eos" && token.symbol !== "KARMA"
  );
};

const parseDfuseTable = (
  data: any
): {
  smartToken: string;
  reserves: { balance: string; ratio: number; contract: string }[];
}[] => {
  return data.tables.map((table: any) => ({
    smartToken: table.scope,
    reserves: table.rows.map((row: any) => row.json)
  }));
};

const parseDfuseSettingTable = (
  data: any
): {
  smartToken: string;
  fee: number;
  stake_enabled: boolean;
  owner: string;
  currency: string;
}[] => {
  return data.tables.map((table: any) => ({
    smartToken: table.scope,
    ...table.rows[0].json
  }));
};

const eosMultiToDryRelays = (relays: EosMultiRelay[]): DryRelay[] => {
  return relays.map(relay => ({
    reserves: relay.reserves.map(reserve => ({
      contract: reserve.contract,
      symbol: new Symbol(reserve.symbol, reserve.precision)
    })),
    contract: relay.contract,
    smartToken: {
      symbol: new Symbol(relay.smartToken.symbol, relay.smartToken.precision),
      contract: relay.smartToken.contract
    },
    isMultiContract: true
  }));
};

@Module({ namespacedPath: "eosBancor/" })
export class EosBancorModule extends VuexModule
  implements TradingModule, LiquidityModule, CreatePoolModule {
  tokensList: TokenPrice[] | TokenPriceExtended[] = [];
  relaysList: EosMultiRelay[] = [];
  usdPrice = 0;
  usdPriceOfBnt = 0;
  tokenMeta: TokenMeta[] = [];
  tokenBalances: TokenBalances["tokens"] = [];

  get supportedFeatures() {
    return ["addLiquidity", "removeLiquidity", "setFee", "changeOwner"];
  }

  get wallet() {
    return "eos";
  }

  get tokenBalance() {
    return (symbolName: string) => {
      const tokenBalance = this.tokenBalances.find(
        balance => balance.symbol == symbolName
      );
      return (tokenBalance && String(tokenBalance.amount)) || "0";
    };
  }

  get newPoolTokenChoices() {
    return (networkToken: string): ModalChoice[] => {
      return this.tokenMeta
        .map(tokenMeta => {
          return {
            symbol: tokenMeta.symbol,
            balance: this.tokenBalance(tokenMeta.symbol),
            img: tokenMeta.logo
          };
        })
        .filter(
          (value, index, array) =>
            array.findIndex(token => value.symbol == token.symbol) == index
        )
        .filter(
          tokenMeta =>
            !this.relaysList.find(relay =>
              relay.reserves.every(
                reserve =>
                  reserve.symbol == tokenMeta.symbol ||
                  reserve.symbol == networkToken
              )
            )
        )
        .sort((a, b) => {
          return Number(b.balance) - Number(a.balance);
        });
    };
  }

  get newNetworkTokenChoices(): NetworkChoice[] {
    return [
      {
        symbol: "BNT",
        balance: this.tokenBalance("BNT"),
        img: this.tokenMetaObj("BNT").logo,
        usdValue: this.usdPriceOfBnt
      },
      {
        symbol: "USDB",
        balance: this.tokenBalance("USDB"),
        img: this.tokenMetaObj("USDB").logo,
        usdValue: 1
      }
    ];
  }

  @action async updateFee({ fee, smartTokenSymbol }: FeeParams) {
    const updateFeeAction = multiContract.updateFeeAction(
      smartTokenSymbol,
      fee
    );
    const txRes = await this.triggerTx([updateFeeAction]);
    return txRes.transaction_id as string;
  }

  @action async updateOwner({ smartTokenSymbol, newOwner }: NewOwnerParams) {
    const updateOwnerAction = multiContract.updateOwnerAction(
      smartTokenSymbol,
      newOwner
    );
    const txRes = await this.triggerTx([updateOwnerAction]);
    return txRes.transaction_id as string;
  }

  @action async createPool(poolParams: any): Promise<void> {
    const [
      [token1Symbol, token1Amount],
      [token2Symbol, token2Amount]
    ] = poolParams.reserves;
    const smartTokenSymbol = await generateSmartTokenSymbol(
      token1Symbol,
      token2Symbol,
      process.env.VUE_APP_SMARTTOKENCONTRACT!
    );

    const token1Data = this.tokenMetaObj(token1Symbol);
    const token2Data = this.tokenMetaObj(token2Symbol);

    const token1Asset = number_to_asset(
      Number(token1Amount),
      new Symbol(
        token1Data.symbol,
        await getEosioTokenPrecision(token1Data.symbol, token1Data.account)
      )
    );
    const token2Asset = number_to_asset(
      Number(token2Amount),
      new Symbol(
        token2Data.symbol,
        await getEosioTokenPrecision(token2Data.symbol, token2Data.account)
      )
    );

    const kickStartRelayActions = await multiContract.kickStartRelay(
      smartTokenSymbol,
      [
        {
          contract: token1Data.account,
          // @ts-ignore
          amount: token1Asset
        },
        {
          contract: token2Data.account,
          // @ts-ignore
          amount: token2Asset
        }
      ],
      100000000,
      poolParams.fee
    );

    const txRes = await this.triggerTx(kickStartRelayActions);
    return txRes.transaction_id;
  }

  get networkTokenUsdValue() {
    return (symbolName: string) =>
      symbolName == "BNT" ? this.usdPriceOfBnt : 1;
  }

  get bancorApiTokens(): ViewToken[] {
    // @ts-ignore
    return (
      this.tokensList
        // @ts-ignore
        .map((token: TokenPrice | TokenPriceExtended) => ({
          symbol: token.code,
          name: token.name,
          price: token.price,
          liqDepth: token.liquidityDepth * this.usdPrice,
          logo: token.primaryCommunityImageName,
          change24h: token.change24h,
          volume24h: token.volume24h.USD,
          // @ts-ignore
          balance: token.balance || "0",
          source: "api"
        }))
        // @ts-ignore
        .filter(x => x.symbol !== "EMT")
    );
  }

  get tokenMetaObj() {
    return (symbolName: string) => {
      const tokenMetaObj = this.tokenMeta.find(
        token => token.symbol == symbolName
      );
      if (!tokenMetaObj)
        throw new Error(`Failed to find token meta for ${symbolName}`);
      return tokenMetaObj;
    };
  }

  get relayTokens(): ViewToken[] {
    return this.relaysList
      .filter(relay =>
        relay.reserves.some(
          reserve => reserve.symbol == "BNT" || reserve.symbol == "USDB"
        )
      )
      .reduce((prev, relay) => {
        const tokens = relayToTokens(relay, this.usdPriceOfBnt);
        return prev.concat(tokens);
      }, [] as ViewToken[])
      .sort((a, b) => b.liqDepth - a.liqDepth)
      .filter(
        (token, index, arr) =>
          arr.findIndex(sToken => sToken.symbol == token.symbol) == index
      )
      .map(token => {
        const symbol = token.symbol;
        const tokenMeta = this.tokenMeta.find(token => token.symbol == symbol);
        const tokenBalance = this.tokenBalances.find(
          balance => balance.symbol == token.symbol
        );
        return {
          ...token,
          balance: (tokenBalance && String(tokenBalance.amount)) || "0",
          logo:
            (tokenMeta && tokenMeta.logo) || "https://via.placeholder.com/50"
        };
      });
  }

  get tokens(): ViewToken[] {
    return this.bancorApiTokens
      .concat(this.relayTokens)
      .sort((a, b) => b.liqDepth - a.liqDepth)
      .filter(
        (token, index, array) =>
          array.findIndex(tokenX => tokenX.symbol == token.symbol) == index
      );
  }

  get token(): (arg0: string) => ViewToken {
    return (symbolName: string) => {
      const token = this.tokens.find(token => token.symbol == symbolName);
      if (!token) throw new Error("Failed to find token");
      if (token && !token.logo) {
        token["logo"] = "https://via.placeholder.com/50";
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
    return this.relaysList
      .map(relay => ({
        ...relay,
        symbol: relay.reserves.find(reserve => reserve.symbol !== "BNT")!
          .symbol,
        smartTokenSymbol: relay.smartToken.symbol,
        liqDepth: relay.reserves.find(reserve => reserve.symbol == "BNT")
          ? relay.reserves.find(reserve => reserve.symbol == "BNT")!.amount *
            this.usdPriceOfBnt
          : relay.reserves.find(reserve => reserve.symbol == "USDB")
          ? relay.reserves.find(reserve => reserve.symbol == "USDB")!.amount
          : 0,
        reserves: relay.reserves
          .map((reserve: AgnosticToken) => ({
            ...reserve,
            logo: [this.token(reserve.symbol).logo]
          }))
          .sort(reserve => (reserve.symbol == "USDB" ? -1 : 1))
          .sort(reserve => (reserve.symbol == "BNT" ? -1 : 1))
      }))
      .sort((a, b) => b.liqDepth - a.liqDepth);
  }

  @action async fetchUsdPrice() {
    this.setUsdPrice(Number(await bancorApi.getRate("BNT", "USD")));
  }

  @action async init() {
    const [
      usdValueOfEth,
      tokens,
      relays,
      usdPriceOfBnt,
      tokenMeta
    ] = await Promise.all([
      bancorApi.getTokenTicker("ETH"),
      bancorApi.getTokens(),
      fetchRelays(),
      bancorApi.getRate("BNT", "USD"),
      getTokenMeta()
    ]);
    this.setUsdPrice(Number(usdValueOfEth.price));
    this.setBntPrice(Number(usdPriceOfBnt));
    this.refreshBalances();
    this.setRelays(relays);
    this.setTokens(tokens);
    this.setTokenMeta(tokenMeta);
  }

  @mutation setTokenBalances(balances: TokenBalances["tokens"]) {
    this.tokenBalances = balances;
  }

  @action async refreshBalances(symbols: string[] = []) {
    // @ts-ignore
    const isAuthenticated = this.$store.rootGetters[
      "eosWallet/isAuthenticated"
    ];
    if (!isAuthenticated) return;
    const balances = await getTokenBalances(isAuthenticated);
    this.setTokenBalances(balances.tokens);
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
        amount: number_to_asset(
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
      number_to_asset(
        Number(fundAmount),
        new Symbol(smartTokenSymbol, 4)
      ).to_string()
    );

    const actions = [...addLiquidityActions, fundAction];
    const txRes = await this.triggerTx(actions);
    return txRes.transaction_id as string;
  }

  @action async removeLiquidity({
    fundAmount,
    smartTokenSymbol
  }: LiquidityParams) {
    console.log(
      { fundAmount, smartTokenSymbol },
      "remove liquidity does nothing"
    );
    return "";
  }

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

    const smartSupply = asset_to_number(supply.supply);
    const token1ReserveBalance = asset_to_number(token1.balance);
    const token2ReserveBalance = asset_to_number(token2.balance);

    const percent = asset_to_number(new Asset(smartTokenBalance)) / smartSupply;
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

    const smartSupply = asset_to_number(supply.supply);

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

    const reserveBalance = asset_to_number(sameReserve.balance);
    const percent = Number(suggestedDeposit.tokenAmount) / reserveBalance;
    const opposingNumberAmount =
      percent * asset_to_number(opposingReserve.balance);
    const smartTokenNumberAmount = percent * smartSupply;
    const opposingAsset = number_to_asset(
      opposingNumberAmount,
      opposingReserve.balance.symbol
    );
    const smartTokenAsset = number_to_asset(
      smartTokenNumberAmount,
      supply.supply.symbol
    );

    return {
      opposingAmount: opposingAsset.to_string().split(" ")[0],
      smartTokenAmount: smartTokenAsset.to_string().split(" ")[0]
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
    const smartUserBalance = new Asset(smartUserBalanceString);
    const smartSupply = asset_to_number(supply.supply);
    const sameReserve = tokenReserves.find(
      reserve =>
        reserve.balance.symbol.code().to_string() == suggestWithdraw.tokenSymbol
    )!;
    const opposingReserve = tokenReserves.find(
      reserve =>
        reserve.balance.symbol.code().to_string() !==
        suggestWithdraw.tokenSymbol
    )!;

    const reserveBalance = asset_to_number(sameReserve.balance);
    const percent = Number(suggestWithdraw.tokenAmount) / reserveBalance;

    const smartTokenAmount = percent * smartSupply;

    return {
      opposingAmount: String(
        percent * asset_to_number(opposingReserve.balance)
      ),
      smartTokenAmount:
        smartTokenAmount / asset_to_number(smartUserBalance) > 0.99
          ? String(asset_to_number(smartUserBalance))
          : String(smartTokenAmount)
    };
  }

  // Focus Symbol is called when the UI focuses on a Symbol
  // Should have token balances
  // Could be an oppurtunity to get precision
  @action async focusSymbol(symbolName: string) {}

  @action async convertApi({
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

  @action async convertMulti(proposal: ProposedConvertTransaction) {
    console.log("convert multi engaged");
    const { fromSymbol, fromAmount, toAmount, toSymbol } = proposal;

    const fromToken = this.relayTokens.find(x => x.symbol == fromSymbol)!;
    const toToken = this.relayTokens.find(x => x.symbol == toSymbol)!;

    // @ts-ignore
    const fromSymbolInit = new Symbol(fromToken.symbol, fromToken.precision);
    // @ts-ignore
    const toSymbolInit = new Symbol(toToken.symbol, toToken.precision);
    const assetAmount = number_to_asset(Number(fromAmount), fromSymbolInit);

    const allRelays = eosMultiToDryRelays(this.relaysList);
    const relaysPath = createPath(fromSymbolInit, toSymbolInit, allRelays);
    const convertPath = relaysToConvertPaths(fromSymbolInit, relaysPath);
    // @ts-ignore
    const isAuthenticated = this.$store.rootGetters[
      "eosWallet/isAuthenticated"
    ];

    const memo = composeMemo(
      convertPath,
      String(toAmount * 0.96),
      isAuthenticated,
      1,
      process.env.VUE_APP_AFFILIATE,
      10000
    );

    // @ts-ignore
    const fromTokenContract = fromToken.contract;
    const convertActions = await multiContract.convert(
      fromTokenContract,
      assetAmount,
      memo
    );
    const txRes = await this.triggerTx(convertActions);
    return txRes.transaction_id;
  }

  @action async convert(proposal: ProposedConvertTransaction) {
    const { fromSymbol, toSymbol, fromAmount } = proposal;

    // @ts-ignore
    const fromTokenSources = this.bancorApiTokens
      .concat(this.relayTokens)
      .filter(token => token.symbol == fromSymbol)
      // @ts-ignore
      .map(token => token.source);
    const toTokenSources = this.bancorApiTokens
      .concat(this.relayTokens)
      .filter(token => token.symbol == toSymbol)
      // @ts-ignore
      .map(token => token.source);
    const sources = [fromTokenSources, toTokenSources];
    const convertType = determineConvertType(sources);

    switch (convertType) {
      case ConvertType.API: {
        return this.convertApi(proposal);
      }
      case ConvertType.Multi: {
        return this.convertMulti(proposal);
      }
      case ConvertType.APItoMulti: {
        const apiReturn = await this.getReturnBancorApi({
          amount: proposal.fromAmount,
          fromSymbol,
          toSymbol: "BNT"
        });
        const path = await bancorApi.getPathBySymbol(fromSymbol, "BNT");
        const multiReturn = await this.getReturnMulti({
          fromSymbol: "BNT",
          toSymbol,
          amount: Number(apiReturn.amount)
        });
        const finalReturn = String(Number(multiReturn.amount) * 0.99);
        const fromTokenPrecision = await this.getEosTokenWithDecimals(
          fromSymbol
        );
        console.log(fromTokenPrecision, "iS the from token");
        const toToken = this.relayTokens.find(x => x.symbol == toSymbol)!;

        const fromSymbolInit = new Symbol("BNT", 10);
        // @ts-ignore
        const toSymbolInit = new Symbol(toToken.symbol, toToken.precision);
        // @ts-ignore
        const assetAmount = number_to_asset(
          Number(fromAmount),
          new Symbol(fromSymbol, fromTokenPrecision.decimals)
        );

        const allRelays = eosMultiToDryRelays(this.relaysList);
        const relaysPath = createPath(fromSymbolInit, toSymbolInit, allRelays);
        const convertPath = relaysToConvertPaths(fromSymbolInit, relaysPath);
        const fromTokenRes = await bancorApi.getToken(fromSymbol);
        const fromTokenContract = fromTokenRes.details[0].blockchainId;
        const mergedPath: ConvertPath[] = path
          .map(([account, symbol]) => ({ account, symbol }))
          .concat(convertPath);
        const memo = composeMemo(
          mergedPath,
          finalReturn,
          vxm.wallet.isAuthenticated
        );

        const convertActions = await multiContract.convert(
          fromTokenContract,
          assetAmount,
          memo
        );
        const txRes = await this.triggerTx(convertActions);
        return txRes.transaction_id;
      }
      case ConvertType.MultiToApi: {
        const fromToken = this.relayTokens.find(x => x.symbol == fromSymbol)!;
        const fromSymbolInit = new Symbol(
          fromToken.symbol,
          // @ts-ignore
          fromToken.precision
        );

        const toSymbolInit = new Symbol("BNT", 10);
        // @ts-ignore
        const assetAmount = number_to_asset(Number(fromAmount), fromSymbolInit);

        const allRelays = eosMultiToDryRelays(this.relaysList);
        const relaysPath = createPath(fromSymbolInit, toSymbolInit, allRelays);
        const convertPath = relaysToConvertPaths(fromSymbolInit, relaysPath);

        const multiReturn = await this.getReturnMulti({
          fromSymbol,
          amount: Number(fromAmount),
          toSymbol: "BNT"
        });

        const apiReturn = await this.getReturnBancorApi({
          amount: Number(multiReturn.amount),
          fromSymbol: "BNT",
          toSymbol
        });
        const path = await bancorApi.getPathBySymbol("BNT", toSymbol);
        const mergedPath = convertPath.concat(
          path.map(([account, symbol]) => ({ account, symbol }))
        );

        const memo = composeMemo(
          mergedPath,
          String(Number(apiReturn.amount) * 0.99),
          vxm.wallet.isAuthenticated
        );

        // @ts-ignore
        const fromTokenContract = fromToken.contract;

        const convertActions = await multiContract.convert(
          fromTokenContract,
          assetAmount,
          memo
        );
        const txRes = await this.triggerTx(convertActions);
        return txRes.transaction_id;
      }
      default:
        throw new Error("Failed to decide how we're gonna convert this");
    }
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

  @action async getReturnBancorApi({
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
    return {
      amount: String(Number(reward) / Math.pow(10, toToken.decimals))
    };
  }

  @action async hydrateRelays(relays: DryRelay[]): Promise<HydratedRelay[]> {
    const [reservesRes, settingsRes] = await Promise.all([
      client.stateTablesForScopes(
        process.env.VUE_APP_MULTICONTRACT!,
        relays.map(relay => relay.smartToken.symbol.code().to_string()),
        "reserves"
      ),
      client.stateTablesForScopes(
        process.env.VUE_APP_MULTICONTRACT!,
        relays.map(relay => relay.smartToken.symbol.code().to_string()),
        "converters"
      )
    ]);

    const simpleSettings = parseDfuseSettingTable(settingsRes);
    const simpleReserves = parseDfuseTable(reservesRes);

    const joined = simpleReserves.map(relayWithReserves => ({
      ...relayWithReserves,
      ...simpleSettings.find(
        setting => setting.smartToken == relayWithReserves.smartToken
      )!
    }));

    return relays.map(relay => {
      const textRelay = joined.find(
        text => text.smartToken == relay.smartToken.symbol.code().to_string()
      )!;
      return {
        ...relay,
        reserves: relay.reserves.map(reserve => ({
          contract: reserve.contract,
          amount: new Asset(
            textRelay.reserves.find(
              textReserve =>
                textReserve.balance.split(" ")[1] ==
                reserve.symbol.code().to_string()
            )!.balance
          )
        })),
        fee: textRelay.fee / 1000000
      };
    });
  }

  @action async getReturnMulti({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction): Promise<ConvertReturn> {
    const fromToken = this.relayTokens.find(x => x.symbol == fromSymbol)!;
    const toToken = this.relayTokens.find(x => x.symbol == toSymbol)!;

    // @ts-ignore
    const fromSymbolInit = new Symbol(fromToken.symbol, fromToken.precision);
    // @ts-ignore
    const toSymbolInit = new Symbol(toToken.symbol, toToken.precision);
    const assetAmount = number_to_asset(Number(amount), fromSymbolInit);

    const allRelays = eosMultiToDryRelays(this.relaysList);
    const path = createPath(fromSymbolInit, toSymbolInit, allRelays);
    const hydratedRelays = await this.hydrateRelays(path);
    const calculatedReturn = findReturn(assetAmount, hydratedRelays);

    return {
      amount: calculatedReturn.amount.to_string().split(" ")[0],
      slippage: calculatedReturn.highestSlippage
    };
  }

  @action async getReturn({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction): Promise<ConvertReturn> {
    const fromToken = this.token(fromSymbol);
    const toToken = this.token(toSymbol);
    // @ts-ignore
    const sources = [fromToken.source, toToken.source];
    const convertType = determineConvertType(sources);

    switch (convertType) {
      case ConvertType.API:
        return this.getReturnBancorApi({ fromSymbol, toSymbol, amount });
      case ConvertType.Multi:
        return this.getReturnMulti({ fromSymbol, toSymbol, amount });
      case ConvertType.APItoMulti: {
        const bancorApi = await this.getReturnBancorApi({
          fromSymbol,
          toSymbol: "BNT",
          amount
        });
        return this.getReturnMulti({
          fromSymbol: "BNT",
          toSymbol,
          amount: Number(bancorApi.amount)
        });
      }
      case ConvertType.MultiToApi: {
        const multi = await this.getReturnMulti({
          fromSymbol,
          toSymbol: "BNT",
          amount
        });
        return this.getReturnBancorApi({
          fromSymbol: "BNT",
          toSymbol,
          amount: Number(multi.amount)
        });
      }
    }
  }

  @action async getCostBancorApi({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction) {
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

  @action async getCostMulti({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction) {
    const fromToken = this.relayTokens.find(x => x.symbol == fromSymbol)!;
    const toToken = this.relayTokens.find(x => x.symbol == toSymbol)!;

    // @ts-ignore
    const fromSymbolInit = new Symbol(fromToken.symbol, fromToken.precision);
    // @ts-ignore
    const toSymbolInit = new Symbol(toToken.symbol, toToken.precision);
    const assetAmount = number_to_asset(Number(amount), toSymbolInit);

    const allRelays = eosMultiToDryRelays(this.relaysList);
    const path = createPath(fromSymbolInit, toSymbolInit, allRelays);
    const hydratedRelays = await this.hydrateRelays(path);
    const calculatedCost = findCost(assetAmount, hydratedRelays);

    return {
      amount: calculatedCost.amount.to_string().split(" ")[0],
      slippage: calculatedCost.highestSlippage
    };
  }

  @action async getCost({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction): Promise<ConvertReturn> {
    const fromToken = this.token(fromSymbol);
    const toToken = this.token(toSymbol);
    // @ts-ignore
    const sources = [fromToken.source, toToken.source];
    const convertType = determineConvertType(sources);

    switch (convertType) {
      case ConvertType.API:
        return this.getCostBancorApi({ fromSymbol, toSymbol, amount });
      case ConvertType.Multi:
        return this.getCostMulti({ fromSymbol, toSymbol, amount });
      case ConvertType.APItoMulti: {
        const bancorApi = await this.getCostBancorApi({
          fromSymbol,
          toSymbol: "BNT",
          amount
        });
        return this.getCostMulti({
          fromSymbol: "BNT",
          toSymbol,
          amount: Number(bancorApi.amount)
        });
      }
      case ConvertType.MultiToApi: {
        const multi = await this.getCostMulti({
          fromSymbol,
          toSymbol: "BNT",
          amount
        });
        return this.getCostBancorApi({
          fromSymbol: "BNT",
          toSymbol,
          amount: Number(multi.amount)
        });
      }
    }
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
    });
  }

  @mutation setBntPrice(price: number) {
    this.usdPriceOfBnt = price;
  }

  @mutation setTokenMeta(tokens: TokenMeta[]) {
    this.tokenMeta = tokens.filter(token => token.chain == "eos");
  }

  @mutation setUsdPrice(price: number) {
    this.usdPrice = price;
  }
}

export const eosBancor = EosBancorModule.ExtractVuexModule(EosBancorModule);
