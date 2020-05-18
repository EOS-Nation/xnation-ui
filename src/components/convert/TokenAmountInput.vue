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
        <b-form-input
          :value="amount"
          @update="onTextUpdate"
          class="form-control-alt"
          placeholder="Enter Amount"
        ></b-form-input>
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
      <img
        @click="click"
        class="img-avatar img-avatar-thumb cursor border-colouring"
        :src="img"
        alt="Token Logo"
      />
      <div @click="click" class="font-size-lg text-white mt-3 mb-3 cursor">
        {{ symbol }}
      </div>
      <b-input-group class="mt-1">
        <b-form-input
          type="number"
          debounce="500"
          v-model="tokenAmount"
          class="form-control-alt"
          placeholder="Enter Amount"
        ></b-form-input>
        <b-input-group-append>
          <b-button v-if="dropdown" @click="dropdownEvent">
            {{ symbol }}
            <font-awesome-icon icon="angle-down" />
          </b-button>
          <b-button v-else>{{ symbol }}</b-button>
          <b-button
            v-if="toggle"
            :variant="status ? 'success' : 'danger'"
            @click="toggleStatus"
            v-b-tooltip.hover
            :title="status ? 'Sale is Enabled' : 'Sale is Disabled'"
          >
            <font-awesome-icon icon="power-off" />
          </b-button>
        </b-input-group-append>
      </b-input-group>
      <balance-label :label="label" :balance="formattedBalance" />
      <percentages
        :v-if="balance"
        @percentUpdate="updatePercent"
        :balance="balance"
        :amount="amount"
        :loading="loadingBalance"
        :label="label"
      />
      <h4 class="error">
        <div class="error-list">
          <b-badge :key="error" v-for="error in errorsList" variant="danger">{{
            error
          }}</b-badge>
        </div>
      </h4>
    </div>
  </div>
</template>

<script lang="ts">
import {
  Prop,
  Watch,
  Component,
  Vue,
  PropSync,
  Emit
} from "vue-property-decorator";
import { vxm } from "@/store";
import debounce from "lodash.debounce";
import Percentages from "./Percentages.vue";
import BalanceLabel from "./BalanceLabel.vue";
import Big from "bignumber.js";

@Component({
  components: {
    Percentages,
    BalanceLabel
  }
})
export default class TokenAmountInput extends Vue {
  @PropSync("amount", { type: String }) tokenAmount!: string;
  @Prop(Number) balance!: number;
  @Prop(String) img!: string;
  @Prop(String) readonly symbol!: string;
  @Prop(Boolean) loadingBalance?: boolean;
  @Prop(Boolean) status?: boolean;
  @Prop(Boolean) toggle?: boolean;
  @Prop(Boolean) dropdown?: boolean;
  @Prop(Boolean) small?: boolean;
  @Prop(String) label?: string;
  @Prop(String) error?: string;
  @Prop(Array) errors?: string[];
  @Prop({ default: false }) warnBalance?: boolean;

  get errorsList() {
    return [
      ...(this.error ? [this.error] : []),
      ...(this.errors && this.errors.length > 0 ? [...this.errors] : []),
      ...(this.warnBalance && this.insufficientBalance
        ? ["Insufficient Balance"]
        : [])
    ];
  }

  get insufficientBalance() {
    return Number(this.tokenAmount) > this.balance;
  }

  updatePercent(percentage: string) {
    const newAmount =
      percentage == "100"
        ? this.balance
        : (this.balance * Number(percentage)) / 100;
    this.tokenAmount = String(newAmount);
  }

  get formattedBalance() {
    const big = new Big(this.balance);
    const formattedNumber =
      big.decimalPlaces() < 8 ? big.toString() : Number(big.toFixed(8));
    return `${formattedNumber} ${this.symbol}`;
  }

  @Emit("toggle")
  toggleStatus() {}

  @Emit()
  click() {}

  @Emit("dropdown")
  dropdownEvent() {}
}
</script>

<style lang="scss" scoped>
.error-list {
  margin-top: 8px;
  :first-child {
    margin-right: 3px;
  }
}
</style>
