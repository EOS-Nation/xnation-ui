<template>
  <div>
    <label-content-split label="Your Liquidity" />
    <div class="block block-rounded block-bordered">
      <!-- below just testing -->
      <div class="block-content">
        <main-button v-b-toggle="'collapse-x'" label="USD/BNT" />
        <b-collapse :id="'collapse-x'" accordion="liquidityPools" class="mt-2">
          <p class="card-text">Data goes here</p>
          <b-row>
            <b-col cols="6" class="pr-1">
              <main-button label="Add Liquidity" :active="true" />
            </b-col>
            <b-col cols="6" class="pl-1">
              <main-button label="Remove Liquidity" />
            </b-col>
          </b-row>
        </b-collapse>
      </div>
      <!-- above hardcoded for testing and below array with all pools as prop?? -->
      <div
        v-for="(pool, index) in liquidPools"
        :key="index"
        class="block-content"
      >
        <main-button
          v-b-toggle="'collapse-' + `${index}`"
          :label="pool.symbol"
        />
        <b-collapse
          :id="'collapse-' + index"
          accordion="liquidityPools"
          class="mt-2"
        >
          <p class="card-text">Data goes here</p>
          <b-row>
            <b-col cols="6" class="pr-1">
              <main-button label="Add Liquidity" :active="true" />
            </b-col>
            <b-col cols="6" class="pl-1">
              <main-button label="Remove Liquidity" />
            </b-col>
          </b-row>
        </b-collapse>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue, Prop } from "vue-property-decorator";
import { vxm } from "@/store";
import LabelContentSplit from "@/components/common-v2/LabelContentSplit.vue";
import { ViewReserve } from "@/types/bancor";
import MainButton from "@/components/common/Button.vue";

@Component({
  components: { LabelContentSplit, MainButton }
})
export default class YourLiquidity extends Vue {
  @Prop({ default: [] }) liquidPools!: ViewReserve[];

  get darkMode() {
    return vxm.general.darkMode;
  }
}
</script>

<style scoped lang="scss"></style>
