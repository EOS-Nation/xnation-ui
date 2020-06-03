import Vue from "vue";
import App from "./App.vue";
import { router } from "./router";
import { store } from "./store/";
import i18n from "./i18n";
import BootstrapVue from "bootstrap-vue";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import "@/assets/_scss/main.scss";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import {
  FontAwesomeIcon,
  FontAwesomeLayers,
  FontAwesomeLayersText
} from "@fortawesome/vue-fontawesome";
// @ts-ignore
import Ripple from "vue-ripple-directive";
// @ts-ignore
import VueFuse from "vue-fuse";
import ImageFallback from "vue-image-fallback";
import { sync } from "vuex-router-sync";

import * as firebase from "firebase/app";
import "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA4wJnD2aEvo_m3G7ELk-u1P2XmaxziGU8",
  authDomain: "xnation.firebaseapp.com",
  databaseURL: "https://xnation.firebaseio.com",
  projectId: "xnation",
  storageBucket: "xnation.appspot.com",
  messagingSenderId: "1048762453805",
  appId: "1:1048762453805:web:c4ef8341987208fac64da4",
  measurementId: "G-DJCHSS27CX"
};

firebase.initializeApp(firebaseConfig);
firebase.analytics();

Vue.prototype.$analytics = firebase.analytics();

Vue.use(VueFuse);

Ripple.color = "rgba(255, 255, 255, 0.35)";
Ripple.zIndex = 1055;
Vue.directive("ripple", Ripple);

Vue.use(BootstrapVue);
Vue.use(ImageFallback);

library.add(fas, far, fab);

Vue.component("font-awesome-icon", FontAwesomeIcon);
Vue.component("font-awesome-layers", FontAwesomeLayers);
Vue.component("font-awesome-layers-text", FontAwesomeLayersText);

Vue.config.productionTip = false;

sync(store, router, { moduleName: "routeModule" });

new Vue({
  router,
  store,
  i18n,
  render: h => h(App)
}).$mount("#app");
