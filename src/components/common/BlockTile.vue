<template>
  <div class="block block-rounded bg-white">
    <div class="block-header">
      <h3 class="block-title">
        {{ title }}
        <small v-if="subtitle"> - {{ subtitle }}</small>
      </h3>
    </div>
    <div class="block-content text-center">
      <h2 v-if="content">{{ content }}</h2>
      <h2 v-else><slot></slot></h2>
    </div>
  </div>
</template>

<script lang="ts">
import { Prop, Component, Vue } from "vue-property-decorator";

@Component
export default class BlockTile extends Vue {
  // prop
  @Prop() title!: string;
  @Prop() subtitle?: string;
  @Prop() content?: string;

  // data
  message = "Hello";

  // computed
  get reverseMessage() {
    return this.message
      .split("")
      .reverse()
      .join("");
  }

  // method
  changeMessage() {
    this.message = "Good bye";
  }

  // Lifecycle hooks
  created() {}
  mounted() {}
  updated() {}
  destroyed() {}
}
</script>

<style lang="scss" scoped></style>
