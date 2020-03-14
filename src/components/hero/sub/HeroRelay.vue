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
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import ModalSelect from "@/components/modals/ModalSelect.vue";
import TwoTokenHero from "./TwoTokenHero.vue";
import {
  OpposingLiquid,
  ViewToken,
  ViewRelay,
  LiquidityModule,
  TradingModule
} from "../../../types/bancor";
import { State, Getter, Action, Mutation, namespace } from "vuex-class";

const bancor = namespace("bancor");
const wallet = namespace("wallet");

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
  token1Amount = "";
  token2Amount = "";
  token1UserBalance = "";
  token2UserBalance = "";
  smartUserBalance = "";
  withdrawLiquidity = false;
  fundReward = "";
  liquidateCost = "";
  token1MaxWithdraw = "";
  token2MaxWithdraw = "";
  modal = false;

  @bancor.Getter token!: TradingModule["token"];
  @bancor.Getter relay!: LiquidityModule["relay"];
  @bancor.Getter relays!: LiquidityModule["relays"];
  @bancor.Action getUserBalances!: LiquidityModule["getUserBalances"];
  @bancor.Action
  calculateOpposingDeposit!: LiquidityModule["calculateOpposingDeposit"];
  @bancor.Action
  calculateOpposingWithdraw!: LiquidityModule["calculateOpposingWithdraw"];
  @bancor.Action addLiquidity!: LiquidityModule["addLiquidity"];
  @bancor.Action removeLiquidity!: LiquidityModule["removeLiquidity"];
  @wallet.Getter isAuthenticated!: string | boolean;

  get focusedRelay() {
    return this.relay(this.focusedSymbol);
  }

  get owner() {
    return this.focusedRelay.owner;
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
    return this.token(this.focusedRelay.reserves[0].symbol)!;
  }

  get token2() {
    return this.token(this.focusedRelay.reserves[1].symbol)!;
  }

  get fee() {
    return this.focusedRelay.fee;
  }

  get displayedToken1Balance() {
    return this.withdrawLiquidity
      ? this.token1MaxWithdraw
      : this.token1UserBalance;
  }

  get displayedToken2Balance() {
    return this.withdrawLiquidity
      ? this.token2MaxWithdraw
      : this.token2UserBalance;
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

  async tokenOneChanged(tokenAmount: string) {
    this.rateLoading = true;
    const { opposingAmount, smartTokenAmount } = await this[
      this.withdrawLiquidity
        ? "calculateOpposingWithdraw"
        : "calculateOpposingDeposit"
    ]({
      smartTokenSymbol: this.focusedSymbol,
      tokenAmount,
      tokenSymbol: this.token1Symbol
    });
    this.token2Amount = opposingAmount;
    this[
      this.withdrawLiquidity ? "liquidateCost" : "fundReward"
    ] = smartTokenAmount;
    this.rateLoading = false;
  }

  async tokenTwoChanged(tokenAmount: string) {
    this.rateLoading = true;
    const { opposingAmount, smartTokenAmount } = await this[
      this.withdrawLiquidity
        ? "calculateOpposingWithdraw"
        : "calculateOpposingDeposit"
    ]({
      smartTokenSymbol: this.focusedSymbol,
      tokenAmount,
      tokenSymbol: this.token2Symbol
    });
    this.token1Amount = opposingAmount;
    this[
      this.withdrawLiquidity ? "liquidateCost" : "fundReward"
    ] = smartTokenAmount;
    this.rateLoading = false;
  }

  async toggleMain() {
    this.withdrawLiquidity ? this.remove() : this.add();
  }

  async remove() {
    const txResult = await this.removeLiquidity({
      smartTokenSymbol: this.focusedSymbol,
      fundAmount: this.liquidateCost,
      token1Amount: this.token1Amount,
      token1Symbol: this.token1Symbol,
      token2Amount: this.token2Amount,
      token2Symbol: this.token2Symbol
    });
    this.fetchBalances();
  }

  async add() {
    const txResult = await this.addLiquidity({
      smartTokenSymbol: this.focusedSymbol,
      fundAmount: this.fundReward,
      token1Amount: this.token1Amount,
      token1Symbol: this.token1Symbol,
      token2Amount: this.token2Amount,
      token2Symbol: this.token2Symbol
    });
    this.fetchBalances();
  }

  get defaultFocusedSymbol() {
    return this.relays[0].smartTokenSymbol;
  }

  get focusedSymbol() {
    return this.$route.params.account || this.defaultFocusedSymbol;
  }

  @Watch("isAuthenticated")
  onAuthChange(val: string | boolean) {
    if (val) {
      this.fetchBalances();
    }
  }

  @Watch("withdrawLiquidity")
  buttonFlip() {
    this.token1Amount = "";
    this.token2Amount = "";
  }

  @Watch("$route")
  listen(to: any) {
    this.fetchBalances();
    this.withdrawLiquidity = to.params.mode == "liquidate";
  }

  async fetchBalances() {
    if (!this.isAuthenticated) return;
    const {
      token1MaxWithdraw,
      token2MaxWithdraw,
      token1Balance,
      token2Balance,
      smartTokenBalance
    } = await this.getUserBalances(this.focusedSymbol);

    this.token1MaxWithdraw = token1MaxWithdraw;
    this.token2MaxWithdraw = token2MaxWithdraw;
    this.token1UserBalance = token1Balance;
    this.token2UserBalance = token2Balance;
    this.smartUserBalance = smartTokenBalance;
  }

  async created() {
    this.fetchBalances();
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
