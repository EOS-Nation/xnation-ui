import Vue from "vue";
import Vuex from "vuex";

import { general, GeneralModule } from "./modules/general";
import { eosTransit, EosTransitModule } from "./modules/eosTransit";
import { relays, RelaysModule } from "./modules/relays";
import { eth, EthereumModule } from "./modules/eth";

Vue.use(Vuex);

export const store = new Vuex.Store({
  modules: {
    general,
    eosTransit,
    relays,
    eth
  },
  strict: process.env.NODE_ENV !== "production"
});

export const vxm = {
  general: GeneralModule.CreateProxy(store, GeneralModule) as GeneralModule,
  eosTransit: EosTransitModule.CreateProxy(
    store,
    EosTransitModule
  ) as EosTransitModule,
  relays: RelaysModule.CreateProxy(store, RelaysModule) as RelaysModule,
  eth: EthereumModule.CreateProxy(store, EthereumModule) as EthereumModule
};
