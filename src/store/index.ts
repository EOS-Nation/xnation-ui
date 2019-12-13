import Vue from "vue";
import Vuex from "vuex";

import { general, GeneralModule } from "./modules/general";
import { tokens, TokensModule } from "./modules/tokens";
import { convert, ConvertModule } from "./modules/convert";
import { eosTransit, EosTransitModule } from "./modules/eosTransit";
import { transfer, TransferModule } from "./modules/transfer";
import { wallet, walletModule } from "./modules/wallet";
import { liquidity, LiquidityModule } from "./modules/liquidity";
import { relays, RelaysModule } from "./modules/relays";

Vue.use(Vuex);

export const store = new Vuex.Store({
  modules: {
    general,
    tokens,
    convert,
    eosTransit,
    transfer,
    wallet,
    liquidity,
    relays
  },
  strict: process.env.NODE_ENV !== "production"
});

export const vxm = {
  general: GeneralModule.CreateProxy(store, GeneralModule) as GeneralModule,
  tokens: TokensModule.CreateProxy(store, TokensModule) as TokensModule,
  convert: ConvertModule.CreateProxy(store, ConvertModule) as ConvertModule,
  eosTransit: EosTransitModule.CreateProxy(
    store,
    EosTransitModule
  ) as EosTransitModule,
  transfer: TransferModule.CreateProxy(store, TransferModule) as TransferModule,
  wallet: walletModule.CreateProxy(store, walletModule) as walletModule,
  liquidity: LiquidityModule.CreateProxy(
    store,
    LiquidityModule
  ) as LiquidityModule,
  relays: RelaysModule.CreateProxy(store, RelaysModule) as RelaysModule
};
