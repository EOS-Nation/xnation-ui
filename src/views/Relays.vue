<template>
  <div>
    <div class="container-lg">
      <div class="block">
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
        <div class="block-content px-0 px-md-3 ">
          <div class="table-responsive">
            <b-table
              id="relays-table"
              striped
              :key="dynamicId"
              stacked="sm"
              :items="tokens"
              :fields="fields"
              :filter="filter"
              sort-by="liqDepth"
              :sort-desc="true"
              primary-key="id"
              :table-busy="loadingPools"
              :tbody-transition-props="transProps"
              :tbody-transition-handlers="transHandler"
            >
              <template v-slot:table-busy>
                <div class="text-center my-2">
                  <b-spinner class="align-middle"></b-spinner>
                  <strong>Loading...</strong>
                </div>
              </template>
              <template v-if="morePoolsAvailable" v-slot:custom-foot>
                <b-button :disabled="loadingPools" @click="loadMorePools"
                  >Load more...
                </b-button>
              </template>
              <template v-slot:table-colgroup>
                <col key="index" style="width: 46px;" />
                <col key="symbol" style="width: 260px;" />
                <col key="smart" style="width: 200px;" />
              </template>
              <template v-slot:cell(symbol)="data">
                <img
                  :id="`tooltip-target-${data.item.reserveId}`"
                  :key="reserve.reserveId"
                  v-for="reserve in data.item.reserves"
                  class="img-avatar img-avatar-thumb img-avatar32 mr-3"
                  :src="reserve.logo[0]"
                  v-fallback="reserve.logo.slice(1)"
                  :alt="`${reserve.symbol} Token Logo`"
                />
                <b-popover
                  v-for="reserve in data.item.reserves"
                  :key="`${reserve.reserveId}-tooltip`"
                  :target="`tooltip-target-${data.item.reserveId}`"
                  triggers="hover"
                >
                  <p>Contract: {{ reserve.contract }}</p>
                  <p>Symbol: {{ reserve.symbol }}</p>
                  <p>{{ reserve.balance && `Balance: ${reserve.balance}` }}</p>
                </b-popover>
                {{ data.item.symbol }}
              </template>
              <template v-slot:cell(index)="data">
                {{ data.index + 1 }}
              </template>
              <template v-slot:cell(smartTokenSymbol)="data">
                <span> {{ data.item.smartTokenSymbol }}</span>
              </template>
              <template v-slot:cell(ratio)>
                50 - 50
              </template>
              <template v-slot:cell(actions)="data">
                <div class="actionButtons">
                  <b-btn
                    v-if="focusDoesExist"
                    @click="focusRelay(data.item.id)"
                    :disabled="!data.item.focusAvailable"
                    size="sm"
                    variant="warning"
                    class="mr-1"
                  >
                    <font-awesome-icon icon="chart-line" />
                  </b-btn>
                  <b-btn
                    @click="goToRelay(data.item.id, 'liquidate')"
                    :disabled="!data.item.removeLiquiditySupported"
                    size="sm"
                    variant="success"
                    class="mr-1"
                  >
                    <font-awesome-icon icon="minus" />
                  </b-btn>
                  <b-btn
                    @click="goToRelay(data.item.id)"
                    :disabled="!data.item.addLiquiditySupported"
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
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import SortIcons from "@/components/common/SortIcons.vue";
import { TokenPrice, TradingModule, LiquidityModule } from "@/types/bancor";
import { multiContract } from "@/api/multiContractTx";
import Velocity from "velocity-animate";
import { State, Getter, Action, namespace } from "vuex-class";
import _ from "lodash";

const bancor = namespace("bancor");

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
  dynamicId = "buddy";
  @bancor.Action loadMorePools!: LiquidityModule["loadMorePools"];
  @bancor.Getter morePoolsAvailable!: LiquidityModule["morePoolsAvailable"];
  @bancor.Getter loadingPools!: LiquidityModule["loadingPools"];

  fields = [
    {
      key: "index",
      label: "#"
    },
    {
      key: "symbol",
      sortable: true,
      label: "Token",
      tdClass: ["tokenss"]
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
      tdClass: "font-w700",
      class: "noWrap"
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
      label: "Actions",
      tdClass: ["noWrap"]
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

  get focusDoesExist() {
    return this.tokens.some((token: any) => token.focusAvailable);
  }

  get tokens() {
    return vxm.bancor.relays;
  }

  focusRelay(symbolCode: string) {
    window.scroll({
      top: 0,
      left: 0,
      behavior: "smooth"
    });
    this.$router.push({
      name: "RelayDetail",
      params: { account: symbolCode }
    });
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

  refreshTable() {
    const reverseString = this.dynamicId
      .split("")
      .reverse()
      .join();
    this.dynamicId = reverseString;
  }

  tokensChanged = _.debounce(() => this.refreshTable(), 2000);

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
table#relays-table .flip-list-move {
  transition: transform 0.5s;
}

.index-header {
  padding: 2px;
}

.actions {
  min-width: 130px;
}

.tokenss {
  // max-width: 160px;
}

.noWrap {
  white-space: nowrap;
}

.block-options {
  display: flex;
}
</style>
