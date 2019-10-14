<template>
  <div>
    <hero-convert />
    <modal-select-token :direction="direction" />
    <modal-convert-token />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import HeroConvert from '@/components/hero/HeroConvert.vue'
import ModalSelectToken from '@/components/modals/ModalSelectToken.vue'
import ModalConvertToken from '@/components/modals/ModalConvertToken.vue'
import TokensTable from '@/components/tables/TokensTable.vue'
const numeral = require('numeral')
const {
  ContentLoader,
  FacebookLoader,
  CodeLoader,
  BulletListLoader,
  InstagramLoader,
  ListLoader
} = require('vue-content-loader')

@Component({
  components: {
    HeroConvert,
    TokensTable,
    ModalSelectToken,
    ModalConvertToken,
    ContentLoader,
    FacebookLoader,
    CodeLoader,
    BulletListLoader,
    InstagramLoader,
    ListLoader
  }
})
export default class Convert extends Vue {
  // data
  numeral = numeral

  // computed
  get eosTokens() {
    return vxm.tokens.eosTokens
  }

  get ethTokens() {
    return vxm.tokens.ethTokens
  }

  get loading() {
    return vxm.tokens.loadingTokens
  }
  get direction() {
    return vxm.convert.convertDirection
  }
}
</script>

<style scoped lang="scss"></style>
