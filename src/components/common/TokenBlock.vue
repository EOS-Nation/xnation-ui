<template>
  <b-col md="5" class="text-center mb-2">
    <h6 class="text-uppercase text-muted">{{ title }}</h6>
    <img class="img-avatar img-avatar-thumb mb-2" :src="img" alt="Token Logo" />
    <h2 class="mb-2">{{ tokenAmount }}</h2>
    <h3 class="text-muted">
      {{ tokenName }}
    </h3>
  </b-col>
</template>
<script lang="ts">
import { Watch, Component, Prop, Vue } from "vue-property-decorator";
import { vxm } from "@/store/";
import { TokenPrice } from "@/types/bancor";
import numeral from "numeral";

@Component
export default class TokenBalanceBlock extends Vue {
  @Prop() title!: string;
  @Prop() img!: string;
  @Prop() tokenAmount!: string;
  @Prop() tokenName!: string;
}
</script>

<style scoped></style>
