import { VuexModule, mutation, action, Module } from "vuex-class-component";
import {
  ProposedTransaction,
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
  Section
} from "@/types/bancor";
import { ethBancorApi, bancorApi } from "@/api/bancor";
import {
  getEthRelays,
  web3,
  Relay,
  Token,
  fetchReserveBalance
} from "@/api/helpers";
import {
  ABISmartToken,
  ABIConverter,
  BntTokenContract,
  smartTokenByteCode,
  FactoryAbi,
  bancorRegistry,
  ABIContractRegistry,
  ABINetworkContract,
  ABIConverterRegistry,
  ABINetworkPathFinder
} from "@/api/ethConfig";
import { toWei, toHex, fromWei } from "web3-utils";
import Decimal from "decimal.js";
import axios, { AxiosResponse } from "axios";

import { vxm } from "@/store";
import wait from "waait";
import _ from "lodash";
import {
  createPath,
  DryRelay,
  ChoppedRelay,
  TokenSymbol,
  generateEthPath
} from "@/api/ethBancorCalc";
import { bancorApiSmartTokens } from "@/api/bancorApiOffers";
import { relays } from "./staticRelays";

const expandToken = (amount: string | number, precision: number) =>
  String((Number(amount) * Math.pow(10, precision)).toFixed(0));
const shrinkToken = (amount: string | number, precision: number) =>
  String(Number(amount) / Math.pow(10, precision));

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

const sortNetworkToken = (tokenCount: [Token, number][]) => {
  return (a: Token, b: Token) => {
    const aCount = tokenCount.find(
      ([token]) => token.contract == a.contract
    )![1];
    const bCount = tokenCount.find(
      ([token]) => token.contract == b.contract
    )![1];
    return bCount - aCount;
  };
};

interface RegisteredContracts {
  BancorNetwork: string;
  BancorConverterRegistry: string;
  BancorX: string;
  BancorConverterFactory: string;
}

const removeLeadingZeros = (hexString: string) => {
  const withoutOx = hexString.startsWith("0x") ? hexString.slice(2) : hexString;
  return "0x" + withoutOx.slice(withoutOx.split("").findIndex(x => x !== "0"));
};

const relaysWithTokenMeta = (relays: Relay[], tokenMeta: TokenMeta[]) => {
  const passedRelays = relays.filter(relay =>
    relay.reserves.every(reserve =>
      tokenMeta.some(meta => compareString(reserve.contract, meta.contract))
    )
  );
  const missedRelays = _.differenceWith(
    relays,
    passedRelays,
    compareRelayBySmartTokenAddress
  );
  console.warn(
    missedRelays
      .map(x => x.reserves)
      .flat(1)
      .filter(x => x.symbol !== "BNT" && x.symbol !== "USDB"),
    "are being ditched due to not being included in token meta. "
  );
  return passedRelays;
};

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
  image: string;
  contract: string;
  symbol: string;
  name: string;
}

const getTokenMeta = async () => {
  const res: AxiosResponse<TokenMeta[]> = await axios.get(
    tokenMetaDataEndpoint
  );
  return res.data;
};

const compareString = (stringOne: string, stringTwo: string) =>
  stringOne.toLowerCase() == stringTwo.toLowerCase();

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

@Module({ namespacedPath: "ethBancor/" })
export class EthBancorModule extends VuexModule
  implements TradingModule, LiquidityModule, CreatePoolModule {
  tokensList: any[] = [];
  bancorTokens: TokenPrice[] = [];
  relayFeed: RelayFeed[] = [];
  relaysList: Relay[] = [];
  tokenBalances: { id: string; balance: number }[] = [];
  tokenMeta: TokenMeta[] = [];
  bancorContractRegistry = "0x52Ae12ABe5D8BD778BD5397F99cA900624CfADD4";
  bancorNetworkPathFinder = "0x6F0cD8C4f6F06eAB664C7E3031909452b4B72861";
  contracts: RegisteredContracts = {
    BancorNetwork: "",
    BancorConverterRegistry: "",
    BancorX: "",
    BancorConverterFactory: ""
  };

  get newNetworkTokenChoices(): ModalChoice[] {
    const bntTokenMeta = this.tokenMeta.find(token => token.symbol == "BNT")!;
    const usdBTokenMeta = this.tokenMeta.find(token => token.symbol == "USDB")!;

    const bntBalance = this.tokenBalance(bntTokenMeta.contract);
    const usdBalance = this.tokenBalance(usdBTokenMeta.contract);
    return [
      {
        contract: bntTokenMeta.contract,
        symbol: bntTokenMeta.symbol,
        img: bntTokenMeta.image,
        balance: bntBalance && bntBalance.balance
      },
      {
        contract: usdBTokenMeta.contract,
        symbol: usdBTokenMeta.symbol,
        img: usdBTokenMeta.image,
        balance: usdBalance && usdBalance.balance
      }
    ];
  }

  get newPoolTokenChoices() {
    return (symbolName: string): ModalChoice[] => {
      return this.tokenMeta
        .map(meta => ({
          contract: meta.contract,
          symbol: meta.symbol,
          img: meta.image,
          balance:
            this.tokenBalance(meta.contract) &&
            this.tokenBalance(meta.contract)!.balance
        }))
        .filter(meta =>
          this.newNetworkTokenChoices.some(
            networkChoice => networkChoice.symbol !== meta.symbol
          )
        )
        .filter(tokenChoice => tokenChoice.symbol !== symbolName)
        .sort((a, b) => Number(b.balance) - Number(a.balance));
    };
  }

  get isAuthenticated() {
    return vxm.wallet.isAuthenticated;
  }

  @action async deploySmartTokenContract({
    smartTokenName,
    smartTokenSymbol,
    precision
  }: {
    smartTokenName: string;
    smartTokenSymbol: string;
    precision: number;
  }): Promise<string> {
    // @ts-ignore
    const contract = new web3.eth.Contract(ABISmartToken, null);
    contract.deploy({
      data: smartTokenByteCode,
      arguments: [smartTokenName, smartTokenSymbol, precision]
    });

    return this.resolveTxOnConfirmation({ tx: contract, gas: 1200000 });
  }

  @action async fetchNewConverterAddressFromHash(
    hash: string
  ): Promise<string> {
    const interval = 1000;
    const attempts = 10;

    for (var i = 0; i < attempts; i++) {
      const info = await web3.eth.getTransactionReceipt(hash);
      if (info) {
        return removeLeadingZeros(info.logs[0].topics[1]);
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

    for (var i = 0; i < attempts; i++) {
      const info = await web3.eth.getTransactionReceipt(hash);
      console.log(info, "was info");
      if (info) {
        return info.contractAddress!;
      }
      await wait(interval);
    }
    throw new Error("Failed to find new address in decent time");
  }

  @action async existingReserveAddress(
    reserveTokens: string[]
  ): Promise<string | false> {
    const registryContract = new web3.eth.Contract(
      ABIConverterRegistry,
      this.contracts.BancorConverterRegistry
    );
    const address = await registryContract.methods
      .getLiquidityPoolByReserveConfig(reserveTokens, [500000, 500000])
      .call();

    return address !== "0x0000000000000000000000000000000000000000" && address;
  }

  @action async deployConverter({
    smartTokenAddress,
    firstReserveTokenAddress
  }: {
    smartTokenAddress: string;
    firstReserveTokenAddress: string;
  }): Promise<string> {
    const contract = new web3.eth.Contract(
      FactoryAbi,
      this.contracts.BancorConverterFactory
    );
    return this.resolveTxOnConfirmation({
      tx: contract.methods.createConverter(
        smartTokenAddress,
        bancorRegistry,
        50000,
        firstReserveTokenAddress,
        500000
      )
    });
  }

  @action async createPool(poolParams: CreatePoolParams) {
    if (poolParams.reserves.length !== 2)
      throw new Error("Was expecting two reserves in new pool");

    const networkIndex = poolParams.reserves.findIndex(
      ([symbol]) => symbol == "BNT" || symbol == "USDB"
    )!;
    if (networkIndex == undefined)
      throw new Error(
        "Client error: Failed to figure out what should be the network token"
      );
    const tokenIndex = networkIndex == 0 ? 1 : 0;
    const [networkSymbol, networkAmount] = poolParams.reserves[networkIndex];
    const [tokenSymbol, tokenAmount] = poolParams.reserves[tokenIndex];

    const smartTokenName = `${tokenSymbol} Smart Relay Token`;
    const smartTokenSymbol = tokenSymbol + networkSymbol;
    const precision = 18;

    const steps = [
      { name: "Smart Token", description: "Creating Smart Token Contract..." },
      {
        name: "Address",
        description: "Fetching new Smart Token Contract address..."
      },
      {
        name: "Converter",
        description: "Deploying new Pool and minting initial Smart Tokens..."
      },
      {
        name: "ConverterAddress",
        description: "Fetching new Converter Address.."
      },
      {
        name: "Claim",
        description: "Claiming new converter..."
      },
      {
        name: "AddReserve",
        description: "Setting reserve..."
      },
      {
        name: "SetFee",
        description: "Setting Fee..."
      },
      {
        name: "SetBalances",
        description: "Adding Liquidity..."
      },
      {
        name: "OfferOwnership",
        description: "Passing Smart Token Contract ownership to your Pool.."
      },
      {
        name: "AcceptOwnership",
        description: "Pool accepting ownership of Smart Token Contract..."
      },
      {
        name: "AddPool",
        description: "Adding pool to Bancor Registry"
      },
      {
        name: "Finished",
        description: "Done!"
      }
    ];

    const networkTokenAddress = this.tokenMeta.find(
      token => token.symbol == networkSymbol
    )!.contract;
    const listedTokenAddress = this.tokenMeta.find(
      token => token.symbol == tokenSymbol
    )!.contract;

    poolParams.onUpdate(0, steps);
    const txHash = await this.deploySmartTokenContract({
      smartTokenSymbol,
      precision,
      smartTokenName
    });

    poolParams.onUpdate(1, steps);
    const smartTokenAddress = await this.fetchNewSmartContractAddressFromHash(
      txHash
    );

    poolParams.onUpdate(2, steps);
    const [converterRes] = await Promise.all([
      this.deployConverter({
        smartTokenAddress,
        firstReserveTokenAddress: networkTokenAddress
      }),
      this.issueInitialSupply({ smartTokenAddress })
    ]);

    poolParams.onUpdate(3, steps);
    const converterAddress = await this.fetchNewConverterAddressFromHash(
      converterRes
    );

    poolParams.onUpdate(4, steps);
    await this.claimOwnership(converterAddress);

    poolParams.onUpdate(5, steps);
    await this.addReserveToken({
      converterAddress,
      reserveTokenAddress: listedTokenAddress
    });

    poolParams.onUpdate(6, steps);
    if (poolParams.fee) {
      await this.setFee({
        converterAddress,
        decFee: poolParams.fee
      });
    }

    poolParams.onUpdate(7, steps);
    await this.sendTokens([
      {
        tokenContract: networkTokenAddress,
        toAddress: converterAddress,
        amount: networkAmount
      },
      {
        tokenContract: listedTokenAddress,
        toAddress: converterAddress,
        amount: tokenAmount
      }
    ]);

    poolParams.onUpdate(8, steps);
    await this.transferTokenContractOwnership([
      smartTokenAddress,
      converterAddress
    ]);

    poolParams.onUpdate(9, steps);
    await this.acceptTokenContractOwnership(converterAddress);

    poolParams.onUpdate(10, steps);
    await this.addPoolToRegistry(converterAddress);

    poolParams.onUpdate(11, steps);

    wait(5000).then(() => this.init());

    return txHash;
  }

  @action async addPoolToRegistry(converterAddress: string) {
    const registryContract = new web3.eth.Contract(
      ABIConverterRegistry,
      this.contracts.BancorConverterRegistry
    );
    return this.resolveTxOnConfirmation({
      tx: registryContract.methods.addConverter(converterAddress)
    });
  }

  @action async transferTokenContractOwnership([
    smartTokenAddress,
    converterAddress
  ]: string[]) {
    const tokenContract = new web3.eth.Contract(
      ABISmartToken,
      smartTokenAddress
    );
    return this.resolveTxOnConfirmation({
      tx: tokenContract.methods.transferOwnership(converterAddress)
    });
  }

  @action async acceptTokenContractOwnership(converterAddress: string) {
    const converterContract = new web3.eth.Contract(
      ABIConverter,
      converterAddress
    );
    return this.resolveTxOnConfirmation({
      tx: converterContract.methods.acceptTokenOwnership()
    });
  }

  @action async issueInitialSupply({
    smartTokenAddress
  }: {
    smartTokenAddress: string;
  }) {
    const tokenContract = new web3.eth.Contract(
      ABISmartToken,
      smartTokenAddress
    );

    return this.resolveTxOnConfirmation({
      tx: tokenContract.methods.issue(this.isAuthenticated, toWei("1000"))
    });
  }

  @action async sendTokens(
    tokens: { tokenContract: string; toAddress: string; amount: string }[]
  ) {
    return Promise.all(
      tokens.map(async token => {
        const tokenContract = new web3.eth.Contract(
          ABISmartToken,
          token.tokenContract
        );
        const decimals = await tokenContract.methods.decimals().call();

        return this.resolveTxOnConfirmation({
          tx: tokenContract.methods.transfer(
            token.toAddress,
            web3.utils.toHex(
              String(Number(token.amount) * Math.pow(10, decimals))
            )
          )
        });
      })
    );
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
        const tokenContract = new web3.eth.Contract(
          ABISmartToken,
          approval.tokenAddress
        );

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
    const converterContract = new web3.eth.Contract(
      ABIConverter,
      converterAddress
    );
    return this.resolveTxOnConfirmation({
      tx: converterContract.methods.acceptOwnership()
    });
  }

  @action async setFee({
    converterAddress,
    decFee
  }: {
    converterAddress: string;
    decFee: number;
  }) {
    const converterContract = new web3.eth.Contract(
      ABIConverter,
      converterAddress
    );

    const ppm = decFee * 1000000;
    return this.resolveTxOnConfirmation({
      tx: converterContract.methods.setConversionFee(ppm),
      resolveImmediately: true
    });
  }

  @action async resolveTxOnConfirmation({
    tx,
    gas,
    resolveImmediately = false,
    onHash
  }: {
    tx: any;
    gas?: number;
    resolveImmediately?: boolean;
    onHash?: (hash: string) => void;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      let txHash: string;
      tx.send({
        from: this.isAuthenticated,
        ...(gas && { gas })
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
    const converterContract = new web3.eth.Contract(
      ABIConverter,
      converterAddress
    );

    return this.resolveTxOnConfirmation({
      tx: converterContract.methods.addReserve(reserveTokenAddress, 500000)
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

  get failedTokens() {
    return this.relaysList
      .filter(
        relay =>
          !relay.reserves.every(reserve =>
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
      .map(relay => relay.reserves)
      .flat(1)
      .filter(
        (x, index, arr) => arr.findIndex(t => t.contract == x.contract) == index
      )
      .map(x => x.symbol);
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
      .map(relay =>
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
          if (name == "Bancor") {
            console.log(reserve.contract, "returned a balance of", balance);
          }
          if (balance && balance.balance) {
            console.log("is the balance for", name);
          }
          return {
            id: reserve.contract,
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
      .flat(1)
      .sort((a, b) => b.liqDepth - a.liqDepth)
      .reduce<ViewToken[]>((acc, item) => {
        const existingToken = acc.find(token =>
          compareString(token.id, item.id)
        );
        return existingToken
          ? acc.map(token =>
              compareString(token.id, item.id)
                ? { ...token, liqDepth: token.liqDepth + item.liqDepth }
                : token
            )
          : [...acc, item];
      }, []);
  }

  get tokenMetaObj() {
    return (contract: string) => {
      const token = this.tokenMeta.find(token =>
        compareString(contract, token.contract)
      );
      if (!token) {
        throw new Error(
          `Failed to find token meta for symbol with token contract of ${contract}`
        );
      }
      return token;
    };
  }

  get tokenBalance() {
    return (tokenId: string) =>
      this.tokenBalances.find(token => compareString(token.id, tokenId));
  }

  get token(): (arg0: string) => any {
    return (symbolName: string) => {
      const token = this.tokens.find(token => token.symbol == symbolName)!;
      if (!token) throw new Error(`Failed to find token ${symbolName}`);
      return token;
    };
  }

  // @ts-ignore
  get relay() {
    return (symbolName: string) => {
      const relay = this.relays.find(
        (relay: any) => relay.smartTokenSymbol == symbolName
      );
      if (!relay) throw new Error(`Failed to find relay ${symbolName}`);
      return relay;
    };
  }

  get tokenCount() {
    const tokens = this.relaysList.map(relay => relay.reserves).flat(1);

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
        const lowestReserve = relay.reserves
          .map((reserve): [Token, number] => [
            reserve,
            this.count(reserve.contract)!
          ])
          .sort((a, b) => a[1] - b[1])[0][0];

        const relayFeed = this.relayFeed.find(feed =>
          compareString(feed.smartTokenContract, relay.smartToken.contract)
        )!;

        return {
          id: relay.smartToken.contract,
          reserves: relay.reserves.map(reserve => {
            const meta = this.tokenMetaObj(reserve.contract);
            return {
              reserveId: relay.smartToken.contract + reserve.contract,
              logo: [meta.image],
              symbol: reserve.symbol,
              contract: reserve.contract,
              smartTokenSymbol: relay.smartToken.contract
            };
          }),
          smartTokenSymbol: relay.smartToken.symbol,
          fee: relay.fee / 100,
          liqDepth: relayFeed.liqDepth,
          owner: relay.owner,
          swap: "eth",
          symbol: lowestReserve.symbol
        } as ViewRelay;
      });
  }

  get networkTokenSort() {
    return (a: Token, b: Token) => {
      const aScore = this.count(a.contract)!;
      const bScore = this.count(b.contract)!;
      return bScore - aScore;
    };
  }

  @mutation setTokenMeta(tokenMeta: TokenMeta[]) {
    this.tokenMeta = tokenMeta;
  }

  @action async triggerTx(actions: any[]) {
    // @ts-ignore
    return this.$store.dispatch("ethWallet/tx", actions, { root: true });
  }

  @action async fetchRelayBalances(smartTokenAddress: string) {
    const { reserves, version, contract } = this.relaysList.find(relay =>
      compareString(relay.smartToken.contract, smartTokenAddress)
    )!;

    const converterContract = new web3.eth.Contract(ABIConverter, contract);

    const smartTokenContract = new web3.eth.Contract(
      ABISmartToken,
      smartTokenAddress
    );

    const [
      tokenReserveBalance,
      bntReserveBalance,
      totalSupply
    ] = await Promise.all([
      ...reserves.map(reserve =>
        fetchReserveBalance(converterContract, reserve.contract, version)
      ),
      smartTokenContract.methods.totalSupply().call()
    ]);
    return { tokenReserveBalance, bntReserveBalance, totalSupply };
  }

  @action async calculateOpposingDeposit(
    opposingDeposit: OpposingLiquidParams
  ): Promise<OpposingLiquid> {
    return;
    console.log("calculateOpposingDeposit called", opposingDeposit);
    const { smartTokenSymbol, tokenAmount, tokenSymbol } = opposingDeposit;
    const {
      tokenReserveBalance,
      bntReserveBalance,
      totalSupply
    } = await this.fetchRelayBalances(smartTokenSymbol);
    const tokenId = this.tokensList.find(token => token.code == tokenSymbol).id;
    const decimals = await this.getDecimals(tokenId);
    const tokenAmountWei = String(Number(tokenAmount) * Math.pow(10, decimals));
    const opposingAmount = calculateOppositeFundRequirement(
      tokenAmountWei,
      tokenReserveBalance,
      bntReserveBalance
    );
    const fundReward = calculateFundReward(
      tokenAmountWei,
      tokenReserveBalance,
      totalSupply
    );

    return {
      opposingAmount: fromWei(opposingAmount),
      smartTokenAmount: fundReward
    };
  }

  @action async getUserBalance(tokenContractAddress: string) {
    console.log("getUserBalance", tokenContractAddress);
    const balance = await vxm.ethWallet.getBalance({
      accountHolder: vxm.wallet.isAuthenticated,
      tokenContractAddress
    });
    this.updateBalance([tokenContractAddress, balance]);
    return balance;
  }

  // @ts-ignore
  @action async getUserBalances(symbolName: string) {
    console.log("getUserBalances", symbolName);
    if (!vxm.wallet.isAuthenticated)
      throw new Error("Cannot find users .isAuthenticated");
    const relay = this.relaysList.find(relay =>
      compareString(relay.smartToken.symbol, symbolName)
    )!;

    const [
      bntUserBalance,
      tokenUserBalance,
      smartTokenUserBalance
    ] = await Promise.all([
      ...relay.reserves.map(reserve => this.getUserBalance(reserve.contract)),
      this.getUserBalance(relay.smartToken.contract)
    ]);

    console.log({ bntUserBalance, tokenUserBalance, smartTokenUserBalance });

    const {
      totalSupply,
      bntReserveBalance,
      tokenReserveBalance
    } = await this.fetchRelayBalances(relay.smartToken.contract);

    const percent = new Decimal(smartTokenUserBalance).div(
      fromWei(totalSupply)
    );
    const token1SmartBalance = percent.times(tokenReserveBalance);
    const token2SmartBalance = percent.times(bntReserveBalance);
    const token1SmartInt = token1SmartBalance.toFixed(0);
    const token2SmartInt = token2SmartBalance.toFixed(0);
    return {
      token1MaxWithdraw: Number(fromWei(token1SmartInt)),
      token2MaxWithdraw: Number(fromWei(token2SmartInt)),
      token1Balance: bntUserBalance,
      token2Balance: tokenUserBalance,
      smartTokenBalance: smartTokenUserBalance
    };
  }

  @action async calculateOpposingWithdraw(
    opposingWithdraw: OpposingLiquidParams
  ): Promise<OpposingLiquid> {
    const { smartTokenSymbol, tokenAmount, tokenSymbol } = opposingWithdraw;
    const {
      tokenReserveBalance,
      bntReserveBalance,
      totalSupply
    } = await this.fetchRelayBalances(smartTokenSymbol);
    const tokenId = this.tokensList.find(token => token.code == tokenSymbol).id;
    const decimals = await this.getDecimals(tokenId);

    const token1Wei = String(Number(tokenAmount) * Math.pow(10, decimals));
    const token2Value = calculateOppositeLiquidateRequirement(
      token1Wei,
      tokenReserveBalance,
      bntReserveBalance
    );
    const liquidateCost = calculateLiquidateCost(
      token1Wei,
      tokenReserveBalance,
      totalSupply
    );

    const { smartTokenAddress } = this.relay(smartTokenSymbol)!;

    const smartUserBalance = await vxm.ethWallet.getBalance({
      accountHolder: vxm.wallet.isAuthenticated,
      tokenContractAddress: smartTokenAddress
    });

    const percentDifferenceBetweenSmartBalance = percentDifference(
      liquidateCost,
      String(Number(smartUserBalance) * Math.pow(10, 18))
    );
    let smartTokenAmount: string;
    if (percentDifferenceBetweenSmartBalance > 0.99) {
      const userSmartTokenBalance = toWei(String(smartUserBalance));
      smartTokenAmount = userSmartTokenBalance;
    } else {
      smartTokenAmount = liquidateCost;
    }
    return {
      opposingAmount: fromWei(token2Value),
      smartTokenAmount
    };
  }

  @action async removeLiquidity({
    fundAmount,
    smartTokenSymbol
  }: LiquidityParams) {
    const { converterAddress } = this.relay(smartTokenSymbol)!;

    const converterContract = new web3.eth.Contract(
      ABIConverter,
      converterAddress
    );

    const batch = new web3.BatchRequest();

    const liquidateData = converterContract.methods
      .liquidate(fundAmount)
      .encodeABI({ from: vxm.wallet.isAuthenticated });

    const liquidate = {
      from: vxm.wallet.isAuthenticated,
      to: converterAddress,
      value: "0x0",
      data: liquidateData,
      gas: toHex(950000)
    };

    batch.add(
      // @ts-ignore
      web3.eth.sendTransaction.request(liquidate, () => console.log("Pool"))
    );
    console.log(batch, "is batch");
    await batch.execute();
    return "Done";
  }

  @action async addLiquidity({
    fundAmount,
    smartTokenSymbol,
    token1Amount,
    token1Symbol,
    token2Amount,
    token2Symbol
  }: LiquidityParams) {
    const { converterAddress, smartTokenAddress, tokenAddress } = this.relay(
      smartTokenSymbol
    )!;

    const converterContract = new web3.eth.Contract(
      ABIConverter,
      converterAddress
    );

    const smartTokenContract = new web3.eth.Contract(
      ABISmartToken,
      smartTokenAddress
    );

    const tokenContract = new web3.eth.Contract(ABISmartToken, tokenAddress);

    const bancorTokenContract = new web3.eth.Contract(
      ABISmartToken,
      BntTokenContract
    );

    const bancorApproved = await bancorTokenContract.methods
      .allowance(vxm.wallet.isAuthenticated, converterAddress)
      .call();

    const tokenApproved = await tokenContract.methods
      .allowance(vxm.wallet.isAuthenticated, converterAddress)
      .call();

    let transactions: any = [
      {
        to: converterAddress,
        data: converterContract.methods.fund(fundAmount),
        gas: toHex(950000)
      }
    ];

    if (Number(fromWei(bancorApproved)) < Number(token2Amount)) {
      transactions = [
        fromWei(bancorApproved) !== "0" && {
          to: BntTokenContract,
          data: bancorTokenContract.methods.approve(
            converterAddress,
            toWei("0")
          ),
          gas: toHex(84999)
        },
        {
          to: BntTokenContract,
          data: bancorTokenContract.methods.approve(
            converterAddress,
            toWei(token2Amount!)
          ),
          gas: toHex(85000)
        },
        ...transactions
      ];
    }

    if (Number(fromWei(tokenApproved)) < Number(token1Amount!)) {
      transactions = [
        fromWei(tokenApproved) !== "0" && {
          to: tokenAddress,
          data: tokenContract.methods.approve(converterAddress, toWei("0")),
          gas: toHex(84999)
        },
        {
          to: tokenAddress,
          data: tokenContract.methods.approve(
            converterAddress,
            toWei(token1Amount!)
          ),
          gas: toHex(85000)
        },
        ...transactions
      ];
    }

    if (tokenAddress == "0xc0829421C1d260BD3cB3E0F06cfE2D52db2cE315") {
      transactions = [
        {
          to: "0xc0829421C1d260BD3cB3E0F06cfE2D52db2cE315",
          value: web3.utils.toHex(toWei(token1Amount!))
        },
        ...transactions
      ];
    }

    const fillOuter = (outer: any) => ({
      from: outer.from || vxm.wallet.isAuthenticated,
      to: outer.to,
      value: outer.value || "0x0",
      ...(outer.data && { data: outer.data }),
      ...(outer.gas && { gas: outer.gas }),
      ...(outer.gasPrice && { gasPrice: outer.gasPrice })
    });

    const batch = new web3.BatchRequest();

    transactions
      .filter(Boolean)
      .map((tx: any) => ({
        ...tx,
        ...(tx.data && {
          data: tx.data.encodeABI({ from: vxm.wallet.isAuthenticated })
        })
      }))
      .forEach((transaction: any) => {
        batch.add(
          // @ts-ignore
          web3.eth.sendTransaction.request(fillOuter(transaction))
        );
      });

    console.log(batch, "is batch");
    await batch.execute();
    return "Done";
  }

  @action async fetchContractAddresses() {
    const hardCodedBytes: RegisteredContracts = {
      BancorNetwork: "0x42616e636f724e6574776f726b",
      BancorConverterRegistry:
        "0x42616e636f72436f6e7665727465725265676973747279",
      BancorX:
        "0x42616e636f725800000000000000000000000000000000000000000000000000",
      BancorConverterFactory:
        "0x42616e636f72436f6e766572746572466163746f727900000000000000000000"
    };

    const registryContract = new web3.eth.Contract(
      ABIContractRegistry,
      this.bancorContractRegistry
    );

    const bytesKeys = Object.keys(hardCodedBytes);
    const bytesList = Object.values(hardCodedBytes);

    const contractAddresses = await Promise.all(
      bytesList.map(bytes => registryContract.methods.addressOf(bytes).call())
    );

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
  }

  @mutation setContractAddresses(contracts: RegisteredContracts) {
    this.contracts = contracts;
  }

  @action async choppedRelaysToAddresses({
    path,
    source,
    destination
  }: {
    path: ChoppedRelay[];
    source: string;
    destination: string;
  }) {
    console.log(path, destination, "was shit");
    const rebuilt = _.uniqWith(
      path,
      (one, two) => one.contract == two.contract
    );
    console.log(rebuilt, "was rebuilt");

    const tokensList = path.map(x => x.reserves).flat(1);
    const symbolPath = rebuilt
      .map(x => x.reserves.map(y => y.symbol))
      .flat(1)
      .concat(destination);

    console.log(symbolPath, tokensList, "mcree");
    const final = symbolPath.map(
      symbol => tokensList.find(x => x.symbol == symbol)!.contract
    );

    return final;
  }

  @action async possibleRelayFeedsFromBancorApi(
    relays: Relay[]
  ): Promise<RelayFeed[]> {
    const tokens = await ethBancorApi.getTokens();
    const ethUsdPrice = tokens.find(token => token.code == "ETH")!.price;

    return relays
      .filter(relay =>
        bancorApiSmartTokens.some(catalog =>
          compareString(relay.smartToken.contract, catalog.smartTokenAddress)
        )
      )
      .map(relay => {
        return relay.reserves.map(reserve => {
          const foundDictionaries = bancorApiSmartTokens.filter(catalog =>
            compareString(catalog.smartTokenAddress, relay.smartToken.contract)
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
        });
      })
      .flat(1);
  }

  @action async fetchAndUpdateRelayFeeds(relays: Relay[]) {
    const bancorApiFeeds = await this.possibleRelayFeedsFromBancorApi(relays);
    const remainingRelays = _.differenceWith(
      relays,
      bancorApiFeeds,
      (relay, feed) =>
        compareString(relay.smartToken.contract, feed.smartTokenContract)
    );
    const feeds = await this.buildRelayFeeds(remainingRelays);
    const passedFeeds = feeds.filter(Boolean);
    const failedFeeds = feeds.filter(x => !x);
    console.log(failedFeeds.length, "relays failed to fetch balances for");
    this.updateRelayFeeds([...bancorApiFeeds, ...passedFeeds]);
  }

  @mutation updateRelayFeeds(feeds: RelayFeed[]) {
    const allFeeds = [...feeds, ...this.relayFeed];
    this.relayFeed = _.uniqWith(
      allFeeds,
      (a, b) =>
        compareString(a.smartTokenContract, b.smartTokenContract) &&
        compareString(a.tokenId, b.tokenId)
    );
  }

  @action async fetchReturn({
    reserves,
    from,
    wei,
    converterAddress
  }: {
    converterAddress: string;
    reserves: Token[];
    from: string;
    wei: string;
  }): Promise<string | null> {
    console.log({ converterAddress });
    const converterContract = new web3.eth.Contract(
      ABIConverter,
      converterAddress
    );

    const fromAddress = reserves.find(token => token.symbol == from)!.contract;
    const toAddress = reserves.find(token => token.symbol !== from)!.contract;

    try {
      const res = await converterContract.methods
        .getReturn(fromAddress, toAddress, wei)
        .call();
      return res["0"];
    } catch (e) {
      console.error(
        `Failed fetching price at relay: ${converterAddress}, buying with ${from}, wei: ${wei}, from: ${fromAddress}, to: ${toAddress}`
      );
      return null;
    }
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
    console.log({ converterAddress });
    const converterContract = new web3.eth.Contract(
      ABIConverter,
      converterAddress
    );

    const fromAddress = reserves.find(token => token.symbol !== to)!.contract;
    const toAddress = reserves.find(token => token.symbol == to)!.contract;

    try {
      const res = await converterContract.methods
        .getSaleReturn(toAddress, wei)
        .call();
      return res["0"];
    } catch (e) {
      console.error(
        `Failed fetching price at relay: ${converterAddress}, wei: ${wei}, from: ${fromAddress}, to: ${toAddress}`
      );
      return null;
    }
  }

  @action async buildRelayFeeds(relays: Relay[]): Promise<RelayFeed[]> {
    const tokens = await bancorApi.getTokens();
    const usdPriceOfBnt = Number(
      tokens.find(token => token.code == "BNT")!.price
    );
    const relayFeeds = await Promise.all(
      relays.map(
        async (relay): Promise<RelayFeed[]> => {
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
          ] = reservesBalances.sort(a =>
            a[0].symbol == "BNT" ? -2 : a[0].symbol == "USDB" ? -1 : 1
          );

          const networkReserveIsUsd = networkReserve.symbol == "USDB";
          const dec = networkReserveAmount / tokenAmount;

          const liqDepth =
            (networkReserveIsUsd
              ? networkReserveAmount
              : networkReserveAmount * usdPriceOfBnt) * 2;

          return [
            {
              tokenId: tokenReserve.contract,
              smartTokenContract: relay.smartToken.contract,
              costByNetworkUsd: networkReserveIsUsd ? dec : dec * usdPriceOfBnt,
              liqDepth
            },
            {
              tokenId: networkReserve.contract,
              smartTokenContract: relay.smartToken.contract,
              liqDepth,
              costByNetworkUsd: 55
            }
          ];
        }
      )
    );
    return relayFeeds.flat(1);
  }

  @action async init() {
    const [hardCodedRelays, tokenMeta, contractAddresses] = await Promise.all([
      getEthRelays(),
      getTokenMeta(),
      this.fetchContractAddresses()
    ]);

    this.setTokenMeta(tokenMeta);

    const registeredSmartTokenAddresses = await this.fetchSmartTokenAddresses(
      contractAddresses.BancorConverterRegistry
    );

    const hardCodedRelaysInRegistry = relaysWithTokenMeta(
      hardCodedRelays.filter(relay =>
        registeredSmartTokenAddresses.includes(relay.smartToken.contract)
      ),
      tokenMeta
    );

    this.updateRelays(hardCodedRelaysInRegistry);
    await this.fetchAndUpdateRelayFeeds(hardCodedRelaysInRegistry);

    const hardCodedSmartTokenAddresses = hardCodedRelaysInRegistry.map(
      relay => relay.smartToken.contract
    );

    const nonHardCodedSmartTokenAddresses = registeredSmartTokenAddresses.filter(
      smartTokenAddress =>
        !hardCodedSmartTokenAddresses.includes(smartTokenAddress)
    );

    const nonHardCodedRelays = await this.buildRelaysFromSmartTokenAddresses(
      nonHardCodedSmartTokenAddresses
    );

    this.updateRelays(relaysWithTokenMeta(nonHardCodedRelays, tokenMeta));
    await this.fetchAndUpdateRelayFeeds(
      relaysWithTokenMeta(nonHardCodedRelays, tokenMeta)
    );
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

    const builtRelays = await Promise.all(
      combined.map(([converterAddress, smartTokenAddress]) =>
        this.buildRelay({ smartTokenAddress, converterAddress }).catch(
          () => false
        )
      )
    );
    return builtRelays.filter(Boolean) as Relay[];
  }

  @action async buildRelay(relayAddresses: {
    smartTokenAddress: string;
    converterAddress: string;
  }): Promise<Relay> {
    const converterContract = new web3.eth.Contract(
      ABIConverter,
      relayAddresses.converterAddress
    );

    const [
      owner,
      version,
      connectorCount,
      reserve1Address,
      reserve2Address,
      fee
    ] = await Promise.all([
      converterContract.methods.owner().call() as string,
      converterContract.methods.version().call() as string,
      converterContract.methods.connectorTokenCount().call() as string,
      converterContract.methods.connectorTokens(0).call() as string,
      converterContract.methods.connectorTokens(1).call() as string,
      converterContract.methods.conversionFee().call() as string
    ]);

    if (connectorCount !== "2")
      throw new Error(
        "Converter not valid, does not have 2 tokens in converter"
      );

    const tokenAddresses = [
      reserve1Address,
      reserve2Address,
      relayAddresses.smartTokenAddress
    ];

    const [reserve1, reserve2, smartToken] = await Promise.all(
      tokenAddresses.map(address => this.buildTokenByTokenAddress(address))
    );

    return {
      fee: Number(fee) / 10000,
      owner,
      network: "ETH",
      version,
      contract: relayAddresses.converterAddress,
      smartToken,
      reserves: [reserve1, reserve2],
      isMultiContract: false
    };
  }

  @action async buildTokenByTokenAddress(address: string): Promise<Token> {
    const tokenContract = new web3.eth.Contract(ABISmartToken, address);

    const existingTokens = this.relaysList
      .map(relay => [...relay.reserves, relay.smartToken])
      .flat(1);

    const existingToken = existingTokens.find(token =>
      compareString(token.contract, address)
    );

    if (existingToken) return existingToken;

    const [symbol, decimals] = await Promise.all([
      tokenContract.methods.symbol().call() as string,
      tokenContract.methods.decimals().call() as string
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
      .map(relay => relay.reserves)
      .flat(1);
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
    const reserveInRelay = relay.reserves.find(
      reserve => reserve.contract == reserveContract
    );
    if (!reserveInRelay) throw new Error("Reserve is not in this relay!");
    const converterContract = new web3.eth.Contract(
      ABIConverter,
      relay.contract
    );

    const reserveBalance = await fetchReserveBalance(
      converterContract,
      reserveContract,
      relay.version
    );
    const numberReserveBalance =
      Number(reserveBalance) / Math.pow(10, reserveInRelay.decimals);
    return [reserveInRelay, numberReserveBalance];
  }

  @action async focusSymbol(symbolName: string) {
    if (!this.isAuthenticated) return;
    const tokens = this.tokens.filter(token =>
      compareString(token.symbol, symbolName)
    );
    const balances = await Promise.all(
      tokens.map(async token => {
        const balance = await vxm.ethWallet.getBalance({
          accountHolder: this.isAuthenticated,
          tokenContractAddress: token.id!
        });
        return {
          ...token,
          balance
        };
      })
    );
    balances.forEach(balance =>
      this.updateBalance([balance.id!, balance.balance])
    );
  }

  @mutation updateBalance([id, balance]: [string, number]) {
    const newBalances = this.tokenBalances.filter(balance => balance.id !== id);
    newBalances.push({ id, balance });
    this.tokenBalances = newBalances;
  }

  @mutation resetBalances() {
    this.tokensList = this.tokensList.map(token => ({
      ...token,
      balance: undefined
    }));
  }

  @action async refreshBalances(symbols?: BaseToken[]) {
    this.resetBalances();
    if (symbols) {
      symbols.forEach(symbol => this.focusSymbol(symbol.symbol));
    }
  }

  @action async convert({
    fromSymbol,
    toSymbol,
    fromAmount,
    toAmount,
    onUpdate
  }: ProposedConvertTransaction) {
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

    const fromToken = this.tokens.find(x => x.symbol == fromSymbol)!;
    const toToken = this.tokens.find(x => x.symbol == toSymbol)!;

    const [fromTokenContract, toTokenContract] = [fromToken, toToken].map(
      token => token.id!
    );

    const fromTokenDecimals = await this.getDecimalsByTokenAddress(
      fromTokenContract
    );
    const toTokenDecimals = await this.getDecimalsByTokenAddress(
      toTokenContract
    );

    const { dryRelays } = createPath(
      fromSymbol,
      toSymbol,
      this.relaysList.map(
        (relay): DryRelay => ({
          contract: relay.contract,
          reserves: relay.reserves.map(
            (reserve): TokenSymbol => ({
              contract: reserve.contract,
              symbol: reserve.symbol
            })
          ),
          smartToken: relay.smartToken
        })
      )
    );

    const path = generateEthPath(fromSymbol, dryRelays);
    onUpdate!(1, steps);

    await this.triggerApprovalIfRequired({
      owner: this.isAuthenticated,
      amount: expandToken(fromAmount, fromTokenDecimals),
      spender: this.contracts.BancorNetwork,
      tokenAddress: fromTokenContract
    });

    onUpdate!(2, steps);

    const networkContract = new web3.eth.Contract(
      ABINetworkContract,
      this.contracts.BancorNetwork
    );

    const confirmedHash = await this.resolveTxOnConfirmation({
      tx: networkContract.methods.claimAndConvert2(
        path,
        expandToken(fromAmount, fromTokenDecimals),
        expandToken(toAmount * 0.95, toTokenDecimals),
        "0x0000000000000000000000000000000000000000",
        0
      ),
      gas: 550000,
      onHash: () => onUpdate!(3, steps)
    });
    onUpdate!(4, steps);
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

    await this.approveTokenWithdrawals([
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
    const tokenContract = new web3.eth.Contract(ABISmartToken, tokenAddress);

    const approvedFromTokenBalance = await tokenContract.methods
      .allowance(owner, spender)
      .call();
    return approvedFromTokenBalance;
  }

  @action async getPathByContract({
    fromTokenContract,
    toTokenContract
  }: {
    fromTokenContract: string;
    toTokenContract: string;
  }): Promise<string[]> {
    const contract = new web3.eth.Contract(
      ABINetworkPathFinder,
      this.bancorNetworkPathFinder
    );

    const res = await contract.methods
      .generatePath(fromTokenContract, toTokenContract)
      .call();
    return res;
  }

  @action async getReturnByPath({
    path,
    amount
  }: {
    path: string[];
    amount: string;
  }): Promise<string> {
    const contract = new web3.eth.Contract(
      ABINetworkContract,
      this.contracts.BancorNetwork
    );

    const res = await contract.methods.getReturnByPath(path, amount).call();
    return res["0"];
  }

  @action async getDecimalsByTokenAddress(tokenAddress: string) {
    const reserve = this.relaysList
      .map(relay => relay.reserves)
      .flat(1)
      .find(reserve => compareString(reserve.contract, tokenAddress));
    if (!reserve)
      throw new Error(
        `Failed to find token address ${tokenAddress} in list of reserves.`
      );
    return reserve.decimals;
  }

  @action async getReturn({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction) {
    const fromToken = this.tokens.find(x => x.symbol == fromSymbol)!;
    const toToken = this.tokens.find(x => x.symbol == toSymbol)!;

    const [fromTokenContract, toTokenContract] = [fromToken, toToken].map(
      token => token.id!
    );

    const fromTokenDecimals = await this.getDecimalsByTokenAddress(
      fromTokenContract
    );
    const toTokenDecimals = await this.getDecimalsByTokenAddress(
      toTokenContract
    );

    const { dryRelays } = createPath(
      fromSymbol,
      toSymbol,
      this.relaysList.map(
        (x): DryRelay => ({
          contract: x.contract,
          reserves: x.reserves.map(
            (reserve): TokenSymbol => ({
              contract: reserve.contract,
              symbol: reserve.symbol
            })
          ),
          smartToken: x.smartToken
        })
      )
    );

    const path = generateEthPath(fromSymbol, dryRelays);

    const wei = await this.getReturnByPath({
      path,
      amount: expandToken(amount, fromTokenDecimals)
    });

    return {
      amount: shrinkToken(wei, toTokenDecimals)
    };
  }

  @action async getCost({ fromSymbol, toSymbol, amount }: ProposedTransaction) {
    const fromToken = this.tokens.find(x => x.symbol == fromSymbol)!;
    const toToken = this.tokens.find(x => x.symbol == toSymbol)!;

    const [fromTokenContract, toTokenContract] = [fromToken, toToken].map(
      token => token.id!
    );

    const fromTokenDecimals = await this.getDecimalsByTokenAddress(
      fromTokenContract
    );
    const toTokenDecimals = await this.getDecimalsByTokenAddress(
      toTokenContract
    );

    const { dryRelays } = createPath(
      fromSymbol,
      toSymbol,
      this.relaysList.map(
        (x): DryRelay => ({
          contract: x.contract,
          reserves: x.reserves.map(
            (reserve): TokenSymbol => ({
              contract: reserve.contract,
              symbol: reserve.symbol
            })
          ),
          smartToken: x.smartToken
        })
      )
    );

    const smartTokenAddresses = dryRelays.map(
      relay => relay.smartToken.contract
    );
    const allCoveredUnderBancorApi = smartTokenAddresses.every(address =>
      bancorApiSmartTokens.some(dic =>
        compareString(address, dic.smartTokenAddress)
      )
    );
    if (!allCoveredUnderBancorApi)
      throw new Error("Fetching the cost of this token is not yet supported.");

    const [fromTokenTicker, toTokenTicker] = await Promise.all([
      ethBancorApi.getToken(fromSymbol),
      ethBancorApi.getToken(toSymbol)
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

  @mutation updateEthToken(token: any) {
    this.tokensList = this.tokensList.map((existingToken: any) =>
      token.id == existingToken.id ? token : existingToken
    );
  }
}

export const ethBancor = EthBancorModule.ExtractVuexModule(EthBancorModule);
