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
  get_price,
  get_settings,
  get_fee,
  get_volume,
  get_rate,
  get_inverse_rate,
  Settings,
  Pools
} from "sxjs";
import { rpc } from "@/api/rpc";
// @ts-ignore
import {
  asset_to_number,
  number_to_asset,
  symbol,
  asset,
  Asset
} from "eos-common";

const pricePerUnit = (asset: Asset, amountRequested: number): number => {
  return asset_to_number(asset) / amountRequested;
};

interface PreviousCalculation {
  fromSymbol: string;
  fromPrecision: number;
  toSymbol: string;
  toPrecision: number;
  pools: Pools;
  settings: Settings;
  reward: Asset;
  amount: number;
}

const calculateSlippage = (
  {
    fromSymbol,
    fromPrecision,
    toSymbol,
    toPrecision,
    pools,
    settings,
    reward,
    amount
  }: PreviousCalculation,
  cost = false,
  minimalAmount = 0.01
) => {
  const minimal = get_rate(
    number_to_asset(minimalAmount, symbol(fromSymbol, fromPrecision)),
    symbol(toSymbol, toPrecision).code(),
    pools,
    settings
  );
  const minimalReward = pricePerUnit(minimal.price, minimalAmount);
  const rewardReward = pricePerUnit(reward, amount);
  const slippage = cost
    ? (rewardReward - minimalReward) / rewardReward
    : (minimalReward - rewardReward) / minimalReward;

  return slippage;
};

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
      console.log("handling", this.tokensList![token]);
      let {
        id: { sym, contract }
      } = this.tokensList![token];

      const tokenBalance = vxm.eosNetwork.balance({
        contract,
        symbol: sym.code().to_string()
      })
      balance = tokenBalance && String(tokenBalance.balance) || "0"

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

    const pools = await get_pools(rpc);

    const settings = await get_settings(rpc);

    const fromPrecision = pools[fromSymbol].balance.symbol.precision();
    const toPrecision = pools[toSymbol].balance.symbol.precision();

    const reward = get_rate(
      number_to_asset(amount, symbol(fromSymbol, fromPrecision)),
      symbol(toSymbol, toPrecision).code(),
      pools,
      settings
    );

    const slippage = calculateSlippage({
      fromSymbol,
      fromPrecision,
      toSymbol,
      toPrecision,
      amount,
      reward: reward.price,
      pools,
      settings
    });

    return {
      amount: String(
        asset_to_number(reward.price) - asset_to_number(reward.fee)
      ),
      slippage
    };
  }

  @action async getCost(propose: ProposedTransaction) {
    const { fromSymbol, amount, toSymbol } = propose;

    const pools = await get_pools(rpc);
    const settings = await get_settings(rpc);

    const fromPrecision = pools[fromSymbol].balance.symbol.precision();
    const toPrecision = pools[toSymbol].balance.symbol.precision();

    const { price, fee } = get_inverse_rate(
      number_to_asset(amount, symbol(fromSymbol, fromPrecision)),
      symbol(toSymbol, toPrecision).code(),
      pools,
      settings
    );

    const slippage = calculateSlippage(
      {
        fromSymbol: toSymbol,
        fromPrecision: toPrecision,
        toPrecision: fromPrecision,
        toSymbol: fromSymbol,
        amount,
        reward: price,
        pools,
        settings
      },
      true
    );

    return {
      amount: String(asset_to_number(price) - asset_to_number(fee)),
      slippage
    };
  }
}

export const usdsBancor = UsdBancorModule.ExtractVuexModule(UsdBancorModule);
