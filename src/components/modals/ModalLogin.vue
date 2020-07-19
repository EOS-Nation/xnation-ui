<template>
  <b-modal id="modal-login" class="modal" size="lg" centered hide-footer>
    <template slot="modal-title">
      SELECT WALLET PROVIDER
    </template>
    <transition name="slide-fade" mode="out-in">
      <b-row
        v-if="!loading && !error"
        key="select"
        class="d-flex align-items-center justify-content-center"
      >
        <b-col
          sm="12"
          md="6"
          v-for="provider in walletProviders"
          :key="provider.id"
          class="text-center d-flex justify-content-between fail"
        >
          <b-container>
            <b-row class="fail">
              <b-col @click="initLogin(provider)">
                <img
                  @click="initLogin(provider)"
                  class="img-avatar img-avatar-thumb cursor"
                  :src="
                    require('@/assets/media/logos/' + providerLogoUrl(provider))
                  "
                  alt="Provider Logo"
                />
              </b-col>
              <b-col class="Aligner">
                <h3
                  @click="initLogin(provider)"
                  class="mt-2 mb-5 cursor text-center align-middle Aligner-item"
                >
                  {{ provider.meta.name }}
                </h3></b-col
              >
            </b-row>
          </b-container>
        </b-col>
      </b-row>
      <b-row v-else-if="error" key="error" class="d-flex align-items-center">
        <b-col>
          <h3>{{ selectedProvider.meta.name }}</h3>
          <h4>{{ selectedProvider.meta.name }}</h4>
          <p v-if="error.message">{{ error.message }}</p>
          <p v-else>{{ error }}</p>
          <b-btn @click="error = false">Try Again</b-btn>
        </b-col>
      </b-row>
      <b-row v-else key="loading" class="d-flex align-items-center">
        <b-col>
          <h3>{{ selectedProvider.meta.name }}</h3>
          {{ loginStatus[0] }}
        </b-col>
      </b-row>
    </transition>
  </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { vxm } from "@/store/";
import { WalletProvider } from "eos-transit";

const mobileCompatibleWallets = [
  "EOS Lynx",
  "TokenPocket",
  "meetone_provider",
  "whalevault",
  "Keycat",
  "anchor-link"
];

const isMobileCompatible = (mobileCompatibleIds: string[]) => (
  provider: WalletProvider
): boolean => mobileCompatibleIds.some(id => provider.id == id);

@Component
export default class ModalLogin extends Vue {
  loading = false;
  error: any = false;

  get width() {
    return window.innerWidth;
  }

  get isMobile() {
    return this.width <= 768;
  }

  get walletProviders(): WalletProvider[] {
    return this.isMobile
      ? vxm.eosWallet.walletProviders.filter(
          isMobileCompatible(mobileCompatibleWallets)
        )
      : vxm.eosWallet.walletProviders;
  }

  get selectedProvider() {
    return vxm.eosWallet.selectedProvider;
  }

  get loginStatus() {
    return vxm.eosWallet.loginStatus;
  }

  async initLogin(p: WalletProvider) {
    this.loading = true;
    try {
      await vxm.eosWallet.initLogin(p);
      this.$bvModal.hide("modal-login");
    } catch (e) {
      this.error = e;
      console.log(e);
    } finally {
      this.loading = false;
    }
  }

  providerLogoUrl(p: WalletProvider) {
    switch (p.id) {
      case "scatter":
        return "scatter.svg";
      case "ledger":
        return "ledger.png";
      case "meetone_provider":
        return "meetone.jpg";
      case "Keycat":
        return "keycat.svg";
      case "TokenPocket":
        return "tp.jpg";
      case "EOS Lynx":
        return "lynx.jpg";
      case "whalevault":
        return "whalevault.png";
      default:
        return "eos.png";
    }
  }
}
</script>

<style lang="scss">
@media only screen and (max-width: 768px) {
  #modal-login {
    width: 100%;
  }
}
</style>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.fail {
  display: flex;
}

@media (min-width: 768px) {
  .fail {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
}
</style>
<style scoped lang="scss">
.row {
  min-height: 50vh;
}

.Aligner {
  display: flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
}

.Aligner-item {
  vertical-align: middle;
  text-align: center;
}

@media (min-width: 768px) {
  .derp {
    display: flex;
    flex-direction: column;
  }
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
