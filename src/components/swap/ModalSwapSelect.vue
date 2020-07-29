<template>
  <base-modal :id="name" size="sm" title="Select a Token">
    <div>
      <b-row>
        <b-col class="mb-3">
          <b-input-group>
            <b-form-input
              v-model="tokenSearch"
              placeholder="Search"
              class="form-control-alt"
            ></b-form-input>
          </b-input-group>
        </b-col>
      </b-row>
      <b-row>
        <b-col cols="12">
          <span
            class="text-uppercase font-w500 font-size-12"
            :class="darkMode ? 'text-muted-dark' : 'text-muted-light'"
          >
            Pool Name
          </span>
        </b-col>
        <b-col
          cols="12"
          v-for="token in tokens"
          :key="token.id"
          class="my-3 cursor"
          @click="selectToken(token)"
        >
          {{ token.symbol }}
        </b-col>
      </b-row>
    </div>
  </base-modal>
</template>

<script lang="ts">
import { Watch, Component, Vue, Prop } from "vue-property-decorator";
import { vxm } from "@/store";
import BaseModal from "@/components/common-v2/BaseModal.vue";
import { ViewRelay, ViewToken } from "@/types/bancor";

@Component({
  components: { BaseModal }
})
export default class ModalSwapSelect extends Vue {
  @Prop({ default: "modal-swap-select" }) name!: string;
  tokenSearch: string = "";

  selectToken(token: ViewToken): void {
    if (this.name === "token1") {
      this.$router.push({
        name: "Swap",
        query: {
          from: token.id,
          to: this.$route.query.to
        }
      });
    } else {
      this.$router.push({
        name: "Swap",
        query: {
          from: this.$route.query.from,
          to: token.id
        }
      });
    }
    this.$bvModal.hide(this.name);
  }

  get tokens(): ViewToken[] {
    return vxm.bancor.tokens;
  }

  get darkMode(): boolean {
    return vxm.general.darkMode;
  }
}
</script>

<style scoped lang="scss"></style>
