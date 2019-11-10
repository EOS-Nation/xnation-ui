<template>
  <div>
    <div>
      <img @click="pressed" class="img-avatar img-avatar-thumb cursor border-colouring" :src="img" alt="Token Logo" />
      <div @click="pressed" class="font-size-lg text-white mt-3 mb-3 cursor">{{ symbol }}</div>
      <b-input-group class="mt-1">
        <b-form-input type="number" :value="amount" @update="onTextUpdate" class="form-control-alt" placeholder="Enter Amount"></b-form-input>
        <b-input-group-append>
          <b-button v-if="dropdown" @click="dropdownEvent">
            {{ symbol }}
            <font-awesome-icon icon="angle-down" />
          </b-button>
          <b-button v-else>{{ symbol }}</b-button>
          <b-button v-if="toggle" :variant="status ? 'success' : 'danger'" @click="toggleStatus">
            <font-awesome-icon icon="power-off" />
          </b-button>
        </b-input-group-append>
      </b-input-group>
      <percentages :balance="balance" :amount.sync="amount" />
    </div>
  </div>
</template>

<script lang="ts">
import { Prop, Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import debounce from "lodash.debounce";
import numeral from "numeral";
import { TokenInfo } from "@/assets/_ts/bancorx";
import * as bancorx from "@/assets/_ts/bancorx";
import Percentages from './Percentages.vue'

@Component({
  components: {
    Percentages
  }
})
export default class TokenAmountInput extends Vue {
  // props
  @Prop(String) amount!: string;
  @Prop(String) balance!: string;
  @Prop(String) img!: string;
  @Prop(String) readonly symbol!: string;
  @Prop(Boolean) loadingBalance: boolean = false;
  @Prop(Boolean) status?: boolean
  @Prop(Boolean) toggle?: boolean
  @Prop(Boolean) dropdown: boolean

  // data
  numeral = numeral;

  // computed

  // method
  setPercentage(percentage: number) {
    const numberAmount = Number(this.balance) * (percentage / 100);
    this.$emit("update:amount", String(numberAmount));
  }

  onTextUpdate(input: string) {
    this.$emit("update:amount", input);
  }

  toggleStatus() {
    this.$emit("toggle");
  }

  pressed() {
    this.$emit('click');
  }

  dropdownEvent() {
    this.$emit("dropdown")
  }

  // Lifecycle hooks
  async created() { }
  mounted() { }
  updated() { }
  destroyed() { }
}
</script>

<style lang="scss" scoped>

</style>
