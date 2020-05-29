<template>
  <div class="block">
    <div class="block-content d-flex align-items-center p-4">
      <div class="cursor">
        <img class="img-avatar img-avatar-thumb" :src="img" alt="Token Logo" />
      </div>
      <div class="ml-4 text-left cursor">
        <h3 class="mb-0 mt-0">{{ symbol }}</h3>
        <h5 class="mb-0 mt-0">
          <span class="font-size-sm">{{ balance }}</span>
        </h5>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Watch, Component, Prop, Vue } from "vue-property-decorator";
import { vxm } from "@/store/";
import { TokenPrice } from "@/types/bancor";
import numeral from "numeral";

@Component
export default class TokenBalanceBlock extends Vue {
  @Prop() symbol!: string;
  @Prop() img!: string;
  @Prop() balance!: string;
}
</script>

<style scoped></style>
