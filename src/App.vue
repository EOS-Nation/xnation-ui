<template>
  <div
    v-if="loading && !error"
    id="loading"
    class="page-header-fixed page-header-dark align-items-center"
  >
    <div class="d-flex justify-content-center align-items-center mb-3">
      <div>
        <b-spinner
          style="display: block; width: 10rem; height: 10rem;"
          class="text-light align-self-center align-middle"
          label="Loading..."
        ></b-spinner>
        <h2 class="text-white">Loading...</h2>
      </div>
    </div>
  </div>

  <div
    v-else-if="error"
    id="loading"
    class="page-header-fixed page-header-dark align-items-center"
  >
    <div class="d-flex justify-content-center align-items-center mb-3">
      <div>
        <h2 class="text-white">{{ error }}</h2>
      </div>
    </div>
  </div>

  <div
    v-else
    id="page-container"
    class="page-header-fixed  bg-primary page-header-dark"
  >
    <div>
      <router-view name="Nav"></router-view>

      <main id="main-container" class="bg-primary">
        <router-view name="Hero"></router-view>
        <router-view></router-view>
      </main>
    </div>
    <div>
      <my-footer></my-footer>
      <modal-login />
      <modal-tx />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ModalLogin from "@/components/modals/ModalLogin.vue";
import ModalTx from "@/components/modals/ModalTx.vue";
import MyFooter from "@/components/common/MyFooter.vue";
import { vxm } from "@/store/";
import { WalletProvider } from "eos-transit";
import wait from "waait";

@Component({
  components: {
    ModalLogin,
    ModalTx,
    MyFooter
  }
})
export default class App extends Vue {
  loading = true;
  error = false;

  async loadBancor() {
    console.log("feature:", this.$route.meta.feature);
    console.log("service:", this.$route.params.service);
    console.log("query:", this.$route.query);

    const trade = this.$route.meta.feature == "Trade";

    const service = this.$route.params && this.$route.params.service;
    const pool = this.$route.params && this.$route.params.account;
    const feature = this.$route.meta && this.$route.meta.feature;
    const query = this.$route.query;
    const paramsSatisfied = service && feature && query;

    const initParams = {
      initialChain: this.$route.params.service,
      ...(paramsSatisfied && {
        initialModuleParam: {
          [trade ? "tradeQuery" : "poolQuery"]: trade ? this.$route.query : pool
        }
      })
    };

    console.log({ service, feature, query, initParams, paramsSatisfied });
    try {
      await vxm.bancor.init(initParams);
      this.loading = false;
    } catch (e) {
      await wait(1000);
      try {
        await vxm.bancor.init(initParams);
      } catch (e) {
        this.loading = false;
        this.error = e.message;
        throw new Error(e);
      }
    }
  }

  async created() {
    const autoLogin = localStorage.getItem("autoLogin");
    if (autoLogin) {
      const provider = vxm.eosWallet.walletProviders.find(
        (p: WalletProvider) => p.id === autoLogin
      );
      if (provider) vxm.eosWallet.initLogin(provider);
    }
    vxm.general.setLanguage();
    this.loadBancor();
  }
}
</script>
<style scoped lang="scss">
h2 {
  padding: 25px;
}

#page-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

#loading {
  background-color: #324856;
  height: 100%;
  padding-top: 95px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to
/* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
