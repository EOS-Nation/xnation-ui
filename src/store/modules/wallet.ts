import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from 'vuex-class-component'
import { vxm } from '@/store'
import * as bancorx from '@/assets/_ts/bancorx'
import axios from 'axios'

const hyperion = axios.create({
  baseURL: 'https://mainnet.eosn.io/v2/state/'
})

@Module({ namespacedPath: 'wallet/' })
export class walletModule extends VuexModule {
  @getter tokenBalances: any[] = []

  @action async getTokenBalances(a: string) {
    let resp = await hyperion.get('get_tokens', {
      params: { account: a }
    })
    this.setTokenBalances(resp.data.tokens)
    return resp.data.tokens
  }

  @mutation setTokenBalances(data: any[]) {
    this.tokenBalances = data
  }

  @action async availableBalance(data: any) {
    let balance = '0'
    const tokenContract = await bancorx.relays[data.symbol]
    const reserveContract = await bancorx.reserveTokens[data.symbol]
    let contract = tokenContract.code
    if (data.reserve) contract = reserveContract.code
    await vxm.eosTransit.accessContext.eosRpc
      .get_currency_balance(contract, data.account)
      .then(result => {
        if (parseFloat(result[0])) {
          balance = result[0].split(' ')[0]
          // const symbol = result[0].split(' ')[1]
        }
      })
      .catch(error => {
        console.log(error)
      })
    return balance
  }
}
export const wallet = walletModule.ExtractVuexModule(walletModule)
