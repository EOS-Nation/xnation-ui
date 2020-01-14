<template>
  <hero-wrapper>
    <div>
      <b-form>
        <b-form-group>
          <b-input
            label="Row"
            v-model="toAccount"
            placeholder="Account"
          ></b-input>
          <b-input label="Row" v-model="amount" placeholder="Amount"></b-input>

          <!-- <b-button @click="onPress">Create QR Code</b-button> -->
        </b-form-group>
      </b-form>

      <qrcode-vue :value="value" :size="150"></qrcode-vue>

      <qrcode-stream @decode="onDecode" @init="onInit" />
      <p class="error">{{ error }}</p>

      <p class="decode-result">
        Last result: <b>{{ result }}</b>
      </p>
    </div>
  </hero-wrapper>
</template>

<script lang="ts">
import { Prop, Component, Vue } from "vue-property-decorator";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import QrcodeVue from "qrcode.vue";
import { QrcodeStream } from 'vue-qrcode-reader'


@Component({
  components: {
    HeroWrapper,
    QrcodeVue,
    QrcodeStream
  }
})
export default class SortIcons extends Vue {
  toAccount = "";
  amount = "0";
  error = "";
  result = "";

  get value() {
    return `${this.toAccount}:${this.amount}`;
  }

  onDecode(result: string) {
      alert(result);
      this.result = result;
  }

  async onInit(promise: any) {
    try {
      await promise;
    } catch (error) {
      if (error.name === "NotAllowedError") {
        this.error = "ERROR: you need to grant camera access permisson";
      } else if (error.name === "NotFoundError") {
        this.error = "ERROR: no camera on this device";
      } else if (error.name === "NotSupportedError") {
        this.error = "ERROR: secure context required (HTTPS, localhost)";
      } else if (error.name === "NotReadableError") {
        this.error = "ERROR: is the camera already in use?";
      } else if (error.name === "OverconstrainedError") {
        this.error = "ERROR: installed cameras are not suitable";
      } else if (error.name === "StreamApiNotSupportedError") {
        this.error = "ERROR: Stream API is not supported in this browser";
      }
    }
  }
}
</script>

<style lang="scss" scoped></style>
