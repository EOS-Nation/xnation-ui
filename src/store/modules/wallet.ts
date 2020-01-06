import { VuexModule, mutation, action, Module } from "vuex-class-component";
import i18n from "@/i18n";

@Module({ namespacedPath: "wallet/" })
export class WalletModule extends VuexModule {
  @action async tx(x: any) {
    console.log(x, "came through on wallet.ts");
  }
}

export const wallet = WalletModule.ExtractVuexModule(WalletModule);
