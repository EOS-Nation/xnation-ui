<template>
  <div>
    <span class="text-white font-size-sm" style="min-height: 50px">
      <div>
        <span v-if="loading">
          <font-awesome-icon icon="circle-notch" class="text-white" spin />
        </span>
        <span v-else> {{ label }} {{ balance }}</span>
      </div>
    </span>
  </div>
</template>
<script lang="ts">
import { Prop, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";

@Component({})
export default class TokenAmountInput extends Vue {
  @Prop(String) balance!: string;
  @Prop(Boolean) loading?: boolean;
  @Prop({ default: "Available:" }) readonly label!: string;
}
</script>

<style lang="scss" scoped></style>
