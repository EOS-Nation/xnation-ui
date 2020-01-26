<template>
  <div>
    <div class="d-none d-md-block content content-boxed">
      <tokens-table
        :loading="false"
        :name="name"
        :tokens="filteredTokens"
        @convert="onConvert"
        @transfer="onTransfer"
        v-model="searchTerm"
        scrollToTop
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { vxm } from "@/store";
import TokensTable from "@/components/tables/TokensTable.vue";
import { SimpleToken } from "@/types/bancor";
import Fuse from "fuse.js";

@Component({
  components: {
    TokensTable
  }
})
export default class Token extends Vue {
  searchTerm = "";
  private searchOptions = {
    shouldSort: true,
    threshold: 0.3,
    location: 0,
    distance: 100,
    maxPatternLength: 24,
    minMatchCharLength: 1,
    keys: ["symbol", "name"]
  };

  get filteredTokens() {
    const fuse = new Fuse(vxm.bancor.tokens, this.searchOptions);
    return this.searchTerm == ""
      ? vxm.bancor.tokens
      : fuse.search(this.searchTerm);
  }

  get network() {
    return this.$route.fullPath.split("/")[1];
  }

  get name() {
    return this.network.toUpperCase();
  }

  onConvert(symbolName: string) {
    this.$router.push({
      name: "Token",
      params: { symbolName }
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
