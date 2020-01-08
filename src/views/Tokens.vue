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

@Component({
  components: {
    TokensTable
  }
})
export default class Token extends Vue {
  searchTerm = "";

  get filteredTokens() {
    return this.searchTerm
      ? vxm.relays.tokens.filter(
          token =>
            token.symbol
              .toLowerCase()
              .includes(this.searchTerm.toLowerCase()) ||
            token.name.toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      : vxm.relays.tokens;
  }

  get network() {
    return this.$route.fullPath.split('/')[1]
  }

  get name() {
    return this.network.toUpperCase()
  } 

  @Watch("searchTerm")
  change(newSearch: string) {
    this.search(newSearch);
  }

  search(searchString: string) {
    console.log("received search string", searchString);
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

  async created() {
    vxm.relays.fetchRelays();
  }
}
</script>

<style lang="scss"></style>
