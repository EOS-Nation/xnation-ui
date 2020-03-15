<template>
  <div>
    <div class="content content-boxed">
      <div class="block" style="min-height: 1000px;">
        <div class="block-header">
          <h3 class="block-title">
            {{ $route.params.service.toUpperCase() }}
            <small>Pools</small>
          </h3>
          <div class="block-options">
            <b-form-input
              class="form-control form-control-alt"
              v-model="filter"
              debounce="500"
              placeholder="Search Token"
            ></b-form-input>
          </div>
        </div>
        <div class="block-content">
          <b-table
            id="relays-table"
            striped
            :items="tokens"
            :fields="fields"
            :filter="filter"
            primary-key="smartTokenSymbol"
            :tbody-transition-props="transProps"
            :tbody-transition-handlers="transHandler"
          >
            <template v-slot:table-colgroup>
              <col key="index" style="width: 46px;" />
              <col key="symbol" style="width: 260px;" />
              <col key="smart" style="width: 200px;" />
            </template>
            <template v-slot:cell(symbol)="data">
              <img
                v-for="(reserve, index) in data.item.reserves"
                :key="index"
                class="img-avatar img-avatar-thumb img-avatar32 mr-3"
                :src="reserve.logo[0]"
                v-fallback="reserve.logo.slice(1)"
                :alt="`${reserve.symbol} Token Logo`"
              />
              {{ data.item.symbol }}
            </template>
            <template v-slot:cell(index)="data">
              {{ data.index + 1 }}
            </template>
            <template v-slot:cell(ratio)>
              50 - 50
            </template>
            <template v-slot:cell(actions)="data">
              <div>
                <b-btn
                  @click="goToRelay(data.item.smartTokenSymbol, 'liquidate')"
                  size="sm"
                  variant="success"
                  class="mr-1"
                >
                  <font-awesome-icon icon="minus" />
                </b-btn>
                <b-btn
                  @click="goToRelay(data.item.smartTokenSymbol)"
                  size="sm"
                  variant="info"
                >
                  <font-awesome-icon icon="plus" />
                </b-btn>
              </div>
            </template>
          </b-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import axios from "axios";
import SortIcons from "@/components/common/SortIcons.vue";
import { TokenPrice } from "@/types/bancor";
import { multiContract } from "@/api/multiContractTx";
import { fetchTokenMeta, fetchTokenStats } from "@/api/helpers";
import { tableApi } from "../api/TableWrapper";
import Velocity from "velocity-animate";

const numeral = require("numeral");

@Component({
  components: {
    SortIcons
  }
})
export default class Relays extends Vue {
  numeral = numeral;
  private filter: string = "";
  small = false;

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
      key: "smartTokenSymbol",
      sortable: false
    },
    {
      key: "owner",
      class: "text-center",
      tdClass: "font-w700",
      formatter: (value: any) => this.shortenEthAddress(value)
    },
    {
      key: "ratio",
      tdClass: "font-w700"
    },
    {
      key: "liqDepth",
      sortable: true,
      label: "Liquidity Depth",
      class: ["text-right", "font-w700"],
      formatter: (value: any) =>
        value ? numeral(value).format("$0,0.00") : "Not Available"
    },
    {
      key: "fee",
      sortable: true,
      class: ["text-right", "font-w700"],
      formatter: (value: string) => numeral(value).format("0.00%")
    },
    {
      key: "actions",
      label: "Actions"
    }
  ];

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

  shortenEthAddress(ethAddress: string) {
    return ethAddress.length > 13
      ? ethAddress.substring(0, 4) +
          "..." +
          ethAddress.substring(ethAddress.length - 6, ethAddress.length)
      : ethAddress;
  }

  get tokens() {
    return vxm.bancor.relays;
  }

  goToRelay(symbolCode: string, mode = "addLiquidity") {
    window.scroll({
      top: 0,
      left: 0,
      behavior: "smooth"
    });
    this.$router.push({
      name: "Relay",
      params: {
        account: symbolCode,
        mode
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

  get filteredFields() {
    return this.small
      ? this.fields.filter(field =>
          ["key", "volume24h", "index", "name"].every(
            fieldName => fieldName !== field.key
          )
        )
      : this.fields;
  }

  handleResize() {
    this.small = window.innerWidth < 768;
  }

  created() {
    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }
}
</script>

<style lang="scss">
table#relays-table .flip-list-move {
  transition: transform 0.5s;
}

.block-options {
  display: flex;
}
</style>
