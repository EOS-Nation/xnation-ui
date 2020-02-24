import { VuexModule, action, Module, mutation } from "vuex-class-component";

import { get_pools, get_volume } from "@/api/usdc";

import { getTokenBalances, getBitcoinPrice } from "@/api/helpers";
import {
  ProposedTransaction,
  ProposedConvertTransaction,
  TokenPrice,
  TradingModule,
  TokenPriceExtended,
  ViewToken,
  ConvertReturn,
  Settings,
  Pools,
  kv,
  ModulePools
} from "@/types/bancor";
import { vxm } from "@/store";
import { waitFor } from "@dfuse/client";
import wait from "waait";

@Module({ namespacedPath: "usdcBancor/" })
export class UsdBancorModule extends VuexModule implements TradingModule {
  tokensList: ModulePools = {
    depth: {},
    ratio: {},
    pegged: {},
    balance: {},
    volume: {},
    proceeds: {}
  };

  get wallet() {
    return "eos";
  }

  get tokens(): ViewToken[] {
    if (!this.tokensList.depth) {
      return [];
    }
    const tokens = Object.keys(this.tokensList["depth"]);

    return tokens.map(token => {
      let name, logo;

      try {
        const eosModuleBorrowed = vxm.eosBancor.token(token);
        name = eosModuleBorrowed.name;
        logo = eosModuleBorrowed.logo;
      } catch (e) {
        name = token;
        logo =
          "https://storage.googleapis.com/bancor-prod-file-store/images/communities/f39c32b0-cfae-11e9-9f7d-af4705d95e66.jpeg";
      }
      return {
        symbol: token,
        name,
        price: this.tokensList["pegged"][token],
        liqDepth:
          this.tokensList["depth"][token] * this.tokensList["pegged"][token],
        logo,
        change24h: 0,
        volume24h: this.tokensList["volume"][token] * this.tokensList["pegged"][token],
        balance: "0"
      };
    });
  }

  get token() {
    return (arg0: string) => {
      const token = this.tokens.find(token => token.symbol == arg0);
      if (!token) throw new Error("Cannot find token");
      return token;
    };
  }

  @mutation setTokensList(pools: ModulePools) {
    this.tokensList = pools;
  }

  @action async init() {
    const [pools, volume] = await Promise.all([get_pools(), get_volume(1)]);
    this.setTokensList({
      ...pools,
      ...volume[0]
    });
    console.log(this.tokensList, "is tokens list");
  }

  @action async focusSymbol(symbolName: string) {}
  @action async refreshBalances(symbols: string[] = []) {}

  @action async convert(propose: ProposedConvertTransaction) {
    return "ihui";
  }

  @action async getReturn(propose: ProposedTransaction) {
    return {
      amount: String(propose.amount * 3)
    };
  }

  @action async getCost(propose: ProposedTransaction) {
    return {
      amount: String(propose.amount * 3)
    };
  }
}

export const usdcBancor = UsdBancorModule.ExtractVuexModule(UsdBancorModule);
