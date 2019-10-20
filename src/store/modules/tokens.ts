import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from 'vuex-class-component'
import { TokenPrice } from '@/types/bancor'
import { baseApi } from '@/api/BaseApi'

import * as bancorx from '@/assets/_ts/bancorx'

@Module({ namespacedPath: 'tokens/' })
export class TokensModule extends VuexModule {
  @getter eosTokens: TokenPrice[] = []
  @getter ethTokens: TokenPrice[] = []
  @getter loadingTokens: boolean = false
  @getter ethPrice: any

  get tokenDb() {
    let db = []
    for (const t of this.eosTokens) {
      db.push({
        symbol: t.code,
        tokenPrice: t,
        relay: bancorx.relays[t.code],
        reserve: bancorx.reserveTokens[t.code]
      })
    }
    return db
  }

  @action async getEthPrice() {
    let eth: any
    try {
      eth = await baseApi.getRate('ETH', 'USD');
    } catch (e) {
      console.log(e)
    }
    this.setEth(eth)
  }

  // actions
  @action async getTokens() {
    let eos: any
    let eth: any
    try {
      eos = await baseApi.getTokens()
    } catch (e) {
      console.log(e)
    }

    return eos
  }

  // mutations
  @mutation setTokens(t: { eos: TokenPrice[]; eth: TokenPrice[] }) {
    this.eosTokens = t.eos
    this.ethTokens = t.eth
  }
  @mutation setLoadingTokens(b: boolean) {
    this.loadingTokens = b
  }
  @mutation setEth(eth: any) {
    this.ethPrice = eth;
  }
}
export const tokens = TokensModule.ExtractVuexModule(TokensModule)
