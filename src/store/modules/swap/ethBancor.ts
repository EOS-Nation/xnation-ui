import { createModule, mutation, action } from "vuex-class-component";
import {
  ProposedFromTransaction,
  ProposedToTransaction,
  ProposedConvertTransaction,
  LiquidityParams,
  OpposingLiquidParams,
  OpposingLiquid,
  TradingModule,
  LiquidityModule,
  BaseToken,
  CreatePoolModule,
  CreatePoolParams,
  ModalChoice,
  ViewToken,
  ViewRelay,
  TokenPrice,
  Section,
  Step,
  HistoryModule,
  ViewAmount,
  ModuleParam,
  UserPoolBalances,
  CallReturn
} from "@/types/bancor";
import { ethBancorApi } from "@/api/bancorApiWrapper";
import {
  web3,
  Relay,
  Token,
  fetchReserveBalance,
  compareString,
  findOrThrow,
  updateArray,
  networkTokens,
  isOdd,
  multiSteps,
  EthNetworks,
  PoolType,
  Anchor,
  PoolToken,
  TraditionalRelay,
  ChainLinkRelay,
  SmartToken,
  PoolContainer,
  viewTokenToModalChoice,
  reserveIncludedInRelay,
  sortAlongSide
} from "@/api/helpers";
import { ContractSendMethod } from "web3-eth-contract";
import {
  ABIContractRegistry,
  ABIConverterRegistry,
  ABINetworkPathFinder,
  ethErc20WrapperContract,
  ethReserveAddress
} from "@/api/ethConfig";
import { toWei, fromWei, isAddress, toHex, asciiToHex } from "web3-utils";
import Decimal from "decimal.js";
import axios, { AxiosResponse } from "axios";
import { vxm } from "@/store";
import wait from "waait";
import _, { uniqWith } from "lodash";
import {
  DryRelay,
  TokenSymbol,
  generateEthPath,
  buildConverterContract,
  buildTokenContract,
  expandToken,
  shrinkToken,
  buildRegistryContract,
  buildV28ConverterContract,
  buildNetworkContract,
  makeBatchRequest,
  buildV2Converter,
  MinimalRelay,
  buildV2PoolsContainer,
  buildMultiCallContract
} from "@/api/ethBancorCalc";
import { ethBancorApiDictionary } from "@/api/bancorApiRelayDictionary";
import {
  getSmartTokenHistory,
  fetchSmartTokens,
  HistoryItem
} from "@/api/zumZoom";
import { sortByNetworkTokens } from "@/api/sortByNetworkTokens";
import { findNewPath } from "@/api/eosBancorCalc";
import { priorityEthPools } from "./staticRelays";
import BigNumber from "bignumber.js";

const metaToModalChoice = (meta: TokenMeta): ModalChoice => ({
  id: meta.contract,
  contract: meta.contract,
  symbol: meta.symbol,
  img: meta.image
});

const isTraditional = (relay: Relay): boolean =>
  typeof relay.anchor == "object" &&
  relay.converterType == PoolType.Traditional;

const isChainLink = (relay: Relay): boolean =>
  Array.isArray((relay.anchor as PoolContainer).poolTokens) &&
  relay.converterType == PoolType.ChainLink;

const assertTraditional = (relay: Relay): TraditionalRelay => {
  if (isTraditional(relay)) {
    return relay as TraditionalRelay;
  }
  throw new Error("Not a traditional relay");
};

const assertChainlink = (relay: Relay): ChainLinkRelay => {
  if (isChainLink(relay)) {
    return relay as ChainLinkRelay;
  }
  throw new Error("Not a chainlink relay");
};

interface AnchorProps {
  anchor: Anchor;
  converterType: PoolType;
}

const tokensInRelay = (relay: Relay): Token[] => {
  const reserveTokens = relay.reserves;
  if (relay.converterType == PoolType.ChainLink) {
    const poolContainer = relay.anchor as PoolContainer;
    const poolTokens = poolContainer.poolTokens;
    const tokens = poolTokens.map(token => token.poolToken);
    return [...reserveTokens, ...tokens];
  } else if (relay.converterType == PoolType.Traditional) {
    const smartToken = relay.anchor as SmartToken;
    return [...reserveTokens, smartToken];
  } else throw new Error("Failed to identify pool");
};
interface EthNetworkVariables {
  contractRegistry: string;
  bntToken: string;
  ethToken: string;
  multiCall: string;
}

const getNetworkVariables = (ethNetwork: EthNetworks): EthNetworkVariables => {
  switch (ethNetwork) {
    case EthNetworks.Mainnet:
      return {
        contractRegistry: "0x52Ae12ABe5D8BD778BD5397F99cA900624CfADD4",
        bntToken: "0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C",
        ethToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        multiCall: "0x5Eb3fa2DFECdDe21C950813C665E9364fa609bD2"
      };
    case EthNetworks.Ropsten:
      return {
        contractRegistry: "0x57547da3406cbA9f80a989497173F5bC5438BFCF",
        bntToken: "0xD4F9CBC9db55E039BE979d88d15F57A57552f32d",
        ethToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        multiCall: "0xf3ad7e31b052ff96566eedd218a823430e74b406"
      };
    default:
      throw new Error("Information not stored");
  }
};

interface WeiExtendedAsset {
  weiAmount: string;
  contract: string;
}

const relayToMinimal = (relay: Relay): MinimalRelay => ({
  contract: relay.contract,
  reserves: relay.reserves.map(
    (reserve): TokenSymbol => ({
      contract: reserve.contract,
      symbol: reserve.symbol
    })
  ),
  anchorAddress: isTraditional(relay)
    ? (relay.anchor as SmartToken).contract
    : (relay.anchor as PoolContainer).poolContainerAddress
});

const sortSmartTokenAddressesByHighestLiquidity = (
  tokens: TokenPrice[],
  smartTokenAddresses: string[]
): string[] => {
  const sortedTokens = tokens
    .slice()
    .sort((a, b) => b.liquidityDepth - a.liquidityDepth);

  const sortedDictionary = sortedTokens
    .map(
      token =>
        ethBancorApiDictionary.find(dic =>
          compareString(token.id, dic.tokenId)
        )!
    )
    .filter(Boolean);

  const res = sortAlongSide(
    smartTokenAddresses,
    pool => pool,
    sortedDictionary.map(x => x.smartTokenAddress)
  );

  const isSame = res.every((item, index) => smartTokenAddresses[index] == item);
  if (isSame)
    console.warn(
      "Sorted by Highest liquidity sorter is returning the same array passed"
    );
  return res;
};

interface EthOpposingLiquid {
  smartTokenAmount: ViewAmount;
  opposingAmount: string;
}

const relayIncludesAtLeastOneNetworkToken = (relay: Relay) =>
  relay.reserves.some(reserve => networkTokens.includes(reserve.symbol));

const compareRelayFeed = (a: ReserveFeed, b: ReserveFeed) =>
  compareString(a.poolId, b.poolId) && compareString(a.tokenId, b.tokenId);

const tokenPriceToFeed = (
  tokenAddress: string,
  smartTokenAddress: string,
  usdPriceOfEth: number,
  tokenPrice: TokenPrice
): ReserveFeed => ({
  tokenId: tokenAddress,
  poolId: smartTokenAddress,
  costByNetworkUsd: tokenPrice.price,
  liqDepth: tokenPrice.liquidityDepth * usdPriceOfEth * 2,
  change24H: tokenPrice.change24h,
  volume24H: tokenPrice.volume24h.USD
});

interface RegisteredContracts {
  BancorNetwork: string;
  BancorConverterRegistry: string;
}

const removeLeadingZeros = (hexString: string) => {
  console.log(hexString, "was received on remove leading zeros");
  const withoutOx = hexString.startsWith("0x") ? hexString.slice(2) : hexString;
  const initialAttempt =
    "0x" + withoutOx.slice(withoutOx.split("").findIndex(x => x !== "0"));
  if (isAddress(initialAttempt)) return initialAttempt;
  const secondAttempt = [
    "0",
    "x",
    "0",
    ...initialAttempt.split("").slice(2)
  ].join("");
  if (isAddress(secondAttempt)) return secondAttempt;
  else throw new Error(`Failed parsing hex ${hexString}`);
};

const zeroAddress: string = "0x0000000000000000000000000000000000000000";

const relayReservesIncludedInTokenMeta = (tokenMeta: TokenMeta[]) => (
  relay: Relay
) =>
  relay.reserves.every(reserve =>
    tokenMeta.some(meta => compareString(reserve.contract, meta.contract))
  );

const percentageOfReserve = (
  percent: number,
  existingSupply: string
): string => {
  return new Decimal(percent).times(existingSupply).toFixed(0);
};

const percentageIncrease = (
  deposit: string,
  existingSupply: string
): number => {
  return new Decimal(deposit).div(existingSupply).toNumber();
};

const calculateOppositeFundRequirement = (
  deposit: string,
  depositsSupply: string,
  oppositesSupply: string
): string => {
  const increase = percentageIncrease(deposit, depositsSupply);
  return percentageOfReserve(increase, oppositesSupply);
};

const calculateOppositeLiquidateRequirement = (
  reserveAmount: string,
  reserveBalance: string,
  oppositeReserveBalance: string
) => {
  const increase = percentageIncrease(reserveAmount, reserveBalance);
  return percentageOfReserve(increase, oppositeReserveBalance);
};

const oneMillion = new BigNumber(1000000);

const calculateFundReward = (
  reserveAmount: string,
  reserveSupply: string,
  smartSupply: string
) => {
  Decimal.set({ rounding: 0 });
  return new Decimal(reserveAmount)
    .div(reserveSupply)
    .times(smartSupply)
    .times(0.99)
    .toFixed(0);
};

const calculateLiquidateCost = (
  reserveAmount: string,
  reserveBalance: string,
  smartSupply: string
) => {
  const percent = percentageIncrease(reserveAmount, reserveBalance);
  return percentageOfReserve(percent, smartSupply);
};

const percentDifference = (smallAmount: string, bigAmount: string) =>
  new Decimal(smallAmount).div(bigAmount).toNumber();

const tokenMetaDataEndpoint =
  "https://raw.githubusercontent.com/Velua/eth-tokens-registry/master/tokens.json";

interface TokenMeta {
  id: string;
  image: string;
  contract: string;
  symbol: string;
  name: string;
  precision?: number;
}

const getTokenMeta = async (currentNetwork: EthNetworks) => {
  if (currentNetwork == EthNetworks.Ropsten) {
    return [
      {
        contract: "0x4F5e60A76530ac44e0A318cbc9760A2587c34Da6",
        symbol: "YYYY"
      },
      {
        contract: "0xD4F9CBC9db55E039BE979d88d15F57A57552f32d",
        symbol: "BNT"
      },
      {
        contract: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        symbol: "ETH"
      },
      {
        contract: "0xe4158797A5D87FB3080846e019b9Efc4353F58cC",
        symbol: "XXX"
      }
    ].map(
      (x): TokenMeta => ({
        ...x,
        id: x.contract,
        image: "https://ropsten.etherscan.io/images/main/empty-token.png",
        name: x.symbol
      })
    );
  }
  if (currentNetwork !== EthNetworks.Mainnet)
    throw new Error("Ropsten and Mainnet supported only.");

  const res: AxiosResponse<TokenMeta[]> = await axios.get(
    tokenMetaDataEndpoint
  );

  const drafted = res.data
    .filter(({ symbol, contract, image }) =>
      [symbol, contract, image].every(Boolean)
    )
    .map(x => ({ ...x, id: x.contract }));

  const existingEth = drafted.find(x => compareString(x.symbol, "eth"))!;

  const withoutEth = drafted.filter(meta => !compareString(meta.symbol, "eth"));
  const addedEth = {
    ...existingEth,
    id: ethReserveAddress,
    contract: ethReserveAddress
  };
  const final = [addedEth, existingEth, ...withoutEth];
  return _.uniqWith(final, (a, b) => compareString(a.id, b.id));
};

const compareRelayById = (a: Relay, b: Relay) => compareString(a.id, b.id);

interface ReserveFeed {
  poolId: string;
  tokenId: string;
  liqDepth: number;
  costByNetworkUsd?: number;
  change24H?: number;
  volume24H?: number;
}

const VuexModule = createModule({
  strict: false
});

export class EthBancorModule
  extends VuexModule.With({ namespaced: "ethBancor/" })
  implements TradingModule, LiquidityModule, CreatePoolModule, HistoryModule {
  registeredAnchorAddresses: string[] = [];
  convertibleTokenAddresses: string[] = [];
  loadingPools: boolean = true;

  bancorApiTokens: TokenPrice[] = [];
  relayFeed: ReserveFeed[] = [];
  relaysList: Relay[] = [];
  tokenBalances: { id: string; balance: number }[] = [];
  bntUsdPrice: number = 0;
  tokenMeta: TokenMeta[] = [];
  availableHistories: string[] = [];
  contracts: RegisteredContracts = {
    BancorNetwork: "",
    BancorConverterRegistry: ""
  };
  initiated: boolean = false;
  failedPools: string[] = [];
  currentNetwork: EthNetworks = EthNetworks.Mainnet;

  @mutation setNetwork(network: EthNetworks) {
    this.currentNetwork = network;
  }

  @mutation setBancorApiTokens(tokens: TokenPrice[]) {
    this.bancorApiTokens = tokens;
  }

  get morePoolsAvailable() {
    const allPools = this.registeredAnchorAddresses;
    const remainingPools = allPools
      .filter(
        poolAddress =>
          !this.relaysList.some(relay => compareString(poolAddress, relay.id))
      )
      .filter(
        poolAddress =>
          !this.failedPools.some(failedPool =>
            compareString(failedPool, poolAddress)
          )
      );
    return remainingPools.length > 0;
  }

  get currentEthNetwork() {
    return vxm.ethWallet.currentNetwork as EthNetworks;
  }

  @mutation setLoadingPools(status: boolean) {
    this.loadingPools = status;
  }

  @mutation updateFailedPools(ids: string[]) {
    this.failedPools = _.uniqWith([...this.failedPools, ...ids], compareString);
  }

  @action async loadMorePools() {
    this.setLoadingPools(true);
    const newPoolsAvailable = this.registeredAnchorAddresses
      .filter(
        address =>
          !this.relaysList.some(relay => compareString(relay.id, address))
      )
      .filter(
        address =>
          !this.failedPools.some(failedPoolAddress =>
            compareString(address, failedPoolAddress)
          )
      );
    const sortedPools = await this.poolsByPriority({
      smartTokenAddresses: newPoolsAvailable,
      tokenPrices: this.bancorApiTokens
    });
    await this.addPools(sortedPools.slice(0, 10));
    this.setLoadingPools(false);
  }

  @action async addPools(smartTokenAddresses: string[]) {
    this.setLoadingPools(true);
    const relays = await this.buildRelaysFromAnchorAddresses(
      smartTokenAddresses
    );
    this.setLoadingPools(false);

    return relays;
  }

  @action async addPool({ relay }: { relay: Relay }) {
    if (
      relayIncludesAtLeastOneNetworkToken(relay) &&
      relayReservesIncludedInTokenMeta(this.tokenMeta)(relay)
    ) {
      this.updateRelays([relay]);

      const feed = await this.possibleRelayFeedsFromBancorApi([relay]);
      if (feed.length > 0) {
        this.updateRelayFeeds(feed);
      } else {
        const feed = await this.buildRelayFeed({
          relay,
          usdPriceOfBnt: this.bntUsdPrice
        });
        this.updateRelayFeeds(feed);
      }
      await wait(1);
    } else {
      console.log(
        "Refusing to add pool as it failed tests",
        relay,
        relayIncludesAtLeastOneNetworkToken(relay),
        relayReservesIncludedInTokenMeta(this.tokenMeta)(relay)
      );
      this.updateFailedPools([relay.id]);
    }
  }

  get secondaryReserveChoices(): ModalChoice[] {
    return this.newNetworkTokenChoices;
  }

  get primaryReserveChoices() {
    return (secondaryReserveId: string): ModalChoice[] => {
      const poolsWithReserve = this.relaysList.filter(
        reserveIncludedInRelay(secondaryReserveId)
      );
      const reserves = poolsWithReserve
        .flatMap(relay => relay.reserves)
        .filter(
          reserve => !compareString(reserve.contract, secondaryReserveId)
        );

      const modalChoices = reserves
        .filter(reserve =>
          this.tokens.some(token => compareString(token.id, reserve.contract))
        )
        .map(reserve =>
          viewTokenToModalChoice(
            this.tokens.find(token =>
              compareString(token.id, reserve.contract)
            )!
          )
        )
        .filter(
          token =>
            !this.secondaryReserveChoices.some(choice =>
              compareString(choice.id, token.id)
            )
        );

      return sortAlongSide(
        modalChoices,
        choice => choice.id.toLowerCase(),
        this.tokens.map(token => token.id.toLowerCase())
      );
    };
  }

  get newNetworkTokenChoices(): ModalChoice[] {
    const bntTokenMeta = this.tokenMeta.find(token => token.symbol == "BNT")!;
    const usdBTokenMeta = this.tokenMeta.find(token => token.symbol == "USDB")!;

    const bntBalance = this.tokenBalance(bntTokenMeta.contract);
    const usdBalance = this.tokenBalance(usdBTokenMeta.contract);
    return [
      {
        id: bntTokenMeta.contract,
        contract: bntTokenMeta.contract,
        symbol: bntTokenMeta.symbol,
        img: bntTokenMeta.image,
        usdValue: this.bntUsdPrice,
        balance: bntBalance && bntBalance.balance
      },
      {
        id: usdBTokenMeta.contract,
        contract: usdBTokenMeta.contract,
        symbol: usdBTokenMeta.symbol,
        img: usdBTokenMeta.image,
        usdValue: 1,
        balance: usdBalance && usdBalance.balance
      }
    ];
  }

  get newPoolTokenChoices() {
    return (networkToken: string): ModalChoice[] => {
      const tokenChoices = this.tokenMeta
        .map(meta => metaToModalChoice(meta))
        .map(modalChoice => ({
          ...modalChoice,
          balance:
            this.tokenBalance(modalChoice.contract) &&
            this.tokenBalance(modalChoice.contract)!.balance
        }))
        .filter(meta =>
          this.newNetworkTokenChoices.some(
            networkChoice => !compareString(networkChoice.id, meta.id)
          )
        )
        .filter(tokenChoice => tokenChoice.id !== networkToken)
        .filter(meta => {
          const suggestedReserveIds = [meta.id, networkToken];
          const existingRelayWithSameReserves = this.relaysList.some(relay => {
            const reserves = relay.reserves.map(reserve => reserve.contract);
            return suggestedReserveIds.every(id =>
              reserves.some(r => compareString(id, r))
            );
          });
          return !existingRelayWithSameReserves;
        })
        .filter((_, index) => index < 200);

      const sorted = sortAlongSide(
        tokenChoices,
        token => token.id.toLowerCase(),
        this.tokens.map(token => token.id.toLowerCase())
      ).sort((a, b) => Number(b.balance) - Number(a.balance));
      return sorted;
    };
  }

  get isAuthenticated() {
    return vxm.wallet.isAuthenticated;
  }

  @mutation moduleInitiated() {
    this.initiated = true;
  }

  @action async fetchNewConverterAddressFromHash(
    hash: string
  ): Promise<string> {
    const interval = 1000;
    const attempts = 10;

    for (let i = 0; i < attempts; i++) {
      const info = await web3.eth.getTransactionReceipt(hash);
      if (info) {
        return removeLeadingZeros(info.logs[0].address);
      }
      await wait(interval);
    }
    throw new Error("Failed to find new address in decent time");
  }

  @action async fetchNewSmartContractAddressFromHash(
    hash: string
  ): Promise<string> {
    const interval = 1000;
    const attempts = 10;

    for (let i = 0; i < attempts; i++) {
      const info = await web3.eth.getTransactionReceipt(hash);
      console.log(info, "was info");
      if (info) {
        return info.contractAddress!;
      }
      await wait(interval);
    }
    throw new Error("Failed to find new address in decent time");
  }

  @mutation resetData() {
    this.relayFeed = [];
    this.relaysList = [];
    this.tokenBalances = [];
    this.initiated = false;
  }

  @action async onNetworkChange(updatedNetwork: EthNetworks) {
    if (this.currentNetwork !== updatedNetwork) {
      this.resetData();
      this.init();
    }
  }

  @action async deployConverter({
    smartTokenName,
    smartTokenSymbol,
    reserveTokenAddresses,
    precision = 18
  }: {
    smartTokenName: string;
    smartTokenSymbol: string;
    reserveTokenAddresses: string[];
    precision?: number;
  }): Promise<string> {
    if (reserveTokenAddresses.length !== 2)
      throw new Error("Method deployConverter only supports 2 reserves");
    const contract = buildRegistryContract(
      this.contracts.BancorConverterRegistry
    );

    const smartTokenDecimals = precision;

    return this.resolveTxOnConfirmation({
      tx: contract.methods.newConverter(
        1,
        smartTokenName,
        smartTokenSymbol,
        smartTokenDecimals,
        50000,
        reserveTokenAddresses,
        [500000, 500000]
      )
    });
  }

  @action async fetchHistoryData(smartTokenSymbol: string) {
    return getSmartTokenHistory(smartTokenSymbol.toLowerCase());
  }

  @action async createPool(poolParams: CreatePoolParams) {
    if (poolParams.reserves.length !== 2)
      throw new Error("Was expecting two reserves in new pool");

    const [networkReserve, tokenReserve] = sortByNetworkTokens(
      poolParams.reserves,
      reserve => reserve.id,
      networkTokens.map(
        symbolName =>
          this.tokenMeta.find(meta => compareString(meta.symbol, symbolName))!
            .id
      )
    );

    const networkToken = findOrThrow(this.tokenMeta, meta =>
      compareString(meta.id, networkReserve.id)
    );
    const reserveToken = findOrThrow(this.tokenMeta, meta =>
      compareString(meta.id, tokenReserve.id)
    );

    const networkSymbol = networkToken.symbol;
    const tokenSymbol = reserveToken.symbol;

    const smartTokenName = `${tokenSymbol} Smart Pool Token`;
    const smartTokenSymbol = tokenSymbol + networkSymbol;
    const precision = 18;

    const hasFee = poolParams.fee > 0;

    const { reserves, txId } = (await multiSteps({
      items: [
        {
          description: "Deploying new Pool..",
          task: async () => {
            const reserves = await Promise.all(
              poolParams.reserves.map(async ({ id, amount: decAmount }) => {
                const token = findOrThrow(
                  this.tokenMeta,
                  meta => compareString(meta.id, id),
                  `failed finding ${id} in known token meta`
                );
                const decimals = await this.getDecimalsByTokenAddress(
                  token.contract
                );

                const res: WeiExtendedAsset = {
                  weiAmount: expandToken(decAmount, decimals),
                  contract: token.contract
                };
                return res;
              })
            );

            const converterRes = await this.deployConverter({
              reserveTokenAddresses: reserves.map(reserve => reserve.contract),
              smartTokenName,
              smartTokenSymbol,
              precision
            });

            const converterAddress = await this.fetchNewConverterAddressFromHash(
              converterRes
            );

            return {
              converterAddress,
              converterRes
            };
          }
        },
        {
          description:
            "Transferring ownership of pool and adding reserve allowances...",
          task: async (state?: any) => {
            const { converterAddress, reserves } = state as {
              converterAddress: string;
              reserves: WeiExtendedAsset[];
            };
            await Promise.all<any>([
              this.claimOwnership(converterAddress),
              ...reserves
                .filter(
                  reserve => !compareString(reserve.contract, ethReserveAddress)
                )
                .map(reserve =>
                  this.triggerApprovalIfRequired({
                    owner: this.isAuthenticated,
                    amount: reserve.weiAmount,
                    tokenAddress: reserve.contract,
                    spender: converterAddress
                  })
                )
            ]);
          }
        },
        {
          description: `Adding reserve liquidity ${
            hasFee ? "and setting fee..." : ""
          }`,
          task: async (state?: any) => {
            const { converterAddress, reserves } = state as {
              converterAddress: string;
              reserves: WeiExtendedAsset[];
            };

            await Promise.all<any>([
              ...[
                hasFee
                  ? this.setFee({
                      converterAddress,
                      decFee: Number(poolParams.fee)
                    })
                  : []
              ],
              this.addLiquidityV28({
                converterAddress,
                reserves: reserves.map(reserve => ({
                  tokenContract: reserve.contract,
                  weiAmount: reserve.weiAmount
                }))
              })
            ]);
          }
        }
      ],
      onUpdate: poolParams.onUpdate
    })) as { reserves: WeiExtendedAsset[]; txId: string };

    reserves.forEach(reserve => this.getUserBalance(reserve.contract));

    wait(5000).then(() => this.init());

    return txId;
  }

  @action async approveTokenWithdrawals(
    approvals: {
      approvedAddress: string;
      amount: string;
      tokenAddress: string;
    }[]
  ) {
    return Promise.all(
      approvals.map(approval => {
        const tokenContract = buildTokenContract(approval.tokenAddress);

        return this.resolveTxOnConfirmation({
          tx: tokenContract.methods.approve(
            approval.approvedAddress,
            approval.amount
          ),
          gas: 70000
        });
      })
    );
  }

  @action async claimOwnership(converterAddress: string) {
    const converter = buildConverterContract(converterAddress);

    return this.resolveTxOnConfirmation({
      tx: converter.methods.acceptOwnership()
    });
  }

  @action async setFee({
    converterAddress,
    decFee
  }: {
    converterAddress: string;
    decFee: number;
  }) {
    const converterContract = buildConverterContract(converterAddress);

    const ppm = decFee * 1000000;
    // @ts-ignore
    return this.resolveTxOnConfirmation({
      tx: converterContract.methods.setConversionFee(ppm),
      resolveImmediately: true
    });
  }

  @action async resolveTxOnConfirmation({
    tx,
    gas,
    value,
    resolveImmediately = false,
    onHash
  }: {
    tx: ContractSendMethod;
    value?: string;
    gas?: number;
    resolveImmediately?: boolean;
    onHash?: (hash: string) => void;
  }): Promise<string> {
    console.log("received", tx);
    return new Promise((resolve, reject) => {
      let txHash: string;
      tx.send({
        from: this.isAuthenticated,
        ...(gas && { gas }),
        ...(value && { value: toHex(value) })
      })
        .on("transactionHash", (hash: string) => {
          txHash = hash;
          if (onHash) onHash(hash);
          if (resolveImmediately) {
            resolve(txHash);
          }
        })
        .on("confirmation", (confirmationNumber: number) => {
          resolve(txHash);
        })
        .on("error", (error: any) => reject(error));
    });
  }

  @action async addReserveToken({
    converterAddress,
    reserveTokenAddress
  }: {
    converterAddress: string;
    reserveTokenAddress: string;
  }) {
    const converter = buildConverterContract(converterAddress);

    return this.resolveTxOnConfirmation({
      tx: converter.methods.addReserve(reserveTokenAddress, 500000)
    });
  }

  get supportedFeatures() {
    return (symbolName: string) => {
      return ["addLiquidity", "removeLiquidity"];
    };
  }

  get wallet() {
    return "eth";
  }

  get tokens(): ViewToken[] {
    return this.relaysList
      .filter(relay =>
        relay.reserves.every(reserve =>
          this.relayFeed.some(
            relayFeed =>
              compareString(relayFeed.tokenId, reserve.contract) &&
              compareString(relayFeed.poolId, relay.id)
          )
        )
      )
      .flatMap(relay =>
        relay.reserves.map(reserve => {
          const { name, image } = this.tokenMetaObj(reserve.contract);
          const relayFeed = this.relayFeed.find(
            feed =>
              compareString(feed.poolId, relay.id) &&
              compareString(feed.tokenId, reserve.contract)
          )!;
          const balance = this.tokenBalance(reserve.contract);
          return {
            id: reserve.contract,
            precision: reserve.decimals,
            symbol: reserve.symbol,
            name,
            ...(relayFeed.costByNetworkUsd && {
              price: relayFeed.costByNetworkUsd
            }),
            liqDepth: relayFeed.liqDepth,
            logo: image,
            ...(relayFeed.change24H && { change24h: relayFeed.change24H }),
            ...(relayFeed.volume24H && { volume24h: relayFeed.volume24H }),
            ...(balance && { balance: balance.balance })
          };
        })
      )
      .sort((a, b) => b.liqDepth - a.liqDepth)
      .reduce<ViewToken[]>((acc, item) => {
        const existingToken = acc.find(token =>
          compareString(token.id!, item.id)
        );
        return existingToken
          ? updateArray(
              acc,
              token => compareString(token.id!, item.id),
              token => ({ ...token, liqDepth: token.liqDepth! + item.liqDepth })
            )
          : [...acc, item as ViewToken];
      }, [])
      .filter(
        (token, index, arr) =>
          arr.findIndex(t => compareString(t.symbol, token.symbol)) == index
      );
  }

  get tokenMetaObj() {
    return (id: string) => {
      return findOrThrow(
        this.tokenMeta,
        meta => compareString(id, meta.id),
        `Failed to find token meta for symbol with token contract of ${id}`
      );
    };
  }

  get tokenBalance() {
    return (tokenId: string) =>
      this.tokenBalances.find(token => compareString(token.id, tokenId));
  }

  get token(): (arg0: string) => any {
    return (id: string) =>
      findOrThrow(
        this.tokens,
        token => compareString(token.id, id),
        `failed to find token() with ID ${id} ethBancor`
      );
  }

  get relay() {
    return (id: string) =>
      findOrThrow(
        this.relays,
        relay => compareString(relay.id, id),
        `failed to find relay with id of ${id} in eth relay getter`
      );
  }

  get tokenCount() {
    const tokens = this.relaysList.flatMap(relay => relay.reserves);

    const uniqueTokens = tokens.filter(
      (token, index, arr) =>
        arr.findIndex(r => r.contract == token.contract) == index
    );
    const countToken = (token: Token, tokens: Token[]) => {
      return tokens.filter(x => x.contract == token.contract).length;
    };

    return uniqueTokens
      .map((token): [Token, number] => [token, countToken(token, tokens)])
      .sort(([token1, count1], [token2, count2]) => count2 - count1);
  }

  get count() {
    return (tokenId: string) =>
      this.tokenCount.find(([token]) => token.contract == tokenId) &&
      this.tokenCount.find(([token]) => token.contract == tokenId)![1];
  }

  get relays(): ViewRelay[] {
    return [...this.chainkLinkRelays, ...this.traditionalRelays].sort(
      (a, b) => b.liqDepth - a.liqDepth
    );
  }

  get chainkLinkRelays(): ViewRelay[] {
    return [];
    // return (this.relaysList.filter(isChainLink) as ChainLinkRelay[]).filter(
    // relay =>
    // this.relayFeed.some(feed => compareString(feed.anchorId, relay.id))
    // );
  }

  get traditionalRelays(): ViewRelay[] {
    return (this.relaysList.filter(isTraditional) as TraditionalRelay[])
      .filter(relay =>
        this.relayFeed.some(feed => compareString(feed.poolId, relay.id))
      )
      .map(relay => {
        const [networkReserve, tokenReserve] = sortByNetworkTokens(
          relay.reserves,
          reserve => reserve.symbol
        );
        const relayFeed = this.relayFeed.find(feed =>
          compareString(feed.poolId, relay.id)
        )!;

        const smartTokenSymbol = relay.anchor.symbol;
        const hasHistory = this.availableHistories.some(history =>
          compareString(smartTokenSymbol, history)
        );

        return {
          id: relay.anchor.contract,
          reserves: [networkReserve, tokenReserve].map(reserve => {
            const meta = this.tokenMetaObj(reserve.contract);
            return {
              id: reserve.contract,
              reserveId: relay.anchor.contract + reserve.contract,
              logo: [meta.image],
              symbol: reserve.symbol,
              contract: reserve.contract,
              smartTokenSymbol: relay.anchor.contract
            };
          }),
          smartTokenSymbol,
          fee: relay.fee / 100,
          liqDepth: relayFeed.liqDepth,
          owner: relay.owner,
          symbol: tokenReserve.symbol,
          addLiquiditySupported: true,
          removeLiquiditySupported: true,
          focusAvailable: hasHistory
        } as ViewRelay;
      });
  }

  @mutation setTokenMeta(tokenMeta: TokenMeta[]) {
    this.tokenMeta = tokenMeta;
  }

  @action async triggerTx(actions: any[]) {
    // @ts-ignore
    return this.$store.dispatch("ethWallet/tx", actions, { root: true });
  }

  @action async fetchRelayBalances(poolId: string) {
    const { reserves, version, contract } = await this.relayById(poolId);

    const converterContract = buildConverterContract(contract);

    const smartTokenContract = buildTokenContract(poolId);

    const [reserveBalances, totalSupplyWei] = await Promise.all([
      Promise.all(
        reserves.map(reserve =>
          fetchReserveBalance(converterContract, reserve.contract, version)
        )
      ),
      smartTokenContract.methods.totalSupply().call()
    ]);

    return {
      reserves: reserves.map((reserve, index) => ({
        ...reserve,
        weiAmount: reserveBalances[index]
      })),
      totalSupplyWei
    };
  }

  @action async calculateOpposingDepositInfo(
    opposingDeposit: OpposingLiquidParams
  ): Promise<EthOpposingLiquid> {
    const { id, reserve } = opposingDeposit;
    const relay = await this.traditionalRelayById(id);

    const reserveToken = await this.tokenById(reserve.id);

    const tokenSymbol = reserveToken.symbol;
    const tokenAmount = reserve.amount;

    const smartTokenAddress = relay.anchor.contract;

    const { reserves, totalSupplyWei } = await this.fetchRelayBalances(
      smartTokenAddress
    );

    const [sameReserve, opposingReserve] = sortByNetworkTokens(
      reserves,
      reserve => reserve.symbol,
      [tokenSymbol]
    );

    const tokenAmountWei = expandToken(tokenAmount, sameReserve.decimals);

    const opposingAmount = calculateOppositeFundRequirement(
      tokenAmountWei,
      sameReserve.weiAmount,
      opposingReserve.weiAmount
    );
    const fundReward = calculateFundReward(
      tokenAmountWei,
      sameReserve.weiAmount,
      totalSupplyWei
    );

    return {
      opposingAmount: shrinkToken(opposingAmount, opposingReserve.decimals),
      smartTokenAmount: { id: smartTokenAddress, amount: fundReward }
    };
  }

  @action async opposingReserveChangeNotRequired(poolId: string) {
    if (poolId == "0xb1CD6e4153B2a390Cf00A6556b0fC1458C4A5533") {
      console.warn("not going to bother changing!");
      return true;
    }

    const poolType = await this.getPoolType(poolId);
    return poolType == PoolType.ChainLink;
  }

  @action async calculateOpposingDeposit(
    opposingDeposit: OpposingLiquidParams
  ): Promise<OpposingLiquid> {
    const opposingReserveChangeNotRequired = await this.opposingReserveChangeNotRequired(
      opposingDeposit.id
    );

    if (opposingReserveChangeNotRequired) {
      return { opposingAmount: undefined };
    } else {
      const { opposingAmount } = await this.calculateOpposingDepositInfo(
        opposingDeposit
      );
      return { opposingAmount };
    }
  }

  @action async getUserBalance(tokenContractAddress: string) {
    const balance = await vxm.ethWallet.getBalance({
      accountHolder: vxm.wallet.isAuthenticated,
      tokenContractAddress
    });
    this.updateBalance([tokenContractAddress, Number(balance)]);
    return balance;
  }

  @action async relayById(relayId: string) {
    return findOrThrow(this.relaysList, relay =>
      compareString(relay.id, relayId)
    );
  }

  @action async getUserBalancesTraditional(
    relayId: string
  ): Promise<UserPoolBalances> {
    const relay = await this.traditionalRelayById(relayId);

    const smartTokenUserBalance = await this.getUserBalance(
      relay.anchor.contract
    );

    const { totalSupplyWei, reserves } = await this.fetchRelayBalances(
      relay.anchor.contract
    );

    const percent = new Decimal(smartTokenUserBalance).div(
      fromWei(totalSupplyWei)
    );

    const maxWithdrawals: ViewAmount[] = reserves.map(reserve => ({
      id: reserve.contract,
      amount: shrinkToken(
        percent.times(reserve.weiAmount).toString(),
        reserve.decimals
      )
    }));

    return {
      maxWithdrawals,
      smartTokenBalance: String(smartTokenUserBalance)
    };
  }

  @action async liquidationLimit({
    anchorContract,
    poolTokenAddress
  }: {
    anchorContract: string;
    poolTokenAddress: string;
  }) {
    const contract = buildV2Converter(anchorContract);
    return contract.methods.liquidationLimit(poolTokenAddress).call();
  }

  @action async fetchPoolToken({
    anchorContract,
    reserveTokenAddress
  }: {
    anchorContract: string;
    reserveTokenAddress: string;
  }) {
    const contract = buildV2Converter(anchorContract);
    return contract.methods.poolToken(reserveTokenAddress).call();
  }

  @action async getPoolType(pool: string | Relay): Promise<PoolType> {
    let relay: Relay;
    if (typeof pool == "undefined") {
      throw new Error("Pool is undefined");
    } else if (typeof pool == "string") {
      const poolId = pool as string;
      relay = await this.relayById(poolId);
    } else {
      relay = pool as Relay;
    }
    return typeof relay.converterType !== "undefined" &&
      relay.converterType == PoolType.ChainLink
      ? PoolType.ChainLink
      : PoolType.Traditional;
  }

  @action async getUserBalancesChainLink(
    relayId: string
    // @ts-ignore
  ): Promise<UserPoolBalances> {
    // console.log("todo, get user pool balances");
    // get pool tokens
    // get user pool token balances
    // display pool token balance, 1:1?
    // utilise anchor contract method to return actual balance expectations
    //
  }

  @action async getUserBalances(relayId: string): Promise<UserPoolBalances> {
    if (!vxm.wallet.isAuthenticated)
      throw new Error("Cannot find users .isAuthenticated");

    const poolType = await this.getPoolType(relayId);
    return poolType == PoolType.Traditional
      ? this.getUserBalancesTraditional(relayId)
      : this.getUserBalancesChainLink(relayId);
  }

  @action async calculateOpposingWithdraw(
    opposingWithdraw: OpposingLiquidParams
  ): Promise<OpposingLiquid> {
    const changedNotRequired = await this.opposingReserveChangeNotRequired(
      opposingWithdraw.id
    );
    if (changedNotRequired) {
      return { opposingAmount: undefined };
    } else {
      return this.calculateOpposingWithdrawInfo(opposingWithdraw);
    }
  }

  @action async traditionalRelayById(
    poolId: string
  ): Promise<TraditionalRelay> {
    const relay = await this.relayById(poolId);
    const traditionalRelay = assertTraditional(relay);
    return traditionalRelay;
  }

  @action async chainLinkRelayById(poolId: string): Promise<ChainLinkRelay> {
    const relay = await this.relayById(poolId);
    const chainlinkRelay = assertChainlink(relay);
    return chainlinkRelay;
  }
  @action async calculateOpposingWithdrawInfo(
    opposingWithdraw: OpposingLiquidParams
  ): Promise<EthOpposingLiquid> {
    const { id, reserve } = opposingWithdraw;
    const tokenAmount = reserve.amount;
    const sameReserveToken = await this.tokenById(reserve.id);

    const relay = await this.traditionalRelayById(id);
    const smartTokenAddress = relay.anchor.contract;

    const { reserves, totalSupplyWei } = await this.fetchRelayBalances(
      smartTokenAddress
    );

    const [sameReserve, opposingReserve] = sortByNetworkTokens(
      reserves,
      reserve => reserve.symbol,
      [sameReserveToken.symbol]
    );

    const sameReserveWei = expandToken(tokenAmount, sameReserve.decimals);

    const opposingValue = calculateOppositeLiquidateRequirement(
      sameReserveWei,
      sameReserve.weiAmount,
      opposingReserve.weiAmount
    );
    const liquidateCost = calculateLiquidateCost(
      sameReserveWei,
      sameReserve.weiAmount,
      totalSupplyWei
    );

    const smartUserBalance = await vxm.ethWallet.getBalance({
      accountHolder: vxm.wallet.isAuthenticated,
      tokenContractAddress: smartTokenAddress,
      keepWei: true
    });

    const percentDifferenceBetweenSmartBalance = percentDifference(
      liquidateCost,
      String(smartUserBalance)
    );
    let smartTokenAmount: string;
    if (percentDifferenceBetweenSmartBalance > 0.99) {
      smartTokenAmount = String(smartUserBalance);
    } else {
      smartTokenAmount = liquidateCost;
    }
    return {
      opposingAmount: shrinkToken(opposingValue, opposingReserve.decimals),
      smartTokenAmount: {
        id: smartTokenAddress,
        amount: smartTokenAmount
      }
    };
  }

  @action async liquidate({
    converterAddress,
    smartTokenAmount
  }: {
    converterAddress: string;
    smartTokenAmount: string;
  }) {
    const converterContract = buildConverterContract(converterAddress);

    return this.resolveTxOnConfirmation({
      tx: converterContract.methods.liquidate(smartTokenAmount)
    });
  }

  @action async removeLiquidity({ reserves, id: relayId }: LiquidityParams) {
    const relay = await this.relayById(relayId);

    const preV11 = Number(relay.version) < 11;
    if (preV11)
      throw new Error("This Pool is not supported for adding liquidity");

    const postV28 = Number(relay.version) >= 28;

    const { smartTokenAmount } = await this.calculateOpposingWithdrawInfo({
      id: relayId,
      reserve: reserves[0]
    });

    const hash = postV28
      ? await this.removeLiquidityV28({
          converterAddress: relay.contract,
          smartTokensWei: smartTokenAmount.amount,
          reserveTokenAddresses: relay.reserves.map(reserve => reserve.contract)
        })
      : await this.liquidate({
          converterAddress: relay.contract,
          smartTokenAmount: smartTokenAmount.amount
        });

    const tokenAddressesChanged = [
      ...relay.reserves.map(reserve => reserve.contract),
      smartTokenAmount.id
    ];
    this.spamBalances(tokenAddressesChanged);

    return hash;
  }

  @action async mintEthErc(ethDec: string) {
    return new Promise((resolve, reject) => {
      let txHash: string;
      web3.eth
        .sendTransaction({
          from: this.isAuthenticated,
          to: ethErc20WrapperContract,
          value: toHex(toWei(ethDec))
        })
        .on("transactionHash", (hash: string) => {
          txHash = hash;
        })
        .on("confirmation", (confirmationNumber: number) => {
          resolve(txHash);
        })
        .on("error", (error: any) => reject(error));
    });
  }

  @action async fundRelay({
    converterAddress,
    fundAmount,
    onHash
  }: {
    converterAddress: string;
    fundAmount: string;
    onHash?: (hash: string) => void;
  }) {
    const converterContract = buildConverterContract(converterAddress);
    return this.resolveTxOnConfirmation({
      tx: converterContract.methods.fund(fundAmount),
      gas: 950000,
      ...(onHash && { onHash })
    });
  }

  @action async addLiquidityV28(par: {
    converterAddress: string;
    reserves: { tokenContract: string; weiAmount: string }[];
    onHash?: (hash: string) => void;
  }) {
    const contract = buildV28ConverterContract(par.converterAddress);

    const newEthReserve = par.reserves.find(reserve =>
      compareString(reserve.tokenContract, ethReserveAddress)
    );

    return this.resolveTxOnConfirmation({
      tx: contract.methods.addLiquidity(
        par.reserves.map(reserve => reserve.tokenContract),
        par.reserves.map(reserve => reserve.weiAmount),
        "1"
      ),
      onHash: par.onHash,
      ...(newEthReserve && { value: newEthReserve.weiAmount })
    });
  }

  @action async removeLiquidityV28({
    converterAddress,
    smartTokensWei,
    reserveTokenAddresses
  }: {
    converterAddress: string;
    smartTokensWei: string;
    reserveTokenAddresses: string[];
  }) {
    const contract = buildV28ConverterContract(converterAddress);

    return this.resolveTxOnConfirmation({
      tx: contract.methods.removeLiquidity(
        smartTokensWei,
        reserveTokenAddresses,
        reserveTokenAddresses.map(() => "1")
      )
    });
  }

  @action async addLiquidity({
    id: relayId,
    reserves,
    onUpdate
  }: LiquidityParams) {
    const relay = await this.relayById(relayId);

    const preV11 = Number(relay.version) < 11;
    if (preV11)
      throw new Error("This Pool is not supported for adding liquidity");

    const postV28 = Number(relay.version) >= 28;

    const matchedBalances = relay.reserves.map(reserve => ({
      ...reserve,
      amount: reserves.find(({ id }) => compareString(id, reserve.contract))!
        .amount
    }));

    const steps: Step[] = [
      {
        name: "CheckBalance",
        description: "Updating balance approvals..."
      },
      {
        name: "Funding",
        description: "Now funding..."
      },
      {
        name: "BlockConfirmation",
        description: "Awaiting block confirmation..."
      },
      {
        name: "Done",
        description: "Done!"
      }
    ];

    onUpdate!(0, steps);

    const { smartTokenAmount } = await this.calculateOpposingDepositInfo({
      reserve: reserves[0],
      id: relayId
    });

    const fundAmount = smartTokenAmount;

    const converterAddress = relay.contract;

    await Promise.all(
      matchedBalances.map(async balance => {
        if (
          compareString(balance.contract, ethErc20WrapperContract) &&
          !postV28
        ) {
          await this.mintEthErc(balance.amount!);
        }
        if (compareString(balance.contract, ethReserveAddress)) return;
        return this.triggerApprovalIfRequired({
          owner: this.isAuthenticated,
          amount: expandToken(balance.amount!, balance.decimals),
          spender: converterAddress,
          tokenAddress: balance.contract
        });
      })
    );

    onUpdate!(1, steps);

    let txHash: string;

    if (postV28) {
      txHash = await this.addLiquidityV28({
        converterAddress,
        reserves: matchedBalances.map(balance => ({
          tokenContract: balance.contract,
          weiAmount: expandToken(balance.amount, balance.decimals)
        })),
        onHash: () => onUpdate!(2, steps)
      });
    } else {
      txHash = await this.fundRelay({
        converterAddress,
        fundAmount: fundAmount.amount,
        onHash: () => onUpdate!(2, steps)
      });
    }

    onUpdate!(3, steps);

    const tokenAddressesChanged = [
      ...matchedBalances.map(x => x.contract),
      fundAmount.id
    ];
    this.spamBalances(tokenAddressesChanged);
    return txHash;
  }

  @action async spamBalances(tokenAddresses: string[]) {
    for (var i = 0; i < 10; i++) {
      this.getUserBalance(tokenAddresses[i]);
      await wait(1000);
    }
  }

  @action async fetchContractAddresses(contractRegistry: string) {
    const hardCodedBytes: RegisteredContracts = {
      BancorNetwork: asciiToHex("BancorNetwork"),
      BancorConverterRegistry: asciiToHex("BancorConverterRegistry")
    };

    const registryContract = new web3.eth.Contract(
      ABIContractRegistry,
      contractRegistry
    );

    const bytesKeys = Object.keys(hardCodedBytes);
    const bytesList = Object.values(hardCodedBytes);

    try {
      const contractAddresses = await Promise.race([
        Promise.all(
          bytesList.map(bytes =>
            registryContract.methods.addressOf(bytes).call()
          )
        ),
        wait(10000).then(() => {
          throw new Error(
            "Failed to resolve the Ethereum Bancor Contracts, BancorNetwork, BancorConverterRegistry, BancorX and BancorConverterFactory."
          );
        })
      ]);

      const zipped = _.zip(bytesKeys, contractAddresses) as [string, string][];

      const object = zipped.reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key!]: value
        }),
        {}
      ) as RegisteredContracts;
      this.setContractAddresses(object);
      return object;
    } catch (e) {
      console.error(`Failed fetching ETH contract addresses ${e.message}`);
      throw new Error(e.message);
    }
  }

  @mutation setContractAddresses(contracts: RegisteredContracts) {
    this.contracts = contracts;
  }

  @action async warmEthApi() {
    const tokens = await ethBancorApi.getTokens();
    this.setBancorApiTokens(tokens);
    return tokens;
  }

  @action async possibleRelayFeedsFromBancorApi(
    relays: Relay[]
  ): Promise<ReserveFeed[]> {
    const traditionalRelays = relays.filter(
      isTraditional
    ) as TraditionalRelay[];
    try {
      const tokens = this.bancorApiTokens;
      if (!tokens || tokens.length == 0) {
        throw new Error("No bancor tokens available...");
      }
      const ethUsdPrice = findOrThrow(
        tokens,
        token => token.code == "ETH",
        "failed finding price of ETH from tokens request"
      ).price;
      console.log(ethUsdPrice, "is the eth USD price");

      return traditionalRelays
        .filter(relay => {
          const dictionaryItems = ethBancorApiDictionary.filter(catalog =>
            compareString(relay.anchor.contract, catalog.smartTokenAddress)
          );
          return tokens.some(token =>
            dictionaryItems.some(dic => compareString(dic.tokenId, token.id))
          );
        })
        .flatMap(relay =>
          relay.reserves.map(reserve => {
            const foundDictionaries = ethBancorApiDictionary.filter(catalog =>
              compareString(catalog.smartTokenAddress, relay.anchor.contract)
            );

            const bancorIdRelayDictionary =
              foundDictionaries.length == 1
                ? foundDictionaries[0]
                : foundDictionaries.find(dictionary =>
                    compareString(reserve.contract, dictionary.tokenAddress)
                  )!;
            const tokenPrice = tokens.find(token =>
              compareString(token.id, bancorIdRelayDictionary.tokenId)
            )!;

            const relayFeed = tokenPriceToFeed(
              reserve.contract,
              relay.anchor.contract,
              ethUsdPrice,
              tokenPrice
            );

            if (
              compareString(
                bancorIdRelayDictionary.tokenAddress,
                reserve.contract
              )
            ) {
              return relayFeed;
            } else {
              return {
                ...relayFeed,
                costByNetworkUsd: undefined,
                change24H: undefined,
                volume24H: undefined
              };
            }
          })
        );
    } catch (e) {
      console.warn(`Failed utilising Bancor API: ${e.message}`);
      return [];
    }
  }

  @mutation updateRelayFeeds(feeds: ReserveFeed[]) {
    const allFeeds = [...feeds, ...this.relayFeed];
    this.relayFeed = _.uniqWith(allFeeds, compareRelayFeed);
  }

  @action async fetchCost({
    reserves,
    to,
    wei,
    converterAddress
  }: {
    converterAddress: string;
    reserves: Token[];
    to: string;
    wei: string;
  }): Promise<string | null> {
    const converterContract = buildConverterContract(converterAddress);

    const toAddress = findOrThrow(
      reserves,
      token => compareString(token.symbol, to),
      `passed to symbol ${to} does not exist in reserves passed`
    ).contract;

    try {
      const res = await converterContract.methods
        .getSaleReturn(toAddress, wei)
        .call();
      return res["0"];
    } catch (e) {
      console.error(
        `Failed fetching price at relay: ${converterAddress}, wei: ${wei}, from:, to: ${toAddress}`
      );
      return null;
    }
  }

  @action async fetchBancorUsdPriceOfBnt() {
    const tokens = await ethBancorApi.getTokens();
    const usdPriceOfBnt = findOrThrow(tokens, token => token.code == "BNT")
      .price;
    return usdPriceOfBnt;
  }

  @action async fetchUsdPriceOfBnt() {
    const price = await vxm.bancor.fetchUsdPriceOfBnt();
    this.setBntUsdPrice(price);
  }

  @mutation setBntUsdPrice(usdPrice: number) {
    this.bntUsdPrice = usdPrice;
  }

  @action async buildRelayFeed(params: {
    relay: Relay;
    usdPriceOfBnt: number;
  }): Promise<ReserveFeed[]> {
    const type = await this.getPoolType(params.relay);
    if (type == PoolType.ChainLink)
      return this.buildRelayFeedChainkLink({
        usdPriceOfBnt: params.usdPriceOfBnt,
        relay: assertChainlink(params.relay)
      });
    else if (type == PoolType.Traditional)
      return this.buildRelayFeedTraditional({
        usdPriceOfBnt: params.usdPriceOfBnt,
        relay: assertTraditional(params.relay)
      });
    else throw new Error("Build Relay Feed cannot build unsupported relay");
  }

  @action async fetchStakedReserveBalance({
    converterAddress,
    reserveTokenAddress
  }: {
    converterAddress: string;
    reserveTokenAddress: string;
  }): Promise<string> {
    const contract = buildV2Converter(converterAddress);
    return contract.methods.reserveStakedBalance(reserveTokenAddress).call();
  }

  @action async fetchV2ConverterReserveWeights(converterAddress: string) {
    const contract = buildV2Converter(converterAddress);
    const weights = await contract.methods.effectiveReserveWeights().call();
    return [weights["0"], weights["1"]];
  }

  @action async buildRelayFeedChainkLink({
    relay,
    usdPriceOfBnt
  }: {
    relay: ChainLinkRelay;
    usdPriceOfBnt: number;
  }): Promise<ReserveFeed[]> {
    const [reserveBalances, reserveWeights] = await Promise.all([
      Promise.all(
        relay.reserves.map(async reserve => ({
          reserve,
          amount: await this.fetchStakedReserveBalance({
            reserveTokenAddress: reserve.contract,
            converterAddress: relay.contract
          })
        }))
      ),
      this.fetchV2ConverterReserveWeights(relay.contract)
    ]);

    const [secondaryReserveToken, primaryReserveToken] = sortByNetworkTokens(
      reserveBalances,
      reserve => reserve.reserve.symbol
    ).map(token => ({
      ...token,
      decAmount: Number(shrinkToken(token.amount, token.reserve.decimals))
    }));

    const [
      primaryReserveDecWeight,
      secondaryReserveDecWeight
    ] = reserveWeights.map(weightPpm =>
      new BigNumber(weightPpm).div(oneMillion)
    );

    const secondarysPrice =
      secondaryReserveToken.reserve.symbol == "USDB" ? 1 : usdPriceOfBnt;
    const secondarysLiqDepth =
      secondaryReserveToken.decAmount * secondarysPrice;

    const wholeLiquidityDepth = new BigNumber(secondarysLiqDepth).div(
      secondaryReserveDecWeight
    );
    const primaryLiquidityDepth = wholeLiquidityDepth.minus(secondarysLiqDepth);

    return [
      {
        tokenId: primaryReserveToken.reserve.contract,
        poolId: relay.anchor.poolContainerAddress,
        liqDepth: primaryLiquidityDepth.toNumber(),
        costByNetworkUsd: primaryLiquidityDepth
          .div(secondaryReserveToken.decAmount)
          .toNumber()
      },
      {
        tokenId: secondaryReserveToken.reserve.contract,
        poolId: relay.anchor.poolContainerAddress,
        liqDepth: secondarysLiqDepth,
        costByNetworkUsd: secondarysPrice
      }
    ];
  }

  @action async buildRelayFeedTraditional({
    relay,
    usdPriceOfBnt
  }: {
    relay: TraditionalRelay;
    usdPriceOfBnt: number;
  }): Promise<ReserveFeed[]> {
    const reservesBalances = await Promise.all(
      relay.reserves.map(reserve =>
        this.fetchReserveBalance({
          relay,
          reserveContract: reserve.contract
        })
      )
    );
    const [
      [networkReserve, networkReserveAmount],
      [tokenReserve, tokenAmount]
    ] = sortByNetworkTokens(reservesBalances, balance =>
      balance[0].symbol.toUpperCase()
    );

    const networkReserveIsUsd = networkReserve.symbol == "USDB";
    const dec = networkReserveAmount / tokenAmount;
    const reverse = tokenAmount / networkReserveAmount;
    const main = networkReserveIsUsd ? dec : dec * usdPriceOfBnt;

    const liqDepth =
      (networkReserveIsUsd
        ? networkReserveAmount
        : networkReserveAmount * usdPriceOfBnt) * 2;

    return [
      {
        tokenId: tokenReserve.contract,
        poolId: relay.anchor.contract,
        costByNetworkUsd: main,
        liqDepth
      },
      {
        tokenId: networkReserve.contract,
        poolId: relay.anchor.contract,
        liqDepth,
        costByNetworkUsd: reverse * main
      }
    ];
  }

  get loadingTokens() {
    return this.loadingPools;
  }

  get moreTokensAvailable() {
    return this.morePoolsAvailable;
  }

  @action async relaysContainingToken(tokenId: string): Promise<string[]> {
    const converterRegistry = buildRegistryContract(
      this.contracts.BancorConverterRegistry
    );
    return converterRegistry.methods.getConvertibleTokenAnchors(tokenId).call();
  }

  get convertibleTokens() {
    return this.convertibleTokenAddresses
      .map(
        convertibleToken =>
          this.tokenMeta.find(meta =>
            compareString(convertibleToken, meta.contract)
          )!
      )
      .filter(Boolean)
      .map(meta => ({ ...meta, img: meta.image }));
  }

  @action async loadMoreTokens(tokenIds?: string[]) {
    console.log("load more triggered at", new Date().getTime());
    console.log("load more tokens received", tokenIds);
    if (tokenIds && tokenIds.length > 0) {
      const smartTokenAddresses = await Promise.all(
        tokenIds.map(id => this.relaysContainingToken(id))
      );
      const addresses = smartTokenAddresses.flat(1);
      console.log(addresses, "is gonna get loaded...");
      await this.addPools(addresses);
      await wait(1);
      console.log("should be resolving loadMore at", new Date().getTime());
    } else {
      console.log("just loading random pools...");
      await this.loadMorePools();
    }
  }

  @mutation setAvailableHistories(smartTokenNames: string[]) {
    this.availableHistories = smartTokenNames;
  }

  @action async refresh() {
    console.log("refresh called on eth bancor, doing nothing");
  }

  @action async fetchConvertibleTokens(networkContract: string) {
    const contract = await buildRegistryContract(networkContract);
    return contract.methods.getConvertibleTokens().call();
  }

  @mutation setregisteredAnchorAddresses(addresses: string[]) {
    this.registeredAnchorAddresses = addresses;
  }

  @mutation setConvertibleTokenAddresses(addresses: string[]) {
    this.convertibleTokenAddresses = addresses;
  }

  @action async conversionPathFromNetworkContract({
    from,
    to,
    networkContractAddress
  }: {
    from: string;
    to: string;
    networkContractAddress: string;
  }) {
    const networkContract = buildNetworkContract(networkContractAddress);
    const path = await networkContract.methods.conversionPath(from, to).call();
    return path;
  }

  @action async relaysRequiredForTrade({
    from,
    to,
    networkContractAddress
  }: {
    from: string;
    to: string;
    networkContractAddress: string;
  }) {
    try {
      const path = await this.conversionPathFromNetworkContract({
        from,
        to,
        networkContractAddress
      });
      const smartTokenAddresses = path.filter((_, index) => isOdd(index));
      if (smartTokenAddresses.length == 0)
        throw new Error("Failed to find any smart token addresses for path.");
      return smartTokenAddresses;
    } catch (e) {
      console.error(`relays required for trade failed ${e.message}`);
      throw new Error(`relays required for trade failed ${e.message}`);
    }
  }

  @action async poolsByPriority({
    smartTokenAddresses,
    tokenPrices
  }: {
    smartTokenAddresses: string[];
    tokenPrices?: TokenPrice[];
  }) {
    if (tokenPrices && tokenPrices.length > 0) {
      return sortSmartTokenAddressesByHighestLiquidity(
        tokenPrices,
        smartTokenAddresses
      );
    } else {
      return sortAlongSide(smartTokenAddresses, x => x, priorityEthPools);
    }
  }

  @action async bareMinimumPools({
    params,
    networkContractAddress,
    smartTokenAddresses,
    tokenPrices
  }: {
    params?: ModuleParam;
    networkContractAddress: string;
    smartTokenAddresses: string[];
    tokenPrices?: TokenPrice[];
  }): Promise<string[]> {
    const fromToken =
      params! && params!.tradeQuery! && params!.tradeQuery!.base!;
    const toToken =
      params! && params!.tradeQuery! && params!.tradeQuery!.quote!;

    const tradeIncluded = fromToken && toToken;
    const poolIncluded = params && params.poolQuery;

    if (tradeIncluded) {
      console.log("trade included...");
      return this.relaysRequiredForTrade({
        from: fromToken,
        to: toToken,
        networkContractAddress
      });
    } else if (poolIncluded) {
      console.log("pool included...");
      return [poolIncluded];
    } else {
      console.log("should be loading first 5");
      const allPools = await this.poolsByPriority({
        smartTokenAddresses,
        tokenPrices
      });
      return allPools.slice(0, 3);
    }
  }

  //
  // @action async bancorIndexCheck(tokens: TokenPrice[]) {
  //   console.log(tokens, "are all tokens", tokens.find(x => x.code == "AGRI"));
  //   const tokensNotCoveredByDictionary = tokens.filter(
  //     token =>
  //       !ethBancorApiDictionary.some(dictionary =>
  //         compareString(token.id, dictionary.tokenId)
  //       )
  //   );
  //   console.warn(
  //     tokensNotCoveredByDictionary,
  //     "are tokens not covered by the dictionary"
  //   );
  //   const detailedTokens = await Promise.all(
  //     tokens.map(async token => {
  //       const detailToken = await ethBancorApi.getToken(token.id);
  //       const minimalToken = {
  //         tokenId: token.id,
  //         symbol: detailToken.code,
  //         name: detailToken.name,
  //         image: detailToken.primaryCommunityImageName,
  //         tokenAddress: detailToken.details[0].blockchainId,
  //         precision: detailToken.details[0].decimals
  //       };

  //       const passed =
  //         detailToken.details[0].blockchain.type == "ethereum" &&
  //         detailToken.details[0].blockchain.chainId == "mainnet" &&
  //         detailToken.details[0].relayCurrencyId;
  //       if (!passed) return;

  //       const relayCurrencyId = detailToken.details[0].relayCurrencyId;

  //       const relay = await ethBancorApi.getToken(relayCurrencyId);
  //       const smartTokenAddress = relay.details[0].blockchainId as string;

  //       return {
  //         ...minimalToken,
  //         smartTokenAddress
  //       };
  //     })
  //   );
  //   const clean = detailedTokens.map(x => x!).filter(Boolean);
  //   // @ts-ignore
  //   const newDictionaryItems = clean
  //     .filter(
  //       item =>
  //         !ethBancorApiDictionary.some(
  //           dict =>
  //             compareString(dict.tokenId, item.tokenId) &&
  //             compareString(dict.tokenAddress, item.tokenAddress)
  //         )
  //     )
  //     .map(item =>
  //       _.pick(item, ["tokenAddress", "smartTokenAddress", "tokenId"])
  //     ) as DictionaryItem[];

  //   // @ts-ignore
  //   const registryRequired = clean.filter(
  //     item =>
  //       !this.tokenMeta.some(meta =>
  //         compareString(meta.contract, item.tokenAddress)
  //       )
  //   );
  //   // @ts-ignore
  //   const meta = registryRequired.map(
  //     (item): TokenMeta => ({
  //       id: item.tokenAddress,
  //       precision: item.precision,
  //       symbol: item.symbol,
  //       name: item.name,
  //       contract: item.tokenAddress,
  //       image: item.image
  //     })
  //   );

  //   return clean;
  // }

  @action async fetchWithMultiCall({
    calls
  }: {
    calls: [string, CallReturn<any>][];
  }) {}

  @action async multiCallShit({
    multiCallContractAddress,
    converterAddresses
  }: {
    multiCallContractAddress: string;
    converterAddresses: string[];
  }) {
    console.log(multiCallContractAddress);
    const multiContract = buildMultiCallContract(multiCallContractAddress);

    const calls: [string, string][] = converterAddresses.map(address => {
      const contract = buildV28ConverterContract(address);
      return [address, contract.methods.owner().encodeABI()];
    });

    const shitAddress =
      "0x000000000000000000000000dfee8dc240c6cadc2c7f7f9c257c259914dea84e";
    const betterAddress = removeLeadingZeros(shitAddress);
    console.log({ shitAddress, betterAddress });
    const res = await multiContract.methods.aggregate(calls, false).call();
    console.log(res, "came back from multi call shit");

    const derp = res.returnData.map(data => data.data);
    console.log(derp, "should be the plain data");

    return res;
  }

  @action async init(params?: ModuleParam) {
    console.log(params, "was init param on eth");
    console.time("eth");
    if (this.initiated) {
      console.log("returning already");
      return this.refresh();
    }

    // @ts-ignore
    const web3NetworkVersion = await web3.eth.getChainId();
    const currentNetwork: EthNetworks = web3NetworkVersion;
    this.setNetwork(currentNetwork);
    const networkVariables = getNetworkVariables(currentNetwork);

    const testnetActive = currentNetwork == EthNetworks.Ropsten;

    if (
      params &&
      params.tradeQuery &&
      params.tradeQuery.quote &&
      testnetActive
    ) {
      params.tradeQuery.quote = networkVariables.bntToken;
    }

    try {
      let [
        tokenMeta,
        contractAddresses,
        availableSmartTokenHistories,
        bancorApiTokens
      ] = await Promise.all([
        getTokenMeta(currentNetwork),
        this.fetchContractAddresses(networkVariables.contractRegistry),
        fetchSmartTokens().catch(e => [] as HistoryItem[]),
        this.warmEthApi().catch(e => [] as TokenPrice[]),
        this.fetchUsdPriceOfBnt()
      ]);

      this.setAvailableHistories(
        availableSmartTokenHistories.map(history => history.id)
      );
      this.setTokenMeta(tokenMeta);

      const [registeredAnchorAddresses, convertibleTokens] = await Promise.all([
        this.fetchAnchorAddresses(contractAddresses.BancorConverterRegistry),
        this.fetchConvertibleTokens(contractAddresses.BancorConverterRegistry)
      ]);

      this.setregisteredAnchorAddresses(registeredAnchorAddresses);
      this.setConvertibleTokenAddresses(convertibleTokens);

      const bareMinimumAnchorAddresses = await this.bareMinimumPools({
        params,
        networkContractAddress: contractAddresses.BancorNetwork,
        smartTokenAddresses: registeredAnchorAddresses,
        ...(bancorApiTokens && { tokenPrices: bancorApiTokens })
      });

      const isDev = process.env.NODE_ENV == "development";

      const approvedPriority = await this.poolsByPriority({
        smartTokenAddresses: registeredAnchorAddresses,
        ...(bancorApiTokens && { tokenPrices: bancorApiTokens as TokenPrice[] })
      });

      const remainingLoad = _.differenceWith(
        approvedPriority,
        bareMinimumAnchorAddresses,
        compareString
      ).slice(0, isDev ? 5 : 20);

      await this.addPools(bareMinimumAnchorAddresses);
      await wait(1);
      this.addPools(remainingLoad);
      this.addPoolsContainingTokenAddresses([
        "0x309627af60f0926daa6041b8279484312f2bf060"
      ]);
      this.moduleInitiated();

      if (this.relaysList.length < 1 || this.relayFeed.length < 2) {
        console.error("Init resolved with less than 2 relay feeds or 1 relay.");
      }
      console.timeEnd("eth");
    } catch (e) {
      console.error(`Threw inside ethBancor ${e.message}`);
      throw new Error(`Threw inside ethBancor ${e.message}`);
    }
  }

  @action async addPoolsContainingTokenAddresses(tokenAddresses: string[]) {
    const allPools = await Promise.all(
      tokenAddresses.map(this.relaysContainingToken)
    );
    const uniquePools = uniqWith(allPools.flat(1), compareString);
    this.addPools(uniquePools.slice(0, 10));
  }

  @action async buildRelaysFromAnchorAddresses(
    anchorAddresses: string[]
  ): Promise<Relay[]> {
    const converterAddresses = await this.fetchConverterAddressesByAnchorAddresses(
      anchorAddresses
    );

    if (converterAddresses.length !== anchorAddresses.length)
      throw new Error("Was expecting as many converters as anchor addresses");

    const combined = _.zip(converterAddresses, anchorAddresses) as string[][];

    this.multiCallShit({
      multiCallContractAddress: "0x5Eb3fa2DFECdDe21C950813C665E9364fa609bD2",
      converterAddresses: converterAddresses.slice(0, 3)
    });

    const relays = await Promise.all(
      combined.map(async ([converterAddress, anchorAddress]) => {
        try {
          const relay = await this.buildRelay({
            anchorAddress,
            converterAddress
          });
          await this.addPool({ relay });
          return relay;
        } catch (e) {
          this.updateFailedPools([anchorAddress]);
          console.log(`Failed building relay ${converterAddress} ${e.message}`);
        }
      })
    );
    return relays.filter(Boolean) as Relay[];
  }

  @action async getConverterType(contractAddress: string) {
    const relay = findOrThrow(this.relaysList, relay =>
      compareString(relay.contract, contractAddress)
    );
    if (Number(relay.version) < 28) {
      throw new Error("Cannot get a converter type for a relay under v28");
    }
    const contract = buildV28ConverterContract(contractAddress);
    const converterType = await contract.methods.converterType().call();
    return Number(converterType);
  }

  @action async buildOracleAnchor({
    anchorAddress,
    reserveAddresses
  }: {
    anchorAddress: string;
    reserveAddresses: string[];
  }): Promise<AnchorProps> {
    const poolTokens = await Promise.all(
      reserveAddresses.map(
        async (reserveAddress): Promise<PoolToken> => {
          const poolTokenAddress = await this.fetchPoolToken({
            reserveTokenAddress: reserveAddress,
            anchorContract: anchorAddress
          });
          const token = await this.buildTokenByTokenAddress(poolTokenAddress);
          return {
            reserveId: reserveAddress,
            poolToken: token
          };
        }
      )
    );
    return {
      anchor: {
        poolContainerAddress: anchorAddress,
        poolTokens
      },
      converterType: PoolType.ChainLink
    };
  }

  @action async buildSmartTokenAnchor(
    anchorAddress: string
  ): Promise<AnchorProps> {
    const smartToken = await this.buildTokenByTokenAddress(anchorAddress);
    return { anchor: smartToken, converterType: PoolType.Traditional };
  }

  @action async discoverAnchorType(anchorAddress: string): Promise<PoolType> {
    try {
      const v2PoolsContainerContract = buildV2PoolsContainer(anchorAddress);
      const poolTokens = await v2PoolsContainerContract.methods
        .poolTokens()
        .call();
      if (Array.isArray(poolTokens)) return PoolType.ChainLink;
      else return PoolType.Traditional;
    } catch (e) {
      return PoolType.Traditional;
    }
  }

  @action async buildAnchor({
    anchorAddress,
    converterAddress,
    version,
    reserveAddresses
  }: {
    anchorAddress: string;
    converterAddress: string;
    version: number;
    reserveAddresses: string[];
  }): Promise<AnchorProps> {
    try {
      const over28 = version >= 28;
      if (over28) {
        const poolType = await this.discoverAnchorType(anchorAddress);
        if (poolType == PoolType.Traditional)
          return this.buildSmartTokenAnchor(anchorAddress);
        else if (poolType == PoolType.ChainLink)
          return this.buildOracleAnchor({ anchorAddress, reserveAddresses });
        else throw new Error("Failed to identify anchor");
      } else {
        return this.buildSmartTokenAnchor(anchorAddress);
      }
    } catch (e) {
      console.log(`threw inside of build anchor ${e.message}`);
      throw new Error(e);
    }
  }

  @action async buildRelay(relayAddresses: {
    anchorAddress: string;
    converterAddress: string;
  }): Promise<Relay> {
    try {
      const converterContract = buildConverterContract(
        relayAddresses.converterAddress
      );

      const [
        owner,
        version,
        connectorCount,
        reserve1Address,
        reserve2Address,
        fee
      ] = (await makeBatchRequest(
        [
          converterContract.methods.owner().call,
          converterContract.methods.version().call,
          converterContract.methods.connectorTokenCount().call,
          converterContract.methods.connectorTokens(0).call,
          converterContract.methods.connectorTokens(1).call,
          converterContract.methods.conversionFee().call
        ],
        "0x0D8775F648430679A709E98d2b0Cb6250d2887EF"
      )) as string[];

      if (connectorCount !== "2")
        throw new Error(
          "Converter not valid, does not have 2 tokens in converter"
        );

      const [reserve1, reserve2, anchorProps] = await Promise.all([
        this.buildTokenByTokenAddress(reserve1Address),
        this.buildTokenByTokenAddress(reserve2Address),
        this.buildAnchor({
          converterAddress: relayAddresses.converterAddress,
          anchorAddress: relayAddresses.anchorAddress,
          version: Number(version),
          reserveAddresses: [reserve1Address, reserve2Address]
        })
      ]);

      console.log("final promise made it");

      return {
        id: relayAddresses.anchorAddress,
        fee: Number(fee) / 10000,
        owner: owner,
        network: "ETH",
        version: version,
        contract: relayAddresses.converterAddress,
        reserves: [reserve1, reserve2],
        isMultiContract: false,
        ...anchorProps
      };
    } catch (e) {
      console.log(`threw inside build relay because ${e.message}`);
      throw new Error(e);
    }
  }

  @action async buildTokenByTokenAddress(address: string): Promise<Token> {
    if (compareString(address, ethReserveAddress)) {
      return {
        contract: address,
        decimals: 18,
        network: "ETH",
        symbol: "ETH"
      };
    }

    const tokenContract = buildTokenContract(address);
    const existingTokens = this.relaysList.flatMap(tokensInRelay);

    const existingToken = existingTokens.find(token =>
      compareString(token.contract, address)
    );

    if (existingToken) {
      return existingToken;
    }

    const tokenMetaObj = this.tokenMeta.find(meta =>
      compareString(meta.contract, address)
    );

    if (tokenMetaObj && typeof tokenMetaObj.precision == "number") {
      return {
        contract: address,
        decimals: tokenMetaObj.precision!,
        network: "ETH",
        symbol: tokenMetaObj.symbol
      };
    }

    const [symbol, decimals] = await Promise.all([
      tokenContract.methods.symbol().call(),
      tokenContract.methods.decimals().call()
    ]);

    return {
      contract: address,
      decimals: Number(decimals),
      network: "ETH",
      symbol
    };
  }

  @action async fetchConverterAddressesByAnchorAddresses(
    anchorAddresses: string[]
  ) {
    const registryContract = new web3.eth.Contract(
      ABIConverterRegistry,
      this.contracts.BancorConverterRegistry
    );
    const converterAddresses: string[] = await registryContract.methods
      .getConvertersByAnchors(anchorAddresses)
      .call();
    return converterAddresses;
  }

  @action async fetchAnchorAddresses(converterRegistryAddress: string) {
    const registryContract = new web3.eth.Contract(
      ABIConverterRegistry,
      converterRegistryAddress
    );
    const anchorAddresses: string[] = await registryContract.methods
      .getAnchors()
      .call();
    return anchorAddresses;
  }

  @mutation updateRelays(relays: Relay[]) {
    const allReserves = this.relaysList
      .concat(relays)
      .flatMap(relay => relay.reserves);
    const uniqueTokens = _.uniqWith(allReserves, (a, b) =>
      compareString(a.contract, b.contract)
    );

    const decimalUniformityBetweenTokens = uniqueTokens.every(token => {
      const allReservesTokenFoundIn = allReserves.filter(reserve =>
        compareString(token.contract, reserve.contract)
      );
      return allReservesTokenFoundIn.every(
        (reserve, _, arr) => reserve.decimals == arr[0].decimals
      );
    });
    if (!decimalUniformityBetweenTokens) {
      console.error(
        `There is a mismatch of decimals between relays of the same token, will not store ${relays.length} new relays`
      );
      return;
    }

    const meshedRelays = _.uniqWith(
      [...relays, ...this.relaysList],
      compareRelayById
    );
    this.relaysList = meshedRelays;
  }

  @action async fetchReserveBalance({
    relay,
    reserveContract
  }: {
    relay: Relay;
    reserveContract: string;
  }): Promise<[Token, number]> {
    const reserveInRelay = findOrThrow(
      relay.reserves,
      reserve => compareString(reserve.contract, reserveContract),
      "Reserve is not in this relay!"
    );
    const converterContract = buildConverterContract(relay.contract);

    const reserveBalance = await fetchReserveBalance(
      converterContract,
      reserveContract,
      relay.version
    );
    const numberReserveBalance = shrinkToken(
      reserveBalance,
      reserveInRelay.decimals
    );
    return [reserveInRelay, Number(numberReserveBalance)];
  }

  @mutation wipeTokenBalances() {
    this.tokenBalances = [];
  }

  @action async onAuthChange(address: string) {
    const previousBalances = this.tokenBalances;
    this.wipeTokenBalances();
    previousBalances.forEach(({ id }) =>
      vxm.ethWallet
        .getBalance({
          accountHolder: address,
          tokenContractAddress: id
        })
        .then(balanceAmount => {
          this.updateBalance([id, Number(balanceAmount)]);
        })
    );
  }

  @action async focusSymbol(id: string) {
    if (!this.isAuthenticated) return;
    const tokenContractAddress = findOrThrow(
      this.tokenMeta,
      meta => compareString(meta.id, id),
      `failed to find this token contract address in meta (${id})`
    ).contract;
    const balance = await vxm.ethWallet.getBalance({
      accountHolder: this.isAuthenticated,
      tokenContractAddress
    });
    this.updateBalance([id!, Number(balance)]);

    const tokenTracked = this.tokens.find(token => compareString(token.id, id));
    if (!tokenTracked) {
      this.loadMoreTokens([id]);
    }
  }

  @mutation updateBalance([id, balance]: [string, number]) {
    const newBalances = this.tokenBalances.filter(
      balance => !compareString(balance.id, id)
    );
    newBalances.push({ id, balance });
    this.tokenBalances = newBalances;
  }

  @action async refreshBalances(symbols?: BaseToken[]) {
    if (symbols) {
      symbols.forEach(symbol => this.focusSymbol(symbol.symbol));
    }
  }

  @action async mintEthErcIfRequired(decString: string) {
    const contract = buildTokenContract(ethErc20WrapperContract);
    const currentBalance = await contract.methods
      .balanceOf(this.isAuthenticated)
      .call();

    const currentBalanceDec = Number(shrinkToken(currentBalance, 18));
    const numberBalance = Number(decString);

    const mintingRequired = numberBalance > currentBalanceDec;
    if (mintingRequired) {
      return this.mintEthErc(decString);
    }
  }

  @action async tokenById(id: string) {
    return findOrThrow(
      this.tokens,
      token => compareString(token.id, id),
      `tokenById failed to find token with ID ${id} `
    );
  }

  @action async tokensById(ids: string[]) {
    return Promise.all(ids.map(id => this.tokenById(id)));
  }

  @action async findPath({
    fromId,
    toId,
    relays
  }: {
    fromId: string;
    toId: string;
    relays: Relay[];
  }) {
    const lowerCased = relays.map(relay => ({
      ...relay,
      reserves: relay.reserves.map(reserve => ({
        ...reserve,
        contract: reserve.contract.toLowerCase()
      }))
    }));
    const path = await findNewPath(
      fromId.toLowerCase(),
      toId.toLowerCase(),
      lowerCased,
      relay => [relay.reserves[0].contract, relay.reserves[1].contract]
    );

    const flattened = path.hops.flatMap(hop => hop[0]);
    return flattened.map(flat =>
      findOrThrow(
        relays,
        relay => compareString(relay.contract, flat.contract),
        "failed to find relays used in pathing"
      )
    );
  }

  @action async convert({ from, to, onUpdate }: ProposedConvertTransaction) {
    if (compareString(from.id, to.id))
      throw new Error("Cannot convert a token to itself.");
    const [fromToken, toToken] = await this.tokensById([from.id, to.id]);
    const fromIsEth = compareString(fromToken.symbol, "eth");

    const steps: Section[] = [
      {
        name: "Pathing",
        description: "Finding path..."
      },
      {
        name: "SetApprovalAmount",
        description: "Setting approval amount..."
      },
      {
        name: "ConvertProcessing",
        description: "Processing conversion..."
      },
      {
        name: "WaitingTxConf",
        description: "Awaiting block confirmation..."
      },
      {
        name: "Done",
        description: "Done!"
      }
    ];

    onUpdate!(0, steps);

    const fromTokenDecimals = await this.getDecimalsByTokenAddress(
      fromToken.id
    );
    const toTokenDecimals = await this.getDecimalsByTokenAddress(toToken.id);

    const relays = await this.findPath({
      relays: this.relaysList,
      fromId: from.id,
      toId: to.id
    });

    const fromAmount = from.amount;
    const toAmount = Number(to.amount);
    const fromSymbol = fromToken.symbol;
    const fromTokenContract = fromToken.id;
    const toTokenContract = toToken.id;

    const ethPath = generateEthPath(fromSymbol, relays.map(relayToMinimal));

    const fromWei = expandToken(fromAmount, fromTokenDecimals);

    if (!fromIsEth) {
      onUpdate!(1, steps);
      await this.triggerApprovalIfRequired({
        owner: this.isAuthenticated,
        amount: fromWei,
        spender: this.contracts.BancorNetwork,
        tokenAddress: fromTokenContract
      });
    }

    onUpdate!(2, steps);

    const networkContract = buildNetworkContract(this.contracts.BancorNetwork);

    const confirmedHash = await this.resolveTxOnConfirmation({
      tx: networkContract.methods.convertByPath(
        ethPath,
        fromWei,
        expandToken(toAmount * 0.9, toTokenDecimals),
        zeroAddress,
        zeroAddress,
        0
      ),
      ...(fromIsEth && { value: fromWei }),
      gas: 550000 * 1.3,
      onHash: () => onUpdate!(3, steps)
    });
    onUpdate!(4, steps);
    wait(2000).then(() =>
      [fromTokenContract, toTokenContract].forEach(contract =>
        this.getUserBalance(contract)
      )
    );
    return confirmedHash;
  }

  @action async triggerApprovalIfRequired({
    owner,
    spender,
    amount,
    tokenAddress
  }: {
    owner: string;
    spender: string;
    tokenAddress: string;
    amount: string;
  }) {
    const currentApprovedBalance = await this.getApprovedBalanceWei({
      owner,
      spender,
      tokenAddress
    });

    if (Number(currentApprovedBalance) >= Number(amount)) return;

    const nullingTxRequired = fromWei(currentApprovedBalance) !== "0";
    if (nullingTxRequired) {
      await this.approveTokenWithdrawals([
        { approvedAddress: spender, amount: toWei("0"), tokenAddress }
      ]);
    }

    return this.approveTokenWithdrawals([
      { approvedAddress: spender, amount, tokenAddress }
    ]);
  }

  @action async getApprovedBalanceWei({
    tokenAddress,
    owner,
    spender
  }: {
    tokenAddress: string;
    owner: string;
    spender: string;
  }) {
    const tokenContract = buildTokenContract(tokenAddress);

    const approvedFromTokenBalance = await tokenContract.methods
      .allowance(owner, spender)
      .call();
    return approvedFromTokenBalance;
  }

  @action async getReturnByPath({
    path,
    amount
  }: {
    path: string[];
    amount: string;
  }): Promise<string> {
    const contract = buildNetworkContract(this.contracts.BancorNetwork);
    return contract.methods.rateByPath(path, amount).call();
  }

  @action async getDecimalsByTokenAddress(tokenAddress: string) {
    if (compareString(tokenAddress, ethReserveAddress)) return 18;
    const reserve = this.relaysList
      .flatMap(relay => relay.reserves)
      .find(reserve => compareString(reserve.contract, tokenAddress));
    if (!reserve) {
      try {
        const contract = buildTokenContract(tokenAddress);
        const decimals = await contract.methods.decimals();
        return Number(decimals);
      } catch (e) {
        throw new Error(
          `Failed to find token address ${tokenAddress} in list of reserves. ${e.message}`
        );
      }
    }
    return reserve.decimals;
  }

  @action async getReturn({ from, toId }: ProposedFromTransaction) {
    if (compareString(from.id, toId))
      throw new Error("Cannot convert a token to itself.");
    const [fromToken, toToken] = await this.tokensById([from.id, toId]);

    const [fromTokenContract, toTokenContract] = [fromToken.id, toToken.id];
    const amount = from.amount;

    const fromTokenDecimals = await this.getDecimalsByTokenAddress(
      fromTokenContract
    );
    const toTokenDecimals = await this.getDecimalsByTokenAddress(
      toTokenContract
    );

    const relays = await this.findPath({
      fromId: from.id,
      toId,
      relays: this.relaysList
    });

    const path = generateEthPath(fromToken.symbol, relays.map(relayToMinimal));

    const wei = await this.getReturnByPath({
      path,
      amount: expandToken(amount, fromTokenDecimals)
    });

    return {
      amount: shrinkToken(wei, toTokenDecimals)
    };
  }

  @action async getCost({ fromId, to }: ProposedToTransaction) {
    if (compareString(fromId, to.id))
      throw new Error("Cannot convert a token to itself.");
    const fromToken = await this.tokenById(fromId);
    const toToken = await this.tokenById(to.id);

    const amount = to.amount;

    const [fromTokenContract, toTokenContract] = [fromToken.id, toToken.id];

    const fromTokenDecimals = await this.getDecimalsByTokenAddress(
      fromTokenContract
    );
    const toTokenDecimals = await this.getDecimalsByTokenAddress(
      toTokenContract
    );

    const relays = this.relaysList;

    const poolIds = relays.map(relay => relay.id);
    const allCoveredUnderBancorApi = poolIds.every(poolId =>
      ethBancorApiDictionary.some(dic =>
        compareString(poolId, dic.smartTokenAddress)
      )
    );
    if (!allCoveredUnderBancorApi)
      throw new Error("Fetching the cost of this token is not yet supported.");

    const [fromTokenTicker, toTokenTicker] = await Promise.all([
      ethBancorApi.getToken(fromToken.symbol),
      ethBancorApi.getToken(toToken.symbol)
    ]);
    const fromTokenId = fromTokenTicker._id;
    const toTokenId = toTokenTicker._id;

    const result = await ethBancorApi.calculateCost(
      fromTokenId,
      toTokenId,
      expandToken(amount, toTokenDecimals)
    );

    return {
      amount: shrinkToken(result, fromTokenDecimals)
    };
  }
}
