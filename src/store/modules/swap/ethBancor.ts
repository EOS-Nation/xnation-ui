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
  ModuleParam
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
  multiSteps
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
import _ from "lodash";
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
  makeBatchRequest
} from "@/api/ethBancorCalc";
import { ethBancorApiDictionary } from "@/api/bancorApiRelayDictionary";
import BigNumber from "bignumber.js";
import {
  getSmartTokenHistory,
  fetchSmartTokens,
  HistoryItem
} from "@/api/zumZoom";
import { sortByNetworkTokens } from "@/api/sortByNetworkTokens";
import { findNewPath } from "@/api/eosBancorCalc";
import { priorityEthPools, getHardCodedRelays } from "./staticRelays";

interface WeiExtendedAsset {
  weiAmount: string;
  contract: string;
}

enum PoolType {
  Traditional = 1,
  ChainLink = 2
}

const poolIdToPoolType = (id: string) =>
  id == "new" ? PoolType.ChainLink : PoolType.Traditional;

const relayToDry = (relay: Relay): DryRelay => ({
  contract: relay.contract,
  reserves: relay.reserves.map(
    (reserve): TokenSymbol => ({
      contract: reserve.contract,
      symbol: reserve.symbol
    })
  ),
  smartToken: relay.smartToken
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

const sortAlongSide = <T>(
  arr: T[],
  selector: (item: T) => string,
  sortedArr: string[]
): T[] => {
  const res = arr.slice().sort((a, b) => {
    const aIndex = sortedArr.findIndex(sort =>
      compareString(sort, selector(a))
    );
    const bIndex = sortedArr.findIndex(sort =>
      compareString(sort, selector(b))
    );

    if (aIndex == -1 && bIndex == -1) return 0;
    if (aIndex == -1) return 1;
    if (bIndex == -1) return -1;
    return aIndex - bIndex;
  });

  return res;
};

interface EthOpposingLiquid extends OpposingLiquid {
  smartTokenAmount: string;
}

const relayIncludesAtLeastOneNetworkToken = (relay: Relay) =>
  relay.reserves.some(reserve => networkTokens.includes(reserve.symbol));

const compareRelayFeed = (a: RelayFeed, b: RelayFeed) =>
  compareString(a.smartTokenContract, b.smartTokenContract) &&
  compareString(a.tokenId, b.tokenId);

const tokenPriceToFeed = (
  tokenAddress: string,
  smartTokenAddress: string,
  usdPriceOfEth: number,
  tokenPrice: TokenPrice
): RelayFeed => ({
  tokenId: tokenAddress,
  smartTokenContract: smartTokenAddress,
  costByNetworkUsd: tokenPrice.price,
  liqDepth: tokenPrice.liquidityDepth * usdPriceOfEth * 2,
  change24H: tokenPrice.change24h,
  volume24H: tokenPrice.volume24h.USD
});

interface RegisteredContracts {
  BancorNetwork: string;
  BancorConverterRegistry: string;
  BancorX: string;
  BancorConverterFactory: string;
}

const removeLeadingZeros = (hexString: string) => {
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

const getTokenMeta = async () => {
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

const compareRelayBySmartTokenAddress = (a: Relay, b: Relay) =>
  compareString(a.smartToken.contract, b.smartToken.contract);

interface RelayFeed {
  smartTokenContract: string;
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
  registeredSmartTokenAddresses: string[] = [];
  convertibleTokenAddresses: string[] = [];
  loadingPools: boolean = true;

  bancorApiTokens: TokenPrice[] = [];
  relayFeed: RelayFeed[] = [];
  relaysList: Relay[] = [];
  tokenBalances: { id: string; balance: number }[] = [];
  bntUsdPrice: number = 0;
  tokenMeta: TokenMeta[] = [];
  morePoolsAvailableProp: boolean = true;
  availableHistories: string[] = [];
  bancorContractRegistry = "0x52Ae12ABe5D8BD778BD5397F99cA900624CfADD4";
  contracts: RegisteredContracts = {
    BancorNetwork: "",
    BancorConverterRegistry: "",
    BancorX: "",
    BancorConverterFactory: ""
  };
  initiated: boolean = false;
  failedPools: string[] = [];

  @mutation setBancorApiTokens(tokens: TokenPrice[]) {
    this.bancorApiTokens = tokens;
  }

  get morePoolsAvailable() {
    return this.morePoolsAvailableProp;
  }

  @mutation setPoolsAvailable(status: boolean) {
    this.morePoolsAvailableProp = status;
  }

  @mutation setLoadingPools(status: boolean) {
    this.loadingPools = status;
  }

  @mutation updateFailedPools(smartTokenAddresses: string[]) {
    this.failedPools = _.uniqWith(
      [...this.failedPools, ...smartTokenAddresses],
      compareString
    );
  }

  @action async loadMorePools() {
    this.setLoadingPools(true);
    const newPoolsAvailable = this.registeredSmartTokenAddresses
      .filter(
        address =>
          !this.relaysList.some(relay =>
            compareString(relay.smartToken.contract, address)
          )
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
    const relays = await this.buildRelaysFromSmartTokenAddresses(
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
      console.log("Refusing to add pool as it failed tests", relay);
      this.updateFailedPools([relay.smartToken.contract]);
    }
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
      return this.tokenMeta
        .map(meta => ({
          id: meta.contract,
          contract: meta.contract,
          symbol: meta.symbol,
          img: meta.image,
          balance:
            this.tokenBalance(meta.contract) &&
            this.tokenBalance(meta.contract)!.balance
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
        .filter((_, index) => index < 200)
        .sort((a, b) => Number(b.balance) - Number(a.balance));
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
              compareString(
                relayFeed.smartTokenContract,
                relay.smartToken.contract
              )
          )
        )
      )
      .flatMap(relay =>
        relay.reserves.map(reserve => {
          const { name, image } = this.tokenMetaObj(reserve.contract);
          const relayFeed = this.relayFeed.find(
            feed =>
              compareString(
                feed.smartTokenContract,
                relay.smartToken.contract
              ) && compareString(feed.tokenId, reserve.contract)
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

  get relayBySmartSymbol() {
    return (smartTokenSymbol: string) => {
      const relay = this.relaysList.find(relay =>
        compareString(relay.smartToken.symbol, smartTokenSymbol)
      );
      if (!relay) throw new Error("Failed to find Relay by Smart Token Symbol");
      return relay;
    };
  }

  get relayBySmartTokenAddress() {
    return (smartTokenAddress: string) => {
      const relay = this.relaysList.find(relay =>
        compareString(relay.smartToken.contract, smartTokenAddress)
      );
      if (!relay)
        throw new Error("Failed to find Relay by Smart Token Address");
      return relay;
    };
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
    return this.relaysList
      .filter(relay =>
        this.relayFeed.some(feed =>
          compareString(feed.smartTokenContract, relay.smartToken.contract)
        )
      )
      .map(relay => {
        const [networkReserve, tokenReserve] = sortByNetworkTokens(
          relay.reserves,
          reserve => reserve.symbol
        );
        const relayFeed = this.relayFeed.find(feed =>
          compareString(feed.smartTokenContract, relay.smartToken.contract)
        )!;

        const smartTokenSymbol = relay.smartToken.symbol;
        const hasHistory = this.availableHistories.some(history =>
          compareString(smartTokenSymbol, history)
        );

        return {
          id: relay.smartToken.contract,
          reserves: [networkReserve, tokenReserve].map(reserve => {
            const meta = this.tokenMetaObj(reserve.contract);
            return {
              id: reserve.contract,
              reserveId: relay.smartToken.contract + reserve.contract,
              logo: [meta.image],
              symbol: reserve.symbol,
              contract: reserve.contract,
              smartTokenSymbol: relay.smartToken.contract
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

  @action async fetchRelayBalances(smartTokenAddress: string) {
    const { reserves, version, contract } = this.relayBySmartTokenAddress(
      smartTokenAddress
    );

    const converterContract = buildConverterContract(contract);

    const smartTokenContract = buildTokenContract(smartTokenAddress);

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

  // @action async newFetchReserveBalance({
  //   converterAddress,
  //   reserveAddress,
  //   converterVersion
  // }: {
  //   converterAddress: string;
  //   reserveAddress: string;
  //   converterVersion: number;
  // }) {
  //   console.log(
  //     `was the result of converter: ${converterAddress} ${reserveAddress} ${converterVersion}`
  //   );

  //   const methods = [
  //     "reserveBalance",
  //     "getReserveBalance",
  //     "getConnectorBalance"
  //   ];

  //   const res = await Promise.all(
  //     methods.map(methodName => {
  //       const contract = buildConverterContract(converterAddress);

  //     })
  //   );

  //   if (converterVersion >= 28) {
  //     const converter = buildV28ConverterContract(converterAddress);

  //     const res = await converter.methods.reserveBalance(reserveAddress).call();
  //     return res;
  //   } else if (converterVersion >= 17) {
  //     const converterContract = buildConverterContract(converterAddress);

  //     return (
  //       converterContract.methods
  //         // @ts-ignore
  //         .getConnectorBalance(reserveAddress)
  //         .call()
  //     );
  //   } else {
  //     const converterContract = buildConverterContract(converterAddress);

  //     return (
  //       converterContract.methods
  //         // @ts-ignore
  //         .getReserveBalance(reserveAddress)
  //         .call()
  //     );
  //   }
  // }

  // @action async newFetchRelayBalances(relayId: string) {
  //   const relay = await this.relayById(relayId);

  //   const reserves = await Promise.all(
  //     relay.reserves.map(async reserve => ({
  //       ...reserve,
  //       weiAmount: await this.newFetchReserveBalance({
  //         converterAddress: relay.contract,
  //         reserveAddress: reserve.contract,
  //         converterVersion: Number(relay.version)
  //       })
  //     }))
  //   );

  //   const smartTokenContract = buildTokenContract(relay.smartToken.contract);

  //   const totalSupplyWei = await smartTokenContract.methods
  //     .totalSupply()
  //     .call();

  //   return { reserves, totalSupplyWei };
  // }

  @action async calculateOpposingDeposit(
    opposingDeposit: OpposingLiquidParams
  ): Promise<EthOpposingLiquid> {
    const { id, reserve } = opposingDeposit;
    const relay = await this.relayById(id);

    const reserveToken = await this.tokenById(reserve.id);

    const tokenSymbol = reserveToken.symbol;
    const tokenAmount = reserve.amount;

    const smartTokenAddress = relay.smartToken.contract;

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
      smartTokenAmount: fundReward
    };
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

  @action async getUserBalances(relayId: string) {
    if (!vxm.wallet.isAuthenticated)
      throw new Error("Cannot find users .isAuthenticated");
    const relay = await this.relayById(relayId);

    const smartTokenUserBalance = await this.getUserBalance(
      relay.smartToken.contract
    );

    const { totalSupplyWei, reserves } = await this.fetchRelayBalances(
      relay.smartToken.contract
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

  @action async calculateOpposingWithdraw(
    opposingWithdraw: OpposingLiquidParams
  ): Promise<EthOpposingLiquid> {
    const { id, reserve } = opposingWithdraw;
    const tokenAmount = reserve.amount;
    const sameReserveToken = await this.tokenById(reserve.id);

    const relay = await this.relayById(id);
    const smartTokenAddress = relay.smartToken.contract;

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
      smartTokenAmount
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

    const { smartTokenAmount } = await this.calculateOpposingWithdraw({
      id: relayId,
      reserve: reserves[0]
    });

    const hash = postV28
      ? await this.removeLiquidityV28({
          converterAddress: relay.contract,
          smartTokensWei: smartTokenAmount,
          reserveTokenAddresses: relay.reserves.map(reserve => reserve.contract)
        })
      : await this.liquidate({
          converterAddress: relay.contract,
          smartTokenAmount
        });

    wait(2000).then(() =>
      relay.reserves
        .map(reserve => reserve.contract)
        .forEach(contract => this.getUserBalance(contract))
    );
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

    const { smartTokenAmount } = await this.calculateOpposingDeposit({
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
        fundAmount,
        onHash: () => onUpdate!(2, steps)
      });
    }

    onUpdate!(3, steps);
    wait(3000).then(() =>
      matchedBalances.forEach(balance => this.getUserBalance(balance.contract))
    );
    return txHash;
  }

  @action async fetchContractAddresses() {
    const hardCodedBytes: RegisteredContracts = {
      BancorNetwork: asciiToHex("BancorNetwork"),
      BancorConverterRegistry: asciiToHex("BancorConverterRegistry"),
      BancorX: asciiToHex("BancorX"),
      BancorConverterFactory: asciiToHex("BancorConverterFactory")
    };

    const registryContract = new web3.eth.Contract(
      ABIContractRegistry,
      this.bancorContractRegistry
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
  ): Promise<RelayFeed[]> {
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

      return relays
        .filter(relay => {
          const dictionaryItems = ethBancorApiDictionary.filter(catalog =>
            compareString(relay.smartToken.contract, catalog.smartTokenAddress)
          );
          return tokens.some(token =>
            dictionaryItems.some(dic => compareString(dic.tokenId, token.id))
          );
        })
        .flatMap(relay =>
          relay.reserves.map(reserve => {
            const foundDictionaries = ethBancorApiDictionary.filter(catalog =>
              compareString(
                catalog.smartTokenAddress,
                relay.smartToken.contract
              )
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
              relay.smartToken.contract,
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

  @mutation updateRelayFeeds(feeds: RelayFeed[]) {
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

  @action async buildRelayFeed({
    relay,
    usdPriceOfBnt
  }: {
    relay: Relay;
    usdPriceOfBnt: number;
  }): Promise<RelayFeed[]> {
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
        smartTokenContract: relay.smartToken.contract,
        costByNetworkUsd: main,
        liqDepth
      },
      {
        tokenId: networkReserve.contract,
        smartTokenContract: relay.smartToken.contract,
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

  @mutation setRegisteredSmartTokenAddresses(addresses: string[]) {
    this.registeredSmartTokenAddresses = addresses;
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

  @action async init(params?: ModuleParam) {
    console.log(params, "was init param on eth");
    console.time("eth");

    if (this.initiated) {
      console.log("returning already");
      return this.refresh();
    }

    try {
      const [
        tokenMeta,
        contractAddresses,
        availableSmartTokenHistories,
        bancorApiTokens
      ] = await Promise.all([
        getTokenMeta(),
        this.fetchContractAddresses(),
        fetchSmartTokens().catch(e => [] as HistoryItem[]),
        this.warmEthApi().catch(e => [] as TokenPrice[]),
        this.fetchUsdPriceOfBnt()
      ]);

      console.log({ contractAddresses });

      this.setAvailableHistories(
        availableSmartTokenHistories.map(history => history.id)
      );
      this.setTokenMeta(tokenMeta);

      const [
        registeredSmartTokenAddresses,
        convertibleTokens
      ] = await Promise.all([
        this.fetchSmartTokenAddresses(
          contractAddresses.BancorConverterRegistry
        ),
        this.fetchConvertibleTokens(contractAddresses.BancorConverterRegistry)
      ]);

      this.setRegisteredSmartTokenAddresses(registeredSmartTokenAddresses);
      this.setConvertibleTokenAddresses(convertibleTokens);

      const bareMinimumSmartTokenAddresses = await this.bareMinimumPools({
        params,
        networkContractAddress: contractAddresses.BancorNetwork,
        smartTokenAddresses: registeredSmartTokenAddresses,
        ...(bancorApiTokens && { tokenPrices: bancorApiTokens })
      });

      const isDev = process.env.NODE_ENV == "development";

      const approvedPriority = await this.poolsByPriority({
        smartTokenAddresses: registeredSmartTokenAddresses,
        ...(bancorApiTokens && { tokenPrices: bancorApiTokens as TokenPrice[] })
      });

      const remainingLoad = _.differenceWith(
        approvedPriority,
        bareMinimumSmartTokenAddresses,
        compareString
      ).slice(0, isDev ? 5 : 20);

      await this.addPools(bareMinimumSmartTokenAddresses);
      await wait(1);
      this.addPools(remainingLoad);
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

  @action async buildRelaysFromSmartTokenAddresses(
    smartTokenAddresses: string[]
  ): Promise<Relay[]> {
    const converterAddresses = await this.fetchConverterAddressesBySmartTokenAddresses(
      smartTokenAddresses
    );

    if (converterAddresses.length !== smartTokenAddresses.length)
      throw new Error(
        "Was expecting as many converters as smartTokenAddresses"
      );

    const combined = _.zip(
      converterAddresses,
      smartTokenAddresses
    ) as string[][];

    const relays = await Promise.all(
      combined.map(async ([converterAddress, smartTokenAddress]) => {
        try {
          const relay = await this.buildRelay({
            smartTokenAddress,
            converterAddress
          });
          await this.addPool({ relay });
          return relay;
        } catch (e) {
          this.updateFailedPools([smartTokenAddress]);
          console.log(`Failed building relay ${converterAddress} ${e.message}`);
        }
      })
    );
    return relays.filter(Boolean) as Relay[];
  }

  @action async getConverterType(contractAddress: string) {
    const relay = this.relaysList.find(relay =>
      compareString(relay.contract, contractAddress)
    );
    if (Number(relay && relay.version) < 28) {
      throw new Error("Cannot get a converter type for a relay under v28");
    }
    const contract = buildV28ConverterContract(contractAddress);
    const converterType = await contract.methods.converterType().call();
    return Number(converterType);
  }

  @action async buildRelay(relayAddresses: {
    smartTokenAddress: string;
    converterAddress: string;
  }): Promise<Relay> {
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

    const tokenAddresses: string[] = [
      reserve1Address as string,
      reserve2Address as string,
      relayAddresses.smartTokenAddress
    ];

    const over28 = Number(version) >= 28;

    // @ts-ignore
    const [reserve1, reserve2, smartToken, converterType] = (await Promise.all([
      ...tokenAddresses.map(this.buildTokenByTokenAddress),
      ...(over28
        ? [this.getConverterType(relayAddresses.converterAddress)]
        : [])
    ])) as [Token, Token, Token, number];

    return {
      id: relayAddresses.smartTokenAddress,
      fee: Number(fee) / 10000,
      owner: owner,
      network: "ETH",
      version: version,
      contract: relayAddresses.converterAddress,
      smartToken,
      reserves: [reserve1, reserve2],
      isMultiContract: false,
      ...(over28 && { converterType })
    };
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

    const existingTokens = this.relaysList.flatMap(relay => [
      ...relay.reserves,
      relay.smartToken
    ]);

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

  @action async fetchConverterAddressesBySmartTokenAddresses(
    smartTokenAddresses: string[]
  ) {
    const registryContract = new web3.eth.Contract(
      ABIConverterRegistry,
      this.contracts.BancorConverterRegistry
    );
    const converterAddresses: string[] = await registryContract.methods
      .getConvertersBySmartTokens(smartTokenAddresses)
      .call();
    return converterAddresses;
  }

  @action async fetchSmartTokenAddresses(converterRegistryAddress: string) {
    const registryContract = new web3.eth.Contract(
      ABIConverterRegistry,
      converterRegistryAddress
    );
    const smartTokenAddresses: string[] = await registryContract.methods
      .getSmartTokens()
      .call();
    return smartTokenAddresses;
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
      compareRelayBySmartTokenAddress
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

  @action async accountChange(address: string) {
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
    relays: DryRelay[];
    fromId: string;
    toId: string;
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

    const dryRelays = this.relaysList.map(relayToDry);

    const path = await this.findPath({
      relays: dryRelays,
      fromId: from.id,
      toId: to.id
    });

    const fromAmount = from.amount;
    const toAmount = Number(to.amount);
    const fromSymbol = fromToken.symbol;
    const fromTokenContract = fromToken.id;
    const toTokenContract = toToken.id;

    const ethPath = generateEthPath(fromSymbol, path);

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
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
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

    const dryRelays = await this.findPath({
      fromId: from.id,
      toId,
      relays: this.relaysList.map(relayToDry)
    });
    const path = generateEthPath(fromToken.symbol, dryRelays);

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

    const dryRelays = this.relaysList.map(relayToDry);

    const smartTokenAddresses = dryRelays.map(
      relay => relay.smartToken.contract
    );
    const allCoveredUnderBancorApi = smartTokenAddresses.every(address =>
      ethBancorApiDictionary.some(dic =>
        compareString(address, dic.smartTokenAddress)
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
