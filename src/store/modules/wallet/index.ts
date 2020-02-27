import { VuexModule, action, Module } from "vuex-class-component";
import { vxm } from "@/store/index";
import { store } from "../../../store";

@Module({ namespacedPath: "wallet/" })
export class WalletModule extends VuexModule {

  get currentWallet() {
    return vxm.bancor.wallet;
  }

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

  get isAuthenticated() {
    // @ts-ignore
    return vxm[`${vxm.bancor.wallet}Wallet`].isAuthenticated;
  }

  @action async dispatcher(methodName: string, params: any = null) {
    console.log(`to dispatch: ${this.currentWallet}/${methodName}`);
    return params
      ? this.$store.dispatch(`${this.currentWallet}/${methodName}`, params)
      : this.$store.dispatch(`${this.currentWallet}/${methodName}`);
  }

  @action async tx(actions: any[]) {
    return this.dispatcher("tx", actions);
  }

  @action async initLogin() {
    return this.dispatcher("initLogin");
  }

  @action async logout() {
    return this.dispatcher("logout");
  }
}

export const wallet = WalletModule.ExtractVuexModule(WalletModule);
