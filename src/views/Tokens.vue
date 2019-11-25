<template>
  <div>
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

@Component({
  components: {
    TokensTable
  }
})
export default class Token extends Vue {

  async created() {
    vxm.relays.fetchRelays();
  }
}
</script>

<style lang="scss"></style>
