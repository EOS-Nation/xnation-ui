import { VuexModule, action, Module, mutation } from "vuex-class-component";
import {
  ProposedTransaction,
  ProposedConvertTransaction,
  TokenPrice,
  TradingModule,
  LiquidityModule,
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
  Step,
  Token
} from "@/types/bancor";
import { bancorApi } from "@/api/bancor";
import {
  fetchMultiRelays,
  getBalance,
  fetchTokenStats,
  compareString,
  SettingTableRow,
  ReserveTableRow,
  fetchBinanceUsdPriceOfBnt,
  findOrThrow
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
  createPath,
  DryRelay,
  HydratedRelay,
  findReturn,
  calculateFundReturn,
  TokenAmount
} from "@/api/bancorCalc";
import _ from "lodash";
import wait from "waait";
import { MultiStateResponse } from "@dfuse/client";
import { getHardCodedRelays } from "./staticRelays";

const updateArray = <T>(
  arr: T[],
  conditioner: (element: T) => boolean,
  updater: (element: T) => T
) => {
  return arr.map(element =>
    conditioner(element) ? updater(element) : element
  );
};

const relayHasReserveBalances = (relay: EosMultiRelay) =>
  relay.reserves.every(reserve => reserve.amount > 0);

const reservesIncludeTokenMeta = (tokenMeta: TokenMeta[]) => (
  relay: EosMultiRelay
) =>
  relay.reserves.every(reserve =>
    tokenMeta.some(
      meta =>
        compareString(reserve.contract, meta.account) &&
        compareString(reserve.symbol, meta.symbol)
    )
  );

const reservesIncludeTokenMetaDry = (tokenMeta: TokenMeta[]) => (
  relay: DryRelay
) =>
  relay.reserves.every(reserve =>
    tokenMeta.some(
      meta =>
        compareString(reserve.contract, meta.account) &&
        compareString(reserve.symbol.code().to_string(), meta.symbol)
    )
  );

const buildTokenId = ({
  contract,
  symbol
}: {
  contract: string;
  symbol: string;
}): string => `${contract}:${symbol}`;

const fetchBalanceAssets = async (
  tokens: { symbol: string; contract: string }[],
  account: string
) => {
  return Promise.all(
    tokens.map(async token => {
      const res = await client.stateTable<{ balance: string }>(
        token.contract,
        account,
        "accounts"
      );
      const assets = res.rows
        .map(row => row.json!)
        .map(row => new Asset(row.balance));
      const foundAsset = assets.find(
        asset => asset.symbol.code().to_string() == token.symbol
      );
      if (!foundAsset) undefined;
      return foundAsset;
    })
  );
};

interface TokenPriceDecimal extends TokenPrice {
  decimals: number;
}

const blackListedTokens: BaseToken[] = [
  { contract: "therealkarma", symbol: "KARMA" }
];

const noBlackListedReservesDry = (blackListedTokens: BaseToken[]) => (
  relay: DryRelay
) =>
  relay.reserves.every(reserve =>
    blackListedTokens.some(
      token =>
        !(
          compareString(reserve.contract, token.contract) &&
          compareString(reserve.symbol.code().to_string(), token.symbol)
        )
    )
  );

const noBlackListedReserves = (blackListedTokens: BaseToken[]) => (
  relay: EosMultiRelay
) =>
  relay.reserves.every(reserve =>
    blackListedTokens.some(
      token =>
        !(
          compareString(reserve.contract, token.contract) &&
          compareString(reserve.symbol, reserve.symbol)
        )
    )
  );

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

const agnosticToAsset = (agnostic: AgnosticToken): Asset =>
  number_to_asset(
    agnostic.amount,
    new Sym(agnostic.symbol, agnostic.precision)
  );

const simpleReturn = (from: Asset, to: Asset) =>
  asset_to_number(to) / asset_to_number(from);

const baseReturn = (from: AgnosticToken, to: AgnosticToken, decAmount = 1) => {
  const fromAsset = agnosticToAsset(from);
  const toAsset = agnosticToAsset(to);
  const reward = simpleReturn(fromAsset, toAsset);
  return number_to_asset(reward, toAsset.symbol);
};

interface KnownPrice {
  symbol: string;
  unitPrice: number;
}

// const networkReserveIsUsd = networkReserve.symbol == "USDB";
// const dec = networkReserveAmount / tokenAmount;
// const reverse = tokenAmount / networkReserveAmount;
// const main = networkReserveIsUsd ? dec : dec * usdPriceOfBnt;

// const liqDepth =
//   (networkReserveIsUsd
//     ? networkReserveAmount
//     : networkReserveAmount * usdPriceOfBnt) * 2;

// return [
//   {
//     tokenId: tokenReserve.contract,
//     smartTokenContract: relay.smartToken.contract,
//     costByNetworkUsd: main,
//     liqDepth
//   },
//   {
//     tokenId: networkReserve.contract,
//     smartTokenContract: relay.smartToken.contract,
//     liqDepth,
//     costByNetworkUsd: reverse * main
//   }
// ];

const compareAssetPrice = (asset: Asset, knownPrice: KnownPrice) =>
  compareString(asset.symbol.code().to_string(), knownPrice.symbol);

const sortByKnownToken = (assets: Asset[], knownPrices: KnownPrice[]) =>
  assets.sort(a =>
    knownPrices.some(price => compareAssetPrice(a, price)) ? -1 : 1
  );

const calculatePriceBothWays = (
  reserves: AgnosticToken[],
  knownPrices: KnownPrice[]
) => {
  const workingLength = 2;
  const atLeastOnePriceKnown = reserves.some(reserve =>
    knownPrices.some(price => compareString(reserve.symbol, price.symbol))
  );
  if (reserves.length !== workingLength)
    throw new Error("This only works for 2 reserve relays");
  if (!atLeastOnePriceKnown)
    throw new Error(
      "Failed to determine USD price, was not passed in known prices"
    );
  if (reserves.some(reserve => reserve.amount == 0))
    throw new Error("One of more of the reserves passed has a zero balance");

  const [reserveOne, reserveTwo] = reserves;
  const rewards = [
    baseReturn(reserveOne, reserveTwo),
    baseReturn(reserveTwo, reserveOne)
  ];

  const [knownValue, unknownValue] = sortByKnownToken(rewards, knownPrices);

  const knownToken = knownPrices.find(price =>
    compareAssetPrice(knownValue, price)
  )!.unitPrice;
  const unknownToken = asset_to_number(knownValue) * knownToken;

  return [
    {
      unitPrice: knownToken,
      symbol: knownValue.symbol.code().to_string()
    },
    {
      unitPrice: unknownToken,
      symbol: unknownValue.symbol.code().to_string()
    }
  ];
};

const calculateLiquidtyDepth = (
  relay: EosMultiRelay,
  knownPrices: KnownPrice[]
) => {
  const [indexedToken] = sortByKnownToken(
    relay.reserves.map(agnosticToAsset),
    knownPrices
  );
  return (
    asset_to_number(indexedToken) *
    knownPrices.find(price => compareAssetPrice(indexedToken, price))!.unitPrice
  );
};

const buildTwoFeedsFromRelay = (
  relay: EosMultiRelay,
  knownPrices: KnownPrice[]
): RelayFeed[] => {
  const prices = calculatePriceBothWays(relay.reserves, knownPrices);
  return prices.map(price => {
    const token = relay.reserves.find(reserve =>
      compareString(reserve.symbol, price.symbol)
    )!;
    return {
      costByNetworkUsd: price.unitPrice,
      liqDepth: calculateLiquidtyDepth(relay, knownPrices),
      smartTokenId: buildTokenId({
        contract: relay.smartToken.contract,
        symbol: relay.smartToken.symbol
      }),
      tokenId: buildTokenId({ contract: token.contract, symbol: token.symbol })
    };
  });
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
  res.data.push({
    name: "EOS",
    logo:
      "https://storage.googleapis.com/bancor-prod-file-store/images/communities/359b8290-0767-11e8-8744-97748b632eaf.png",
    logo_lg:
      "https://storage.googleapis.com/bancor-prod-file-store/images/communities/359b8290-0767-11e8-8744-97748b632eaf.png",
    symbol: "EOS",
    account: "eosio.token",
    chain: "eos"
  });
  return res.data.filter(token => compareString(token.chain, "eos"));
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
    isMultiContract: relay.isMultiContract
  }));

const eosMultiToHydratedRelays = (relays: EosMultiRelay[]): HydratedRelay[] =>
  relays.map(relay => ({
    reserves: relay.reserves.map(
      (reserve): TokenAmount => ({
        contract: reserve.contract,
        amount: number_to_asset(
          reserve.amount,
          new Symbol(reserve.symbol, reserve.precision)
        )
      })
    ),
    contract: relay.contract,
    fee: relay.fee,
    isMultiContract: relay.isMultiContract,
    smartToken: {
      symbol: new Symbol(relay.smartToken.symbol, relay.smartToken.precision),
      contract: relay.smartToken.contract
    }
  }));

type FeatureEnabled = (relay: EosMultiRelay, loggedInUser: string) => boolean;
type Feature = [string, FeatureEnabled];

const isOwner: FeatureEnabled = (relay, account) => relay.owner == account;

const multiRelayToSmartTokenId = (relay: EosMultiRelay) =>
  buildTokenId({
    contract: relay.smartToken.contract,
    symbol: relay.smartToken.symbol
  });

interface RelayFeed {
  smartTokenId: string;
  tokenId: string;
  liqDepth: number;
  costByNetworkUsd: number;
  change24H?: number;
  volume24H?: number;
}

@Module({ namespacedPath: "eosBancor/" })
export class EosBancorModule extends VuexModule
  implements TradingModule, LiquidityModule, CreatePoolModule {
  relaysList: EosMultiRelay[] = [];
  relayFeed: RelayFeed[] = [];
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

  get relaysWithFeeds() {
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
      .filter(relay =>
        relay.reserves.every(reserve => {
          const relayId = buildTokenId({
            contract: relay.smartToken.contract,
            symbol: relay.smartToken.symbol
          });
          const reserveId = buildTokenId({
            contract: reserve.contract,
            symbol: reserve.symbol
          });
          const feed = this.relayFeed.find(
            feed =>
              compareString(feed.smartTokenId, relayId) &&
              compareString(feed.tokenId, reserveId)
          );
          if (!feed)
            console.warn(
              `Failed finding a feed for ${reserve.symbol} ${
                reserve.contract
              } ${relay.smartToken.symbol} ${
                relay.isMultiContract
                  ? "is a multi contract"
                  : "is NOT a multiContract"
              }`
            );
          return feed;
        })
      );
  }

  get tokens(): ViewToken[] {
    return this.relaysWithFeeds
      .flatMap(relay =>
        relay.reserves.map(reserve => {
          const relayId = buildTokenId({
            contract: relay.smartToken.contract,
            symbol: relay.smartToken.symbol
          });
          const reserveId = buildTokenId({
            contract: reserve.contract,
            symbol: reserve.symbol
          });

          const feed = findOrThrow(
            this.relayFeed,
            feed =>
              compareString(feed.smartTokenId, relayId) &&
              compareString(feed.tokenId, reserveId),
            `failed finding relay feed for ${relayId} ${reserveId}`
          );
          return {
            id: buildTokenId({
              contract: reserve.contract,
              symbol: reserve.symbol
            }),
            symbol: reserve.symbol,
            price: feed.costByNetworkUsd,
            change24h: feed.change24H,
            liqDepth: feed.liqDepth,
            volume24h: feed.volume24H,
            contract: reserve.contract,
            precision: reserve.precision
          };
        })
      )
      .sort((a, b) => b.liqDepth - a.liqDepth)
      .reduce<any[]>((acc, item) => {
        console.log(acc, item, "was acc");
        const existingToken = acc.find(token =>
          compareString(token.id, item.id)
        );

        return existingToken
          ? updateArray(
              acc,
              token => compareString(token.id, item.id),
              token => ({
                ...token,
                liqDepth: existingToken.liqDepth + item.liqDepth,
                ...(!existingToken.change24h &&
                  item.change24h && { change24h: item.change24h }),
                ...(!existingToken.volume24h &&
                  item.volume24h && { volume24h: item.volume24h })
              })
            )
          : [...acc, item];
      }, [])
      .map(token => {
        const { symbol, contract } = token;
        console.assert(
          symbol && contract,
          `${JSON.stringify(token)} has failed to provide`
        );
        const tokenMeta = findOrThrow(
          this.tokenMeta,
          token =>
            compareString(token.symbol, symbol) &&
            compareString(token.account, contract)
        );
        const tokenBalance = vxm.eosNetwork.balance({
          symbol,
          contract
        });
        return {
          ...token,
          name: tokenMeta!.name,
          balance: tokenBalance && Number(tokenBalance.balance),
          logo:
            (tokenMeta && tokenMeta.logo) || "https://via.placeholder.com/50"
        };
      });
  }

  get token(): (arg0: string) => ViewToken {
    return (symbolName: string) => {
      const token = findOrThrow(
        this.tokens,
        token => compareString(token.symbol, symbolName),
        `Failed to find token ${symbolName}`
      );
      if (token && !token.logo) {
        token["logo"] = "https://via.placeholder.com/50";
      }
      return token;
    };
  }

  get relay() {
    return (symbolName: string) => {
      const relay = this.relaysList.find(relay =>
        compareString(relay.smartToken.symbol, symbolName)
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
        liqDepth:
          this.relayFeed.find(feed =>
            compareString(
              feed.smartTokenId,
              buildTokenId({
                contract: relay.smartToken.contract,
                symbol: relay.smartToken.symbol
              })
            )
          )!.liqDepth || 0,
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
    return this.relaysWithFeeds
      .map(relay => {
        const relayId = buildTokenId({
          contract: relay.smartToken.contract,
          symbol: relay.smartToken.symbol
        });
        const feed = this.relayFeed.find(feed =>
          compareString(feed.smartTokenId, relayId)
        )!;
        return {
          ...relay,
          liqDepth: feed!.liqDepth
        };
      })
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

  @mutation setRelayFeeds(relayFeeds: RelayFeed[]) {
    this.relayFeed = relayFeeds;
  }

  @action async init() {
    const [usdPriceOfBnt, v2Relays, tokenMeta] = await Promise.all([
      fetchBinanceUsdPriceOfBnt(),
      fetchMultiRelays(),
      getTokenMeta()
    ]);
    this.setBntPrice(usdPriceOfBnt);

    const v1Relays = getHardCodedRelays();

    const passedV1Relays = v1Relays.filter(
      noBlackListedReservesDry(blackListedTokens)
    );

    const passedV2Relays = v2Relays.filter(
      noBlackListedReserves(blackListedTokens)
    );

    this.buildPossibleRelayFeedsFromBancorApi({
      relays: passedV1Relays.filter(reservesIncludeTokenMetaDry(tokenMeta))
    });

    this.buildPossibleRelayFeedsFromHydrated({
      relays: passedV2Relays
        .filter(relayHasReserveBalances)
        .filter(reservesIncludeTokenMeta(tokenMeta))
    });

    const hydratedRelays = await this.hydrateOldRelays(passedV1Relays);

    this.setMultiRelays([...passedV2Relays, ...hydratedRelays]);
    this.setTokenMeta(tokenMeta);
    this.refreshBalances();
  }

  @mutation updateRelayFeed(feeds: RelayFeed[]) {
    this.relayFeed = _.uniqWith(
      [...feeds, ...this.relayFeed],
      (a, b) =>
        compareString(a.smartTokenId, b.smartTokenId) &&
        compareString(a.tokenId, b.tokenId)
    );
  }

  @action async buildPossibleRelayFeedsFromHydrated({
    relays
  }: {
    relays: EosMultiRelay[];
  }) {
    const feeds = relays
      .map(relay =>
        buildTwoFeedsFromRelay(relay, [
          { symbol: "USDB", unitPrice: 1 },
          { symbol: "BNT", unitPrice: this.usdPriceOfBnt }
        ])
      )
      .flat(1);
    console.log(feeds, "are the feeds");
    this.updateRelayFeed(feeds);
  }

  @action async buildPossibleRelayFeedsFromBancorApi({
    relays
  }: {
    relays: DryRelay[];
  }) {
    try {
      const tokenPrices = await bancorApi.getTokens();

      const zipped: [DryRelay, TokenPrice][] = relays.map(relay => {
        const token = tokenPrices
          .sort((a, b) => (b.code == "BNT" ? -1 : 1))
          .find(token =>
            relay.reserves.some(reserve =>
              compareString(reserve.symbol.code().to_string(), token.code)
            )
          )!;
        return [relay, token];
      });

      const relayFeeds: RelayFeed[] = zipped
        .filter(arr => arr.every(Boolean))
        .flatMap(([relay, token]) =>
          relay.reserves.map(reserve => ({
            change24H: token.change24h,
            costByNetworkUsd: token.price,
            liqDepth: token.liquidityDepth,
            tokenId: buildTokenId({
              contract: reserve.contract,
              symbol: reserve.symbol.code().to_string()
            }),
            smartTokenId: buildTokenId({
              contract: relay.smartToken.contract,
              symbol: relay.smartToken.symbol.code().to_string()
            }),
            volume24H: token.volume24h.USD
          }))
        );
      this.updateRelayFeed(relayFeeds);
    } catch (e) {
      console.error(e);
    }
  }

  @action async hydrateOldRelays(relays: DryRelay[]) {
    return Promise.all(
      relays.map(
        async (relay): Promise<EosMultiRelay> => {
          const [reserves, settings, reserveBalances] = await Promise.all([
            client.stateTable<{
              contract: string;
              currency: string;
              ratio: number;
              p_enabled: boolean;
            }>(relay.contract, relay.contract, "reserves"),
            client.stateTable<{
              smart_contract: string;
              smart_currency: string;
              smart_enabled: boolean;
              enabled: boolean;
              network: string;
              max_fee: number;
              fee: number;
            }>(relay.contract, relay.contract, "settings"),
            fetchBalanceAssets(
              relay.reserves.map(reserve => ({
                contract: reserve.contract,
                symbol: reserve.symbol.code().to_string()
              })),
              relay.contract
            ) as Promise<Asset[]>
          ]);

          const allBalancesFetched = reserveBalances.every(Boolean);
          if (!allBalancesFetched)
            throw new Error(
              `Failed to find both reserve balances on old pool ${relay.contract}`
            );

          const mergedBalances = relay.reserves.map(reserve => ({
            ...reserve,
            amount: reserveBalances.find(balance =>
              balance.symbol.isEqual(reserve.symbol)
            )!
          }));

          return {
            contract: relay.contract,
            isMultiContract: false,
            fee: settings.rows[0].json!.fee / 1000000,
            owner: relay.contract,
            smartToken: {
              amount: 0,
              contract: relay.smartToken.contract,
              precision: 4,
              network: "eos",
              symbol: relay.smartToken.symbol.code().to_string()
            },
            reserves: mergedBalances.map(reserve => ({
              ...reserve,
              network: "eos",
              precision: reserve.amount.symbol.precision(),
              contract: reserve.contract,
              symbol: reserve.amount.symbol.code().to_string(),
              amount: asset_to_number(reserve.amount)
            }))
          };
        }
      )
    );
  }

  @action async refreshBalances(tokens: BaseToken[] = []) {
    if (!this.isAuthenticated) return;
    if (tokens.length > 0) {
      await vxm.eosNetwork.getBalances({ tokens });
      return;
    }
    await vxm.eosNetwork.getBalances();
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

    const tokenContractsAndSymbols = [
      {
        contract: process.env.VUE_APP_SMARTTOKENCONTRACT!,
        symbol: smartTokenSymbol
      },
      ...tokenAmounts.map(tokenAmount => ({
        contract: tokenAmount.contract,
        symbol: tokenAmount.amount.symbol.code().to_string()
      }))
    ];

    const originalBalances = await vxm.eosNetwork.getBalances({
      tokens: tokenContractsAndSymbols
    });

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
    vxm.eosNetwork.pingTillChange({ originalBalances });
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

    const tokenContractsAndSymbols = [
      {
        contract: process.env.VUE_APP_SMARTTOKENCONTRACT!,
        symbol: smartTokenSymbol
      },
      ...this.convertableRelays
        .find(relay =>
          compareString(relay.smartToken.symbol, smartTokenSymbol)
        )!
        .reserves.map(reserve => ({
          contract: reserve.contract,
          symbol: reserve.symbol
        }))
    ];

    const [txRes, originalBalances] = await Promise.all([
      this.triggerTx([action]),
      vxm.eosNetwork.getBalances({
        tokens: tokenContractsAndSymbols
      })
    ]);
    vxm.eosNetwork.pingTillChange({ originalBalances });
    this.waitAndUpdate(6000);

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
      const relays = await fetchMultiRelays();
      const includesRelay = relays.find(relay =>
        compareString(relay.smartToken.symbol, smartToken)
      );
      if (includesRelay) {
        this.setMultiRelays(relays);
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

  @action async convert(proposal: ProposedConvertTransaction) {
    const { fromSymbol, fromAmount, toAmount, toSymbol } = proposal;

    const fromToken = this.tokens.find(x => x.symbol == fromSymbol)!;
    const toToken = this.tokens.find(x => x.symbol == toSymbol)!;

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

  @action async hydrateV1Relays(
    v1Relays: DryRelay[]
  ): Promise<HydratedRelay[]> {
    const hydrated = await this.hydrateOldRelays(v1Relays);
    return eosMultiToHydratedRelays(hydrated);
  }

  @action async hydrateRelays(relays: DryRelay[]): Promise<HydratedRelay[]> {
    const v1Relays = relays.filter(relay => !relay.isMultiContract);
    const v2Relays = relays.filter(relay => relay.isMultiContract);
    const [v1, v2] = await Promise.all([
      this.hydrateV1Relays(v1Relays),
      this.hydrateV2Relays(v2Relays)
    ]);
    return [...v2, ...v1];
  }

  @action async hydrateV2Relays(relays: DryRelay[]): Promise<HydratedRelay[]> {
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

  @action async getReturn({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction): Promise<ConvertReturn> {
    const fromToken = this.tokens.find(x => x.symbol == fromSymbol)!;
    const toToken = this.tokens.find(x => x.symbol == toSymbol)!;

    const fromSymbolInit = new Symbol(fromToken.symbol, fromToken.precision);
    const toSymbolInit = new Symbol(toToken.symbol, toToken.precision);
    const assetAmount = number_to_asset(Number(amount), fromSymbolInit);

    const allRelays = eosMultiToDryRelays(this.convertableRelays);
    const path = createPath(fromSymbolInit, toSymbolInit, allRelays);
    console.log(path, "is the path");
    const hydratedRelays = await this.hydrateRelays(path);
    const calculatedReturn = findReturn(assetAmount, hydratedRelays);

    return {
      amount: String(asset_to_number(calculatedReturn.amount)),
      slippage: calculatedReturn.highestSlippage
    };
  }

  @action async getCost({ fromSymbol, toSymbol, amount }: ProposedTransaction) {
    const fromToken = this.tokens.find(x => x.symbol == fromSymbol)!;
    const toToken = this.tokens.find(x => x.symbol == toSymbol)!;

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

  @action async triggerTx(actions: any[]) {
    // @ts-ignore
    return this.$store.dispatch("eosWallet/tx", actions, { root: true });
  }

  @mutation setMultiRelays(relays: EosMultiRelay[]) {
    this.relaysList = relays;
  }

  @mutation setBntPrice(price: number) {
    console.log("setting price", price);
    this.usdPriceOfBnt = price;
  }

  @mutation setTokenMeta(tokens: TokenMeta[]) {
    this.tokenMeta = tokens.filter(token => token.chain == "eos");
  }
}

export const eosBancor = EosBancorModule.ExtractVuexModule(EosBancorModule);
