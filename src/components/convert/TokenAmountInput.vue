<template>
  <div v-if="small" class="d-flex align-items-center p-4">
    <div class="cursor" @click="dropdownEvent">
      <img class="img-avatar img-avatar-thumb" :src="img" alt="Token Logo" />
    </div>
    <div class="ml-4 text-left">
      <h3 @click="dropdownEvent" class="mb-0 mt-0 text-white cursor">
        {{ symbol }}
      </h3>
      <b-input-group class="mt-1">
        <b-form-input :value="amount" @update="onTextUpdate" class="form-control-alt" placeholder="Enter Amount"></b-form-input>
        <b-input-group-append>
          <b-button v-if="dropdown" @click="dropdownEvent">
            {{ symbol }}
            <font-awesome-icon icon="angle-down" />
          </b-button>
          <b-button v-else>{{ symbol }}</b-button>
        </b-input-group-append>
      </b-input-group>
    </div>
  </div>

  <div v-else>
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
          <b-button v-if="toggle" :variant="status ? 'success' : 'danger'" @click="toggleStatus" v-b-tooltip.hover :title="status ? 'Sale is Enabled' : 'Sale is Disabled'">
            <font-awesome-icon icon="power-off" />
          </b-button>
        </b-input-group-append>
      </b-input-group>
      <percentages :balance="balance" :amount.sync="amount" :loading="loadingBalance" />
    </div>
  </div>
</template>

<script lang="ts">
import { Prop, Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import debounce from "lodash.debounce";
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
  @Prop(String) amount!: number;
  @Prop(String) balance!: string;
  @Prop(String) img!: string;
  @Prop(String) readonly symbol!: string;
  @Prop(Boolean) loadingBalance?: boolean;
  @Prop(Boolean) status?: boolean
  @Prop(Boolean) toggle?: boolean
  @Prop(Boolean) dropdown?: boolean
  @Prop(Boolean) small?: boolean

  // data

  // computed

  // method

  @Watch("amount")
  listen() {
    this.$emit("update:amount", String(this.amount));
  }

  onTextUpdate(input: string) {
    this.amount = Number(input);
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
