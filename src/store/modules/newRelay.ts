import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from "vuex-class-component";

@Module({ namespacedPath: "newRelay/" })
export class NewRelayModule extends VuexModule {
  @getter relay1: string = "";
  @getter relay2: string = "";

  @action async fetchRelays(symbol: string) {
    console.log('f')
  }

}

export const newRelay = NewRelayModule.ExtractVuexModule(NewRelayModule);
