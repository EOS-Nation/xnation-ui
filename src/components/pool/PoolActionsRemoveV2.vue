<template>
  <div v-if="selectedToken">
    <label-content-split label="Select a Pool Token" class="mb-3">
      <b-form-group class="m-0" :class="darkMode ? 'text-dark' : 'text-light'">
        <b-form-radio-group
          id="radio-group"
          v-model="selectedToken"
          name="radio-component"
        >
          <b-form-radio
            v-for="reserve in poolTokens"
            :name="reserve.symbol"
            :value="reserve.id"
            :key="reserve.id"
            :disabled="reserve.disabled"
          >
            <div class="d-flex align-items-center">
              <img
                class="img-avatar img-avatar20 mr-1"
                :src="reserve.logo"
                alt="Token Logo"
              />
              <span class="font-w600 font-size-14">{{ reserve.symbol }}</span>
            </div>
          </b-form-radio>
        </b-form-radio-group>
      </b-form-group>
    </label-content-split>

    <pool-actions-percentages
      :percentage.sync="percentage"
      @update:percentage="setPercentage"
    />

    <div>
      <plain-token-input-field
        label="Input"
        :balance="selectedPoolToken.balance"
        :amount.sync="amountSmartToken"
        @update:amount="poolTokenChange"
        :logo="selectedPoolToken.logo[0]"
        :symbol="`Pool ${selectedPoolToken.symbol}`"
        class="mt-4"
      />

      <div class="text-center my-3">
        <font-awesome-icon
          icon="long-arrow-alt-down"
          class="text-primary font-size-16"
        />
      </div>
      <label-content-split label="Output" class="my-3">
        <span
          class="font-size-12 font-w600"
          :class="darkMode ? 'text-dark' : 'text-light'"
        >
          {{ expectedReturn }} {{ selectedPoolToken.symbol }}
        </span>
      </label-content-split>
      <label-content-split v-if="exitFee !== 0" label="Exit Fee" class="my-3">
        <span
          class="font-size-12 font-w600"
          :class="darkMode ? 'text-dark' : 'text-light'"
        >
          {{ exitFee }}%
        </span>
      </label-content-split>
    </div>

    <div v-if="exitFee !== 0">
      <p>
        Pool is not balanced. Recommended to wait until it will be balanced.
      </p>
    </div>

    <main-button
      label="Remove"
      @click.native="removeLiquidity"
      :active="true"
      :large="true"
      class="mt-1"
    />

    <modal-pool-action :amounts-array="[amountSmartToken, poolTokenAmount]" />
  </div>
  <div v-else>
    <h3>Loading...</h3>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { vxm } from "@/store/";
import { ViewRelay, ViewReserve } from "@/types/bancor";
import PoolLogos from "@/components/common/PoolLogos.vue";
import PlainTokenInputField from "@/components/common-v2/PlainTokenInputField.vue";
import MainButton from "@/components/common/Button.vue";
import LabelContentSplit from "@/components/common-v2/LabelContentSplit.vue";
import PoolActionsPercentages from "@/components/pool/PoolActionsPercentages.vue";
import ModalPoolAction from "@/components/pool/ModalPoolAction.vue";
import { compareString } from "../../api/helpers";

interface PoolTokenUI {
  disabled: boolean;
  balance: number;
  id: string;
  symbol: string;
  logo: string[];
}

@Component({
  components: {
    ModalPoolAction,
    PoolActionsPercentages,
    LabelContentSplit,
    PlainTokenInputField,
    PoolLogos,
    MainButton
  }
})
export default class PoolActionsRemoveV2 extends Vue {
  @Prop() pool!: ViewRelay;

  percentage: string = "50";
  exitFee = 0;

  selectedToken: string = "";

  amountSmartToken = "";
  poolTokenAmount = "";

  expectedReturn = "";

  poolTokens: PoolTokenUI[] = [];

  get selectedPoolToken() {
    const selectedToken = this.poolTokens.find(
      token => token.id == this.selectedToken
    );
    console.log("returning", selectedToken);
    return selectedToken!;
  }

  get darkMode() {
    return vxm.general.darkMode;
  }

  get isAuthenticated() {
    return vxm.wallet.isAuthenticated;
  }

  @Watch("isAuthenticated")
  authChange(isAuthenticated: string | boolean) {
    if (isAuthenticated) {
      this.getPoolBalances();
    }
  }

  async getPoolBalances() {
    if (!this.isAuthenticated) return;
    const res = await vxm.bancor.getUserBalances(this.pool.id);
    const contrastAgainstReserves = {
      ...res,
      iouBalances: res.iouBalances.map(maxWithdraw => ({
        ...maxWithdraw,
        token: this.pool.reserves.find(reserve =>
          compareString(reserve.id, maxWithdraw.id)
        )!
      }))
    };

    const poolTokens: PoolTokenUI[] = contrastAgainstReserves.iouBalances.map(
      iouBalance => {
        const { id, logo, symbol } = iouBalance.token;
        return {
          disabled: Number(iouBalance.amount) == 0,
          balance: Number(iouBalance.amount),
          id,
          logo,
          symbol
        };
      }
    );

    this.poolTokens = poolTokens;
    const tokenToSelect = poolTokens.find(token => !token.disabled);
    this.selectedToken = tokenToSelect!.id;
  }

  async poolTokenChange(amount: string) {
    const res = await vxm.bancor.calculateOpposingWithdraw({
      id: this.pool.id,
      reserve: {
        amount,
        id: this.selectedPoolToken.id
      }
    });

    this.expectedReturn = res.expectedReturn!.amount;

    if (res.withdrawFee) {
      this.exitFee = Number(res.withdrawFee.toFixed(4));
    }

    const percentOfBalance = Number.parseInt(
      String((Number(amount) / this.selectedPoolToken.balance) * 100)
    );
    this.percentage = String(percentOfBalance);
  }

  async removeLiquidity() {
    await vxm.bancor.removeLiquidity({
      id: this.pool.id,
      reserves: [
        { id: this.selectedPoolToken.id, amount: this.amountSmartToken }
      ]
    });
  }

  setPercentage(percent: string) {
    const decPercent = Number(percent) / 100;
    const poolTokenAmount = String(this.selectedPoolToken.balance * decPercent);
    this.amountSmartToken = poolTokenAmount;
    this.poolTokenChange(poolTokenAmount);
  }

  created() {
    this.getPoolBalances();
    this.setPercentage(this.percentage);
  }
}
</script>

<style lang="scss"></style>
