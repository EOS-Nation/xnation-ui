<template>
  <header id="page-header">
    <!-- Header Content -->
    <div class="content content-header content-boxed py-0">
      <!-- Left Section -->
      <div
        class="d-flex align-items-center align-middle float-left"
        style="width: 180px"
      >
        <!-- Toggle Sidebar -->
        <!-- END Toggle Sidebar -->
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
      <!-- END Left Section -->

      <!-- Center Section -->
      <div class="d-none d-md-flex align-items-center justify-content-center">
        <b-btn
          :to="{ name: 'Tokens' }"
          variant="primary"
          size="sm"
          exact
          class="mr-2"
        >
          <font-awesome-icon icon="exchange-alt" fixed-width class="mr-1" />
          Convert
        </b-btn>
        <b-btn
          :to="{ name: 'Relays' }"
          variant="primary"
          size="sm"
          exact
          class="mr-2"
        >
          <font-awesome-icon icon="star-of-life" fixed-width class="mr-1" />
          Relays
        </b-btn>
        <b-btn
          :to="{ name: 'Create' }"
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
          :to="{ name: 'Wallet' }"
          variant="primary"
          size="sm"
          exact
        >
          <font-awesome-icon icon="wallet" fixed-width /> Wallet
        </b-btn>
        <b-btn
          v-else
          :to="{ name: 'WalletAccount', params: { account: isAuthenticated } }"
          variant="primary"
          size="sm"
          exact
        >
          <font-awesome-icon icon="wallet" fixed-width /> Wallet
        </b-btn>
      </div>
      <!-- END Center Section -->

      <!-- Right Section -->
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
        <!-- Toggle Sidebar -->
        <b-btn @click="loginAction()" variant="dual" size="sm">
          {{ loginStatus[0] }}
          <font-awesome-icon
            :icon="loginStatus[1]"
            :pulse="loginStatus[2]"
            fixed-width
          />
        </b-btn>
        <!-- END Toggle Sidebar -->
      </div>
      <!-- END Right Section -->
    </div>
    <!-- END Header Content -->
  </header>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { vxm } from "@/store/";
import wait from "waait";

@Component
export default class Navigation extends Vue {
  selected = "eos";
  options = [
    { text: "EOS", value: "eos" },
    { text: "ETH", value: "eth" }
  ];

  // computed
  get language() {
    return vxm.general.language;
  }

  set language(lang: string) {
    vxm.general.setLanguage(lang);
  }

  get loginStatus() {
    return vxm.eosTransit.loginStatus;
  }

  get isAuthenticated() {
    if (vxm.eosTransit.wallet && vxm.eosTransit.wallet.auth)
      return vxm.eosTransit.wallet.auth.accountName;
    else return false;
  }

  createRelay() {
    this.$router.push({
      name: "Create"
    });
  }

  // methods
  async loginAction() {
    if (this.loginStatus[0] === "Login") {
      this.$bvModal.show("modal-login");
      // vxm.eosTransit.initLogin(vxm.eosTransit.walletProviders[0])
    } else if (
      this.loginStatus[0] !== "Authenticating" &&
      this.loginStatus[0] !== "Connecting" &&
      this.loginStatus[0] !== "Fetching"
    ) {
      vxm.eosTransit.logout();
    }
  }
}
</script>

<style scoped>
#form-group {
  margin-bottom: unset;
}
</style>
