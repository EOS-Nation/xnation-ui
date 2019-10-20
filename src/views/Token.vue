<template>
  <div>
    <hero-token :token="token" />
    <!-- Page Content -->
    <div class="content">
      <b-row v-if="tokenPrice && token">
        <b-col md="4" lg="3">
          <block-tile
            title="Price"
            subtitle="USD"
            :content="numeral(tokenPrice.price).format('$0,0.000000')"
          />
        </b-col>
        <b-col md="4" lg="3">
          <block-tile title="Change 24h" subtitle="USD">
            <span
              :class="{
                'text-success': tokenPrice.change24h > 0,
                'text-danger': tokenPrice.change24h < 0
              }"
            >
              {{ numeral(tokenPrice.change24h / 100).format('0.00%') }}
            </span>
          </block-tile>
        </b-col>
        <b-col md="4" lg="3">
          <block-tile
            title="Blockchain"
            :content="token.details[0].blockchain.type.toUpperCase()"
          />
        </b-col>
        <b-col md="4" lg="3">
          <block-tile title="Contract" subtitle="Decimals">
            {{ token.details[0].blockchainId }}
            <span class="font-size-lg text-muted">
              - {{ token.details[0].decimals }}</span
            >
          </block-tile>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <div class="block block-rounded bg-white">
            <div class="block-header">
              <h3 class="block-title">Title <small>Subtitle</small></h3>
            </div>
            <div class="block-content">
              <div v-html="description"></div>
            </div>
          </div>
        </b-col>
      </b-row>
    </div>
    <!-- END Page Content -->
  </div>
</template>

<script lang="ts">
import { Prop, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import { baseApi } from '@/api/BaseApi'
import HeroToken from '@/components/hero/HeroToken.vue'
import showdown from 'showdown'
import { TokenPrice } from '@/types/bancor'
import numeral from 'numeral'
import BlockTile from '@/components/common/BlockTile.vue'
showdown.setOption('simplifiedAutoLink', 'true')
const mdConverter = new showdown.Converter()

@Component({
  components: {
    HeroToken,
    BlockTile
  }
})
export default class Token extends Vue {
  // prop
  @Prop() private symbol!: string

  // data
  numeral = numeral
  token: any = false

  // computed
  get wallet() {
    return vxm.eosTransit.wallet
  }

  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated
    else return false
  }

  get description() {
    return mdConverter.makeHtml(this.token.about)
  }

  get tokenPrice() {
    const tokenPrice = vxm.tokens.eosTokens.find(
      (t: TokenPrice) => t.code === this.symbol.toUpperCase()
    )
    if (tokenPrice) return tokenPrice
    else return undefined
  }

  // methods
  logout() {
    vxm.eosTransit.logout()
  }
  async created() {
    try {
      let token = await baseApi.getToken(this.symbol.toUpperCase())
      this.token = token
    } catch (e) {
      console.log(e)
    }
  }
}
</script>

<style lang="scss">
img {
  max-height: 400px;
}
</style>
