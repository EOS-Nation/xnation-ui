<template>
  <div>
    <div class="content content-boxed">
      <div class="block">
        <div class="block-header">
          <h3 class="block-title">
            ETH
            <small>Relays</small>
          </h3>
          <div class="block-options">
            <b-form-input
              class="form-control form-control-alt"
              v-model="tokenSearch"
              placeholder="Search Token"
            ></b-form-input>
          </div>
        </div>
        <div class="block-content">
          <table class="table table-striped table-vcenter">
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">#</th>
                <th
                  @click="sort('symbol')"
                  colspan="2"
                  class="cursor"
                  style="min-width: 260px;"
                >
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="symbol"
                  />Token
                </th>
                <th @click="sort('contract')" class="cursor text-center">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="contract"
                  />Owner
                </th>
                <th @click="sort('ratio1')" class="cursor text-center">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="ratio1"
                  />Ratio
                </th>
                <th @click="sort('liqDepth')" class="cursor text-right">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="liqDepth"
                  />Liquidity Depth
                </th>
                <th @click="sort('fee')" class="cursor text-right">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="fee"
                  />Fee
                </th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(token, index) in tokens" :key="index">
                <td class="text-center" v-text="index + 1"></td>
                <td class="text-left font-w700" style="width: 180px">
                  <img
                    v-for="reserve in token.reserves"
                    :key="reserve.symbol"
                    class="img-avatar img-avatar-thumb img-avatar32 mr-3"
                    :src="reserve.logo"
                    :alt="`${reserve.symbol} Token Logo`"
                  />
                  {{ token.symbol }}
                </td>
                <td>
                  <span class="text-muted font-size-sm">
                    {{ token.smartTokenSymbol }}
                  </span>
                </td>
                <td class="text-center font-w700">
                  {{ shortenEthAddress(token.owner) }}
                </td>
                <td class="text-center font-w700">50 - 50</td>
                <td class="text-right font-w700">
                  {{ numeral(token.liqDepth).format("$0,0.00") }}
                </td>
                <td class="text-right font-w700">{{ token.fee }}%</td>
                <td class="text-right">
                  <b-btn
                    @click="goToRelay(token.smartTokenSymbol)"
                    size="sm"
                    variant="success"
                    class="mr-1"
                  >
                    <font-awesome-icon icon="exchange-alt" />
                  </b-btn>
                  <b-btn
                    @click="initAction('transfer', token.smartTokenSymbol)"
                    size="sm"
                    variant="info"
                  >
                    <font-awesome-icon icon="arrow-right" />
                  </b-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import axios from "axios";
import * as bancorx from "@/assets/_ts/bancorx";
import SortIcons from "@/components/common/SortIcons.vue";
import { TokenPrice } from "@/types/bancor";
import { multiContract } from "@/api/multiContractTx";
import { fetchTokenMeta, fetchTokenStats } from "@/api/helpers";
import { tableApi } from "../api/TableWrapper";
import { split } from "eos-common";
const numeral = require("numeral");
const debounce = require("lodash.debounce");

@Component({
  components: {
    SortIcons
  }
})
export default class Relays extends Vue {
  numeral = numeral;
  private tokenSearch: String = "";
  private searchOptions = {
    shouldSort: true,
    threshold: 0.3,
    location: 0,
    distance: 100,
    maxPatternLength: 24,
    minMatchCharLength: 1,
    keys: ["symbol", "name"]
  };
  searchResults: any = [];
  private searchState: string = "search";
  public debouncedGetSearch: any;
  public debouncedSuggestPrecision: any;
  private currentSort = "v24h";
  private currentSortDir = "desc";

  // computed

  shortenEthAddress(ethAddress: string) {
    return ethAddress.length > 13
      ? ethAddress.substring(0, 4) +
          "..." +
          ethAddress.substring(ethAddress.length - 6, ethAddress.length)
      : ethAddress;
  }

  get searchedTokens() {
    return this.searchResults.length > 0 ? this.searchResults : this.tokens;
  }

  get tokens() {
    console.log(vxm.relays.relays, "are the tokens inbound");
    return vxm.relays.relays;
  }

  get sortedTokens() {
    let tokens = this.searchedTokens;
    return tokens.sort((a: any, b: any) => {
      let modifier = 1;
      if (this.currentSortDir === "desc") modifier = -1;
      if (this.currentSort === "symbol" || this.currentSort === "contract") {
        if (a[this.currentSort] < b[this.currentSort]) return -1 * modifier;
        if (a[this.currentSort] > b[this.currentSort]) return 1 * modifier;
        return 0;
      } else {
        if (parseFloat(a[this.currentSort]) < parseFloat(b[this.currentSort]))
          return -1 * modifier;
        if (parseFloat(a[this.currentSort]) > parseFloat(b[this.currentSort]))
          return 1 * modifier;
        return 0;
      }
    });
  }

  goToRelay(symbolCode: string) {
    window.scroll({
      top: 0,
      left: 0,
      behavior: "smooth"
    });

    this.$router.push({
      name: "Relay",
      params: {
        account: symbolCode
      }
    });
  }

  initAction(action: "convert" | "transfer", symbol: string) {
    window.scroll({
      top: 0,
      left: 0,
      behavior: "smooth"
    });
  }

  searchTokens() {
    // @ts-ignore
    this.$search(this.tokenSearch, this.tokens, this.searchOptions).then(
      (results: any) => {
        this.searchResults = results;
        this.searchState = this.tokenSearch === "" ? "search" : "check";
      }
    );
  }

  sort(s: string) {
    if (s === this.currentSort) {
      this.currentSortDir = this.currentSortDir === "asc" ? "desc" : "asc";
    }
    this.currentSort = s;
  }

  @Watch("tokenSearch")
  async onSearchChange(val: any, oldVal: any) {
    if (val !== "") {
      this.searchState = "keyboard";
      this.debouncedGetSearch();
    } else {
      this.searchTokens();
    }
  }

  // methods
  async created() {
    vxm.relays.fetchRelays();

    this.debouncedGetSearch = debounce(() => {
      this.searchTokens();
    }, 500);
  }
}
</script>

<style scoped lang="scss">
.block-options {
  display: flex;
}
</style>
