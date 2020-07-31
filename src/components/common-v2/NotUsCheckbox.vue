<template>
  <div class="mb-3 d-flex justify-content-center">
    <b-form-checkbox
      :value="checked"
      @input="update"
      name="us-validation"
      size="lg"
    >
      <span class="font-w600 font-size-12 mt-1">
        I am not a US citizen or domiciliary
      </span>
    </b-form-checkbox>
  </div>
</template>

<script lang="ts">
import {
  Component,
  Vue,
  Prop,
  Watch,
  PropSync,
  Emit
} from "vue-property-decorator";
import { vxm } from "@/store/";

@Component
export default class NotUsCheckbox extends Vue {
  @Prop() checked!: boolean;

  @Emit("input")
  update(value: boolean) {
    return value;
  }
}
</script>

<style scoped lang="scss"></style>
