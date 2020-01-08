<template>
  <!-- Tokens Table -->
  <div class="block">
    <div class="block-header">
      <h3 class="block-title">All Tokens <small> - {{ name }}</small></h3>
      <div class="block-options">
        <!-- <b-input-group size="sm">
          <b-input-group-text
            slot="prepend"
            class="bg-body border-0 text-muted"
          >
            <font-awesome-icon
              :icon="['fas', searchState]"
              fixed-width
              :class="{ 'fa-blink': searchState === 'keyboard' }"
            />
          </b-input-group-text> -->
        <b-form-input
          class="form-control form-control-alt"
          :value="value"
          @input="$emit('input', $event)"
          placeholder="Search Token"
        ></b-form-input>
        <!-- </b-input-group> -->
      </div>
    </div>
    <div class="block-content px-0 px-md-3">
      <div class="table-responsive">
        <table class="table table-striped table-vcenter">
          <thead>
            <tr>
              <th
                class="text-center d-none d-md-table-cell"
                style="width: 55px;"
              >
                #
              </th>
              <th @click="sort('symbol')" class="cursor text-left">
                <sort-icons
                  :currentSort="currentSort"
                  :currentSortDir="currentSortDir"
                  category="symbol"
                />
                Token
              </th>
              <th class="d-none d-md-table-cell"></th>
              <th
                @click="sort('price')"
                class="cursor text-center"
                style="min-width: 150px;"
                v-if="bonusProps"
              >
                <sort-icons
                  :currentSort="currentSort"
                  :currentSortDir="currentSortDir"
                  category="price"
                />
                24H CHANGE
              </th>
              <th
                @click="sort('price')"
                class="cursor text-center"
                style="min-width: 150px;"
              >
                <sort-icons
                  :currentSort="currentSort"
                  :currentSortDir="currentSortDir"
                  category="price"
                />
                Price USD
              </th>
              <th
                @click="sort('price')"
                class="cursor text-center"
                style="min-width: 150px;"
                v-if="bonusProps"
              >
                <sort-icons
                  :currentSort="currentSort"
                  :currentSortDir="currentSortDir"
                  category="price"
                />
                24H VOLUME
              </th>
              <th
                @click="sort('liqDepth')"
                class="cursor text-right d-none d-md-table-cell"
                style="min-width: 150px;"
              >
                <sort-icons
                  :currentSort="currentSort"
                  :currentSortDir="currentSortDir"
                  category="liqDepth"
                />
                Liquidity Depth
              </th>
              <th class="text-right" style="width: 130px;">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="i in 15" :key="i">
                <th class="text-center">{{ i }}</th>
                <td colspan="8">
                  <content-loader :height="10" :width="1000" :speed="5">
                  </content-loader>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="(token, index) in tokens" :key="index">
                <td
                  class="text-center d-none d-md-table-cell"
                  v-text="index + 1"
                ></td>
                <td class="d-flex justify-content-start align-items-center">
                  <img
                    v-b-tooltip.hover
                    :title="true ? 'Sale is Enabled' : 'Sale is Disabled'"
                    class="img-avatar img-avatar-thumb img-avatar32"
                    :src="token.logo"
                    alt="Token Logo"
                  />
                  {{ token.symbol }}
                </td>
                <td class="d-none d-md-table-cell">
                  <span class="text-muted font-size-sm">{{ token.name }}</span>
                </td>
                <td class="text-center font-w700" v-if="bonusProps">
                  <span
                    :class="
                      token.change24h > 0 ? `text-success` : 'text-danger'
                    "
                    >{{ numeral(token.change24h).format("0.00") + "%" }}</span
                  >
                </td>
                <td class="text-center font-w700">
                  <span v-if="token.price < 1">{{
                    numeral(token.price).format("$0,0.000000")
                  }}</span>
                  <span v-else>{{
                    numeral(token.price).format("$0,0.00")
                  }}</span>
                </td>
                <td class="text-center" v-if="bonusProps">
                  <span>{{ numeral(token.volume24h).format("$0,0.00") }}</span>
                </td>
                <td class="text-right d-none d-md-table-cell">
                  {{ numeral(token.liqDepth).format("$0,0.00") }}
                </td>
                <td class="text-right">
                  <b-btn
                    @click="initAction('convert', token.symbol)"
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
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue, Prop } from "vue-property-decorator";
import { vxm } from "@/store";
import numeral from "numeral";
import * as bancorx from "@/assets/_ts/bancorx";
import SortIcons from "@/components/common/SortIcons.vue";
import {
  TokenPrice,
  SimpleToken,
  SimpleTokenWithMarketData
} from "@/types/bancor";
const {
  ContentLoader,
  FacebookLoader,
  CodeLoader,
  BulletListLoader,
  InstagramLoader,
  ListLoader
} = require("vue-content-loader");
const debounce = require("lodash.debounce");

@Component({
  components: {
    ContentLoader,
    FacebookLoader,
    CodeLoader,
    BulletListLoader,
    InstagramLoader,
    ListLoader,
    SortIcons
  }
})
export default class TokensTable extends Vue {
  @Prop(Boolean) loading?: boolean;
  @Prop(Boolean) scrollToTop?: boolean;

  @Prop() tokens!: SimpleToken[] | SimpleTokenWithMarketData[];
  @Prop() value!: string;
  @Prop() name!: string;

  // data
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
  private currentSort = "v24h";
  private currentSortDir = "desc";

  get bonusProps() {
    return this.tokens.every(
      token =>
        token.hasOwnProperty("change24h") && token.hasOwnProperty("volume24h")
    );
  }

  initAction(action: "convert" | "transfer", symbol: string) {
    if (this.scrollToTop) {
      window.scroll({
        top: 0,
        left: 0,
        behavior: "smooth"
      });
    }
    this.$emit(action, symbol);
  }

  searchTokens() {
    // @ts-ignore
    this.$search(this.tokenSearch, this.tokens, this.searchOptions).then(
      (results: any) => {
        this.searchResults = results;
        if (this.tokenSearch === "") this.searchState = "search";
        else this.searchState = "check";
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
}
</script>

<style lang="scss" scoped>
@keyframes fa-blink {
  0% {
    opacity: 1;
  }
  25% {
    opacity: 0.25;
  }
  50% {
    opacity: 0.5;
  }
  75% {
    opacity: 0.75;
  }
  100% {
    opacity: 0;
  }
}
.fa-blink {
  -webkit-animation: fa-blink 0.55s linear infinite;
  -moz-animation: fa-blink 0.55s linear infinite;
  -ms-animation: fa-blink 0.55s linear infinite;
  -o-animation: fa-blink 0.55s linear infinite;
  animation: fa-blink 0.55s linear infinite;
}
</style>
