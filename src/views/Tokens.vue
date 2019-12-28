<template>
  <div>
    <!-- Page Content -->
    <div class="d-none d-md-block content content-boxed">
      <tokens-table
        :loading="false"
        :tokens="tokens"
        @convert="onConvert"
        @transfer="onTransfer"
        scrollToTop
      />
    </div>
    <!-- END Page Content -->
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import TokensTable from "@/components/tables/TokensTable.vue";

interface SimpleToken {
  symbol: string;
  name: string;
  price: string;
  liqDepth: number;
}

@Component({
  components: {
    TokensTable
  }
})
export default class Token extends Vue {
  get tokens() {
    const tokens = vxm.relays.tokens.map(token => ({
      symbol: token.symbol,
      name: token.name,
      logo: token.logo,
      price: token.price,
      liqDepth: token.liqDepth
    }));
    return tokens;
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
