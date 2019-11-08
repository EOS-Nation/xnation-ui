<template>
  <div>
    <div>
      <img @click="pressed" class="img-avatar img-avatar-thumb cursor border-colouring" :src="img" alt="Token Logo" />
      <div @click="pressed" class="font-size-lg text-white mt-3 mb-3 cursor">{{ symbol }}</div>
      <b-input-group class="mt-1">
        <b-form-input type="number" :value="amount" @update="onTextUpdate" class="form-control-alt" placeholder="Enter Amount"></b-form-input>
        <b-input-group-append>
          <b-button>{{ symbol }}</b-button>
          <b-button v-if="toggle" :variant="status ? 'success' : 'danger'" @click="toggleStatus">
            <font-awesome-icon icon="power-off" />
          </b-button>
        </b-input-group-append>
      </b-input-group>
      <div>
        <span class="text-white font-size-sm" style="min-height: 50px">
          <div>
            Available:
            <span v-if="loadingBalance">
              <font-awesome-icon icon="circle-notch" class="text-white" spin />
            </span>
            <span v-else>{{ numeral(balance).format('0,0[.][0000]') }}</span>
          </div>
          <div v-if="balance > 0" class="text-white-50 cursor">
            <span @click="setPercentage(10)">10%</span>
            -
            <span @click="setPercentage(25)">25%</span>
            -
            <span @click="setPercentage(50)">50%</span>
            -
            <span @click="setPercentage(100)">100%</span>
          </div>
        </span>
      </div>
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

@Component({
  components: {}
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

  // Lifecycle hooks
  async created() { }
  mounted() { }
  updated() { }
  destroyed() { }
}
</script>

<style lang="scss" scoped>

</style>
