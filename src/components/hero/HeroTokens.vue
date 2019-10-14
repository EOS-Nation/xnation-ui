<template>
  <div
    class="bg-image"
    :style="
      'background-image: url(' +
        require('@/assets/media/photos/bg01.jpg') +
        ');'
    "
  >
    <div class="bg-primary-dark-op py-0">
      <div class="content content-full content-boxed text-center">
        <b-row class="items-push mt-5">
          <b-col cols="12">
            <h2 class="display-3 text-white">WELCOME</h2>
            <h2 class="display-5 text-white">Convert. Transfer. And more!</h2>
            <h5 class="text-white-50">POWERED BY BANCOR RELAY</h5>
          </b-col>
          <b-col
            v-if="false"
            cols="12"
            class="d-flex justify-content-center mb-0"
          >
            <b-btn
              to="convert"
              size="sm"
              @click="initConvert()"
              variant="success"
              v-ripple
            >
              <font-awesome-icon icon="exchange-alt" fixed-width class="mr-2" />
              <span class="font-w700">Convert</span>
            </b-btn>
            <b-btn to="transfer" size="sm" variant="info" v-ripple class="ml-2">
              <font-awesome-icon icon="arrow-right" fixed-width class="mr-2" />
              <span class="font-w700">Transfer</span>
            </b-btn>
          </b-col>
        </b-row>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Prop, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'

@Component
export default class HeroTokens extends Vue {
  // prop
  // data
  // computed
  // methods

  async created() {}
}
</script>

<style scoped lang="scss"></style>
