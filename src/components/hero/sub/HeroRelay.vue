<template>
  <hero-wrapper>
    <two-token-hero
      :tokenOneSymbol="token1Symbol"
      :tokenOneAmount.sync="token1Amount"
      @update:tokenOneAmount="tokenOneChanged"
      @update:tokenTwoAmount="tokenTwoChanged"
      :tokenOneBalance="displayedToken1Balance"
      :tokenOneImg="token1Img"
      :tokenTwoSymbol="token2Symbol"
      :tokenTwoAmount.sync="token2Amount"
      :tokenTwoBalance="displayedToken2Balance"
      :tokenTwoImg="token2Img"
      :label="withdrawLiquidity ? 'Pool Balance:' : 'Wallet Balance:'"
    >
      <div>
        <transition name="fade" mode="out-in">
          <font-awesome-icon
            :icon="withdrawLiquidity ? 'minus' : 'plus'"
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
                :icon="withdrawLiquidity ? 'arrow-down' : 'arrow-up'"
                :spin="loadingTokens"
                fixed-width
                class="mr-2"
              />
              <span class="font-w700">
                {{ withdrawLiquidity ? "Remove Liquidity" : "Add Liquidity" }}
              </span>
            </template>
            <b-dropdown-item-button
              @click="withdrawLiquidity = !withdrawLiquidity"
            >
              {{ withdrawLiquidity ? "Add Liquidity" : "Remove Liquidity" }}
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
import ModalSelect from "@/components/modals/ModalSelect.vue";
import TwoTokenHero from "./TwoTokenHero.vue";
import { toWei, toHex, fromWei } from "web3-utils";
import { OpposingLiquid } from "../../../types/bancor";
import { ABISmartToken, ABIConverter, BntTokenContract } from "@/api/ethConfig";

@Component({
  components: {
    TokenAmountInput,
    ModalSelect,
    HeroWrapper,
    TwoTokenHero
  }
})
export default class HeroConvert extends Vue {
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
  withdrawLiquidity = false;
  fundReward = "";
  liquidateCost = "";
  token1SmartBalance = "";
  token2SmartBalance = "";
  modal = false;

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
    return vxm.bancor.token(this.relay!.reserves[0].symbol)!;
  }

  get token2() {
    return vxm.bancor.token(this.relay!.reserves[1].symbol)!;
  }

  get relay() {
    return vxm.bancor.relay(this.focusedSymbol);
  }

  get fee() {
    return this.relay!.fee;
  }

  get displayedToken1Balance() {
    return this.withdrawLiquidity
      ? this.token1SmartBalance
      : this.token1UserBalance;
  }

  get displayedToken2Balance() {
    return this.withdrawLiquidity
      ? this.token2SmartBalance
      : this.token2UserBalance;
  }

  get isAuthenticated() {
    return vxm.wallet.isAuthenticated;
  }

  get isAdmin() {
    return this.owner == this.isAuthenticated;
  }

  selectedToken(account: string) {
    this.modal = false;
    this.$router.push({
      name: "Relay",
      params: { account }
    });
  }

  async tokenOneChanged() {
    this.rateLoading = true;
    const { opposingAmount, smartTokenAmount } = await vxm.bancor[
      this.withdrawLiquidity
        ? "calculateOpposingWithdraw"
        : "calculateOpposingDeposit"
    ]({
      smartTokenSymbol: this.focusedSymbol,
      tokenAmount: this.token1Amount,
      tokenSymbol: this.token1Symbol
    });
    this.token2Amount = opposingAmount;
    this[
      this.withdrawLiquidity ? "liquidateCost" : "fundReward"
    ] = smartTokenAmount;
    this.rateLoading = false;
  }

  async tokenTwoChanged() {
    this.rateLoading = true;
    // @ts-ignore
    const { opposingAmount, smartTokenAmount } = await vxm.bancor[
      this.withdrawLiquidity
        ? "calculateOpposingWithdraw"
        : "calculateOpposingDeposit"
    ]({
      smartTokenSymbol: this.focusedSymbol,
      tokenAmount: this.token2Amount,
      tokenSymbol: this.token2Symbol
    });
    this.token1Amount = opposingAmount;
    this[
      this.withdrawLiquidity ? "liquidateCost" : "fundReward"
    ] = smartTokenAmount;
    this.rateLoading = false;
  }

  async toggleMain() {
    if (this.withdrawLiquidity) {
      this.removeLiquidity();
    } else {
      this.addLiquidity();
    }
  }

  async removeLiquidity() {
    const txResult = await vxm.bancor.removeLiquidity({
      smartTokenSymbol: this.focusedSymbol,
      fundAmount: this.fundReward,
      token1Amount: this.token1Amount,
      token1Symbol: this.token1Symbol,
      token2Amount: this.token2Amount,
      token2Symbol: this.token2Symbol
    });
    this.fetchUserTokenBalances();
    this.setMaxWithdrawals();
  }

  async addLiquidity() {
    const txResult = await vxm.bancor.addLiquidity({
      smartTokenSymbol: this.focusedSymbol,
      fundAmount: this.fundReward,
      token1Amount: this.token1Amount,
      token1Symbol: this.token1Symbol,
      token2Amount: this.token2Amount,
      token2Symbol: this.token2Symbol
    });
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

  @Watch("withdrawLiquidity")
  buttonFlip() {
    this.token1Amount = "";
    this.token2Amount = "";
  }

  @Watch("$route")
  listen(to: any) {
    this.fetchUserTokenBalances();
    this.setMaxWithdrawals();
    this.withdrawLiquidity = to.params.mode == "liquidate";
  }

  async setMaxWithdrawals() {
    // const userSmartTokenBalance = await this.fetchUserTokenBalances();
    // if (!userSmartTokenBalance) return;
    // const {
    //   totalSupply,
    //   bntReserveBalance,
    //   tokenReserveBalance
    // } = await this.fetchRelayBalances();
    // const percent = new Decimal(userSmartTokenBalance).div(
    //   fromWei(totalSupply)
    // );
    // const token2SmartBalance = percent.times(bntReserveBalance);
    // const token1SmartBalance = percent.times(tokenReserveBalance);
    // const token2SmartInt = token2SmartBalance.toFixed(0);
    // const token1SmartInt = token1SmartBalance.toFixed(0);
    // console.log({
    //   percent: percent.toNumber(),
    //   token2x: token2SmartInt,
    //   userSmartTokenBalance,
    //   totalSupply
    // });
    // this.token2SmartBalance = fromWei(token2SmartInt);
    // this.token1SmartBalance = fromWei(token1SmartInt);
  }

  async created() {
    this.fetchUserTokenBalances();
    this.setMaxWithdrawals();
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
