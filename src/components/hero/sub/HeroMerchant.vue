<template>
  <hero-wrapper>
    <div class="nice">
      <b-form>
        <b-form-group>
          <b-input
            label="Row"
            v-model="toAccount"
            placeholder="Account"
          ></b-input>
          <b-input label="Row" v-model="amount" placeholder="Amount"></b-input>
        </b-form-group>
      </b-form>

      <qrcode-vue :value="value" :size="200"></qrcode-vue>

      <qrcode-stream
        v-if="camera == 'auto'"
        :camera="camera"
        @decode="onDecode"
      ></qrcode-stream>
      <b-button @click="toggleCamera">Scan</b-button>

      <p class="error">{{ error }}</p>

      <p class="decode-result">
        Last result: <b>{{ result || "None." }}</b>
      </p>
    </div>
  </hero-wrapper>
</template>

<script lang="ts">
import { Prop, Component, Vue, Watch } from "vue-property-decorator";
import HeroWrapper from "@/components/hero/HeroWrapper.vue";
import QrcodeVue from "qrcode.vue";
import { QrcodeStream } from "vue-qrcode-reader";

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
  camera = "off";
  result = "";

  get value() {
    return `${this.toAccount}:${this.amount}`;
  }

  onDecode(result: string) {
    console.log(result, "was decode");
    this.result = result;
  }

  toggleCamera() {
    console.log(this.camera, "is the camera status");
    this.camera = "auto";
    setTimeout(() => {
      this.camera = "off";
    }, 2000);
  }

  @Watch("camera")
  c(x: string) {
    console.log(x, "is the camera status");
  }

  //   async onInit(promise: any) {
  //     try {
  //       await promise;
  //     } catch (error) {
  //       if (error.name === "NotAllowedError") {
  //         this.error = "ERROR: you need to grant camera access permisson";
  //       } else if (error.name === "NotFoundError") {
  //         this.error = "ERROR: no camera on this device";
  //       } else if (error.name === "NotSupportedError") {
  //         this.error = "ERROR: secure context required (HTTPS, localhost)";
  //       } else if (error.name === "NotReadableError") {
  //         this.error = "ERROR: is the camera already in use?";
  //       } else if (error.name === "OverconstrainedError") {
  //         this.error = "ERROR: installed cameras are not suitable";
  //       } else if (error.name === "StreamApiNotSupportedError") {
  //         this.error = "ERROR: Stream API is not supported in this browser";
  //       } else {
  //           this.error = error;
  //       }
  //     }
  //   }
}
</script>

<style lang="scss" scoped>
.nice {
  background-color: white;
}
</style>
