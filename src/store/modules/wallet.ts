import { VuexModule, mutation, action, Module } from "vuex-class-component";
import i18n from "@/i18n";

@Module({ namespacedPath: "wallet/" })
export class WalletModule extends VuexModule {

  wallet = "eos";


  get currentNetwork() {
    return this.wallet;
  }

  get isAuthenticated() {
    // @ts-ignore
    return this.$store.rootGetters[`${this.currentNetwork}/isAuthenticated`];
  }

  @mutation setWallet(wallet: string) {
    this.wallet = wallet;
  }

  @action async dispatcher(methodName: string, params: any = null) {
    return params ? this.$store.dispatch(`${this.currentNetwork}/${methodName}`, params) : this.$store.dispatch(`${this.currentNetwork}/${methodName}`)
  }

  @action async tx(actions: any[]) {
    return this.dispatcher('tx', actions);
  }

  @action async initLogin() {
    return this.dispatcher("initLogin");
  }

  @action async logout() {
    return this.dispatcher("logout");
  }
}

export const wallet = WalletModule.ExtractVuexModule(WalletModule);
