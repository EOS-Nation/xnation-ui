import { VuexModule, action, Module, mutation } from "vuex-class-component";

import { get_pools } from "@/api/usdc";

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
  kv
} from "@/types/bancor";
import { vxm } from "@/store";

@Module({ namespacedPath: "usdcBancor/" })
export class UsdBancorModule extends VuexModule implements TradingModule {
  // @ts-ignore
  tokensList: Pools;
  bitcoinPrice: number = 0;

  get tokens(): ViewToken[] {
    const tokens = Object.keys(this.tokensList["depth"]);

    return tokens.map(token => {
      try {
        return vxm.eosBancor.token(token);
      } catch (e) {
        console.log(e);
        return {
          symbol: token,
          name: token,
          price: token.includes("BTC") ? this.bitcoinPrice : 2,
          liqDepth: this.tokensList["depth"][token],
          logo:
            "https://storage.googleapis.com/bancor-prod-file-store/images/communities/f39c32b0-cfae-11e9-9f7d-af4705d95e66.jpeg",
          change24h: 5,
          volume24h: 5
        };
      }
    });
  }

  get token() {
    return (arg0: string) => {
      const token = this.tokens.find(token => token.symbol == arg0);
      if (!token) throw new Error("Cannot find token");
      return token;
    };
  }

  @mutation setTokensList(pools: Pools) {
    this.tokensList = pools;
  }

  @mutation setBitcoinPrice(bitcoinPrice: number) {
    this.bitcoinPrice = bitcoinPrice;
  }

  @action async init() {
    const [bitcoinPrice, pools] = await Promise.all([
      getBitcoinPrice(),
      get_pools()
    ]);

    this.setBitcoinPrice(bitcoinPrice);
    this.setTokensList(pools);
  }

  // @ts-ignore
  @action async convert() {}

  // @ts-ignore
  @action async getReturn() {}

  // @ts-ignore
  @action async getCost() {}
}

export const usdcBancor = UsdBancorModule.ExtractVuexModule(UsdBancorModule);
