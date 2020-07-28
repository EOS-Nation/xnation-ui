<template>
  <div class="mt-3">
    <token-input-field
      label="Input"
      :token="pool.reserves[0]"
      :amount.sync="amount1"
      @update:amount="tokenOneChanged"
    />
    <div class="text-center my-3">
      <font-awesome-icon icon="plus" class="text-primary font-size-16" />
    </div>
    <token-input-field
      label="Input"
      :token="pool.reserves[1]"
      :amount.sync="amount2"
      class="mb-3"
      @update:amount="tokenTwoChanged"
    />
    <rate-share-block :pool="pool" :share-of-pool="shareOfPool" />
    <main-button
      @click.native="$bvModal.show('modal-pool-action')"
      label="Supply"
      :active="true"
      :large="true"
      class="mt-3"
      :loading="rateLoading"
      :disabled="!amount1 && !amount2"
    />
    <modal-pool-action
      :amounts-array="[smartTokenAmount, amount1, amount2]"
      :advanced-block-items="advancedBlockItems"
    />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { vxm } from "@/store/";
import {
  LiquidityModule,
  OpposingLiquid,
  ViewRelay,
  ViewReserve
} from "@/types/bancor";
import PoolLogos from "@/components/common/PoolLogos.vue";
import TokenInputField from "@/components/common-v2/TokenInputField.vue";
import MainButton from "@/components/common/Button.vue";
import LabelContentSplit from "@/components/common-v2/LabelContentSplit.vue";
import ModalPoolAction from "@/components/pool/ModalPoolAction.vue";
import { namespace } from "vuex-class";
import RateShareBlock from "@/components/common-v2/RateShareBlock.vue";
import numeral from "numeral";

const bancor = namespace("bancor");

@Component({
  components: {
    RateShareBlock,
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

  smartTokenAmount: string = "??.??????";
  amount1: string = "";
  amount2: string = "";

  shareOfPool = 0;

  rateLoading = false;

  token1Error = "";
  token2Error = "";

  get withdrawLiquidity() {
    return this.$route.params.poolAction === "remove";
  }

  get share() {
    if (this.shareOfPool === 0) return "0";
    else {
      const share = this.shareOfPool;
      if (share < 0.00001) return "< 0.00001";
      else if (share < 1) return numeral(share).format("0.00000");
      else return numeral(share).format("0.00");
    }
  }

  get advancedBlockItems() {
    return [
      {
        label: this.pool.reserves[0].symbol + " Deposit",
        value: this.amount1
      },
      {
        label: this.pool.reserves[1].symbol + " Deposit",
        value: this.amount2
      },
      {
        label: "Rates",
        value: "????"
      },
      {
        label: "",
        value: "????"
      },
      {
        label: "Share of Pool",
        value: this.share + "%"
      }
    ];
  }

  async tokenOneChanged(tokenAmount: string) {
    if (tokenAmount === "") {
      this.amount2 = "";
      this.shareOfPool = 0;
      return;
    }
    this.rateLoading = true;
    try {
      const results = await this.calculateOpposingDeposit({
        id: this.pool.id,
        reserve: { id: this.pool.reserves[0].id, amount: this.amount1 }
      });
      this.token1Error = "";
      this.token2Error = "";
      if (typeof results.opposingAmount !== "undefined") {
        this.amount2 = results.opposingAmount;
      }
      if (typeof results.shareOfPool !== "undefined") {
        this.shareOfPool = results.shareOfPool;
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
      this.shareOfPool = 0;
      return;
    }
    this.rateLoading = true;
    try {
      const results = await this.calculateOpposingDeposit({
        id: this.pool.id,
        reserve: { id: this.pool.reserves[1].id, amount: this.amount2 }
      });
      this.token1Error = "";
      this.token2Error = "";
      if (typeof results.opposingAmount !== "undefined") {
        this.amount1 = results.opposingAmount;
      }
      if (typeof results.shareOfPool !== "undefined") {
        this.shareOfPool = results.shareOfPool;
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
