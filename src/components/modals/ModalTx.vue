<template>
  <b-modal
    id="modal-tx"
    size="lg"
    centered
    hide-footer
    :visible="value"
    :hide-header-close="busy"
    @close="onClose"
    @cancel="onCancel"
    @hide="onHide"
  >
    <template slot="modal-title">
      {{ title }}
    </template>
    <transition name="slide-fade" mode="out-in">
      <slot></slot>
    </transition>
  </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { vxm } from "@/store/";
import { TokenPrice } from "@/types/bancor";

@Component
export default class ModalConvertToken extends Vue {
  @Prop() title!: string;
  @Prop() value!: boolean;
  @Prop() busy!: boolean;

  onClose(event: any) {
    event.preventDefault();
    this.$emit("input", false);
  }

  onCancel(event: any) {
    event.preventDefault();
    this.$emit("input", false);
  }

  onHide(event: any) {
    if (this.busy) {
      event.preventDefault();
    }
    this.$emit("input", false);
  }
}
</script>

<style scoped lang="scss">
.row {
  min-height: 50vh;
}
.slide-fade-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter,
.slide-fade-leave-to {
  transform: translateX(10px);
  opacity: 0;
}
</style>
