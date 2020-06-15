<template>
  <b-container>
    <b-row>
      <b-col md="4">
        <token-field
          :tokenId.sync="idOne"
          :symbol="tokenOneSymbol"
          :amount.sync="amountOne"
          :clickable="tokenOneClickable"
          @clicked="tokenOneClicked"
          :balance="tokenOneBalance"
          :img="tokenOneImg"
          :choices="tokenOneChoices || choices"
          :label="label"
          :error="tokenOneError"
          :errors="tokenOneErrors"
          :warnBalance="warnBalance"
        />
      </b-col>
      <b-col
        md="4"
        class="d-flex justify-content-center align-items-center"
        style="min-height: 230px"
      >
        <slot></slot>
      </b-col>
      <b-col md="4">
        <token-field
          :tokenId.sync="idTwo"
          :symbol="tokenTwoSymbol"
          :amount.sync="amountTwo"
          :clickable="tokenTwoClickable"
          @clicked="tokenTwoClicked"
          :balance="tokenTwoBalance"
          :img="tokenTwoImg"
          :choices="tokenTwoChoices || choices"
          :label="label"
          :error="tokenTwoError"
          :errors="tokenTwoErrors"
          :warnBalance="warnBalance"
        />
      </b-col>
    </b-row>
  </b-container>
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

interface TokenMeta {
  balance?: number;
  symbol: string;
  errors?: string[];
  error?: string;
  img: string;
  choices?: any[];
}

@Component({
  components: {
    TokenField
  }
})
export default class HeroConvert extends Vue {
  @PropSync("tokenOneId", { type: String }) idOne!: string;
  @Prop(Object) tokenOneMeta!: TokenMeta;
  @Prop(Object) tokenTwoMeta!: TokenMeta;
  @PropSync("tokenOneAmount", { type: String }) amountOne!: string;
  @PropSync("tokenTwoId", { type: String }) idTwo!: string;
  @PropSync("tokenTwoAmount", { type: String }) amountTwo!: string;
  @Prop(String) label?: string;

  @Prop(Array) choices?: any[];
  @Prop({ default: false }) warnBalance?: boolean;

  modal = false;

  @Emit()
  tokenOneClicked() {}

  @Emit()
  tokenTwoClicked() {}

  get tokenOneChoices() {
    return this.tokenOneMeta.choices;
  }

  get tokenTwoChoices() {
    return this.tokenTwoMeta.choices;
  }

  get tokenOneClickable() {
    return (
      (this.tokenOneChoices && this.tokenOneChoices.length > 0) ||
      (this.choices && this.choices.length > 0)
    );
  }

  get tokenTwoClickable() {
    return (
      (this.tokenTwoChoices && this.tokenTwoChoices.length > 0) ||
      (this.choices && this.choices.length > 0)
    );
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
