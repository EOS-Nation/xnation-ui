<template>
  <b-row class="d-flex align-items-center justify-content-center">
    <token-block
      :title="leftHeader"
      :img="leftImg"
      :tokenAmount="leftTitle"
      :tokenName="leftSubtitle"
    />
    <b-col md="2" class="text-center mb-2 font-size-h1 text-primary">
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
    <token-block
      :title="rightHeader"
      :img="rightImg"
      :tokenAmount="rightTitle"
      :tokenName="rightSubtitle"
    />
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
}
</script>

<style scoped></style>
