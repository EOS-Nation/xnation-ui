import Vue from 'vue'
import Router from 'vue-router'
import Wallet from '@/views/Wallet.vue'
import WalletAccount from '@/views/WalletAccount.vue'
import Tokens from '@/views/Tokens.vue'
import Relays from '@/views/Relays.vue'
import HeroConvert from '@/components/hero/sub/HeroConvert.vue'
import HeroTransfer from '@/components/hero/sub/HeroTransfer.vue'
import HeroRelay from '@/components/hero/sub/HeroRelay.vue'
import HeroCreate from '@/components/hero/sub/HeroCreate.vue'
import HeroLiquidity from '@/components/hero/sub/HeroLiquidity.vue'
import Navigation from '@/components/layout/Navigation.vue'

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  linkExactActiveClass: 'active',
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (savedPosition) {
          resolve(savedPosition)
        } else {
          resolve({ x: 0, y: 0 })
        }
      }, 500)
    })
  },
  routes: [
    {
      path: '*',
      redirect: '/'
    },
    {
      path: '/',
      name: 'Tokens',
      components: {
        Nav: Navigation,
        default: Tokens,
        Hero: HeroConvert
      }
    },
    {
      path: '/transfer/:symbolName',
      name: 'Transfer',
      components: {
        Nav: Navigation,
        default: Tokens,
        Hero: HeroTransfer
      },
      props: true
    },
    {
      path: '/relays',
      name: 'Relays',
      components: {
        Nav: Navigation,
        default: Relays,
        Hero: HeroRelay
      }
    },
    {
      path: '/relay/:account',
      name: 'Relay',
      components: {
        Nav: Navigation,
        default: Relays,
        Hero: HeroRelay
      },
      props: true
    },
    {
      path: '/wallet',
      name: 'Wallet',
      components: {
        Nav: Navigation,
        default: Wallet
      }
    },
    {
      path: '/wallet/:account',
      name: 'WalletAccount',
      components: {
        Nav: Navigation,
        Hero: HeroTransfer,
        default: WalletAccount
      },
      props: true
    },
    {
      path: '/relays/create',
      name: 'Create',
      components: {
        Nav: Navigation,
        default: Relays,
        Hero: HeroCreate
      }
    },
    {
      path: '/:symbolName',
      name: 'Token',
      components: {
        Nav: Navigation,
        default: Tokens,
        Hero: HeroConvert
      },
      props: true
    }
  ]
})
