<template>
  <hero-wrapper>
    <two-token-hero
      :tokenOneId.sync="token1Id"
      :tokenTwoId.sync="token2Id"
      :tokenOneMeta="token1Meta"
      :tokenTwoMeta="token2Meta"
      :tokenOneAmount.sync="token1Amount"
      :tokenTwoAmount.sync="token2Amount"
      :warnBalance="true"
      @update:tokenOneAmount="tokenOneChanged"
      @update:tokenTwoAmount="tokenTwoChanged"
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
                `Your balance: ${smartUserBalance} ${focusedRelay.smartTokenSymbol}`
              }}
              <span v-if="rateLoading">
                <font-awesome-icon icon="circle-notch" spin />
              </span>
            </div>
            <!-- <div class="text-white font-size-sm">Fee: {{ fee }} %</div> -->
          </div>
        </div>
        <div v-else-if="selectedMenu == `setFee`">
          <relay-fee-adjuster :fee.sync="feeAmount" />
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
        <div>
          <stepper
            v-if="sections.length > 1"
            :selectedStep="stepIndex"
            :steps="sections"
            :label="sections[stepIndex].description"
            :numbered="true"
          />

          <token-swap
            :error="error"
            :success="success"
            :leftHeader="withdrawLiquidity ? 'Withdraw' : 'Deposit'"
            :leftImg="token1Meta.img"
            :leftTitle="`${token1Meta.symbol} ${token1Amount}`"
            leftSubtitle=""
            :rightImg="token2Meta.img"
            :rightTitle="`${token2Meta.symbol} ${token2Amount}`"
            :rightHeader="withdrawLiquidity ? 'Withdraw' : 'Deposit'"
            rightSubtitle=""
          >
            <template v-slot:footer>
              <TxModalFooter
                :error="error"
                :success="success"
                :explorerLink="explorerLink"
                :explorerName="explorerName"
                @close="txModal = false"
              />
            </template>
          </token-swap>
        </div>
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
  TradingModule,
  Step,
  ViewAmount
} from "../../../types/bancor";
import { State, Getter, Action, namespace } from "vuex-class";
import ModalTx from "@/components/modals/ModalTx.vue";
import TokenSwap from "@/components/common/TokenSwap.vue";
import DynamicDropdown from "@/components/common/DynamicDropdown.vue";
import RelayFeeAdjuster from "@/components/common/RelayFeeAdjuster.vue";
import TxModalFooter from "@/components/common/TxModalFooter.vue";
import Stepper from "@/components/modals/Stepper.vue";
import wait from "waait";
import { compareString } from "../../../api/helpers";
import { sortByNetworkTokens } from "../../../api/sortByNetworkTokens";

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
    TokenSwap,
    Stepper,
    TxModalFooter
  }
})
export default class HeroRelay extends Vue {
  rateLoading = false;
  token1Amount = "";
  token2Amount = "";
  smartUserBalance = "";
  token1MaxWithdraw = 0;
  token2MaxWithdraw = 0;
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

  sections: Step[] = [];
  stepIndex = 0;

  @bancor.Getter token!: TradingModule["token"];
  @bancor.Getter relay!: LiquidityModule["relay"];
  @bancor.Getter relays!: LiquidityModule["relays"];
  @bancor.Action focusSymbol!: TradingModule["focusSymbol"];
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
  @bancor.Action removeRelay!: LiquidityModule["removeRelay"];
  @wallet.Getter isAuthenticated!: string | boolean;

  get withdrawLiquidity() {
    return this.selectedMenu == "removeLiquidity";
  }

  set withdrawLiquidity(withdrawIsActive: boolean) {
    this.selectedMenu = withdrawIsActive ? "removeLiquidity" : "addLiquidity";
  }

  get menus() {
    const baseMenus = [
      ["addLiquidity", "Add Liquidity", "arrow-up"],
      ["removeLiquidity", "Remove Liquidity", "arrow-down", "danger"],
      ["setFee", "Set Fee", "dollar-sign"],
      ["changeOwner", "Change Owner", "handshake", "info"],
      ["deleteRelay", "Delete Pool", "trash-alt", "warning"]
    ];

    if (!this.supportedFeatures) return [baseMenus[1]];
    const features = this.supportedFeatures(this.focusedId)
      .map(feature => baseMenus.find(([name]) => name == feature)!)
      .filter(Boolean);
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
    return this.relay(this.focusedId);
  }

  get owner() {
    return this.focusedRelay.owner;
  }

  get token1Meta() {
    return {
      ...this.token1,
      img: this.token1.logo,
      balance: this.displayedToken1Balance,
      errors: [this.token1Error]
    };
  }

  get token2Meta() {
    return {
      ...this.token2,
      img: this.token2.logo,
      balance: this.displayedToken2Balance,
      errors: [this.token1Error]
    };
  }

  get token1Id() {
    return this.token1!.id;
  }

  get token2Id() {
    return this.token2!.id;
  }

  get token1() {
    return this.token(this.focusedRelay.reserves[0].id)!;
  }

  get token2() {
    return this.token(this.focusedRelay.reserves[1].id)!;
  }

  get fee() {
    return this.focusedRelay.fee;
  }

  get explorerLink() {
    switch (this.currentNetwork) {
      case "eos":
      case "usds":
        return `https://bloks.io/transaction/${this.success}`;
      case "eth":
        return `https://etherscan.io/tx/${this.success}`;
      default:
        return `https://bloks.io/transaction/${this.success}`;
    }
  }

  get explorerName() {
    switch (this.currentNetwork) {
      case "eos":
      case "usds":
        return `Bloks.io`;
      case "eth":
        return `Etherscan`;
      default:
        return `Bloks.io`;
    }
  }

  get token1UserBalance() {
    return this.token1.balance;
  }

  get token2UserBalance() {
    return this.token2.balance;
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

  modalClosed() {
    this.error = "";
    this.success = "";
    this.token1Amount = "";
    this.token2Amount = "";
  }

  async setOwner() {
    this.updateOwner!({
      id: this.focusedId,
      newOwner: this.newOwner
    });
  }

  async tokenOneChanged(tokenAmount: string) {
    this.rateLoading = true;
    try {
      const { opposingAmount } = await this[
        this.withdrawLiquidity
          ? "calculateOpposingWithdraw"
          : "calculateOpposingDeposit"
      ]({
        id: this.focusedId,
        reserve: { id: this.token1Id, amount: tokenAmount }
      });
      this.token2Amount = opposingAmount;
      this.token1Error = "";
      this.token2Error = "";
    } catch (e) {
      this.token1Error = e.message;
      this.token2Error = "";
    }
    this.rateLoading = false;
  }

  async tokenTwoChanged(tokenAmount: string) {
    this.rateLoading = true;
    try {
      const { opposingAmount } = await this[
        this.withdrawLiquidity
          ? "calculateOpposingWithdraw"
          : "calculateOpposingDeposit"
      ]({
        id: this.focusedId,
        reserve: { id: this.token2Id, amount: tokenAmount }
      });
      this.token1Amount = opposingAmount;
      this.token2Error = "";
      this.token1Error = "";
    } catch (e) {
      this.token1Error = "";
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
      case "deleteRelay":
        return this.deleteRelay();
      default:
        this.withdrawLiquidity ? this.remove() : this.add();
    }
  }

  async deleteRelay() {
    await this.removeRelay!(this.focusedId);
    this.$router.push({ name: "Relays" });
  }

  async setFee() {
    const feeDec = this.feeAmount / 100;
    this.updateFee!({ fee: feeDec, id: this.focusedId });
  }

  async remove() {
    this.sections = [];
    this.txModal = true;
    this.error = "";
    this.success = "";

    try {
      this.txBusy = true;
      const txResult = await this.removeLiquidity({
        id: this.focusedId,
        reserves: [
          { id: this.token1Id, amount: this.token1Amount },
          { id: this.token2Id, amount: this.token2Amount }
        ],
        onUpdate: this.onUpdate
      });
      this.fetchBalances();
      wait(7000).then(() => this.fetchBalances());
      this.success = txResult;
    } catch (e) {
      this.error = e.message;
    }
    this.txBusy = false;
  }

  onUpdate(stepIndex: number, steps: Step[]) {
    this.stepIndex = stepIndex;
    this.sections = steps;
  }

  async add() {
    this.sections = [];
    this.txModal = true;
    this.error = "";
    this.success = "";

    try {
      this.txBusy = true;
      const txResult = await this.addLiquidity({
        id: this.focusedId,
        reserves: [
          { id: this.token1Id, amount: this.token1Amount },
          { id: this.token2Id, amount: this.token2Amount }
        ],
        onUpdate: this.onUpdate
      });
      this.fetchBalances();
      wait(7000).then(() => this.fetchBalances());
      this.success = txResult;
      // @ts-ignore
      this.$analytics.logEvent("Fund", { txId: txResult });
    } catch (e) {
      this.error = e.message;
      // @ts-ignore
      this.$analytics.logEvent("exception", {
        description: `${this.isAuthenticated} recieved error ${e.message} while attempting a fund action, ${this.token1Amount} ${this.token1Id} + ${this.token2Amount} ${this.token2Id}`
      });
    }
    this.txBusy = false;
  }

  get defaultFocusedId() {
    return this.relays.find(
      relay => relay.addLiquiditySupported && relay.removeLiquiditySupported
    )!.id;
  }

  get focusedId() {
    return this.$route.params.account || this.defaultFocusedId;
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
    this.withdrawLiquidity = to.params.mode == "liquidate";
  }

  @Watch("focusedId")
  reserveChange(id: string) {
    this.relay(id).reserves.forEach(reserve => this.focusSymbol(reserve.id));
    this.fetchBalances();
  }

  updateMaxBalances(balances: ViewAmount[]) {
    const [token1Balance, token2Balance] = sortByNetworkTokens(
      balances,
      balance => balance.id,
      [this.token1Id]
    );
    this.token1MaxWithdraw = Number(token1Balance.amount);
    this.token2MaxWithdraw = Number(token2Balance.amount);
  }

  async fetchBalances() {
    if (!this.isAuthenticated) return;
    const { maxWithdrawals, smartTokenBalance } = await this.getUserBalances(
      this.focusedId
    );
    this.updateMaxBalances(maxWithdrawals);

    this.smartUserBalance = smartTokenBalance;
  }

  async created() {
    this.fetchBalances();
    this.focusSymbol(this.token1Id);
    this.focusSymbol(this.token2Id);
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
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(75px);
  opacity: 0;
}

.slide-fade-up-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
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
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(-75px);
  opacity: 0;
}

.slide-fade-down-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(75px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to
/* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
