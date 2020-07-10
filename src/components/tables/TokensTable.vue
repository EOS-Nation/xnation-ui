<template>
  <div class="block">
    <div class="block-header">
      <h3 class="block-title">
        All Tokens <small> - {{ name }}</small>
      </h3>
      <div class="block-options">
        <b-form-input
          class="form-control form-control-alt"
          debounce="500"
          v-model="filter"
          placeholder="Search Token"
        ></b-form-input>
      </div>
    </div>
    <div class="block-content px-0 px-md-3 ">
      <div class="table-responsive">
        <b-table
          id="tokens-table"
          :key="dynamicId"
          striped
          stacked="sm"
          :items="tokens"
          :fields="filteredFields"
          :filter="filter"
          primary-key="id"
          :tbody-transition-props="transProps"
          :tbody-transition-handlers="transHandler"
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
                data.item.change24h == null
                  ? ''
                  : data.item.change24h > 0
                  ? `text-success font-w700`
                  : 'text-danger font-w700'
              "
              >{{
                data.item.change24h == null
                  ? "N/A"
                  : numeral(data.item.change24h).format("0.00") + "%"
              }}</span
            >
          </template>
          <template v-slot:cell(price)="data">
            <span class="text-center font-w700">
              <span v-if="data.item.price < 100">{{
                numeral(data.item.price).format("$0,0.0000")
              }}</span>
              <span v-else>{{
                numeral(data.item.price).format("$0,0.00")
              }}</span>
            </span>
          </template>
          <template v-slot:cell(actions)="data">
            <span>
              <b-btn
                @click="initAction('convert', data.item.id)"
                size="sm"
                variant="success"
                class="mr-1"
              >
                <font-awesome-icon icon="exchange-alt" />
              </b-btn>
              <b-btn
                @click="initAction('transfer', data.item.id)"
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
import Velocity from "velocity-animate";

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

  dynamicId = "mate";

  small = false;

  filter = "";
  numeral = numeral;

  transProps = {
    name: "flip-list"
  };
  transHandler = {
    beforeEnter: function(el: any) {
      el.style.opacity = 0;
      el.style.height = 0;
    },
    enter: function(el: any, done: any) {
      var delay = el.dataset.index * 150;
      setTimeout(function() {
        Velocity(el, { opacity: 1, height: "1.6em" }, { complete: done });
      }, delay);
    },
    leave: function(el: any, done: any) {
      var delay = el.dataset.index * 150;
      setTimeout(function() {
        Velocity(el, { opacity: 0, height: 0 }, { complete: done });
      }, delay);
    }
  };

  fields = [
    {
      key: "index",
      label: "#",
      class: "index-header"
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
      label: "24H Change",
      class: "text-center"
    },
    {
      key: "price",
      sortable: true,
      label: "Price USD",
      class: ["text-center"],
      formatter: (value: any, key: any, item: any) =>
        numeral(value).format("$0,0.0000")
    },
    {
      key: "volume24h",
      sortable: true,
      label: "24H Volume",
      class: ["text-center"],
      formatter: (value: any, key: any, item: any) =>
        value == null || value == undefined
          ? "N/A"
          : numeral(value).format("$0,0.00")
    },
    {
      key: "liqDepth",
      sortable: true,
      label: "Liquidity Depth",
      class: ["text-right"],
      formatter: (value: any, key: any, item: any) =>
        numeral(value).format("$0,0.00")
    },
    {
      key: "actions",
      label: "Actions",
      class: ["text-right"]
    }
  ];

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

  get filteredFields() {
    const small = this.small
      ? this.fields.filter(field =>
          ["key", "volume24h", "index", "name"].every(
            fieldName => fieldName !== field.key
          )
        )
      : this.fields;
    const hasKeys = small.filter(field => {
      if (field.key == "index" || field.key == "actions") return true;
      return this.tokens.some(token =>
        new Object(token).hasOwnProperty(field.key)
      );
    });
    return hasKeys;
  }

  handleResize() {
    this.small = window.innerWidth < 768;
  }

  refreshTable() {
    const reverseString = this.dynamicId
      .split("")
      .reverse()
      .join();
    this.dynamicId = reverseString;
  }

  tokensChanged = debounce(() => this.refreshTable(), 2000);

  @Watch("tokens")
  onChange() {
    this.tokensChanged();
  }

  created() {
    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }
}
</script>

<style lang="scss">
table#tokens-table .flip-list-move {
  transition: transform 0.5s;
}

.index-header {
  min-width: 15px;
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
