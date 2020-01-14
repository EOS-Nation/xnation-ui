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
    return this.$store.rootGetters[`${this.currentNetwork}Bancor/tokens`]
  }

  get token() {
    return "";
  }

  @action async init() {
    return Promise.all(
      this.chains.map(chain =>
        this.$store.dispatch(`${chain}Bancor/init`, null, { root: true })
      )
    );
  }

  @action async convert(tx: ProposedConvertTransaction) {}

  @action async getCost(proposedTransaction: ProposedTransaction) {}

  @action async getReturn(proposedTransaction: ProposedTransaction) {}

  @action async dispatcher(methodName: string, params: any = null) {
    return params
      ? this.$store.dispatch(`${this.currentNetwork}/${methodName}`, params)
      : this.$store.dispatch(`${this.currentNetwork}/${methodName}`);
  }
}

export const bancor = BancorModule.ExtractVuexModule(BancorModule);
