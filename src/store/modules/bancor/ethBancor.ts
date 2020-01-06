import { VuexModule, mutation, action, Module } from "vuex-class-component";
import {
  SimpleToken,
  SimpleTokenWithMarketData,
  ProposedTransaction,
  ProposedConvertTransaction
} from "@/types/bancor";

@Module({ namespacedPath: "ethBancor/" })
export class EthBancorModule extends VuexModule {
  tokensList: any[] = [];

  get tokens() {
    return "";
  }

  get token() {
    return "";
  }

  @action async init() {
    console.log("Init was called on ethBancor");
  }

  @action async convert(tx: ProposedConvertTransaction) {}

  @action async getCost(proposedTransaction: ProposedTransaction) {}

  @action async getReturn(proposedTransaction: ProposedTransaction) {}
}

export const ethBancor = EthBancorModule.ExtractVuexModule(EthBancorModule);
