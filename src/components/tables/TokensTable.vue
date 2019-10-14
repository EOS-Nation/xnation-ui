<template>
  <!-- Tokens Table -->
  <div class="block">
    <div class="block-header">
      <h3 class="block-title">All Tokens <small> - EOS</small></h3>
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
                @click="sort('c24h')"
                class="cursor text-center"
                style="min-width: 150px;"
              >
                <sort-icons
                  :currentSort="currentSort"
                  :currentSortDir="currentSortDir"
                  category="c24h"
                />
                24h Change
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
                @click="sort('v24h')"
                class="cursor text-right"
                style="min-width: 150px;"
              >
                <sort-icons
                  :currentSort="currentSort"
                  :currentSortDir="currentSortDir"
                  category="v24h"
                />
                24h Volume
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
              <tr v-for="(token, index) in sortedTokens" :key="index">
                <td
                  class="text-center d-none d-md-table-cell"
                  v-text="index + 1"
                ></td>
                <td class="d-flex justify-content-start align-items-center">
                  <router-link
                    :to="{ name: 'Token', params: { symbol: token.symbol } }"
                    class="mr-2"
                  >
                    <img
                      class="img-avatar img-avatar-thumb img-avatar32"
                      :src="token.img"
                      alt="Token Logo"
                    />
                  </router-link>
                  <router-link
                    :to="{ name: 'Token', params: { symbol: token.symbol } }"
                    class="font-w700"
                  >
                    {{ token.symbol }}
                  </router-link>
                </td>
                <td class="d-none d-md-table-cell">
                  <router-link
                    :to="{ name: 'Token', params: { symbol: token.symbol } }"
                  >
                    <span class="text-muted font-size-sm">{{
                      token.name
                    }}</span>
                  </router-link>
                </td>
                <td
                  class="text-center font-w700"
                  :class="{
                    'text-danger': token.c24h < 0,
                    'text-success': token.c24h > 0
                  }"
                >
                  {{ numeral(token.c24h).format('0,0.00') }}%
                </td>
                <td class="text-center font-w700">
                  <span v-if="token.price < 1">{{
                    numeral(token.price).format('$0,0.000000')
                  }}</span>
                  <span v-else>{{
                    numeral(token.price).format('$0,0.00')
                  }}</span>
                </td>
                <td class="text-right">
                  {{ numeral(token.v24h).format('$0,0') }}
                </td>
                <td class="text-right d-none d-md-table-cell">
                  {{ numeral(token.liqDepth * ethPrice).format('$0,0') }}
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
  <!-- END Tokens Table -->
</template>

<script lang="ts">
import { Watch, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import numeral from 'numeral'
import * as bancorx from '@/assets/_ts/bancorx'
import SortIcons from '@/components/common/SortIcons.vue'
import { TokenPrice } from '@/types/bancor'
const {
  ContentLoader,
  FacebookLoader,
  CodeLoader,
  BulletListLoader,
  InstagramLoader,
  ListLoader
} = require('vue-content-loader')
const debounce = require('lodash.debounce')

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
  // data
  numeral = numeral
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
  private tokens: any = []

  // computed
  get eosTokens() {
    return vxm.tokens.eosTokens
  }

  get ethPrice() {
    return vxm.tokens.ethPrice
  }

  get loading() {
    return vxm.tokens.loadingTokens
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
      if (this.currentSort === 'symbol') {
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

  // method
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
    this.tokens = []
    for (let t of res) {
      this.tokens.push({
        id: t.id,
        symbol: t.code,
        name: t.name,
        image: t.primaryCommunityImageName,
        img:
          'https://files.bancor.network/0.1/images/communities?imageName=' +
          t.primaryCommunityImageName,
        c24h: t.change24h,
        price: t.price,
        v24h: t.volume24h.USD,
        liqDepth: t.liquidityDepth
      })
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

  // Lifecycle hooks
  async created() {
    vxm.tokens.setLoadingTokens(true)
    await vxm.tokens.getEthPrice()
    const res = await this.updateTokens()
    vxm.convert.setToken({ t: res[0], d: 'from' })
    vxm.convert.setToken({ t: res[1], d: 'to' })
    vxm.tokens.setLoadingTokens(false)
    // @ts-ignore
    this.$options.interval = setInterval(this.updateTokens, 10000)
    this.debouncedGetSearch = debounce(() => {
      this.searchTokens()
    }, 500)
  }
  mounted() {}
  updated() {}
  beforeDestroy() {
    // @ts-ignore
    clearInterval(this.$options.interval)
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
