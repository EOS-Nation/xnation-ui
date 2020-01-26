<template>
  <div>
    <div class="d-none d-md-block content content-boxed">
      <tokens-table
        :loading="false"
        :name="name"
        :tokens="tokens"
        @convert="onConvert"
        @transfer="onTransfer"
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

  get tokens() {
    return vxm.bancor.tokens;
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
