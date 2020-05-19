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
            <highcharts
              :constructor-type="'stockChart'"
              :options="chartOptions"
            />
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
import { Chart } from "highcharts-vue";
import moment from "moment";

import Highcharts from "highcharts";
// import exportingInit from 'highcharts/modules/exporting'
import stockInit from "highcharts/modules/stock";

// exportingInit(Highcharts)

stockInit(Highcharts);

@Component({
  components: {
    highcharts: Chart
  }
})
export default class RelayDetail extends Vue {
  loading = true;
  data: HistoryRow[] = [];

  chartOptions = {};

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
      title: {
        text: this.focusedSymbolName
      },
      subtitle: {
        text: "ROI"
      },
      credits: {
        enabled: false
      },
      legend: {
        enabled: true,
        align: "center"
      },
      yAxis: [
        {
          visible: false,
          title: {
            text: "ROI"
          }
        },
        {
          visible: false,

          title: {
            text: "Token Price"
          }
        },
        {
          visible: false,
          title: {
            text: "Trade Volume"
          }
        }
      ],

      series: [
        {
          name: "ROI",
          yAxis: 0,
          data: selectedData.map(x => [x.timestamp, x.roi])
        },
        {
          name: "Token Price",
          yAxis: 1,
          data: selectedData.map(x => [x.timestamp, x.tokenPrice])
        },
        {
          name: "Trade Volume",
          yAxis: 2,
          data: selectedData.map(x => [x.timestamp, x.tradeVolume])
        }
      ]
    };

    this.chartOptions = chartData;
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
