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
          <slot></slot>
        </transition>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import HeroConvert from '@/components/hero/sub/HeroConvert.vue'
import HeroTransfer from '@/components/hero/sub/HeroTransfer.vue'
import HeroLiquidity from '@/components/hero/sub/HeroLiquidity.vue'
import HeroRelay from '@/components/hero/sub/HeroRelay.vue'
import HeroCreate from '@/components/hero/sub/HeroCreate.vue'

@Component({
  components: {
    HeroConvert,
    HeroTransfer,
    HeroLiquidity,
    HeroRelay,
    HeroCreate
  }
})
export default class HeroActions extends Vue {

  get currentHero() {
    switch(vxm.general.heroAction) {
      case 'liq-remove':
      case 'liq-add':
        return `hero-liquidity`;
      case `transfer`:
        return `hero-transfer`
      case `relay`:
        return `hero-relay`
      case `create`:
        return `hero-create`
      case `convert`:
      default:
        return `hero-convert`
    }
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
