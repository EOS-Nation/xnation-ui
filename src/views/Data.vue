<template>
  <b-container fluid="xl" class="px-xl-0">
    <b-row>
      <b-col cols="12">
        <content-block title="Statistics">
          <statistics />
        </content-block>
      </b-col>
      <b-col md="6">
        <content-block title="Liquidity">
          <liquidity-chart />
        </content-block>
      </b-col>
      <b-col md="6">
        <content-block title="Volume">
          <liquidity-chart />
        </content-block>
      </b-col>
      <b-col>
        <tokens-table
          :loading="false"
          :name="name"
          :tokens="tokens"
          @convert="onConvert"
          @transfer="onTransfer"
          scrollToTop
        />
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { vxm } from "@/store";
import TokensTable from "@/components/tables/TokensTable.vue";
import { SimpleToken } from "@/types/bancor";
import ContentBlock from "@/components/common/ContentBlock.vue";
import Statistics from "@/components/data/Statistics.vue";
import LiquidityChart from "@/components/data/charts/LiquidityChart.vue";

@Component({
  components: {
    LiquidityChart,
    Statistics,
    ContentBlock,
    TokensTable
  }
})
export default class Data extends Vue {
  get tokens() {
    return vxm.bancor.tokens;
  }

  get network() {
    return this.$route.params.service;
  }

  get name() {
    return this.network.toUpperCase();
  }

  onConvert(symbolName: string) {
    const { query, params } = this.$route;
    const { base, quote } = query;
    this.$router.push({
      name: "Tokens",
      query: {
        ...query,
        quote: symbolName,
        ...(base == symbolName && { base: quote })
      }
    });
  }

  onTransfer(symbolName: string) {
    this.$router.push({
      name: "Transfer",
      params: { symbolName }
    });
  }
}
</script>

<style lang="scss"></style>
