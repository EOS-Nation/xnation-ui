import Vue from "vue";
import Vuex from "vuex";

import { general, GeneralModule } from "./modules/general";
import { eosWallet, EosTransitModule } from "./modules/eosWallet";
import { relays, RelaysModule } from "./modules/relays";
import { ethWallet, EthereumModule } from "./modules/ethWallet";
import { wallet, WalletModule } from "./modules/wallet";

Vue.use(Vuex);

export const store = new Vuex.Store({
  modules: {
    general,
    wallet,
    eosWallet,
    ethWallet,
    relays
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
  ethWallet: EthereumModule.CreateProxy(store, EthereumModule) as EthereumModule
};
