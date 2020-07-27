<template>
  <div>
    <pool-actions-percentages :percentage.sync="percentage" />

    <div
      v-if="!advanced"
      class="block block-rounded block-bordered my-4"
      :class="darkMode ? 'block-light-blue-dark' : 'block-light-blue-light'"
    >
      <div
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
        label="Input"
        :amount.sync="amountSmartToken"
        :pool="pool"
        class="mt-4"
      />

      <token-input-field
        label="Input"
        :amount.sync="amountToken1"
        :token="pool.reserves[0]"
        class="my-3"
      />

      <token-input-field
        label="Input"
        :amount.sync="amountToken2"
        :token="pool.reserves[1]"
      />
    </div>

    <label-content-split label="Price" class="my-3">
      <span
        class="font-size-12 font-w600"
        :class="darkMode ? 'text-dark' : 'text-light'"
      >
        {{
          `1 ${pool.reserves[1].symbol} = ${rate} ${pool.reserves[0].symbol}`
        }}
      </span>
    </label-content-split>

    <div
      class="font-size-12 font-w600 text-center"
      :class="darkMode ? 'text-link-dark' : 'text-link-light'"
    >
      <span class="cursor" @click="advanced = !advanced">
        {{ advanced ? "Simple" : "Advanced" }}
      </span>
    </div>

    <main-button label="Remove" :active="true" :large="true" class="mt-1" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { vxm } from "@/store/";
import { ViewRelay, ViewReserve } from "@/types/bancor";
import PoolLogos from "@/components/common/PoolLogos.vue";
import TokenInputField from "@/components/common-v2/TokenInputField.vue";
import MainButton from "@/components/common/Button.vue";
import LabelContentSplit from "@/components/common-v2/LabelContentSplit.vue";
import PoolActionsPercentages from "@/components/pool/PoolActionsPercentages.vue";
@Component({
  components: {
    PoolActionsPercentages,
    LabelContentSplit,
    TokenInputField,
    PoolLogos,
    MainButton
  }
})
export default class PoolActionsRemoveV2 extends Vue {
  @Prop() pool!: ViewRelay;

  advanced = false;
  selectedToken: ViewReserve = this.pool.reserves[0];
  percentage: number = 50;
  rate = "??????.?????";

  amountSmartToken = 0;
  amountToken1 = 0;
  amountToken2 = 0;

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
