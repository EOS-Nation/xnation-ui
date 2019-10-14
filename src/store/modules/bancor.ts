import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from 'vuex-class-component'
import { vxm } from '@/store'
import apiBancor from '@/api/bancor'
import * as bancorx from '@/assets/_ts/bancorx'
import { TokenPrice } from '@/types/bancor'

@Module({ namespacedPath: 'bancor/' })
export class BancorModule extends VuexModule {
  eosTokens: TokenPrice[] = []
  eosRelays: any[] = []
  @getter initLoad = true
  @getter loadingEosTokens = false
  @getter loadingEosRelays = false
  @getter tokenSort = 'v24h'
  @getter tokenSortDir = 'desc'
  @getter relaySort = 'v24h'
  @getter relaySortDir = 'desc'

  @action async getEosTokens() {
    this.setLoadingEosTokens(true)
    const endpoint = 'currencies/tokens'
    const params = {
      limit: 50,
      skip: 0,
      fromCurrencyCode: 'USD',
      includeTotal: true,
      orderBy: 'volume24h',
      sortOrder: 'desc',
      blockchainType: 'eos'
    }
    try {
      const eos = await apiBancor(endpoint, params)
      this.setEosTokens(eos.data.data.page)
    } catch (e) {
      console.log(e)
    } finally {
      this.setLoadingEosTokens(false)
    }
    return
  }

  @action async getEosRelays() {
    this.setLoadingEosRelays(true)
    const endpoint = 'currencies'
    const params = {
      stage: 'traded',
      name: 'bnt',
      skip: 0,
      limit: 100,
      excludeSubTypes: 'bounty',
      excludeEosRelays: false
    }
    let rows: any[] = []
    let more = true
    while (more) {
      const resp = await apiBancor(endpoint, params)
      rows = rows.concat(resp.data.data.currencies.page)
      if (resp.data.data.currencies.page.length === 100) {
        params.skip += params.limit
      } else more = false
    }
    this.setEosRelays('reset')
    for (const t of this.eosTokens) {
      const relay = bancorx.relays[t.code]
      const reserve = bancorx.reserveTokens[t.code]
      const relayPrice = rows.find((r: any) => r.code === reserve.symbol)
      const ratio = await vxm.eosTransit.accessContext.eosRpc.get_table_rows({
        code: relay.account,
        table: 'reserves',
        scope: relay.account,
        limit: 2
      })
      const fee = await vxm.eosTransit.accessContext.eosRpc.get_table_rows({
        code: relay.account,
        table: 'settings',
        scope: relay.account,
        limit: 1
      })
      this.setEosRelays({
        symbol: reserve.symbol,
        name: t.name,
        img:
          'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
          relayPrice.primaryCommunityImageName,
        ratio1: ratio.rows[0].ratio / 10000,
        ratio2: ratio.rows[1].ratio / 10000,
        fee: fee.rows[0].fee / 10000,
        v24h: t.volume24h.USD,
        contract: relay.account,
        liqDepth: t.liquidityDepth,
        tokenPrice: t,
        relay: relay,
        reserve: reserve,
        relayPrice: relayPrice
      })
    }
    this.setLoadingEosRelays(false)
  }

  @mutation setEosTokens(t: TokenPrice[]) {
    this.eosTokens = t
  }
  @mutation setEosRelays(r: any) {
    if (r === 'reset') this.eosRelays = []
    else this.eosRelays.push(r)
  }
  @mutation setInitLoad(b: boolean) {
    this.loadingEosTokens = b
  }
  @mutation setLoadingEosTokens(b: boolean) {
    this.loadingEosTokens = b
  }
  @mutation setLoadingEosRelays(b: boolean) {
    this.loadingEosRelays = b
  }
  @mutation setTokenSort(s: string) {
    if (s === this.tokenSort) {
      this.tokenSortDir = this.tokenSortDir === 'asc' ? 'desc' : 'asc'
    }
    this.tokenSort = s
  }
  @mutation setRelaySort(s: string) {
    if (s === this.relaySort) {
      this.relaySortDir = this.relaySortDir === 'asc' ? 'desc' : 'asc'
    }
    this.relaySort = s
  }
}

export const bancor = BancorModule.ExtractVuexModule(BancorModule)
