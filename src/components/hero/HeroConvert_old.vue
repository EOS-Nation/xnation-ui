<template>
  <b-row>
    <b-col md="4">
      <transition name="slide-fade-down" mode="out-in">
        <hero-convert-token v-if="ltr" key="ltr" direction="from" />
        <hero-convert-token v-else key="rtl" direction="from" />
      </transition>
    </b-col>
    <b-col
      md="4"
      class="d-flex justify-content-center align-items-end"
      style="min-height: 230px"
    >
      <div>
        <template v-if="!loadingTokens">
          <transition name="fade" mode="out-in">
            <font-awesome-icon
              v-if="ltr"
              icon="exchange-alt"
              class="fa-2x text-white cursor"
              key="ltr"
              @click="swapTokens()"
            />
            <font-awesome-icon
              v-else
              icon="exchange-alt"
              class="fa-2x text-white cursor"
              key="rtl"
              @click="swapTokens()"
            />
          </transition>
        </template>
        <font-awesome-icon
          v-else
          icon="circle-notch"
          class="fa-2x text-white cursor"
          spin
        />
        <div class="mb-3 mt-3">
          <span v-if="!loadingTokens" class="text-white font-size-sm"
            >1 {{ tokenFrom.code }} =
            <span v-if="!rateLoading && debouncedState === 'idle'">{{
              rate
            }}</span
            ><span v-else><font-awesome-icon icon="circle-notch" spin/></span>
            {{ tokenTo.code }}</span
          >
          <span v-else>.</span>
        </div>
        <div class="d-flex justify-content-center">
          <b-btn
            @click="initConvert()"
            variant="success"
            v-ripple
            class="px-4 py-2 d-block"
            :disabled="debouncedState === 'loading' || loadingTokens || !amount"
          >
            <font-awesome-icon
              v-if="debouncedState === 'loading' || loadingTokens"
              icon="circle-notch"
              spin
              fixed-width
              class="mr-2"
            />
            <font-awesome-icon
              v-else
              icon="sync-alt"
              fixed-width
              class="mr-2"
            />
            <span class="font-w700">CONVERT</span>
          </b-btn>
        </div>
        <span
          @click="heroAction = 'transfer'"
          class="cursor font-size-sm text-white-50"
        >
          <font-awesome-icon icon="arrow-right" fixed-width />
          TRANSFER
        </span>
      </div>
    </b-col>
    <b-col md="4">
      <transition name="slide-fade-up" mode="out-in">
        <hero-convert-token v-if="!ltr" key="rtl" direction="to" />
        <hero-convert-token v-else key="ltr" direction="to" />
      </transition>
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { Watch, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import HeroConvertToken from '@/components/convert/HeroConvertToken.vue'
import * as bancorx from '@/assets/_ts/bancorx'
import numeral from 'numeral'

@Component({
  components: {
    HeroConvertToken
  }
})
export default class HeroConvert extends Vue {
  // data
  ltr = true
  rate = ''
  rateLoading = true
  numeral = numeral

  // computed
  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated
    else return false
  }

  get heroAction() {
    return vxm.general.heroAction
  }

  set heroAction(val) {
    vxm.general.setHeroAction(val)
  }

  get debouncedState() {
    return vxm.convert.debouncedState
  }

  get tokenFrom() {
    return vxm.convert.convertFrom
  }

  get tokenTo() {
    return vxm.convert.convertTo
  }

  get amount() {
    return vxm.convert.amount
  }

  get minReturn() {
    return vxm.convert.minReturn
  }

  get tokens() {
    return vxm.tokens.eosTokens
  }

  get loadingTokens() {
    return vxm.tokens.loadingTokens
  }

  async conversionRate() {
    this.rateLoading = true
    let amount = this.amount
    if (amount === '') amount = '1'
    let minReturn = await bancorx.minReturnFormula(
      this.tokenFrom.code,
      this.tokenTo.code,
      amount
    )
    this.rate = this.numeral(parseFloat(minReturn) / parseFloat(amount)).format(
      '0,0.0000'
    )
    this.rateLoading = false
  }

  // methods
  swapTokens() {
    this.ltr = !this.ltr
    vxm.convert.swapSelection()
    if (vxm.convert.amount) vxm.convert.initConversion('from')
  }

  initConvert() {
    if (!this.isAuthenticated) this.$bvModal.show('modal-login')
    else {
      vxm.convert.initConversion('from')
      this.$bvModal.show('modal-convert-token')
    }
  }

  @Watch('amount')
  async onStateChange(val: any, oldVal: any) {
    await this.conversionRate()
  }

  @Watch('tokenFrom')
  async onTokenChange(val: any, oldVal: any) {
    await this.conversionRate()
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
