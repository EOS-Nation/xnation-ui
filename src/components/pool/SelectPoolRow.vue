<template>
  <div
    class="font-w600 font-size-14 d-flex align-items-center justify-content-between"
    :class="darkMode ? 'text-dark' : 'text-light'"
  >
    <div>
      <img
        class="img-avatar img-avatar32 bg-white"
        :src="pool.reserves[0].logo"
        alt="Token Logo"
      />
      <img
        class="img-avatar img-avatar32 bg-white overlap"
        :src="pool.reserves[1].logo"
        alt="Token Logo"
      />
      <span class="ml-2 mr-2">{{ pool.smartTokenSymbol }}</span>
      <b-badge variant="primary" class="px-2">{{
        pool.v2 ? "V2" : "V1"
      }}</b-badge>
    </div>
    <span>~$??.??</span>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { ViewRelay } from "@/types/bancor";
import { vxm } from "@/store";

@Component({
  components: {}
})
export default class SelectPoolRow extends Vue {
  @Prop() pool!: ViewRelay;

  get darkMode() {
    return vxm.general.darkMode;
  }
}
</script>

<style scoped lang="scss">
@import "../../assets/_scss/custom/variables";

.overlap {
  margin-left: -10px;
}
</style>
