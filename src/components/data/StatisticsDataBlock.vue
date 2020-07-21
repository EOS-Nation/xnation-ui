<template>
  <div>
    <span
      class="text-uppercase"
      :class="darkMode ? 'text-muted-dark' : 'text-muted-light'"
    >
      {{ title }}
    </span>
    <div>
      <span
        class="font-size-lg"
        :class="darkMode ? 'text-body-dark' : 'text-body-light'"
      >
        {{ value }}
      </span>
      <span :class="percentage >= 0 ? 'text-success' : 'text-danger'"
        >{{ percentage }}%</span
      >
    </div>
  </div>
</template>
a
<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { vxm } from "@/store";

@Component({
  components: {}
})
export default class StatisticsDataBlock extends Vue {
  @Prop(String) title!: string;
  @Prop(String) value!: string;
  @Prop(Number) percentage!: Number;

  get network() {
    return this.$route.params.service;
  }

  get name() {
    return this.network.toUpperCase();
  }

  get darkMode() {
    return vxm.general.darkMode;
  }
}
</script>

<style lang="scss"></style>
