<template>
  <div class="table-responsive">
    <b-table
      id="tokens-table"
      :dark="darkMode ? true : false"
      striped
      :key="dynamicId"
      stacked="sm"
      :items="tokens"
      :fields="filteredFields"
      :filter="filter"
      primary-key="id"
      :tbody-transition-props="transProps"
      :tbody-transition-handlers="transHandler"
    >
      <template v-slot:head(change24h)="data">
        <span class="cursor text-center">{{ data.label }}</span>
      </template>
      <template v-slot:cell(index)="data">
        {{ data.index + 1 }}
      </template>
      <template v-slot:cell(symbol)="data">
        <img
          v-b-tooltip.hover
          class="img-avatar img-avatar32"
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
        <span class="font-w700">
          <span v-if="data.item.price < 100">{{
            numeral(data.item.price).format("$0,0.0000")
          }}</span>
          <span v-else>{{ numeral(data.item.price).format("$0,0.00") }}</span>
        </span>
      </template>
      <template v-slot:cell(actions)>
        <b-btn
          :to="{
            name: 'Tokens'
          }"
          variant="primary"
          class="mr-1"
        >
          <font-awesome-icon icon="exchange-alt" /> Swap
        </b-btn>
      </template>
    </b-table>
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
import ContentBlock from "@/components/common/ContentBlock.vue";
import { vxm } from "@/store";

@Component({
  components: {
    ContentBlock,
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

  @Prop({ default: "" }) filter!: string;

  dynamicId = "mate";

  small = false;

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
      key: "symbol",
      sortable: true,
      label: "Name",
      tdClass: ["align-middle"]
    },
    {
      key: "change24h",
      sortable: true,
      label: "24H Change",
      thClass: "text-right",
      tdClass: ["text-right", "align-middle"]
    },
    {
      key: "price",
      sortable: true,
      label: "Price USD",
      thClass: "text-right",
      tdClass: ["text-right", "align-middle"],
      formatter: (value: any, key: any, item: any) =>
        numeral(value).format("$0,0.0000")
    },
    {
      key: "volume24h",
      sortable: true,
      label: "24H Volume",
      thClass: "text-right",
      tdClass: ["text-right", "align-middle"],
      formatter: (value: any, key: any, item: any) =>
        value == null || value == undefined
          ? "N/A"
          : numeral(value).format("$0,0.00")
    },
    {
      key: "liqDepth",
      sortable: true,
      label: "Liquidity Depth",
      thClass: "text-right",
      tdClass: ["text-right", "align-middle"],
      formatter: (value: any, key: any, item: any) =>
        numeral(value).format("$0,0.00")
    },
    {
      key: "actions",
      label: "Actions",
      thClass: "text-right",
      tdClass: ["text-right", "align-middle"]
    }
  ];

  get darkMode() {
    return vxm.general.darkMode;
  }

  get tokens() {
    return vxm.bancor.tokens;
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
      return this.tokens.some((token: any) =>
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
