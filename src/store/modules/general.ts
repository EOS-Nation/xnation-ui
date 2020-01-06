import {
  VuexModule,
  mutation,
  getter,
  Module
} from 'vuex-class-component'
import i18n from '@/i18n'

@Module({ namespacedPath: 'general/' })
export class GeneralModule extends VuexModule {
  @getter language: string = 'en'

  @mutation setLanguage(lang?: string) {
    if (lang) {
      this.language = i18n.locale = lang
      localStorage.setItem('language', lang)
    } else {
      let userLang: string | null = localStorage.getItem('language')
      if (userLang) {
        this.language = i18n.locale = userLang
      } else {
        let browserLang = navigator.language.split('-')[0]
        this.language = i18n.locale = browserLang
        localStorage.setItem('language', browserLang)
      }
    }
  }
}

export const general = GeneralModule.ExtractVuexModule(GeneralModule)
