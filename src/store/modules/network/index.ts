import { VuexModule, action, Module } from "vuex-class-component";
import {
  GetBalanceParam,
  TokenBalanceReturn,
  TransferParam
} from "@/types/bancor";
import { vxm } from "@/store";
import { store } from "../../../store";

@Module({ namespacedPath: "network/" })
export class NetworkModule extends VuexModule {
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

  get balances() {
    console.log(this.currentNetwork, 'is the current network on balances');
    // @ts-ignore
    return vxm[`${this.currentNetwork}Network`]["balances"];
  }

  get balance() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Network`]["balance"];
  }

  get networkId() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Network`]["networkId"];
  }

  get protocol() {
    // @ts-ignore
    return vxm[`${this.currentNetwork}Network`]["protocol"];
  }

  @action async transfer(params: TransferParam): Promise<void> {
    return this.dispatcher(["transfer", params]);
  }

  @action async getBalances(
    params: GetBalanceParam
  ): Promise<TokenBalanceReturn[]> {
    return this.dispatcher(["getBalances", params]);
  }

  @action async dispatcher([methodName, params]: [string, any?]) {
    return this.$store.dispatch(
      `${this.currentNetwork}Network/${methodName}`,
      params,
      { root: true }
    );
  }
}

export const network = NetworkModule.ExtractVuexModule(NetworkModule);
