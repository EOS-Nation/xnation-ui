import Vue from "vue";
import Vuex from "vuex";

import { general, GeneralModule } from "./modules/general";
import { eosWallet, EosTransitModule } from "./modules/wallet/eosWallet";
import { ethWallet, EthereumModule } from "./modules/wallet/ethWallet";
import { eosBancor, EosBancorModule } from "./modules/swap/eosBancor";
import { ethBancor, EthBancorModule } from "./modules/swap/ethBancor";
import { UsdBancorModule } from "./modules/swap/usdSx";
import { bancor, BancorModule } from "./modules/swap/index";
import { wallet, WalletModule } from "./modules/wallet/index";
import { network, NetworkModule } from './modules/network/index';
import { eosNetwork, EosNetworkModule } from "./modules/network/eosNetwork";
import { createProxy, extractVuexModule } from 'vuex-class-component';

Vue.use(Vuex);

export const store = new Vuex.Store({
  modules: {
    ...extractVuexModule(UsdBancorModule),
    general,
    wallet,
    eosWallet,
    ethWallet,
    eosBancor,
    ethBancor,
    network,
    bancor,
    eosNetwork
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
  usdsBancor: createProxy(store, UsdBancorModule),
  bancor: BancorModule.CreateProxy(store, BancorModule) as BancorModule,
  eosNetwork: EosNetworkModule.CreateProxy(
    store,
    EosNetworkModule
  ) as EosNetworkModule,
  network: NetworkModule.CreateProxy(store, NetworkModule) as NetworkModule
};
