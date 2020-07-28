<template>
  <b-dropdown
    id="dropdown-settings"
    right
    variant="light"
    size="sm"
    toggle-class="block-rounded"
    no-caret
  >
    <template v-slot:button-content>
      <font-awesome-icon icon="cog" fixed-width />
    </template>

    <b-dropdown-group id="dropdown-group-1">
      <b-dropdown-header class="text-uppercase"
        >Transaction Settings</b-dropdown-header
      >
      <b-dropdown-text style="width: 300px;">
        <p class="font-size-sm mb-0">Slippage Tolerance</p>
        <div class="d-flex justify-content-between align-items-end">
          <b-btn
            @click="setSlippage(0.001)"
            size="sm"
            :variant="slippage === 0.001 ? 'primary' : 'light'"
            class="mr-1 rounded btn-block"
            >0.1%</b-btn
          >
          <b-btn
            @click="setSlippage(0.005)"
            size="sm"
            :variant="slippage === 0.005 ? 'primary' : 'light'"
            class="mr-1 rounded btn-block"
            >0.5%</b-btn
          >
          <b-btn
            @click="setSlippage(0.01)"
            size="sm"
            :variant="slippage === 0.01 ? 'primary' : 'light'"
            class="mr-1 rounded btn-block"
            >1.0%</b-btn
          >
          <b-btn
            @click="customSlippage = '3'"
            size="sm"
            :variant="
              !(slippage === 0.01 || slippage === 0.005 || slippage === 0.001)
                ? 'primary'
                : 'light'
            "
            class="mr-1 rounded btn-block"
            >Custom</b-btn
          >
        </div>
        <b-input
          debounce="500"
          v-if="
            !(slippage === 0.01 || slippage === 0.005 || slippage === 0.001)
          "
          v-model="customSlippage"
          placeholder="Enter Percentage"
          class="form-control-alt-light font-size-sm mt-2"
          style="height: 30px"
        ></b-input>
      </b-dropdown-text>
    </b-dropdown-group>
    <b-dropdown-divider></b-dropdown-divider>
    <b-dropdown-group id="dropdown-group-2">
      <b-dropdown-header class="text-uppercase"
        >Interface Settings</b-dropdown-header
      >
      <b-dropdown-item @click="toggleDarkMode">
        <div class="d-flex justify-content-between align-items-center">
          <span class="font-size-sm">Dark Mode</span>
          <div>
            <b-btn
              size="sm"
              :variant="!darkMode ? 'primary' : 'light'"
              class="mr-1 rounded"
              style="width: 50px"
              >OFF</b-btn
            >
            <b-btn
              size="sm"
              :variant="darkMode ? 'primary' : 'light'"
              class="rounded"
              style="width: 50px"
              >ON</b-btn
            >
          </div>
        </div>
      </b-dropdown-item>
    </b-dropdown-group>
    <b-dropdown-divider></b-dropdown-divider>
    <b-dropdown-group id="dropdown-group-3">
      <b-dropdown-header class="text-uppercase">Blockchains</b-dropdown-header>
      <b-dropdown-item>
        <slot name="blockchains"></slot>
      </b-dropdown-item>
    </b-dropdown-group>
  </b-dropdown>
</template>

<script lang="ts">
import { Prop, Component, Vue, Watch } from "vue-property-decorator";
import { vxm } from "@/store";

@Component
export default class SettingsMenu extends Vue {
  get darkMode() {
    return vxm.general.darkMode;
  }

  get slippage() {
    return vxm.bancor.slippageTolerance;
  }

  customSlippage: string = "";

  setSlippage(slippage: number) {
    vxm.bancor.setSlippageTolerance(slippage);
  }

  @Watch("customSlippage")
  updateCustomSlippage(newSlippage: string) {
    console.log(newSlippage);
    if (!newSlippage) return;
    this.setSlippage(parseFloat(newSlippage) / 100);
  }

  toggleDarkMode() {
    vxm.general.toggleDarkMode();
  }

  set darkMode(value: boolean) {
    vxm.general.toggleDarkMode();
  }
}
</script>

<style scoped lang="scss"></style>
