<template>
  <div
    class="block block-rounded cursor"
    :class="darkMode ? 'bg-body-dark' : 'bg-body-light'"
  >
    <div class="block-content d-flex align-items-center p-3">
      <div class="cursor">
        <img
          class="img-avatar img-avatar-thumb img-avatar48 bg-white"
          :src="img"
          alt="Token Logo"
        />
      </div>
      <div class="ml-3 text-left cursor">
        <h3
          class="mb-0 mt-0"
          :class="darkMode ? 'text-body-dark' : 'text-body-light'"
        >
          {{ symbol }}
        </h3>
        <h5
          class="mb-0 mt-0"
          :class="darkMode ? 'text-body-dark' : 'text-body-light'"
        >
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

  get darkMode() {
    return vxm.general.darkMode;
  }
}
</script>

<style scoped></style>
