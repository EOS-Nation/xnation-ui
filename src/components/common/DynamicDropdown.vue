<template>
  <div>
    <b-dropdown
      button
      :disabled="disabled"
      @click="clicked"
      variant="success"
      split
      class="m-2"
      size="lg"
    >
      <template v-slot:button-content>
        <font-awesome-icon :icon="focusedMenu[2]" fixed-width class="mr-2" />
        <span class="font-w700">
          {{ focusedMenu[1] }}
        </span>
      </template>
      <b-dropdown-item-button
        @click="setMenu(menu[0])"
        v-for="menu in sortedMenus"
        :key="menu[0]"
      >
        {{ menu[1] }}
      </b-dropdown-item-button>
    </b-dropdown>
  </div>
</template>
<script lang="ts">
import { Prop, Component, Vue, PropSync, Emit } from "vue-property-decorator";

@Component
export default class DynamicDropdown extends Vue {
  @Prop(Array) menus!: [string, string, string][];
  @PropSync("selectedMenu", { type: String }) menu!: string;
  @Prop({ default: false }) disabled?: boolean;

  get sortedMenus() {
    return this.menus.filter(([name, label, icon]) => name !== this.menu);
  }

  get focusedMenu() {
    return this.menus.find(([name, label, icon]) => this.menu == name)!;
  }

  setMenu(name: string) {
    this.menu = name;
  }

  @Emit()
  clicked() {}
}
</script>

<style lang="scss" scoped></style>
