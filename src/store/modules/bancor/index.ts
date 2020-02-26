import { VuexModule, action, Module } from "vuex-class-component";
import {
  ProposedTransaction,
  ProposedConvertTransaction
} from "@/types/bancor";
import { vxm } from "@/store";
import { store } from "../../../store";

@Module({ namespacedPath: "bancor/" })
export class BancorModule extends VuexModule {
  chains = ["eos", "eth", "usds"];

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

  get token() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["token"];
  }

  get wallet() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["wallet"];
  }

  @action async init() {
    return Promise.all(
      this.chains.map(chain =>
        this.$store.dispatch(`${chain}Bancor/init`, null, { root: true })
      )
    );
  }

  @action async convert(tx: ProposedConvertTransaction) {
    return this.dispatcher(["convert", tx]);
  }

  @action async getCost(proposedTransaction: ProposedTransaction) {
    return this.dispatcher(["getCost", proposedTransaction]);
  }

  @action async getReturn(proposedTransaction: ProposedTransaction) {
    return this.dispatcher(["getReturn", proposedTransaction]);
  }

  @action async focusSymbol(symbolName: string) {
    return this.dispatcher(["focusSymbol", symbolName]);
  }

  @action async dispatcher([methodName, params]: [string, any]) {
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
