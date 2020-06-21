import { createModule, action, mutation } from "vuex-class-component";
import {
  ProposedConvertTransaction,
  LiquidityParams,
  OpposingLiquidParams,
  ModalChoice,
  NetworkChoice,
  FeeParams,
  NewOwnerParams,
  HistoryRow,
  ProposedToTransaction,
  ProposedFromTransaction
} from "@/types/bancor";
import { vxm } from "@/store";
import { store } from "../../../store";
import { compareString, fetchUsdPriceOfBntViaRelay } from "@/api/helpers";
import { fetchBinanceUsdPriceOfBnt } from "@/api/helpers";
import wait from "waait";

interface BntPrice {
  price: null | number;
  lastChecked: number;
}

const VuexModule = createModule({
  strict: false
});

export class BancorModule extends VuexModule.With({
  namespaced: "bancor/"
}) {
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
      return "eos";
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
    try {
      const reverse = (promise: any) =>
        new Promise((resolve, reject) =>
          Promise.resolve(promise).then(reject, resolve)
        );
      const any = (arr: any[]) => reverse(Promise.all(arr.map(reverse)));
      const res = await any([
        fetchBinanceUsdPriceOfBnt(),
        new Promise(resolve => {
          wait(500).then(() => resolve(fetchUsdPriceOfBntViaRelay()));
        })
      ]);
      console.log(res, "was res!");
      const usdPrice = res as number;
      this.setUsdPriceOfBnt({
        price: usdPrice,
        lastChecked: new Date().getTime()
      });
      return usdPrice;
    } catch (e) {
      throw new Error(
        `Failed to find USD Price of BNT from External API & Relay ${e.message}`
      );
    }
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

  @action async fetchHistoryData(relayId: string): Promise<HistoryRow[]> {
    return this.dispatcher(["fetchHistoryData", relayId]);
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

  @action async getCost(proposedTransaction: ProposedToTransaction) {
    return this.dispatcher(["getCost", proposedTransaction]);
  }

  @action async getReturn(proposedTransaction: ProposedFromTransaction) {
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
