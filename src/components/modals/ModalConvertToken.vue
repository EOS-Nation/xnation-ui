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
        <b-col md="5" class="text-center mb-2">
          <h6 class="text-uppercase text-muted">Send</h6>
          <img
            class="img-avatar img-avatar-thumb mb-2"
            :src="convertFrom.primaryCommunityImageName"
            alt="Token Logo"
          />
          <h2 class="mb-2">{{ amount }} {{ convertFrom.code }}</h2>
          <h3 class="text-muted">{{ convertFrom.name }}</h3>
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
          <h6 class="text-uppercase text-muted">Min Return</h6>
          <img
            class="img-avatar img-avatar-thumb mb-2"
            :src="convertTo.primaryCommunityImageName"
            alt="Token Logo"
          />
          <h2 class="mb-2">{{ minReturn }} {{ convertTo.code }}</h2>
          <h3 class="text-muted">{{ convertTo.name }}</h3>
        </b-col>
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
import { Component, Prop, Vue } from "vue-property-decorator";
import { vxm } from "@/store/";
import { TokenPrice } from "@/types/bancor";
import * as bancorx from "@/assets/_ts/bancorx";

@Component
export default class ModalConvertToken extends Vue {
  // data
  timeleft = 5;
  success: any = false;
  error: any = false;

  // computed
  get convertFrom(): TokenPrice {
    return vxm.convert.convertFrom;
  }

  get convertTo(): TokenPrice {
    return vxm.convert.convertTo;
  }

  get amount(): string {
    return vxm.convert.amount;
  }

  get minReturn(): string {
    return vxm.convert.minReturn;
  }

  get selectedProvider() {
    return vxm.eosTransit.selectedProvider;
  }

  // methods
  resetModal() {
    this.timeleft = 6;
    this.success = false;
    this.error = false;
  }

  closeModal() {
    this.$bvModal.hide("modal-convert-token");
    this.resetModal();
  }

  async countdownConvert() {
    this.timeleft = 5;
    this.success = false;
    this.error = false;
    let timer = setInterval(() => {
      if (this.timeleft === 6) {
        clearInterval(timer);
        this.timeleft = 5;
        return;
      }
      this.timeleft -= 1;
      if (this.timeleft <= 0) {
        clearInterval(timer);
        this.convert();
      }
    }, 1000);
  }

  async convert() {
    const wallet = vxm.eosTransit.wallet;
    const relay = bancorx.relays[vxm.convert.convertFrom.code];
    if (wallet && wallet.auth)
      wallet.eosApi
        .transact(
          {
            actions: [
              {
                account: relay.code,
                name: "transfer",
                authorization: [
                  {
                    actor: wallet.auth.accountName,
                    permission: wallet.auth.permission
                  }
                ],
                data: {
                  from: wallet.auth.accountName,
                  to: "thisisbancor",
                  quantity:
                    bancorx.tokenPrecision(relay.symbol, this.amount) +
                    " " +
                    relay.symbol,
                  memo: bancorx.composeBancorMemo(
                    this.convertFrom.code,
                    this.convertTo.code,
                    this.minReturn,
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
          this.success = resp;
        })
        .catch((error: any) => {
          this.error = error;
        });
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
