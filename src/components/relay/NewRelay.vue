<template>
  <div class="block">
    <div class="block-header">
      <h3 class="block-title">
        All Tokens
        <small>- EOS</small>
      </h3>
      <div class="block-options">
        <b-input-group size="sm">
          <b-input-group-text slot="prepend" class="bg-body border-0 text-muted">
            <font-awesome-icon
              :icon="['fas', searchState]"
              fixed-width
              :class="{ 'fa-blink': searchState === 'keyboard' }"
            />
          </b-input-group-text>
          <b-form-input
            class="form-control form-control-alt"
            v-model="tokenSearch"
            placeholder="Search Token"
          ></b-form-input>
        </b-input-group>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";

export default class HeroActions extends Vue {
  // data

  // computed
  get loadingTokens() {
    return vxm.tokens.loadingTokens;
  }

  get heroAction() {
    return vxm.general.heroAction;
  }

  // methods
  @Watch("tokenFrom")
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
