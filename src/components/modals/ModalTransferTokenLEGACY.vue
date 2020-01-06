<template>
  <b-modal
    id="modal-transfer-token"
    size="lg"
    centered
    hide-footer
    @show="countdownConvert()"
    @hidden="resetModal()"
  >
    <template slot="modal-title">
      TRANSFER TOKEN
    </template>
    <transition name="slide-fade" mode="out-in">
      <b-row class="d-flex align-items-center justify-content-center">
        <b-col md="5" class="text-center mb-2">
          <h6 class="text-uppercase text-muted">Send</h6>
          <img
            class="img-avatar img-avatar-thumb mb-2"
            :src="
                transferToken.img
            "
            alt="Token Logo"
          />
          <h2 class="mb-2">{{ amount }} {{ transferToken.symbol }}</h2>
          <h3 class="d-none text-muted">{{ transferToken.name }}</h3>
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
        <b-col md="5" class="text-center mb-2">
          <h6 class="text-uppercase text-muted">Recipient</h6>
          <img
            class="img-avatar img-avatar-thumb mb-2"
            :src="require('@/assets/media/logos/avatar_default.jpg')"
            alt="User Logo"
          />
          <h2 class="mb-2">{{ recipient }}</h2>
          <h3 class="text-muted">Account</h3>
        </b-col>
        <b-col cols="12" class="text-center">
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
          <h6 v-else-if="!error && success" class="text-success">
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
export default class ModalTransferToken extends Vue {
  // data
  timeleft = 5
  success: any = false
  error: any = false

  // computed
  get transferToken(): TokenInfo {
    return vxm.liquidity.fromToken
  }

  get recipient(): string {
    return vxm.transfer.transferTo
  }

  get amount(): string {
    return vxm.liquidity.amount
  }

  get selectedProvider() {
    return vxm.eosWallet.selectedProvider
  }

  closeModal() {
    this.$bvModal.hide('modal-transfer-token')
    this.resetModal()
  }

  // methods
  resetModal() {
    this.timeleft = 6
    this.success = false
    this.error = false
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
        this.convert()
      }
    }, 1000)
  }

  async convert() {
    const wallet = vxm.eosWallet.wallet
    if (wallet && wallet.auth)
      wallet.eosApi
        .transact(
          {
            actions: [
              {
                account: this.transferToken.tokenContract,
                name: 'transfer',
                authorization: [
                  {
                    actor: wallet.auth.accountName,
                    permission: wallet.auth.permission
                  }
                ],
                data: {
                  from: wallet.auth.accountName,
                  to: this.recipient,
                  quantity:
                    bancorx.tokenPrecision(
                      this.transferToken.symbol,
                      this.amount
                    ) +
                    ' ' +
                    this.transferToken.symbol,
                  memo: vxm.transfer.memo
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
            'transfer',
            this.amount
          )
        })
        .catch((error: any) => {
          this.error = error
          this.$ga.event(
            vxm.liquidity.fromToken.symbol,
            'transfer-error',
            this.amount
          )
        })
  }

  // lifecycle hooks
  mounted() {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.row {
  min-height: 50vh;
}
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
