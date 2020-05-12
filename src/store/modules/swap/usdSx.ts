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
  get_price,
  get_inverse_rate,
  Pools
} from "sxjs";
import { rpc } from "@/api/rpc";
import { asset_to_number, number_to_asset, symbol } from "eos-common";
import { compareString, retry } from "@/api/helpers";

@Module({ namespacedPath: "usdsBancor/" })
export class UsdBancorModule extends VuexModule implements TradingModule {
  newTokens: any[] = [];
  initiated: boolean = false;

  get wallet() {
    return "eos";
  }

  get tokens(): ViewToken[] {
    if (!this.initiated) {
      return [];
    }
    return this.newTokens
      .map(token => {
        let name, logo: string;

        try {
          const eosModuleBorrowed = vxm.eosBancor.tokenMeta.find(
            tokenMeta => tokenMeta.symbol == token.symbol
          )!;
          if (!eosModuleBorrowed) throw new Error("Failed to find token");
          name = eosModuleBorrowed.name;
          logo = eosModuleBorrowed.logo;
        } catch (e) {
          console.warn("Failed to find name", token.symbol);
          name = token.symbol;
          logo =
            "https://storage.googleapis.com/bancor-prod-file-store/images/communities/f39c32b0-cfae-11e9-9f7d-af4705d95e66.jpeg";
        }
        const tokenBalance = vxm.eosNetwork.balance({
          contract: token.contract,
          symbol: token.symbol
        });
        return {
          ...token,
          name,
          logo,
          balance: tokenBalance && tokenBalance.balance
        };
      })
      .sort((a, b) => b.liqDepth - a.liqDepth);
  }

  get token() {
    return (arg0: string) => {
      const token = this.tokens.find(token => token.symbol == arg0);
      if (!token) throw new Error("Cannot find token");
      return token;
    };
  }

  @mutation moduleInitiated() {
    this.initiated = true;
  }

  @action async init() {
    const [pools, volume] = await Promise.all([
      retry(() => get_pools(rpc), 4, 500),
      retry(() => get_volume(rpc, { days: 1 }), 4, 500)
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
    await this.buildTokens(pools);
    this.moduleInitiated();
  }

  @action async buildTokens(pools: Pools) {
    const tokens = Object.keys(pools);
    const newTokens = await Promise.all(
      tokens.map(async token => {
        let {
          id: { sym, contract },
          depth,
          pegged,
          // @ts-ignore
          volume24h
        } = pools![token];

        const symbolName = sym.code().to_string();
        const precision = sym.precision();

        const price =
          symbolName == "USDT"
            ? 1
            : asset_to_number(
                await get_price("1.0000 USDT", symbolName, pools)
              );

        return {
          symbol: token,
          precision,
          contract,
          volume24h: volume24h || 0,
          price,
          liqDepth: asset_to_number(depth) * asset_to_number(pegged)
        };
      })
    );
    vxm.eosNetwork.getBalances({
      tokens: newTokens.map(token => ({
        contract: token.contract,
        symbol: token.symbol
      }))
    });
    this.setNewTokens(newTokens);
  }

  @mutation setNewTokens(tokens: any[]) {
    this.newTokens = tokens;
  }

  @action async focusSymbol(symbolName: string) {
    const tokens = this.newTokens.filter(token =>
      compareString(token.symbol, symbolName)
    );
    vxm.eosNetwork.getBalances({
      tokens: tokens.map(token => ({
        contract: token.contract,
        symbol: token.symbol
      }))
    });
  }

  @action async refreshBalances(symbols: BaseToken[] = []) {}

  @action async convert(propose: ProposedConvertTransaction) {
    // @ts-ignore
    const accountName = this.$store.rootState.eosWallet.walletState.auth
      .accountName;

    const fromToken = this.newTokens.find(token =>
      compareString(token.symbol, propose.fromSymbol)
    );

    const tokenContract = fromToken.contract;
    const precision = fromToken.precision;
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

    const expectedReward = number_to_asset(
      amount,
      symbol(toSymbol, toPrecision)
    );

    const offering = symbol(fromSymbol, fromPrecision);

    const { quantity, slippage } = get_inverse_rate(
      expectedReward,
      offering.code(),
      pools,
      settings
    );

    return {
      amount: String(asset_to_number(quantity)),
      slippage
    };
  }
}

export const usdsBancor = UsdBancorModule.ExtractVuexModule(UsdBancorModule);
