<template>
  <hero-wrapper>
    <div>
      <b-row>
        <b-col md="4">
          <transition name="slide-fade-down" mode="out-in">
            <token-amount-input
              :key="token1Symbol"
              @onUpdate="onTokenAmountChange(1)"
              :amount.sync="token1Amount"
              :symbol="token1Symbol"
              :balance="displayedToken1Balance"
              :img="token1Img"
            />
          </transition>
        </b-col>
        <b-col
          md="4"
          class="d-flex justify-content-center align-items-end"
          style="min-height: 230px"
        >
          <div>
            <transition name="fade" mode="out-in">
              <font-awesome-icon
                :icon="buttonFlipped ? 'minus' : 'plus'"
                class="fa-2x text-white cursor"
                :spin="spinning"
                @click="swapTokens"
              />
            </transition>
            <div class="mb-3 mt-3">
              <div class="text-white font-size-sm">
                1 {{ token1Symbol }} =
                <span v-if="!rateLoading && !loadingTokens">{{ rate }}</span>
                <span v-else>
                  <font-awesome-icon icon="circle-notch" spin />
                </span>
                {{ simpleReward }}
              </div>
              <div class="text-white font-size-sm">Fee: {{ fee }} %</div>
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
        </b-col>
        <b-col md="4">
          <transition name="slide-fade-up" mode="out-in">
            <token-amount-input
              @onUpdate="onTokenAmountChange(2)"
              :key="token2Symbol"
              :amount.sync="token2Amount"
              :symbol="token2Symbol"
              :balance="displayedToken2Balance"
              :img="token2Img"
            />
          </transition>
        </b-col>
      </b-row>
    </div>
  </hero-wrapper>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";
import { fetchTokenMeta, fetchTokenStats, Wei } from "@/api/helpers";
import * as bancorx from "@/assets/_ts/bancorx";
import numeral from "numeral";
import { calculateReturn, calculateFundReturn } from "bancorx";
import { split, Asset, Symbol } from "eos-common";
import { multiContract } from "@/api/multiContractTx";
import wait from "waait";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import { tableApi } from "@/api/TableWrapper";
import {
  getBalance,
  getBankBalance,
  web3,
  getBancorGasPriceLimit
} from "@/api/helpers";
import { ABISmartToken, ABIConverter, BntTokenContract } from "@/api/ethConfig";
import { toWei, toHex, fromWei } from "web3-utils";
import { Ether } from "@/api/helpers";
import Decimal from "decimal.js";
import debounce from "lodash.debounce";

@Component({
  beforeRouteEnter: async (to, from, next) => {
    if (vxm.relays.tokens.length == 0) {
      await vxm.relays.init();
    }
    next();
  },
  components: {
    TokenAmountInput,
    HeroWrapper
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
  token1Contract = "";
  token2Contract = "";
  token1UserBalance = "";
  token2UserBalance = "";
  smartUserBalance = "";
  smartSupply = "";
  buttonFlipped = false;
  flipped = false;
  fundReward = "";

  get owner() {
    return this.relay.owner;
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
    return vxm.relays.token(this.relay.reserves[this.flipped ? 1 : 0].symbol)!;
  }

  get token2() {
    return vxm.relays.token(this.relay.reserves[this.flipped ? 0 : 1].symbol)!;
  }

  get relay() {
    return vxm.relays.relay(this.focusedSymbol);
  }

  get fee() {
    return this.relay.fee;
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

  get token1SmartBalance() {
    return "Burt";
  }

  get token2SmartBalance() {
    return "Bart";
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
    const oneAmount = Math.pow(10, token1.symbol.precision);
    const reward = calculateReturn(
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

  async fetchReserveBalance(
    converterContract: any,
    reserveTokenAddress: string,
    versionNumber: number | string
  ): Promise<string> {
    try {
      return converterContract.methods[
        Number(versionNumber) >= 17
          ? "getReserveBalance"
          : "getConnectorBalance"
      ](reserveTokenAddress).call();
    } catch (e) {
      throw new Error("Failed getting reserve balance" + e);
    }
  }

  async fetchRelayBalances() {
    const {
      converterAddress,
      meta,
      tokenAddress,
      smartTokenAddress
    } = this.relay;
    const { converterVersion } = meta;

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
      this.getReserveCount(converterContract, converterVersion).then(
        reserveCount => {
          if (reserveCount !== 2) throw new Error("Reserve count is not 2");
        }
      );
    } catch (e) {
      console.warn("Failed to confirm if the reserve count is 2");
    }

    const [
      tokenReserveBalance,
      bntReserveBalance,
      totalSupply
    ] = await Promise.all([
      this.fetchReserveBalance(
        converterContract,
        tokenAddress,
        converterVersion
      ),
      this.fetchReserveBalance(
        converterContract,
        BntTokenContract,
        converterVersion
      ),
      smartTokenContract.methods.totalSupply().call()
    ]);
    return { tokenReserveBalance, bntReserveBalance, totalSupply };
  }

  percentageIncrease(deposit: string, existingSupply: string): number {
    return new Decimal(deposit).div(existingSupply).toNumber();
  }

  percentageOfReserve(percent: number, existingSupply: string): string {
    return new Decimal(percent).times(existingSupply).toFixed(0);
  }

  async getDecimalsOfToken(symbolName: string): Promise<number> {
    const res = await vxm.relays.getEthTokenWithDecimals(symbolName);
    return res.decimals;
  }

  calculateFundReward(reserveAmount: string, reserveSupply: string, smartSupply: string) {
    Decimal.set({ rounding: 0 })
    return new Decimal(reserveAmount).div(reserveSupply).times(smartSupply).toFixed(0)
  }

  async mutateOppositeTokenAmount(isToken1: any) {
    console.log("mutate got called");
    this.rateLoading = true;
    const {
      tokenReserveBalance,
      bntReserveBalance,
      totalSupply
    } = await this.fetchRelayBalances();

    if (isToken1) {
      const decimals = await this.getDecimalsOfToken(this.token1.symbol);
      const token1Wei = String(
        Number(this.token1Amount) * Math.pow(10, decimals)
      );
      console.log({
        token1Wei,
        tokenReserveBalance,
        bntReserveBalance,
        totalSupply
      });
      const token2Value = this.calculateOppositeFundRequirement(
        token1Wei,
        tokenReserveBalance,
        bntReserveBalance
      );
      this.token2Amount = fromWei(token2Value);
      const fundReward = this.calculateFundReward(token1Wei, tokenReserveBalance, totalSupply) 
      console.log("fund reward being set to", fundReward)
      this.fundReward = fundReward
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
      const fundReward = this.calculateFundReward(token2Wei, bntReserveBalance, totalSupply) 
      console.log("fund reward being set to", fundReward)
      this.fundReward = fundReward
    }
    this.rateLoading = false;
  }

  mutateDebouncer = debounce(
    isToken1 => this.mutateOppositeTokenAmount(isToken1),
    500
  );

  async onTokenAmountChange(selectedToken: number) {
    const isToken1 = selectedToken == 1;
    this.mutateDebouncer(isToken1);
  }

  calculateOppositeFundRequirement(
    deposit: string,
    depositsSupply: string,
    oppositesSupply: string
  ): string {
    const increase = this.percentageIncrease(deposit, depositsSupply);
    return this.percentageOfReserve(increase, oppositesSupply);
  }

  async toggleMain() {
    if (this.buttonFlipped) {
      this.removeLiquidity();
    } else {
      this.addLiquidity();
    }
  }

  async removeLiquidity() {
    console.log("remove liquidity");
  }

  async addLiquidity() {
    console.log("add liquidity triggered");
    console.log(this.relay, "w as re");
    const { converterAddress, smartTokenAddress, tokenAddress } = this.relay;
    console.log(converterAddress, smartTokenAddress, tokenAddress);

    const maxGasPrice = await getBancorGasPriceLimit();
    console.log({ converterAddress, smartTokenAddress });

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

    // const smartTokenDecimals: string = await smartTokenContract.methods
    //   .decimals()
    //   .call();

    const bancorTokenContract = new web3.eth.Contract(
      // @ts-ignore
      ABISmartToken,
      BntTokenContract
    );

    const bancorApproved = await bancorTokenContract.methods
        .allowance(this.isAuthenticated, converterAddress)
        .call();

    console.log(bancorApproved, 'is the bancor approved allowance')

    const batch = new web3.BatchRequest();

    const approveBancorData = bancorTokenContract.methods
      .approve(converterAddress, toWei(this.token1Amount))
      .encodeABI({ from: this.isAuthenticated });

    const approveTokenData = tokenContract.methods
      .approve(converterAddress, toWei(this.token2Amount))
      .encodeABI({ from: this.isAuthenticated });


    console.log("seeking a fund reward of", this.fundReward)
    const fundData = converterContract.methods
      .fund(this.fundReward)
      .encodeABI({ from: this.isAuthenticated });



    const approveBancor = {
      from: this.isAuthenticated,
      to: BntTokenContract,
      value: "0x0",
      data: approveBancorData,
      gasPrice: toHex(maxGasPrice),
      gas: toHex(85000)
    };

    const approveConnector = {
      from: this.isAuthenticated,
      to: tokenAddress,
      value: "0x0",
      data: approveTokenData,
      gasPrice: toHex(maxGasPrice),
      gas: toHex(85000)
    };

    const fund = {
      from: this.isAuthenticated,
      to: converterAddress,
      value: "0x0",
      data: fundData,
      gasPrice: toHex(maxGasPrice),
      gas: toHex(950000)
    };

       

    batch.add(
      // @ts-ignore
      web3.eth.sendTransaction.request(approveBancor, () =>
        console.log("Approve Bancor")
      )
    );
    batch.add(
      // @ts-ignore
      web3.eth.sendTransaction.request(approveConnector, () =>
        console.log("Approve connector")
      )
    );
    batch.add(
      // @ts-ignore
      web3.eth.sendTransaction.request(fund, () => console.log("Pool"))
    );
    console.log(batch, "is batch");
    batch.execute();
  }

  swapTokens() {
    // this.flipped = !this.flipped;
  }

  get defaultFocusedSymbol() {
    return vxm.relays.relays[0].smartTokenSymbol;
  }

  get focusedSymbol() {
    return this.$route.params.account || this.defaultFocusedSymbol;
  }

  async checkBankBalance() {}

  async fetchUserTokenBalances() {
    if (!this.isAuthenticated) return;
    const { converterAddress, smartTokenAddress, tokenAddress } = this.relay;

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
  }

  @Watch("focusedSymbol")
  symbolChange(newSymbol: string) {
    this.fetchUserTokenBalances();
  }

  @Watch("isAuthenticated")
  onAuthChange(val: any) {
    if (val) {
      this.fetchUserTokenBalances();
      this.checkBankBalance();
    }
  }

  @Watch("$route")
  listen(to: any) {
    console.log(
      "router is offering",
      to.params.account || this.defaultFocusedSymbol
    );
  }

  async created() {
    const few = await web3.eth.getBalance(
      "0x8a81E3058574A7c1D9A979BfC59A00E96209FdE7"
    );
    console.log(few, "was the balance");
    const x = await getBancorGasPriceLimit();
    console.log(x, "was the X");
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
