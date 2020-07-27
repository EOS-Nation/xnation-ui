<template>
  <div v-if="!pool.v2">
    <div class="d-flex justify-content-between">
      <span>Pool</span>
      <span @click="$bvModal.show('modal-join-pool')">{{
        pool.smartTokenSymbol
      }}</span>
    </div>
    <div class="d-flex justify-content-between">
      <span>Select a Token</span>
      <b-form-group class="d-flex justify-content-between">
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
              {{ reserve.symbol }}
            </div>
          </b-form-radio>
        </b-form-radio-group>
      </b-form-group>
    </div>
    {{ selectedToken.symbol }}
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

@Component({
  components: { HeroRelay }
})
export default class PoolActionsAdd extends Vue {
  @Prop() pool!: ViewRelay;

  selectedToken: ViewReserve = this.pool.reserves[0];

  @Watch("pool")
  async updateSelection(pool: ViewRelay) {
    if (pool.reserves[0] === this.selectedToken) return;
    this.selectedToken = pool.reserves[0];
  }
}
</script>

<style scoped lang="scss">
.custom-control-inline {
  margin-right: 0 !important;
  margin-left: 1rem !important;
}
</style>
