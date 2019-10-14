import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from 'vuex-class-component'
import { TokenPrice } from '@/types/bancor'

@Module({ namespacedPath: 'transfer/' })
export class TransferModule extends VuexModule {
  @getter transferToken: TokenPrice = {
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
  @getter transferTo: string = ''
  @getter amount: string = ''
  @getter memo: string = ''

  @mutation setToken(t: TokenPrice) {
    this.transferToken = t
    this.amount = ''
  }
  @mutation setRecipient(r: string) {
    this.transferTo = r
  }
  @mutation setAmount(a: string) {
    this.amount = a
  }
  @mutation setMemo(m: string) {
    this.memo = m
  }
}

export const transfer = TransferModule.ExtractVuexModule(TransferModule)
