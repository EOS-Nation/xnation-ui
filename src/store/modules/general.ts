import { createModule, mutation } from "vuex-class-component";
import i18n from "@/i18n";

const VuexModule = createModule({
  strict: false
});

export class GeneralModule extends VuexModule.With({ namespaced: "general/" }) {
  language: string = "en";

  @mutation setLanguage(lang?: string) {
    if (lang) {
      this.language = i18n.locale = lang;
      localStorage.setItem("language", lang);
    } else {
      const userLang: string | null = localStorage.getItem("language");
      if (userLang) {
        this.language = i18n.locale = userLang;
      } else {
        const browserLang = navigator.language.split("-")[0];
        this.language = i18n.locale = browserLang;
        localStorage.setItem("language", browserLang);
      }
    }
  }
}
