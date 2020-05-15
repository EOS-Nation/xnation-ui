import { VuexModule, action, Module, mutation } from "vuex-class-component";
import {
  ProposedTransaction,
  ProposedConvertTransaction,
  LiquidityParams,
  OpposingLiquidParams,
  ModalChoice,
  NetworkChoice,
  FeeParams,
  NewOwnerParams
} from "@/types/bancor";
import { vxm } from "@/store";
import { store } from "../../../store";
import { compareString, fetchOkexUsdPriceOfBnt } from "@/api/helpers";
import { fetchBinanceUsdPriceOfBnt } from "@/api/helpers";

interface BntPrice {
  price: null | number;
  lastChecked: number;
}

@Module({ namespacedPath: "bancor/" })
export class BancorModule extends VuexModule {
  chains = ["eos", "eth", "usds"];
  usdPriceOfBnt: BntPrice = {
    price: null,
    lastChecked: 0
  };

  get currentNetwork() {
    // @ts-ignore
    if (
      // @ts-ignore
      store.state.routeModule &&
      // @ts-ignore
      store.state.routeModule.params &&
      // @ts-ignore
      store.state.routeModule.params.service
    ) {
      // @ts-ignore
      return store.state.routeModule.params.service;
    } else {
      return "eth";
    }
  }

  get tokens() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["tokens"];
  }

  get supportedFeatures() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["supportedFeatures"];
  }

  get token() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["token"];
  }

  get relays() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["relays"];
  }

  get newPoolTokenChoices(): (networkTokenSymbol: string) => ModalChoice[] {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["newPoolTokenChoices"];
  }

  get newNetworkTokenChoices(): NetworkChoice[] {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["newNetworkTokenChoices"];
  }

  get relay() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["relay"];
  }

  get wallet() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["wallet"];
  }

  @action async init(initialChain?: string) {
    if (initialChain) {
      return new Promise((resolve, reject) => {
        this.$store
          .dispatch(`${initialChain}Bancor/init`, null, {
            root: true
          })
          .then(() => resolve())
          .catch(e => reject(e));
        const remainingChains = this.chains.filter(
          chain => !compareString(chain, initialChain)
        );
        remainingChains.forEach(chain =>
          this.$store
            .dispatch(`${chain}Bancor/init`, null, { root: true })
            .catch(e => reject(e))
        );
      });
    } else {
      return Promise.all(
        this.chains.map(chain =>
          this.$store.dispatch(`${chain}Bancor/init`, null, { root: true })
        )
      );
    }
  }

  @action async getUsdPrice() {
    const res = await Promise.all([
      fetchBinanceUsdPriceOfBnt().catch(() => {}),
      fetchOkexUsdPriceOfBnt().catch(() => {})
    ]);
    console.log(res, 'was the res..');
    const usdPrices = res.filter(Boolean) as number[];
    if (usdPrices.length == 0)
      throw new Error("Failed to find USD Price of BNT from external APIs.");
    const usdPrice = usdPrices[0];
    this.setUsdPriceOfBnt({
      price: usdPrice,
      lastChecked: new Date().getTime()
    });
    return usdPrice;
  }

  @action async fetchUsdPriceOfBnt() {
    const timeNow = new Date().getTime();
    const millisecondGap = 5000;
    const makeNetworkRequest =
      !this.usdPriceOfBnt.lastChecked ||
      this.usdPriceOfBnt.lastChecked + millisecondGap < timeNow;
    return makeNetworkRequest
      ? this.getUsdPrice()
      : (this.usdPriceOfBnt.price as number);
  }

  @mutation setUsdPriceOfBnt(usdPriceOfBnt: BntPrice) {
    this.usdPriceOfBnt = usdPriceOfBnt;
  }

  @action async convert(tx: ProposedConvertTransaction) {
    return this.dispatcher(["convert", tx]);
  }

  @action async updateFee(fee: FeeParams) {
    return this.dispatcher(["updateFee", fee]);
  }

  @action async removeRelay(symbolName: string) {
    return this.dispatcher(["removeRelay", symbolName]);
  }

  @action async updateOwner(owner: NewOwnerParams) {
    return this.dispatcher(["updateOwner", owner]);
  }

  @action async getUserBalances(symbolName: string) {
    return this.dispatcher(["getUserBalances", symbolName]);
  }

  @action async createPool(newPoolParams: any): Promise<string> {
    return this.dispatcher(["createPool", newPoolParams]);
  }

  @action async getCost(proposedTransaction: ProposedTransaction) {
    return this.dispatcher(["getCost", proposedTransaction]);
  }

  @action async getReturn(proposedTransaction: ProposedTransaction) {
    return this.dispatcher(["getReturn", proposedTransaction]);
  }

  @action async addLiquidity(addLiquidityParams: LiquidityParams) {
    return this.dispatcher(["addLiquidity", addLiquidityParams]);
  }

  @action async removeLiquidity(removeLiquidityParams: LiquidityParams) {
    return this.dispatcher(["removeLiquidity", removeLiquidityParams]);
  }

  @action async calculateOpposingDeposit(
    opposingDeposit: OpposingLiquidParams
  ) {
    return this.dispatcher(["calculateOpposingDeposit", opposingDeposit]);
  }

  @action async calculateOpposingWithdraw(
    opposingWithdraw: OpposingLiquidParams
  ) {
    return this.dispatcher(["calculateOpposingWithdraw", opposingWithdraw]);
  }

  @action async focusSymbol(symbolName: string) {
    return this.dispatcher(["focusSymbol", symbolName]);
  }

  @action async dispatcher([methodName, params]: [string, any?]) {
    return this.$store.dispatch(
      `${this.currentNetwork}Bancor/${methodName}`,
      params,
      { root: true }
    );
  }

  @action async refreshBalances(symbols: string[] = []) {
    if (vxm.wallet.isAuthenticated) {
      return this.dispatcher(["refreshBalances", symbols]);
    }
  }
}

export const bancor = BancorModule.ExtractVuexModule(BancorModule);
