<template>
  <header id="page-header">
    <div class="content content-header content-boxed py-0">
      <div
        class="d-flex align-items-center align-middle float-left"
        style="width: 180px"
      >
        <router-link :to="{ name: 'Tokens' }">
          <img src="@/assets/media/logos/eosn.png" height="40px" class="mr-4" />
        </router-link>
        <b-form-group id="form-group">
          <b-form-radio-group
            class="align-self-center"
            size="sm"
            v-model="selected"
            :options="options"
            buttons
          ></b-form-radio-group>
        </b-form-group>
      </div>
      <div class="d-none d-md-flex align-items-center justify-content-center">
        <b-btn
          :to="{ name: `${this.selected}-Tokens` }"
          variant="primary"
          size="sm"
          exact
          class="mr-2"
        >
          <font-awesome-icon icon="exchange-alt" fixed-width class="mr-1" />
          Convert
        </b-btn>
        <b-btn
          :to="{ name: `${this.selected}-Relays` }"
          variant="primary"
          size="sm"
          exact
          class="mr-2"
        >
          <font-awesome-icon icon="star-of-life" fixed-width class="mr-1" />
          Relays
        </b-btn>
        <b-btn
          v-if="selected == 'eos'"
          :to="{ name: 'eos-Create' }"
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
          v-if="!isAuthenticated"
          :to="{ name: `${this.selected}-Wallet` }"
          variant="primary"
          size="sm"
          exact
        >
          <font-awesome-icon icon="wallet" fixed-width /> Wallet
        </b-btn>
        <b-btn
          v-else
          :to="{
            name: `${this.selected}-WalletAccount`,
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
          class="mr-2"
          v-if="isAuthenticated"
          :to="{ name: 'Wallet' }"
          variant="primary"
          size="sm"
          exact
        >
          <font-awesome-icon icon="search" fixed-width />
        </b-btn>
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

@Component
export default class Navigation extends Vue {
  selected = "eos";
  options = [
    {
      text: "EOS",
      value: "eos"
    },
    {
      text: "ETH",
      value: "eth"
    }
  ];

  created() {
    this.selected = this.routedNetwork;
    vxm.ethWallet.checkAlreadySignedIn();
  }

  get routedNetwork() {
    return this.$route.path.split("/")[1];
  }


  @Watch("selected")
  onChange(selectedNetwork: string) {
    if (this.routedNetwork !== selectedNetwork) {
      this.$router.push({
        path: `/${selectedNetwork}`
      });
    }
    vxm.wallet.setWallet(selectedNetwork);
  }

  get language() {
    return vxm.general.language;
  }

  get loginTooltip() {
    return this.routedNetwork == 'eth' && vxm.ethWallet.isAuthenticated ? 'Logout via MetaMask' : ''
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
    if (this.routedNetwork == "eos") {
      return this.loginStatus[0];
    } else {
      const isAuthenticated = vxm.ethWallet.isAuthenticated;
      if (isAuthenticated) {
        return this.shortenedEthAddress;
      } else return "Login";
    }
  }

  get icon() {
    if (this.routedNetwork == "eos") {
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
    const network = this.routedNetwork;
    if (network == "eos") this.loginActionEos();
    else this.loginActionEth();
  }
}
</script>

<style scoped>
#form-group {
  margin-bottom: unset;
}
</style>
