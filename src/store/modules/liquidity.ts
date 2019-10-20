import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from 'vuex-class-component'
import * as bancorx from '@/assets/_ts/bancorx'
import { TokenInfo } from '@/assets/_ts/bancorx'

@Module({ namespacedPath: 'liquidity/' })
export class LiquidityModule extends VuexModule {
  @getter direction: 'from' | 'to' = 'from'
  @getter relaySelect = true
  @getter fromToken: TokenInfo = bancorx.tokenDb[0]
  @getter toToken: TokenInfo = bancorx.tokenDb[1]
  @getter amount = ''
  @getter minReturn = ''
  @getter rateLoading = false
  @getter amountBnt = ''

  @mutation setRelaySelect(b: boolean) {
    this.relaySelect = b
  }
  @mutation setFromToken(t: TokenInfo) {
    this.fromToken = t
  }
  @mutation setToToken(t: TokenInfo) {
    this.toToken = t
  }
  @mutation setDirection(d: 'from' | 'to') {
    this.direction = d
  }
  @mutation setAmount(a: string) {
    this.amount = a
  }
  @mutation setAmountBnt(a: string) {
    this.amountBnt = a
  }
  @mutation setMinReturn(a: string) {
    this.minReturn = a
  }
  @mutation setRateLoading(b: boolean) {
    this.rateLoading = b
  }
  @mutation swapSelection() {
    let newTo = this.fromToken
    this.fromToken = this.toToken
    this.toToken = newTo
  }
  @action async calcMinReturn() {
    this.setRateLoading(true)
    if (this.amount === '') {
      this.setRateLoading(false)
      return
    }
    const minReturn = await bancorx.calcRate(
      this.fromToken.symbol,
      this.toToken.symbol,
      this.amount
    )
    this.setMinReturn(minReturn)
    this.setRateLoading(false)
  }

  @action async calcDualConversion() {
    this.setRateLoading(true)
    if (this.amount === '') {
      this.setRateLoading(false)
      return
    }
    const calcResult = await bancorx.calcDualLiquidityRate(
      'add',
      this.toToken.symbol,
      this.amount
    )
    this.setMinReturn(calcResult.to)
    this.setAmountBnt(calcResult.bnt)
    this.setRateLoading(false)
  }
  @action async calcDualInverse() {
    this.setRateLoading(true)
    if (this.minReturn === '') {
      this.setRateLoading(false)
      return
    }
    const calcResult = await bancorx.calcDualLiquidityRate(
      'add',
      this.toToken.symbol,
      this.minReturn,
      false,
      true
    )
    this.setAmount(calcResult.from)
    this.setAmountBnt(calcResult.bnt)
    this.setRateLoading(false)
  }
  @action async calcDualBntConversion() {
    this.setRateLoading(true)
    if (this.amountBnt === '') {
      this.setRateLoading(false)
      return
    }
    const calcResult = await bancorx.calcDualLiquidityRate(
      'add',
      this.toToken.symbol,
      this.amountBnt,
      true
    )

    this.setMinReturn(calcResult.to)
    this.setAmount(calcResult.from)
    this.setRateLoading(false)
  }

  @action async calcDualRemoveConversion() {
    this.setRateLoading(true)
    if (this.amount === '') {
      this.setRateLoading(false)
      return
    }
    const calcResult = await bancorx.calcDualLiquidityRate(
      'remove',
      this.fromToken.symbol,
      this.amount
    )
    this.setMinReturn(calcResult.to)
    this.setAmountBnt(calcResult.bnt)
    this.setRateLoading(false)
  }
  @action async calcDualRemoveInverse() {
    this.setRateLoading(true)
    if (this.minReturn === '') {
      this.setRateLoading(false)
      return
    }
    const calcResult = await bancorx.calcDualLiquidityRate(
      'remove',
      this.fromToken.symbol,
      this.minReturn,
      false,
      true
    )
    this.setAmount(calcResult.from)
    this.setAmountBnt(calcResult.bnt)
    this.setRateLoading(false)
  }
  @action async calcDualRemoveBntConversion() {
    this.setRateLoading(true)
    if (this.amountBnt === '') {
      this.setRateLoading(false)
      return
    }
    const calcResult = await bancorx.calcDualLiquidityRate(
      'remove',
      this.fromToken.symbol,
      this.amountBnt,
      true,
      true
    )

    this.setMinReturn(calcResult.to)
    this.setAmount(calcResult.from)
    this.setRateLoading(false)
  }

  @action async calcDualRemove() {
    this.setRateLoading(true)
    const halfAmount = (parseFloat(this.amount) / 2).toString()
    if (this.amount === '') {
      this.setRateLoading(false)
      return
    }
    const minReturn = await bancorx.calcRate(
      this.fromToken.symbol,
      this.toToken.symbol,
      halfAmount
    )
    this.setMinReturn(minReturn)
    const amountBnt = await bancorx.calcRate(
      this.fromToken.symbol,
      'BNT',
      halfAmount
    )
    this.setAmountBnt(amountBnt)
    this.setRateLoading(false)
  }
  @action async calcAmount() {
    this.setRateLoading(true)
    if (this.minReturn === '') {
      this.setRateLoading(false)
      return
    }
    const amount = await bancorx.calcRate(
      this.fromToken.symbol,
      this.toToken.symbol,
      this.minReturn,
      true
    )
    this.setAmount(amount)
    this.setRateLoading(false)
  }

  @getter relayTokens: any[] = []
  @getter relayDB: any[] = []

  // Not in use? 
  // @action async loadRelayTokens() {
  //   let params = {
  //     stage: 'traded',
  //     name: 'bnt',
  //     skip: 0,
  //     limit: 100,
  //     excludeSubTypes: 'bounty',
  //     excludeEosRelays: false
  //   }
  //   const endpoint = 'currencies'
  //   let rows: any = []
  //   let more = true
  //   try {
  //     while (more) {
  //       const resp = await apiBancor(endpoint, params)
  //       rows = rows.concat(resp.data.data.currencies.page)
  //       if (resp.data.data.currencies.page.length === 100) {
  //         params.skip += params.limit
  //       } else more = false
  //     }
  //   } catch (e) {
  //     console.log(e)
  //   }
  //   const eosTokens = await vxm.tokens.getTokens()
  //   let relays = []
  //   for (const t of eosTokens) {
  //     const relay = bancorx.getTokenInfo(t.code)
  //     const reserve = bancorx.reserveTokens[t.code]
  //     const relayPrice = rows.find((r: any) => r.code === reserve.symbol)
  //     relays.push({
  //       symbol: t.code,
  //       name: t.name,
  //       tokenPrice: t,
  //       relay: relay,
  //       reserve: reserve,
  //       relayPrice: relayPrice
  //     })
  //   }
  //   this.setRelayDB(relays)
  //   this.setRelayTokens(rows)
  //   return rows
  // }

  @mutation setRelayTokens(r: any[]) {
    this.relayTokens = r
  }
  @mutation setRelayDB(r: any[]) {
    this.relayDB = r
  }
}

export const liquidity = LiquidityModule.ExtractVuexModule(LiquidityModule)
