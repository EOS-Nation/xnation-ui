<template>
  <div>
    <breadcrumbs
      :items="['Tokens', 'Convert', convertFrom.code + ' - ' + convertTo.code]"
    />
    <div class="content content-boxed">
      <b-row>
        <b-col md="5" lg="5" xl="4">
          <div class="w-100">
            <div class="block" :class="{ 'block-mode-loading': loadingTokens }">
              <div
                @click="openSelectTokenModal('from')"
                class="block-content d-flex align-items-center p-3 cursor"
              >
                <div class="ml-1 mr-4">
                  <font-awesome-icon icon="chevron-down" class="text-muted" />
                </div>
                <div>
                  <img
                    class="img-avatar img-avatar-thumb"
                    :src="
                        convertFrom.primaryCommunityImageName
                    "
                    alt="Token Logo"
                  />
                </div>
                <div class="ml-4">
                  <h3 class="mb-0 mt-0">{{ convertFrom.code }}</h3>
                  <h4 class="text-muted m-0">{{ convertFrom.name }}</h4>
                </div>
              </div>
            </div>
            <div
              class="block d-none d-md-block"
              :class="{ 'block-mode-loading': loadingTokens }"
            >
              <div class="block-header block-header-default text-center">
                <h3 class="block-title">Token Information</h3>
              </div>
              <div class="block-content">
                <table
                  class="table table-striped table-borderless font-size-sm"
                >
                  <tbody>
                    <tr>
                      <td>Price 1 {{ convertFrom.code }}</td>
                      <td>
                        <span v-if="convertFrom.price >= 1" class="font-w600">{{
                          numeral(convertFrom.price).format('$0,0.00')
                        }}</span>
                        <span v-else class="font-w600">{{
                          numeral(convertFrom.price).format('$0.00000')
                        }}</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Change 24h
                      </td>
                      <td>
                        <span
                          class="font-w600"
                          :class="
                            convertFrom.change24h >= 0
                              ? 'text-success'
                              : 'text-danger'
                          "
                          >{{
                            numeral(convertFrom.change24h).format('0.00')
                          }}%</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Volume 24h
                      </td>
                      <td>
                        <span class="font-w600">{{
                          numeral(convertFrom.volume24h.USD).format('$0,0')
                        }}</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Relay Contract
                      </td>
                      <td>
                        <span class="font-w600">samplecontract</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Decimals
                      </td>

                      <td>
                        <span class="font-w600">4</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </b-col>
        <b-col md="7" lg="7" xl="8">
          <div
            class="block pb-3"
            :class="{ 'block-mode-loading': loadingTokens }"
          >
            <div class="block-content font-size-sm">
              <action-table
                :title="'CONVERT ' + convertFrom.code"
                icon="arrow-right"
                :valid="validate()"
              >
                <div class="d-flex align-items-center">
                  <div
                    @click="openSelectTokenModal('from')"
                    class="ml-1 mr-3 cursor"
                  >
                    <img
                      class="img-avatar img-avatar48"
                      :src="
                          convertFrom.primaryCommunityImageName
                      "
                      alt="Token Logo"
                    />
                  </div>
                  <div class="w-100 mt-2">
                    <b-form-input
                      :state="validate()"
                      v-model="amount"
                      id="input-large"
                      size="lg"
                      placeholder="Send Amount"
                    ></b-form-input>
                    <div class="px-1 pt-1">
                      <span>Available: </span
                      ><span class="font-w600"
                        ><font-awesome-icon
                          v-if="showLoading && loginStatus[0] !== 'Login'"
                          icon="circle-notch"
                          spin
                        /><span v-else>{{ balance }}</span></span
                      ><span class="float-right">
                        <span
                          @click="setPercentage(10)"
                          @mouseenter="mouseOn = 10"
                          @mouseleave="mouseOn = 0"
                          class="cursor"
                          :class="mouseOn === 10 ? 'font-w600' : ''"
                          >10%</span
                        >
                        -
                        <span
                          @click="setPercentage(25)"
                          @mouseenter="mouseOn = 25"
                          @mouseleave="mouseOn = 0"
                          class="cursor"
                          :class="mouseOn === 25 ? 'font-w600' : ''"
                          >25%</span
                        >
                        -
                        <span
                          @click="setPercentage(50)"
                          @mouseenter="mouseOn = 50"
                          @mouseleave="mouseOn = 0"
                          class="cursor"
                          :class="mouseOn === 50 ? 'font-w600' : ''"
                          >50%</span
                        >
                        -
                        <span
                          @click="setPercentage(100)"
                          @mouseenter="mouseOn = 100"
                          @mouseleave="mouseOn = 0"
                          class="cursor"
                          :class="mouseOn === 100 ? 'font-w600' : ''"
                          >100%</span
                        >
                      </span>
                    </div>
                  </div>
                </div>
              </action-table>
              <action-table
                :title="'RECEIVE ' + convertTo.code"
                icon="arrow-left"
                :valid="validate()"
              >
                <div class="d-flex align-items-center">
                  <div
                    @click="openSelectTokenModal('to')"
                    class="ml-1 mr-3 cursor"
                  >
                    <img
                      class="img-avatar img-avatar48"
                      :src="
                          convertTo.primaryCommunityImageName
                      "
                      alt="Token Logo"
                    />
                  </div>
                  <div class="w-100 mt-2">
                    <b-form-input
                      :state="validate()"
                      v-model="minReturn"
                      id="input-large"
                      size="lg"
                      placeholder="Receive Amount"
                    ></b-form-input>
                    <div class="px-1 pt-1">
                      <span>Current Balance: </span
                      ><span class="font-w600"
                        ><font-awesome-icon
                          v-if="showLoading && loginStatus[0] !== 'Login'"
                          icon="circle-notch"
                          spin
                        /><span v-else>{{ balanceTo }}</span></span
                      >
                    </div>
                  </div>
                </div>
              </action-table>
            </div>
            <div class="block-content text-center pt-0 text-muted font-size-sm">
              Value:
              <span v-if="amount" class="font-w600">{{
                numeral(parseFloat(amount) * convertFrom.price).format(
                  '$0,0.00'
                )
              }}</span
              ><span v-else>---</span>
            </div>
            <div class="block-content text-center">
              <b-btn v-if="validate()" @click="initConvert()" variant="success"
                >CONVERT</b-btn
              >
              <b-btn
                v-else-if="validate() === null"
                variant="success"
                :disabled="true"
                >CONVERT</b-btn
              >
              <b-btn
                v-else
                variant="danger"
                :disabled="true"
                class="text-uppercase"
                >insufficient FUNDS</b-btn
              >
            </div>
          </div>
        </b-col>
      </b-row>
    </div>
    <modal-select-token :direction="direction" />
    <modal-convert-token />
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import HeroConvert from '@/components/hero/HeroConvert.vue'
import ModalSelectToken from '@/components/modals/ModalSelectToken.vue'
import ModalConvertToken from '@/components/modals/ModalConvertToken.vue'
import TokensTable from '@/components/tables/TokensTable.vue'
import Breadcrumbs from '@/components/layout/Breadcrumbs.vue'
import * as bancorx from '@/assets/_ts/bancorx'
import debounce from 'lodash.debounce'
import ActionTable from '@/components/common/ActionTable.vue'
const numeral = require('numeral')
const {
  ContentLoader,
  FacebookLoader,
  CodeLoader,
  BulletListLoader,
  InstagramLoader,
  ListLoader
} = require('vue-content-loader')

@Component({
  components: {
    Breadcrumbs,
    HeroConvert,
    TokensTable,
    ModalSelectToken,
    ModalConvertToken,
    ContentLoader,
    FacebookLoader,
    CodeLoader,
    BulletListLoader,
    InstagramLoader,
    ListLoader,
    ActionTable
  }
})
export default class ConvertAdvanced extends Vue {
  // data
  numeral = numeral
  balance = '---'
  balanceTo = '---'
  mouseOn = 0
  direction = 'from'
  showLoading = true
  public debouncedCalcReturn: any

  // computed
  get isAuthenticated() {
    return vxm.eosTransit.isAuthenticated
  }

  get loginStatus() {
    return vxm.eosTransit.loginStatus
  }

  get loadingTokens() {
    return vxm.tokens.loadingTokens
  }

  get convertFrom() {
    return vxm.convert.convertFrom
  }

  get convertTo() {
    return vxm.convert.convertTo
  }

  get amount() {
    return vxm.convert.amount
  }
  set amount(val) {
    if (val) {
      vxm.convert.setAmount({ d: 'to', amount: 'calculating' })
      vxm.convert.setAmount({ d: 'from', amount: val })
      this.debouncedState = 'loading'
      this.debouncedCalcReturn()
    } else {
      vxm.convert.setAmount({ d: 'from', amount: '' })
      vxm.convert.setAmount({ d: 'to', amount: '' })
    }
    this.validate()
  }

  get minReturn() {
    return vxm.convert.minReturn
  }

  set minReturn(val) {
    if (val) {
      vxm.convert.setAmount({ d: 'to', amount: val })
    } else {
      vxm.convert.setAmount({ d: 'from', amount: '' })
      vxm.convert.setAmount({ d: 'to', amount: '' })
    }
  }

  get loading() {
    return vxm.tokens.loadingTokens
  }

  get usdValue() {
    return numeral(this.convertFrom.price * parseFloat(this.amount)).format(
      '$0,0.00'
    )
  }

  get debouncedState() {
    return vxm.convert.debouncedState
  }

  set debouncedState(val) {
    vxm.convert.setDebouncedState(val)
  }

  initConvert() {
    if (!this.isAuthenticated) this.$bvModal.show('modal-login')
    else {
      this.$bvModal.show('modal-convert-token')
    }
  }

  validate() {
    if (parseFloat(this.amount))
      if (parseFloat(this.amount) <= parseFloat(this.balance)) return true
      else return false
    else return null
  }

  // methods
  openSelectTokenModal(d: 'from' | 'to') {
    this.direction = d
    this.$bvModal.show('modal-select-token')
  }

  setPercentage(p: number) {
    this.amount = bancorx.tokenPrecision(
      this.convertFrom.code,
      ((parseFloat(this.balance) * p) / 100).toString()
    )
  }

  async loadBalance() {
    let balance = ''
    let balanceTo = ''
    if (this.isAuthenticated) {
      balance = await vxm.wallet.availableBalance({
        symbol: this.convertFrom.code,
        reserve: false,
        account: this.isAuthenticated
      })
      balanceTo = await vxm.wallet.availableBalance({
        symbol: this.convertTo.code,
        reserve: false,
        account: this.isAuthenticated
      })
      this.showLoading = false
    } else balance = balanceTo = '---'
    this.balance = balance
    this.balanceTo = balanceTo
  }

  @Watch('convertFrom')
  async onFromChange(val: any, oldVal: any) {
    this.showLoading = true
    this.loadBalance()
  }

  @Watch('convertTo')
  async onToChange(val: any, oldVal: any) {
    this.showLoading = true
    this.loadBalance()
  }

  // hooks
  created() {
    // @ts-ignore
    this.$options.interval = setInterval(this.loadBalance, 2000)
    this.debouncedCalcReturn = debounce(() => {
      this.debouncedState = 'loading'
      vxm.convert.initConversion('from')
    }, 1000)
  }
  beforeDestroy() {
    this.amount = this.minReturn = ''
    // @ts-ignore
    clearInterval(this.$options.interval)
  }
}
</script>

<style scoped lang="scss"></style>
