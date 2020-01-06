import { VuexModule, mutation, action, Module } from "vuex-class-component";
import { SimpleToken, SimpleTokenWithMarketData, ProposedTransaction, ProposedConvertTransaction} from "@/types/bancor";


@Module({ namespacedPath: "bancor/" })
export class BancorModule extends VuexModule {

  get tokens() {
    return ''
  }

  get token() {
    return ''
  }
  
  @action async init() {
    console.log('Init was called on bancor');
  }

  @action async convert(tx: ProposedConvertTransaction) {

  }

  @action async getCost(proposedTransaction: ProposedTransaction) {
  
  }

  @action async getReturn(proposedTransaction: ProposedTransaction) {
      
  }

}

export const bancor = BancorModule.ExtractVuexModule(BancorModule);
