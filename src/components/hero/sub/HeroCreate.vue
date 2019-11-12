<template>
  <hero-wrapper>
    <div>
      <b-row>
        <b-col md="12">
          <h1 class="text-white">List a Token</h1>
        </b-col>
      </b-row>
      <b-row>
        <b-col md="4">
          <transition name="slide-fade-down" mode="out-in">
            <div>
              <h3 class="text-white">Token Contract</h3>
              <b-form-input id="input-1" v-model="tokenContract" placeholder="eosio.token" trim></b-form-input>
            </div>
          </transition>
        </b-col>
        <b-col md="4" class="justify-content-center align-items-center" style="min-height: 230px">
          <transition name="fade" mode="out-in">
            <span>
              <h3 class="invisible">TECHDEBT</h3>
              <font-awesome-icon
                class="fa-2x text-white cursor"
                v-if="loading"
                icon="circle-notch"
                spin
              />
              <font-awesome-icon
                class="fa-2x text-white cursor align-self-center"
                v-else
                icon="question"
              />
              <div class="text-white" v-if="failedToFindToken">Failed to find token</div>
            </span>
          </transition>
        </b-col>
        <b-col md="4">
          <transition name="slide-fade-up" mode="out-in">
            <div>
              <h3 class="text-white">Token Symbol</h3>
              <b-form-input id="input-1" v-model="tokenSymbol" placeholder="EOS" trim></b-form-input>
            </div>
          </transition>
        </b-col>
      </b-row>
    </div>
  </hero-wrapper>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import { fetchTokenMeta, fetchTokenStats } from "@/api/helpers";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";

const debounce = require("lodash.debounce");

@Component({
  components: {
    HeroWrapper
  }
})
export default class HeroConvert extends Vue {
  public debouncedSuggestPrecision: any;

  tokenSymbol = "";
  tokenContract = "";
  failedToFindToken = false;
  loading = false;

  @Watch("tokenSymbol")
  @Watch("tokenContract")
  onContractChange() {
    if (this.tokenSymbol && this.tokenContract) {
      this.debouncedSuggestPrecision();
    }
  }

  createSmartTokenSymbol(ticker1: string, ticker2: string) {
    const maxSymbolLength = 7;
    if (ticker1.length + ticker2.length <= maxSymbolLength) {
      return ticker1 + ticker2;
    } else {
      return ticker1 + ticker2[0] + ticker2[2] + ticker2[3];
    }
  }

  async fetchPrecision(
    tokenContract: string,
    tokenSymbolName: string
  ): Promise<number> {
    const { max_supply } = await fetchTokenStats(
      this.tokenContract,
      this.tokenSymbol
    );
    return max_supply.symbol.precision;
  }

  async fetchImage(imageUrl: string) {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.onload = () => {
        resolve();
      };
      img.src = imageUrl;
    });
  }

  async suggestPrecision() {
    const contractName = this.tokenContract;
    const symbol = this.tokenSymbol;
    this.loading = true;

    try {
      const precision = await this.fetchPrecision(
        this.tokenContract,
        this.tokenSymbol
      );
      this.failedToFindToken = false;

      const smartTokenSymbol = this.createSmartTokenSymbol(
        "BNT",
        this.tokenSymbol
      );

      // ToDo: Make sure a relay doesn't already exist, if so redirect.
      const relayAlreadyExists = false;
      if (relayAlreadyExists)
        throw new Error(
          "Relay already exists, I should point this out to the user."
        );

      try {
        const metaData = await fetchTokenMeta(
          this.tokenContract,
          this.tokenSymbol
        );
        await this.fetchImage(metaData.logo);
      } catch (e) {}

      this.loading = false;

      vxm.relay.draftNewRelay({
        smartTokenSymbol,
        precision: String(precision),
        symbolName: symbol,
        tokenContract: contractName
      });

      vxm.general.setHeroAction("relay");
      this.$router.push({
        name: "Relay",
        params: { account: smartTokenSymbol, isDraft: "yes" }
      });
    } catch (e) {
      this.failedToFindToken = true;
      this.loading = false;
    }
  }

  async created() {
    this.debouncedSuggestPrecision = debounce(() => {
      this.suggestPrecision();
    }, 500);
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
