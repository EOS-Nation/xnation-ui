import Vue from "vue";
import Vuex from "vuex";

import { general, GeneralModule } from "./modules/general";
import { tokens, TokensModule } from "./modules/tokens";
import { eosTransit, EosTransitModule } from "./modules/eosTransit";
import { transfer, TransferModule } from "./modules/transfer";
import { wallet, walletModule } from "./modules/wallet";
import { relays, RelaysModule } from "./modules/relays";
import { eth, EthereumModule } from "./modules/eth";

Vue.use(Vuex);

export const store = new Vuex.Store({
  modules: {
    general,
    tokens,
    eosTransit,
    transfer,
    wallet,
    relays,
    eth
  },
  strict: process.env.NODE_ENV !== "production"
});

export const vxm = {
  general: GeneralModule.CreateProxy(store, GeneralModule) as GeneralModule,
  tokens: TokensModule.CreateProxy(store, TokensModule) as TokensModule,
  eosTransit: EosTransitModule.CreateProxy(
    store,
    EosTransitModule
  ) as EosTransitModule,
  transfer: TransferModule.CreateProxy(store, TransferModule) as TransferModule,
  wallet: walletModule.CreateProxy(store, walletModule) as walletModule,
  relays: RelaysModule.CreateProxy(store, RelaysModule) as RelaysModule,
  eth: EthereumModule.CreateProxy(store, EthereumModule) as EthereumModule
};
