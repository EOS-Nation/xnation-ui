<template>
  <div>
    <b-dropdown
      button
      @click="clicked"
      variant="success"
      split
      class="m-2"
      size="lg"
    >
      <template v-slot:button-content>
        <font-awesome-icon :icon="selectedMenu[2]" fixed-width class="mr-2" />
        <span class="font-w700">
          {{ selectedMenu[1] }}
        </span>
      </template>
      <b-dropdown-item-button
        @click="derp"
        v-for="menu in menus"
        :key="menu[0]"
      >
        {{ menu[1] }}
      </b-dropdown-item-button>
    </b-dropdown>
  </div>
</template>
<script lang="ts">
import { Prop, Component, Vue } from "vue-property-decorator";

@Component
export default class DynamicDropdown extends Vue {
  @Prop(Array) menus!: [string, string, string][];

  get selectedMenu() {
    return this.menus.find(
      ([name, label, icon]) => this.selectedButton == name
    )!;
  }

  selectedButton = this.menus[0][0];

  derp(x: any) {
    console.log(x, "was x");
  }

  clicked() {
    console.log("twas clicked", this.selectedButton);
  }
}
</script>

<style lang="scss" scoped></style>
