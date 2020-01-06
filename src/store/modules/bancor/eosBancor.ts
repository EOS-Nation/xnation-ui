import { VuexModule, action, Module } from "vuex-class-component";
import { SimpleToken, SimpleTokenWithMarketData, ProposedTransaction, ProposedConvertTransaction} from "@/types/bancor";

@Module({ namespacedPath: "eosBancor/" })
export class EosBancorModule extends VuexModule {

  tokensList: any[] = []

  get tokens() {
    return ''
  }

  get token() {
    return ''
  }
  
  @action async init() {
    console.log('Init was called on eosBancor');
  }

  @action async convert(tx: ProposedConvertTransaction) {}

  @action async getCost(proposedTransaction: ProposedTransaction) {}

  @action async getReturn(proposedTransaction: ProposedTransaction) {}

}

export const eosBancor = EosBancorModule.ExtractVuexModule(EosBancorModule);
