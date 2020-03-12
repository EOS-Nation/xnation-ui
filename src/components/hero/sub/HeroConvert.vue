<template>
  <hero-wrapper>
    <two-token-hero
      :tokenOneSymbol.sync="fromTokenSymbol"
      :tokenOneAmount.sync="fromTokenAmount"
      @update:tokenOneAmount="fromTokenChanged"
      @update:tokenTwoAmount="toTokenChanged"
      :tokenOneBalance="fromToken.balance"
      :tokenOneImg="fromToken.logo"
      :tokenTwoSymbol.sync="toTokenSymbol"
      :tokenTwoAmount.sync="toTokenAmount"
      :tokenTwoBalance="toToken.balance"
      :tokenTwoImg="toToken.logo"
      :choices="choices"
    >
      <div>
        <transition name="fade" mode="out-in">
          <font-awesome-icon
            icon="exchange-alt"
            class="fa-2x text-white cursor"
            :pulse="flipping"
            @click="swapTokens"
          />
        </transition>
        <div class="mb-3 mt-3">
          <span v-if="loading">
            <font-awesome-icon icon="circle-notch" class="text-white" spin />
          </span>
          <span v-else class="text-white font-size-sm">
            {{ oneUnitReward }}
          </span>
          <div class="text-white font-size-sm">
            {{
              `1 ${fromTokenSymbol} = $${token(fromTokenSymbol).price.toFixed(
                2
              )} USD`
            }}
          </div>
        </div>
        <div class="d-flex justify-content-center">
          <b-btn
            @click="initConvert"
            variant="success"
            v-ripple
            class="px-4 py-2 d-block"
            :disabled="disableConvert"
          >
            <font-awesome-icon
              :icon="loadingConversion ? 'circle-notch' : 'sync-alt'"
              :spin="loadingConversion"
              fixed-width
              class="mr-2"
            />
            <span class="font-w700">CONVERT</span>
          </b-btn>
        </div>
      </div>
    </two-token-hero>
    <modal-tx title="Convert" v-model="txModal" :busy="txBusy">
      <token-swap
        :error="error"
        :success="success"
        :leftImg="fromToken.logo"
        :leftTitle="`${fromTokenAmount} ${fromTokenSymbol}`"
        :leftSubtitle="
          `${fromToken.name} ($${(
            token(fromTokenSymbol).price * Number(fromTokenAmount)
          ).toFixed(2)} USD)`
        "
        :rightImg="toToken.logo"
        :rightTitle="`${toTokenAmount} ${toTokenSymbol}`"
        :rightSubtitle="toToken.name"
      >
        <template v-slot:footer>
          <b-col cols="12" class="text-center">
            <h6 v-if="!success && !error">
              Please proceed with your wallet to confirm this Transaction.
            </h6>
            <h6 v-else-if="error && !success" class="text-danger">
              Error: {{ error }}
              <!-- <span class="cursor text-muted"> - Try again</span> -->
            </h6>
            <h6 v-else-if="!error && success">
              <a :href="explorerLink" target="_blank" class="text-success">
                SUCCESS: View {{ success.substring(0, 6) }} TX on
                {{ explorerName }}
              </a>
              <span @click="txModal = false" class="cursor text-muted"
                >- Close</span
              >
            </h6>
          </b-col>
        </template>
      </token-swap>
    </modal-tx>
  </hero-wrapper>
</template>
<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import ModalTx from "@/components/modals/ModalTx.vue";
import TokenSwap from "@/components/common/TokenSwap.vue";
import ModalSelect from "@/components/modals/ModalSelect.vue";
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";
import TokenField from "@/components/convert/TokenField.vue";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import { parseTokens, fetchTokenMeta } from "@/api/helpers";
import wait from "waait";
// @ts-ignore
import {  Asset, Symbol, symbol_code } from "eos-common";
import { multiContract } from "@/api/multiContractTx";
import { ABISmartToken, ABIConverter, BntTokenContract } from "@/api/ethConfig";
import { get_price, get_pools } from "sxjs";
import { rpc } from "../../../api/rpc";
import { Route } from "vue-router";
import TwoTokenHero from "./TwoTokenHero.vue";

const appendBaseQuoteQuery = (base: string, quote: string, route: Route) => {
  return {
    name: route.name,
    params: route.params,
    query: { base, quote }
  };
};

const addDefaultQueryParams = (to: Route): any => {
  switch (to.params.service) {
    case "eos":
      return appendBaseQuoteQuery("BNT", "EOS", to);
    case "eth":
      return appendBaseQuoteQuery("BNT", "ETH", to);
    case "usds":
      return appendBaseQuoteQuery("USDT", "EOSDT", to);
    default:
      throw new Error("Unrecognised service!");
  }
};

const queryParamsCheck = (to: Route, next: any) => {
  if (!to.query.base || !to.query.quote) {
    next(addDefaultQueryParams(to));
  } else {
    next();
  }
};

@Component({
  beforeRouteUpdate: (to, from, next) => {
    queryParamsCheck(to, next);
  },
  beforeRouteEnter: async (to, from, next) => {
    queryParamsCheck(to, next);
  },
  components: {
    TokenAmountInput,
    ModalSelect,
    HeroWrapper,
    ModalTx,
    TokenField,
    TokenSwap,
    TwoTokenHero
  }
})
export default class HeroConvert extends Vue {
  loading = true;
  modal = false;
  txModal = false;
  flipping = false;

  txBusy = false;

  error = "";
  success = "";

  fromTokenAmount = "";
  toTokenAmount = "";

  oneUnitReward = "";

  loadingConversion = false;

  get currentNetwork() {
    return this.$route.params.service;
  }

  get explorerLink() {
    switch (this.currentNetwork) {
      case "eos":
      case "usds":
        return `https://bloks.io/transaction/${this.success}`;
      case "eth":
        return `https://etherscan.io/tx/${this.success}`;
      default:
        return `https://bloks.io/transaction/${this.success}`;
    }
  }

  get explorerName() {
    switch (this.currentNetwork) {
      case "eos":
      case "usds":
        return `Bloks.io`;
      case "eth":
        return `Etherscan`;
      default:
        return `Bloks.io`;
    }
  }

  get fromToken() {
    return this.token(this.fromTokenSymbol);
  }

  get toToken() {
    return this.token(this.toTokenSymbol);
  }

  get isAuthenticated() {
    return vxm.wallet.isAuthenticated;
  }

  get token() {
    return (symbolName: string) => {
      return vxm.bancor.tokens.find((x: any) => x.symbol == symbolName);
    };
  }

  get tokens() {
    return vxm.bancor.tokens;
  }

  get choices() {
    return vxm.bancor.tokens.map((token: any) => ({
      symbol: token.symbol,
      balance: token.balance,
      img: token.logo
    }));
  }

  get fromTokenSymbol() {
    return this.$route.query.base as string;
  }

  set fromTokenSymbol(symbol: string) {
    this.$router.push({
      name: "Tokens",
      query: {
        base: symbol,
        quote: this.toTokenSymbol
      }
    });
  }

  set toTokenSymbol(symbol: string) {
    this.$router.push({
      name: "Tokens",
      query: {
        base: this.fromTokenSymbol,
        quote: symbol
      }
    });
  }

  get toTokenSymbol() {
    return this.$route.query.quote as string;
  }

  get fromTokenBalance() {
    return this.token(this.fromTokenSymbol).balance;
  }

  get toTokenBalance() {
    return this.token(this.toTokenSymbol).balance;
  }

  get disableConvert() {
    return (
      !this.isAuthenticated ||
      this.loadingConversion ||
      this.fromTokenAmount == "" ||
      this.toTokenAmount == ""
    );
  }

  fromTokenChanged(amount: string) {
    this.updatePriceReturn()
  }

  toTokenChanged(amount: string) {
    this.updatePriceCost();
  }

  swapTokens() {
    this.flipping = true;
    this.$router.push({
      name: "Tokens",
      query: {
        base: this.toTokenSymbol,
        quote: this.fromTokenSymbol
      }
    });
    setTimeout(() => (this.flipping = false), 500);
  }

  async initConvert() {
    try {
      this.txModal = true;
      this.txBusy = true;

      this.success = "";
      this.error = "";

      const result = await vxm.bancor.convert({
        fromSymbol: this.fromTokenSymbol,
        toSymbol: this.toTokenSymbol,
        fromAmount: Number(this.fromTokenAmount),
        toAmount: Number(this.toTokenAmount)
      });
      console.log(result, 'result came through')

      this.success = result;
      this.error = "";

      vxm.bancor.init();
    } catch (e) {
      this.error = e.message;
      this.success = "";
    }
    this.txBusy = false;
    await wait(500);
    this.fetchUserTokenBalances();
  }

  cleanUpAfterTx() {
    this.fromTokenAmount = "";
    this.toTokenAmount = "";
    this.success = "";
    this.error = "";
  }

  @Watch("txModal")
  modalChange(visible: boolean) {
    if (!visible) {
      this.cleanUpAfterTx();
    }
  }

  navTransfer() {
    // this.$router.push({
    //   name: "Transfer",
    //   params: {
    //     symbolName: this.selectedSymbolOrDefaultTo
    //   }
    // });
  }

  async updatePriceReturn() {
    if (!Number(this.fromTokenAmount) && !Number(this.toTokenAmount)) return;
    this.loadingConversion = true;
    const amount = Number(this.fromTokenAmount);
    const reward = await vxm.bancor.getReturn({
      fromSymbol: this.fromTokenSymbol,
      amount,
      toSymbol: this.toTokenSymbol
    });
    this.toTokenAmount = reward.amount;
    this.loadingConversion = false;
  }

  async updatePriceCost() {
    this.loading = true;

    const amount = Number(this.toTokenAmount);
    const reward = await vxm.bancor.getCost({
      amount,
      toSymbol: this.toTokenSymbol,
      fromSymbol: this.fromTokenSymbol
    });
    this.fromTokenAmount = reward.amount;
    this.loading = false;
  }

  @Watch("fromTokenSymbol")
  @Watch("toTokenSymbol")
  tokenChange(symbol: string) {
    this.loadSimpleReward();
    this.updatePriceReturn();
    vxm.bancor.focusSymbol(this.fromTokenSymbol);
    vxm.bancor.focusSymbol(this.toTokenSymbol);
  }

  @Watch("isAuthenticated")
  authChange(value: any) {
    this.fetchUserTokenBalances();
  }

  async fetchUserTokenBalances() {
    if (!this.isAuthenticated) return;
    await vxm.bancor.refreshBalances([
      this.fromTokenSymbol,
      this.toTokenSymbol
    ]);
  }

  async loadSimpleReward() {
    this.loading = true;
    const reward = await vxm.bancor.getReturn({
      fromSymbol: this.fromTokenSymbol,
      amount: 1,
      toSymbol: this.toTokenSymbol
    });
    this.oneUnitReward = `1 ${this.fromTokenSymbol} = ${reward.amount} ${this.toTokenSymbol}`;

    this.loading = false;
  }

  created() {
    this.loadSimpleReward();
  }
}
</script>

<style scoped lang="scss">
.slide-fade-up-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-up-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-up-enter
    /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(75px);
  opacity: 0;
}
.slide-fade-up-leave-to
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(-75px);
  opacity: 0;
}

.slide-fade-down-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-down-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-down-enter
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(-75px);
  opacity: 0;
}
.slide-fade-down-leave-to
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(75px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
