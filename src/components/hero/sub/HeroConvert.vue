<template>
  <hero-wrapper>
    <div>
      <b-row :class="flipped && 'd-flex flex-row-reverse'">
        <b-col md="4">
          <transition name="slide-fade-down" mode="out-in">
            <token-amount-input
              :key="token1Key"
              :amount.sync="token1Amount"
              :balance="token1Balance"
              :img="token(token1Symbol).logo"
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
                :key="flipped ? 'exchange' : 'exchange-'"
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
              <div class="text-white font-size-sm">
                {{
                  `1 ${fromTokenSymbol} = $${token(
                    fromTokenSymbol
                  ).price.toFixed(2)} USD`
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
            <!-- <span
              @click="navTransfer"
              class="cursor font-size-sm text-white-50"
            >
              <font-awesome-icon
                icon="long-arrow-alt-right"
                fixed-width
              />TRANSFER
            </span> -->
          </div>
        </b-col>
        <b-col md="4">
          <transition name="slide-fade-up" mode="out-in">
            <token-amount-input
              :key="token2Key"
              :amount.sync="token2Amount"
              :balance="token2Balance"
              :img="token(token2Symbol).logo"
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
    </div>
  </hero-wrapper>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import * as bancorx from "@/assets/_ts/bancorx";
import numeral from "numeral";
import ModalTx from "@/components/modals/ModalTx.vue";
import TokenSwap from "@/components/common/TokenSwap.vue";
import ModalSelect from "@/components/modals/ModalSelect.vue";
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import { parseTokens, fetchTokenMeta } from "@/api/helpers";
import { bancorCalculator } from "@/api/bancorCalculator";
import wait from "waait";
import { split, Asset, Symbol } from "eos-common";
import { multiContract } from "@/api/multiContractTx";
import { ABISmartToken, ABIConverter, BntTokenContract } from "@/api/ethConfig";

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
    HeroWrapper,
    ModalTx,
    TokenSwap
  }
})
export default class HeroConvert extends Vue {
  loading = true;
  numeral = numeral;
  modal = false;
  txModal = false;
  flipped = false;

  txBusy = false;

  error = "";
  success = "";

  promptedTokenNumber = 0;
  token1Amount = "";
  token1Balance = "";
  token1Symbol = "";
  token1Key = "token1K";

  token2Amount = "";
  token2Balance = "";
  token2Symbol = "BNT";
  token2Key = "token2K";

  token1SimpleReward = "";
  token2SimpleReward = "";

  loadingConversion = false;
  triggerUpdate = false;

  get currentNetwork() {
    return this.parseNetwork(this.$route.fullPath);
  }

  get explorerLink() {
    return this.currentNetwork == "eos"
      ? `https://bloks.io/transaction/${this.success}`
      : `https://etherscan.io/tx/${this.success}`;
  }

  get explorerName() {
    return this.currentNetwork == "eos" ? "Bloks.io" : "Etherscan";
  }

  get fromToken() {
    return this.flipped
      ? this.token(this.token2Symbol)
      : this.token(this.token1Symbol);
  }

  get toToken() {
    return this.flipped
      ? this.token(this.token1Symbol)
      : this.token(this.token2Symbol);
  }

  get isAuthenticated() {
    return vxm.wallet.isAuthenticated;
  }

  get token() {
    return (symbolName: string) => {
      return vxm.relays.token(symbolName);
    };
  }

  get tokens() {
    return vxm.relays.tokens;
  }

  get selectedSymbolOrDefault() {
    return this.$route.params.symbolName || this.defaultSymbolName;
  }

  get defaultSymbolName() {
    return vxm.relays.tokens.find(token => token.symbol !== "BNT")!.symbol;
  }

  get fromTokenSymbol() {
    return this.flipped ? this.token2Symbol : this.token1Symbol;
  }

  get toTokenSymbol() {
    return this.flipped ? this.token1Symbol : this.token2Symbol;
  }

  get fromTokenAmount() {
    return this.flipped ? this.token2Amount : this.token1Amount;
  }

  get toTokenAmount() {
    return this.flipped ? this.token1Amount : this.token2Amount;
  }

  get disableConvert() {
    return (
      !this.isAuthenticated ||
      this.loadingConversion ||
      this.token1Amount == "" ||
      this.token2Amount == ""
    );
  }

  set fromTokenSymbol(symbol: string) {
    this[this.flipped ? "token2Symbol" : "token1Symbol"] = symbol;
  }

  set toTokenSymbol(symbol: string) {
    this[this.flipped ? "token1Symbol" : "token2Symbol"] = symbol;
  }

  set toTokenAmount(amount: string) {
    this[this.flipped ? "token1Amount" : "token2Amount"] = amount;
  }

  set fromTokenAmount(amount: string) {
    this[this.flipped ? "token2Amount" : "token1Amount"] = amount;
  }

  promptModal(tokenNumber: number) {
    this.promptedTokenNumber = tokenNumber;
    this.modal = true;
  }

  animateChangedToken() {
    if (this.flipped && this.promptedTokenNumber == 1) {
      this.token1Key = this.reverseString(this.token1Key);
    } else if (!this.flipped && this.promptedTokenNumber == 1) {
      this.token1Key = this.reverseString(this.token1Key);
    } else if (!this.flipped && this.promptedTokenNumber == 2) {
      this.token2Key = this.reverseString(this.token2Key);
    } else if (this.flipped && this.promptedTokenNumber == 2) {
      this.token2Key = this.reverseString(this.token2Key);
    }
  }

  selectedToken(selectedSymbol: string) {
    this.modal = false;
    const fromTokenChanged = this.isFromToken(this.promptedTokenNumber);
    if (fromTokenChanged) {
      this.fromTokenSymbol = selectedSymbol;
    } else {
      this.toTokenSymbol = selectedSymbol;
    }
    this.animateChangedToken();
    this.updatePriceReturn();
  }

  reverseString(message: string) {
    return message
      .split("")
      .reverse()
      .join("");
  }

  swapTokens() {
    this.flipped = !this.flipped;
    this.token1Key = this.reverseString(this.token1Key);
    this.token2Key = this.reverseString(this.token2Key);
  }

  async initConvert() {
    try {
      this.txModal = true;
      this.txBusy = true;

      this.success = "";
      this.error = "";

      console.log(this.toTokenAmount, Number(this.toTokenAmount));
      const result = await vxm.relays.convert({
        fromSymbol: this.fromTokenSymbol,
        toSymbol: this.toTokenSymbol,
        fromAmount: Number(this.fromTokenAmount),
        toAmount: Number(this.toTokenAmount)
      });
      console.log("Promise returned of the TX", result);

      this.success = result;
      this.error = "";

      vxm.relays.init();
    } catch (e) {
      this.error = e.message;
      this.success = "";
    }
    this.txBusy = false;
    await wait(500);
    vxm.relays.fetchBalances();
  }

  networkChange() {
    const fromSymbol = this.fromTokenSymbol;
    const toSymbol = this.toTokenSymbol;
    const fromToken = vxm.relays.token(fromSymbol);
    const toToken = vxm.relays.token(toSymbol);
    this.token2Key = this.reverseString(this.token2Key);
    this.token1Key = this.reverseString(this.token1Key);
    if (!fromToken) {
      this.fromTokenSymbol = this.selectedSymbolOrDefault;
    }
    if (!toToken) {
      this.toTokenSymbol = "BNT";
    }
    this.updatePriceReturn();
    this.loadSimpleRewards();
  }

  parseNetwork(fullPath: string) {
    return fullPath.split("/")[1];
  }

  networkChanged(to: any, from: any): boolean {
    const toNetwork = this.parseNetwork(to.fullPath);
    const fromNetwork = this.parseNetwork(from.fullPath);
    return toNetwork !== fromNetwork;
  }

  @Watch("$route")
  listen(to: any, from: any) {
    if (this.networkChanged(to, from)) {
      this.networkChange();
    } else {
      this.fromTokenSymbol = this.selectedSymbolOrDefault;
      this.updatePriceReturn();
      this.loadSimpleRewards();
    }
  }

  cleanUpAfterTx() {
    this.token1Amount = "";
    this.token2Amount = "";
    this.success = "";
    this.error = "";
    console.log(
      "clean up after tx was called",
      this.txModal,
      "was tx modal state."
    );
  }

  @Watch("txModal")
  modalChange(visible: boolean) {
    if (!visible) {
      this.cleanUpAfterTx();
    }
  }

  navTransfer() {
    this.$router.push({
      name: "Transfer",
      params: {
        symbolName: this.selectedSymbolOrDefault
      }
    });
  }

  isFromToken(numberSelection: number): boolean {
    return (
      (!this.flipped && numberSelection == 1) ||
      (this.flipped && numberSelection == 2)
    );
  }

  async updatePriceReturn() {
    if (!Number(this.token1Amount) && !Number(this.token2Amount)) return;
    this.loadingConversion = true;
    const amount = Number(this.fromTokenAmount);
    const reward = await vxm.relays.getReturn({
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

  @Watch("selectedSymbolOrDefault")
  newSymbol(symbol: string) {
    this.fetchUserTokenBalances();
  }

  get relay() {
    return vxm.relays.relay(this.selectedSymbolOrDefault);
  }

  async fetchUserTokenBalances() {
    if (!this.isAuthenticated) return;
    console.log(this.token(this.token1Symbol), 'was this.token')
    // @ts-ignore
    const { tokenAddress } = this.token(this.token1Symbol);
    if (!tokenAddress) {
      console.warn("Token address wasn't found for", tokenAddress);
      return;
    }

    const getBalance = async (contractAddress: string) =>
      vxm.ethWallet.getBalance({
        accountHolder: this.isAuthenticated,
        tokenContractAddress: contractAddress
      });

    const [bntBalance, tokenBalance] = await Promise.all([
      getBalance(BntTokenContract),
      getBalance(tokenAddress)
    ]);

    this.token1Balance = tokenBalance;
    this.token2Balance = bntBalance;
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
    this.fromTokenSymbol = this.selectedSymbolOrDefault;
    this.loadSimpleRewards();
    this.fetchUserTokenBalances();
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
