<template>
  <div>
    <hero-actions />
    <!-- Page Content -->
    <div class="content content-boxed">
      <b-row>
        <b-col md="4" lg="3">
          <div class="block">
            <div class="block-header">
              <h3 class="block-title">Token Diversity<small> - EOS</small></h3>
            </div>
            <div class="block-content text-center">
              <h2>{{ balances.length }}/{{ tokens.length }}</h2>
            </div>
          </div>
        </b-col>
        <b-col md="4" lg="3">
          <div class="block" :class="{ 'block-mode-loading': loading }">
            <div class="block-header">
              <h3 class="block-title">24h Change<small> - %</small></h3>
            </div>
            <div class="block-content text-center">
              <h2
                :class="{
                  'text-success': totalPercentage24h > 0,
                  'text-danger': totalPercentage24h < 0
                }"
              >
                {{ numeral(totalPercentage24h / 100).format('0.00%') }}
              </h2>
            </div>
          </div>
        </b-col>
        <b-col md="4" lg="3">
          <div class="block" :class="{ 'block-mode-loading': loading }">
            <div class="block-header">
              <h3 class="block-title">24h Gain<small> - USD</small></h3>
            </div>
            <div class="block-content text-center">
              <h2
                :class="{
                  'text-success': totalBalance24h > 0,
                  'text-danger': totalBalance24h < 0
                }"
              >
                ${{ numeral(totalBalance24h).format('0,0.00') }}
              </h2>
            </div>
          </div>
        </b-col>
        <b-col md="4" lg="3">
          <div class="block" :class="{ 'block-mode-loading': loading }">
            <div class="block-header">
              <h3 class="block-title">Total Balance<small> - USD</small></h3>
            </div>
            <div class="block-content text-center">
              <h2>{{ numeral(totalBalance).format('$0,0.00') }}</h2>
            </div>
          </div>
        </b-col>
      </b-row>
      <div class="block">
        <div class="block-header">
          <h3 class="block-title">EOS <small>Token Balances</small></h3>
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
                  style="min-width: 250px;"
                >
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="symbol"
                  />
                  Token
                </th>
                <th @click="sort('balance')" class="cursor text-right">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="balance"
                  />
                  Balance
                </th>
                <th @click="sort('c24h')" class="cursor text-center">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="c24h"
                  />
                  24h Change
                </th>
                <th @click="sort('price')" class="cursor text-right">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="price"
                  />
                  Price USD
                </th>
                <th @click="sort('value')" class="cursor text-right">
                  <sort-icons
                    :currentSort="currentSort"
                    :currentSortDir="currentSortDir"
                    category="value"
                  />
                  Value
                </th>
                <th class="text-right" style="width: 200px;">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(token, index) in sortedTokens" :key="index">
                <th class="text-center" v-text="index + 1"></th>
                <th class="text-left font-w700" style="width: 160px">
                  <img
                      class="img-avatar img-avatar-thumb img-avatar32 mr-3"
                      :src="token.logo_url"
                      alt=""
                    />
                    <span>{{ token.symbol }}</span>
                </th>
                <td>
                  <span class="text-muted font-size-sm">{{
                    token.name
                  }}</span>
                </td>
                <td class="text-right font-w700">
                  {{ numeral(token.balance).format('0,0.0000') }}
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
                <td class="text-right font-w700">
                  <span v-if="token.price < 1">{{
                    numeral(token.price).format('$0,0.000000')
                  }}</span>
                  <span v-else>{{
                    numeral(token.price).format('$0,0.00')
                  }}</span>
                </td>
                <td class="text-right font-w700">
                  <span v-if="token.value < 0.01" v-text="'< $0.01'"></span>
                  <span v-else>{{
                    numeral(token.value).format('$0,0.00')
                  }}</span>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- END Page Content -->
  </div>
</template>

<script lang="ts">
import { Prop, Watch, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import {  baseApi } from '@/api/BaseApi'
import apiBancor, { bancorApi } from '@/api/bancor'
import * as bancorx from '@/assets/_ts/bancorx'
import { TokenPrice } from '@/types/bancor'
import SortIcons from '@/components/common/SortIcons.vue'
import HeroActions from '@/components/hero/HeroActions.vue'
import numeral from 'numeral'
import { TokenInfo } from '@/assets/_ts/bancorx'

@Component({
  components: {
    HeroActions,
    SortIcons
  }
})
export default class WalletAccount extends Vue {
  // props
  @Prop() account!: string

  // data
  tokens: any = []
  relays: any = []
  balances: any = []
  numeral = numeral
  loading = true
  currentSort = 'value'
  currentSortDir = 'desc'

  // computed
  get wallet() {
    return vxm.eosTransit.wallet
  }

  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated
    else return false
  }

  get totalBalance() {
    let total = 0
    for (const balance of this.balances) {
      total += balance.value
    }
    return total
  }

  get totalBalance24h() {
    let total = 0
    for (const balance of this.balances) {
      total += balance.value24hChange
    }
    return total
  }

  get totalPercentage24h() {
    return (this.totalBalance24h * 100) / this.totalBalance
  }

  get sortedTokens() {
    return this.balances.sort((a: any, b: any) => {
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

  // methods
  async getRelays() {
    this.relays = []
    for (const token of this.tokens) {
      const resp = await bancorx.relays[token.code]
      if (resp) this.relays.push(resp)
    }
    return
  }

  async getBalancesOld() {
    this.balances = []
    for (const relay of this.relays) {
      const reserve = bancorx.reserveTokens[relay.symbol]
      await vxm.eosTransit.accessContext.eosRpc
        .get_currency_balance(reserve.code, this.account, reserve.symbol)
        .then(result => {
          if (parseFloat(result[0])) {
            const balance = parseFloat(result[0].split(' ')[0])
            const symbol = result[0].split(' ')[1]
            const token = this.tokens.find(
              (t: TokenPrice) => t.code === relay.symbol
            )
            this.balances.push({
              reserveToken: true,
              name: token.name,
              logo_url:
                'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
                token.primaryCommunityImageName,
              contract: relay.code,
              symbol: symbol,
              balance: balance,
              price: 0,
              c24h: 0,
              value: 0,
              value24hChange: 0,
              tokenPrice: token
            })
          }
        })
        .catch(error => {
          console.log(error)
        })
      await vxm.eosTransit.accessContext.eosRpc
        .get_currency_balance(relay.code, this.account, relay.symbol)
        .then(result => {
          if (parseFloat(result[0])) {
            const balance = parseFloat(result[0].split(' ')[0])
            const symbol = result[0].split(' ')[1]
            const token = this.tokens.find((t: TokenPrice) => t.code === symbol)
            this.balances.push({
              reserveToken: false,
              name: token.name,
              logo_url:
                'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
                token.primaryCommunityImageName,
              contract: relay.code,
              symbol: symbol,
              balance: balance,
              price: token.price,
              c24h: token.change24h,
              value: balance * token.price,
              value24hChange: ((balance * token.price) / 100) * token.change24h,
              tokenPrice: token
            })
          }
        })
        .catch(error => {
          console.log(error)
        })
    }
  }
  async getBalances() {
    this.balances = []
    const b = await vxm.wallet.getTokenBalances(this.account)
    //const relays = await vxm.liquidity.loadRelayTokens()
    for (const token of b) {
      const tokenInfo: TokenInfo | false = bancorx.getTokenInfo(token.symbol)
      if (tokenInfo && token.amount) {
        const tokenPrice = this.tokens.find((t: TokenPrice) => {
          return t.code === token.symbol
        })
        if (tokenPrice) {
          this.balances.push({
            reserveToken: tokenInfo.relayToken,
            name: tokenInfo.name,
            logo_url:
              'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
              tokenInfo.img,
            contract: tokenInfo.relayContract,
            symbol: tokenInfo.symbol,
            balance: token.amount,
            price: tokenPrice.price,
            c24h: tokenPrice.change24h,
            value: token.amount * tokenPrice.price,
            value24hChange:
              ((token.amount * tokenPrice.price) / 100) * tokenPrice.change24h,
            tokenPrice: tokenPrice
          })
        } else {
          try {
            const symbol = tokenInfo.symbol.toUpperCase();
            const { price, price24h } = await bancorApi.getTokenTicker(symbol)
            const c24h = (price / price24h) * 100 - 100
            this.balances.push({
              reserveToken: tokenInfo.relayToken,
              name: tokenInfo.name,
              logo_url:
                'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
                tokenInfo.img,
              contract: tokenInfo.relayContract,
              symbol: tokenInfo.symbol,
              balance: token.amount,
              price: price,
              c24h: c24h,
              value: token.amount * price,
              value24hChange: ((token.amount * price) / 100) * c24h
            })
          } catch (e) {
            console.log(e)
          }
        }
      }
    }
  }
  async getTokens() {
    this.tokens = await baseApi.getTokens()
    vxm.tokens.setTokens({ eos: this.tokens, eth: [] })
    //vxm.convert.setToken({ t: this.tokens[0], d: 'from' })
    //vxm.convert.setToken({ t: this.tokens[1], d: 'to' })
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

  sort(s: string) {
    if (s === this.currentSort) {
      this.currentSortDir = this.currentSortDir === 'asc' ? 'desc' : 'asc'
    }
    this.currentSort = s
  }

  @Watch('account')
  async onAccountChange(val: any, oldVal: any) {
    this.loading = true
    await this.getBalances()
    this.loading = false
  }

  async created() {
    vxm.general.setHeroAction('transfer')
    this.loading = true
    await this.getTokens()
    //await this.getRelays()
    await this.getBalances()
    this.loading = false
  }
}
</script>

<style scoped lang="scss"></style>
