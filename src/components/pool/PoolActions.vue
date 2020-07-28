<template>
  <content-block>
    <template slot="header">
      <pool-actions-header
        :withdraw-liquidity="withdrawLiquidity"
        :v2="pool.v2"
      />
    </template>

    <pool-actions-add v-if="!withdrawLiquidity" :pool="pool" />
    <pool-actions-remove v-else :pool="pool" />
  </content-block>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store/";
import ContentBlock from "@/components/common/ContentBlock.vue";
import { ViewRelay } from "@/types/bancor";
import PoolActionsHeader from "@/components/pool/PoolActionsHeader.vue";
import PoolActionsAdd from "@/components/pool/PoolActionsAdd.vue";
import PoolActionsRemove from "@/components/pool/PoolActionsRemove.vue";

@Component({
  components: {
    PoolActionsAdd,
    PoolActionsRemove,
    PoolActionsHeader,
    ContentBlock
  }
})
export default class PoolActions extends Vue {
  withdrawLiquidity = true;

  get pool(): ViewRelay {
    return vxm.bancor.relay(this.$route.params.account);
  }

  created() {
    this.withdrawLiquidity = this.$route.params.poolAction === "remove";
  }
}
</script>

<style scoped lang="scss"></style>
