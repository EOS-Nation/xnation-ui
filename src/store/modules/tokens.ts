import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from 'vuex-class-component'
import { TokenPrice } from '@/types/bancor'
import { bancorApi } from '@/api/bancor'

import * as bancorx from '@/assets/_ts/bancorx'

@Module({ namespacedPath: 'tokens/' })
export class TokensModule extends VuexModule {
  eosTokens: TokenPrice[] = []
  ethTokens: TokenPrice[] = []
  loadingTokens: boolean = false
  ethPrice: any

  get tokenDb() {

    return this.eosTokens.map(t => ({
      symbol: t.code,
      tokenPrice: t,
      relay: bancorx.relays[t.code],
      reserve: bancorx.reserveTokens[t.code]
    }))

  }

  @action async getEthPrice() {
    const eth = await bancorApi.getRate('ETH', 'USD');
    this.setEth(eth)
  }

  // actions
  @action async getTokens() {
    return bancorApi.getTokens()
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
