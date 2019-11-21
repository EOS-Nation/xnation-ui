<template>
  <hero-wrapper>
    <div>
      <b-row>
        <b-col md="4">
          <transition name="slide-fade-down" mode="out-in">
            <token-amount-input
              :key="token1Symbol"
              :amount.sync="token1Amount"
              :balance="token1Balance"
              :img="token1Img"
              :symbol="token1Symbol"
              dropdown
              @dropdown="promptModal(1)"
              @click="promptModal(1)"
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
                @click="swapTokens()"
              />
            </transition>
            <div class="mb-3 mt-3">
              <span class="text-white font-size-sm">
                1 {{ tokenFrom.symbol }} =
                <span v-if="!rateLoading && !loadingTokens">{{ rate }}</span>
                <span v-else>
                  <font-awesome-icon icon="circle-notch" spin />
                </span>
                {{ tokenTo.symbol }}
              </span>
            </div>
            <div class="d-flex justify-content-center">
              <b-btn
                @click="initConvert()"
                variant="success"
                v-ripple
                class="px-4 py-2 d-block"
                :disabled="loadingTokens || minReturn === ''"
              >
                <font-awesome-icon
                  :icon="loadingTokens ? 'circle-notch' : 'sync-alt'"
                  :spin="loadingTokens"
                  fixed-width
                  class="mr-2"
                />
                <span class="font-w700">CONVERT</span>
              </b-btn>
            </div>
            <span
              v-if="this.currentRoute !== 'Relays'"
              @click="navTransfer"
              class="cursor font-size-sm text-white-50"
            >
              <font-awesome-icon
                icon="long-arrow-alt-right"
                fixed-width
              />TRANSFER
            </span>
            <span
              v-else
              @click="heroAction = 'liq-add'"
              class="cursor font-size-sm text-white-50"
            >
              <font-awesome-icon icon="long-arrow-alt-right" fixed-width />DUAL
              Liquidity
            </span>
          </div>
        </b-col>
        <b-col md="4">
          <transition name="slide-fade-up" mode="out-in">
            <token-amount-input
              :key="token2Symbol"
              :amount.sync="token2Amount"
              :balance="token2Balance"
              :img="token2Img"
              :symbol="token2Symbol"
              dropdown
              @dropdown="promptModal(2)"
              @click="promptModal(2)"
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
import { fetchRelays, parseTokens, fetchTokenMeta } from "@/api/helpers";

@Component({
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
  numeral = numeral;
  modal = false;

  promptedTokenNumber = 0;
  token1Amount = "";
  token1Balance = "";
  token1Img =
    "";
  token1Symbol = "";

  token2Amount = "";
  token2Balance = "";
  token2Img =
    "https://storage.googleapis.com/bancor-prod-file-store/images/communities/f80f2a40-eaf5-11e7-9b5e-179c6e04aa7c.png";
  token2Symbol = "BNT";

  // computed
  get isAuthenticated() {
    return (
      vxm.eosTransit.walletState && vxm.eosTransit.walletState.authenticated
    );
  }

  get heroAction() {
    return vxm.general.heroAction;
  }

  get currentRoute() {
    return this.$route.name;
  }

  set heroAction(val) {
    vxm.general.setHeroAction(val);
  }

  get debouncedState() {
    return vxm.convert.debouncedState;
  }

  get tokenFrom() {
    return vxm.liquidity.fromToken;
  }

  get tokenTo() {
    return vxm.liquidity.toToken;
  }

  get amount() {
    return vxm.liquidity.amount;
  }

  get minReturn() {
    return vxm.liquidity.minReturn;
  }

  get tokens() {
    return vxm.relays.tokens;
  }

  get loadingTokens() {
    return vxm.liquidity.rateLoading;
  }

  promptModal(tokenNumber: number) {
    this.promptedTokenNumber = tokenNumber;
    this.modal = true;
  }

  selectedToken(selectedSymbol: string) {
    this.modal = false;
    const { symbol, logo } = this.tokens.find(token => token.symbol == selectedSymbol)!
    if (this.promptedTokenNumber == 1) {
      this.token1Img = logo
      this.token1Symbol = symbol
    } else {
      this.token2Img = logo;
      this.token2Symbol = symbol;
    }
  }

  async conversionRate() {
    this.rateLoading = true;
    let amount = this.amount;
    if (amount === "") {
      amount = "1";
      const minReturn = await bancorx.calcRate(
        vxm.liquidity.fromToken.symbol,
        vxm.liquidity.toToken.symbol,
        amount
      );
      this.rate = this.numeral(
        parseFloat(minReturn) / parseFloat(amount)
      ).format("0,0.0000");
    } else
      this.rate = this.numeral(
        parseFloat(this.minReturn) / parseFloat(amount)
      ).format("0,0.0000");

    this.rateLoading = false;
  }

  // methods
  swapTokens() {
    this.ltr = !this.ltr;
    vxm.liquidity.swapSelection();
    vxm.liquidity.calcMinReturn();
  }

  initConvert() {
    if (!this.isAuthenticated) this.$bvModal.show("modal-login");
    else {
      vxm.convert.initConversion("from");
      this.$bvModal.show("modal-convert-token");
    }
  }

  @Watch("minReturn")
  async onStateChange(val: any, oldVal: any) {
    await this.conversionRate();
  }

  @Watch("tokenFrom")
  async onTokenChange(val: any, oldVal: any) {
    await this.conversionRate();
  }

  setFromToken(symbolName: string) {
    const { symbol, logo} = this.tokens.find(token => token.symbol == symbolName)!
    this.token1Symbol = symbol
    this.token1Img = logo;
  }

  @Watch("$route")
  listen(to: any) {
    this.setFromToken(to.params.symbolName);
  }

  navTransfer() {
    this.$router.push({
      name: "Transfer",
      params: {
        symbolName: this.$route.params.symbolName || "EOS"
      }
    });
  }

  async created() {
    this.setFromToken(this.$route.params.symbolName || "EOS");
    vxm.relays.fetchRelays();
    this.conversionRate();
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
