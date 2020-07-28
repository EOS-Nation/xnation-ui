<template>
  <div>
    <token-input-field
      label="Input"
      :token="pool.reserves[0]"
      :amount.sync="amount1"
      class="mb-3"
      @update:amount="tokenOneChanged"
    />
    <token-input-field
      label="Input"
      :token="pool.reserves[1]"
      :amount.sync="amount2"
      class="mb-3"
      @update:amount="tokenTwoChanged"
    />
    <label-content-split label="Prices and Pool Share" class="mb-1" />
    <main-button
      @click.native="$bvModal.show('modal-pool-action')"
      label="Supply"
      :active="true"
      :large="true"
      class="mt-3"
      :loading="rateLoading"
    />
    <modal-pool-action :amounts-array="[smartTokenAmount, amount1, amount2]" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { vxm } from "@/store/";
import { LiquidityModule, ViewRelay, ViewReserve } from "@/types/bancor";
import PoolLogos from "@/components/common/PoolLogos.vue";
import TokenInputField from "@/components/common-v2/TokenInputField.vue";
import MainButton from "@/components/common/Button.vue";
import LabelContentSplit from "@/components/common-v2/LabelContentSplit.vue";
import ModalPoolAction from "@/components/pool/ModalPoolAction.vue";
import { namespace } from "vuex-class";

const bancor = namespace("bancor");

@Component({
  components: {
    ModalPoolAction,
    LabelContentSplit,
    TokenInputField,
    PoolLogos,
    MainButton
  }
})
export default class PoolActionsAddV1 extends Vue {
  @bancor.Action
  calculateOpposingDeposit!: LiquidityModule["calculateOpposingDeposit"];
  @bancor.Action
  calculateOpposingWithdraw!: LiquidityModule["calculateOpposingWithdraw"];

  @Prop() pool!: ViewRelay;

  smartTokenAmount: string = "0";
  amount1: string = "";
  amount2: string = "";

  rateLoading = false;

  token1Error = "";
  token2Error = "";

  get withdrawLiquidity() {
    return this.$route.params.poolAction === "remove";
  }

  async tokenOneChanged(tokenAmount: string) {
    if (tokenAmount === "") {
      this.amount2 = "";
      return;
    }
    this.rateLoading = true;
    try {
      const { opposingAmount } = await this[
        this.withdrawLiquidity
          ? "calculateOpposingWithdraw"
          : "calculateOpposingDeposit"
      ]({
        id: this.pool.id,
        reserve: { id: this.pool.reserves[0].id, amount: this.amount1 }
      });
      this.token1Error = "";
      this.token2Error = "";
      if (typeof opposingAmount !== "undefined") {
        this.amount2 = opposingAmount;
      }
    } catch (e) {
      this.token1Error = e.message;
      this.token2Error = "";
    }
    this.rateLoading = false;
  }

  async tokenTwoChanged(tokenAmount: string) {
    if (tokenAmount === "") {
      this.amount1 = "";
      return;
    }
    this.rateLoading = true;
    try {
      const { opposingAmount } = await this[
        this.withdrawLiquidity
          ? "calculateOpposingWithdraw"
          : "calculateOpposingDeposit"
      ]({
        id: this.pool.id,
        reserve: { id: this.pool.reserves[1].id, amount: this.amount2 }
      });
      this.token1Error = "";
      this.token2Error = "";
      if (typeof opposingAmount !== "undefined") {
        this.amount1 = opposingAmount;
      }
    } catch (e) {
      this.token1Error = e.message;
      this.token2Error = "";
    }
    this.rateLoading = false;
  }

  get darkMode() {
    return vxm.general.darkMode;
  }

  @Watch("pool")
  async updateSelection(pool: ViewRelay) {
    if (pool.reserves[0] === this.selectedToken) return;
    this.selectedToken = pool.reserves[0];
  }
}
</script>

<style lang="scss">
.custom-control-inline {
  margin-right: 0 !important;
  margin-left: 1rem !important;
}
.custom-control-label {
  display: inline-flex !important;
  align-items: center !important;
}
</style>
