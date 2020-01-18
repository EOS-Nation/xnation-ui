import { VuexModule, mutation, action, Module } from "vuex-class-component";
import {
  SimpleToken,
  SimpleTokenWithMarketData,
  ProposedTransaction,
  ProposedConvertTransaction
} from "@/types/bancor";
import { vxm } from "@/store";

@Module({ namespacedPath: "bancor/" })
export class BancorModule extends VuexModule {
  chains = ["eos", "eth"];

  get currentNetwork() {
    return vxm.wallet.currentNetwork;
  }

  get tokens() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Bancor`]["tokens"];
  }

  get token() {
    return this.$store["rootGetters"][`${this.currentNetwork}Bancor/token`];
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

  @action async dispatcher([methodName, params]: any) {
    return this.$store.dispatch(
      `${this.currentNetwork}Bancor/${methodName}`,
      params,
      { root: true }
    );
  }

  @action async fetchBalances() {
    if (vxm.wallet.isAuthenticated) {
      return this.dispatcher(['fetchBalances'])
    }
  }

}

export const bancor = BancorModule.ExtractVuexModule(BancorModule);
