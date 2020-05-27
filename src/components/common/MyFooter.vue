<template>
  <b-container fluid>
    <b-row class="footer">
      <b-col>
        <a :href="website" target="_blank" class="orange">EOS NATION </a
        ><span class="text">© 2020</span>
      </b-col>
      <b-col cols="10" md="6" class="d-flex">
        <b-container>
          <b-row class="d-flex justify-content-end">
            <b-col sm="6" md="2">
              <router-link class="orange" :to="{ name: 'Privacy' }">
                Privacy Policy
              </router-link>
            </b-col>
            <b-col sm="6" md="3">
              <span class="text"
                >Created with
                <font-awesome-icon
                  icon="heart"
                  fixed-width
                  :style="{ color: '#e04f1a' }"
                />
                by
              </span>
              <a :href="website" target="_blank" class="fas orange"
                >EOS Nation
              </a>
            </b-col>
            <b-col sm="6" md="2">
              <span class="text">Version: {{ appVersion }} </span>
            </b-col>
            <b-col sm="6" md="2">
              <span class="text">
                <a
                  href="https://github.com/EOS-Nation/xnation-ui"
                  target="_blank"
                  ><font-awesome-icon
                    :style="{ color: 'white' }"
                    :icon="['fab', 'github']"
                    fixed-width
                /></a>
                <a href="https://t.me/xnationio" target="_blank"
                  ><font-awesome-icon
                    :style="{ color: 'white' }"
                    :icon="['fab', 'telegram']"
                    fixed-width
                /></a>
              </span>
            </b-col>
          </b-row>
        </b-container>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Prop, Component, Vue } from "vue-property-decorator";

@Component({})
export default class MyFooter extends Vue {
  get website() {
    return "https://eosnation.io";
  }

  get appVersion() {
    return JSON.parse(
      unescape(escape(JSON.stringify(require("../../../package.json"))))
    ).version;
  }
}
</script>

<style lang="scss">
.footer {
  background-color: #1f2d36;
  padding: 15px 15px;
  justify-content: space-between;
}

// @media (min-width: 768px) {
//   .footer {
//     padding: 15px 100px;
//   }
// }

.text {
  color: white;
}

.orange {
  color: #d18235;
}
</style>
