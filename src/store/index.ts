import Vue from "vue";
import Vuex from "vuex";

import { general, GeneralModule } from "./modules/general";
import { eosWallet, EosTransitModule } from "./modules/eosWallet";
import { relays, RelaysModule } from "./modules/relays";
import { ethWallet, EthereumModule } from "./modules/ethWallet";
import { eosBancor, EosBancorModule } from "./modules/bancor/eosBancor";
import { ethBancor, EthBancorModule } from "./modules/bancor/ethBancor";
import { bancor, BancorModule } from "./modules/bancor/index";
import { wallet, WalletModule } from "./modules/wallet";

Vue.use(Vuex);

export const store = new Vuex.Store({
  modules: {
    general,
    wallet,
    eosWallet,
    ethWallet,
    eosBancor,
    ethBancor,
    bancor,
    relays
  },
  strict: process.env.NODE_ENV !== "production"
});

export const vxm = {
  general: GeneralModule.CreateProxy(store, GeneralModule) as GeneralModule,
  wallet: WalletModule.CreateProxy(store, WalletModule) as WalletModule,
  relays: RelaysModule.CreateProxy(store, RelaysModule) as RelaysModule,
  eosWallet: EosTransitModule.CreateProxy(
    store,
    EosTransitModule
  ) as EosTransitModule,
  ethWallet: EthereumModule.CreateProxy(store, EthereumModule) as EthereumModule,
  eosBancor: EosBancorModule.CreateProxy(store, EosBancorModule) as EosBancorModule,
  ethBancor: EthBancorModule.CreateProxy(store, EthBancorModule) as EthBancorModule,
  bancor: BancorModule.CreateProxy(store, BancorModule) as BancorModule
};
