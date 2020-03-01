<template>
  <span>
    <transition
      :name="invertAnimation ? `slide-fade-up` : `slide-fade-down`"
      mode="out-in"
    >
      <token-amount-input
        :key="symbol"
        :amount.sync="tokenAmount"
        :balance="balance"
        :img="img"
        :symbol="symbol"
        dropdown
        @dropdown="promptModal"
        @click="promptModal"
      />
    </transition>
    <modal-select v-model="modal" :tokens="tokens" @onSelect="selectToken" />
  </span>
</template>
<script lang="ts">
import { Prop, Component, Vue, PropSync, Watch } from "vue-property-decorator";
import { vxm } from "@/store";
import ModalSelect from "@/components/modals/ModalSelect.vue";
import TokenAmountInput from "@/components/convert/TokenAmountInput.vue";

@Component({
  components: {
    ModalSelect,
    TokenAmountInput
  }
})
export default class TokenField extends Vue {
  @PropSync("amount", { type: String }) tokenAmount!: string;
  @PropSync("symbol", { type: String }) currentSymbol!: string;
  @Prop(String) balance!: string;
  @Prop(Boolean) loading?: boolean;
  @Prop({ default: "Available:" }) readonly label!: string;
  @Prop(Array) tokens?: any[];
  @Prop(String) img!: string;
  @Prop(String) symbol!: string;
  @Prop(Boolean) invertAnimation?: boolean;

  modal = false;


  @Watch("amount")
  x(x: string) {
    console.log(x)
    console.count('Amount')
  }

  selectToken(symbolName: string) {
    this.modal = false;
    this.currentSymbol = symbolName;
  }

  promptModal() {
    this.modal = true;
  }
}
</script>

<style lang="scss" scoped></style>
