<template>
  <div v-if="!pool.v2" class="mt-3">
    <pool-actions-remove-v2 :pool="pool" />
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
import PoolActionsRemoveV2 from "@/components/pool/PoolActionsRemoveV2.vue";
@Component({
  components: {
    PoolActionsRemoveV2,
    HeroRelay
  }
})
export default class PoolActionsRemove extends Vue {
  @Prop() pool!: ViewRelay;
}
</script>

<style lang="scss"></style>
