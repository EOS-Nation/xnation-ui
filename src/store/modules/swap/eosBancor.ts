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
  FeeParams,
  NewOwnerParams,
  BaseToken,
  CreatePoolParams,
  ViewRelay,
  Step
} from "@/types/bancor";
import { bancorApi, ethBancorApi } from "@/api/bancor";
import {
  fetchRelays,
  getBalance,
  fetchTokenStats,
  compareString,
  SettingTableRow,
  ReserveTableRow
} from "@/api/helpers";
import {
  Sym as Symbol,
  Asset,
  asset_to_number,
  number_to_asset,
  Sym
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
  findReturn,
  calculateFundReturn
} from "@/api/bancorCalc";
import { hardCodedTokens } from "./tokenDic";
import _ from "lodash";
import wait from "waait";
import { MultiStateResponse } from "@dfuse/client";

interface TokenPriceDecimal extends TokenPrice {
  decimals: number;
}

enum ConvertType {
  API,
  Multi,
  APItoMulti,
  MultiToApi
}

const mandatoryNetworkTokens: BaseToken[] = [
  { contract: "bntbntbntbnt", symbol: "BNT" },
  { contract: "usdbusdbusdb", symbol: "USDB" }
];

const isBaseToken = (token: BaseToken) => (comparasion: BaseToken): boolean =>
  token.symbol == comparasion.symbol && token.contract == comparasion.contract;

const relayIncludesBothTokens = (
  networkTokens: BaseToken[],
  tradingTokens: BaseToken[]
) => {
  const networkTokensExcluded = _.differenceWith(
    tradingTokens,
    networkTokens,
    _.isEqual
  );

  return (relay: EosMultiRelay) => {
    const includesNetworkToken = relay.reserves.some(reserve =>
      networkTokens.some(isBaseToken(reserve))
    );
    const includesTradingToken = relay.reserves.some(reserve =>
      networkTokensExcluded.some(isBaseToken(reserve))
    );
    const includesNetworkTokens = relay.reserves.every(reserve =>
      networkTokens.some(isBaseToken(reserve))
    );
    return (
      (includesNetworkToken && includesTradingToken) || includesNetworkTokens
    );
  };
};

export interface ViewTokenMinusLogo {
  symbol: string;
  name: string;
  price: number;
  liqDepth: number;
  change24h: number;
  volume24h: number;
  source: string;
  precision: number;
  contract: string;
  balance?: number;
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
    balance: 0,
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
  if (arraysContainBoth("api", sources)) return ConvertType.API;
  else if (arraysContainBoth("multi", sources)) return ConvertType.Multi;
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

const chopSecondSymbol = (one: string, two: string, maxLength = 7) =>
  two.slice(0, maxLength - one.length) + one;

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
  (one, two) => chopSecondSymbol(one, chopSecondLastChar(two, 3)),
  (one, two) =>
    chopSecondSymbol(
      one,
      two
        .split("")
        .reverse()
        .join("")
    )
];

const generateSmartTokenSymbol = async (
  symbolOne: string,
  symbolTwo: string,
  multiTokenContract: string
) => {
  for (const strat in tokenStrategies) {
    console.log({ symbolOne, symbolTwo });
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
  const res: AxiosResponse<
    {
      name: string;
      logo: string;
      logo_lg: string;
      symbol: string;
      account: string;
      chain: string;
    }[]
  > = await axios.get(tokenMetaDataEndpoint);
  return res.data.filter(
    token => token.chain.toLowerCase() == "eos" && token.symbol !== "KARMA"
  );
};

const parseDfuseTable = (data: MultiStateResponse<ReserveTableRow>) =>
  data.tables.map(table => ({
    smartToken: table.scope,
    reserves: table.rows.map(row => row.json) as ReserveTableRow[]
  }));

const parseDfuseSettingTable = (data: MultiStateResponse<SettingTableRow>) =>
  data.tables.map(table => ({
    smartToken: table.scope,
    ...table.rows[0].json!
  }));

const eosMultiToDryRelays = (relays: EosMultiRelay[]): DryRelay[] =>
  relays.map(relay => ({
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

type FeatureEnabled = (relay: EosMultiRelay, loggedInUser: string) => boolean;
type Feature = [string, FeatureEnabled];

const isOwner: FeatureEnabled = (relay, account) => relay.owner == account;

@Module({ namespacedPath: "eosBancor/" })
export class EosBancorModule extends VuexModule
  implements TradingModule, LiquidityModule, CreatePoolModule {
  tokensList: TokenPrice[] | TokenPriceExtended[] = [];
  relaysList: EosMultiRelay[] = [];
  usdPrice = 0;
  usdPriceOfBnt = 0;
  tokenMeta: TokenMeta[] = [];

  get supportedFeatures() {
    return (symbolName: string) => {
      const isAuthenticated = this.isAuthenticated;
      const relay = this.relaysList.find(relay =>
        compareString(relay.smartToken.symbol, symbolName)
      )!;
      const features: Feature[] = [
        ["addLiquidity", () => true],
        [
          "removeLiquidity",
          relay => relay.reserves.some(reserve => reserve.amount > 0)
        ],
        ["setFee", isOwner],
        ["changeOwner", isOwner],
        [
          "deleteRelay",
          relay => relay.reserves.every(reserve => reserve.amount == 0)
        ]
      ];
      return features
        .filter(([name, test]) => test(relay, isAuthenticated))
        .map(([name]) => name);
    };
  }

  get isAuthenticated() {
    // @ts-ignore
    return this.$store.rootGetters[`${this.wallet}Wallet/isAuthenticated`];
  }

  get wallet() {
    return "eos";
  }

  get balance() {
    return (token: { contract: string; symbol: string }) => {
      // @ts-ignore
      return this.$store.rootGetters[`${this.wallet}Network/balance`](token);
    };
  }

  get newPoolTokenChoices() {
    return (networkToken: string): ModalChoice[] => {
      return (
        this.tokenMeta
          .map(tokenMeta => {
            const balance = this.balance({
              contract: tokenMeta.account,
              symbol: tokenMeta.symbol
            });
            return {
              symbol: tokenMeta.symbol,
              contract: tokenMeta.account,
              balance: balance && balance.amount,
              img: tokenMeta.logo
            };
          })
          .filter(
            (value, index, array) =>
              array.findIndex(token => value.symbol == token.symbol) == index
          )
          // .filter(
          //   tokenMeta =>
          //     !this.relaysList.find(relay =>
          //       relay.reserves.every(
          //         reserve =>
          //           reserve.symbol == tokenMeta.symbol ||
          //           reserve.symbol == networkToken
          //       )
          //     )
          // )
          .filter(
            token =>
              !mandatoryNetworkTokens.some(
                networkToken => token.symbol == networkToken.symbol
              )
          )
          .sort((a, b) => {
            const second = isNaN(b.balance) ? 0 : Number(b.balance);
            const first = isNaN(a.balance) ? 0 : Number(a.balance);
            return second - first;
          })
      );
    };
  }

  get newNetworkTokenChoices(): NetworkChoice[] {
    return [
      {
        symbol: "BNT",
        contract: "bntbntbntbnt",
        usdValue: this.usdPriceOfBnt
      },
      {
        symbol: "USDB",
        contract: "usdbusdbusdb",
        usdValue: 1
      }
    ].map(choice => ({
      ...choice,
      balance: this.balance(choice) && this.balance(choice)!.amount,
      img:
        this.tokenMetaObj(choice.symbol) &&
        this.tokenMetaObj(choice.symbol)!.logo
    }));
  }

  @action async updateFee({ fee, smartTokenSymbol }: FeeParams) {
    const updateFeeAction = multiContract.updateFeeAction(
      smartTokenSymbol,
      fee
    );
    const txRes = await this.triggerTx([updateFeeAction]);
    return txRes.transaction_id as string;
  }

  @action async removeRelay(symbolName: string) {
    const relay = this.relay(symbolName);
    const reserves = relay.reserves.map(reserve => reserve.symbol);
    const nukeRelayActions = multiContract.nukeRelayAction(
      symbolName,
      reserves
    );
    const txRes = await this.triggerTx(nukeRelayActions);
    this.waitAndUpdate();
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

  @action async createPool(poolParams: CreatePoolParams): Promise<string> {
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

    const networkAsset = [token1Asset, token2Asset].find(asset => {
      const symbolName = asset.symbol.code().to_string();
      return (
        compareString(symbolName, "BNT") || compareString(symbolName, "USDB")
      );
    });
    if (!networkAsset) {
      throw new Error(
        "Failed to find network asset, therefore cannot determine initial liquidity."
      );
    }
    const networkSymbol = networkAsset.symbol.code().to_string();
    const initialLiquidity = compareString(networkSymbol, "USDB")
      ? 0.5
      : 1 * asset_to_number(networkAsset);

    const actions = await multiContract.kickStartRelay(
      smartTokenSymbol,
      [
        {
          contract: token1Data.account,
          amount: token1Asset
        },
        {
          contract: token2Data.account,
          amount: token2Asset
        }
      ],
      Number(initialLiquidity.toFixed(0)),
      poolParams.fee
    );

    let res = await this.triggerTx(actions!);
    return res.transaction_id;
  }

  get bancorApiTokens(): ViewToken[] {
    // @ts-ignore
    return (
      this.tokensList
        // @ts-ignore
        .map((token: TokenPrice | TokenPriceExtended) => {
          const symbol = token.code;
          const contract = hardCodedTokens.find(
            ([symbolName]) => symbolName == symbol
          )![1];
          const tokenBalance = vxm.eosNetwork.balance({ symbol, contract });

          return {
            symbol,
            name: token.name,
            price: token.price,
            liqDepth: token.liquidityDepth * this.usdPrice * 2,
            logo: token.primaryCommunityImageName,
            change24h: token.change24h,
            volume24h: token.volume24h.USD,
            // @ts-ignore
            balance: tokenBalance && Number(tokenBalance.balance),
            source: "api"
          };
        })
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
      .filter(
        relayIncludesBothTokens(
          mandatoryNetworkTokens,
          this.tokenMeta.map(token => ({
            contract: token.account,
            symbol: token.symbol
          }))
        )
      )
      .reduce(
        (prev, relay) => {
          const tokens = relayToTokens(relay, this.usdPriceOfBnt);
          return prev.concat(tokens);
        },
        [] as ViewTokenMinusLogo[]
      )
      .sort((a, b) => b.liqDepth - a.liqDepth)
      .filter(
        (token, index, arr) =>
          arr.findIndex(sToken => sToken.symbol == token.symbol) == index
      )
      .map(token => {
        const { symbol, contract } = token;
        const tokenMeta = this.tokenMeta.find(
          token => token.symbol == symbol && token.account == contract
        );
        const tokenBalance = vxm.eosNetwork.balance({
          symbol,
          contract
        });
        return {
          ...token,
          balance: tokenBalance && Number(tokenBalance.balance),
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

  get relays(): ViewRelay[] {
    // @ts-ignore
    return this.relaysList
      .filter(
        relayIncludesBothTokens(
          mandatoryNetworkTokens,
          this.tokenMeta.map(token => ({
            contract: token.account,
            symbol: token.symbol
          }))
        )
      )
      .map(relay => ({
        ...relay,
        id: relay.smartToken.symbol,
        swap: "eos",
        symbol: relay.reserves.find(reserve => reserve.symbol !== "BNT")!
          .symbol,
        smartTokenSymbol: relay.smartToken.symbol,
        liqDepth: relay.reserves.find(reserve => reserve.symbol == "BNT")
          ? relay.reserves.find(reserve => reserve.symbol == "BNT")!.amount *
            this.usdPriceOfBnt
          : relay.reserves.find(reserve => reserve.symbol == "USDB")
          ? relay.reserves.find(reserve => reserve.symbol == "USDB")!.amount * 2
          : 0,
        reserves: relay.reserves
          .map((reserve: AgnosticToken) => ({
            ...reserve,
            reserveId: relay.smartToken.symbol + reserve.symbol,
            logo: [this.token(reserve.symbol).logo],
            ...(reserve.amount && { balance: reserve.amount })
          }))
          .sort(reserve => (reserve.symbol == "USDB" ? -1 : 1))
          .sort(reserve => (reserve.symbol == "BNT" ? -1 : 1))
      }))
      .sort((a, b) => b.liqDepth - a.liqDepth);
  }

  get convertableRelays() {
    return this.relaysList
      .filter(
        relayIncludesBothTokens(
          mandatoryNetworkTokens,
          this.tokenMeta.map(token => ({
            contract: token.account,
            symbol: token.symbol
          }))
        )
      )
      .map(relay => ({
        ...relay,
        liqDepth: relay.reserves.find(reserve => reserve.symbol == "BNT")
          ? relay.reserves.find(reserve => reserve.symbol == "BNT")!.amount *
            this.usdPriceOfBnt
          : relay.reserves.find(reserve => reserve.symbol == "USDB")
          ? relay.reserves.find(reserve => reserve.symbol == "USDB")!.amount
          : 0
      }))
      .sort((a, b) => b.liqDepth - a.liqDepth)
      .filter(
        (value, index, arr) =>
          arr.findIndex(x =>
            x.reserves.every(reserve =>
              value.reserves.some(
                y =>
                  reserve.symbol == y.symbol && reserve.contract == y.contract
              )
            )
          ) == index
      );
  }

  @action async init() {
    const [ethTokens, tokens, relays, tokenMeta] = await Promise.all([
      ethBancorApi.getTokens(),
      bancorApi.getTokens(),
      fetchRelays(),
      getTokenMeta()
    ]);
    const usdPriceOfBnt = ethTokens.find(token => token.code == "BNT")!.price;
    const usdValueOfEth = ethTokens.find(token => token.code == "ETH")!.price;

    this.setUsdPrice(Number(usdValueOfEth));
    this.setBntPrice(Number(usdPriceOfBnt));
    this.setRelays(relays);
    this.setTokens(tokens);
    this.setTokenMeta(tokenMeta);
    this.refreshBalances();
  }

  @action async refreshBalances(tokens: BaseToken[] = []) {
    if (!this.isAuthenticated) return;
    if (tokens.length > 0) {
      await vxm.eosNetwork.getBalances({ tokens });
      return;
    }

    const relayTokens = this.relaysList
      .filter(relay =>
        relay.reserves.some(
          reserve => reserve.symbol == "BNT" || reserve.symbol == "USDB"
        )
      )
      .reduce(
        (prev, relay) => {
          const tokens = relayToTokens(relay, this.usdPriceOfBnt);
          return prev.concat(tokens);
        },
        [] as ViewTokenMinusLogo[]
      )
      .map(token => ({
        contract: token.contract,
        symbol: token.symbol,
        precision: token.precision
      }));

    const bancorTokenSymbols = this.bancorApiTokens.map(x => x.symbol);
    const bancorTokens = bancorTokenSymbols
      .map(
        symbol => hardCodedTokens.find(([symbolName]) => symbolName == symbol)!
      )
      .map(([symbol, contract, precision]) => ({
        contract,
        symbol,
        precision
      }));

    const allTokens = [...relayTokens, ...bancorTokens];
    await vxm.eosNetwork.getBalances({ tokens: allTokens, slow: true });
  }

  @action async addLiquidity({
    fundAmount,
    smartTokenSymbol,
    token1Amount,
    token1Symbol,
    token2Amount,
    token2Symbol,
    onUpdate
  }: LiquidityParams) {
    const steps: Step[] = [
      {
        name: "DepositAndFund",
        description: "Depositing liquidity..."
      },
      {
        name: "ReAttempt",
        description: "Fund failed, trying again..."
      },
      {
        name: "WaitingForNetwork",
        description: "Success! Waiting 5 seconds for dFuse to catch up..."
      },
      {
        name: "DustCollectionFetch",
        description: "Checking for left over deposits..."
      },
      {
        name: "DustCollection",
        description: "Collecting left over deposit(s)"
      },
      {
        name: "Done",
        description: "Done!"
      }
    ];

    const relay = this.relay(smartTokenSymbol);
    const deposits = [
      { symbol: token1Symbol, amount: token1Amount },
      { symbol: token2Symbol, amount: token2Amount }
    ];
    const tokenAmounts = deposits.map(deposit => {
      // @ts-ignore
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

    onUpdate!(0, steps);

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
    let txRes: any;
    try {
      txRes = await this.triggerTx(actions);
    } catch (e) {
      if (e.message !== "assertion failure with message: insufficient balance")
        throw new Error(e);
      onUpdate!(1, steps);

      const backupFundAction = multiContractAction.fund(
        vxm.wallet.isAuthenticated,
        number_to_asset(
          Number(fundAmount) * 0.96,
          new Symbol(smartTokenSymbol, 4)
        ).to_string()
      );

      const newActions = [...addLiquidityActions, backupFundAction];
      txRes = await this.triggerTx(newActions);
    }

    onUpdate!(2, steps);
    await wait(5000);
    onUpdate!(3, steps);

    const bankBalances = await this.fetchBankBalances({
      smartTokenSymbol,
      accountHolder: this.isAuthenticated
    });
    onUpdate!(4, steps);

    const aboveZeroBalances = bankBalances
      .map(balance => ({ ...balance, quantity: new Asset(balance.quantity) }))
      .filter(balance => asset_to_number(balance.quantity) > 0);

    const withdrawActions = aboveZeroBalances.map(balance =>
      multiContract.withdrawAction(balance.symbl, balance.quantity)
    );
    if (withdrawActions.length > 0) {
      await this.triggerTx(withdrawActions);
    }
    onUpdate!(5, steps);
    this.refreshBalances(
      tokenAmounts.map(tokenAmount => ({
        contract: tokenAmount.contract,
        symbol: tokenAmount.amount.symbol.code().to_string()
      }))
    );
    return txRes.transaction_id as string;
  }

  @action async fetchBankBalances({
    smartTokenSymbol,
    accountHolder
  }: {
    smartTokenSymbol: string;
    accountHolder: string;
  }) {
    const res: {
      rows: { symbl: string; quantity: string }[];
      more: boolean;
    } = await rpc.get_table_rows({
      json: true,
      code: process.env.VUE_APP_MULTICONTRACT,
      scope: accountHolder,
      table: "accounts"
    });
    return res.rows.filter(row => row.symbl == smartTokenSymbol);
  }

  @action async removeLiquidity({
    fundAmount,
    smartTokenSymbol
  }: LiquidityParams) {
    const liquidityAsset = number_to_asset(
      Number(fundAmount),
      new Sym(smartTokenSymbol, 4)
    );

    const action = multiContract.removeLiquidityAction(liquidityAsset);
    const txRes = await this.triggerTx([action]);
    this.waitAndUpdate();
    return txRes.transaction_id as string;
  }

  @action async waitAndUpdate(time: number = 4000) {
    await wait(time);
    return this.init();
  }

  @action async expectNewRelay(smartToken: string) {
    const attempts = 10;
    const waitPeriod = 1000;
    for (var i = 0; i < attempts; i++) {
      const relays = await fetchRelays();
      const includesRelay = relays.find(
        relay => relay.smartToken.symbol == smartToken
      );
      if (includesRelay) {
        this.setRelays(relays);
        this.refreshBalances(
          includesRelay.reserves.map(reserve => ({
            contract: reserve.contract,
            symbol: reserve.symbol
          }))
        );
        return;
      }
      await wait(waitPeriod);
    }
  }

  @action async getUserBalances(symbolName: string) {
    const relay = this.relay(symbolName);
    const [
      [token1Balance, token2Balance, smartTokenBalance],
      [token1, token2],
      supply
    ] = await Promise.all([
      vxm.network.getBalances({
        tokens: [
          {
            contract: relay.reserves[0].contract,
            symbol: relay.reserves[0].symbol
          },
          {
            contract: relay.reserves[1].contract,
            symbol: relay.reserves[1].symbol
          },
          {
            // @ts-ignore
            contract: relay.smartToken.contract,
            // @ts-ignore
            symbol: relay.smartToken.symbol
          }
        ]
      }),
      tableApi.getReservesMulti(symbolName),
      // @ts-ignore
      fetchTokenStats(relay.smartToken.contract, symbolName)
    ]);

    const smartSupply = asset_to_number(supply.supply);
    const token1ReserveBalance = asset_to_number(token1.balance);
    const token2ReserveBalance = asset_to_number(token2.balance);

    const percent = smartTokenBalance.balance / smartSupply;
    const token1MaxWithdraw = percent * token1ReserveBalance;
    const token2MaxWithdraw = percent * token2ReserveBalance;

    return {
      token1MaxWithdraw: String(token1MaxWithdraw),
      token2MaxWithdraw: String(token2MaxWithdraw),
      token1Balance: String(token1Balance.balance),
      token2Balance: String(token2Balance.balance),
      smartTokenBalance: String(smartTokenBalance.balance)
    };
  }

  @action async calculateOpposingDeposit(
    suggestedDeposit: OpposingLiquidParams
  ): Promise<OpposingLiquid> {
    const relay = this.relay(suggestedDeposit.smartTokenSymbol);
    const [tokenReserves, supply] = await Promise.all([
      tableApi.getReservesMulti(suggestedDeposit.smartTokenSymbol),
      fetchTokenStats(
        // @ts-ignore
        relay.smartToken.contract,
        suggestedDeposit.smartTokenSymbol
      )
    ]);

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

    const sameAsset = number_to_asset(
      Number(suggestedDeposit.tokenAmount),
      sameReserve.balance.symbol
    );
    const opposingAsset = number_to_asset(
      opposingNumberAmount,
      opposingReserve.balance.symbol
    );

    const sameReserveFundReturn = calculateFundReturn(
      sameAsset,
      sameReserve.balance,
      supply.supply
    );
    const opposingReserveFundReturn = calculateFundReturn(
      opposingAsset,
      opposingReserve.balance,
      supply.supply
    );

    const sameReserveReturnNumber = asset_to_number(sameReserveFundReturn);
    const opposingReserveReturnNumber = asset_to_number(
      opposingReserveFundReturn
    );

    const lowestNumber = Math.min(
      opposingReserveReturnNumber,
      sameReserveReturnNumber
    );

    return {
      opposingAmount: String(asset_to_number(opposingAsset)),
      smartTokenAmount: String(lowestNumber)
    };
  }

  @action async calculateOpposingWithdraw(
    suggestWithdraw: OpposingLiquidParams
  ): Promise<OpposingLiquid> {
    const relay = this.relay(suggestWithdraw.smartTokenSymbol);
    const [tokenReserves, supply, smartUserBalanceString] = await Promise.all([
      tableApi.getReservesMulti(suggestWithdraw.smartTokenSymbol),
      fetchTokenStats(
        // @ts-ignore
        relay.smartToken.contract,
        suggestWithdraw.smartTokenSymbol
      ),
      // @ts-ignore
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

    const opposingAmountNumber =
      percent * asset_to_number(opposingReserve.balance);
    const opposingAsset = number_to_asset(
      opposingAmountNumber,
      opposingReserve.balance.symbol
    );

    return {
      opposingAmount: String(asset_to_number(opposingAsset)),
      smartTokenAmount:
        smartTokenAmount / asset_to_number(smartUserBalance) > 0.99
          ? String(asset_to_number(smartUserBalance))
          : String(smartTokenAmount)
    };
  }

  // Focus Symbol is called when the UI focuses on a Symbol
  // Should have token balances
  // Could be an oppurtunity to get precision
  @action async focusSymbol(symbolName: string) {
    console.log(symbolName, "focus symbol called on EOS");
    const tokens = this.tokenMeta.filter(token =>
      compareString(token.symbol, symbolName)
    );
    await vxm.eosNetwork.getBalances({
      tokens: tokens.map(token => ({ ...token, contract: token.account }))
    });
  }

  @action async hasExistingBalance({
    contract,
    symbol
  }: {
    contract: string;
    symbol: string;
  }) {
    try {
      const res = await client.stateTable<{ balance: string }>(
        contract,
        this.isAuthenticated,
        "accounts"
      );
      return (
        res.rows.length > 0 &&
        res.rows
          .map(x => x.json!)
          .map(({ balance }) => balance)
          .some(balance => balance.includes(symbol))
      );
    } catch (e) {
      console.log("Balance error", e);
      return false;
    }
  }

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

    const [res, fromTokenBancor, toTokenBancor] = await Promise.all([
      bancorApi.convert({
        fromCurrencyId: fromObj.id,
        toCurrencyId: toObj.id,
        amount: String(
          (fromAmount * Math.pow(10, fromObj.decimals)).toFixed(0)
        ),
        minimumReturn: String(
          (toAmount * 0.98 * Math.pow(10, toObj.decimals)).toFixed(0)
        ),
        ownerAddress: accountName
      }),
      bancorApi.getToken(fromObj.id),
      bancorApi.getToken(toObj.id)
    ]);

    const tokenContractsAndSymbols = [fromTokenBancor, toTokenBancor].map(
      bancor => ({
        contract:
          bancor.currency.details[0].blockchainId ==
          "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c"
            ? "bntbntbntbnt"
            : bancor.currency.details[0].blockchainId,
        symbol: bancor.currency.code
      })
    );
    const { actions } = res.data[0];
    const [txRes, originalBalances] = await Promise.all([
      this.triggerTx(actions),
      vxm.eosNetwork.getBalances({
        tokens: tokenContractsAndSymbols
      })
    ]);
    console.log(txRes, "was tx res");
    vxm.eosNetwork.pingTillChange({ originalBalances });
    return txRes.transaction_id;
  }

  @action async convertMulti(proposal: ProposedConvertTransaction) {
    const { fromSymbol, fromAmount, toAmount, toSymbol } = proposal;

    const fromToken = this.relayTokens.find(x => x.symbol == fromSymbol)!;
    const toToken = this.relayTokens.find(x => x.symbol == toSymbol)!;

    // @ts-ignore
    const fromSymbolInit = new Symbol(fromToken.symbol, fromToken.precision);
    // @ts-ignore
    const toSymbolInit = new Symbol(toToken.symbol, toToken.precision);
    const assetAmount = number_to_asset(Number(fromAmount), fromSymbolInit);

    const allRelays = eosMultiToDryRelays(this.convertableRelays);
    const relaysPath = createPath(fromSymbolInit, toSymbolInit, allRelays);
    const convertPath = relaysToConvertPaths(fromSymbolInit, relaysPath);

    const isAuthenticated = this.isAuthenticated;

    const memo = composeMemo(
      convertPath,
      String((toAmount * 0.96).toFixed(toSymbolInit.precision())),
      isAuthenticated
    );

    // @ts-ignore
    const fromTokenContract = fromToken.contract;
    let convertActions = await multiContract.convert(
      fromTokenContract,
      assetAmount,
      memo
    );

    const toContract = relaysPath[relaysPath.length - 1].reserves.find(
      reserve => reserve.symbol.code().to_string() == toSymbol
    )!.contract;

    const existingBalance = await this.hasExistingBalance({
      contract: toContract,
      symbol: toSymbol
    });

    if (!existingBalance) {
      const abiConf = await client.stateAbi(toContract);
      const openSupported = abiConf.abi.actions.some(
        action => action.name == "open"
      );
      if (!openSupported)
        throw new Error(
          `You do not have an existing balance of ${toSymbol} and it's token contract ${toContract} does not support 'open' functionality.`
        );
      const openActions = await multiContract.openActions(
        toContract,
        // @ts-ignore
        `${toToken.precision},${toSymbol}`,
        this.isAuthenticated
      );
      convertActions = [...openActions, ...convertActions];
    }

    const tokenContractsAndSymbols = [
      { contract: toContract, symbol: toSymbol },
      { contract: fromTokenContract, symbol: fromToken.symbol }
    ];

    const [txRes, originalBalances] = await Promise.all([
      this.triggerTx(convertActions),
      vxm.eosNetwork.getBalances({
        tokens: tokenContractsAndSymbols
      })
    ]);
    vxm.eosNetwork.pingTillChange({ originalBalances });

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
        console.log("CONVERT API");
        return this.convertApi(proposal);
      }
      case ConvertType.Multi: {
        console.log("CONVERT MULTI");

        return this.convertMulti(proposal);
      }
      case ConvertType.APItoMulti: {
        console.log("CONVERT API TO MULTI");
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
        const toToken = this.relayTokens.find(x => x.symbol == toSymbol)!;

        const fromSymbolInit = new Symbol("BNT", 10);
        // @ts-ignore
        const toSymbolInit = new Symbol(toToken.symbol, toToken.precision);
        // @ts-ignore
        const assetAmount = number_to_asset(
          Number(fromAmount),
          new Symbol(fromSymbol, fromTokenPrecision.decimals)
        );

        const allRelays = eosMultiToDryRelays(this.convertableRelays);
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

        let convertActions = await multiContract.convert(
          fromTokenContract,
          assetAmount,
          memo
        );

        const toContract = relaysPath[relaysPath.length - 1].reserves.find(
          reserve => reserve.symbol.code().to_string() == toSymbol
        )!.contract;

        const existingBalance = await this.hasExistingBalance({
          contract: toContract,
          symbol: toSymbol
        });

        if (!existingBalance) {
          const abiConf = await client.stateAbi(toContract);
          const openSupported = abiConf.abi.actions.some(
            action => action.name == "open"
          );
          if (!openSupported)
            throw new Error(
              `You do not have an existing balance of ${toSymbol} and it's token contract ${toContract} does not support 'open' functionality.`
            );
          const openActions = await multiContract.openActions(
            toContract,
            // @ts-ignore
            `${toToken.precision},${toSymbol}`,
            this.isAuthenticated
          );
          convertActions = [...openActions, ...convertActions];
        }

        const tokenContractsAndSymbols = [
          { contract: toContract, symbol: toSymbol },
          { contract: fromTokenContract, symbol: "BNT" }
        ];

        const [txRes, originalBalances] = await Promise.all([
          this.triggerTx(convertActions),
          vxm.eosNetwork.getBalances({
            tokens: tokenContractsAndSymbols
          })
        ]);

        vxm.eosNetwork.pingTillChange({ originalBalances });
        return txRes.transaction_id;
      }
      case ConvertType.MultiToApi: {
        console.log("CONVERT MULTI TO API");
        const fromToken = this.relayTokens.find(x => x.symbol == fromSymbol)!;
        const fromSymbolInit = new Symbol(
          fromToken.symbol,
          // @ts-ignore
          fromToken.precision
        );

        const toSymbolInit = new Symbol("BNT", 10);
        // @ts-ignore
        const assetAmount = number_to_asset(Number(fromAmount), fromSymbolInit);

        const allRelays = eosMultiToDryRelays(this.convertableRelays);
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

        const tokenContractsAndSymbols = [
          { contract: fromTokenContract, symbol: fromToken.symbol }
        ];

        const [txRes, originalBalances] = await Promise.all([
          this.triggerTx(convertActions),
          vxm.eosNetwork.getBalances({
            tokens: tokenContractsAndSymbols
          })
        ]);

        vxm.eosNetwork.pingTillChange({ originalBalances });
        return txRes.transaction_id;
      }
      default:
        throw new Error("Failed to decide how we're gonna convert this");
    }
  }

  @action async getEosTokenWithDecimals(
    symbolName: string
  ): Promise<TokenPriceDecimal> {
    const token = this.backgroundToken(symbolName);
    // @ts-ignore
    if (token.decimals) {
      return token as TokenPriceDecimal;
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
      client.stateTablesForScopes<ReserveTableRow>(
        process.env.VUE_APP_MULTICONTRACT!,
        relays.map(relay => relay.smartToken.symbol.code().to_string()),
        "reserves"
      ),
      client.stateTablesForScopes<SettingTableRow>(
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

    const allRelays = eosMultiToDryRelays(this.convertableRelays);
    console.log(
      this.convertableRelays.map(x => x.smartToken.symbol),
      "were the convertable relays"
    );
    const path = createPath(fromSymbolInit, toSymbolInit, allRelays);
    console.log(path, "is the path");
    const hydratedRelays = await this.hydrateRelays(path);
    console.log(
      hydratedRelays.map(x => ({
        ...x,
        symbol: x.smartToken.symbol.code().to_string()
      })),
      "are hydrated relays"
    );
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

    const allRelays = eosMultiToDryRelays(this.convertableRelays);
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
