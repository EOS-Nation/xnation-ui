<template>
  <div>
    <b-row>
      <b-col md="4">
        <token-field
          :symbol.sync="symbolOne"
          :amount.sync="amountOne"
          clickable
          @clicked="tokenOneClicked"
          :balance="tokenOneBalance"
          :img="tokenOneImg"
          :choices="tokenOneChoices || choices"
          :label="label"
          :error="tokenOneError"
        />
      </b-col>
      <b-col
        md="4"
        class="d-flex justify-content-center align-items-end"
        style="min-height: 230px"
      >
        <slot></slot>
      </b-col>
      <b-col md="4">
        <token-field
          :symbol.sync="symbolTwo"
          :amount.sync="amountTwo"
          clickable
          @clicked="tokenTwoClicked"
          :balance="tokenTwoBalance"
          :img="tokenTwoImg"
          :choices="tokenTwoChoices || choices"
          :label="label"
          :error="tokenTwoError"
        />
      </b-col>
    </b-row>
  </div>
</template>
<script lang="ts">
import {
  Watch,
  Prop,
  Component,
  Vue,
  Emit,
  PropSync
} from "vue-property-decorator";
import { vxm } from "@/store";
import TokenField from "@/components/convert/TokenField.vue";

@Component({
  components: {
    TokenField
  }
})
export default class HeroConvert extends Vue {
  @PropSync("tokenOneSymbol", { type: String }) symbolOne!: string;
  @PropSync("tokenOneAmount", { type: String }) amountOne!: string;
  @Prop(String) tokenOneBalance!: string;
  @Prop(String) tokenOneImg!: string;
  @Prop(String) tokenOneError?: string;
  @PropSync("tokenTwoSymbol", { type: String }) symbolTwo!: string;
  @PropSync("tokenTwoAmount", { type: String }) amountTwo!: string;
  @Prop(String) tokenTwoBalance!: string;
  @Prop(String) tokenTwoImg!: string;
  @Prop(String) label?: string;
  @Prop(String) tokenTwoError?: string;

  @Prop(Array) choices?: any[];
  @Prop(Array) tokenOneChoices?: any[];
  @Prop(Array) tokenTwoChoices?: any[];
  modal = false;

  @Emit()
  tokenOneClicked() {}

  @Emit()
  tokenTwoClicked() {}
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
