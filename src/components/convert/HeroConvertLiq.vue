<template>
  <div>
    <div class="d-flex align-items-center p-4">
      <div class="cursor" @click="openSelectTokenModal">
        <img class="img-avatar img-avatar-thumb" :src="token.img" alt="Token Logo" />
      </div>
      <div class="ml-4 text-left">
        <h3 @click="openSelectTokenModal" class="mb-0 mt-0 text-white cursor">
          {{ token.symbol }} AAAAA
        </h3>
        <b-input-group class="mt-1">
          <b-form-input :v-model="direction === 'from' ? amount : minReturn" class="form-control-alt" placeholder="Enter Amount"></b-form-input>
          <b-input-group-append>
            <b-button @click="openSelectTokenModal">
              {{ token.symbol }}
              <font-awesome-icon icon="angle-down" />
            </b-button>
          </b-input-group-append>
        </b-input-group>
        <percentages v-if="false" :balance="balance" :amount.sync="amount" />
      </div>
    </div>
    <div class="d-flex align-items-center p-4">
      <div>
        <img class="img-avatar img-avatar-thumb" src="https://storage.googleapis.com/bancor-prod-file-store/images/communities/f80f2a40-eaf5-11e7-9b5e-179c6e04aa7c.png" alt="Token Logo" />
      </div>
      <div class="ml-4 text-left">
        <h3 class="mb-0 mt-0 text-white">BNT</h3>
        <b-input-group class="mt-1">
          <b-form-input v-model="amountBnt" class="form-control-alt" placeholder="Enter Amount"></b-form-input>
          <b-input-group-append>
            <b-button>
              BNT
            </b-button>
          </b-input-group-append>
        </b-input-group>
        <div>
          <span class="text-white font-size-sm" style="min-height: 50px">
            <div>
              Available:
              <span v-if="loadingBalance">
                <font-awesome-icon icon="circle-notch" class="text-white" spin />
              </span>
              <span v-else>{{ numeral(balanceBnt).format('0,0[.][0000]') }}
              </span>
            </div>
            <div v-if="false && balanceBnt > 0 && direction === 'from'" class="text-white-50 cursor">
              <span @click="setPercentage(10)">10%</span>
              -
              <span @click="setPercentage(25)">25%</span>
              -
              <span @click="setPercentage(50)">50%</span>
              -
              <span @click="setPercentage(100)">100%</span>
            </div>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Prop, Watch, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import debounce from 'lodash.debounce'
import numeral from 'numeral'
import { TokenInfo } from '@/assets/_ts/bancorx'
import Percentages from './Percentages.vue';
import * as bancorx from '@/assets/_ts/bancorx'

@Component({
  components: {
    Percentages
  }
})
export default class HeroConvertLiq extends Vue {
  // props
  @Prop() direction!: 'from' | 'to'

  // data
  public debouncedCalcReturn: any
  public debouncedCalcBntReturn: any
  availableBalance = '0'
  loadingBalance = false
  numeral = numeral

  // computed
  get isAuthenticated() {
    return vxm.eosTransit.isAuthenticated
  }

  get token(): TokenInfo {
    if (this.direction === 'from') return vxm.liquidity.fromToken
    else return vxm.liquidity.toToken
  }

  get tokens() {
    return vxm.tokens.eosTokens
  }

  get debouncedState() {
    return vxm.convert.debouncedState
  }

  set debouncedState(val) {
    vxm.convert.setDebouncedState(val)
  }

  get relaySelect() {
    return vxm.liquidity.relaySelect
  }

  set relaySelect(val) {
    vxm.liquidity.setRelaySelect(val)
  }

  get amount() {
    return vxm.liquidity.amount
  }

  set amount(val) {
    if (val) {
      vxm.liquidity.setAmount(val)
      vxm.liquidity.setRateLoading(true)
      this.debouncedState = 'loading'
      this.debouncedCalcReturn()
    } else {
      vxm.liquidity.setAmount('')
      vxm.liquidity.setAmountBnt('')
      vxm.liquidity.setMinReturn('')
    }
  }

  get amountBnt() {
    return vxm.liquidity.amountBnt
  }

  set amountBnt(val) {
    if (val) {
      vxm.liquidity.setAmountBnt(val)
      vxm.liquidity.setRateLoading(true)
      this.debouncedState = 'loading'
      this.debouncedCalcBntReturn()
    } else {
      vxm.liquidity.setAmount('')
      vxm.liquidity.setAmountBnt('')
      vxm.liquidity.setMinReturn('')
    }
  }

  get minReturn() {
    return vxm.liquidity.minReturn
  }

  set minReturn(val) {
    if (val) {
      vxm.liquidity.setMinReturn(val)
      vxm.liquidity.setRateLoading(true)
      this.debouncedState = 'loading'
      this.debouncedCalcReturn()
    } else {
      vxm.liquidity.setAmount('')
      vxm.liquidity.setAmountBnt('')
      vxm.liquidity.setMinReturn('')
    }
  }

  get usdValue() {
    return '$0,0.00'
  }

  get loadingTokens() {
    return vxm.tokens.loadingTokens
  }

  // method
  openSelectTokenModal() {
    vxm.liquidity.setDirection(this.direction)
    this.$bvModal.show('modal-select-token')
  }

  setPercentage(p: number) {
    this.amount = bancorx.tokenPrecision(
      this.token.symbol,
      ((parseFloat(this.balance) * p) / 100).toString()
    )
  }

  get balance() {
    return `5.0000`
    let balance: any
    if (this.isAuthenticated) {
      balance = vxm.wallet.tokenBalances.find((t: any) => {
        return t.symbol === this.token.symbol
      })
      if (balance && balance.amount) return balance.amount.toString()
      else return '0'
    } else return '---'
  }

  get balanceBnt() {
    let balance: any
    if (this.isAuthenticated) {
      balance = vxm.wallet.tokenBalances.find((t: any) => {
        return t.symbol === 'BNT'
      })
      if (balance && balance.amount) return balance.amount.toString()
      else return '0'
    } else return '---'
  }

  async loadBalance() {
    this.loadingBalance = true
    let balance: any
    if (this.isAuthenticated) {
      balance = vxm.wallet.tokenBalances.find((t: any) => {
        return t.symbol === this.token.symbol
      })
      this.loadingBalance = false
      if (balance && balance.amount) return balance.amount.toString()
      else return '0'
    } else return '---'
  }

  @Watch('token')
  async onTokenChange(val: any, oldVal: any) {
    // this.availableBalance = await this.loadBalance()
    vxm.liquidity.calcMinReturn()
  }

  @Watch('isAuthenticated')
  async onAuthChange(val: any, oldVal: any) {
    // this.availableBalance = await this.loadBalance()
  }

  // Lifecycle hooks
  async created() {
    // this.availableBalance = await this.loadBalance()
    this.debouncedCalcReturn = debounce(() => {
      this.debouncedState = 'loading'
      if (this.direction === 'from') {
        vxm.liquidity.calcDualConversion()
        this.$ga.event(
          vxm.liquidity.fromToken.symbol,
          'calculate',
          vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
        )
      } else {
        vxm.liquidity.calcDualRemoveInverse()
        this.$ga.event(
          vxm.liquidity.fromToken.symbol,
          'calculateInverse',
          vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
        )
      }
    }, 1000)
    this.debouncedCalcBntReturn = debounce(() => {
      this.debouncedState = 'loading'
      if (this.direction === 'from') {
        vxm.liquidity.calcDualBntConversion()
        this.$ga.event(
          vxm.liquidity.fromToken.symbol,
          'calculate',
          vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
        )
      } else {
        vxm.liquidity.calcDualRemoveBntConversion()
        this.$ga.event(
          vxm.liquidity.fromToken.symbol,
          'calculateInverse',
          vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
        )
      }
    }, 1000)
  }
  mounted() { }
  updated() { }
  destroyed() { }
}
</script>

<style lang="scss" scoped></style>
