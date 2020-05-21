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
        </div>
        <div :class="classes">
          <b-spinner
            v-if="loading"
            style="display: block; width: 10rem; height: 10rem;"
            class="text-dark"
            label="Loading..."
          ></b-spinner>
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

import Highcharts, { getOptions } from "highcharts";
import stockInit from "highcharts/modules/stock";

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

  get classes() {
    return [
      "block-content",
      "px-0",
      "px-md-3",
      "main",
      ...(this.loading ? ["d-flex", "justify-content-center"] : [])
    ];
  }

  goBack() {
    this.$router.push({
      name: "Relay",
      params: { account: this.focusedSymbolName }
    });
  }

  setChartData(data: HistoryRow[]) {
    const selectedData = data.sort((a, b) => a.timestamp - b.timestamp);
    console.log(selectedData, "should be newest data");

    let cumulative_dm_roi: any[] = [];
    let loss: any[] = [];
    let net_position: any[] = [];
    let price_ratio;
    let cur_loss;

    let dm_roi = 1;
    let initial_price = 0;

    selectedData.forEach((data, index, arr) => {
      let { timestamp, roi, tradeVolume, tokenPrice } = data;

      if (initial_price == 0) {
        initial_price = tokenPrice;
      }

      dm_roi *= roi;
      price_ratio = tokenPrice / initial_price;
      cur_loss = (2.0 * Math.sqrt(price_ratio)) / (1.0 + price_ratio);

      cumulative_dm_roi.push([
        timestamp,
        parseFloat(((dm_roi - 1) * 100).toFixed(2))
      ]);

      loss.push([timestamp, parseFloat(((cur_loss - 1) * 100).toFixed(2))]);

      net_position.push([
        timestamp,
        parseFloat(((cur_loss * dm_roi - 1) * 100).toFixed(2))
      ]);
    });

    console.log(
      cumulative_dm_roi,
      loss,
      net_position,
      "was the calculated data..."
    );

    const colours = Highcharts.getOptions().colors!;

    const series = [
      {
        name: "Collected Fees",
        color: colours[5],
        tooltip: {
          valueSuffix: "%"
        },
        yAxis: 0,
        zIndex: 1,
        data: cumulative_dm_roi
      },
      {
        name: "Impermanent Loss",
        color: colours[0],
        yAxis: 0,
        zIndex: 1,
        data: loss,
        tooltip: {
          valueSuffix: "%"
        }
      },
      {
        name: "Net Profit",
        color: colours[6],
        yAxis: 0,
        zIndex: 1,
        tooltip: {
          valueSuffix: "%"
        },
        data: net_position
      }
    ];

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
      series
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

<style lang="scss">
.main {
  padding-bottom: 10px;
}
</style>
