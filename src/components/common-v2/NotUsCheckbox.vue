<template>
  <div class="mb-3 d-flex justify-content-center">
    <b-form-checkbox
      v-model="checked"
      :state="state"
      value="true"
      unchecked-value="false"
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
import { Component, Vue, Prop, Watch, PropSync } from "vue-property-decorator";
import { vxm } from "@/store/";

@Component({
  components: {}
})
export default class NotUsCheckbox extends Vue {
  @PropSync("value", { type: String }) checked!: string;
  @Prop() state!: boolean;

  @Watch("value")
  onValueChange(value: string) {
    this.state = value === "true";
  }

  get darkMode() {
    return vxm.general.darkMode;
  }
}
</script>

<style scoped lang="scss"></style>
