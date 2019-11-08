import Vue from 'vue'
import Router from 'vue-router'
import Wallet from '@/views/Wallet.vue'
import WalletAccount from '@/views/WalletAccount.vue'
import Tokens from '@/views/Tokens.vue'
import Relays from '@/views/Relays.vue'
import Relay from '@/views/Relay.vue'
import HeroActions from '@/components/hero/HeroActions.vue'
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
        Hero: HeroActions
      }
    },
    {
      path: '/relays',
      name: 'Relays',
      components: {
        Nav: Navigation,
        default: Relays,
        Hero: HeroActions
      }
    },
    {
      path: '/relay/:account',
      name: 'Relay',
      component: Relay,
      props: true
    },
    {
      path: '/wallet',
      name: 'Wallet',
      component: Wallet
    },
    {
      path: '/wallet/:account',
      name: 'WalletAccount',
      component: WalletAccount,
      props: true
    }
  ]
})
