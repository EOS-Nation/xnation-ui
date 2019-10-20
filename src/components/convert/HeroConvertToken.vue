<template>
  <div v-if="!loadingTokens">
    <img
      class="img-avatar img-avatar-thumb cursor"
      :src="
          token.primaryCommunityImageName
      "
      alt="Token Logo"
      @click="openSelectTokenModal(direction)"
    />
    <div
      @click="openSelectTokenModal(direction)"
      class="font-size-lg text-white mt-3 mb-3 cursor"
    >
      {{ token.name }}
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
        <b-button @click="openSelectTokenModal(direction)">
          {{ token.code }}
          <font-awesome-icon icon="angle-down" />
        </b-button>
      </b-input-group-append>
    </b-input-group>
    <div>
      <span
        v-if="direction === 'from'"
        class="text-white font-size-sm"
        style="min-height: 50px"
      >
        <div>
          Available:
          <span v-if="loadingBalance">
            <font-awesome-icon icon="circle-notch" class="text-white" spin />
          </span>
          <span v-else>{{ availableBalance }}</span>
        </div>
        <div v-if="availableBalance > 0" class="text-white-50 cursor">
          <span @click="setPercentage(10)">10%</span>
          -
          <span @click="setPercentage(25)">25%</span>
          -
          <span @click="setPercentage(50)">50%</span>
          -
          <span @click="setPercentage(100)">100%</span>
        </div>
      </span>
      <div v-else style="min-height: 50px">
        <div class="text-white font-size-sm p-0 m-0">
          Balance:
          <span v-if="loadingBalance">
            <font-awesome-icon icon="circle-notch" class="text-white" spin />
          </span>
          <span v-else>{{ availableBalance }}</span>
        </div>
        <span v-if="minReturn" class="text-white-50 font-size-sm p-0 m-0"
          >Value USD: {{ usdValue }}</span
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Prop, Watch, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import debounce from 'lodash.debounce'
import numeral from 'numeral'

@Component({
  components: {}
})
export default class HeroConvertToken extends Vue {
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

  get token() {
    if (this.direction === 'from') return vxm.convert.convertFrom
    else return vxm.convert.convertTo
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

  get amount() {
    if (this.direction === 'from') return vxm.convert.amount
    else return vxm.convert.minReturn
  }

  set amount(val) {
    if (val) {
      vxm.convert.setAmount({ d: 'from', amount: val })
      this.debouncedState = 'loading'
      this.debouncedCalcReturn()
    } else {
      vxm.convert.setAmount({ d: 'from', amount: '' })
      vxm.convert.setAmount({ d: 'to', amount: '' })
    }
  }

  get minReturn() {
    if (this.direction === 'from') return vxm.convert.amount
    else return vxm.convert.minReturn
  }

  set minReturn(val) {
    if (val) {
      vxm.convert.setAmount({ d: 'to', amount: val })
      this.debouncedState = 'loading'
      this.debouncedCalcReturn()
    } else {
      vxm.convert.setAmount({ d: 'from', amount: '' })
      vxm.convert.setAmount({ d: 'to', amount: '' })
    }
  }

  get usdValue() {
    return numeral(this.token.price * parseFloat(this.minReturn)).format(
      '$0,0.00'
    )
  }

  get loadingTokens() {
    return vxm.tokens.loadingTokens
  }

  // method
  openSelectTokenModal(d: 'from' | 'to') {
    vxm.convert.setDirection(d)
    this.$bvModal.show('modal-select-token')
  }

  setPercentage(p: number) {
    this.amount = ((parseFloat(this.availableBalance) * p) / 100).toString()
  }

  async loadBalance() {
    if (this.isAuthenticated) {
      this.loadingBalance = true
      const balance = await vxm.wallet.availableBalance({
        symbol: this.token.code,
        reserve: false,
        account: this.isAuthenticated
      })
      this.loadingBalance = false
      return balance
    } else return '0'
  }

  @Watch('token')
  async onTokenChange(val: any, oldVal: any) {
    this.availableBalance = await this.loadBalance()
  }

  @Watch('isAuthenticated')
  async onAuthChange(val: any, oldVal: any) {
    this.availableBalance = await this.loadBalance()
  }

  // Lifecycle hooks
  async created() {
    this.availableBalance = await this.loadBalance()
    this.debouncedCalcReturn = debounce(() => {
      this.debouncedState = 'loading'
      vxm.convert.initConversion(this.direction)
    }, 1000)
  }
  mounted() {}
  updated() {}
  destroyed() {}
}
</script>

<style lang="scss" scoped></style>
