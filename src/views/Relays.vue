<template>
  <div>
    <div class="content content-boxed">
      <div class="block">
        <div class="block-header">
          <h3 class="block-title">
            EOS
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
              <tr v-for="(token, index) in newTokens" :key="index">
                <td class="text-center" v-text="index + 1"></td>
                <td class="text-left font-w700" style="width: 180px">
                  <img
                    v-for="reserve in token.reserves"
                    :key="reserve.symbol"
                    class="img-avatar img-avatar-thumb img-avatar32 mr-3"
                    :src="reserve.logo"
                    alt="Token Logo"
                  />
                  {{ token.symbol }}
                </td>
                <td>
                  <span class="text-muted font-size-sm">
                    {{ token.settings.currency.split(",")[1] }}
                  </span>
                </td>
                <td class="text-center font-w700">
                  {{ token.settings.owner }}
                </td>
                <td class="text-center font-w700">50 - 50</td>
                <td class="text-right font-w700">
                  {{ numeral(token.liqDepth).format("$0,0.00") }}
                </td>
                <td class="text-right font-w700">
                  {{ token.settings.fee / 1000000 }}%
                </td>
                <td class="text-right">
                  <b-btn
                    @click="goToRelay(token.settings.currency.split(',')[1])"
                    size="sm"
                    variant="success"
                    class="mr-1"
                  >
                    <font-awesome-icon icon="exchange-alt" />
                  </b-btn>
                  <b-btn
                    @click="initAction('transfer', token.symbol)"
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
    <!-- END Page Content -->
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
  // props

  // data
  numeral = numeral;
  relays: any = [];
  tokens: any = [];
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
  modal: boolean = true;
  state: any;
  tokenSymbol: any = null;
  tokenPrecision: any = 4;
  tokenContract: any = null;
  tokenExists: boolean | null = null;
  tokenLogo: string = "";

  get imageUrl() {
    return (
      this.tokenLogo ||
      `https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/128x128/plain/symbol_questionmark.png`
    );
  }

  // computed
  get wallet() {
    return vxm.eosTransit.wallet;
  }

  get relaySelect() {
    return vxm.liquidity.relaySelect;
  }

  get ethPrice() {
    return vxm.tokens.ethPrice;
  }

  get searchedTokens() {
    if (this.searchResults.length > 0) return this.searchResults;
    else return this.tokens;
  }

  get newTokens() {
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
    const tokenInfo = bancorx.getTokenInfo(symbol);
    if (tokenInfo) vxm.liquidity.setFromToken(tokenInfo);
    vxm.general.setHeroAction(action);
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

  create() {
    this.$router.push({
      name: "Create"
    });
  }

  @Watch("tokenSymbol")
  @Watch("tokenContract")
  onContractChange() {
    if (this.tokenSymbol && this.tokenContract) {
      this.debouncedSuggestPrecision();
    }
  }

  async suggestPrecision() {
    const contractName = this.tokenContract;
    const symbol = this.tokenSymbol;

    try {
      const { max_supply } = await fetchTokenStats(
        this.tokenContract,
        this.tokenSymbol
      );
      const precision = max_supply.symbol.precision;
      this.tokenPrecision = precision;
      this.tokenExists = true;
      try {
        const metaData = await fetchTokenMeta(
          this.tokenContract,
          this.tokenSymbol
        );
        this.tokenLogo = metaData.logo;
      } catch {
        this.tokenLogo = "";
      }
    } catch (e) {
      console.warn(e);
      this.tokenExists = false;
      this.tokenLogo = "";
    }
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

    // this.relays = await vxm.liquidity.loadRelayTokens()
    this.debouncedGetSearch = debounce(() => {
      this.searchTokens();
    }, 500);
    this.debouncedSuggestPrecision = debounce(() => {
      this.suggestPrecision();
    }, 500);
  }
}
</script>

<style scoped lang="scss">
.block-options {
  display: flex;
}
</style>
