<template>
  <div>
    <hero-wallet account="" />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import { bancorApi } from '@/api/bancor'
import HeroWallet from '@/components/hero/HeroWallet.vue'
import { TokenPrice } from '@/types/bancor'

const numeral = require('numeral')

@Component({
  components: {
    HeroWallet
  }
})
export default class Wallet extends Vue {
}
</script>

<style scoped lang="scss"></style>
