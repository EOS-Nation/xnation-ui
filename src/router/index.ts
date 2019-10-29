import Vue from 'vue'
import Router from 'vue-router'
import Wallet from '@/views/Wallet.vue'
import WalletAccount from '@/views/WalletAccount.vue'
import Token from '@/views/Token.vue'
import Tokens from '@/views/Tokens.vue'
import Relays from '@/views/Relays.vue'
import Relay from '@/views/Relay.vue'

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
      component: Tokens
    },
    {
      path: '/token/:symbol',
      name: 'Token',
      component: Token,
      props: true
    },
    {
      path: '/relays',
      name: 'Relays',
      component: Relays
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
