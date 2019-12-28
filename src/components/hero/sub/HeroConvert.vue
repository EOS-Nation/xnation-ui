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
import { mapGetters } from "vuex";

@Component({
  beforeRouteEnter: async (to, from, next) => {
    if (vxm.relays.tokens.length == 0) {
      await vxm.relays.fetchRelays();
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
  // data
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

  // computed
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
    const { symbol, logo } = this.tokens.find(
      token => token.symbol == selectedSymbol
    )!;
    const fromTokenChanged = this.isFromToken(this.promptedTokenNumber);
    if (fromTokenChanged) {
      this.fromTokenImg = logo;
      this.fromTokenSymbol = symbol;
    } else {
      this.toTokenImg = logo;
      this.toTokenSymbol = symbol;
    }
  }

  // methods
  swapTokens() {
    this.flipped = !this.flipped;
  }

  async initConvert() {
    const fromToken = vxm.relays.tokens.find(
      token => token.symbol == this.fromTokenSymbol
    )!;
    const toToken = vxm.relays.tokens.find(
      token => token.symbol == this.toTokenSymbol
    )!;

    const fromAmountAsset = new Asset(
      Number(this.fromTokenAmount) * Math.pow(10, fromToken.precision),
      new Symbol(fromToken.symbol, fromToken.precision)
    );

    const toAmountAsset = new Asset(
      Number(this.toTokenAmount) * Math.pow(10, toToken.precision),
      new Symbol(toToken.symbol, toToken.precision)
    );

    const minimumReturn = new Asset(
      toAmountAsset.amount * 0.98,
      toAmountAsset.symbol
    );
    const minimumReturnString = minimumReturn.toString().split(" ")[0];
    const memo = await bancorCalculator.composeMemo(
      new Symbol(fromToken.symbol, fromToken.precision),
      new Symbol(toToken.symbol, toToken.precision),
      minimumReturnString,
      // @ts-ignore
      vxm.eosTransit.wallet.auth.accountName
    );

    try {
      const txResponse = await multiContract.convert(
        fromToken.contract,
        fromAmountAsset,
        memo
      );
      console.log(JSON.stringify(txResponse));
      this.fromTokenAmount = "";
      this.toTokenAmount = "";
    } catch (e) {
      console.warn("TX Error:", e);
    }
    await vxm.relays.fetchRelays();
  }

  setFromToken(symbolName: string) {
    const { symbol, logo } = this.tokens.find(
      token => token.symbol == symbolName
    )!;
    this.token1Symbol = symbol;
    this.token1Img = logo;
  }

  @Watch("$route")
  listen(to: any) {
    if (to.params && to.params.symbolName) {
      this.setFromToken(to.params.symbolName);
    }
  }

  navTransfer() {
    this.$router.push({
      name: "Transfer",
      params: {
        symbolName: this.$route.params.symbolName || "EOS"
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
    if (this.flipped && numberSelection == 1) {
      return false;
    } else if (!this.flipped && numberSelection == 1) {
      return true;
    } else if (this.flipped && numberSelection == 2) {
      return true;
    } else if (!this.flipped && numberSelection == 2) {
      return false;
    } else {
      throw new Error("Failed to identify token!");
    }
  }

  async tokenAmountChange(numberSelection: number) {
    // Which token just changed? From or To?
    const fromTokenChanged = this.isFromToken(numberSelection);
    const fromToken = vxm.relays.tokens.find(
      token => token.symbol == this.fromTokenSymbol
    )!;
    const toToken = vxm.relays.tokens.find(
      token => token.symbol == this.toTokenSymbol
    )!;
    console.log({ fromToken, toToken });

    if (fromTokenChanged) {
      const amount = Number(this.fromTokenAmount);
      console.log(
        "I should be estimating return of",
        amount,
        this.fromTokenSymbol
      );

      try {
        const reward = await bancorCalculator.estimateReturn(
          new Asset(
            amount * Math.pow(10, fromToken.precision),
            new Symbol(fromToken.symbol, fromToken.precision)
          ),
          new Symbol(toToken.symbol, toToken.precision)
        );
        this.toTokenAmount = String(reward.toNumber());
      } catch (e) {
        console.log("Error thrown in bancorCalculator", e);
      }
    } else {
      const amount = Number(this.toTokenAmount);
      console.log("I should be estimating cost...", amount, this.toTokenSymbol);
      const reward = await bancorCalculator.estimateCost(
        new Asset(
          amount * Math.pow(10, toToken.precision),
          new Symbol(toToken.symbol, toToken.precision)
        ),
        new Symbol(fromToken.symbol, fromToken.precision)
      );
      console.log("setting", String(reward.toString()));
      this.fromTokenAmount = String(reward.toNumber());
    }
  }

  @Watch("token1Symbol")
  @Watch("token2Symbol")
  tokenChange() {
    this.loadSimpleRewards();
  }

  async loadSimpleRewards() {
    this.loading = true;

    const token1 = vxm.relays.tokens.find(
      token => token.symbol == this.token1Symbol
    )!;
    const token2 = vxm.relays.tokens.find(
      token => token.symbol == this.token2Symbol
    )!;

    const fromToken1 = await bancorCalculator.estimateReturn(
      new Asset(
        1 * Math.pow(10, token1.precision),
        new Symbol(token1.symbol, token1.precision)
      ),
      new Symbol(token2.symbol, token2.precision)
    );
    this.token1SimpleReward = `1 ${
      this.token1Symbol
    } = ${fromToken1.toString()}`;

    const fromToken2 = await bancorCalculator.estimateReturn(
      new Asset(
        1 * Math.pow(10, token2.precision),
        new Symbol(token2.symbol, token2.precision)
      ),
      new Symbol(token1.symbol, token1.precision)
    );
    this.token2SimpleReward = `1 ${
      this.token2Symbol
    } = ${fromToken2.toString()}`;

    this.loading = false;
  }

  async created() {
    this.setFromToken(
      this.$route.params.symbolName || vxm.relays.tokens[0].symbol
    );
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
