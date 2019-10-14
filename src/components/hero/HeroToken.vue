<template>
  <div
    class="bg-image"
    :style="
      'background-image: url(' +
        require('@/assets/media/photos/bg01.jpg') +
        ');'
    "
  >
    <div class="bg-primary-dark-op py-5">
      <div class="content content-full content-boxed">
        <b-row class="row-deck mt-5">
          <b-col
            cols="6"
            v-if="token"
            class="d-flex justify-content-end align-content-center"
          >
            <img
              class="img-avatar img-avatar-thumb img-avatar96 mt-4 mr-3"
              :src="
                'https://storage.googleapis.com/bancor-prod-file-store/images/communities/' +
                  token.primaryCommunityImageName
              "
              alt="Token Logo"
            />
          </b-col>
          <b-col cols="6" class="d-block">
            <div>
              <h2 class="display-3 text-white mb-1">
                {{ token.code }}
              </h2>
            </div>
            <div>
              <h2 class="display-5 text-white">{{ token.name }}</h2>
            </div>
          </b-col>
          <b-col cols="12" class="d-flex justify-content-center mt-4 mb-0">
            <b-btn
              size="sm"
              @click="initAction('convert', token)"
              variant="success"
              v-ripple
            >
              <font-awesome-icon icon="sync-alt" fixed-width class="mr-2" />
              <span class="font-w700">Convert</span>
            </b-btn>
            <b-btn
              size="sm"
              @click="initAction('transfer', token)"
              variant="info"
              v-ripple
              class="ml-2"
            >
              <font-awesome-icon icon="exchange-alt" fixed-width class="mr-2" />
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
import { TokenPrice } from '@/types/bancor'

@Component
export default class HeroToken extends Vue {
  // prop
  @Prop() private token!: any

  // data
  // computed
  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated
    else return false
  }

  // methods
  initAction(a: 'convert' | 'transfer', t: TokenPrice) {
    if (a === 'convert') {
      vxm.convert.setToken({ t: t, d: 'from' })
      this.$router.push({ name: 'Convert' })
    } else {
      vxm.transfer.setToken(t)
      this.$router.push({ name: 'Transfer' })
    }
  }

  async created() {}
}
</script>

<style scoped lang="scss"></style>
