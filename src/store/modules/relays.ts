import {
    VuexModule,
    mutation,
    action,
    getter,
    Module
  } from "vuex-class-component";
  import { tableApi } from "@/api/TableWrapper";
  import { Asset, Symbol } from "eos-common";
  import { getBalance } from "@/api/helpers";
  
 
  @Module({ namespacedPath: "relays/" })
  export class RelaysModule extends VuexModule {
    @getter relays: string[] = [""];
  
    @action async fetchRelays(symbol: string) {
      console.log("f");
    }
  
  }
  
  export const relays = RelaysModule.ExtractVuexModule(RelaysModule);
  