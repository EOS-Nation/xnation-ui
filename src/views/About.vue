<template>
  <!-- Page Content -->
  <div class="content">
    <tokens-table />
  </div>
  <!-- END Page Content -->
</template>

<script lang="ts">
import { Prop, Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/store'
import TokensTable from '@/components/tables/TokensTable.vue'

@Component({
  components: {
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

  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated
    else return false
  }

  // methods
  async created() {}
}
</script>

<style lang="scss"></style>
