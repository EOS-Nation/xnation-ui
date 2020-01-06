<template>
  <hero-wrapper>
    <div>
      <b-row>
        <b-col md="4" class="text-center">
          <token-amount-input
            :key="focusedToken.symbol"
            :amount.sync="amount"
            :balance="tokenBalance"
            :img="focusedToken.logo"
            :symbol="focusedToken.symbol"
            dropdown
            @dropdown="promptModal"
            @click="promptModal"
            @onUpdate="tokenAmountChange"
          />
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
    </div>
  </hero-wrapper>
</template>

<script lang="ts">
import { Watch, Component, Vue, Prop } from "vue-property-decorator";
import { vxm } from "@/store";
import * as bancorx from "@/assets/_ts/bancorx";
import numeral from "numeral";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";

@Component({
  components: {
    HeroWrapper,
    TokenAmountInput
  }
})
export default class HeroTransfer extends Vue {
  loadingBalance = false;
  numeral = numeral;
  contactHistory: string[] = [];
  @Prop(String) symbolName!: string;

  amount = "";
  tokenBalance = "0";

  memo = "";
  recipient = "";

  promptModal() {
    console.log("prompt triggered");
  }

  tokenAmountChange(e: any) {
    console.log("token amount changed", e);
  }

  get isAuthenticated() {
    return vxm.eosTransit.isAuthenticated;
  }

  get focusedToken() {
    return vxm.relays.token(this.selectedSymbolOrDefault)!;
  }

  get token() {
    return ''
    // return vxm.liquidity.fromToken;
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

  get usdValue() {
    return numeral(0).format("$0,0.00");
  }

  // methods
  openSelectTokenModal() {
    this.$bvModal.show("modal-select-relay");
  }

  initTransfer() {
    if (!this.isAuthenticated) this.$bvModal.show("modal-login");
    else {
      this.$bvModal.show("modal-transfer-token");
      let transferHistory = localStorage.getItem("transferHistory");
      const tx = {
        from: this.isAuthenticated,
        to: this.recipient,
        amount: Number(this.amount).toFixed(this.focusedToken.precision),
        symbol: this.focusedToken.symbol,
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
    // if (this.isAuthenticated) {
    //   this.loadingBalance = true;
    //   const balance = await vxm.wallet.availableBalance({
    //     symbol: this.token.symbol,
    //     reserve: false,
    //     account: this.isAuthenticated
    //   });
    //   this.loadingBalance = false;
    //   return balance;
    // } else return "0";
  }

  get selectedSymbolOrDefault() {
    return this.$route.params.symbolName || this.defaultSymbolName;
  }

  get defaultSymbolName() {
    return vxm.relays.tokens.find(token => token.symbol !== "BNT")!.symbol;
  }

  navConvert() {
    this.$router.push({
      name: "Token",
      params: {
        symbolName: this.selectedSymbolOrDefault
      }
    });
  }

  async created() {
    this.loadHistory();
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
