import Vue from "vue";
import Vuex from "vuex";

import { general, GeneralModule } from "./modules/general";
import { eosWallet, EosTransitModule } from "./modules/eosWallet";
import { relays, RelaysModule } from "./modules/relays";
import { eth, EthereumModule } from "./modules/eth";
import { wallet, WalletModule } from "./modules/wallet";

Vue.use(Vuex);

export const store = new Vuex.Store({
  modules: {
    general,
    wallet,
    eosWallet,
    relays,
    eth
  },
  strict: process.env.NODE_ENV !== "production"
});

export const vxm = {
  general: GeneralModule.CreateProxy(store, GeneralModule) as GeneralModule,
  wallet: WalletModule.CreateProxy(store, WalletModule) as WalletModule,
  eosWallet: EosTransitModule.CreateProxy(
    store,
    EosTransitModule
  ) as EosTransitModule,
  relays: RelaysModule.CreateProxy(store, RelaysModule) as RelaysModule,
  eth: EthereumModule.CreateProxy(store, EthereumModule) as EthereumModule
};
