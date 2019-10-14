<template>
  <div>
    <breadcrumbs :items="['Tokens', 'Transfer', token.code]" />
    <div class="content content-boxed">
      <b-row>
        <b-col md="5" lg="5" xl="4">
          <div class="w-100">
            <div class="block">
              <div
                @click="openSelectTokenModal()"
                class="block-content d-flex align-items-center p-3 cursor"
              >
                <div class="ml-1 mr-4">
                  <font-awesome-icon icon="chevron-down" class="text-muted" />
                </div>
                <div>
                  <img
                    class="img-avatar img-avatar-thumb"
                    :src="
                      'https://files.bancor.network/0.1/images/communities?imageName=' +
                        token.primaryCommunityImageName
                    "
                    alt="Token Logo"
                  />
                </div>
                <div class="ml-4">
                  <h3 class="mb-0 mt-0">{{ token.code }}</h3>
                  <h4 class="text-muted m-0">{{ token.name }}</h4>
                </div>
              </div>
            </div>
            <div class="block d-none d-md-block">
              <div class="block-header block-header-default text-center">
                <h3 class="block-title">Token Information</h3>
              </div>
              <div class="block-content">
                <table
                  class="table table-striped table-borderless font-size-sm"
                >
                  <tbody>
                    <tr>
                      <td>Price 1 {{ token.code }}</td>
                      <td>
                        <span v-if="token.price >= 1" class="font-w600">{{
                          numeral(token.price).format('$0,0.00')
                        }}</span>
                        <span v-else class="font-w600">{{
                          numeral(token.price).format('$0.00000')
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
                            token.change24h >= 0
                              ? 'text-success'
                              : 'text-danger'
                          "
                          >{{ numeral(token.change24h).format('0.00') }}%</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Volume 24h
                      </td>
                      <td>
                        <span class="font-w600">{{
                          numeral(token.volume24h.USD).format('$0,0')
                        }}</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Token Contract
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
          <div class="block pb-3">
            <div class="block-content font-size-sm">
              <action-table
                :title="'SEND ' + token.code + ' TO'"
                icon="user"
                :valid="null"
              >
                <b-form-input
                  v-model="recipient"
                  id="input-large"
                  size="lg"
                  placeholder="Enter Account"
                ></b-form-input>
              </action-table>
              <action-table
                title="MEMO"
                subtitle="(optional)"
                icon="envelope-open-text"
                :valid="null"
              >
                <b-form-textarea
                  id="textarea"
                  v-model="memo"
                  placeholder="Enter Memo here or leave blank"
                  rows="2"
                  max-rows="4"
                ></b-form-textarea>
              </action-table>
              <action-table title="AMOUNT" icon="dollar-sign" :valid="null">
                <b-form-input
                  v-model="amount"
                  id="input-large"
                  size="lg"
                  placeholder="Enter Amount"
                ></b-form-input>
                <div class="p-1">
                  <span>Available: </span
                  ><span class="font-w600">{{ balance }}</span
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
              </action-table>
            </div>
            <div class="block-content text-center pt-0 text-muted font-size-sm">
              Value:
              <span v-if="amount" class="font-w600">{{
                numeral(parseFloat(amount) * token.price).format('$0,0.00')
              }}</span
              ><span v-else>---</span>
            </div>
            <div class="block-content text-center">
              <b-btn
                @click="initTransfer()"
                variant="success"
                :disabled="!recipient || !amount"
                >TRANSFER</b-btn
              >
            </div>
          </div>
        </b-col>
      </b-row>
    </div>
    <modal-select-token :direction="'transfer'" />
    <modal-transfer-token />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import HeroConvert from '@/components/hero/HeroConvert.vue'
import ModalSelectToken from '@/components/modals/ModalSelectToken.vue'
import ModalTransferToken from '@/components/modals/ModalTransferToken.vue'
import TokensTable from '@/components/tables/TokensTable.vue'
import Breadcrumbs from '@/components/layout/Breadcrumbs.vue'
import * as bancorx from '@/assets/_ts/bancorx'
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
    ModalTransferToken,
    ContentLoader,
    FacebookLoader,
    CodeLoader,
    BulletListLoader,
    InstagramLoader,
    ListLoader,
    ActionTable
  }
})
export default class TransferAdvanced extends Vue {
  // data
  numeral = numeral
  balance = '---'
  mouseOn = 0

  // computed
  get isAuthenticated() {
    return vxm.eosTransit.isAuthenticated
  }

  get token() {
    return vxm.transfer.transferToken
  }

  get amount() {
    return vxm.transfer.amount
  }
  set amount(val) {
    vxm.transfer.setAmount(val)
  }

  get memo() {
    return vxm.transfer.memo
  }
  set memo(val) {
    vxm.transfer.setMemo(val)
  }

  get loading() {
    return vxm.tokens.loadingTokens
  }

  get recipient() {
    return vxm.transfer.transferTo
  }
  set recipient(val) {
    vxm.transfer.setRecipient(val)
  }

  get usdValue() {
    return numeral(this.token.price * parseFloat(this.amount)).format('$0,0.00')
  }

  initTransfer() {
    if (!this.isAuthenticated) this.$bvModal.show('modal-login')
    else {
      this.amount = bancorx.tokenPrecision(this.token.code, this.amount)
      this.$bvModal.show('modal-transfer-token')
    }
  }

  // methods
  openSelectTokenModal() {
    this.$bvModal.show('modal-select-token')
  }

  setPercentage(p: number) {
    this.amount = bancorx.tokenPrecision(
      this.token.code,
      ((parseFloat(this.balance) * p) / 100).toString()
    )
  }

  async loadBalance() {
    let balance = ''
    if (this.isAuthenticated) {
      balance = await vxm.wallet.availableBalance({
        symbol: this.token.code,
        reserve: false,
        account: this.isAuthenticated
      })
    } else balance = '---'
    this.balance = balance
  }

  // hooks
  created() {
    // @ts-ignore
    this.$options.interval = setInterval(this.loadBalance, 2000)
  }
  beforeDestroy() {
    // @ts-ignore
    clearInterval(this.$options.interval)
  }
}
</script>

<style scoped lang="scss"></style>
