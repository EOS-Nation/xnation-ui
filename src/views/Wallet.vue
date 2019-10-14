<template>
  <div>
    <hero-wallet account="" />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import apiBancor from '@/api/bancor'
import HeroWallet from '@/components/hero/HeroWallet.vue'
import * as bancorx from 'bancorx'
import { TokenPrice } from '@/types/bancor'

const numeral = require('numeral')

@Component({
  components: {
    HeroWallet
  }
})
export default class Wallet extends Vue {
  // data
  tokens: any = []
  relays: any = []
  balances: any = []
  numeral = numeral

  // computed
  get wallet() {
    return vxm.eosTransit.wallet
  }

  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated
    else return false
  }

  // methods
  logout() {
    vxm.eosTransit.logout()
  }

  async getRelays() {
    for (const token of this.tokens) {
      const resp = await bancorx.relays[token.code]
      if (resp) this.relays.push(resp)
    }
    this.getBalances()
  }

  async getBalances() {
    for (const relay of this.relays) {
      await vxm.eosTransit.accessContext.eosRpc
        .get_currency_balance(relay.code, 'hodlhodlhodl')
        .then(result => {
          if (parseFloat(result[0])) {
            const balance = parseFloat(result[0].split(' ')[0])
            const symbol = result[0].split(' ')[1]
            const token = this.tokens.find((t: TokenPrice) => t.code === symbol)
            this.balances.push({
              name: token.name,
              logo_url:
                'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
                token.primaryCommunityImageName,
              contract: relay.code,
              symbol: symbol,
              balance: balance,
              price: token.price,
              c24h: token.change24h,
              value: balance * token.price
            })
          }
        })
        .catch(error => {
          console.log(error)
        })
    }
  }

  async created() {
    try {
      const endpoint = 'currencies/tokens'
      const params = {
        limit: 150,
        skip: 0,
        fromCurrencyCode: 'USD',
        includeTotal: true,
        orderBy: 'volume24h',
        sortOrder: 'desc',
        blockchainType: 'eos'
      }
      let tokens = await apiBancor(endpoint, params)
      this.tokens = tokens.data.data.page
      this.getRelays()
    } catch (e) {
      console.log(e)
    }
  }
}
</script>

<style scoped lang="scss"></style>
