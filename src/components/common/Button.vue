<template>
  <b-btn
    :variant="variant"
    class="block-rounded btn-block"
    :class="{ 'btn-large': large }"
    :disabled="disabled"
  >
    <span v-if="label">{{ label }}</span>
    <slot v-else></slot>
  </b-btn>
</template>

<script lang="ts">
import { Prop, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";

@Component
export default class MainButton extends Vue {
  @Prop({ default: "" }) label!: string;
  @Prop({ default: false }) active!: boolean;
  @Prop({ default: false }) large!: boolean;
  @Prop({ default: false }) disabled!: boolean;

  get darkMode() {
    return vxm.general.darkMode;
  }

  get variant() {
    return this.active ? "primary" : this.darkMode ? "dark" : "light";
  }
}
</script>

<style lang="scss">
.btn-large {
  height: 49px !important;
}
</style>
