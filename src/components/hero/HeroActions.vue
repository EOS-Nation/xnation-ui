<template>
  <div
    class="bg-image"
    :style="
      'background-image: url(' +
        require('@/assets/media/photos/bg01.jpg') +
        ');'
    "
  >
    <div class="bg-primary-dark-op">
      <div class="content content-boxed text-center p-5">
        <transition name="slide-fade-down" mode="out-in">
          <hero-liquidity
            v-if="'liq-remove' === heroAction || heroAction === 'liq-add'"
            key="liquidity"
          />
          <hero-convert v-if="heroAction === 'convert'" key="convert" />
          <hero-transfer v-if="heroAction === 'transfer'" key="transfer" />
          <hero-relay v-if="heroAction === 'relay'" key="relay" />
        </transition>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import HeroConvert from '@/components/hero/HeroConvert.vue'
import HeroTransfer from '@/components/hero/HeroTransfer.vue'
import HeroLiquidity from '@/components/hero/HeroLiquidity.vue'
import HeroRelay from '@/components/hero/HeroRelay.vue'

@Component({
  components: {
    HeroConvert,
    HeroTransfer,
    HeroLiquidity,
    HeroRelay
  }
})
export default class HeroActions extends Vue {
  // data

  // computed
  get loadingTokens() {
    return vxm.tokens.loadingTokens
  }

  get heroAction() {
    return vxm.general.heroAction
  }

  // methods
  @Watch('tokenFrom')
  async onTokenChange(val: any, oldVal: any) {
    // await this.conversionRate()
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
