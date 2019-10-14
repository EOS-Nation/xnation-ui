<template>
  <div>
    <hero-actions />
    <!-- Page Content -->
    <div class="d-none d-md-block content content-boxed">
      <tokens-table />
    </div>
    <div class="d-md-none content content-boxed px-0">
      <tokens-table />
    </div>
    <!-- END Page Content -->
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import TokensTable from '@/components/tables/TokensTable.vue'
import HeroActions from '@/components/hero/HeroActions.vue'

@Component({
  components: {
    HeroActions,
    TokensTable
  }
})
export default class Token extends Vue {
  // prop
  // data

  // computed
  get wallet() {
    return vxm.eosTransit.wallet
  }

  get direction() {
    return vxm.convert.convertDirection
  }

  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated
    else return false
  }

  // methods
  async created() {
    vxm.general.setHeroAction('convert')
  }
}
</script>

<style lang="scss"></style>
