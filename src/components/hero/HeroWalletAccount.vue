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
      <div class="content content-full">
        <b-row class="items-push mt-5">
          <b-col md="6">
            <h1 class="text-white text-uppercase">{{ account }}</h1>
            <h3 class="text-white opacity-50">EOS Mainnet</h3>
          </b-col>
          <b-col md="6" class="d-flex justify-content-end align-items-center">
            <div class="text-right">
              <form v-on:submit.prevent="searchAccount()">
                <b-form-input
                  size="sm"
                  v-model="search"
                  class="form-control-alt"
                  placeholder="Enter Account"
                ></b-form-input>
                <b-btn
                  @click="searchAccount()"
                  variant="success"
                  v-ripple
                  size="sm"
                  class="mt-2"
                >
                  <font-awesome-icon icon="search" fixed-width class="mr-2" />
                  <span class="font-w700">Search</span>
                </b-btn>
              </form>
            </div>
          </b-col>
        </b-row>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Prop, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'

@Component
export default class HeroWalletAccount extends Vue {
  // props
  @Prop() account!: string

  // data
  search = ''

  // computed
  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated
    else return false
  }

  // methods
  searchAccount() {
    this.$router.push({
      name: 'WalletAccount',
      params: { account: this.search }
    })
  }

  async created() {}
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
  transform: translateY(150px);
  opacity: 0;
}
.slide-fade-up-leave-to
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(-150px);
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
  transform: translateY(-150px);
  opacity: 0;
}
.slide-fade-down-leave-to
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(150px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */
 {
  opacity: 0;
}
</style>
