<template>
  <hero-wrapper>
    <two-token-hero
      :tokenOneSymbol="token1Symbol"
      :tokenOneError="token1Error"
      :tokenTwoError="token2Error"
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
        <div
          v-if="
            selectedMenu == `addLiquidity` || selectedMenu == `removeLiquidity`
          "
        >
          <font-awesome-icon
            :icon="withdrawLiquidity ? 'minus' : 'plus'"
            class="fa-2x text-white cursor"
          />
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
        </div>
        <div v-else-if="selectedMenu == `setFee`">
          <relay-fee-adjuster v-model="feeAmount" />
        </div>
        <div v-else-if="selectedMenu == `changeOwner`">
          <b-form-input
            v-model="newOwner"
            class="form-control-alt"
            placeholder="New owner account"
          ></b-form-input>
        </div>
        <dynamic-dropdown
          :menus="menus"
          :selectedMenu.sync="selectedMenu"
          @clicked="toggleMain"
        />
      </div>

      <modal-tx
        :title="`${withdrawLiquidity ? 'Remove Liquidity' : 'Add Liquidity'}`"
        v-model="txModal"
        @input="modalClosed"
        :busy="txBusy"
      >
        <token-swap
          :error="error"
          :success="success"
          leftHeader="Deposit"
          :leftImg="token1Img"
          :leftTitle="`${token1Symbol} ${token1Amount}`"
          leftSubtitle=""
          :rightImg="token2Img"
          :rightTitle="`${token2Symbol} ${token2Amount}`"
          rightHeader="Deposit"
          rightSubtitle=""
        >
          <template v-slot:footer>
            <b-col cols="12" class="text-center">
              <h6 v-if="!success && !error">
                Please proceed with your wallet to confirm this Transaction.
              </h6>
              <h6 v-else-if="error && !success" class="text-danger">
                Error: {{ error }}
                <!-- <span class="cursor text-muted"> - Try again</span> -->
              </h6>
              <h6 v-else-if="!error && success">
                <a :href="explorerLink" target="_blank" class="text-success">
                  SUCCESS: View {{ success.substring(0, 6) }} TX on
                  {{ explorerName }}
                </a>
                <span @click="txModal = false" class="cursor text-muted"
                  >- Close</span
                >
              </h6>
            </b-col>
          </template>
        </token-swap>
      </modal-tx>
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
import { State, Getter, Action, namespace } from "vuex-class";
import ModalTx from "@/components/modals/ModalTx.vue";
import TokenSwap from "@/components/common/TokenSwap.vue";
import DynamicDropdown from "./DynamicDropdown.vue";
import RelayFeeAdjuster from "@/components/common/RelayFeeAdjuster.vue";

const bancor = namespace("bancor");
const wallet = namespace("wallet");

@Component({
  components: {
    TokenAmountInput,
    RelayFeeAdjuster,
    ModalSelect,
    DynamicDropdown,
    HeroWrapper,
    TwoTokenHero,
    ModalTx,
    TokenSwap
  }
})
export default class HeroConvert extends Vue {
  rateLoading = false;
  token1Amount = "";
  token2Amount = "";
  token1UserBalance = "";
  token2UserBalance = "";
  smartUserBalance = "";
  fundReward = "";
  liquidateCost = "";
  token1MaxWithdraw = "";
  token2MaxWithdraw = "";
  modal = false;
  error = "";
  success = "";
  txModal = false;
  txBusy = false;
  token1Error = "";
  token2Error = "";
  selectedMenu = this.menus[0][0];

  feeAmount = 0;
  newOwner = "";

  @bancor.Getter token!: TradingModule["token"];
  @bancor.Getter relay!: LiquidityModule["relay"];
  @bancor.Getter relays!: LiquidityModule["relays"];
  @bancor.Getter currentNetwork!: string;
  @bancor.Getter supportedFeatures!: LiquidityModule["supportedFeatures"];
  @bancor.Action getUserBalances!: LiquidityModule["getUserBalances"];
  @bancor.Action
  calculateOpposingDeposit!: LiquidityModule["calculateOpposingDeposit"];
  @bancor.Action
  calculateOpposingWithdraw!: LiquidityModule["calculateOpposingWithdraw"];
  @bancor.Action addLiquidity!: LiquidityModule["addLiquidity"];
  @bancor.Action removeLiquidity!: LiquidityModule["removeLiquidity"];
  @bancor.Action updateFee!: LiquidityModule["updateFee"];
  @bancor.Action updateOwner!: LiquidityModule["updateOwner"];
  @wallet.Getter isAuthenticated!: string | boolean;

  get withdrawLiquidity() {
    return this.selectedMenu == "removeLiquidity";
  }

  feeFormatter(fee: number) {
    return `${fee} %`;
  }

  set withdrawLiquidity(withdrawIsActive: boolean) {
    this.selectedMenu = withdrawIsActive ? "removeLiquidity" : "addLiquidity";
  }

  get menus() {
    const baseMenus = [
      ["addLiquidity", "Add Liquidity", "arrow-up", false],
      ["removeLiquidity", "Remove Liquidity", "arrow-down", false],
      ["setFee", "Set Fee", "dollar-sign", true],
      ["changeOwner", "Change Owner", "handshake", true]
    ];
    if (!this.supportedFeatures) return [baseMenus[0]];
    const features = this.supportedFeatures
      .map(feature => baseMenus.find(([name]) => name == feature)!)
      .filter(
        ([menu, label, icon, requiresAdmin]) => !requiresAdmin || this.isAdmin
      );
    if (!features.every(Boolean)) throw new Error("Unsupported feature found");
    return features;
  }

  get mainReady() {
    return (
      this.isAuthenticated &&
      !this.error &&
      !this.token1Error &&
      !this.token2Error
    );
  }

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

  modalClosed() {
    this.error = "";
    this.success = "";
    this.token1Amount = "";
    this.token2Amount = "";
  }

  async setOwner() {
    this.updateOwner!({
      smartTokenSymbol: this.focusedSymbol,
      newOwner: this.newOwner
    });
  }

  async tokenOneChanged(tokenAmount: string) {
    this.rateLoading = true;
    try {
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
      this.token1Error = "";
    } catch (e) {
      this.token1Error = e.message;
    }
    this.rateLoading = false;
  }

  async tokenTwoChanged(tokenAmount: string) {
    this.rateLoading = true;
    try {
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
      this.token2Error = "";
    } catch (e) {
      this.token2Error = e.message;
    }
    this.rateLoading = false;
  }

  async toggleMain() {
    switch (this.selectedMenu) {
      case "setFee":
        return this.setFee();
      case "changeOwner":
        return this.setOwner();
      default:
        this.withdrawLiquidity ? this.remove() : this.add();
    }
  }

  async setFee() {
    const feeDec = this.feeAmount / 100;
    this.updateFee!({ fee: feeDec, smartTokenSymbol: this.focusedSymbol });
  }

  async remove() {
    this.txModal = true;

    try {
      this.txBusy = true;
      const txResult = await this.removeLiquidity({
        smartTokenSymbol: this.focusedSymbol,
        fundAmount: this.liquidateCost,
        token1Amount: this.token1Amount,
        token1Symbol: this.token1Symbol,
        token2Amount: this.token2Amount,
        token2Symbol: this.token2Symbol
      });
      this.fetchBalances();
      this.success = txResult;
    } catch (e) {
      this.error = e.message;
    }
    this.txBusy = false;
  }

  async add() {
    this.txModal = true;
    console.log("tx modal should be true");

    try {
      this.txBusy = true;
      const txResult = await this.addLiquidity({
        smartTokenSymbol: this.focusedSymbol,
        fundAmount: this.fundReward,
        token1Amount: this.token1Amount,
        token1Symbol: this.token1Symbol,
        token2Amount: this.token2Amount,
        token2Symbol: this.token2Symbol
      });
      this.fetchBalances();
      this.success = txResult;
    } catch (e) {
      this.error = e.message;
    }
    this.txBusy = false;
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
