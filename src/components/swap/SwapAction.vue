<template>
  <div>
    <token-input-field
      label="From"
      :amount.sync="amount1"
      @update:amount="updatePriceReturn"
      :token="token1"
      :balance="balance1"
      :dropdown="true"
      name="token1"
      v-on:open-swap-modal="openModal"
    />
    <modal-swap-select name="token1" />

    <div class="text-center my-3">
      <font-awesome-icon
        icon="exchange-alt"
        rotation="90"
        class="text-primary font-size-16"
      />
    </div>

    <token-input-field
      label="To (Estimated)"
      :amount.sync="amount2"
      @update:amount="updatePriceCost"
      :token="token2"
      :balance="balance2"
      :dropdown="true"
      name="token2"
      v-on:open-swap-modal="openModal"
    />
    <modal-swap-select name="token2" />

    <div class="my-3">
      <label-content-split
        v-if="slippage !== null"
        label="Slippage"
        :value="slippage"
      />
      <label-content-split v-if="fee !== null" label="Slippage" :value="fee" />
    </div>

    <main-button
      @click.native="$bvModal.show('modal-swap-action')"
      label="Continue"
      :active="true"
      :large="true"
    />

    <modal-swap-action
      :token1="token1"
      :token2="token2"
      :amount1="amount1"
      :amount2="amount2"
      :advanced-block-items="advancedBlockItems"
    />
  </div>
</template>

<script lang="ts">
import { Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import MainButton from "@/components/common/Button.vue";
import TokenInputField from "@/components/common-v2/TokenInputField.vue";
import { ViewReserve, ViewToken } from "@/types/bancor";
import ModalSwapSelect from "@/components/swap/ModalSwapSelect.vue";
import LabelContentSplit from "@/components/common-v2/LabelContentSplit.vue";
import { compareString, findOrThrow } from "@/api/helpers";
import ModalSwapAction from "@/components/swap/ModalSwapAction.vue";

@Component({
  components: {
    ModalSwapAction,
    LabelContentSplit,
    ModalSwapSelect,
    TokenInputField,
    MainButton
  }
})
export default class SwapAction extends Vue {
  amount1 = "";
  amount2 = "";

  balance1 = "";
  balance2 = "";

  token1: ViewToken = vxm.bancor.tokens[0];
  token2: ViewToken = vxm.bancor.tokens[1];

  slippage: number | null = null;
  fee: string | null = null;

  errorToken1 = "";
  errorToken2 = "";

  get advancedBlockItems() {
    return [
      {
        label: "Price",
        value: "??.??"
      },
      {
        label: "Minimum Received",
        value: "??.??"
      },
      {
        label: "Price Impact",
        value: "??.??"
      },
      {
        label: "Liquidity Provider Fee",
        value: "??.??"
      }
    ];
  }

  openModal(name: string) {
    this.$bvModal.show(name);
  }

  async updatePriceReturn(amount: string) {
    if (!amount || amount === "0") {
      this.setDefault();
      return;
    }
    try {
      const reward = await vxm.bancor.getReturn({
        from: {
          id: this.token1.id,
          amount: this.amount1
        },
        toId: this.token2.id
      });
      if (reward.slippage) {
        this.slippage = reward.slippage;
      }
      if (reward.fee) {
        this.fee = reward.fee;
      }
      this.amount2 = reward.amount;
      this.errorToken1 = "";
      this.errorToken2 = "";
    } catch (e) {
      this.errorToken2 = "";
      this.errorToken1 = e.message;
    }
  }

  setDefault() {
    this.amount1 = this.amount2 = "";
    this.fee = this.slippage = null;
  }

  async updatePriceCost(amount: string) {
    if (!amount || amount === "0") {
      this.setDefault();
      return;
    }
    try {
      const reward = await vxm.bancor.getCost({
        to: {
          id: this.token2.id,
          amount: this.amount2
        },
        fromId: this.token1.id
      });
      if (reward.slippage) {
        this.slippage = reward.slippage;
      }
      if (reward.fee) {
        this.fee = reward.fee;
      }
      this.amount1 = reward.amount;
      this.errorToken1 = "";
      this.errorToken2 = "";
    } catch (e) {
      this.errorToken1 = "";
      this.errorToken2 = e.message;
    }
  }

  async loadBalances() {
    this.balance1 = vxm.bancor.token(this.token1.id).balance;
    this.balance2 = vxm.bancor.token(this.token2.id).balance;
  }

  get darkMode() {
    return vxm.general.darkMode;
  }

  @Watch("$route.query")
  async onTokenChange(query: any) {
    try {
      this.token1 = await vxm.bancor.token(query.from);
    } catch (e) {
      console.log(e);
      this.token1 = vxm.bancor.tokens[0];
    }
    try {
      this.token2 = await vxm.bancor.token(query.to);
    } catch (e) {
      console.log(e);
      this.token2 = vxm.bancor.tokens[1];
    }
    await this.updatePriceReturn(this.amount1);
    await this.loadBalances();
  }

  async created() {
    if (this.$route.query.to && this.$route.query.from)
      await this.onTokenChange(this.$route.query);

    await this.loadBalances();
  }
}
</script>

<style scoped lang="scss"></style>
