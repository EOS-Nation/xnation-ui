<template>
  <div>
    <label-content-split :label="label" class="mb-1">
      <span class="font-size-12 font-w500">Balance: ???.??? (~$??.??)</span>
    </label-content-split>
    <b-input-group>
      <b-form-input
        type="text"
        debounce="500"
        v-model="tokenAmount"
        :class="darkMode ? 'form-control-alt-dark' : 'form-control-alt-light'"
        placeholder="Enter Amount"
      ></b-form-input>
      <b-input-group-append :class="{ cursor: pool }">
        <div
          class="rounded-right d-flex align-items-center px-2"
          :class="darkMode ? 'bg-body-dark' : 'bg-light'"
        >
          <div v-if="token" class="d-flex align-items-center">
            <img
              class="img-avatar img-avatar32 border-colouring bg-white mr-1"
              :src="token.logo"
              alt="Token Logo"
            />
            <span class="px-1">{{ token.symbol }}</span>
          </div>
          <div v-else>
            <pool-logos
              @click.native="$bvModal.show('modal-join-pool')"
              :pool="pool"
              :dropdown="true"
            />
          </div>
        </div>
      </b-input-group-append>
    </b-input-group>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch, PropSync } from "vue-property-decorator";
import { vxm } from "@/store/";
import { ViewRelay, ViewReserve } from "@/types/bancor";
import LabelContentSplit from "@/components/common-v2/LabelContentSplit.vue";
import PoolLogos from "@/components/common/PoolLogos.vue";

@Component({
  components: { PoolLogos, LabelContentSplit }
})
export default class TokenInputField extends Vue {
  @Prop() label!: string;
  @Prop() token?: ViewReserve;
  @Prop() pool?: ViewRelay;
  @PropSync("amount", { type: String }) tokenAmount!: string;
  @Prop({ default: false }) dropdown!: boolean;

  get darkMode() {
    return vxm.general.darkMode;
  }

  @Watch("token")
  async onTokenChange(token: ViewReserve) {
    // update balance
  }
}
</script>

<style scoped lang="scss"></style>
