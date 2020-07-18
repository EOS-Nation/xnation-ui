<template>
  <div class="w-100 text-center mt-2">
    <b-row>
      <b-col cols="6" class="pr-2">
        <b-btn
          class="btn-block mx-1 block-rounded"
          :key="navItems[0].label"
          :to="navItems[0].destination"
          :disabled="navItems[0].disabled"
          :variant="!navItems[0].active ? 'light' : 'primary'"
          size="lg"
        >
          {{ navItems[0].label }}
        </b-btn>
      </b-col>
      <b-col cols="6" class="pl-2">
        <b-btn
          class="btn-block mx-1 block-rounded"
          :key="navItems[1].label"
          :to="navItems[1].destination"
          :disabled="navItems[1].disabled"
          :variant="(navItems[1].active || navItems[2].active) ? 'primary' : 'light'"
          size="lg"
        >
          {{ navItems[1].label }}
        </b-btn>
      </b-col>
    </b-row>
    <hr :class="darkMode ? 'hr-dark' : 'hr-light'" />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { vxm } from "@/store/";
import wait from "waait";
import { router } from "@/router";
import { sync } from "vuex-router-sync";
import {
  services,
  Feature,
  buildTokenId,
  compareString,
  findOrThrow
} from "@/api/helpers";
import { store } from "../../store";
import { ModuleParam } from "../../types/bancor";
import { ethReserveAddress } from "../../api/ethConfig";
import { Route } from "vue-router";

const defaultPaths = [
  {
    moduleId: "eos",
    base: buildTokenId({ contract: "bntbntbntbnt", symbol: "BNT" }),
    quote: buildTokenId({ contract: "eosio.token", symbol: "EOS" })
  },
  {
    moduleId: "eth",
    base: ethReserveAddress,
    quote: "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c"
  },
  {
    moduleId: "usds",
    base: buildTokenId({ contract: "eosdtsttoken", symbol: "EOSDT" }),
    quote: buildTokenId({ contract: "tethertether", symbol: "USDT" })
  }
];

const appendBaseQuoteQuery = (base: string, quote: string, route: Route) => ({
  name: route.name,
  params: route.params,
  query: { base, quote }
});

const extendRouter = (moduleId: string) => {
  const path = findOrThrow(
    defaultPaths,
    path => compareString(moduleId, path.moduleId),
    `failed to find default path for unknown service`
  );

  return {
    query: {
      base: path.base,
      quote: path.quote
    },
    params: {
      service: moduleId
    }
  };
};

const addDefaultQueryParams = (to: Route): any => {
  const path = findOrThrow(
    defaultPaths,
    path => compareString(to.params.service, path.moduleId),
    `failed to find default path for unknown service`
  );

  return appendBaseQuoteQuery(path.base, path.quote, to);
};

const defaultModuleParams = (moduleId: string): ModuleParam => {
  const path = findOrThrow(
    defaultPaths,
    path => compareString(moduleId, path.moduleId),
    `failed to find default path for unknown service`
  );

  return {
    tradeQuery: {
      base: path.base,
      quote: path.quote
    }
  };
};

const createDirectRoute = (name: string, params?: any) => ({
  name,
  ...(params && { params })
});

@Component
export default class SubNavigation extends Vue {
  get selectedNetwork() {
    return vxm.bancor.currentNetwork;
  }

  get selectedWallet() {
    return vxm.wallet.currentWallet;
  }

  get darkMode() {
    return vxm.general.darkMode;
  }

  get selected() {
    return this.selectedNetwork;
  }

  get navItems() {
    return [
      {
        label: "Convert",
        destination: createDirectRoute("Tokens"),
        render: this.selectedService!.features.includes(0),
        disabled: false,
        icon: "exchange-alt",
        active: this.$route.name == "Tokens"
      },
      {
        label: "Pools",
        destination: createDirectRoute("Relays"),
        render: this.selectedService!.features.includes(2),
        disabled: false,
        icon: "swimming-pool",
        active: this.$route.name == "Relay" || this.$route.name == "Relays"
      },
      {
        label: "Create",
        destination: createDirectRoute("Create"),
        disabled: !this.isAuthenticated,
        icon: "plus",
        render: this.selectedService!.features.includes(3),
        active: this.$route.name == "Create"
      }
      // @ts-ignore
    ].filter(route => route.render);
  }

  set selected(newSelection: string) {
    this.loadNewModule(newSelection);
  }

  async loadNewModule(moduleId: string) {
    const module = findOrThrow(vxm.bancor.modules, module =>
      compareString(module.id, moduleId)
    );
    const moduleAlreadyLoaded = module.loaded;

    await vxm.bancor.initialiseModule({
      moduleId,
      resolveWhenFinished: !moduleAlreadyLoaded,
      params: defaultModuleParams(moduleId)
    });
    this.$router.push({ name: "Tokens", ...extendRouter(moduleId) });
  }

  get options() {
    return vxm.bancor.modules.map(module => ({
      text: module.label,
      value: module.id,
      disabled: module.loading
    }));
  }

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
    }
  }

  get language() {
    return vxm.general.language;
  }

  get loginTooltip() {
    return this.selected == "eth" && vxm.ethWallet.isAuthenticated
      ? "Logout via wallet"
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
      } else return "Connect Wallet";
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
    if (status === "Connect Wallet") {
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
.hr-light {
  border: #eeeeee solid 1px;
}

.hr-dark {
  border: #1c344e solid 1px;
}
</style>
