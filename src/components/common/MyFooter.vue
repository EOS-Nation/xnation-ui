<template>
  <div class="d-flex justify-content-between flex-row footer">
    <div class="">
      <a :href="website" target="_blank" class="orange">EOS NATION </a
      ><span class="text">© 2020</span>
    </div>
    <div class="">
      <router-link class="orange" :to="{ name: 'Privacy' }">
        Privacy Policy
      </router-link>
      <span class="text"
        >| Created with
        <font-awesome-icon
          icon="heart"
          fixed-width
          :style="{ color: '#e04f1a' }"
        />
        by
      </span>
      <a :href="website" target="_blank" class="fas orange">EOS Nation </a>
      <span class="text">| Version: {{ appVersion }} </span>
      <span class="text">
        <a href="https://github.com/EOS-Nation/xnation-ui" target="_blank"
          ><font-awesome-icon
            :style="{ color: 'white' }"
            :icon="['fab', 'github']"
            fixed-width
        /></a>
      </span>
    </div>
  </div>
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

<style lang="scss" scoped>
.footer {
  background-color: #1f2d36;
  padding: 15px 15px;
}

@media (min-width: 768px) {
  .footer {
    padding: 15px 100px;
  }
}

.text {
  color: white;
}

.orange {
  color: #d18235;
}
</style>
