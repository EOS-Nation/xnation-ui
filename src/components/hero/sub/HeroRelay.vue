<template>
  <hero-wrapper>
    <div>
      <b-modal id="bv-modal-example" title="Update Fee" @ok="setFee">
        <div class="d-block text-center">
          <b-input-group append="%" class="mb-2 mr-sm-2 mb-sm-0">
            <b-input
              id="fee"
              placeholder="2"
              type="number"
              v-model="newFee"
            ></b-input>
          </b-input-group>
        </div>
      </b-modal>
      <b-row>
        <b-col md="4">
          <transition name="slide-fade-down" mode="out-in">
            <token-amount-input
              :key="token1Symbol"
              @toggle="toggleToken(1)"
              :toggle="isAdmin"
              :status="token1Enabled"
              :amount.sync="token1Amount"
              :symbol="token1Symbol"
              :balance="token1UserBalance"
              :img="token1Img"
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
                :spin="spinning"
                @click="swapTokens()"
              />
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
              <div class="text-white font-size-sm">Fee: {{ fee }} %</div>
            </div>
            <div class="d-flex justify-content-center">
              <b-dropdown
                button
                :disabled="!isAuthenticated"
                @click="toggleMain"
                variant="success"
                split
                class="m-2"
                size="lg"
              >
                <template v-slot:button-content>
                  <font-awesome-icon
                    :icon="
                      loadingTokens
                        ? 'circle-notch'
                        : !enabled
                        ? 'play'
                        : buttonFlipped
                        ? 'arrow-down'
                        : 'arrow-up'
                    "
                    :spin="loadingTokens"
                    fixed-width
                    class="mr-2"
                  />
                  <span class="font-w700">{{
                    !enabled
                      ? "Resume Relay"
                      : buttonFlipped
                      ? "Remove Liquidity"
                      : "Add Liquidity"
                  }}</span>
                </template>
                <b-dropdown-item-button
                  v-if="enabled"
                  @click="buttonFlipped = !buttonFlipped"
                  >{{
                    buttonFlipped ? "Add Liquidity" : "Remove Liquidity"
                  }}</b-dropdown-item-button
                >
                <b-dropdown-divider
                  v-if="isAdmin && enabled"
                ></b-dropdown-divider>
                <b-dropdown-item-button
                  v-if="isAdmin"
                  @click="$bvModal.show('bv-modal-example')"
                  >Update Fee</b-dropdown-item-button
                >
                <b-dropdown-item-button
                  v-if="isAdmin && enabled"
                  variant="warning"
                  @click="toggleRelay"
                >
                  Pause Relay
                </b-dropdown-item-button>
              </b-dropdown>
            </div>
          </div>
        </b-col>
        <b-col md="4">
          <transition name="slide-fade-up" mode="out-in">
            <token-amount-input
              @toggle="toggleToken(2)"
              :toggle="isAdmin"
              :key="token2Symbol"
              :status="token2Enabled"
              :amount.sync="token2Amount"
              :symbol="token2Symbol"
              :balance="token2UserBalance"
              :img="token2Img"
            />
          </transition>
        </b-col>
      </b-row>
      <modal-select-all />
      <modal-select-token />
      <modal-select-relays />
      <modal-convert-liquidity />
    </div>
  </hero-wrapper>
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
import { split, Asset, Symbol } from "eos-common";
import { multiContract } from "@/api/multiContractTx";
import wait from "waait";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import { tableApi } from "@/api/TableWrapper";
import { getBalance } from "@/api/helpers";

@Component({
  components: {
    ModalSelectRelays,
    ModalSelectAll,
    ModalSelectToken,
    ModalConvertLiquidity,
    HeroConvertRelay,
    TokenAmountInput,
    HeroWrapper
  }
})
export default class HeroConvert extends Vue {
  // data
  ltr = true;
  focusedSymbol = ""
  rate = "";
  rateLoading = false;
  numeral = numeral;
  spinning = false;
  loadingTokens = false;
  newFee = "";
  token1Amount = "";
  token2Amount = "";
  token1Symbol = "";
  token1Balance = "";
  token1Enabled = false;
  token2Balance = "";
  token1Contract = "";
  token1UserBalance = "";
  token2Symbol = "";
  token2Contract = "";
  token2UserBalance = "";
  token1Precision = 0;
  token2Precision = 0;
  token2Enabled = false;
  enabled = false;
  owner = "";
  fee = "";
  buttonFlipped = false;
  token1Img =
    "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/128x128/plain/symbol_questionmark.png";
  token2Img =
    "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/128x128/plain/symbol_questionmark.png";

  // computed

  async toggleToken(tokenNo: number) {
    const symbol =
      tokenNo == 1
        ? new Symbol(this.token1Symbol, this.token1Precision)
        : new Symbol(this.token2Symbol, this.token2Precision);

    try {
      await multiContract.toggleReserve(this.focusedSymbol, symbol);
      if (tokenNo == 1) {
        this.token1Enabled = !this.token1Enabled;
      } else {
        this.token2Enabled = !this.token2Enabled;
      }
      await wait(700);
    } catch (e) {
      // handle error
    }
    this.fetchRelay();
  }

  get isAuthenticated() {
    return (
      // @ts-ignore
      vxm.eosTransit.isAuthenticated && vxm.eosTransit.wallet.auth.accountName
    );
  }

  get isAdmin() {
    return (
      this.isAuthenticated &&
      // @ts-ignore
      this.owner == vxm.eosTransit.wallet.auth.accountName
    );
  }

  get simpleReward() {
    if (!this.token1Balance && !this.token2Balance) return "";
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

  async toggleRelay() {
    try {
      await multiContract.enableConversion(
        this.focusedSymbol,
        !this.enabled
      );
      this.enabled = !this.enabled;
      await wait(700);
      this.fetchRelay();
    } catch (e) {}
  }

  async toggleMain() {
    if (this.enabled) {
      if (this.buttonFlipped) {
        this.removeLiquidity();
      } else {
        this.addLiquidity();
      }
    } else {
      this.toggleRelay();
    }
  }

  async removeLiquidity() {}

  async addLiquidity() {
    const token1NumberAmount =
      Math.pow(10, this.token1Precision) * Number(this.token1Amount);
    const token1Asset = new Asset(
      token1NumberAmount,
      new Symbol(this.token1Symbol, this.token1Precision)
    );
    const token2NumberAmount =
      Math.pow(10, this.token2Precision) * Number(this.token2Amount);
    const token2Asset = new Asset(
      token2NumberAmount,
      new Symbol(this.token2Symbol, this.token2Precision)
    );

    const tokens = [
      {
        contract: this.token1Contract,
        amount: token1Asset
      },
      {
        contract: this.token2Contract,
        amount: token2Asset
      }
    ];

    try {
      await multiContract.addLiquidity(this.focusedSymbol, tokens);
      await wait(700);
      this.fetchRelay();
    } catch (e) {
      console.warn("Error creating transaction", e);
    }
  }

  // methods
  swapTokens() {
    this.spinning = true;
    setTimeout(() => {
      this.spinning = false;
    }, 1000);
  }

  async fetchTokenMeta() {
    const [token1, token2] = await Promise.all([
      fetchTokenMeta(this.token1Contract, this.token1Symbol),
      fetchTokenMeta(this.token2Contract, this.token2Symbol)
    ]);
    this.token1Img = token1.logo;
    this.token2Img = token2.logo;
  }

  async fetchRelay() {
    const symbolName = this.focusedSymbol
    // Fetch relay information
    const [settings, reserves] = await Promise.all([
      tableApi.getSettingsMulti(symbolName),
      tableApi.getReservesMulti(symbolName)
    ]);
    const sortedReserves = reserves.sort((a, b) =>
      a.contract === "bntbntbntbnt" && a.balance.symbol.code() === "BNT"
        ? 1
        : -1
    );

    const [token1, token2] = sortedReserves;
    this.token1Contract = token1.contract;
    this.token1Symbol = token1.balance.symbol.code();
    this.token1Precision = token1.balance.symbol.precision;
    this.token1Balance = token1.balance.toString();
    this.token1Enabled = token1.sale_enabled;
    this.token2Enabled = token2.sale_enabled;
    this.token2Balance = token2.balance.toString();
    this.token2Contract = token2.contract;
    this.token2Symbol = token2.balance.symbol.code();
    this.token2Precision = token2.balance.symbol.precision;
    this.fee = String(settings.fee / 1000000);
    this.owner = settings.owner;
    this.enabled = settings.enabled;

    // @ts-ignore
    this.fetchTokenMeta();
    if (vxm.eosTransit.isAuthenticated) this.fetchUserBalances();
  }

  async setFee() {
    console.log("fee set triggered", this.newFee);
    try {
      await multiContract.updateFee(
        this.focusedSymbol,
        Number(this.newFee)
      );
      this.fee = this.newFee
      await wait(700);
      this.fetchRelay();
    } catch (e) {

    }

  }

  async fetchUserBalances() {
    const [token1Balance, token2Balance] = await Promise.all([
      getBalance(this.token1Contract, this.token1Symbol),
      getBalance(this.token2Contract, this.token2Symbol)
    ]);
    this.token1UserBalance = token1Balance;
    this.token2UserBalance = token2Balance;
  }

  @Watch("isAuthenticated")
  onAuthChange(val: any) {
    if (val) this.fetchUserBalances();
  }

  @Watch("focusedSymbol")
  onSymbolChange() {
    this.fetchRelay()
  }

  @Watch("$route")
  listen(to: any) {
    this.focusedSymbol = to.params.account;
  }

  async created() {
    this.focusedSymbol = this.$route.params.account || vxm.relays.relays[0].settings.currency.split(',')[1]
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
