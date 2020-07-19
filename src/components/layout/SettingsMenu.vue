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
      <b-dropdown-item style="width: 300px;">
        <p class="font-size-sm mb-0">Slippage Tolerance</p>
        <div class="d-flex justify-content-between align-items-end">
          <b-btn size="sm" variant="light" class="mr-1 rounded btn-block"
            >0.1%</b-btn
          >
          <b-btn size="sm" variant="primary" class="mr-1 rounded btn-block"
            >0.5%</b-btn
          >
          <b-btn size="sm" variant="light" class="mr-1 rounded btn-block"
            >1.0%</b-btn
          >
          <b-btn size="sm" variant="light" class="mr-1 rounded btn-block"
            >Custom</b-btn
          >
        </div>
      </b-dropdown-item>
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
import { Prop, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";

@Component
export default class SettingsMenu extends Vue {
  get darkMode() {
    return vxm.general.darkMode;
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
