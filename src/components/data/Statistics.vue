<template>
  <b-row>
    <b-col md="6" lg="3" class="mb-4 mb-lg-0">
      <statistics-data-block
        title="Bancor Eth Price"
        value="123,456,789.00 ETH"
        :percentage="-0.89"
      />
    </b-col>
    <b-col md="6" lg="3" class="mb-4 mb-lg-0">
      <statistics-data-block
        title="Total Liquidity"
        value="123,456,789.00 ETH"
        :percentage="+0.89"
      />
    </b-col>
    <b-col md="6" lg="3" class="mb-4 mb-md-0 mb-lg-0">
      <statistics-data-block
        title="24hrs Volume"
        value="123,456,789.00 ETH"
        :percentage="-0.89"
      />
    </b-col>
    <b-col md="6" lg="3">
      <statistics-data-block
        title="24hrs Transactions"
        value="123,456,789.00 ETH"
        :percentage="+0.89"
      />
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { vxm } from "@/store";
import StatisticsDataBlock from "@/components/data/StatisticsDataBlock.vue";

@Component({
  components: { StatisticsDataBlock }
})
export default class Statistics extends Vue {
  get network() {
    return this.$route.params.service;
  }

  get name() {
    return this.network.toUpperCase();
  }
}
</script>

<style lang="scss"></style>
