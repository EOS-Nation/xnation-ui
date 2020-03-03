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
        :dropdown="clickable"
        @dropdown="clicked"
        @click="clicked"
      />
    </transition>
    <modal-select
      v-if="choices && choices.length > 0"
      v-model="modal"
      :tokens="choices"
      @onSelect="selectChoice"
    />
  </span>
</template>
<script lang="ts">
import {
  Prop,
  Component,
  Vue,
  PropSync,
  Watch,
  Emit
} from "vue-property-decorator";
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
  @Prop(String) img!: string;
  @Prop(String) symbol!: string;
  @Prop(Boolean) invertAnimation?: boolean;
  @Prop({ default: false }) readonly clickable?: boolean;
  @Prop(Array) readonly choices?: any[];

  modal = false;

  @Emit()
  clicked() {
    this.modal = true;
  }

  selectChoice(symbolName: string) {
    this.modal = false;
    this.currentSymbol = symbolName;
  }
}
</script>

<style lang="scss" scoped></style>
