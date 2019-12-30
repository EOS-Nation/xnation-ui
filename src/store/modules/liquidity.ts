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
  direction: 'from' | 'to' = 'from'
  relaySelect = true
  fromToken: TokenInfo = bancorx.tokenDb[0]
  toToken: TokenInfo = bancorx.tokenDb[1]
  amount = ''
  minReturn = ''
  rateLoading = false
  amountBnt = ''

  @mutation setRelaySelect(b: boolean) {
    this.relaySelect = b
  }
  @mutation setFromToken(token: TokenInfo) {
    this.fromToken = token
  }
  @mutation setToToken(token: TokenInfo) {
    this.toToken = token
  }
  @mutation setDirection(direction: 'from' | 'to') {
    this.direction = direction
  }
  @mutation setAmount(amount: string) {
    this.amount = amount
  }
  @mutation setAmountBnt(amount: string) {
    this.amountBnt = amount
  }
  @mutation setMinReturn(amount: string) {
    this.minReturn = amount
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

  @mutation setRelayTokens(r: any[]) {
    this.relayTokens = r
  }
  @mutation setRelayDB(r: any[]) {
    this.relayDB = r
  }
}

export const liquidity = LiquidityModule.ExtractVuexModule(LiquidityModule)
