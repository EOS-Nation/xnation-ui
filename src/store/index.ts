import Vue from "vue";
import Vuex from "vuex";

import { GeneralModule } from "./modules/general";
import { EosTransitModule } from "./modules/wallet/eosWallet";
import { UsdBancorModule } from "./modules/swap/usdSx";
import { BancorModule } from "./modules/swap/index";
import { WalletModule } from "./modules/wallet/index";
import { NetworkModule } from "./modules/network/index";
import { EosNetworkModule } from "./modules/network/eosNetwork";
import { createProxy, extractVuexModule } from "vuex-class-component";

Vue.use(Vuex);

export const store = new Vuex.Store({
  modules: {
    ...extractVuexModule(UsdBancorModule),
    ...extractVuexModule(GeneralModule),
    ...extractVuexModule(EosTransitModule),
    ...extractVuexModule(BancorModule),
    ...extractVuexModule(WalletModule),
    ...extractVuexModule(NetworkModule),
    ...extractVuexModule(EosNetworkModule)
  },
  strict: process.env.NODE_ENV !== "production"
});

export const vxm = {
  general: createProxy(store, GeneralModule),
  wallet: createProxy(store, WalletModule),
  eosWallet: createProxy(store, EosTransitModule),
  usdsBancor: createProxy(store, UsdBancorModule),
  bancor: createProxy(store, BancorModule),
  eosNetwork: createProxy(store, EosNetworkModule),
  network: createProxy(store, NetworkModule)
};
