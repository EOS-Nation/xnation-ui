<template>
  <div class="bg-white">
    <div class="content content-boxed py-2">
      <template v-for="(item, index) in items">
        <span
          :key="'entry' + index"
          class="font-size-h5 font-w400"
          :class="{ 'font-w600': items.length === index + 1 }"
          >{{ item }}</span
        >
        <font-awesome-icon
          :key="'icon' + index"
          v-if="index + 1 < items.length"
          icon="angle-right"
          class="text-black-50 mx-3"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { Prop, Component, Vue } from 'vue-property-decorator'

@Component
export default class Breadcrumbs extends Vue {
  // props
  @Prop() items!: string[]
}
</script>

<style lang="scss" scoped></style>
