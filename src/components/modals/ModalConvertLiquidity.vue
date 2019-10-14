<template>
  <b-modal
    id="modal-convert-token"
    size="lg"
    centered
    hide-footer
    @show="countdownConvert()"
    @hidden="resetModal()"
  >
    <template slot="modal-title">
      CONVERT TOKEN
    </template>
    <transition name="slide-fade" mode="out-in">
      <b-row class="d-flex align-items-center justify-content-center">
        <b-col v-if="heroAction !== 'liq-add'" md="5" class="text-center mb-2">
          <h6 class="text-uppercase text-muted">Send</h6>
          <img
            class="img-avatar img-avatar-thumb mb-2"
            :src="
              'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
                convertFrom.img
            "
            alt="Token Logo"
          />
          <h2 class="mb-2">{{ amount }} {{ convertFrom.symbol }}</h2>
        </b-col>
        <b-col v-else md="5" class="text-center mb-2">
          <h6 class="text-uppercase text-muted">Send</h6>
          <div class="d-flex align-items-center">
            <img
              class="img-avatar img-avatar-thumb"
              :src="
                'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
                  convertFrom.img
              "
              alt="Token Logo"
            />
            <div class="text-left ml-2">
              <h3 class="my-0">{{ convertFrom.symbol }}</h3>
              <h3 class="my-0">{{ amount }}</h3>
            </div>
          </div>
          <div class="d-flex align-items-center">
            <img
              class="img-avatar img-avatar-thumb"
              src="https://storage.googleapis.com/bancor-prod-file-store/images/communities/f80f2a40-eaf5-11e7-9b5e-179c6e04aa7c.png"
              alt="BNT Logo"
            />
            <div class="text-left ml-2">
              <h3 class="my-0">BNT</h3>
              <h3 class="my-0">{{ amountBnt }}</h3>
            </div>
          </div>
        </b-col>
        <b-col md="2" class="text-center mb-2 font-size-h1 text-primary">
          <font-awesome-icon v-if="!success && !error" icon="sync-alt" spin />
          <font-awesome-icon
            v-else-if="error && !success"
            icon="exclamation-triangle"
            class="text-danger"
          />
          <font-awesome-icon
            v-else-if="!error && success"
            icon="check-circle"
            class="text-success"
          />
        </b-col>
        <b-col
          v-if="heroAction !== 'liq-remove'"
          md="5"
          class="text-center mb-2"
        >
          <h6 class="text-uppercase text-muted">Receive</h6>
          <img
            class="img-avatar img-avatar-thumb mb-2"
            :src="
              'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
                convertTo.img
            "
            alt="Token Logo"
          />
          <h2 class="mb-2">{{ minReturn }} {{ convertTo.symbol }}</h2>
        </b-col>
        <b-col v-else md="5" class="text-center mb-2">
          <h6 class="text-uppercase text-muted">Receive</h6>
          <div class="d-flex align-items-center">
            <img
              class="img-avatar img-avatar-thumb"
              :src="
                'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
                  convertTo.img
              "
              alt="Token Logo"
            />
            <div class="text-left ml-2">
              <h3 class="my-0">{{ convertTo.symbol }}</h3>
              <h3 class="my-0">{{ minReturn }}</h3>
            </div>
          </div>
          <div class="d-flex align-items-center">
            <img
              class="img-avatar img-avatar-thumb"
              src="https://storage.googleapis.com/bancor-prod-file-store/images/communities/f80f2a40-eaf5-11e7-9b5e-179c6e04aa7c.png"
              alt="BNT Logo"
            />
            <div class="text-left ml-2">
              <h3 class="my-0">BNT</h3>
              <h3 class="my-0">{{ amountBnt }}</h3>
            </div>
          </div>
        </b-col>
        <b-col cols="12" class="text-center my-2 font-size-sm"
          >Price Change Tolerance: 2%</b-col
        >
        <b-col v-if="selectedProvider" cols="12" class="text-center">
          <h6 v-if="!success && !error">
            Please proceed with {{ selectedProvider.meta.name }}
            <span v-if="timeleft">in {{ timeleft }}s</span
            ><span v-else>now</span> to confirm this Transaction.
          </h6>
          <h6 v-else-if="error && !success" class="text-danger">
            Error: {{ error.message
            }}<span @click="countdownConvert()" class="cursor text-muted">
              - Try again</span
            >
          </h6>
          <h6 v-else-if="!error && success">
            <a
              :href="'https://bloks.io/transaction/' + success.transaction_id"
              target="_blank"
              class="text-success"
            >
              SUCCESS: View {{ success.transaction_id.substring(0, 6) }} TX on
              bloks.io
            </a>
            <span @click="closeModal()" class="cursor text-muted">- Close</span>
          </h6>
        </b-col>
      </b-row>
    </transition>
  </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { vxm } from '@/store/'
import { TokenPrice } from '@/types/bancor'
import * as bancorx from '@/assets/_ts/bancorx'
import { TokenInfo } from '@/assets/_ts/bancorx'

@Component
export default class ModalConvertLiquidity extends Vue {
  // data
  timeleft = 5
  success: any = false
  error: any = false

  // computed
  get convertFrom(): TokenInfo {
    return vxm.liquidity.fromToken
  }

  get convertTo(): TokenInfo {
    return vxm.liquidity.toToken
  }

  get amount(): string {
    return vxm.liquidity.amount
  }

  get amountBnt(): string {
    return vxm.liquidity.amountBnt
  }

  get heroAction() {
    return vxm.general.heroAction
  }

  get minReturn(): string {
    return vxm.liquidity.minReturn
  }

  get selectedProvider() {
    return vxm.eosTransit.selectedProvider
  }

  // methods
  resetModal() {
    this.timeleft = 6
    this.success = false
    this.error = false
  }

  closeModal() {
    this.$bvModal.hide('modal-convert-token')
    this.resetModal()
  }

  async countdownConvert() {
    this.timeleft = 5
    this.success = false
    this.error = false
    let timer = setInterval(() => {
      if (this.timeleft === 6) {
        clearInterval(timer)
        this.timeleft = 5
        return
      }
      this.timeleft -= 1
      if (this.timeleft <= 0) {
        clearInterval(timer)
        this.initConvert()
      }
    }, 1000)
  }

  initConvert() {
    if (this.heroAction === 'liq-add') this.convertLiqAdd()
    else if (this.heroAction === 'liq-remove') this.convertLiqRemove()
    else if (this.heroAction === 'convert') this.convert()
  }

  async convertLiqAdd() {
    const tolerance = bancorx.tokenPrecision(
      this.convertTo.symbol,
      ((parseFloat(this.minReturn) / 2) * 0.98).toString()
    )
    const wallet = vxm.eosTransit.wallet
    if (wallet && wallet.auth)
      wallet.eosApi
        .transact(
          {
            actions: [
              {
                account: this.convertFrom.tokenContract,
                name: 'transfer',
                authorization: [
                  {
                    actor: wallet.auth.accountName,
                    permission: wallet.auth.permission
                  }
                ],
                data: {
                  from: wallet.auth.accountName,
                  to: 'thisisbancor',
                  quantity:
                    bancorx.tokenPrecision(
                      this.convertFrom.symbol,
                      this.amount
                    ) +
                    ' ' +
                    this.convertFrom.symbol,
                  memo: bancorx.bancorMemoLiquidity(
                    this.convertTo.symbol,
                    'add',
                    tolerance,
                    wallet.auth.accountName
                  )
                }
              },
              {
                account: 'bntbntbntbnt',
                name: 'transfer',
                authorization: [
                  {
                    actor: wallet.auth.accountName,
                    permission: wallet.auth.permission
                  }
                ],
                data: {
                  from: wallet.auth.accountName,
                  to: 'thisisbancor',
                  quantity:
                    bancorx.tokenPrecision('BNT', this.amountBnt) + ' BNT',
                  memo: `1,${this.convertTo.relayContract} ${
                    this.convertTo.symbol
                  },${tolerance},${wallet.auth.accountName}`
                }
              }
            ]
          },
          {
            broadcast: true,
            blocksBehind: 3,
            expireSeconds: 60
          }
        )
        .then((resp: any) => {
          this.success = resp
          this.$ga.event(
            vxm.liquidity.fromToken.symbol,
            'convert',
            vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
          )
        })
        .catch((error: any) => {
          this.error = error
          this.$ga.event(
            vxm.liquidity.fromToken.symbol,
            'convert-error',
            vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
          )
        })
  }
  async convertLiqRemove() {
    const minReturn = bancorx.tokenPrecision(
      this.convertTo.symbol,
      (parseFloat(this.minReturn) * 0.98).toString()
    )
    const minReturnBnt = bancorx.tokenPrecision(
      'BNT',
      (parseFloat(this.amountBnt) * 0.98).toString()
    )
    const wallet = vxm.eosTransit.wallet
    const halfAmount = (parseFloat(this.amount) / 2).toString()
    if (wallet && wallet.auth)
      wallet.eosApi
        .transact(
          {
            actions: [
              {
                account: this.convertFrom.tokenContract,
                name: 'transfer',
                authorization: [
                  {
                    actor: wallet.auth.accountName,
                    permission: wallet.auth.permission
                  }
                ],
                data: {
                  from: wallet.auth.accountName,
                  to: 'thisisbancor',
                  quantity:
                    bancorx.tokenPrecision(
                      this.convertFrom.symbol,
                      halfAmount
                    ) +
                    ' ' +
                    this.convertFrom.symbol,
                  memo: bancorx.bancorMemoLiquidity(
                    this.convertFrom.symbol,
                    'remove',
                    minReturn,
                    wallet.auth.accountName
                  )
                }
              },
              {
                account: this.convertFrom.tokenContract,
                name: 'transfer',
                authorization: [
                  {
                    actor: wallet.auth.accountName,
                    permission: wallet.auth.permission
                  }
                ],
                data: {
                  from: wallet.auth.accountName,
                  to: 'thisisbancor',
                  quantity:
                    bancorx.tokenPrecision(
                      this.convertFrom.symbol,
                      halfAmount
                    ) +
                    ' ' +
                    this.convertFrom.symbol,
                  memo: `1,${
                    this.convertFrom.relayContract
                  } BNT,${minReturnBnt},${wallet.auth.accountName}`
                }
              }
            ]
          },
          {
            broadcast: true,
            blocksBehind: 3,
            expireSeconds: 60
          }
        )
        .then((resp: any) => {
          this.success = resp
          this.$ga.event(
            vxm.liquidity.fromToken.symbol,
            'convert',
            vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
          )
        })
        .catch((error: any) => {
          this.error = error
          this.$ga.event(
            vxm.liquidity.fromToken.symbol,
            'convert-error',
            vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
          )
        })
  }
  async convert() {
    const tolerance = bancorx.tokenPrecision(
      this.convertTo.symbol,
      (parseFloat(this.minReturn) * 0.98).toString()
    )
    const wallet = vxm.eosTransit.wallet
    if (wallet && wallet.auth)
      wallet.eosApi
        .transact(
          {
            actions: [
              {
                account: this.convertFrom.tokenContract,
                name: 'transfer',
                authorization: [
                  {
                    actor: wallet.auth.accountName,
                    permission: wallet.auth.permission
                  }
                ],
                data: {
                  from: wallet.auth.accountName,
                  to: 'thisisbancor',
                  quantity:
                    bancorx.tokenPrecision(
                      this.convertFrom.symbol,
                      this.amount
                    ) +
                    ' ' +
                    this.convertFrom.symbol,
                  memo: bancorx.bancorMemo(
                    this.convertFrom.symbol,
                    this.convertTo.symbol,
                    tolerance,
                    wallet.auth.accountName
                  )
                }
              }
            ]
          },
          {
            broadcast: true,
            blocksBehind: 3,
            expireSeconds: 60
          }
        )
        .then((resp: any) => {
          this.success = resp
          this.$ga.event(
            vxm.liquidity.fromToken.symbol,
            'convert',
            vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
          )
        })
        .catch((error: any) => {
          this.error = error
          this.$ga.event(
            vxm.liquidity.fromToken.symbol,
            'convert-error',
            vxm.liquidity.fromToken.symbol + '-' + vxm.liquidity.toToken.symbol
          )
        })
  }

  // lifecycle hooks
  mounted() {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.slide-fade-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter, .slide-fade-leave-to
    /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(10px);
  opacity: 0;
}
</style>
