import Vue from "vue";
import Vuex from "vuex";

import { general, GeneralModule } from "./modules/general";
import { eosWallet, EosTransitModule } from "./modules/wallet/eosWallet";
import { ethWallet, EthereumModule } from "./modules/wallet/ethWallet";
import { eosBancor, EosBancorModule } from "./modules/swap/eosBancor";
import { ethBancor, EthBancorModule } from "./modules/swap/ethBancor";
import { usdsBancor, UsdBancorModule } from "./modules/swap/usdBancor";
import { bancor, BancorModule } from "./modules/swap/index";
import { wallet, WalletModule } from "./modules/wallet/index";

Vue.use(Vuex);

export const store = new Vuex.Store({
  modules: {
    general,
    wallet,
    eosWallet,
    ethWallet,
    eosBancor,
    ethBancor,
    usdsBancor,
    bancor
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
  ethWallet: EthereumModule.CreateProxy(
    store,
    EthereumModule
  ) as EthereumModule,
  eosBancor: EosBancorModule.CreateProxy(
    store,
    EosBancorModule
  ) as EosBancorModule,
  ethBancor: EthBancorModule.CreateProxy(
    store,
    EthBancorModule
  ) as EthBancorModule,
  usdsBancor: UsdBancorModule.CreateProxy(
    store,
    UsdBancorModule
  ) as UsdBancorModule,
  bancor: BancorModule.CreateProxy(store, BancorModule) as BancorModule
};
