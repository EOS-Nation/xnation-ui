<template>
  <hero-wrapper>
    <two-token-hero
      :tokenOneId.sync="fromTokenId"
      :tokenTwoId.sync="toTokenId"
      :tokenOneMeta="fromTokenMeta"
      :tokenTwoMeta="toTokenMeta"
      :tokenOneAmount.sync="fromTokenAmount"
      :tokenTwoAmount.sync="toTokenAmount"
      @update:tokenOneAmount="updatePriceReturn"
      @update:tokenTwoAmount="updatePriceCost"
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
            {{ unitReward }}
          </span>
          <div class="text-white font-size-sm">
            {{
              `1 ${fromToken.symbol} = $${(
                this.toToken.price * this.reward
              ).toFixed(2)} USD`
            }}
          </div>
          <div v-if="fee !== null" :class="['text-white', `font-size-sm`]">
            Fee: {{ fee }}
          </div>
          <div
            v-if="slippage !== null"
            :class="[
              slippageHigh ? 'text-warning' : 'text-white',
              `font-size-sm`
            ]"
          >
            {{ displayedSlippage }}
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
    <modal-tx
      title="Convert"
      v-model="txModal"
      :busy="txBusy"
      @input="closeTxModal"
    >
      <div>
        <stepper
          v-if="sections.length > 1"
          :selectedStep="stepIndex"
          :steps="sections"
          :label="sections[stepIndex].description"
          :numbered="true"
        />
        <token-swap
          :error="error"
          :success="success"
          :leftImg="fromToken.logo"
          :leftTitle="`${fromTokenAmount} ${fromToken.symbol}`"
          :leftSubtitle="
            `${fromToken.name} ($${(
              token(fromTokenId).price * Number(fromTokenAmount)
            ).toFixed(2)} USD)`
          "
          :rightImg="toToken.logo"
          :rightTitle="`${toTokenAmount} ${toToken.symbol}`"
          :rightSubtitle="toToken.name"
        >
          <template v-slot:footer>
            <TxModalFooter
              :error="error"
              :success="success"
              :explorerLink="explorerLink"
              :explorerName="explorerName"
              @close="closeTxModal"
            />
          </template>
        </token-swap>
      </div>
    </modal-tx>
  </hero-wrapper>
</template>
<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import ModalTx from "@/components/modals/ModalTx.vue";
import TokenSwap from "@/components/common/TokenSwap.vue";
import TxModalFooter from "@/components/common/TxModalFooter.vue";
import ModalSelect from "@/components/modals/ModalSelect.vue";
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";
import TokenField from "@/components/convert/TokenField.vue";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import Stepper from "@/components/modals/Stepper.vue";
import wait from "waait";
import { Route } from "vue-router";
import TwoTokenHero from "./TwoTokenHero.vue";
import { State, Getter, Action, Mutation, namespace } from "vuex-class";
import { LiquidityModule, TradingModule, Step } from "../../../types/bancor";
import numeral from "numeral";
import { vxm } from "@/store";
import { buildTokenId } from "../../../api/helpers";
import { ethReserveAddress } from "../../../api/ethConfig";

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
      return appendBaseQuoteQuery(
        buildTokenId({ contract: "bntbntbntbnt", symbol: "BNT" }),
        buildTokenId({ contract: "eosio.token", symbol: "EOS" }),
        to
      );
    case "eth":
      return appendBaseQuoteQuery(
        ethReserveAddress,
        "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c",
        to
      );
    case "usds":
      return appendBaseQuoteQuery(
        buildTokenId({ contract: "eosdtsttoken", symbol: "EOSDT" }),
        buildTokenId({ contract: "tethertether", symbol: "USDT" }),
        to
      );
    default:
      throw new Error("Unrecognised service!");
  }
};

const queryParamsCheck = (to: Route, next: any) => {
  if (!to.query.base || !to.query.quote) {
    console.log("added query params");
    next(addDefaultQueryParams(to));
  } else {
    console.log("did nothing");
    next();
  }
};

const wallet = namespace("wallet");
const bancor = namespace("bancor");

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
    TwoTokenHero,
    Stepper,
    TxModalFooter
  }
})
export default class HeroConvert extends Vue {
  loading = true;
  modal = false;
  txModal = false;
  flipping = false;
  txBusy = false;
  fee: string | null = null;
  error = "";
  success = "";
  fromTokenAmount = "";
  toTokenAmount = "";
  oneUnitReward = 0;
  loadingConversion = false;
  fromTokenError = "";
  toTokenError = "";
  slippage: number | null = null;

  sections: Step[] = [];
  stepIndex = 0;

  @bancor.Getter token!: TradingModule["token"];
  @bancor.Getter tokens!: TradingModule["tokens"];
  @bancor.Action convert!: TradingModule["convert"];
  @bancor.Action focusSymbol!: TradingModule["focusSymbol"];
  @bancor.Action getReturn!: TradingModule["getReturn"];
  @bancor.Action getCost!: TradingModule["getCost"];
  @bancor.Getter relay!: LiquidityModule["relay"];
  @wallet.Getter isAuthenticated!: string | boolean;
  @bancor.Action
  calculateOpposingDeposit!: LiquidityModule["calculateOpposingDeposit"];

  get fromTokenMeta() {
    return {
      ...this.fromToken,
      img: this.fromToken.logo,
      errors: this.fromTokenErrors,
      choices: this.choices
    };
  }

  get toTokenMeta() {
    return {
      ...this.toToken,
      img: this.toToken.logo,
      errors: this.fromTokenErrors,
      choices: this.choices
    };
  }

  get fromTokenErrors() {
    return [
      ...(this.fromTokenError ? [this.fromTokenError] : []),
      ...(this.fromTokenBalanceInsuffient ? ["Insufficient Balance"] : [])
    ];
  }

  get toTokenErrors() {
    return [
      ...(this.toTokenError ? [this.toTokenError] : []),
      ...(this.toTokenBalanceInsufficient ? ["Insufficient Balance"] : [])
    ];
  }

  get fromTokenBalanceInsuffient() {
    return (
      this.fromTokenBalance &&
      Number(this.fromTokenAmount) > this.fromTokenBalance
    );
  }

  get toTokenBalanceInsufficient() {
    return (
      this.toTokenBalance && Number(this.toTokenBalance) > this.toTokenBalance
    );
  }

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
    return this.token(this.fromTokenId);
  }

  get toToken() {
    return this.token(this.toTokenId);
  }

  get choices() {
    return this.tokens.map(token => ({
      id: token.id,
      symbol: token.symbol,
      balance: token.balance,
      img: token.logo
    }));
  }

  get fromTokenId() {
    return this.$route.query.base as string;
  }

  set fromTokenId(id: string) {
    this.$router.push({
      name: "Tokens",
      query: {
        base: id,
        quote: this.toTokenId
      }
    });
  }

  set toTokenId(id: string) {
    this.$router.push({
      name: "Tokens",
      query: {
        base: this.fromTokenId,
        quote: id
      }
    });
  }

  get displayedSlippage() {
    return `Slippage: ${numeral(this.slippage).format("0.00%")}`;
  }

  get slippageHigh() {
    return Number(this.slippage) > 0.2;
  }

  get toTokenId() {
    return this.$route.query.quote as string;
  }

  get fromTokenBalance() {
    return this.token(this.fromTokenId).balance;
  }

  get toTokenBalance() {
    return this.token(this.toTokenId).balance;
  }

  get disableConvert() {
    return (
      !this.isAuthenticated ||
      this.loadingConversion ||
      this.fromTokenAmount == "" ||
      this.toTokenAmount == "" ||
      this.fromTokenErrors.length + this.toTokenErrors.length > 0
    );
  }

  swapTokens() {
    this.flipping = true;
    this.$router.push({
      name: "Tokens",
      query: {
        base: this.toTokenId,
        quote: this.fromTokenId
      }
    });
    setTimeout(() => (this.flipping = false), 500);
  }

  onUpdate(stepIndex: number, steps: Step[]) {
    this.stepIndex = stepIndex;
    this.sections = steps;
  }

  async initConvert() {
    try {
      this.sections = [];
      this.txModal = true;
      this.txBusy = true;
      this.success = "";
      this.error = "";

      const result = await this.convert({
        from: {
          id: this.fromTokenId,
          amount: this.fromTokenAmount
        },
        to: {
          id: this.toTokenId,
          amount: this.toTokenAmount
        },
        onUpdate: this.onUpdate
      });

      this.success = result;
      // @ts-ignore
      this.$analytics.logEvent("Conversion", { txId: result });

      this.error = "";
    } catch (e) {
      this.displayError(e.message);
      // @ts-ignore
      this.$analytics.logEvent("exception", {
        description: `${this.isAuthenticated} receievd error ${e.message}`
      });
    }
    this.txBusy = false;
  }

  displayError(message: string) {
    this.error = message;
    this.success = "";
  }

  closeTxModal() {
    this.txModal = false;
    if (this.success) {
      this.fromTokenAmount = "";
      this.toTokenAmount = "";
      this.slippage = null;
      this.fee = null;
    }
    this.success = "";
    this.error = "";
  }

  async updatePriceReturn(amountString: string) {
    const amount = Number(amountString);
    this.slippage = null;
    this.fee = null;
    if (!amount) {
      this.toTokenAmount = "";
      return;
    }
    this.loadingConversion = true;
    try {
      const reward = await this.getReturn({
        from: {
          id: this.fromTokenId,
          amount: amountString
        },
        toId: this.toTokenId
      });
      if (reward.slippage) {
        this.slippage = reward.slippage;
      }
      if (reward.fee) {
        this.fee = reward.fee;
      }
      this.toTokenAmount = reward.amount;
      this.fromTokenError = "";
      this.toTokenError = "";
    } catch (e) {
      this.toTokenError = "";
      this.fromTokenError = e.message;
    }
    this.loadingConversion = false;
  }

  async updatePriceCost(amountString: string) {
    const amount = Number(amountString);
    this.slippage = null;
    this.fee = null;
    if (!amount) {
      this.fromTokenAmount = "";
      return;
    }
    this.loading = true;

    try {
      const reward = await this.getCost({
        to: {
          id: this.toTokenId,
          amount: this.toTokenAmount
        },
        fromId: this.fromTokenId
      });
      this.fromTokenAmount = reward.amount;
      if (reward.slippage) {
        this.slippage = reward.slippage;
      }
      if (reward.fee) {
        this.fee = reward.fee;
      }
      this.fromTokenError = "";
      this.toTokenError = "";
    } catch (e) {
      this.fromTokenError = "";
      this.toTokenError = e.message;
    }
    this.loading = false;
  }

  @Watch("fromTokenId")
  @Watch("toTokenId")
  tokenChange(id: string) {
    this.loadSimpleReward();
    this.updatePriceReturn(this.fromTokenAmount);
    this.focusSymbol(id);
  }

  get reward() {
    if (this.fromTokenAmount && this.toTokenAmount) {
      const fromAmount = Number(this.fromTokenAmount);
      const toAmount = Number(this.toTokenAmount);
      return toAmount / fromAmount;
    } else {
      return this.oneUnitReward;
    }
  }

  get unitReward() {
    return `1 ${this.fromToken.symbol} = ${this.reward.toFixed(
      this.toToken.precision! > 6 ? 6 : this.toToken.precision
    )} ${this.toToken.symbol}`;
  }

  async loadSimpleReward() {
    this.loading = true;
    const reward = await this.getReturn({
      from: {
        id: this.fromTokenId,
        amount: "1"
      },
      toId: this.toTokenId
    });
    this.oneUnitReward = Number(reward.amount);

    this.loading = false;
  }

  async created() {
    this.loadSimpleReward();
    this.focusSymbol(this.fromTokenId);
    this.focusSymbol(this.toTokenId);
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
