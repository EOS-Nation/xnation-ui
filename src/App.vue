<template>
  <div id="page-container" class="page-header-fixed page-header-dark">
    <!-- Header -->
    <navigation />
    <!-- END Header -->

    <!-- Main Container -->
    <main id="main-container" class="bg-primary">
      <!-- Main Content -->
      <transition name="fade" mode="out-in">
        <router-view />
      </transition>
      <!-- END Main Content -->
    </main>
    <!-- END Main Container -->
    <modal-login />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Navigation from '@/components/layout/Navigation.vue'
import ModalLogin from '@/components/modals/ModalLogin.vue'
import { vxm } from '@/store/'
import { WalletProvider } from 'eos-transit'

@Component({
  components: {
    Navigation,
    ModalLogin
  }
})
export default class App extends Vue {
  async created() {
    const autoLogin = localStorage.getItem('autoLogin')
    if (autoLogin) {
      const provider = vxm.eosTransit.walletProviders.find(
        (p: WalletProvider) => p.id === autoLogin
      )
      if (provider) vxm.eosTransit.initLogin(provider)
    }
    vxm.general.setLanguage()
  }
}
</script>
<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
