<template>
  <div>
    <label-content-split label="Pool" class="mb-3">
      <pool-logos
        @click.native="$bvModal.show('modal-join-pool')"
        :pool="pool"
        :dropdown="true"
      />
    </label-content-split>
    <label-content-split label="Select a Token" class="mb-3">
      <b-form-group class="m-0" :class="darkMode ? 'text-dark' : 'text-light'">
        <b-form-radio-group
          id="radio-group"
          v-model="selectedToken"
          name="radio-component"
        >
          <b-form-radio
            v-for="reserve in pool.reserves"
            :name="reserve.symbol"
            :value="reserve"
            :key="reserve.id"
          >
            <div class="d-flex align-items-center">
              <img
                class="img-avatar img-avatar20 mr-1"
                :src="reserve.logo"
                alt="Token Logo"
              />
              <span class="font-w600 font-size-14">{{ reserve.symbol }}</span>
            </div>
          </b-form-radio>
        </b-form-radio-group>
      </b-form-group>
    </label-content-split>
    <token-input-field
      label="Input"
      :token="selectedToken"
      :amount.sync="amount"
      class="mb-3"
    />
    <label-content-split label="Prices and Pool Share" class="mb-1" />
    <main-button
      @click.native="$bvModal.show('modal-pool-action')"
      label="Supply"
      :active="true"
      :large="true"
      class="mt-3"
    />
    <modal-pool-action
      :selected-token="selectedToken"
      :amounts-array="[amount]"
    />
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
import ModalPoolAction from "@/components/pool/ModalPoolAction.vue";
@Component({
  components: {
    ModalPoolAction,
    LabelContentSplit,
    TokenInputField,
    PoolLogos,
    MainButton
  }
})
export default class PoolActionsAddV2 extends Vue {
  @Prop() pool!: ViewRelay;

  selectedToken: ViewReserve = this.pool.reserves[0];
  amount: string = "";

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
