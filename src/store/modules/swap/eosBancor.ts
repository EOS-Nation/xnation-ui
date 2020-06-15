import { VuexModule, action, Module, mutation } from "vuex-class-component";
import {
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
  TokenMeta,
  ViewAmount,
  ProposedFromTransaction,
  ProposedToTransaction
} from "@/types/bancor";
import { bancorApi, ethBancorApi } from "@/api/bancorApiWrapper";
import {
  fetchMultiRelays,
  getBalance,
  fetchTokenStats,
  compareString,
  findOrThrow,
  getTokenMeta,
  updateArray,
  fetchMultiRelay,
  buildTokenId
} from "@/api/helpers";
import {
  Sym as Symbol,
  Asset,
  asset_to_number,
  number_to_asset,
  Sym
} from "eos-common";
import { multiContract } from "@/api/multiContractTx";
import { multiContractAction } from "@/contracts/multi";
import { vxm } from "@/store";
import { rpc } from "@/api/rpc";
import {
  findCost,
  relaysToConvertPaths,
  composeMemo,
  createPath,
  DryRelay,
  HydratedRelay,
  findReturn,
  calculateFundReturn,
  TokenAmount,
  TokenSymbol
} from "@/api/eosBancorCalc";
import _ from "lodash";
import wait from "waait";
import { getHardCodedRelays } from "./staticRelays";
import { sortByNetworkTokens } from "@/api/sortByNetworkTokens";
import { liquidateAction } from "@/api/singleContractTx";

const pureTimesAsset = (asset: Asset, multiplier: number) => {
  const newAsset = new Asset(asset.to_string());
  return newAsset.times(multiplier);
};

const tokenContractSupportsOpen = async (contractName: string) => {
  const abiConf = await rpc.get_abi(contractName);
  return abiConf.abi.actions.some(action => action.name == "open");
};

const getSymbolName = (tokenSymbol: TokenSymbol) =>
  tokenSymbol.symbol.code().to_string();

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

const compareEosMultiToDry = (multi: EosMultiRelay, dry: DryRelay) =>
  compareString(
    buildTokenId({
      contract: multi.smartToken.contract,
      symbol: multi.smartToken.symbol
    }),
    buildTokenId({
      contract: dry.smartToken.contract,
      symbol: dry.smartToken.symbol.code().to_string()
    })
  );

const fetchBalanceAssets = async (tokens: BaseToken[], account: string) => {
  return Promise.all(
    tokens.map(async token => {
      const res: { rows: { balance: string }[] } = await rpc.get_table_rows({
        code: token.contract,
        scope: account,
        table: "accounts"
      });
      const assets = res.rows.map(row => new Asset(row.balance));
      const foundAsset = assets.find(
        asset => asset.symbol.code().to_string() == token.symbol
      );
      return foundAsset;
    })
  );
};

interface TokenPriceDecimal extends TokenPrice {
  decimals: number;
}

interface EosOpposingLiquid extends OpposingLiquid {
  smartTokenAmount: Asset;
}

const blackListedTokens: BaseToken[] = [
  { contract: "therealkarma", symbol: "KARMA" }
];

const appendVersionToSmartTokenSymbol = (appendedString: string) => (
  relay: EosMultiRelay
): EosMultiRelay => {
  return {
    ...relay,
    smartToken: {
      ...relay.smartToken,
      symbol: relay.smartToken.symbol + appendedString
    }
  };
};

const appendVersionToSmartTokenSymbolDry = (appendedString: string) => (
  relay: DryRelay
): DryRelay => {
  const orgSym = relay.smartToken.symbol;
  return {
    ...relay,
    smartToken: {
      ...relay.smartToken,
      symbol: new Sym(
        orgSym.code().to_string() + appendedString,
        orgSym.precision()
      )
    }
  };
};

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
): boolean =>
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

const lowestAsset = (assetOne: Asset, assetTwo: Asset) =>
  assetOne.isLessThan(assetTwo) ? assetOne : assetTwo;

const assetToSymbolName = (asset: Asset) => asset.symbol.code().to_string();

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

const compareAssetPrice = (asset: Asset, knownPrice: KnownPrice) =>
  compareString(assetToSymbolName(asset), knownPrice.symbol);

const sortByKnownToken = (assets: Asset[], knownPrices: KnownPrice[]) =>
  assets.sort(a =>
    knownPrices.some(price => compareAssetPrice(a, price)) ? -1 : 1
  );

const calculatePriceBothWays = (
  reserves: AgnosticToken[],
  knownPrices: KnownPrice[]
) => {
  const atLeastOnePriceKnown = reserves.some(reserve =>
    knownPrices.some(price => compareString(reserve.symbol, price.symbol))
  );
  if (reserves.length !== 2)
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
    const draftedToken = tokenStrategies[strat](symbolOne, symbolTwo);
    try {
      await getEosioTokenPrecision(draftedToken, multiTokenContract);
    } catch (e) {
      return draftedToken;
    }
  }
  throw new Error("Failed to find a new SmartTokenSymbol!");
};

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
  costByNetworkUsd?: number;
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
    return (id: string) => {
      const isAuthenticated = this.isAuthenticated;
      const relay = this.relaysList.find(relay => compareString(relay.id, id))!;
      if (!relay.isMultiContract) return ["removeLiquidity"];
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
              balance: balance && balance.balance,
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
      balance: this.balance(choice) && this.balance(choice)!.balance,
      img: this.tokenMetaObj(choice.symbol).logo
    }));
  }

  @action async updateFee({ fee, id }: FeeParams) {
    const relay = await this.relayById(id);
    const updateFeeAction = multiContract.updateFeeAction(
      relay.smartToken.symbol,
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

  @action async updateOwner({ id, newOwner }: NewOwnerParams) {
    const relay = await this.relayById(id);
    const updateOwnerAction = multiContract.updateOwnerAction(
      relay.smartToken.symbol,
      newOwner
    );
    const txRes = await this.triggerTx([updateOwnerAction]);
    return txRes.transaction_id as string;
  }

  @action async createPool(poolParams: CreatePoolParams): Promise<string> {
    const reserveAssets = await Promise.all(
      poolParams.reserves.map(async reserve => {
        const data = this.tokenMetaObj(reserve.id);
        return {
          amount: number_to_asset(
            Number(reserve.amount),
            new Symbol(
              data.symbol,
              await getEosioTokenPrecision(data.symbol, data.account)
            )
          ),
          contract: data.account
        };
      })
    );

    const [networkAsset, tokenAsset] = sortByNetworkTokens(
      reserveAssets.map(reserveAsset => reserveAsset.amount),
      asset => asset.symbol.code().to_string()
    );

    const smartTokenSymbol = await generateSmartTokenSymbol(
      tokenAsset.symbol.code().to_string(),
      networkAsset.symbol.code().to_string(),
      process.env.VUE_APP_SMARTTOKENCONTRACT!
    );

    const networkSymbol = networkAsset.symbol.code().to_string();
    const initialLiquidity = compareString(networkSymbol, "USDB")
      ? 0.5
      : 1 * asset_to_number(networkAsset);

    const actions = await multiContract.kickStartRelay(
      smartTokenSymbol,
      reserveAssets,
      Number(initialLiquidity.toFixed(0)),
      poolParams.fee
    );

    const res = await this.triggerTx(actions!);
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

          const x = (feed: RelayFeed) =>
            compareString(feed.smartTokenId, relayId) &&
            compareString(feed.tokenId, reserveId);
          const feed = findOrThrow(
            this.relayFeed,
            x,
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

        const tokenMeta = findOrThrow(
          this.tokenMeta,
          token =>
            compareString(token.symbol, symbol) &&
            compareString(token.account, contract)
        );
        const tokenBalance = vxm.eosNetwork.balance({
          contract,
          symbol
        });
        return {
          ...token,
          name: tokenMeta.name,
          balance: tokenBalance && Number(tokenBalance.balance),
          logo: tokenMeta.logo
        };
      });
  }

  get token(): (arg0: string) => ViewToken {
    return (id: string) => {
      const tradableToken = this.tokens.find(token =>
        compareString(token.id, id)
      );

      if (tradableToken) {
        return tradableToken;
      } else {
        const token = findOrThrow(
          this.relaysList.flatMap(relay => relay.reserves),
          token => compareString(token.id, id),
          `Failed to find token ${id} in this.token on EOS`
        );

        const meta = this.tokenMetaObj(token.symbol);

        return {
          ...token,
          name: meta.name,
          logo: meta.logo
        };
      }
    };
  }

  get relay() {
    return (id: string) => {
      return findOrThrow(
        this.relays,
        relay => compareString(relay.id, id),
        `Failed to find relay with ID of ${id}`
      );
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
      .filter(reservesIncludeTokenMeta(this.tokenMeta))
      .map(relay => {
        const relayFeed = this.relayFeed.find(feed =>
          compareString(
            feed.smartTokenId,
            buildTokenId({
              contract: relay.smartToken.contract,
              symbol: relay.smartToken.symbol
            })
          )
        );

        const sortedReserves = sortByNetworkTokens(
          relay.reserves,
          reserve => reserve.symbol
        );

        return {
          ...relay,
          id: buildTokenId({
            contract: relay.smartToken.contract,
            symbol: relay.smartToken.symbol
          }),
          symbol: sortedReserves[1].symbol,
          smartTokenSymbol: relay.smartToken.symbol,
          liqDepth: relayFeed && relayFeed.liqDepth,
          addLiquiditySupported: relay.isMultiContract,
          removeLiquiditySupported: true,
          focusAvailable: false,
          reserves: sortedReserves.map((reserve: AgnosticToken) => ({
            ...reserve,
            reserveId: relay.smartToken.symbol + reserve.symbol,
            logo: [this.token(reserve.id).logo],
            ...(reserve.amount && { balance: reserve.amount })
          }))
        };
      });
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

  @action async init() {
    try {
      const [usdPriceOfBnt, v2Relays, tokenMeta] = await Promise.all([
        vxm.bancor.fetchUsdPriceOfBnt(),
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

      const apiRelayFeeds = await this.buildPossibleRelayFeedsFromBancorApi({
        relays: passedV1Relays.filter(reservesIncludeTokenMetaDry(tokenMeta))
      });

      const relaysNotFulfilled = _.differenceWith(
        passedV1Relays,
        apiRelayFeeds,
        (a, b) =>
          compareString(
            buildTokenId({
              contract: a.smartToken.contract,
              symbol: a.smartToken.symbol.code().to_string()
            }),
            b.smartTokenId
          )
      );
      if (relaysNotFulfilled.length)
        console.warn("Relays not fulfilled", relaysNotFulfilled);

      this.buildPossibleRelayFeedsFromHydrated(
        passedV2Relays
          .filter(relayHasReserveBalances)
          .filter(reservesIncludeTokenMeta(tokenMeta))
      );

      const hydratedRelays = await this.hydrateOldRelays(passedV1Relays);

      this.buildPossibleRelayFeedsFromHydrated(
        hydratedRelays.filter(relay =>
          relaysNotFulfilled.some(r => compareEosMultiToDry(relay, r))
        )
      );

      const allRelays = [...passedV2Relays, ...hydratedRelays];

      this.setMultiRelays(allRelays);
      this.setTokenMeta(tokenMeta);

      const uniqueTokens = _.uniqBy(
        allRelays.flatMap(relay => relay.reserves),
        "id"
      );
      console.log('eosNetwork.getBalances should be called with', uniqueTokens);
      vxm.eosNetwork.getBalances({ tokens: uniqueTokens, slow: true });
    } catch (e) {
      throw new Error(`Threw inside eosBancor: ${e.message}`);
    }
  }

  @mutation updateRelayFeed(feeds: RelayFeed[]) {
    this.relayFeed = _.uniqWith(
      [...feeds, ...this.relayFeed],
      (a, b) =>
        compareString(a.smartTokenId, b.smartTokenId) &&
        compareString(a.tokenId, b.tokenId)
    );
  }

  @action async buildPossibleRelayFeedsFromHydrated(relays: EosMultiRelay[]) {
    const feeds = relays.flatMap(relay =>
      buildTwoFeedsFromRelay(relay, [
        { symbol: "USDB", unitPrice: 1 },
        { symbol: "BNT", unitPrice: this.usdPriceOfBnt }
      ])
    );
    this.updateRelayFeed(feeds);
  }

  @action async buildPossibleRelayFeedsFromBancorApi({
    relays
  }: {
    relays: DryRelay[];
  }) {
    try {
      const [tokenPrices, ethTokenPrices] = await Promise.all([
        bancorApi.getTokens(),
        ethBancorApi.getTokens()
      ]);

      const bntToken = findOrThrow(tokenPrices, token =>
        compareString(token.code, "BNT")
      );

      const usdPriceOfEth = findOrThrow(ethTokenPrices, token =>
        compareString(token.code, "ETH")
      ).price;

      const relayFeeds: RelayFeed[] = relays.flatMap(relay => {
        const [secondaryReserve, primaryReserve] = sortByNetworkTokens(
          relay.reserves,
          reserve => reserve.symbol.code().to_string()
        );
        const token = tokenPrices.find(price =>
          compareString(price.code, primaryReserve.symbol.code().to_string())
        )!;

        const includeBnt = compareString(
          relay.smartToken.symbol.code().to_string(),
          "BNTEOS"
        );

        const liqDepth = token.liquidityDepth * usdPriceOfEth * 2;

        const secondary = {
          tokenId: buildTokenId({
            contract: secondaryReserve.contract,
            symbol: secondaryReserve.symbol.code().to_string()
          }),
          smartTokenId: buildTokenId({
            contract: relay.smartToken.contract,
            symbol: relay.smartToken.symbol.code().to_string()
          })
        };

        return [
          {
            change24H: token.change24h,
            costByNetworkUsd: token.price,
            liqDepth,
            tokenId: buildTokenId({
              contract: primaryReserve.contract,
              symbol: primaryReserve.symbol.code().to_string()
            }),
            smartTokenId: buildTokenId({
              contract: relay.smartToken.contract,
              symbol: relay.smartToken.symbol.code().to_string()
            }),
            volume24H: token.volume24h.USD
          },
          includeBnt
            ? {
                ...secondary,
                liqDepth,
                costByNetworkUsd: bntToken.price,
                change24H: bntToken.change24h,
                volume24H: bntToken.volume24h.USD
              }
            : {
                ...secondary,
                liqDepth
              }
        ];
      });
      this.updateRelayFeed(relayFeeds);
      return relayFeeds;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  @action async hydrateOldRelays(relays: DryRelay[]) {
    return Promise.all(
      relays.map(
        async (relay): Promise<EosMultiRelay> => {
          const [reserves, settings, reserveBalances] = await Promise.all([
            rpc.get_table_rows({
              code: relay.contract,
              scope: relay.contract,
              table: "reserves"
            }) as Promise<{
              rows: {
                contract: string;
                currency: string;
                ratio: number;
                p_enabled: boolean;
              }[];
            }>,
            rpc.get_table_rows({
              code: relay.contract,
              scope: relay.contract,
              table: "settings"
            }) as Promise<{
              rows: {
                smart_contract: string;
                smart_currency: string;
                smart_enabled: boolean;
                enabled: boolean;
                network: string;
                max_fee: number;
                fee: number;
              }[];
            }>,
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

          const smartTokenSymbol = relay.smartToken.symbol.code().to_string();

          const smartTokenId = buildTokenId({
            contract: relay.smartToken.contract,
            symbol: smartTokenSymbol
          });

          return {
            id: smartTokenId,
            contract: relay.contract,
            isMultiContract: false,
            fee: settings.rows[0].fee / 1000000,
            owner: relay.contract,
            smartToken: {
              id: smartTokenId,
              amount: 0,
              contract: relay.smartToken.contract,
              precision: 4,
              network: "eos",
              symbol: smartTokenSymbol
            },
            reserves: mergedBalances.map(reserve => ({
              ...reserve,
              id: buildTokenId({
                contract: reserve.contract,
                symbol: assetToSymbolName(reserve.amount)
              }),
              network: "eos",
              precision: reserve.amount.symbol.precision(),
              contract: reserve.contract,
              symbol: assetToSymbolName(reserve.amount),
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
    id: relayId,
    reserves,
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

    const relay = await this.relayById(relayId);
    const deposits = reserves.map(({ id, amount }) => ({ symbol: id, amount }));

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

    onUpdate!(0, steps);

    const addLiquidityActions = multiContract.addLiquidityActions(
      relay.smartToken.symbol,
      tokenAmounts
    );

    const { smartTokenAmount } = await this.calculateOpposingDeposit({
      id: relayId,
      reserve: reserves[0]
    });

    const fundAmount = smartTokenAmount;

    const fundAction = multiContractAction.fund(
      this.isAuthenticated,
      smartTokenAmount.to_string()
    );

    const actions = [...addLiquidityActions, fundAction];
    let txRes: any;

    const tokenContractsAndSymbols: BaseToken[] = [
      {
        contract: process.env.VUE_APP_SMARTTOKENCONTRACT!,
        symbol: relay.smartToken.symbol
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
          new Symbol(relay.smartToken.symbol, 4)
        ).to_string()
      );

      const newActions = [...addLiquidityActions, backupFundAction];
      txRes = await this.triggerTx(newActions);
    }

    onUpdate!(2, steps);
    await wait(5000);
    onUpdate!(3, steps);

    const bankBalances = await this.fetchBankBalances({
      smartTokenSymbol: relay.smartToken.symbol,
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
  }): Promise<{ symbl: string; quantity: string }[]> {
    const res: {
      rows: { symbl: string; quantity: string }[];
    } = await rpc.get_table_rows({
      code: process.env.VUE_APP_MULTICONTRACT!,
      scope: accountHolder,
      table: "accounts"
    });
    return res.rows.filter(row => row.symbl == smartTokenSymbol);
  }

  @action async relayById(id: string) {
    return findOrThrow(
      this.relaysList,
      relay => compareString(relay.id, id),
      `failed to find a pool by id of ${id}`
    );
  }

  @action async viewAmountsToAssets(amounts: ViewAmount[]) {
    return amounts.map(amount => {
      const existingReserve = this.relaysList
        .find(relay =>
          relay.reserves.find(reserve =>
            compareString(amount.id, reserve.symbol)
          )
        )!
        .reserves.find(reserve => compareString(amount.id, reserve.symbol))!;
      return number_to_asset(
        Number(amount.amount),
        agnosticToAsset(existingReserve).symbol
      );
    });
  }

  @action async doubleLiquidateActions({
    relay,
    smartTokenAmount,
    reserveAssets
  }: {
    relay: EosMultiRelay;
    smartTokenAmount: Asset;
    reserveAssets: Asset[];
  }) {
    if (reserveAssets.length !== 2)
      throw new Error("Was expecting only 2 reserve assets");
    const actions = reserveAssets.map(reserveAsset =>
      liquidateAction(
        pureTimesAsset(smartTokenAmount, 0.5),
        relay.smartToken.contract,
        number_to_asset(0, reserveAsset.symbol),
        relay.contract,
        this.isAuthenticated
      )
    );
    return actions;
  }

  @action async removeLiquidityV1({
    reserves,
    id: relayId,
    onUpdate
  }: LiquidityParams): Promise<string> {
    const relay = await this.relayById(relayId);

    const supply = await fetchTokenStats(
      relay.smartToken.contract,
      relay.smartToken.symbol
    );

    const { smartTokenAmount } = await this.calculateOpposingWithdraw({
      id: relayId,
      reserve: reserves[0]
    });

    const percentChunkOfRelay =
      asset_to_number(smartTokenAmount) / asset_to_number(supply.supply);

    const bigPlaya = percentChunkOfRelay > 0.3;

    if (bigPlaya)
      throw new Error(
        "This trade makes more than 30% of the pools liquidity, it makes sense use another method for withdrawing liquidity manually due to potential slippage. Please engage us on the Telegram channel for more information."
      );

    const reserveAssets = await this.viewAmountsToAssets(reserves);
    if (reserveAssets.length !== 2)
      throw new Error("Anything other than 2 reserves not supported");

    const maxSlippage = 0.01;
    let suggestTxs = parseInt(String(percentChunkOfRelay / maxSlippage));
    if (suggestTxs == 0) suggestTxs = 1;

    const tooSmall =
      asset_to_number(pureTimesAsset(smartTokenAmount, 1 / suggestTxs)) == 0;
    if (tooSmall) suggestTxs = 1;

    const steps = Array(suggestTxs)
      .fill(null)
      .map((_, i) => ({
        name: `Withdraw${i}`,
        description: `Withdrawing Liquidity stage ${i + 1}`
      }));

    let lastTxId: string = "";
    for (var i = 0; i < suggestTxs; i++) {
      onUpdate!(i, steps);
      let txRes = await this.triggerTx(
        await this.doubleLiquidateActions({
          relay,
          reserveAssets,
          smartTokenAmount: pureTimesAsset(smartTokenAmount, 1 / suggestTxs)
        })
      );
      lastTxId = txRes.transaction_id as string;
    }
    return lastTxId;
  }

  @action async removeLiquidity({
    reserves,
    id: relayId,
    onUpdate
  }: LiquidityParams) {
    const relay = await this.relayById(relayId);
    const smartTokenSymbol = relay.smartToken.symbol;

    const isMultiRelay = relay.isMultiContract;

    if (!isMultiRelay) {
      return this.removeLiquidityV1({ reserves, id: relayId, onUpdate });
    }

    const { smartTokenAmount } = await this.calculateOpposingWithdraw({
      id: relayId,
      reserve: reserves[0]
    });

    const liquidityAsset = smartTokenAmount;

    const action = multiContract.removeLiquidityAction(liquidityAsset);

    const tokenContractsAndSymbols = [
      {
        contract: process.env.VUE_APP_SMARTTOKENCONTRACT!,
        symbol: smartTokenSymbol
      },
      ...relay.reserves.map(reserve => ({
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
    for (let i = 0; i < attempts; i++) {
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

  @action async fetchRelayReservesAsAssets(id: string) {
    const relay = await this.relayById(id);

    if (relay.isMultiContract) {
      const hydratedRelay = await fetchMultiRelay(relay.smartToken.symbol);
      return hydratedRelay.reserves.map(agnosticToAsset);
    } else {
      const [dryRelay] = eosMultiToDryRelays([relay]);
      const [hydrated] = await this.hydrateOldRelays([dryRelay]);
      return hydrated.reserves.map(agnosticToAsset);
    }
  }

  @action async getUserBalances(relayId: string) {
    const relay = await this.relayById(relayId);
    const [[smartTokenBalance], reserves, supply] = await Promise.all([
      vxm.network.getBalances({
        tokens: [
          {
            contract: relay.smartToken.contract,
            symbol: relay.smartToken.symbol
          }
        ]
      }),
      this.fetchRelayReservesAsAssets(relayId),
      fetchTokenStats(relay.smartToken.contract, relay.smartToken.symbol)
    ]);

    const smartSupply = asset_to_number(supply.supply);
    const percent = smartTokenBalance.balance / smartSupply;

    const maxWithdrawals: ViewAmount[] = reserves.map(reserve => ({
      id: reserve.symbol.code().to_string(),
      amount: String(asset_to_number(reserve) * percent)
    }));

    return {
      maxWithdrawals,
      smartTokenBalance: String(smartTokenBalance.balance)
    };
  }

  @action async tokenSupplyAsAsset({
    contract,
    symbol
  }: {
    contract: string;
    symbol: string;
  }): Promise<Asset> {
    const stats = await fetchTokenStats(contract, symbol);
    return stats.supply;
  }

  @action async calculateOpposingDeposit(
    suggestedDeposit: OpposingLiquidParams
  ): Promise<EosOpposingLiquid> {
    const relay = await this.relayById(suggestedDeposit.id);
    const [reserves, supply] = await Promise.all([
      this.fetchRelayReservesAsAssets(relay.id),
      this.tokenSupplyAsAsset({
        contract: relay.smartToken.contract,
        symbol: relay.smartToken.symbol
      })
    ]);

    const sameAsset = await this.viewAmountToAsset(suggestedDeposit.reserve);

    const tokenAmount = suggestedDeposit.reserve.amount;

    const [sameReserve, opposingReserve] = sortByNetworkTokens(
      reserves,
      assetToSymbolName,
      [assetToSymbolName(sameAsset)]
    );

    const reserveBalance = asset_to_number(sameReserve);
    const percent = Number(tokenAmount) / reserveBalance;
    const opposingNumberAmount = percent * asset_to_number(opposingReserve);

    const opposingAsset = number_to_asset(
      opposingNumberAmount,
      opposingReserve.symbol
    );

    const sameReserveFundReturn = calculateFundReturn(
      sameAsset,
      sameReserve,
      supply
    );
    const opposingReserveFundReturn = calculateFundReturn(
      opposingAsset,
      opposingReserve,
      supply
    );

    const lowerAsset = lowestAsset(
      sameReserveFundReturn,
      opposingReserveFundReturn
    );

    return {
      opposingAmount: String(asset_to_number(opposingAsset)),
      smartTokenAmount: lowerAsset
    };
  }

  @action async idToSymbol(id: string): Promise<Sym> {
    const token = await this.tokenById(id);
    return new Sym(token.symbol, token.precision);
  }

  @action async viewAmountToAsset(amount: ViewAmount): Promise<Asset> {
    return number_to_asset(
      Number(amount.amount),
      await this.idToSymbol(amount.id)
    );
  }

  @action async calculateOpposingWithdraw(
    suggestWithdraw: OpposingLiquidParams
  ): Promise<EosOpposingLiquid> {
    const relay = await this.relayById(suggestWithdraw.id);

    const sameAmountAsset = await this.viewAmountToAsset(
      suggestWithdraw.reserve
    );

    const tokenAmount = suggestWithdraw.reserve.amount;

    const [reserves, supply, smartUserBalanceString] = await Promise.all([
      this.fetchRelayReservesAsAssets(suggestWithdraw.id),
      fetchTokenStats(relay.smartToken.contract, relay.smartToken.symbol),
      getBalance(relay.smartToken.contract, relay.smartToken.symbol) as Promise<
        string
      >
    ]);

    const smartUserBalance = new Asset(smartUserBalanceString);
    const smartSupply = asset_to_number(supply.supply);

    const [sameReserve, opposingReserve] = sortByNetworkTokens(
      reserves,
      assetToSymbolName,
      [assetToSymbolName(sameAmountAsset)]
    );

    const reserveBalance = asset_to_number(sameReserve);
    // todo
    // utilise eos-common for this
    const percent = Number(tokenAmount) / reserveBalance;

    const smartTokenAmount = percent * smartSupply;

    const opposingAmountNumber = percent * asset_to_number(opposingReserve);
    const opposingAsset = number_to_asset(
      opposingAmountNumber,
      opposingReserve.symbol
    );

    return {
      opposingAmount: String(asset_to_number(opposingAsset)),
      smartTokenAmount:
        smartTokenAmount / asset_to_number(smartUserBalance) > 0.99
          ? smartUserBalance
          : number_to_asset(smartTokenAmount, smartUserBalance.symbol)
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
      const res: { rows: { balance: string }[] } = await rpc.get_table_rows({
        code: contract,
        scope: this.isAuthenticated,
        table: "accounts"
      });
      return (
        res.rows.length > 0 &&
        res.rows
          .map(({ balance }) => balance)
          .some(balance => balance.includes(symbol))
      );
    } catch (e) {
      console.log("Balance error", e);
      return false;
    }
  }

  @action async tokenById(id: string) {
    return findOrThrow(
      this.relaysList.flatMap(relay => relay.reserves),
      token => compareString(token.id, id),
      `failed to find token by its ID of ${id}`
    );
  }

  @action async convert(proposal: ProposedConvertTransaction) {
    const { from, to } = proposal;
    const fromAmount = from.amount;
    const toAmount = Number(to.amount);

    const [fromToken, toToken] = await Promise.all([
      this.tokenById(from.id),
      this.tokenById(to.id)
    ]);

    const fromSymbolInit = new Symbol(fromToken.symbol, fromToken.precision);
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

    const fromTokenContract = fromToken.contract;
    let convertActions = await multiContract.convert(
      fromTokenContract,
      assetAmount,
      memo
    );

    const toContract = toToken.contract;
    const toSymbol = toToken.symbol;

    const existingBalance = await this.hasExistingBalance({
      contract: toContract,
      symbol: toSymbol
    });

    if (!existingBalance) {
      const openActions = await this.generateOpenActions({
        contract: toToken.contract,
        symbol: toSymbolInit
      });
      convertActions = [...openActions, ...convertActions];
    }

    const txRes = await this.triggerTxAndWatchBalances({
      actions: convertActions,
      tokenIds: [from.id, to.id]
    });

    return txRes.transaction_id;
  }

  @action async generateOpenActions({
    contract,
    symbol
  }: {
    contract: string;
    symbol: Sym;
  }) {
    const openSupported = await tokenContractSupportsOpen(contract);
    if (!openSupported)
      throw new Error(
        `You do not have an existing balance of ${symbol} and it's token contract ${contract} does not support 'open' functionality.`
      );
    const openActions = await multiContract.openActions(
      contract,
      symbol.toString(true),
      this.isAuthenticated
    );
    return openActions;
  }

  // Todo
  // just change this to a promise instead.
  @action async triggerTxAndWatchBalances({
    actions,
    tokenIds
  }: {
    actions: any[];
    tokenIds: string[];
  }) {
    const fullTokens = await Promise.all(
      tokenIds.map(tokenId => this.tokenById(tokenId))
    );
    const tokens: BaseToken[] = fullTokens;
    const [txRes, originalBalances] = await Promise.all([
      this.triggerTx(actions),
      vxm.eosNetwork.getBalances({
        tokens
      })
    ]);
    vxm.eosNetwork.pingTillChange({ originalBalances });
    return txRes;
  }

  @action async hydrateV1Relays(
    v1Relays: DryRelay[]
  ): Promise<HydratedRelay[]> {
    if (v1Relays.length == 0) return [];
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
    const flat = [...v2, ...v1];
    return relays.map(
      relay =>
        flat.find(
          r =>
            r.smartToken.symbol.isEqual(relay.smartToken.symbol) &&
            compareString(r.smartToken.contract, relay.smartToken.contract)
        )!
    );
  }

  @action async hydrateV2Relays(relays: DryRelay[]): Promise<HydratedRelay[]> {
    if (relays.length == 0) return [];

    const freshRelays = await fetchMultiRelays();
    const hydratedRelays = eosMultiToHydratedRelays(freshRelays);

    const result = hydratedRelays.filter(relay =>
      relays.some(
        r =>
          compareString(relay.smartToken.contract, r.smartToken.contract) &&
          relay.smartToken.symbol.isEqual(r.smartToken.symbol)
      )
    );
    if (relays.length !== result.length)
      throw new Error(
        "Failed to hydrate all relays requested in hydrateV2Relays"
      );
    return result;
  }

  @action async getReturn({
    from,
    toId
  }: ProposedFromTransaction): Promise<ConvertReturn> {
    const assetAmount = await this.viewAmountToAsset(from);
    const toToken = await this.tokenById(toId);
    const toSymbolInit = new Symbol(toToken.symbol, toToken.precision);

    const allRelays = eosMultiToDryRelays(this.convertableRelays);
    const path = createPath(assetAmount.symbol, toSymbolInit, allRelays);
    const hydratedRelays = await this.hydrateRelays(path);
    const calculatedReturn = findReturn(assetAmount, hydratedRelays);

    return {
      amount: String(asset_to_number(calculatedReturn.amount)),
      slippage: calculatedReturn.highestSlippage
    };
  }

  @action async getCost({ fromId, to }: ProposedToTransaction) {
    const assetAmount = await this.viewAmountToAsset(to);

    const fromToken = await this.tokenById(fromId);
    const fromSymbolInit = new Symbol(fromToken.symbol, fromToken.precision);

    const allRelays = eosMultiToDryRelays(this.convertableRelays);
    const path = createPath(fromSymbolInit, assetAmount.symbol, allRelays);
    const hydratedRelays = await this.hydrateRelays(path);
    const calculatedCost = findCost(assetAmount, hydratedRelays);

    return {
      amount: String(asset_to_number(calculatedCost.amount)),
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
    this.usdPriceOfBnt = price;
  }

  @mutation setTokenMeta(tokens: TokenMeta[]) {
    this.tokenMeta = tokens.filter(token => token.chain == "eos");
  }
}

export const eosBancor = EosBancorModule.ExtractVuexModule(EosBancorModule);
