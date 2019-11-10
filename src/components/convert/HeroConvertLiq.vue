<template>
  <div>
    <token-amount-input 
      v-if="direction === 'from'"
      small
      :amount.sync="amount"
      @click="openSelectTokenModal"
      dropdown
      @dropdown="openSelectTokenModal"
      :symbol="token.symbol"
      :img="token.img"
    />
    <token-amount-input 
      v-else
      small
      :amount.sync="minReturn"
      @click="openSelectTokenModal"
      dropdown
      @dropdown="openSelectTokenModal"
      :symbol="token.symbol"
      :img="token.img"
    />

    <token-amount-input 
      small
      :amount.sync="amountBnt"
      @click="openSelectTokenModal"
      symbol="BNT"
      img="https://storage.googleapis.com/bancor-prod-file-store/images/communities/f80f2a40-eaf5-11e7-9b5e-179c6e04aa7c.png"
    />

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
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";

@Component({
  components: {
    Percentages,
    TokenAmountInput
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
    return this.direction === 'from' ? vxm.liquidity.fromToken : vxm.liquidity.toToken
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

  get balance() {
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
