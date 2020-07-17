<template>
  <b-row class="d-flex align-items-center justify-content-center">
    <token-block
      :title="leftHeader"
      :img="leftImg"
      :tokenAmount="leftTitle"
      :tokenName="leftSubtitle"
    />
    <b-col cols="12">
      <font-awesome-icon
        icon="exchange-alt"
        class="text-primary"
        size="2x"
        rotation="90"
      />
    </b-col>
    <token-block
      :title="rightHeader"
      :img="rightImg"
      :tokenAmount="rightTitle"
      :tokenName="rightSubtitle"
    />
    <b-col cols="12">
      <p
        class="font-size-sm font-w400 text-center mt-1 mb-2"
        :class="!darkMode ? 'text-muted-light' : 'text-muted-dark'"
      >
        Output is estimated. If the price changes by more than 0.5% your
        transaction will revert.
      </p>
    </b-col>
    <b-col md="12">
      <div
        class="block block-rounded font-size-sm"
        :class="darkMode ? 'bg-body-dark' : 'bg-body-light'"
      >
        <div class="block-content py-2">
          <div class="d-flex justify-content-between">
            <p
              class="m-0 my-1 p-0"
              :class="darkMode ? 'text-body-dark' : 'text-body-light'"
            >
              Price
            </p>
            <p
              class="m-0 my-1 p-0 font-w600"
              :class="darkMode ? 'text-body-dark' : 'text-body-light'"
            >
              ?????? ETH/BNT
            </p>
          </div>
          <div class="d-flex justify-content-between">
            <p
              class="m-0 my-1 p-0"
              :class="darkMode ? 'text-body-dark' : 'text-body-light'"
            >
              Minimum Sent
            </p>
            <p
              class="m-0 my-1 p-0 font-w600"
              :class="darkMode ? 'text-body-dark' : 'text-body-light'"
            >
              ?????? ETH
            </p>
          </div>
          <div class="d-flex justify-content-between">
            <p
              class="m-0 my-1 p-0"
              :class="darkMode ? 'text-body-dark' : 'text-body-light'"
            >
              Price Impact
            </p>
            <p
              class="m-0 my-1 p-0 font-w600"
              :class="darkMode ? 'text-body-dark' : 'text-body-light'"
            >
              ?.??%
            </p>
          </div>
          <div class="d-flex justify-content-between">
            <p
              class="m-0 my-1 p-0"
              :class="darkMode ? 'text-body-dark' : 'text-body-light'"
            >
              Liquidity Provider Fee
            </p>
            <p
              class="m-0 my-1 p-0 font-w600"
              :class="darkMode ? 'text-body-dark' : 'text-body-light'"
            >
              ?.????
            </p>
          </div>
        </div>
      </div>
    </b-col>
    <b-col md="12" class="text-center mb-2 font-size-h1 text-primary">
      <font-awesome-icon v-if="!success && !error" icon="sync-alt" spin />
      <font-awesome-icon
        v-else-if="error && !success"
        icon="exclamation-triangle"
        class="text-danger"
      />
      <font-awesome-icon
        v-else-if="!error && success"
        icon="check-circle"
        class="text-success"
      />
    </b-col>

    <slot name="footer"></slot>
  </b-row>
</template>
<script lang="ts">
import { Watch, Component, Prop, Vue } from "vue-property-decorator";
import { vxm } from "@/store/";
import { TokenPrice } from "@/types/bancor";
import numeral from "numeral";
import TokenBlock from "@/components/common/TokenBlock.vue";

@Component({
  components: {
    TokenBlock
  }
})
export default class TokenBalanceBlock extends Vue {
  @Prop() error!: string;
  @Prop() success!: string;

  @Prop() leftImg!: string;
  @Prop() leftTitle!: string;
  @Prop() leftSubtitle!: string;
  @Prop({ default: "Send" }) leftHeader!: string;

  @Prop() rightImg!: string;
  @Prop() rightTitle!: string;
  @Prop() rightSubtitle!: string;
  @Prop({ default: "Receive" }) rightHeader!: string;

  get darkMode() {
    return vxm.general.darkMode;
  }
}
</script>

<style scoped></style>
