<template>
  <div v-if="!pool.v2" class="mt-3">
    <pool-actions-add-v2 :pool="pool" />
  </div>
  <div v-else>
    <hero-relay />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { vxm } from "@/store/";
import { ViewRelay, ViewReserve } from "@/types/bancor";
import HeroRelay from "@/components/hero/sub/HeroRelay.vue";
import PoolActionsAddV2 from "@/components/pool/PoolActionsAddV2.vue";
@Component({
  components: {
    PoolActionsAddV2,
    HeroRelay
  }
})
export default class PoolActionsAdd extends Vue {
  @Prop() pool!: ViewRelay;
}
</script>

<style lang="scss"></style>
