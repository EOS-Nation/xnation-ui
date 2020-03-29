<template>
  <header id="page-header">
    <div class="content content-header content-boxed py-0">
      <div
        class="d-flex align-items-center align-middle float-left"
        style="width: 180px"
      >
        <router-link :to="{ name: 'Tokens' }">
          <img src="@/assets/media/logos/eosn.png" height="30px" class="mr-4" />
        </router-link>
        <b-form-group id="form-group">
          <b-form-radio-group
            class="align-self-center"
            size="sm"
            v-model="selected"
            :options="options"
            button-variant="branded"
            buttons
          ></b-form-radio-group>
        </b-form-group>
      </div>
      <div class="d-none d-md-flex align-items-center justify-content-center">
        <b-btn
          :to="{ name: `Tokens` }"
          v-if="selectedService.features.includes(0)"
          variant="primary"
          size="sm"
          :active="$route.name == 'Tokens'"
          class="mr-2"
        >
          <font-awesome-icon icon="exchange-alt" fixed-width class="mr-1" />
          Convert
        </b-btn>
        <b-btn
          :to="{ name: `Relays` }"
          v-if="selectedService.features.includes(2)"
          variant="primary"
          size="sm"
          :active="$route.name == 'Relay' || $router.name == 'Relays'"
          class="mr-2"
        >
          <font-awesome-icon icon="swimming-pool" fixed-width class="mr-1" />
          Pools
        </b-btn>
        <b-btn
          :to="{ name: 'Create' }"
          v-if="selectedService.features.includes(3)"
          variant="primary"
          size="sm"
          :disabled="!isAuthenticated"
          exact
          class="mr-2"
        >
          <font-awesome-icon icon="plus" fixed-width class="mr-1" />
          Create
        </b-btn>
        <b-btn
          v-if="!isAuthenticated && selectedService.features.includes(1)"
          :to="{ name: `Wallet` }"
          variant="primary"
          size="sm"
          exact
        >
          <font-awesome-icon icon="wallet" fixed-width /> Wallet
        </b-btn>
        <b-btn
          v-else-if="selectedService.features.includes(1)"
          :to="{
            name: `WalletAccount`,
            params: { account: isAuthenticated }
          }"
          variant="primary"
          size="sm"
        >
          <font-awesome-icon icon="wallet" fixed-width /> Wallet
        </b-btn>
      </div>

      <div
        class="d-flex align-items-center float-right justify-content-end"
        style="width: 180px"
      >
        <b-btn
          @click="loginAction"
          variant="dual"
          size="sm"
          v-b-tooltip.hover
          :title="loginTooltip"
        >
          {{ loginButtonLabel }}
          <font-awesome-icon :icon="icon" :pulse="spin" fixed-width />
        </b-btn>
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { vxm } from "@/store/";
import wait from "waait";
import { router } from "@/router";
import { sync } from "vuex-router-sync";
import { services, Feature } from "@/api/helpers";
import { store } from "../../store";

@Component
export default class Navigation extends Vue {
  get selectedNetwork() {
    return vxm.bancor.currentNetwork;
  }

  get selectedWallet() {
    return vxm.wallet.currentWallet;
  }

  get selected() {
    return this.selectedNetwork;
  }

  set selected(newSelection: string) {
    this.$router.replace(`/${newSelection}`);
  }

  options = [
    {
      text: "EOS",
      value: "eos"
    },
    {
      text: "ETH",
      value: "eth"
    },
    {
      text: "USDⓈ",
      value: "usds"
    }
  ];

  get selectedService() {
    return services.find(service => service.namespace == this.selectedNetwork);
  }

  created() {
    vxm.ethWallet.checkAlreadySignedIn();
  }

  @Watch("isAuthenticated")
  onAuthentication(account: string) {
    if (account) {
      vxm.bancor.refreshBalances();
      // @ts-ignore
      this.$analytics.setUserId(account);
      // @ts-ignore
      this.$analytics.logEvent("login", { account });
      // @ts-ignore
      this.$log.identify(account);
      // @ts-ignore
      this.$log.track("Successful Login");
    }
  }

  get language() {
    return vxm.general.language;
  }

  get loginTooltip() {
    return this.selected == "eth" && vxm.ethWallet.isAuthenticated
      ? "Logout via MetaMask"
      : "";
  }

  set language(lang: string) {
    vxm.general.setLanguage(lang);
  }

  get loginStatus() {
    return vxm.eosWallet.loginStatus;
  }

  get shortenedEthAddress() {
    const isAuthenticated = vxm.ethWallet.isAuthenticated;
    return isAuthenticated.length > 13
      ? isAuthenticated.substring(0, 4) +
          "..." +
          isAuthenticated.substring(
            isAuthenticated.length - 6,
            isAuthenticated.length
          )
      : isAuthenticated;
  }

  get loginButtonLabel() {
    if (this.selectedWallet == "eos") {
      return this.loginStatus[0];
    } else {
      const isAuthenticated = vxm.ethWallet.isAuthenticated;
      if (isAuthenticated) {
        return this.shortenedEthAddress;
      } else return "Login";
    }
  }

  get icon() {
    if (this.selectedWallet == "eos") {
      return this.loginStatus[1];
    } else {
      return vxm.ethWallet.isAuthenticated ? "power-off" : "arrow-circle-right";
    }
  }

  get spin() {
    return this.loginStatus[2];
  }

  get isAuthenticated() {
    return vxm.wallet.isAuthenticated;
  }

  createRelay() {
    this.$router.push({
      name: "Create"
    });
  }

  async loginActionEos() {
    const status = this.loginButtonLabel;
    if (status === "Login") {
      this.$bvModal.show("modal-login");
    } else if (
      status !== "Authenticating" &&
      status !== "Connecting" &&
      status !== "Fetching"
    ) {
      vxm.eosWallet.logout();
    }
  }

  async loginActionEth() {
    if (vxm.ethWallet.isAuthenticated) {
      // Cannot logout of MetaMask
    } else {
      await vxm.ethWallet.connect();
    }
  }

  async loginAction() {
    const wallet = this.selectedWallet;
    if (wallet == "eos") this.loginActionEos();
    else this.loginActionEth();
  }
}
</script>

<style>
#form-group {
  margin-bottom: unset;
}

.btn-branded {
  color: grey !important;
  background-color: #1b262e !important;
}

.btn-branded:hover {
  color: black !important;
  background-color: #fa932b !important;
}

label.active {
  color: black !important;
  background-color: #d18235 !important;
}
</style>
