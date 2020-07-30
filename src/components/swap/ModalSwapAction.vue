<template>
  <base-modal id="modal-swap-action" size="md" title="Select a Token">
    <b-row class="d-flex justify-content-center">
      <div v-if="!(txBusy || success || error)">
        <b-col cols="12">
          <div>
            <div
              class="font-size-24 font-w600 mr-2"
              :class="darkMode ? 'text-dark' : 'text-light'"
            >
              {{ amount1 }} {{ token1.symbol }}
            </div>
            <font-awesome-icon
              icon="exchange-alt"
              rotation="90"
              class="text-primary"
            />
            <div
              class="font-size-24 font-w600 mr-2"
              :class="darkMode ? 'text-dark' : 'text-light'"
            >
              {{ amount2 }} {{ token2.symbol }}
            </div>
          </div>
        </b-col>
        <b-col cols="12">
          <p
            class="font-size-sm font-w400 text-center mt-2 mb-3"
            :class="!darkMode ? 'text-muted-light' : 'text-muted-dark'"
          >
            Output is estimated. If the price changes by more than 0.5% your
            transaction will revert.
          </p>
        </b-col>

        <b-col md="12">
          <div
            class="block block-rounded font-size-sm block-shadow"
            :class="darkMode ? 'bg-body-dark' : 'bg-body-light'"
          >
            <div class="block-content py-2">
              <advanced-block-item
                v-for="item in advancedBlockItems"
                :key="item.label"
                :label="item.label"
                :value="item.value"
              />
            </div>
          </div>
        </b-col>
        <b-col cols="12">
          <not-us-checkbox :state="notUsState" :value.sync="notUsChecked" />
        </b-col>
      </div>

      <action-modal-status
        v-if="txBusy || error || success"
        :error="error"
        :success="success"
        :step-description="
          sections.length ? sections[stepIndex].description : undefined
        "
      />

      <b-col cols="12">
        <main-button
          @click.native="initAction"
          :active="true"
          :label="confirmButton"
          :disabled="txBusy"
          :large="true"
        />
      </b-col>
    </b-row>
  </base-modal>
</template>

<script lang="ts">
import { Watch, Component, Vue, Prop } from "vue-property-decorator";
import { vxm } from "@/store";
import BaseModal from "@/components/common-v2/BaseModal.vue";
import { Step, ViewRelay, ViewReserve, ViewToken } from "@/types/bancor";
import ActionModalStatus from "@/components/common-v2/ActionModalStatus.vue";
import MainButton from "@/components/common/Button.vue";
import AdvancedBlockItem from "@/components/common/AdvancedBlockItem.vue";
import NotUsCheckbox from "@/components/common-v2/NotUsCheckbox.vue";

@Component({
  components: {
    NotUsCheckbox,
    AdvancedBlockItem,
    ActionModalStatus,
    BaseModal,
    MainButton
  }
})
export default class ModalSwapAction extends Vue {
  @Prop() amount1!: string;
  @Prop() token1!: ViewToken;
  @Prop() amount2!: string;
  @Prop() token2!: ViewToken;
  @Prop() advancedBlockItems!: any[];

  txBusy = false;
  success = "";
  error = "";
  sections: Step[] = [];
  stepIndex = 0;

  notUsChecked = "false";
  notUsState: boolean | null = null;

  get confirmButton() {
    return this.error
      ? "Try Again"
      : this.success
      ? "Close"
      : this.txBusy
      ? "processing ..."
      : "Confirm";
  }

  setDefault() {
    this.sections = [];
    this.error = "";
    this.success = "";
    this.notUsChecked = "false";
    this.notUsState = null;
  }

  async initAction() {
    if (this.success) {
      this.$bvModal.hide("modal-swap-action");
      this.success = "";
      return;
    }

    if (this.error) {
      this.error = "";
      return;
    }

    if (this.notUsChecked === "false") {
      this.notUsState = false;
      return;
    }

    this.setDefault();

    try {
      this.txBusy = true;
      const result = await vxm.bancor.convert({
        from: {
          id: this.token1.id,
          amount: this.amount1
        },
        to: {
          id: this.token2.id,
          amount: this.amount2
        },
        onUpdate: this.onUpdate
      });

      this.success = result;
    } catch (e) {
      this.error = e.message;
    } finally {
      this.txBusy = false;
    }
  }

  onUpdate(stepIndex: number, steps: Step[]) {
    this.stepIndex = stepIndex;
    this.sections = steps;
  }

  get darkMode(): boolean {
    return vxm.general.darkMode;
  }
}
</script>

<style scoped lang="scss"></style>
