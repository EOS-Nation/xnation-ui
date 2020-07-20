<template>
  <div>
    <b-col md="12" class="text-center mb-2 font-size-h1 text-primary">
      <font-awesome-icon v-if="!success && !error" icon="sync-alt" spin />
      <font-awesome-icon
        v-else-if="error && !success"
        icon="exclamation-triangle"
        class="text-danger"
      />
      <font-awesome-icon
        v-else-if="!error && success"
        icon="check-circle"
        class="text-success"
      />
    </b-col>
    <b-col cols="12" class="text-center">
      <div v-if="!success && !error">
        <h6>
          Please stand by...
        </h6>
      </div>
      <h6 v-else-if="error && !success" class="text-danger">
        Error: {{ error }}
      </h6>
      <h6 v-else-if="!error && success">
        <a :href="explorerLink" target="_blank" class="text-success">
          SUCCESS: View {{ success.substring(0, 6) }} TX on
          {{ explorerName }}
        </a>
        <span @click="triggerClose" class="cursor text-muted">- Close</span>
      </h6>
    </b-col>
  </div>
</template>

<script lang="ts">
import { Prop, Component, Vue, PropSync, Emit } from "vue-property-decorator";

@Component
export default class TxModalFooter extends Vue {
  @Prop() error?: string;
  @Prop() success?: string;
  @Prop() explorerName!: string;
  @Prop() explorerLink!: string;

  @Emit("close")
  triggerClose() {}
}
</script>

<style lang="scss" scoped></style>
