<template>
  <div>
    <pool-actions-percentages v-if="!advanced" :percentage.sync="percentage" />

    <div v-if="!advanced" class="text-center my-3">
      <font-awesome-icon
        icon="long-arrow-alt-down"
        class="text-primary font-size-16"
      />
    </div>

    <div
      v-if="!advanced"
      class="block block-rounded block-bordered mb-4"
      :class="darkMode ? 'block-light-blue-dark' : 'block-light-blue-light'"
    >
      <div
        v-if="!advanced"
        class="block-content d-flex justify-content-between align-items-center font-size-14 font-w600 pt-2"
        :class="darkMode ? 'text-dark' : 'text-light'"
      >
        <span>?????.??????? <span>(~$??.??)</span></span>
        <div class="d-flex align-items-center">
          <img
            :src="pool.reserves[0].logo"
            class="img-avatar img-avatar20"
            alt="Token Logo"
          />
          <span class="ml-2">{{ pool.reserves[0].symbol }}</span>
        </div>
      </div>

      <div
        v-if="!advanced"
        class="block-content d-flex justify-content-between align-items-center font-size-14 font-w600 py-2"
        :class="darkMode ? 'text-dark' : 'text-light'"
      >
        <span>?????.??????? <span>(~$??.??)</span></span>
        <div class="d-flex align-items-center">
          <img
            :src="pool.reserves[1].logo"
            class="img-avatar img-avatar20"
            alt="Token Logo"
          />
          <span class="ml-2">{{ pool.reserves[1].symbol }}</span>
        </div>
      </div>
    </div>

    <div v-else>
      <token-input-field
        v-if="!advanced"
        label="Input"
        :amount.sync="amountSmartToken"
        :pool="pool"
        class="mt-4"
      />

      <div v-if="!advanced" class="text-center my-3">
        <font-awesome-icon
          icon="long-arrow-alt-down"
          class="text-primary font-size-16"
        />
      </div>
      <token-input-field
        label="Output"
        :amount.sync="amountToken1"
        @update:amount="tokenOneChanged"
        :token="pool.reserves[0]"
        class="my-3"
      />

      <div class="text-center my-3">
        <font-awesome-icon icon="plus" class="text-primary font-size-16" />
      </div>
      <token-input-field
        label="Output"
        :amount.sync="amountToken2"
        @update:amount="tokenTwoChanged"
        :token="pool.reserves[1]"
      />
    </div>

    <label-content-split
      label="Price"
      :value="
        `1 ${pool.reserves[1].symbol} = ${rate} ${pool.reserves[0].symbol}`
      "
      class="my-3"
    />
    <div
      v-if="!advanced"
      class="font-size-12 font-w600 text-center"
      :class="darkMode ? 'text-link-dark' : 'text-link-light'"
    >
      <span class="cursor" @click="advanced = !advanced">
        {{ advanced ? "Simple" : "Advanced" }}
      </span>
    </div>

    <main-button
      @click.native="$bvModal.show('modal-pool-action')"
      label="Remove"
      :active="true"
      :large="true"
      class="mt-1"
      :disabled="!(amountToken1 && amountToken2)"
    />

    <modal-pool-action
      :amounts-array="[amountSmartToken, amountToken1, amountToken2]"
      :advanced-block-items="advancedBlockItems"
    />
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
import PoolActionsPercentages from "@/components/pool/PoolActionsPercentages.vue";
import ModalPoolAction from "@/components/pool/ModalPoolAction.vue";
import { namespace } from "vuex-class";

const bancor = namespace("bancor");

@Component({
  components: {
    ModalPoolAction,
    PoolActionsPercentages,
    LabelContentSplit,
    TokenInputField,
    PoolLogos,
    MainButton
  }
})
export default class PoolActionsRemoveV1 extends Vue {
  @bancor.Action
  calculateOpposingDeposit!: LiquidityModule["calculateOpposingDeposit"];
  @bancor.Action
  calculateOpposingWithdraw!: LiquidityModule["calculateOpposingWithdraw"];

  @Prop() pool!: ViewRelay;

  advanced = true;
  rateLoading = false;

  // selectedToken: ViewReserve = this.pool.reserves[0];
  percentage: string = "50";
  rate = "??????.?????";

  amountSmartToken = "";
  amountToken1 = "";
  amountToken2 = "";

  token1Error = "";
  token2Error = "";

  get advancedBlockItems() {
    return [
      {
        label: "UNI Burned",
        value: "????"
      },
      {
        label: "Price",
        value: "????"
      },
      {
        label: "",
        value: "??.??"
      }
    ];
  }

  async tokenOneChanged(tokenAmount: string) {
    if (tokenAmount === "") {
      this.amountToken2 = "";
      return;
    }
    this.rateLoading = true;
    try {
      const results = await this.calculateOpposingWithdraw({
        id: this.pool.id,
        reserve: { id: this.pool.reserves[0].id, amount: this.amountToken1 }
      });
      this.token1Error = "";
      this.token2Error = "";
      if (typeof results.opposingAmount !== "undefined") {
        this.amountToken2 = results.opposingAmount;
      }
      // this.shareOfPool = results.shareOfPool;
      // this.setSingleUnitCosts(results.singleUnitCosts);
    } catch (e) {
      this.token1Error = e.message;
      this.token2Error = "";
    }
    this.rateLoading = false;
  }

  async tokenTwoChanged(tokenAmount: string) {
    if (tokenAmount === "") {
      this.amountToken1 = "";
      return;
    }
    this.rateLoading = true;
    try {
      const results = await this.calculateOpposingWithdraw({
        id: this.pool.id,
        reserve: { id: this.pool.reserves[1].id, amount: this.amountToken2 }
      });
      this.token1Error = "";
      this.token2Error = "";
      if (typeof results.opposingAmount !== "undefined") {
        this.amountToken1 = results.opposingAmount;
      }
      // this.shareOfPool = results.shareOfPool;
      // this.setSingleUnitCosts(results.singleUnitCosts);
    } catch (e) {
      this.token1Error = e.message;
      this.token2Error = "";
    }
    this.rateLoading = false;
  }

  get darkMode() {
    return vxm.general.darkMode;
  }

  // @Watch("pool")
  // async updateSelection(pool: ViewRelay) {
  //   if (pool.reserves[0] === this.selectedToken) return;
  //   this.selectedToken = pool.reserves[0];
  // }
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
