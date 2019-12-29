<template>
  <hero-wrapper>
    <div>
      <b-row :class="flipped && 'd-flex flex-row-reverse'">
        <b-col md="4">
          <transition name="slide-fade-down" mode="out-in">
            <token-amount-input
              :key="fromTokenSymbol"
              :amount.sync="token1Amount"
              :balance="token1Balance"
              :img="token1Img"
              :symbol="token1Symbol"
              dropdown
              @dropdown="promptModal(1)"
              @click="promptModal(1)"
              @onUpdate="tokenAmountChange(1)"
            />
          </transition>
        </b-col>
        <b-col
          md="4"
          class="d-flex justify-content-center align-items-end"
          style="min-height: 230px"
        >
          <div>
            <transition name="fade" mode="out-in">
              <font-awesome-icon
                icon="exchange-alt"
                class="fa-2x text-white cursor"
                :key="ltr ? 'ltr' : 'rtl'"
                @click="swapTokens"
              />
            </transition>
            <div class="mb-3 mt-3">
              <span v-if="loading">
                <font-awesome-icon
                  icon="circle-notch"
                  class="text-white"
                  spin
                />
              </span>
              <span v-else class="text-white font-size-sm">
                {{ flipped ? token2SimpleReward : token1SimpleReward }}
              </span>
            </div>
            <div class="d-flex justify-content-center">
              <b-btn
                @click="initConvert"
                variant="success"
                v-ripple
                class="px-4 py-2 d-block"
                :disabled="!isAuthenticated"
              >
                <font-awesome-icon
                  :icon="loading ? 'circle-notch' : 'sync-alt'"
                  :spin="loading"
                  fixed-width
                  class="mr-2"
                />
                <span class="font-w700">CONVERT</span>
              </b-btn>
            </div>
            <span
              @click="navTransfer"
              class="cursor font-size-sm text-white-50"
            >
              <font-awesome-icon
                icon="long-arrow-alt-right"
                fixed-width
              />TRANSFER
            </span>
          </div>
        </b-col>
        <b-col md="4">
          <transition name="slide-fade-up" mode="out-in">
            <token-amount-input
              :key="toTokenSymbol"
              :amount.sync="token2Amount"
              :balance="token2Balance"
              :img="token2Img"
              :symbol="token2Symbol"
              dropdown
              @dropdown="promptModal(2)"
              @click="promptModal(2)"
              @onUpdate="tokenAmountChange(2)"
            />
          </transition>
        </b-col>
      </b-row>
      <modal-select
        :modalShow.sync="modal"
        :tokens="tokens"
        @onSelect="selectedToken"
      />
      <modal-convert-liquidity />
    </div>
  </hero-wrapper>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import HeroConvertRelay from "@/components/convert/HeroConvertRelay.vue";
import * as bancorx from "@/assets/_ts/bancorx";
import numeral from "numeral";
import ModalConvertLiquidity from "@/components/modals/ModalConvertLiquidity.vue";
import ModalSelect from "@/components/modals/ModalSelect.vue";
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import { parseTokens, fetchTokenMeta } from "@/api/helpers";
import { bancorCalculator } from "@/api/bancorCalculator";
import wait from "waait";
import { split, Asset, Symbol } from "eos-common";
import { multiContract } from "@/api/multiContractTx";

@Component({
  beforeRouteEnter: async (to, from, next) => {
    if (vxm.relays.tokens.length == 0) {
      await vxm.relays.init();
    }
    next();
  },
  components: {
    TokenAmountInput,
    ModalSelect,
    ModalConvertLiquidity,
    HeroWrapper,
    HeroConvertRelay
  }
})
export default class HeroConvert extends Vue {
  ltr = true;
  rate = "";
  rateLoading = false;
  loading = true;
  numeral = numeral;
  modal = false;
  flipped = false;

  promptedTokenNumber = 0;
  token1Amount = "";
  token1Balance = "";
  token1Img = "";
  token1Symbol = "";

  token2Amount = "";
  token2Balance = "";
  token2Img =
    "https://storage.googleapis.com/bancor-prod-file-store/images/communities/f80f2a40-eaf5-11e7-9b5e-179c6e04aa7c.png";
  token2Symbol = "BNT";

  token1SimpleReward = "";
  token2SimpleReward = "";

  get isAuthenticated() {
    return (
      vxm.eosTransit.walletState && vxm.eosTransit.walletState.authenticated
    );
  }

  get tokens() {
    return vxm.relays.tokens;
  }

  promptModal(tokenNumber: number) {
    this.promptedTokenNumber = tokenNumber;
    this.modal = true;
  }

  selectedToken(selectedSymbol: string) {
    this.modal = false;
    const { symbol, logo } = vxm.relays.token(selectedSymbol)!;
    const fromTokenChanged = this.isFromToken(this.promptedTokenNumber);
    if (fromTokenChanged) {
      this.fromTokenImg = logo;
      this.fromTokenSymbol = symbol;
    } else {
      this.toTokenImg = logo;
      this.toTokenSymbol = symbol;
    }
  }

  swapTokens() {
    this.flipped = !this.flipped;
  }

  async initConvert() {
    const fromToken = vxm.relays.token(this.fromTokenSymbol)!;
    const toToken = vxm.relays.token(this.toTokenSymbol)!;
    const result = await vxm.relays.convert({
      fromSymbol: this.fromTokenSymbol,
      toSymbol: this.toTokenSymbol,
      fromAmount: Number(this.fromTokenAmount),
      toAmount: Number(this.toTokenAmount)
    });

    this.fromTokenAmount = "";
    this.toTokenAmount = "";

    await vxm.relays.fetchRelays();
  }

  setFromToken(symbolName: string) {
    const { symbol, logo } = vxm.relays.token(symbolName)!;
    this.token1Symbol = symbol;
    this.token1Img = logo;
  }

  @Watch("$route")
  listen(to: any) {
    if (to.params && to.params.symbolName) {
      this.setFromToken(to.params.symbolName);
      this.updatePriceReturn();
      this.loadSimpleRewards();
    } else {
      this.setFromToken(this.defaultSymbolName);
      this.updatePriceReturn();
      this.loadSimpleRewards();
    }
  }

  get selectedSymbolOrDefault() {
    return this.$route.params.symbolName || this.defaultSymbolName;
  }

  get defaultSymbolName() {
    return vxm.relays.tokens.find(token => token.symbol !== "BNT")!.symbol;
  }

  get focusedToken() {
    return vxm.relays.token(this.selectedSymbolOrDefault)!;
  }

  navTransfer() {
    this.$router.push({
      name: "Transfer",
      params: {
        symbolName: this.selectedSymbolOrDefault
      }
    });
  }

  get fromTokenSymbol() {
    return this.flipped ? this.token2Symbol : this.token1Symbol;
  }

  get toTokenSymbol() {
    return this.flipped ? this.token1Symbol : this.token2Symbol;
  }

  get fromTokenImg() {
    return this.flipped ? this.token2Img : this.token1Img;
  }

  get toTokenImg() {
    return this.flipped ? this.token1Img : this.token2Img;
  }

  get fromTokenAmount() {
    return this.flipped ? this.token2Amount : this.token1Amount;
  }

  get toTokenAmount() {
    return this.flipped ? this.token1Amount : this.token2Amount;
  }

  set fromTokenSymbol(symbol: string) {
    this[this.flipped ? "token2Symbol" : "token1Symbol"] = symbol;
  }

  set toTokenSymbol(symbol: string) {
    this[this.flipped ? "token1Symbol" : "token2Symbol"] = symbol;
  }

  set fromTokenImg(url: string) {
    this[this.flipped ? "token2Img" : "token1Img"] = url;
  }

  set toTokenImg(url: string) {
    this[this.flipped ? "token1Img" : "token2Img"] = url;
  }

  set toTokenAmount(amount: string) {
    this[this.flipped ? "token1Amount" : "token2Amount"] = amount;
  }

  set fromTokenAmount(amount: string) {
    this[this.flipped ? "token2Amount" : "token1Amount"] = amount;
  }

  isFromToken(numberSelection: number): boolean {
    return (
      (!this.flipped && numberSelection == 1) ||
      (this.flipped && numberSelection == 2)
    );
  }

  createAsset(amount: number, symbolName: string, precision: number): Asset {
    return new Asset(
      amount * Math.pow(10, precision),
      new Symbol(symbolName, precision)
    );
  }

  async updatePriceReturn() {
    this.loading = true;

    const amount = Number(this.fromTokenAmount);
    const reward = await vxm.relays.getReturn({
      fromSymbol: this.fromTokenSymbol,
      amount,
      toSymbol: this.toTokenSymbol
    });
    this.toTokenAmount = reward.amount;
    this.loading = false;
  }

  async updatePriceCost() {
    this.loading = true;

    const amount = Number(this.toTokenAmount);
    const reward = await vxm.relays.getCost({
      amount,
      toSymbol: this.toTokenSymbol,
      fromSymbol: this.fromTokenSymbol
    });
    this.fromTokenAmount = reward.amount;
    this.loading = false;
  }

  async tokenAmountChange(numberSelection: number) {
    const fromTokenChanged = this.isFromToken(numberSelection);
    if (fromTokenChanged) {
      this.updatePriceReturn();
    } else {
      this.updatePriceCost();
    }
  }

  @Watch("token1Symbol")
  @Watch("token2Symbol")
  tokenChange() {
    this.loadSimpleRewards();
  }

  async loadSimpleRewards() {
    this.loading = true;

    const [fromToken1, fromToken2] = await Promise.all([
      vxm.relays.getReturn({
        fromSymbol: this.token1Symbol,
        amount: 1,
        toSymbol: this.token2Symbol
      }),
      vxm.relays.getReturn({
        fromSymbol: this.token2Symbol,
        amount: 1,
        toSymbol: this.token1Symbol
      })
    ]);
    this.token1SimpleReward = `1 ${this.token1Symbol} = ${fromToken1.amount} ${this.token2Symbol}`;
    this.token2SimpleReward = `1 ${this.token2Symbol} = ${fromToken2.amount} ${this.token1Symbol}`;

    this.loading = false;
  }

  async created() {
    this.setFromToken(this.selectedSymbolOrDefault);
    this.loadSimpleRewards();
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
