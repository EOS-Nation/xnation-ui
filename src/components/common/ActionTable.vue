<template>
  <table class="table table-borderless table-vcenter">
    <tbody>
      <tr class="table-active">
        <th style="width: 50px;"></th>
        <th>
          {{ title.toUpperCase() }}
          <span v-if="subtitle" class="text-muted font-w300 ml-2">{{
            subtitle
          }}</span>
        </th>
      </tr>
      <tr>
        <td
          class="text-center"
          :class="[
            { 'table-success': valid === true },
            { 'table-danger': valid === false },
            { 'bg-body': valid === null }
          ]"
        >
          <font-awesome-icon
            :icon="icon"
            fixed-width
            :class="[
              { 'text-success': valid === true },
              { 'text-danger': valid === false },
              { 'text-muted': valid === null }
            ]"
          />
        </td>
        <td>
          <slot></slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { Prop, Component, Vue } from 'vue-property-decorator'

@Component
export default class ActionTable extends Vue {
  // prop
  @Prop() title!: string
  @Prop() subtitle?: string
  @Prop() icon!: string
  @Prop() valid!: true | false | null

  // Lifecycle hooks
  created() {}
  mounted() {}
  updated() {}
  destroyed() {}
}
</script>

<style lang="scss" scoped></style>
