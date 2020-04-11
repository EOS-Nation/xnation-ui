import { VuexModule, action, Module, mutation } from "vuex-class-component";
import {
  ProposedTransaction,
  ProposedConvertTransaction,
  TradingModule,
  ViewToken,
  ModulePools,
  BaseToken
} from "@/types/bancor";
import { vxm } from "@/store";
import {
  get_pools,
  get_settings,
  get_volume,
  get_rate,
  get_inverse_rate
} from "sxjs";
import { rpc } from "@/api/rpc";
import { asset_to_number, number_to_asset, symbol } from "eos-common";

@Module({ namespacedPath: "usdsBancor/" })
export class UsdBancorModule extends VuexModule implements TradingModule {
  tokensList: ModulePools | undefined = undefined;
  initiated: boolean = false;

  get wallet() {
    return "eos";
  }

  get tokens(): ViewToken[] {
    if (!this.initiated) {
      return [];
    }
    const tokens = Object.keys(this.tokensList!);
    return tokens.map(token => {
      let name, logo, balance;
      let {
        id: { sym, contract }
      } = this.tokensList![token];

      const tokenBalance = vxm.eosNetwork.balance({
        contract,
        symbol: sym.code().to_string()
      });
      balance = (tokenBalance && Number(tokenBalance.balance)) || 0;

      try {
        const eosModuleBorrowed = vxm.eosBancor.tokenMeta.find(
          tokenMeta => tokenMeta.symbol == token
        )!;
        if (!eosModuleBorrowed) throw new Error("Failed to find token");
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
        // @ts-ignore
        price: asset_to_number(this.tokensList![token].pegged),
        liqDepth:
          // @ts-ignore
          asset_to_number(this.tokensList![token].depth) *
          // @ts-ignore
          asset_to_number(this.tokensList![token].pegged),
        logo,
        change24h: 0,
        volume24h: this.tokensList![token].volume24h,
        balance
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

  @mutation moduleInitiated() {
    this.initiated = true;
  }

  @action async init() {
    const [pools, volume] = await Promise.all([
      // @ts-ignore
      get_pools(rpc),
      // @ts-ignore
      get_volume(rpc, 1)
    ]);
    for (const pool in pools) {
      pools[pool] = {
        ...pools[pool],
        // @ts-ignore
        volume24h:
          asset_to_number(pools[pool].pegged) *
          Number(volume[0]["volume"][pool])
      };
    }
    // @ts-ignore
    this.setTokensList(pools);
    this.moduleInitiated();
  }

  @action async focusSymbol(symbolName: string) {}
  @action async refreshBalances(symbols: BaseToken[] = []) {}

  @action async convert(propose: ProposedConvertTransaction) {
    console.log(propose, "one of the cases");
    console.log(this.tokensList);

    // @ts-ignore
    const accountName = this.$store.rootState.eosWallet.walletState.auth
      .accountName;

    const fromToken = this.tokensList![propose.fromSymbol];

    const tokenContract = fromToken.id.contract;
    const precision = fromToken.id.sym.precision();
    const amountAsset = number_to_asset(
      propose.fromAmount,
      symbol(propose.fromSymbol, precision)
    );

    const txRes = await this.triggerTx([
      {
        account: tokenContract,
        name: "transfer",
        data: {
          from: accountName,
          to: process.env.VUE_APP_USDSTABLE!,
          memo: propose.toSymbol,
          quantity: amountAsset.to_string()
        }
      }
    ]);

    return txRes.transaction_id;
  }

  @action async triggerTx(actions: any[]) {
    // @ts-ignore
    return this.$store.dispatch("eosWallet/tx", actions, { root: true });
  }

  @action async getReturn(propose: ProposedTransaction) {
    const { fromSymbol, amount, toSymbol } = propose;

    const [pools, settings] = await Promise.all([
      get_pools(rpc),
      get_settings(rpc)
    ]);

    const fromPrecision = pools[fromSymbol].balance.symbol.precision();
    const toPrecision = pools[toSymbol].balance.symbol.precision();

    const fromAsset = number_to_asset(
      amount,
      symbol(fromSymbol, fromPrecision)
    );

    const toSymbolObj = symbol(toSymbol, toPrecision);

    const { out, slippage } = get_rate(
      fromAsset,
      toSymbolObj.code(),
      pools,
      settings
    );


    return {
      amount: String(asset_to_number(out)),
      slippage
    };
  }

  @action async getCost(propose: ProposedTransaction) {
    const { fromSymbol, amount, toSymbol } = propose;

    const [pools, settings] = await Promise.all([
      get_pools(rpc),
      get_settings(rpc)
    ]);

    const fromPrecision = pools[fromSymbol].balance.symbol.precision();
    const toPrecision = pools[toSymbol].balance.symbol.precision();

    const fromAsset = number_to_asset(
      amount,
      symbol(fromSymbol, fromPrecision)
    );

    const toSymbolObj = symbol(toSymbol, toPrecision);

    const { quantity, slippage } = get_inverse_rate(
      fromAsset,
      toSymbolObj.code(),
      pools,
      settings
    );

    console.log('In:', fromAsset.to_string(), toSymbolObj.precision(), toSymbolObj.code().to_string())
    console.log('Out:', quantity.to_string(), 'Slippage', slippage)

    return {
      amount: String(asset_to_number(quantity)),
      slippage
    };
  }
}

export const usdsBancor = UsdBancorModule.ExtractVuexModule(UsdBancorModule);
