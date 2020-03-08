<template>
  <hero-wrapper>
    <two-token-hero
      v-if="loaded"
      :tokenOneSymbol="token1Symbol"
      :tokenOneAmount.sync="token1Amount"
      @update:tokenOneAmount="tokenOneChanged"
      @update:tokenTwoAmount="tokenTwoChanged"
      :tokenOneBalance="displayedToken1Balance"
      :tokenOneImg="token1Img"
      :tokenTwoSymbol="token2Symbol"
      :tokenTwoAmount.sync="token2Amount"
      :tokenTwoBalance="displayedToken2Balance"
      :tokenTwoImg="token2Img"
    >
      <b-btn
        @click="createRelay"
        variant="success"
        v-ripple
        class="px-4 py-2 d-block"
        :disabled="!isAuthenticated"
      >
        <font-awesome-icon
          icon="plus"
          :spin="loadingConversion"
          fixed-width
          class="mr-2"
        />
        <span class="font-w700">Create Pool</span>
      </b-btn>
    </two-token-hero>
  </hero-wrapper>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import TwoTokenHero from "./TwoTokenHero.vue";

@Component({
  components: {
    HeroWrapper,
    TwoTokenHero
  }
})
export default class HeroConvert extends Vue {
  spinning = false;
  token1Symbol = "";
  token2Symbol = "";
  token1Amount = "";
  token2Amount = "";
  token1UserBalance = "";
  token2UserBalance = "";
  smartUserBalance = "";
  modal = false;
  loaded = false;

  get token1Img() {
    return vxm.bancor.newNetworkTokenChoices.find(
      token => token.symbol == this.token1Symbol
    )!.img;
  }

  get token2Img() {
    return vxm.bancor.newPoolTokenChoices.find(
      token => token.symbol == this.token2Symbol
    )!.img;
  }

  get networkChoices() {
    return vxm.bancor.newNetworkTokenChoices;
  }

  get tokenChoices() {
    return vxm.bancor.newPoolTokenChoices;
  }

  get displayedToken1Balance() {
    return "";
  }

  get displayedToken2Balance() {
    return "";
  }

  get isAuthenticated() {
    return vxm.wallet.isAuthenticated;
  }

  async createRelay() {
    console.log("create relay pressed");
  }

  tokenOneChanged() {
    console.log("token1 changed");
  }

  tokenTwoChanged() {
    console.log("token2 Changed");
  }

  created() {
    this.token1Symbol = vxm.bancor.newNetworkTokenChoices[0].symbol;
    this.token2Symbol = vxm.bancor.newPoolTokenChoices[0].symbol;
    this.loaded = true;
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
/* .slide-fade-leave-active below version 2.1.8 */

 {
  transform: translateY(75px);
  opacity: 0;
}

.slide-fade-up-leave-to
/* .slide-fade-leave-active below version 2.1.8 */

 {
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
/* .slide-fade-leave-active below version 2.1.8 */

 {
  transform: translateY(-75px);
  opacity: 0;
}

.slide-fade-down-leave-to
/* .slide-fade-leave-active below version 2.1.8 */

 {
  transform: translateY(75px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to
/* .fade-leave-active below version 2.1.8 */

 {
  opacity: 0;
}
</style>
