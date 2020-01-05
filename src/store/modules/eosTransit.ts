import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from 'vuex-class-component'
import {
  initAccessContext,
  WalletProvider,
  Wallet,
  WalletState
} from 'eos-transit'
import scatter from 'eos-transit-scatter-provider'
import lynx from 'eos-transit-lynx-provider'
import ledger from 'eos-transit-ledger-provider'
import tp from 'eos-transit-tokenpocket-provider'
import meetone from 'eos-transit-meetone-provider'
import whalevault from 'eos-transit-whalevault-provider'
import keycat from 'eos-transit-keycat-provider'
import { vxm } from '@/store'
// import simpleos from 'eos-transit-simpleos-provider'
// import portisProvider from 'eos-transit-portis-provider'

@Module({ namespacedPath: 'eosTransit/' })
export class EosTransitModule extends VuexModule {
  @getter accessContext = initAccessContext({
    appName: 'Bancor by EOS Nation',
    network: {
      host: 'eos.eosn.io',
      port: 443,
      protocol: 'https',
      chainId:
        'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
    },
    walletProviders: [
      scatter(),
      lynx(),
      ledger(),
      tp(),
      meetone(),
      whalevault(),
      keycat()
    ]
  })

  @getter
  walletProviders: WalletProvider[] = this.accessContext.getWalletProviders()

  selectedProvider: WalletProvider | '' = ''

  wallet: Wallet | false = false
  walletState: WalletState | false = false

  get loginStatus() {
    const login = ['Login', 'arrow-circle-right', false]
    if (!this.wallet && !this.walletState) return login
    else if (this.walletState && this.walletState.authenticating)
      return ['Authenticating', 'spinner', true]
    else if (this.walletState && this.walletState.connecting)
      return ['Connecting', 'spinner', true]
    else if (this.walletState && this.walletState.accountFetching)
      return ['Fetching', 'spinner', true]
    else if (this.wallet && this.wallet.auth) {
      return [this.wallet.auth.accountName, 'power-off', false]
    } else return login
  }

  get isAuthenticated(): string | undefined {
    // @ts-ignore
    return this.wallet && this.wallet.auth && this.wallet.auth.accountName
  }
  
  @action async tx(actions: any) {
    // @ts-ignore
    return this.wallet.eosApi
        .transact(
          {
            actions
          },
          {
            broadcast: true,
            blocksBehind: 3,
            expireSeconds: 60
          }
        )
  }

  @action async initLogin(provider: WalletProvider) {
    this.setProvider(provider)

    const wallet = this.accessContext.initWallet(provider)

    wallet.subscribe(walletState => {
      if (walletState) this.setWalletState(walletState)
    })

    try {
      await wallet.connect()

      // Now that we are connected, lets authenticate (in case of a Scatter app,
      // it does it right after connection, so this is more for the state tracking
      // and for WAL to fetch the EOS account data for us)
      try {
        await wallet.login()
        // wallet.authenticated === true
        this.setWallet(wallet)
        if (wallet && wallet.auth)
          await vxm.wallet.getTokenBalances(wallet.auth.accountName)
        // Now that we have a wallet that is connected, logged in and have account data available,
        // you can use it to sign transactions using the `eosjs` API instance that is automatically
        // created and maintained by the wallet.

        // set autologin
        localStorage.setItem('autoLogin', provider.id)
      } catch (e) {
        console.log('auth error')
        throw e
      }
    } catch (e) {
      console.log('connection error')
      throw e
    }
  }

  @action async logout() {
    if (this.wallet) {
      this.wallet.logout()
      this.setWallet(false)
      this.setWalletState(false)
      localStorage.removeItem('autoLogin')
      vxm.wallet.setTokenBalances([])
    }
  }

  // mutations
  @mutation setProvider(provider: WalletProvider) {
    this.selectedProvider = provider
  }

  @mutation setWallet(wallet: Wallet | false) {
    this.wallet = wallet
  }

  @mutation setWalletState(state: WalletState | false) {
    this.walletState = state
  }
}
export const eosTransit = EosTransitModule.ExtractVuexModule(EosTransitModule)
