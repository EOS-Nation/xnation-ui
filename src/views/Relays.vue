<template>
  <div>
    <hero-actions />
    <!-- Page Content -->
    <div class="content content-boxed">
      <div class="block">
        <div class="block-header">
          <h3 class="block-title">EOS <small>Relays</small></h3>
          <div class="block-options">
            <b-input-group size="sm">
              <b-input-group-text
                slot="prepend"
                class="bg-body border-0 text-muted"
              >
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
                  />
                  Token
                </th>
                <th @click="sort('contract')" class="cursor text-center">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="contract"
                  />
                  Contract
                </th>
                <th @click="sort('ratio1')" class="cursor text-center">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="ratio1"
                  />
                  Ratio
                </th>
                <th @click="sort('v24h')" class="cursor text-right">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="v24h"
                  />
                  Volume 24h
                </th>
                <th @click="sort('liqDepth')" class="cursor text-right">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="liqDepth"
                  />
                  Liquidity Depth
                </th>
                <th @click="sort('fee')" class="cursor text-right">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="fee"
                  />
                  Fee
                </th>
                <th class="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(token, index) in sortedTokens" :key="index">
                <td class="text-center" v-text="index + 1"></td>
                <td class="text-left font-w700" style="width: 180px">
                  <router-link
                    :to="{ name: 'Token', params: { symbol: token.symbol } }"
                  >
                    <img
                      class="img-avatar img-avatar-thumb img-avatar32 mr-3"
                      :src="token.img"
                      alt="Token Logo"
                    />
                    {{ token.symbol }}
                  </router-link>
                </td>
                <td>
                  <router-link
                    :to="{ name: 'Token', params: { symbol: token.symbol } }"
                  >
                    <span class="text-muted font-size-sm">{{
                      token.name
                    }}</span>
                  </router-link>
                </td>
                <td class="text-center font-w700">
                  {{ token.contract }}
                </td>
                <td class="text-center font-w700">
                  {{ token.ratio1 }} - {{ token.ratio2 }}
                </td>
                <td class="text-right font-w700">
                  {{ numeral(token.v24h).format('$0,0') }}
                </td>
                <td class="text-right font-w700">
                  {{ numeral(token.liqDepth * ethPrice).format('$0,0') }}
                </td>
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
import { Watch, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import * as bancorx from '@/assets/_ts/bancorx'
import SortIcons from '@/components/common/SortIcons.vue'
import HeroActions from '@/components/hero/HeroActions.vue'
import { TokenPrice } from '@/types/bancor'
const numeral = require('numeral')
const debounce = require('lodash.debounce')

@Component({
  components: {
    HeroActions,
    SortIcons
  }
})
export default class Relays extends Vue {
  // props

  // data
  numeral = numeral
  relays: any = []
  tokens: any = []
  private tokenSearch: String = ''
  private searchOptions = {
    shouldSort: true,
    threshold: 0.3,
    location: 0,
    distance: 100,
    maxPatternLength: 24,
    minMatchCharLength: 1,
    keys: ['symbol', 'name']
  }
  searchResults: any = []
  private searchState: string = 'search'
  public debouncedGetSearch: any
  private currentSort = 'v24h'
  private currentSortDir = 'desc'

  // computed
  get wallet() {
    return vxm.eosTransit.wallet
  }

  get relaySelect() {
    return vxm.liquidity.relaySelect
  }

  get ethPrice() {
    return vxm.tokens.ethPrice
  }

  get searchedTokens() {
    if (this.searchResults.length > 0) return this.searchResults
    else return this.tokens
  }

  get sortedTokens() {
    let tokens = this.searchedTokens
    return tokens.sort((a: any, b: any) => {
      let modifier = 1
      if (this.currentSortDir === 'desc') modifier = -1
      if (this.currentSort === 'symbol' || this.currentSort === 'contract') {
        if (a[this.currentSort] < b[this.currentSort]) return -1 * modifier
        if (a[this.currentSort] > b[this.currentSort]) return 1 * modifier
        return 0
      } else {
        if (parseFloat(a[this.currentSort]) < parseFloat(b[this.currentSort]))
          return -1 * modifier
        if (parseFloat(a[this.currentSort]) > parseFloat(b[this.currentSort]))
          return 1 * modifier
        return 0
      }
    })
  }

  initAction(a: 'convert' | 'transfer', s: string) {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
    const tokenInfo = bancorx.getTokenInfo(s)
    if (tokenInfo) vxm.liquidity.setFromToken(tokenInfo)
    vxm.general.setHeroAction(a)
  }

  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated
    else return false
  }

  get tokenDb() {
    return vxm.tokens.tokenDb
  }

  searchTokens() {
    // @ts-ignore
    this.$search(this.tokenSearch, this.tokens, this.searchOptions).then(
      (results: any) => {
        this.searchResults = results
        if (this.tokenSearch === '') this.searchState = 'search'
        else this.searchState = 'check'
      }
    )
  }

  sort(s: string) {
    if (s === this.currentSort) {
      this.currentSortDir = this.currentSortDir === 'asc' ? 'desc' : 'asc'
    }
    this.currentSort = s
  }

  async updateTokens() {
    let res = await vxm.tokens.getTokens()
    vxm.tokens.setTokens({ eos: res, eth: [] })
    let relayDb = bancorx.getTokenDb(false)
    this.tokens = []
    for (const r of relayDb) {
      if (r.counterSymbol !== 'BNT') {
        const token = bancorx.getTokenInfo(r.counterSymbol)
        const tokenPrice = res.find((t: TokenPrice) => {
          // @ts-ignore
          return t.code === token.symbol
        })
        // @ts-ignore
        const ratio = await vxm.eosTransit.accessContext.eosRpc.get_table_rows({
          // @ts-ignore
          code: token.relayContract,
          table: 'reserves',
          // @ts-ignore
          scope: token.relayContract,
          limit: 2
        })
        const fee = await vxm.eosTransit.accessContext.eosRpc.get_table_rows({
          // @ts-ignore
          code: token.relayContract,
          table: 'settings',
          // @ts-ignore
          scope: token.relayContract,
          limit: 1
        })
        this.tokens.push({
          // @ts-ignore
          symbol: r.symbol,
          name: r.name,
          img:
            'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
            r.img,
          ratio1: ratio.rows[0].ratio / 10000,
          ratio2: ratio.rows[1].ratio / 10000,
          fee: fee.rows[0].fee / 10000,
          v24h: tokenPrice.volume24h.USD,
          // @ts-ignore
          contract: token.relayContract,
          liqDepth: tokenPrice.liquidityDepth,
          tokenPrice: tokenPrice
        })
      }
    }
    return res
  }

  @Watch('tokenSearch')
  async onSearchChange(val: any, oldVal: any) {
    if (val !== '') {
      this.searchState = 'keyboard'
      this.debouncedGetSearch()
    } else {
      this.searchTokens()
    }
  }

  // methods
  async created() {
    vxm.general.setHeroAction('liq-add')
    // this.relays = await vxm.liquidity.loadRelayTokens()
    await vxm.tokens.getEthPrice()
    await this.updateTokens()
    this.debouncedGetSearch = debounce(() => {
      this.searchTokens()
    }, 500)
  }
}
</script>

<style scoped lang="scss"></style>
