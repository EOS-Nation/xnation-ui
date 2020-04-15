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
  ModalChoice
} from "@/types/bancor";
import { ethBancorApi } from "@/api/bancor";
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
  ABIConverterRegistry
} from "@/api/ethConfig";
import { toWei, toHex, fromWei } from "web3-utils";
import Decimal from "decimal.js";
import axios, { AxiosResponse } from "axios";

import { vxm } from "@/store";
import wait from "waait";
import _ from "lodash";

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

@Module({ namespacedPath: "ethBancor/" })
export class EthBancorModule extends VuexModule
  implements TradingModule, LiquidityModule, CreatePoolModule {
  tokensList: any[] = [];
  usdPrice: number = 0;
  relaysList: Relay[] = [];
  tokenBalances: { symbol: string; balance: number }[] = [];
  tokenMeta: TokenMeta[] = [];
  bancorContractRegistry = "0x52Ae12ABe5D8BD778BD5397F99cA900624CfADD4";
  contracts: RegisteredContracts = {
    BancorNetwork: "",
    BancorConverterRegistry: "",
    BancorX: "",
    BancorConverterFactory: ""
  };
  convertibleTokens: string[] = [];

  get newNetworkTokenChoices(): ModalChoice[] {
    const bntTokenMeta = this.tokenMeta.find(token => token.symbol == "BNT")!;
    const usdBTokenMeta = this.tokenMeta.find(token => token.symbol == "USDB")!;
    return [
      {
        contract: bntTokenMeta.contract,
        symbol: bntTokenMeta.symbol,
        img: bntTokenMeta.image,
        balance:
          (this.tokenBalances.find(balance => balance.symbol == "BNT") &&
            Number(
              this.tokenBalances.find(balance => balance.symbol == "BNT")!
                .balance
            )) ||
          0
      },
      {
        contract: usdBTokenMeta.contract,
        symbol: usdBTokenMeta.symbol,
        img: usdBTokenMeta.image,
        balance:
          (this.tokenBalances.find(balance => balance.symbol == "USDB") &&
            Number(
              this.tokenBalances.find(balance => balance.symbol == "USDB")!
                .balance
            )) ||
          0
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
            (this.tokenBalances.find(
              balance => balance.symbol == meta.symbol
            ) &&
              Number(
                this.tokenBalances.find(
                  balance => balance.symbol == meta.symbol
                )!.balance
              )) ||
            0
        }))
        .filter(
          meta =>
            !this.newNetworkTokenChoices.some(
              choice => choice.symbol == meta.symbol
            )
        )
        .filter(
          tokenChoice =>
            !this.relays.some(relay =>
              relay.reserves.every(
                reserve =>
                  reserve.symbol == tokenChoice.symbol ||
                  reserve.symbol == symbolName
              )
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
      // @ts-ignore
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
      // @ts-ignore
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
    const listedTokenAddress = this.tokenMetaObj(tokenSymbol).contract;

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
    let lastTxHash = await this.addReserveToken({
      converterAddress,
      reserveTokenAddress: listedTokenAddress
    });

    poolParams.onUpdate(6, steps);
    if (poolParams.fee) {
      lastTxHash = await this.setFee({
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

    return txHash;
  }

  @action async addPoolToRegistry(converterAddress: string) {
    const registryContract = new web3.eth.Contract(
      // @ts-ignore
      ABIConverterRegistry,
      this.contracts.BancorConverterRegistry
    );
    if (
      this.contracts.BancorConverterRegistry !==
      "0xF84B332Db34C6A9b554D80cF9BC6124C1C74495D"
    )
      throw new Error("I thought it should be same");

    return this.resolveTxOnConfirmation({
      tx: registryContract.methods.addConverter(converterAddress)
    });
  }

  @action async transferTokenContractOwnership([
    smartTokenAddress,
    converterAddress
  ]: string[]) {
    const tokenContract = new web3.eth.Contract(
      // @ts-ignore
      ABISmartToken,
      smartTokenAddress
    );
    return this.resolveTxOnConfirmation({
      tx: tokenContract.methods.transferOwnership(converterAddress)
    });
  }

  @action async acceptTokenContractOwnership(converterAddress: string) {
    const converterContract = new web3.eth.Contract(
      // @ts-ignore
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
      // @ts-ignore
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
          // @ts-ignore
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
          // @ts-ignore
          ABISmartToken,
          approval.tokenAddress
        );

        return this.resolveTxOnConfirmation({
          tx: tokenContract.methods.approve(
            approval.approvedAddress,
            toWei(approval.amount)
          )
        });
      })
    );
  }

  @action async claimOwnership(converterAddress: string) {
    const converterContract = new web3.eth.Contract(
      // @ts-ignore
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
      // @ts-ignore
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
    resolveImmediately = false
  }: {
    tx: any;
    gas?: number;
    resolveImmediately?: boolean;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      let txHash: string;
      tx.send({
        from: this.isAuthenticated,
        ...(gas && { gas })
      })
        .on("transactionHash", (hash: string) => {
          txHash = hash;
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
      // @ts-ignore
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

  get tokens(): any {
    const ethToken = this.tokensList.find((token: any) => token.code == "ETH")!;
    if (!ethToken) return [];
    // @ts-ignore
    return this.tokensList.map((token: any) => ({
      symbol: token.code,
      name: token.name,
      price: token.price,
      liqDepth: token.liquidityDepth * Number(ethToken.price) * 2,
      logo: token.primaryCommunityImageName,
      change24h: token.change24h,
      volume24h: token.volume24h.USD,
      tokenAddress: token.tokenAddress || "",
      balance: token.balance || 0
    }));
  }

  get tokenMetaObj() {
    return (symbolName: string) => {
      const token = this.tokenMeta.find(token => token.symbol == symbolName);
      if (!token) {
        throw new Error(`Failed to find token meta for symbol ${symbolName}`);
      }
      return token;
    };
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
          this.tokenBalances.find(balance => balance.symbol == symbolName) &&
          this.tokenBalances.find(balance => balance.symbol == symbolName)!
            .balance
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

  // @ts-ignore
  get relays() {
    const relays = this.relaysList
      .filter(relay =>
        relay.reserves.every(reserve =>
          this.tokenMeta.some(tokenMeta => tokenMeta.symbol == reserve.symbol)
        )
      )
      .map(relay => {
        const reserveToken = getPoolReserveToken(relay);
        const reserveTokenMeta = this.token(reserveToken.symbol);
        const networkTokenIsBnt = relay.reserves.some(
          reserve =>
            reserve.contract == "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c"
        );
        return {
          reserves: relay.reserves
            .map(reserve => ({
              symbol: reserve.symbol,
              contract: reserve.contract,
              logo: [
                this.tokenMetaObj(reserve.symbol) &&
                  this.tokenMetaObj(reserve.symbol).image,
                `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${reserveToken.contract}/logo.png`,
                "https://via.placeholder.com/50"
              ].filter(Boolean)
            }))
            .sort(reserve => (reserve.symbol == "USDB" ? -1 : 1))
            .sort(reserve => (reserve.symbol == "BNT" ? -1 : 1)),
          owner: relay.owner,
          swap: "eth",
          fee: relay.fee / 100,
          decimals: reserveToken.decimals,
          symbol: reserveToken.symbol,
          smartTokenSymbol: relay.smartToken.symbol,
          converterAddress: relay.contract,
          smartTokenAddress: relay.smartToken.contract,
          tokenAddress: getPoolReserveToken(relay).contract,
          version: relay.version,
          liqDepth:
            (relay.liqDepth ||
              (networkTokenIsBnt &&
                reserveTokenMeta &&
                reserveTokenMeta.liqDepth)) * 2
        };
      });
    // .filter(relay => relay.liqDepth);

    const duplicateSmartTokenSymbols = relays
      .map(relay => relay.smartTokenSymbol)
      .filter(
        (smartTokenSymbol, index, array) =>
          array.indexOf(smartTokenSymbol) !== index
      );

    return relays
      .filter(relay =>
        duplicateSmartTokenSymbols.every(dup => dup !== relay.smartTokenSymbol)
      )
      .sort((a, b) => b.liqDepth - a.liqDepth)
      .filter(relay => {
        const [first, second] = relay.reserves;
        return first.symbol !== second.symbol;
      });
  }

  @action async fetchUsdPrice() {
    console.time("BancorApiRequest");
    const tokens = await ethBancorApi.getTokens();
    const usdPriceOfBnt = tokens.find(token => token.code == "BNT")!.price;
    console.log(usdPriceOfBnt, "is usd price of BNT");
    console.timeEnd("BancorApiRequest");

    this.setUsdPrice(Number(usdPriceOfBnt));
  }

  @mutation setUsdPrice(price: number) {
    this.usdPrice = price;
  }

  @mutation setTokenMeta(tokenMeta: TokenMeta[]) {
    this.tokenMeta = tokenMeta;
  }

  @action async triggerTx(actions: any[]) {
    // @ts-ignore
    return this.$store.dispatch("ethWallet/tx", actions, { root: true });
  }

  @action async fetchRelayBalances(smartTokenSymbol: string) {
    const {
      converterAddress,
      tokenAddress,
      smartTokenAddress,
      version
    } = this.relay(smartTokenSymbol)!;

    const converterContract = new web3.eth.Contract(
      // @ts-ignore
      ABIConverter,
      converterAddress
    );

    const smartTokenContract = new web3.eth.Contract(
      // @ts-ignore
      ABISmartToken,
      smartTokenAddress
    );

    const [
      tokenReserveBalance,
      bntReserveBalance,
      totalSupply
    ] = await Promise.all([
      fetchReserveBalance(converterContract, tokenAddress, version),
      fetchReserveBalance(converterContract, BntTokenContract, version),
      smartTokenContract.methods.totalSupply().call()
    ]);
    return { tokenReserveBalance, bntReserveBalance, totalSupply };
  }

  @action async calculateOpposingDeposit(
    opposingDeposit: OpposingLiquidParams
  ): Promise<OpposingLiquid> {
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
    return vxm.ethWallet.getBalance({
      accountHolder: vxm.wallet.isAuthenticated,
      tokenContractAddress
    });
  }

  // @ts-ignore
  @action async getUserBalances(symbolName: string) {
    if (!vxm.wallet.isAuthenticated)
      throw new Error("Cannot find users .isAuthenticated");
    const { smartTokenAddress, tokenAddress } = this.relay(symbolName)!;

    const [
      bntUserBalance,
      tokenUserBalance,
      smartTokenUserBalance
    ] = await Promise.all([
      this.getUserBalance(BntTokenContract),
      this.getUserBalance(tokenAddress),
      this.getUserBalance(smartTokenAddress)
    ]);

    const {
      totalSupply,
      bntReserveBalance,
      tokenReserveBalance
    } = await this.fetchRelayBalances(symbolName);

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
      // @ts-ignore
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
      // @ts-ignore
      ABIConverter,
      converterAddress
    );

    const smartTokenContract = new web3.eth.Contract(
      // @ts-ignore
      ABISmartToken,
      smartTokenAddress
    );

    const tokenContract = new web3.eth.Contract(
      // @ts-ignore
      ABISmartToken,
      tokenAddress
    );

    const bancorTokenContract = new web3.eth.Contract(
      // @ts-ignore
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
      // @ts-ignore
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

  @action async init() {
    const [tokens, relays, tokenMeta, contractAddresses] = await Promise.all([
      ethBancorApi.getTokens(),
      getEthRelays(),
      getTokenMeta(),
      this.fetchContractAddresses(),
      this.fetchUsdPrice()
    ]);

    this.setTokenMeta(tokenMeta);
    const tokensWithAddresses = tokens.map(token => ({
      ...token,
      ...(relays.find(relay =>
        relay.reserves.find(reserve => reserve.symbol == token.code)
      ) && {
        tokenAddress: relays
          .find(relay =>
            relay.reserves.find(reserve => reserve.symbol == token.code)
          )!
          .reserves.find(reserve => reserve.symbol == token.code)!.contract
      })
    }));

    // Tokens include the liquidity depth of their relay from the API
    // API does not include all relays
    // Relays are currently hard coded,
    // need to expand on hard coded relays and add smartToken registered ones
    // 1. fetch smart tokens
    // 2. create list of all smart tokens not tracked
    // 3. build Relay[] list, and add onto relaysNotTrackedOnApi
    const smartTokenAddresses = await this.fetchSmartTokenAddresses(
      contractAddresses.BancorConverterRegistry
    );

    this.setRelaysList(
      relays.filter(relay =>
        smartTokenAddresses.includes(relay.smartToken.contract)
      )
    );
    const alreadyTrackedSmartTokenAddresses = relays.map(
      relay => relay.smartToken.contract
    );
    const smartTokenAddressesNotTracked = smartTokenAddresses.filter(
      smartTokenAddress =>
        !alreadyTrackedSmartTokenAddresses.includes(smartTokenAddress)
    );

    console.log({
      smartTokenAddresses,
      alreadyTrackedSmartTokenAddresses,
      smartTokenAddressesNotTracked
    });

    this.appendRelaysWithSmartTokenAddresses(smartTokenAddressesNotTracked);

    const relaysNotTrackedOnApi = relays.filter(
      relay =>
        !tokens.find(token => token.code == getPoolReserveToken(relay).symbol)
    );

    this.fetchLiquidityDepths(relaysNotTrackedOnApi);

    this.setTokensList(tokensWithAddresses);
  }

  @action async appendRelaysWithSmartTokenAddresses(
    smartTokenAddresses: string[]
  ): Promise<void> {
    const relays = await this.buildRelaysFromSmartTokenAddresses(
      smartTokenAddresses
    );
    this.fetchLiquidityDepths(relays);
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
      // @ts-ignore
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
    const tokenContract = new web3.eth.Contract(
      // @ts-ignore
      ABISmartToken,
      address
    );

    const existingTokens = this.relaysList
      .map(relay => [...relay.reserves, relay.smartToken])
      .flat(1);
    const existingToken = existingTokens.find(
      token => token.contract == address
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
      // @ts-ignore
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
      // @ts-ignore
      ABIConverterRegistry,
      converterRegistryAddress
    );
    const smartTokenAddresses: string[] = await registryContract.methods
      .getSmartTokens()
      .call();
    return smartTokenAddresses;
  }

  @action async fetchConvertibleTokens(converterRegistryAddress: string) {
    const registryContract = new web3.eth.Contract(
      // @ts-ignore
      ABIConverterRegistry,
      converterRegistryAddress
    );
    const convertibleTokens: string[] = await registryContract.methods
      .getConvertibleTokens()
      .call();

    this.setConvertibleTokens(convertibleTokens);
  }

  @mutation setConvertibleTokens(convertibleTokens: string[]) {
    this.convertibleTokens = convertibleTokens;
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
          console.log("Failed fetching", relay.reserves.map(x => x.symbol), e);
          return relay;
        }
      })
    );

    const allRelays = [
      ...newRelays.filter(x => x.liqDepth),
      ...this.relaysList
    ].filter(
      (item, index, arr) =>
        arr.findIndex(x => x.smartToken.contract == item.smartToken.contract) ==
        index
    );
    this.setRelaysList(allRelays.filter(Boolean));
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
    const isAuthenticated = this.isAuthenticated;
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

  @mutation updateBalance([symbolName, balance]: [string, number]) {
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

  @action async refreshBalances(symbols?: BaseToken[]) {
    this.resetBalances();
    if (symbols) {
      symbols.forEach(symbol => this.focusSymbol(symbol.symbol));
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

    const ownerAddress = this.isAuthenticated;
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
