<template>
  <div>
    <hero-actions />
    <!-- Page Content -->
    <div></div>
    <div class="content content-boxed">
      <b-modal @ok="createRelay" id="my-modal" title="Create a Relay">
        <p class="my-4">Smart Token Information</p>
        <div>
          <b-form-group
            id="fieldset-1"
            label="Symbol"
            description="Smart Token Symbol"
            label-for="input-1"
          >
            <b-form-input id="input-1" placeholder="BNTEOS" v-model="smartTokenSymbol" trim></b-form-input>
          </b-form-group>
          <b-form-group
            id="fieldset-1"
            :description="precisionExample"
            label="Precision"
            label-for="input-1"
          >
            <b-form-input
              id="input-1"
              placeholder="4"
              type="number"
              v-model="smartTokenPrecision"
              trim
            ></b-form-input>
          </b-form-group>
          <b-form-group id="fieldset-1" label="Initial Supply" label-for="input-1">
            <b-form-input
              id="input-1"
              type="number"
              v-model="smartTokenInitialSupply"
              placeholder="10000"
              trim
            ></b-form-input>
          </b-form-group>
          <b-form-group id="fieldset-1" label="Max Supply" label-for="input-1">
            <b-form-input
              id="input-1"
              type="number"
              v-model="smartTokenMaxSupply"
              placeholder="10000000"
              trim
            ></b-form-input>
          </b-form-group>
        </div>
      </b-modal>

      <div class="block">
        <div class="block-header">
          <h3 class="block-title">
            EOS
            <small>Relays</small>
          </h3>
          <div class="block-options">
            <b-button size="sm" v-b-modal="'my-modal'">Create</b-button>
            <b-input-group size="sm">
              <b-input-group-text slot="prepend" class="bg-body border-0 text-muted">
                <font-awesome-icon
                  :icon="['fas', searchState]"
                  fixed-width
                  :class="{ 'fa-blink': searchState === 'keyboard' }"
                />
              </b-input-group-text>
              <b-form-input
                class="form-control form-control-alt"
                v-model="tokenSearch"
                placeholder="Search Token"
              ></b-form-input>
            </b-input-group>
          </div>
        </div>
        <div class="block-content">
          <table class="table table-striped table-vcenter">
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">#</th>
                <th @click="sort('symbol')" colspan="2" class="cursor" style="min-width: 260px;">
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
                  />Contract
                </th>
                <th @click="sort('ratio1')" class="cursor text-center">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="ratio1"
                  />Ratio
                </th>
                <th @click="sort('v24h')" class="cursor text-right">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="v24h"
                  />Volume 24h
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
              <tr v-for="(token, index) in sortedTokens" :key="index">
                <td class="text-center" v-text="index + 1"></td>
                <td class="text-left font-w700" style="width: 180px">
                  <img
                    class="img-avatar img-avatar-thumb img-avatar32 mr-3"
                    :src="token.img"
                    alt="Token Logo"
                  />
                  {{ token.symbol }}
                </td>
                <td>
                  <span class="text-muted font-size-sm">
                    {{
                    token.name
                    }}
                  </span>
                </td>
                <td class="text-center font-w700">{{ token.contract }}</td>
                <td class="text-center font-w700">{{ token.ratio1 }} - {{ token.ratio2 }}</td>
                <td class="text-right font-w700">{{ numeral(token.v24h).format('$0,0') }}</td>
                <td
                  class="text-right font-w700"
                >{{ numeral(token.liqDepth * ethPrice).format('$0,0') }}</td>
                <td class="text-right font-w700">{{ token.fee }}%</td>
                <td class="text-right">
                  <b-btn
                    @click="initAction('convert', token.symbol)"
                    size="sm"
                    variant="success"
                    class="mr-1"
                  >
                    <font-awesome-icon icon="exchange-alt" />
                  </b-btn>
                  <b-btn @click="initAction('transfer', token.symbol)" size="sm" variant="info">
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
import * as bancorx from "@/assets/_ts/bancorx";
import SortIcons from "@/components/common/SortIcons.vue";
import HeroActions from "@/components/hero/HeroActions.vue";
import { TokenPrice } from "@/types/bancor";
import { multiContract } from "@/api/multiContractActionGen";
import { tableApi } from "../api/TableWrapper";
const numeral = require("numeral");
const debounce = require("lodash.debounce");

@Component({
  components: {
    HeroActions,
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
  private currentSort = "v24h";
  private currentSortDir = "desc";
  modal: boolean = true;
  state: any;
  smartTokenSymbol: any = null;
  smartTokenPrecision: any = 4;
  smartTokenInitialSupply: any = null;
  smartTokenMaxSupply: any = null;

  // computed
  get wallet() {
    return vxm.eosTransit.wallet;
  }

  get precisionExample() {
    return `E.g. ${Number(1000).toFixed(this.smartTokenPrecision)} ${this
      .smartTokenSymbol || "BNTEOS"}`;
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

  get isAuthenticated() {
    return (
      vxm.eosTransit.walletState && vxm.eosTransit.walletState.authenticated
    );
  }

  get tokenDb() {
    return vxm.tokens.tokenDb;
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

  async createRelay() {
    const actions = multiContract.createRelay({
      maxSupply: Number(this.smartTokenMaxSupply),
      initialSupply: Number(this.smartTokenInitialSupply),
      symbol: this.smartTokenSymbol,
      precision: Number(this.smartTokenPrecision)
    });

    const wallet = vxm.eosTransit.wallet;

    if (wallet && wallet.auth) {
      const res = await vxm.eosTransit.tx(actions);
      vxm.general.setHeroAction("relay");
      this.$router.push({ name: 'Relay', params: { account: this.smartTokenSymbol } })
    }
  }

  async updateTokens() {
    let res = await vxm.tokens.getTokens();
    vxm.tokens.setTokens({ eos: res, eth: [] });
    let relayDb = bancorx.getTokenDb(false);

    this.tokens = await Promise.all(
      relayDb
        .filter(({ counterSymbol }) => counterSymbol !== "BNT")
        .map(async r => {
          const token = bancorx.getTokenInfo(r.counterSymbol);
          const tokenPrice = res.find((t: TokenPrice) => {
            // @ts-ignore
            return t.code === token.symbol;
          });
          // @ts-ignore
          const [reserve1, reserve2] = await tableApi.getReserves(
            // @ts-ignore
            token.relayContract
          );
          // @ts-ignore
          const { fee } = await tableApi.getSettings(token.relayContract);
          return {
            // @ts-ignore
            symbol: r.symbol,
            name: r.name,
            img: r.img,
            ratio1: reserve1.ratio / 10000,
            ratio2: reserve2.ratio / 10000,
            fee: fee / 10000,
            v24h: tokenPrice.volume24h.USD,
            // @ts-ignore
            contract: token.relayContract,
            liqDepth: tokenPrice.liquidityDepth,
            tokenPrice: tokenPrice
          };
        })
    );
    return res;
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
    vxm.general.setHeroAction("liq-add");
    // this.relays = await vxm.liquidity.loadRelayTokens()
    await vxm.tokens.getEthPrice();
    await this.updateTokens();
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
