<template>
  <b-container fluid="xl">
    <b-row>
      <b-col cols="12" class="px-1 px-md-3 px-xl-0">
        <content-block title="Statistics">
          <p>test</p>
        </content-block>

        <content-block :no-header="true">
          <p class="m-0 p-0">test</p>
        </content-block>

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

@Component({
  components: {
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
