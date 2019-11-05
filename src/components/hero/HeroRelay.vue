<template>
  <div>
    <b-row>
      <b-col md="4">
        <transition name="slide-fade-down" mode="out-in">
          <hero-convert-relay v-if="ltr" key="ltr" direction="from" />
          <hero-convert-relay v-else key="rtl" direction="from" />
        </transition>
      </b-col>
      <b-col md="4" class="d-flex justify-content-center align-items-end" style="min-height: 230px">
        <div>
          <transition name="fade" mode="out-in">
            <font-awesome-icon
              icon="exchange-alt"
              class="fa-2x text-white cursor"
              :spin="spinning"
              @click="swapTokens()"
            />
          </transition>
          <div class="mb-3 mt-3">
            <span class="text-white font-size-sm">
              1 {{ tokenFrom.symbol }} =
              <span v-if="!rateLoading && !loadingTokens">{{ rate }}</span>
              <span v-else>
                <font-awesome-icon icon="circle-notch" spin />
              </span>
              {{ tokenTo.symbol }}
            </span>
          </div>
          <div class="d-flex justify-content-center">
            <b-btn
              @click="initConvert()"
              variant="success"
              v-ripple
              class="px-4 py-2 d-block"
              :disabled="loadingTokens || minReturn === ''"
            >
              <font-awesome-icon
                :icon="loadingTokens ? 'circle-notch' : 'sync-alt'"
                :spin="loadingTokens"
                fixed-width
                class="mr-2"
              />
              <span class="font-w700">{{ 'Add Liquidity' }}</span>
            </b-btn>
          </div>
        </div>
      </b-col>
      <b-col md="4">
        <transition name="slide-fade-up" mode="out-in">
          <hero-convert-relay v-if="!ltr" key="rtl" direction="to" />
          <hero-convert-relay v-else key="ltr" direction="to" />
        </transition>
      </b-col>
    </b-row>
    <modal-select-all />
    <modal-select-token />
    <modal-select-relays />
    <modal-convert-liquidity />
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import HeroConvertRelay from "@/components/convert/HeroConvertRelay.vue";
import * as bancorx from "@/assets/_ts/bancorx";
import numeral from "numeral";
import ModalSelectAll from "@/components/modals/ModalSelectAll.vue";
import ModalConvertLiquidity from "@/components/modals/ModalConvertLiquidity.vue";
import ModalSelectToken from "@/components/modals/ModalSelectToken.vue";
import ModalSelectRelays from "@/components/modals/ModalSelectRelays.vue";

@Component({
  components: {
    ModalSelectRelays,
    ModalSelectAll,
    ModalSelectToken,
    ModalConvertLiquidity,
    HeroConvertRelay
  }
})
export default class HeroConvert extends Vue {
  // data
  ltr = true;
  rate = "";
  rateLoading = false;
  numeral = numeral;
  spinning = false;

  // computed
  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated;
    else return false;
  }

  get heroAction() {
    return vxm.general.heroAction;
  }

  get currentRoute() {
    return this.$route.name;
  }

  set heroAction(val) {
    vxm.general.setHeroAction(val);
  }

  get debouncedState() {
    return vxm.convert.debouncedState;
  }

  get tokenFrom() {
    return vxm.liquidity.fromToken;
  }

  get tokenTo() {
    return vxm.liquidity.toToken;
  }

  get amount() {
    return vxm.liquidity.amount;
  }

  get minReturn() {
    return vxm.liquidity.minReturn;
  }

  get tokens() {
    return vxm.tokens.eosTokens;
  }

  get loadingTokens() {
    return vxm.liquidity.rateLoading;
  }

  async conversionRate() {
    this.rateLoading = true;
    let amount = this.amount;
    if (amount === "") {
      amount = "1";
      const minReturn = await bancorx.calcRate(
        vxm.liquidity.fromToken.symbol,
        vxm.liquidity.toToken.symbol,
        amount
      );
      this.rate = this.numeral(
        parseFloat(minReturn) / parseFloat(amount)
      ).format("0,0.0000");
    } else
      this.rate = this.numeral(
        parseFloat(this.minReturn) / parseFloat(amount)
      ).format("0,0.0000");

    this.rateLoading = false;
  }

  // methods
  swapTokens() {
    this.ltr = !this.ltr;
    this.spinning = true;
    setTimeout(() => {
      this.spinning = false
    }, 1500)
    vxm.liquidity.swapSelection();
    vxm.liquidity.calcMinReturn();
  }

  initConvert() {
    if (!this.isAuthenticated) this.$bvModal.show("modal-login");
    else {
      vxm.convert.initConversion("from");
      this.$bvModal.show("modal-select-relay");
    }
  }

  @Watch("minReturn")
  async onStateChange(val: any, oldVal: any) {
    await this.conversionRate();
  }

  @Watch("tokenFrom")
  async onTokenChange(val: any, oldVal: any) {
    await this.conversionRate();
  }
  async created() {
    await this.conversionRate();
  }
}
</script>

<style scoped lang="scss">
.slide-fade-up-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-up-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-up-enter
    /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(75px);
  opacity: 0;
}
.slide-fade-up-leave-to
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(-75px);
  opacity: 0;
}

.slide-fade-down-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-down-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-down-enter
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(-75px);
  opacity: 0;
}
.slide-fade-down-leave-to
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(75px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
