<template>
  <hero-wrapper>
    <two-token-hero
      v-if="loaded"
      :tokenOneSymbol.sync="token1Symbol"
      :tokenOneAmount.sync="token1Amount"
      :tokenOneBalance="displayedToken1Balance"
      :tokenOneImg="selectedNetworkToken.img"
      :tokenTwoSymbol.sync="token2Symbol"
      :tokenTwoAmount.sync="token2Amount"
      :tokenTwoBalance="displayedToken2Balance"
      :tokenTwoImg="selectedToken.img"
      :tokenOneChoices="networkChoices"
      :tokenTwoChoices="tokenChoices"
    >
      <div>
        <div v-if="calculationsAvailable" class="mb-3 mt-3">
          <span class="text-white font-size-sm">
            {{ networkTokenReward }}
          </span>
          <div class="text-white font-size-sm">
            {{ tokenReward }}
          </div>
          <div class="text-white font-size-sm">
            {{ networkTokenUsdReward }}
          </div>
        </div>
        <div v-else class="mb-3 mt-3">
          <span class="text-white font-size-sm">
            Enter initial liquidity...
          </span>
        </div>
        <b-form-spinbutton
          :formatter-fn="feeFormatter"
          min="0"
          max="3"
          step="0.2"
          id="sb-inline"
          size="sm"
          v-model="fee"
          placeholder="Fee"
        ></b-form-spinbutton>
        <div class="create">
          <b-btn
            @click="createRelay"
            variant="success"
            v-ripple
            class="px-4 py-2 d-block create"
            :disabled="!createPoolReady"
          >
            <font-awesome-icon icon="plus" fixed-width class="mr-2" />
            <span class="font-w700">Create Pool</span>
          </b-btn>
        </div>
        <modal-tx
          title="Create Pool"
          v-model="txModal"
          :busy="txBusy"
          @input="cleanUpAfterTx"
        >
          <token-swap
            :error="error"
            :success="success"
            leftHeader="Network Token"
            :leftImg="selectedNetworkToken.img"
            :leftTitle="token1Symbol"
            :leftSubtitle="token1Amount"
            rightHeader="Listing token"
            :rightImg="selectedToken.img"
            :rightTitle="token2Symbol"
            :rightSubtitle="token2Amount"
          >
            <template v-slot:footer>
              <b-col cols="12" class="text-center">
                <h6 v-if="!success && !error">
                  Please proceed with your wallet to confirm this Transaction.
                </h6>
                <h6 v-else-if="error && !success" class="text-danger">
                  Error: {{ error }}
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
    </two-token-hero>
  </hero-wrapper>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import TwoTokenHero from "./TwoTokenHero.vue";
import TokenSwap from "@/components/common/TokenSwap.vue";
import ModalTx from "@/components/modals/ModalTx.vue";

@Component({
  components: {
    HeroWrapper,
    TwoTokenHero,
    TokenSwap,
    ModalTx
  }
})
export default class HeroConvert extends Vue {
  token1Symbol = "";
  token2Symbol = "";
  token1Amount = "";
  token2Amount = "";
  loaded = false;
  fee = null;

  error = "";
  success = "";
  txModal = false;
  txBusy = false;

  feeFormatter(fee: number) {
    return `${fee} %`;
  }

  cleanUpAfterTx() {
    this.error = "";
    this.success = "";
    this.token1Amount = "";
    this.token2Amount = "";

    if (this.success) {
      this.$router.push({ name: "Relays" });
      this.token2Symbol = this.tokenChoices.find(
        choice => choice.symbol !== this.token2Symbol
      )!.symbol;
    }
  }

  get createPoolReady() {
    return this.isAuthenticated && this.calculationsAvailable;
  }

  get networkTokenReward() {
    return `1 ${this.token1Symbol} = ${Number(this.token2Amount) /
      Number(this.token1Amount)} ${this.token2Symbol}`;
  }

  get tokenReward() {
    return `1 ${this.token2Symbol} = ${Number(this.token1Amount) /
      Number(this.token2Amount)} ${this.token1Symbol}`;
  }

  get calculationsAvailable() {
    return Number(this.token1Amount) && Number(this.token2Amount);
  }

  get networkTokenUsdReward() {
    return `1 ${this.token2Symbol} = ${(
      (Number(this.token1Amount) / Number(this.token2Amount)) *
      this.selectedNetworkToken.usdValue
    ).toFixed(4)} USD`;
  }

  get selectedNetworkToken() {
    const res = vxm.bancor.newNetworkTokenChoices.find(
      x => x.symbol == this.token1Symbol
    )!;
    return res;
  }

  get selectedToken() {
    return this.tokenChoices.find(x => x.symbol == this.token2Symbol)!;
  }

  get networkChoices() {
    return vxm.bancor.newNetworkTokenChoices;
  }

  get tokenChoices() {
    return vxm.bancor.newPoolTokenChoices(this.token1Symbol);
  }

  get displayedToken1Balance() {
    return this.selectedNetworkToken.balance;
  }

  get displayedToken2Balance() {
    return this.selectedToken.balance;
  }

  get isAuthenticated() {
    return vxm.wallet.isAuthenticated;
  }

  async createRelay() {
    const fee = this.fee || 0;
    this.txModal = true;
    this.txBusy = true;
    try {
      const txId = await vxm.bancor.createPool({
        reserves: [
          [this.token1Symbol, this.token1Amount],
          [this.token2Symbol, this.token2Amount]
        ],
        fee: fee / 100
      });
      this.success = txId;
    } catch (e) {
      this.error = e.message;
    }
    this.txBusy = false;
  }

  created() {
    const networkTokenSymbol = vxm.bancor.newNetworkTokenChoices[0].symbol;
    this.token1Symbol = networkTokenSymbol;
    this.token2Symbol = this.tokenChoices[0].symbol;
    this.loaded = true;
  }
}
</script>

<style scoped lang="scss">
.create {
  margin-top: 15px;
}

.slide-fade-up-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-up-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-up-enter
/* .slide-fade-leave-active below version 2.1.8 */

 {
  transform: translateY(75px);
  opacity: 0;
}

.slide-fade-up-leave-to
/* .slide-fade-leave-active below version 2.1.8 */

 {
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
/* .slide-fade-leave-active below version 2.1.8 */

 {
  transform: translateY(-75px);
  opacity: 0;
}

.slide-fade-down-leave-to
/* .slide-fade-leave-active below version 2.1.8 */

 {
  transform: translateY(75px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to
/* .fade-leave-active below version 2.1.8 */

 {
  opacity: 0;
}
</style>
