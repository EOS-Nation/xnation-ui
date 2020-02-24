import Vue from "vue";
import Router from "vue-router";
import Wallet from "@/views/Wallet.vue";
import WalletAccount from "@/views/WalletAccount.vue";
import Tokens from "@/views/Tokens.vue";
import Relays from "@/views/Relays.vue";
import PageNotFound from "@/views/PageNotFound.vue";
import HeroConvert from "@/components/hero/sub/HeroConvert.vue";
import HeroTransfer from "@/components/hero/sub/HeroTransfer.vue";
import HeroRelay from "@/components/hero/sub/HeroRelay.vue";
import Navigation from "@/components/layout/Navigation.vue";
import Privacy from "@/components/common/Privacy.vue";
import { services } from "@/api/helpers";

Vue.use(Router);

export const router = new Router({
  mode: "history",
  base: process.env.BASE_URL,
  linkExactActiveClass: "active",
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (savedPosition) {
          resolve(savedPosition);
        } else {
          resolve({ x: 0, y: 0 });
        }
      }, 500);
    });
  },
  routes: [
    {
      path: "/privacy",
      name: "Privacy",
      components: {
        Nav: Navigation,
        default: Privacy
      }
    },
    {
      path: "/404",
      name: "404",
      components: {
        Nav: Navigation,
        default: PageNotFound
      }
    },
    {
      path: "/:service/transfer/:symbolName",
      name: "Transfer",
      components: {
        Nav: Navigation,
        default: Tokens,
        Hero: HeroTransfer
      },
      props: true
    },
    {
      path: "/:service/wallet",
      name: "Wallet",
      components: {
        Nav: Navigation,
        default: Wallet
      }
    },
    {
      path: "/:service/wallet/:account",
      name: "WalletAccount",
      components: {
        Nav: Navigation,
        Hero: HeroTransfer,
        default: WalletAccount
      },
      props: true
    },
    {
      path: "/:service/pools",
      name: "Relays",
      components: {
        Nav: Navigation,
        default: Relays,
        Hero: HeroRelay
      },
      props: true,
      meta: {
        feature: "Liquidity"
      }
    },
    {
      path: "/:service/pool/:account",
      name: "Relay",
      components: {
        Nav: Navigation,
        default: Relays,
        Hero: HeroRelay
      },
      props: true,
      meta: {
        feature: "Liquidity"
      }
    },
    {
      path: "/:service/:symbolName",
      name: "Token",
      components: {
        Nav: Navigation,
        default: Tokens,
        Hero: HeroConvert
      },
      props: true,
      meta: {
        feature: "Trade"
      }
    },
    {
      path: "/:service",
      name: "Tokens",
      components: {
        Nav: Navigation,
        default: Tokens,
        Hero: HeroConvert
      },
      props: true,
      meta: {
        feature: "Trade"
      }
    },
    {
      path: "*",
      redirect: "/eth"
    },
    {
      path: "/",
      redirect: "/eth"
    }
  ]
});

router.beforeEach((to, from, next) => {
  if (to.meta && to.meta.feature) {
    const service = services.find(
      service => service.namespace == to.fullPath.split("/")[1]
    )!;
    if (!service) next("/404");
    switch (to.meta.feature) {
      case "Trade":
        if (service.features.includes(0)) next();
        else next("/404");
        break;
      case "Liquidity":
        if (service.features.includes(2)) next();
        else next("/404");
        break;
      default:
        next();
    }
  } else {
    next();
  }
});
