<template>
  <!-- Tokens Table -->
  <div class="block">
    <div class="block-header">
      <h3 class="block-title">
        All Tokens <small> - {{ name }}</small>
      </h3>
      <div class="block-options">
        <b-form-input
          class="form-control form-control-alt"
          v-model="filter"
          placeholder="Search Token"
        ></b-form-input>
      </div>
    </div>
    <div class="block-content px-0 px-md-3">
      <div class="table-responsive">
        <b-table
          id="tokens-table"
          striped
          :items="tokens"
          :fields="fields"
          :filter="filter"
          primary-key="symbol"
          :tbody-transition-props="{ name: 'flip-list' }"
        >
          <template v-slot:head(change24h)="data">
            <span class="cursor text-center" style="min-width: 1500px;">{{
              data.label
            }}</span>
          </template>
          <template v-slot:cell(index)="data">
            {{ data.index + 1 }}
          </template>
          <template v-slot:cell(symbol)="data">
            <img
              v-b-tooltip.hover
              class="img-avatar img-avatar-thumb img-avatar32"
              :src="data.item.logo"
              alt="Token Logo"
            />
            {{ data.item.symbol }}
          </template>
          <template v-slot:cell(change24h)="data">
            <span
              :class="
                data.item.change24h > 0
                  ? `text-success font-w700`
                  : 'text-danger font-w700'
              "
              >{{ numeral(data.item.change24h).format("0.00") + "%" }}</span
            >
          </template>
          <template v-slot:cell(price)="data">
            <span class="text-center font-w700">
              <span v-if="data.item.price < 1">{{
                numeral(data.item.price).format("$0,0.000000")
              }}</span>
              <span v-else>{{
                numeral(data.item.price).format("$0,0.00")
              }}</span>
            </span>
          </template>
          <template v-slot:cell(actions)="data">
            <span>
              <b-btn
                @click="initAction('convert', data.item.symbol)"
                size="sm"
                variant="success"
                class="mr-1"
              >
                <font-awesome-icon icon="exchange-alt" />
              </b-btn>
              <b-btn
                @click="initAction('transfer', data.item.symbol)"
                size="sm"
                variant="info"
              >
                <font-awesome-icon icon="arrow-right" />
              </b-btn>
            </span>
          </template>
        </b-table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue, Prop } from "vue-property-decorator";
import { vxm } from "@/store";
import numeral from "numeral";
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

  filter = "";
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

  transProps = {
    name: "flip-list"
  };

  fields = [
    {
      key: "index",
      label: "#"
    },
    {
      key: "symbol",
      sortable: true,
      label: "Token"
    },
    {
      key: "name",
      sortable: false
    },
    {
      key: "change24h",
      sortable: true,
      label: "24H Change"
    },
    {
      key: "price",
      sortable: true,
      label: "Price USD",
      formatter: (value: any, key: any, item: any) =>
        numeral(value).format("$0,0.00")
    },
    {
      key: "volume24h",
      sortable: true,
      label: "24H Volume",
      formatter: (value: any, key: any, item: any) =>
        numeral(value).format("$0,0.00")
    },
    {
      key: "liqDepth",
      sortable: true,
      label: "Liquidity Depth",
      formatter: (value: any, key: any, item: any) =>
        numeral(value).format("$0,0.00")
    },
    {
      key: "actions",
      label: "Actions"
    }
  ];

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
}
</script>

<style lang="scss">
table#tokens-table .flip-list-move {
  transition: transform 0.7s;
}

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
