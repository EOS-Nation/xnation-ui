<template>
  <hero-wrapper>
    <two-token-hero
      :tokenOneSymbol="token1Symbol"
      :tokenOneAmount.sync="token1Amount"
      @update:tokenOneAmount="mutateOppositeTokenAmount(true)"
      @update:tokenTwoAmount="mutateOppositeTokenAmount(false)"
      :tokenOneBalance="displayedToken1Balance"
      :tokenOneImg="token1Img"
      :tokenTwoSymbol="token1Symbol"
      :tokenTwoAmount.sync="token2Amount"
      :tokenTwoBalance="displayedToken2Balance"
      :tokenTwoImg="token2Img"
      :label="buttonFlipped ? 'Pool Balance:' : 'Wallet Balance:'"
    >
      <div>
        <transition name="fade" mode="out-in">
          <font-awesome-icon
            :icon="buttonFlipped ? 'minus' : 'plus'"
            class="fa-2x text-white cursor"
            :spin="spinning"
          />
        </transition>
        <div class="mb-3 mt-3">
          <div class="text-white font-size-sm">
            {{
              smartUserBalance &&
                `Your balance: ${smartUserBalance} ${focusedSymbol}`
            }}
            <span v-if="rateLoading">
              <font-awesome-icon icon="circle-notch" spin />
            </span>
            <!-- {{ simpleReward }} -->
          </div>
          <!-- <div class="text-white font-size-sm">Fee: {{ fee }} %</div> -->
        </div>
        <div class="d-flex justify-content-center">
          <b-dropdown
            button
            :disabled="!isAuthenticated"
            @click="toggleMain"
            variant="success"
            split
            class="m-2"
            size="lg"
          >
            <template v-slot:button-content>
              <font-awesome-icon
                :icon="buttonFlipped ? 'arrow-down' : 'arrow-up'"
                :spin="loadingTokens"
                fixed-width
                class="mr-2"
              />
              <span class="font-w700">
                {{ buttonFlipped ? "Remove Liquidity" : "Add Liquidity" }}
              </span>
            </template>
            <b-dropdown-item-button @click="buttonFlipped = !buttonFlipped">
              {{ buttonFlipped ? "Add Liquidity" : "Remove Liquidity" }}
            </b-dropdown-item-button>
          </b-dropdown>
        </div>
      </div>
    </two-token-hero>
  </hero-wrapper>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";
import { fetchTokenMeta, fetchTokenStats, Wei } from "@/api/helpers";
import numeral from "numeral";
import { calculateReturn, calculateFundReturn, liquidate } from "bancorx";
import { split, Asset, Symbol } from "eos-common";
import { multiContract } from "@/api/multiContractTx";
import wait from "waait";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import { tableApi } from "@/api/TableWrapper";
import {
  getBalance,
  getBankBalance,
  web3,
  getBancorGasPriceLimit,
  fetchReserveBalance
} from "@/api/helpers";
import { ABISmartToken, ABIConverter, BntTokenContract } from "@/api/ethConfig";
import { toWei, toHex, fromWei } from "web3-utils";
import { Ether } from "@/api/helpers";
import Decimal from "decimal.js";
import ModalSelect from "@/components/modals/ModalSelect.vue";
import TwoTokenHero from "./TwoTokenHero.vue";

@Component({
  components: {
    TokenAmountInput,
    ModalSelect,
    HeroWrapper,
    TwoTokenHero
  }
})
export default class HeroConvert extends Vue {
  rate = "";
  rateLoading = false;
  numeral = numeral;
  spinning = false;
  loadingTokens = false;
  token1Amount = "";
  token2Amount = "";
  token1Balance = "";
  token2Balance = "";
  token1UserBalance = "";
  token2UserBalance = "";
  smartUserBalance = "";
  smartSupply = "";
  buttonFlipped = false;
  flipped = false;
  fundReward = "";
  liquidateCost = "";
  token1SmartBalance = "";
  token2SmartBalance = "";
  gasPriceLimit = "";
  modal = false;

  selectedToken(account: string) {
    this.modal = false;
    this.$router.push({
      name: "Relay",
      params: { account }
    });
  }

  get choices() {
    return vxm.ethBancor.relays.map((relay: any) => ({
      img: relay.reserves[0].logo,
      symbol: relay.smartTokenSymbol,
      balance: 0
    }));
  }

  get owner() {
    return this.relay!.owner;
  }

  get token1Img() {
    return this.token1!.logo;
  }

  get token2Img() {
    return this.token2!.logo;
  }

  get token1Symbol() {
    return this.token1.symbol;
  }

  get token2Symbol() {
    return this.token2.symbol;
  }

  get token1() {
    const x = vxm.bancor.token(
      this.relay!.reserves[this.flipped ? 1 : 0].symbol
    )!;
    console.log("got", x);
    return x;
  }

  get token2() {
    return vxm.bancor.token(this.relay!.reserves[this.flipped ? 0 : 1].symbol)!;
  }

  get relay() {
    return vxm.ethBancor.relay(this.focusedSymbol);
  }

  get fee() {
    return this.relay!.fee;
  }

  get displayedToken1Balance() {
    return this.buttonFlipped
      ? this.token1SmartBalance
      : this.token1UserBalance;
  }

  get displayedToken2Balance() {
    return this.buttonFlipped
      ? this.token2SmartBalance
      : this.token2UserBalance;
  }

  get isAuthenticated() {
    return vxm.wallet.isAuthenticated;
  }

  get isAdmin() {
    return this.owner == this.isAuthenticated;
  }

  get simpleReward() {
    if (!this.token1Balance && !this.token2Balance) return "";
    const token1 = split(this.token1Balance);
    const token2 = split(this.token2Balance);
    // @ts-ignore
    const oneAmount = Math.pow(10, token1.symbol.precision);
    // @ts-ignore
    const reward = calculateReturn(
      // @ts-ignore
      token1,
      token2,
      new Asset(oneAmount, token1.symbol)
    );
    return `${reward.toNumber().toFixed(4)} ${reward.symbol.code()}`;
  }

  async toggleRelay() {}

  async getReserveCount(
    converterContract: any,
    versionNumber: number | string
  ): Promise<number> {
    try {
      if (Number(versionNumber) >= 17) {
        const tokenCount = await converterContract.methods
          .reserveTokenCount()
          .call();
        return Number(tokenCount);
      } else {
        const connectorCount = await converterContract.methods
          .connectorTokenCount()
          .call();
        return Number(connectorCount);
      }
    } catch (e) {
      throw new Error("Failed getting reserve count" + e);
    }
  }

  async fetchRelayBalances() {
    const {
      converterAddress,
      tokenAddress,
      smartTokenAddress,
      version
    } = this.relay!;

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

    try {
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
    } catch (e) {
      console.log("failed to TJ hooker", e);
      throw new Error("What" + e);
    }
  }

  percentageIncrease(deposit: string, existingSupply: string): number {
    return new Decimal(deposit).div(existingSupply).toNumber();
  }

  percentageOfReserve(percent: number, existingSupply: string): string {
    return new Decimal(percent).times(existingSupply).toFixed(0);
  }

  async getDecimalsOfToken(symbolName: string): Promise<number> {
    return vxm.ethBancor.getDecimals(symbolName);
  }

  calculateFundReward(
    reserveAmount: string,
    reserveSupply: string,
    smartSupply: string
  ) {
    Decimal.set({ rounding: 0 });
    return new Decimal(reserveAmount)
      .div(reserveSupply)
      .times(smartSupply)
      .times(0.99)
      .toFixed(0);
  }

  calculateLiquidateCost(
    reserveAmount: string,
    reserveBalance: string,
    smartSupply: string
  ) {
    const percent = this.percentageIncrease(reserveAmount, reserveBalance);
    return this.percentageOfReserve(percent, smartSupply);
  }

  percentDifference(smallAmount: string, bigAmount: string) {
    console.log({ smallAmount, bigAmount });
    return new Decimal(smallAmount).div(bigAmount).toNumber();
  }

  async mutateOppositeTokenAmount(isToken1: boolean) {
    this.rateLoading = true;
    const {
      tokenReserveBalance,
      bntReserveBalance,
      totalSupply
    } = await this.fetchRelayBalances();

    if (this.buttonFlipped) {
      // Liquidating
      if (isToken1) {
        // token 1 was changed
        const decimals = await this.getDecimalsOfToken(this.token1.symbol);
        const token1Wei = String(
          Number(this.token1Amount) * Math.pow(10, decimals)
        );
        const token2Value = this.calculateOppositeLiquidateRequirement(
          token1Wei,
          tokenReserveBalance,
          bntReserveBalance
        );
        this.token2Amount = fromWei(token2Value);
        const liquidateCost = this.calculateLiquidateCost(
          token1Wei,
          tokenReserveBalance,
          totalSupply
        );
        const percentDifferenceBetweenSmartBalance = this.percentDifference(
          liquidateCost,
          String(Number(this.smartUserBalance) * Math.pow(10, 18))
        );
        if (percentDifferenceBetweenSmartBalance > 0.99) {
          console.log("should just use the whole balance");
          const userSmartTokenBalance = toWei(this.smartUserBalance);
          console.log({ userSmartTokenBalance });
          this.liquidateCost = userSmartTokenBalance;
        } else {
          console.log("not using whole balance");
          this.liquidateCost = liquidateCost;
        }
      } else {
        // token2 was changed
        const decimals = await this.getDecimalsOfToken(this.token2.symbol);
        const token2Wei = String(
          Number(this.token2Amount) * Math.pow(10, decimals)
        );
        console.log({
          token2Wei,
          tokenReserveBalance,
          bntReserveBalance,
          totalSupply
        });
        const token1Value = this.calculateOppositeLiquidateRequirement(
          token2Wei,
          tokenReserveBalance,
          bntReserveBalance
        );
        this.token1Amount = fromWei(token1Value);
        const liquidateCost = this.calculateLiquidateCost(
          token2Wei,
          tokenReserveBalance,
          totalSupply
        );
        console.log(fromWei(liquidateCost), "is the liquidate cost");
        this.liquidateCost = liquidateCost;
      }
    } else {
      // Funding
      if (isToken1) {
        const decimals = await this.getDecimalsOfToken(this.token1.symbol);
        const token1Wei = String(
          Number(this.token1Amount) * Math.pow(10, decimals)
        );
        const token2Value = this.calculateOppositeFundRequirement(
          token1Wei,
          tokenReserveBalance,
          bntReserveBalance
        );
        this.token2Amount = fromWei(token2Value);
        const fundReward = this.calculateFundReward(
          token1Wei,
          tokenReserveBalance,
          totalSupply
        );
        this.fundReward = fundReward;
      } else {
        const decimals = await this.getDecimalsOfToken(this.token2.symbol);
        const token2Wei = String(
          Number(this.token2Amount) * Math.pow(10, decimals)
        );
        const token1Value = this.calculateOppositeFundRequirement(
          token2Wei,
          bntReserveBalance,
          tokenReserveBalance
        );
        this.token1Amount = fromWei(token1Value);
        const fundReward = this.calculateFundReward(
          token2Wei,
          bntReserveBalance,
          totalSupply
        );
        console.log("fund reward being set to", fundReward);
        this.fundReward = fundReward;
      }
    }

    this.rateLoading = false;
  }

  calculateOppositeFundRequirement(
    deposit: string,
    depositsSupply: string,
    oppositesSupply: string
  ): string {
    const increase = this.percentageIncrease(deposit, depositsSupply);
    return this.percentageOfReserve(increase, oppositesSupply);
  }

  calculateOppositeLiquidateRequirement(
    reserveAmount: string,
    reserveBalance: string,
    oppositeReserveBalance: string
  ) {
    const increase = this.percentageIncrease(reserveAmount, reserveBalance);
    return this.percentageOfReserve(increase, oppositeReserveBalance);
  }

  async toggleMain() {
    if (this.buttonFlipped) {
      this.removeLiquidity();
    } else {
      this.addLiquidity();
    }
  }

  async removeLiquidity() {
    const { converterAddress, smartTokenAddress, tokenAddress } = this.relay!;

    const maxGasPrice = await getBancorGasPriceLimit();

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

    const bancorTokenContract = new web3.eth.Contract(
      // @ts-ignore
      ABISmartToken,
      BntTokenContract
    );

    const batch = new web3.BatchRequest();

    const liquidateData = converterContract.methods
      .liquidate(this.liquidateCost)
      .encodeABI({ from: this.isAuthenticated });

    const liquidate = {
      from: this.isAuthenticated,
      to: converterAddress,
      value: "0x0",
      data: liquidateData,
      gasPrice: toHex(maxGasPrice),
      gas: toHex(950000)
    };

    batch.add(
      // @ts-ignore
      web3.eth.sendTransaction.request(liquidate, () => console.log("Pool"))
    );
    console.log(batch, "is batch");
    await batch.execute();
    this.fetchUserTokenBalances();
    this.setMaxWithdrawals();
  }

  async addLiquidity() {
    const { converterAddress, smartTokenAddress, tokenAddress } = this.relay!;

    const maxGasPrice = await getBancorGasPriceLimit();

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
      .allowance(this.isAuthenticated, converterAddress)
      .call();

    const tokenApproved = await tokenContract.methods
      .allowance(this.isAuthenticated, converterAddress)
      .call();

    const batch = new web3.BatchRequest();

    let transactions: any = [
      {
        to: converterAddress,
        data: converterContract.methods.fund(this.fundReward),
        gas: toHex(950000)
      }
    ];

    if (Number(fromWei(bancorApproved)) < Number(this.token2Amount)) {
      console.log(
        `changing ${fromWei(bancorApproved)} to ${this.token2Amount}`
      );
      console.log(
        fromWei(bancorApproved) !== "0"
          ? "bancorApproved is not zero"
          : "bancorApproved is zero"
      );
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
            toWei(this.token2Amount)
          ),
          gas: toHex(85000)
        },
        ...transactions
      ];
      console.log({ transactions });
    }

    if (Number(fromWei(tokenApproved)) < Number(this.token1Amount)) {
      console.log(`changing ${fromWei(tokenApproved)} to ${this.token1Amount}`);
      console.log(
        fromWei(tokenApproved) !== "0"
          ? "tokenApproved is not zero"
          : "tokenapproved is zero"
      );
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
            toWei(this.token1Amount)
          ),
          gas: toHex(85000)
        },
        ...transactions
      ];
      console.log({ transactions });
    }

    if (tokenAddress == "0xc0829421C1d260BD3cB3E0F06cfE2D52db2cE315") {
      transactions = [
        {
          to: "0xc0829421C1d260BD3cB3E0F06cfE2D52db2cE315",
          value: web3.utils.toHex(toWei(this.token1Amount))
        },
        ...transactions
      ];
    }

    const fillOuter = (outer: any) => ({
      from: outer.from || this.isAuthenticated,
      to: outer.to,
      value: outer.value || "0x0",
      ...(outer.data && { data: outer.data }),
      ...(outer.gas && { gas: outer.gas }),
      ...(outer.gasPrice && { gasPrice: outer.gasPrice })
    });

    transactions
      .filter((x: any) => x)
      .map((tx: any) => ({
        ...tx,
        ...(tx.data && {
          data: tx.data.encodeABI({ from: this.isAuthenticated })
        })
      }))
      .forEach((transaction: any, index: number) => {
        batch.add(
          // @ts-ignore
          web3.eth.sendTransaction.request(fillOuter(transaction))
        );
      });

    console.log(batch, "is batch");
    await batch.execute();
    this.fetchUserTokenBalances();
    this.setMaxWithdrawals();
  }

  get defaultFocusedSymbol() {
    return vxm.ethBancor.relays[0]!.smartTokenSymbol;
  }

  get focusedSymbol() {
    return this.$route.params.account || this.defaultFocusedSymbol;
  }

  async fetchUserTokenBalances() {
    if (!this.isAuthenticated) return;
    const { converterAddress, smartTokenAddress, tokenAddress } = this.relay!;

    const getBalance = async (contractAddress: string) =>
      vxm.ethWallet.getBalance({
        accountHolder: this.isAuthenticated,
        tokenContractAddress: contractAddress
      });

    const [bntBalance, tokenBalance, smartTokenBalance] = await Promise.all([
      getBalance(BntTokenContract),
      getBalance(tokenAddress),
      getBalance(smartTokenAddress)
    ]);

    this.token1UserBalance = tokenBalance;
    this.token2UserBalance = bntBalance;
    this.smartUserBalance = smartTokenBalance;
    return smartTokenBalance;
  }

  @Watch("isAuthenticated")
  onAuthChange(val: any) {
    if (val) {
      this.fetchUserTokenBalances();
    }
  }

  @Watch("buttonFlipped")
  buttonFlip() {
    this.token1Amount = "";
    this.token2Amount = "";
  }

  @Watch("$route")
  listen(to: any) {
    this.fetchUserTokenBalances();
    this.setMaxWithdrawals();
    this.buttonFlipped = to.params.mode == "liquidate";
  }

  async fetchSmartSupply() {
    const { totalSupply } = await this.fetchRelayBalances();
    this.smartSupply = totalSupply;
  }

  async setMaxWithdrawals() {
    const userSmartTokenBalance = await this.fetchUserTokenBalances();
    if (!userSmartTokenBalance) return;
    const {
      totalSupply,
      bntReserveBalance,
      tokenReserveBalance
    } = await this.fetchRelayBalances();
    try {
      const percent = new Decimal(userSmartTokenBalance).div(
        fromWei(totalSupply)
      );
      const token2SmartBalance = percent.times(bntReserveBalance);
      const token1SmartBalance = percent.times(tokenReserveBalance);

      const token2SmartInt = token2SmartBalance.toFixed(0);
      const token1SmartInt = token1SmartBalance.toFixed(0);
      console.log({
        percent: percent.toNumber(),
        token2x: token2SmartInt,
        userSmartTokenBalance,
        totalSupply
      });

      this.token2SmartBalance = fromWei(token2SmartInt);
      this.token1SmartBalance = fromWei(token1SmartInt);
    } catch (e) {
      console.log("Something went wrong in setMaxWithdrawals" + e);
    }
  }

  async created() {
    this.fetchUserTokenBalances();
    this.setMaxWithdrawals();
    this.gasPriceLimit = await getBancorGasPriceLimit();
  }
}
</script>

<style scoped lang="scss">
.slide-fade-up-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-up-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-up-enter
/* .slide-fade-leave-active below version 2.1.8 */

 {
  transform: translateY(75px);
  opacity: 0;
}

.slide-fade-up-leave-to
/* .slide-fade-leave-active below version 2.1.8 */

 {
  transform: translateY(-75px);
  opacity: 0;
}

.slide-fade-down-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-down-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-down-enter
/* .slide-fade-leave-active below version 2.1.8 */

 {
  transform: translateY(-75px);
  opacity: 0;
}

.slide-fade-down-leave-to
/* .slide-fade-leave-active below version 2.1.8 */

 {
  transform: translateY(75px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to
/* .fade-leave-active below version 2.1.8 */

 {
  opacity: 0;
}
</style>
