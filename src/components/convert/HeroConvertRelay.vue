<template>
  <div>
    <div>
      <img
        class="img-avatar img-avatar-thumb cursor"
        :src="
            token.img
        "
        alt="Token Logo"
        @click="openSelectTokenModal()"
      />
      <div
        @click="openSelectTokenModal()"
        class="font-size-lg text-white mt-3 mb-3 cursor"
      >
        {{ token.symbol }}
      </div>
      <b-input-group class="mt-1">
        <b-form-input
          v-if="direction === 'from'"
          v-model="amount"
          class="form-control-alt"
          placeholder="Enter Amount"
        ></b-form-input>
        <b-form-input
          v-else
          v-model="minReturn"
          class="form-control-alt"
          placeholder="Enter Amount"
        ></b-form-input>
        <b-input-group-append>
          <b-button @click="openSelectTokenModal()">
            {{ token.symbol }}
            <font-awesome-icon icon="angle-down" />
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
            <span v-else>{{ numeral(balance).format('0,0[.][0000]') }}</span>
          </div>
          <div
            v-if="balance > 0 && direction === 'from'"
            class="text-white-50 cursor"
          >
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
</template>

<script lang="ts">
import { Prop, Watch, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import debounce from 'lodash.debounce'
import numeral from 'numeral'
import { TokenInfo } from '@/assets/_ts/bancorx'
import * as bancorx from '@/assets/_ts/bancorx'

@Component({
  components: {}
})
export default class HeroConvertRelay extends Vue {
  // props
  @Prop() direction!: 'from' | 'to'

  // data
  public debouncedCalcReturn: any
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

  get heroAction() {
    return vxm.general.heroAction
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
      vxm.liquidity.setMinReturn('')
      vxm.liquidity.setAmountBnt('')
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
      vxm.liquidity.setMinReturn('')
      vxm.liquidity.setAmountBnt('')
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
    if (this.$route.name == 'Relay') {
       this.$bvModal.show('modal-select-relay')
       return
    }
    if (this.$route.name === 'Relays') {
      if (vxm.general.heroAction === 'convert') {
        this.$bvModal.show('modal-select-all')
      } else this.$bvModal.show('modal-select-relays')
    } else this.$bvModal.show('modal-select-all')
  }

  setPercentage(p: number) {
    this.amount = bancorx.tokenPrecision(
      this.token.symbol,
      ((parseFloat(this.balance) * p) / 100).toString()
    )
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
        if (this.heroAction === 'liq-remove')
          vxm.liquidity.calcDualRemoveConversion()
        // else if (this.heroAction === 'liq-remove') vxm.liquidity.calcDualRemove()
        else vxm.liquidity.calcMinReturn()
        this.$ga.event(
          vxm.liquidity.fromToken.symbol,
          'calculate',
          vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
        )
      } else {
        if (this.heroAction === 'liq-add') vxm.liquidity.calcDualInverse()
        else vxm.liquidity.calcAmount()
        this.$ga.event(
          vxm.liquidity.fromToken.symbol,
          'calculateInverse',
          vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
        )
      }
    }, 1000)
  }
  mounted() {}
  updated() {}
  destroyed() {}
}
</script>

<style lang="scss" scoped></style>
