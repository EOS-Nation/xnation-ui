<template>
  <div>
    <label-content-split label="Prices and Pool Share" class="mb-1" />
    <div
      class="block block-rounded block-bordered"
      :class="darkMode ? 'block-light-blue-dark' : 'block-light-blue-light'"
    >
      <div class="block-content py-2">
        <b-row>
          <b-col cols="4" class="text-center">
            <div>
              <span
                class="font-size-12"
                :class="darkMode ? 'text-dark' : 'text-light'"
                >??.??</span
              >
            </div>

            <span
              class="font-size-12 font-w500"
              :class="darkMode ? 'text-muted-dark' : 'text-muted-light'"
            >
              {{ pool.reserves[1].symbol }} per {{ pool.reserves[0].symbol }}
            </span>
          </b-col>
          <b-col cols="4" class="text-center">
            <div>
              <span
                class="font-size-12"
                :class="darkMode ? 'text-dark' : 'text-light'"
              >
                ??.??
              </span>
            </div>

            <span
              class="font-size-12 font-w500"
              :class="darkMode ? 'text-muted-dark' : 'text-muted-light'"
            >
              {{ pool.reserves[0].symbol }} per {{ pool.reserves[1].symbol }}
            </span>
          </b-col>
          <b-col cols="4" class="text-center">
            <div>
              <span
                class="font-size-12"
                :class="darkMode ? 'text-dark' : 'text-light'"
                >{{ share }}%</span
              >
            </div>

            <span
              class="font-size-12 font-w500"
              :class="darkMode ? 'text-muted-dark' : 'text-muted-light'"
            >
              Share of Pool
            </span>
          </b-col>
        </b-row>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch, PropSync } from "vue-property-decorator";
import { vxm } from "@/store/";
import LabelContentSplit from "@/components/common-v2/LabelContentSplit.vue";
import { OpposingLiquid, ViewRelay } from "@/types/bancor";
import numeral from "numeral";

@Component({
  components: { LabelContentSplit }
})
export default class RateShareBlock extends Vue {
  @Prop() pool!: ViewRelay;
  @Prop() shareOfPool!: number;
  numeral = numeral;

  get share() {
    if (!this.shareOfPool) return "0";
    else {
      const share = this.shareOfPool;
      if (share < 0.00001) return "< 0.00001";
      else if (share < 1) return numeral(share).format("0.00000");
      else return numeral(share).format("0.00");
    }
  }

  get darkMode() {
    return vxm.general.darkMode;
  }
}
</script>

<style scoped lang="scss"></style>
