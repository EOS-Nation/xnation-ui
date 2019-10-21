import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from 'vuex-class-component'
import { TokenPrice } from '@/types/bancor'
import * as bancorx from '@/assets/_ts/bancorx'

@Module({ namespacedPath: 'convert/' })
export class ConvertModule extends VuexModule {
  @getter convertFrom: TokenPrice = {
    id: '5a1eb3753203d200012b8b75',
    code: 'EOS',
    name: 'Eos',
    primaryCommunityId: '5a1eb21531b0890001c2b90a',
    primaryCommunityImageName: '359b8290-0767-11e8-8744-97748b632eaf.png',
    liquidityDepth: 1224.8855828464077,
    price: 4.139585,
    change24h: -2.8225642972364438,
    volume24h: {
      ETH: 197.39146008054428,
      USD: 43846.245816,
      EUR: 39207.419177
    },
    priceHistory: [[167, 56.98408]]
  }
  @getter convertTo: TokenPrice = {
    id: '5ca5e3022a656a3cfa349f60',
    code: 'DAPP',
    name: 'LiquidApps',
    primaryCommunityId: '5bed51a5e6470a72a564b844',
    primaryCommunityImageName: '2ec8fd20-5915-11e9-a884-d9a39f6dd542.jpeg',
    liquidityDepth: 15607.40020814439,
    price: 218.27,
    change24h: -2.1649484536082473,
    volume24h: {
      ETH: 702.845739586357,
      USD: 155038.67165,
      EUR: 138625.419789
    },
    priceHistory: [[167, 41.9279]]
  }

  @getter convertDirection: 'from' | 'to' = 'from'
  @getter amount: string = ''
  @getter minReturn: string = ''
  @getter debouncedState: string = 'idle'

  // actions
  @action async initConversion(direction: 'from' | 'to') {
    if ((direction === 'from' && !this.amount) || (direction === 'to' && !this.minReturn)) {
      this.setDebouncedState('idle')
      return
    }

    if (direction === 'from') {
      const minReturn = await bancorx.minReturnFormula(
        this.convertFrom.code,
        this.convertTo.code,
        this.amount
      )
      this.setAmount({ d: 'to', amount: minReturn })
    } else {
      const minReturn = await bancorx.minReturnFormula(
        this.convertTo.code,
        this.convertFrom.code,
        this.minReturn
      )
      this.setAmount({ d: 'from', amount: minReturn })
    }
    this.setDebouncedState('idle')
    return
  }

  // Methods
  @mutation swapSelection() {
    let newTo = this.convertFrom
    this.convertFrom = this.convertTo
    this.convertTo = newTo
  }
  @mutation setDirection(direction: 'from' | 'to') {
    this.convertDirection = direction
  }

  @mutation setToken(p: { t: TokenPrice; d: 'from' | 'to' }) {
    if (p.d === 'from') this.convertFrom = p.t
    else this.convertTo = p.t
    this.amount = ''
    this.minReturn = ''
  }
  @mutation setAmount(p: { d: 'from' | 'to'; amount: string }) {
    if (p.d === 'from') this.amount = p.amount
    else this.minReturn = p.amount
  }
  @mutation setDebouncedState(s: string) {
    this.debouncedState = s
  }
}
export const convert = ConvertModule.ExtractVuexModule(ConvertModule)
