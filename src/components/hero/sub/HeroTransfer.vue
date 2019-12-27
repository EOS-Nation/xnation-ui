<template>
  <hero-wrapper>
    <div>
      <b-row>
        <b-col md="4" class="text-center">
          <hero-convert-relay direction="from" />
        </b-col>
        <b-col
          md="4"
          class="d-flex justify-content-center align-items-end"
          style="min-height: 230px"
        >
          <div>
            <font-awesome-icon
              icon="long-arrow-alt-right"
              class="fa-2x text-white"
            />
            <div class="mb-3 mt-3">
              <span class="text-white font-size-sm">Value: {{ usdValue }}</span>
            </div>
            <div class="d-flex justify-content-center">
              <b-btn
                @click="initTransfer()"
                variant="info"
                v-ripple
                class="px-4 py-2 d-block"
              >
                <font-awesome-icon
                  icon="long-arrow-alt-right"
                  fixed-width
                  class="mr-2"
                />
                <span class="font-w700">TRANSFER</span>
              </b-btn>
            </div>
            <span @click="navConvert" class="cursor font-size-sm text-white-50">
              <font-awesome-icon icon="exchange-alt" fixed-width />CONVERT
            </span>
          </div>
        </b-col>
        <b-col md="4">
          <div>
            <div class="font-size-lg text-white">Recipient</div>
            <b-form-input
              v-model="recipient"
              class="form-control-alt mt-2"
              placeholder="enter account"
              list="contacts"
            ></b-form-input>
            <datalist id="contacts">
              <option v-for="(contact, index) in contactHistory" :key="index">
                {{ contact }}
              </option>
            </datalist>
          </div>
          <div class="mt-2">
            <div class="text-white">Memo</div>
            <b-form-textarea
              v-model="memo"
              placeholder="optional"
              class="mt-2"
              rows="2"
              max-rows="4"
            ></b-form-textarea>
          </div>
        </b-col>
      </b-row>
      <modal-select-all />
      <modal-transfer-token />
    </div>
  </hero-wrapper>
</template>

<script lang="ts">
import { Watch, Component, Vue, Prop } from "vue-property-decorator";
import { vxm } from "@/store";
import * as bancorx from "@/assets/_ts/bancorx";
import numeral from "numeral";
import ModalSelectAll from "@/components/modals/ModalSelectAll.vue";
import HeroConvertRelay from "@/components/convert/HeroConvertRelay.vue";
import ModalTransferToken from "@/components/modals/ModalTransferToken.vue";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";

@Component({
  components: {
    HeroWrapper,
    ModalSelectAll,
    ModalTransferToken,
    HeroConvertRelay
  }
})
export default class HeroTransfer extends Vue {
  // data
  availableBalance = "0";
  loadingBalance = false;
  numeral = numeral;
  contactHistory: string[] = [];
  @Prop(String) symbolName!: string;

  // computed
  get isAuthenticated() {
    return vxm.eosTransit.isAuthenticated;
  }

  get token() {
    return vxm.liquidity.fromToken;
  }

  get debouncedState() {
    return vxm.convert.debouncedState;
  }

  get heroAction() {
    return vxm.general.heroAction;
  }

  set heroAction(val) {
    vxm.general.setHeroAction(val);
  }

  async loadHistory() {
    let transferHistory = localStorage.getItem("transferHistory");
    if (transferHistory) {
      const contacts = JSON.parse(transferHistory);
      let array: string[] = [];
      for (const c of contacts) {
        if (
          !(
            array.length &&
            array.find((a: string) => {
              return a === c.to;
            })
          )
        )
          array.push(c.to);
      }
      this.contactHistory = array;
    }
  }

  get amount() {
    return vxm.transfer.amount;
  }
  set amount(val) {
    vxm.transfer.setAmount(val);
  }

  get recipient() {
    return vxm.transfer.transferTo;
  }
  set recipient(val) {
    vxm.transfer.setRecipient(val);
  }

  get memo() {
    return vxm.transfer.memo;
  }

  set memo(val) {
    vxm.transfer.setMemo(val);
  }

  get usdValue() {
    return numeral(0).format("$0,0.00");
  }

  setFromToken(symbolName: string) {
    const tokenInfo = bancorx.getTokenInfo(symbolName);
    if (tokenInfo) vxm.liquidity.setFromToken(tokenInfo);
  }

  @Watch("$route")
  listen(to: any) {
    this.setFromToken(to.params.symbolName);
  }

  // methods
  openSelectTokenModal() {
    this.$bvModal.show("modal-select-relay");
  }

  setPercentage(p: number) {
    this.amount = ((parseFloat(this.availableBalance) * p) / 100).toString();
  }

  initTransfer() {
    if (!this.isAuthenticated) this.$bvModal.show("modal-login");
    else {
      this.amount = bancorx.tokenPrecision(this.token.symbol, this.amount);
      this.$bvModal.show("modal-transfer-token");
      let transferHistory = localStorage.getItem("transferHistory");
      const tx = {
        from: this.isAuthenticated,
        to: this.recipient,
        amount: this.amount,
        symbol: this.token.symbol,
        memo: this.memo
      };
      if (transferHistory) {
        let history = JSON.parse(transferHistory);
        history = history.concat([tx]);
        localStorage.setItem("transferHistory", JSON.stringify(history));
      } else localStorage.setItem("transferHistory", JSON.stringify([tx]));
      this.loadHistory();
    }
  }

  async loadBalance() {
    if (this.isAuthenticated) {
      this.loadingBalance = true;
      const balance = await vxm.wallet.availableBalance({
        symbol: this.token.symbol,
        reserve: false,
        account: this.isAuthenticated
      });
      this.loadingBalance = false;
      return balance;
    } else return "0";
  }

  @Watch("token")
  async onTokenChange(val: any, oldVal: any) {
    this.availableBalance = await this.loadBalance();
  }

  @Watch("isAuthenticated")
  async onAuthChange(val: any, oldVal: any) {
    this.availableBalance = await this.loadBalance();
  }

  navConvert() {
    this.$router.push({
      name: "Token",
      params: {
        symbolName: this.$route.params.symbolName || "EOS"
      }
    });
  }

  async created() {
    this.setFromToken(this.$route.params.symbolName);
    this.loadHistory();
    this.availableBalance = await this.loadBalance();
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
  transform: translateY(250px);
  opacity: 0;
}
.slide-fade-up-leave-to
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(-250px);
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
  transform: translateY(-250px);
  opacity: 0;
}
.slide-fade-down-leave-to
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateY(250px);
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
