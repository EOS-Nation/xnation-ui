<template>
  <div>
    <b-row>
      <b-col md="4">
        <transition name="slide-fade-down" mode="out-in">
          <token-amount-input toggle :status="token1Enabled" v-on:toggle="token1Enabled = !token1Enabled" :amount.sync="token1Amount" :symbol="token1Symbol" :balance="token1UserBalance" :img="token1Img" />
        </transition>
      </b-col>
      <b-col md="4" class="d-flex justify-content-center align-items-end" style="min-height: 230px">
        <div>
          <transition name="fade" mode="out-in">
            <font-awesome-icon icon="exchange-alt" class="fa-2x text-white cursor" :spin="spinning" @click="swapTokens()" />
          </transition>
          <div class="mb-3 mt-3">
            <div class="text-white font-size-sm">
              1 {{ token1Symbol }} =
              <span v-if="!rateLoading && !loadingTokens">{{ rate }}</span>
              <span v-else>
                <font-awesome-icon icon="circle-notch" spin />
              </span>
              {{ simpleReward }}
            </div>
            <div v-if="!relayExists" class="text-white font-size-sm">
              Fee: {{ fee }} %
            </div>
          </div>
          <div class="d-flex justify-content-center">
            <b-btn @click="toggleMain()" v-if="!relayExists" variant="success" v-ripple class="px-4 py-2 d-block" :disabled="loadingTokens || minReturn === ''">
              <font-awesome-icon :icon="loadingTokens ? 'circle-notch' : 'plus'" :spin="loadingTokens" fixed-width class="mr-2" />
              <span class="font-w700">Create Relay</span>
            </b-btn>
            <b-dropdown v-else button @click="toggleMain" variant="success" split text="Add Liquidity" class="m-2" size="lg">
              <template v-slot:button-content>
                <font-awesome-icon :icon="loadingTokens ? 'circle-notch' : 'sync-alt'" :spin="loadingTokens" fixed-width class="mr-2" />
                <span class="font-w700">{{ 'Add Liquidity' }}</span>
              </template>
              <b-dropdown-item-button>Remove Liquidity</b-dropdown-item-button>
              <b-dropdown-item href="#">Update Fee</b-dropdown-item>
              <b-dropdown-divider></b-dropdown-divider>
              <b-dropdown-item-button variant="warning" @click="toggleRelay">Pause Relay</b-dropdown-item-button>
            </b-dropdown>
          </div>
        </div>
      </b-col>
      <b-col md="4">
        <transition name="slide-fade-up" mode="out-in">
          <token-amount-input toggle :status="token2Enabled" v-on:toggle="token2Enabled = !token2Enabled" :amount.sync="token2Amount" :symbol="token2Symbol" :balance="token2UserBalance" :img="token2Img" />
        </transition>
      </b-col>
    </b-row>
    <modal-select-all />
    <modal-select-token />
    <modal-select-relays />
    <modal-convert-liquidity />
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import HeroConvertRelay from "@/components/convert/HeroConvertRelay.vue";
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";
import { fetchTokenMeta } from "@/api/helpers";
import * as bancorx from "@/assets/_ts/bancorx";
import numeral from "numeral";
import ModalSelectAll from "@/components/modals/ModalSelectAll.vue";
import ModalConvertLiquidity from "@/components/modals/ModalConvertLiquidity.vue";
import ModalSelectToken from "@/components/modals/ModalSelectToken.vue";
import ModalSelectRelays from "@/components/modals/ModalSelectRelays.vue";
import { calculateReturn } from "bancorx";
import { split, Asset } from "eos-common";
import { multiContract } from "../../api/multiContractTx";
import { transfer } from "../../store/modules/transfer";

@Component({
  components: {
    ModalSelectRelays,
    ModalSelectAll,
    ModalSelectToken,
    ModalConvertLiquidity,
    HeroConvertRelay,
    TokenAmountInput
  }
})
export default class HeroConvert extends Vue {
  // data
  ltr = true;
  rate = "";
  rateLoading = false;
  numeral = numeral;
  spinning = false;
  loadingTokens = false;
  token1Amount = "";
  token2Amount = "";
  token1Img =
  "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/128x128/plain/symbol_questionmark.png";
  token2Img =
  "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/128x128/plain/symbol_questionmark.png";

  // computed


  get token1Symbol() {
    return vxm.relay.token1SymbolName;
  }

  get token1Balance() {
    return vxm.relay.token1Balance;
  }

  get token1UserBalance() {
    return vxm.relay.token1UserBalance;
  }

  get token2UserBalance() {
    return vxm.relay.token2UserBalance;
  }

  get token1Enabled() {
    return vxm.relay.token1Enabled;
  }

  get token2Enabled() {
    return vxm.relay.token2Enabled;
  }

  get token1Contract() {
    return vxm.relay.token1Contract;
  }

  get relayExists() {
    return vxm.relay.relayExists;
  }

  get fee() {
    return vxm.relay.fee
  }

  get token2Contract() {
    return vxm.relay.token2Contract;
  }

  get token2Symbol() {
    return vxm.relay.token2SymbolName;
  }

  get token2Balance() {
    return vxm.relay.token2Balance;
  }

  get hasLaunched() {
    return vxm.relay.launched;
  }

  get currentRoute() {
    return this.$route.name;
  }

  set token1Enabled(status: boolean) {
    vxm.relay.setToken1Enabled(status)
  }

  set token2Enabled(status: boolean) {
    vxm.relay.setToken2Enabled(status)
  }

  get simpleReward() {
    const token1 = split(this.token1Balance);
    const token2 = split(this.token2Balance);
    const oneAmount = Math.pow(10, token1.symbol.precision);
    const reward = calculateReturn(
      token1,
      token2,
      new Asset(oneAmount, token1.symbol)
    );
    return `${reward.toNumber().toFixed(4)} ${reward.symbol.code()}`;
  }

  updatePercentage(amount: number) {
    console.log("Received", amount);
  }

  async toggleRelay() {
    await multiContract.enableConversion(this.$route.params.account, !vxm.relay.enabled);
    await vxm.relay.refreshReserves();
  }

  async toggleMain() {
    const token1RelayBalance = split(this.token1Balance);
    const token2RelayBalance = split(this.token2Balance);
    const token1NumberAmount =
      Math.pow(10, token1RelayBalance.symbol.precision) *
      Number(this.token1Amount);
    const token1Asset = new Asset(
      token1NumberAmount,
      token1RelayBalance.symbol
    );
    const token2NumberAmount =
      Math.pow(10, token2RelayBalance.symbol.precision) *
      Number(this.token2Amount);
    const token2Asset = new Asset(
      token2NumberAmount,
      token2RelayBalance.symbol
    );

    await multiContract.addLiquidity(this.$route.params.account, [
      {
        contract: this.token1Contract,
        amount: token1Asset
      },
      {
        contract: this.token2Contract,
        amount: token2Asset
      }
    ]);
  }

  // methods
  swapTokens() {
    this.ltr = !this.ltr;
    this.spinning = true;
    setTimeout(() => {
      this.spinning = false;
    }, 1000);
    vxm.liquidity.swapSelection();
    vxm.liquidity.calcMinReturn();
  }

  async fetchTokenMeta() {
    const [token1, token2] = await Promise.all([
      fetchTokenMeta(this.token1Contract, this.token1Symbol),
      fetchTokenMeta(this.token2Contract, this.token2Symbol)
    ]);
    this.token1Img = token1.logo;
    this.token2Img = token2.logo;
  }

  async created() {
    // await vxm.relay.initSymbol(this.$route.params.account);
    console.log('Hero Relay created', 'Token1 is', this.token1Contract, 'token2 is', this.token2Contract)
    this.fetchTokenMeta();
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
