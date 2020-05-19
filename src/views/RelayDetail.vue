<template>
  <div>
    <div class="container-md d-md-block content content-boxed">
      <div class="block">
        <div class="block-header">
          <h3 class="block-title">
            <font-awesome-icon
              icon="arrow-left"
              fixed-width
              @click="goBack"
              :style="{ color: 'black' }"
            />
          </h3>
          <div class="block-options">
            <p>yeah mate {{ focusedSymbolName }}</p>
          </div>
        </div>
        <div class="block-content px-0 px-md-3 ">
          <h3 v-if="loading">LOADING!</h3>
          <div v-else>
            <chart :chartdata="chartData" :options="chartOptions" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { vxm } from "@/store";
import { SimpleToken, HistoryRow } from "@/types/bancor";
import wait from "waait";
import Chart from "./Chart.vue";
import moment from "moment";

@Component({
  components: {
    Chart
  }
})
export default class RelayDetail extends Vue {
  loading = true;
  data: HistoryRow[] = [];

  chartData = {};
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false
  };

  get focusedSymbolName() {
    return this.$router.currentRoute.params.account;
  }

  goBack() {
    this.$router.push({ name: "Relays" });
  }

  setChartData(data: HistoryRow[]) {
    console.log(data, "was received by the chart data");

    const selectedData = data.sort((a, b) => a.timestamp - b.timestamp);
    console.log(selectedData, "should be newest data");

    const chartData = {
      labels: selectedData.map(x =>
        moment(x.timestamp).format("MMMM Do YYYY")
      ),
      datasets: [
        {
          label: "ROI",
          backgroundColor: "pink",
          data: selectedData.map(x => x.roi)
        },
        {
          label: "Token Price",
          backgroundColor: "blue",
          data: selectedData.map(x => x.tokenPrice)
        }
      ]
    };
    this.chartData = chartData;
    this.loading = false;
  }

  async fetchData() {
    this.loading = true;
    const data = await vxm.bancor.fetchHistoryData(this.focusedSymbolName);
    this.data = data;
    this.setChartData(data);
  }

  created() {
    this.fetchData();
  }
}
</script>

<style lang="scss"></style>
