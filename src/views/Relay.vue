<template>
  <div>
    <b-modal @ok="addReserve" id="my-modal" title="Create a Reserve">
      <div>
        <b-form-group id="fieldset-1" label="Symbol" label-for="input-1">
          <b-form-input id="input-1" placeholder="EOS" v-model="newSymbolName" trim></b-form-input>
        </b-form-group>
        <b-form-group id="fieldset-1" label="Token Contract" label-for="input-1">
          <b-form-input id="input-1" placeholder="eosio.token" v-model="newContract" trim></b-form-input>
        </b-form-group>
        <b-form-group
          id="fieldset-1"
          :description="precisionExample"
          label="Precision"
          label-for="input-1"
        >
          <b-form-input
            id="input-1"
            placeholder="4"
            type="number"
            v-model="newSymbolPrecision"
            trim
          ></b-form-input>
        </b-form-group>
        <b-form-group id="fieldset-1" label="% Ratio" label-for="input-1">
          <b-form-input id="input-1" type="number" v-model="newRatio" placeholder="50" trim></b-form-input>
        </b-form-group>
        <b-form-group id="fieldset-1" label="Enabled" label-for="input-1">
          <b-form-checkbox id="checkbox-1" v-model="newEnabled" name="checkbox-1" />
        </b-form-group>
      </div>
    </b-modal>
    <hero-actions />
    <div class="d-none d-md-block content content-boxed">
      <div class="block">
        <div class="block-header">
          <h3 class="block-title">
            Reserves
            <small>- EOS</small>
          </h3>
          <div class="block-options">
            <b-button size="sm" v-b-modal="'my-modal'">Add Reserve</b-button>
          </div>
        </div>
        <div class="block-content px-0 px-md-3">
          <table class="table table-striped table-vcenter">
            <thead>
              <tr>
                <th class="text-center d-none d-md-table-cell" style="width: 55px;">#</th>
                <th class="cursor text-left">Token</th>
                <th class="d-none d-md-table-cell">Contract</th>
                <th class="cursor text-center" style="min-width: 150px;">Ratio</th>
                <th class="cursor text-right" style="min-width: 150px;">Status</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="loading">
                <tr v-for="i in 15" :key="i">
                  <th class="text-center">{{ i }}</th>
                  <td colspan="8">
                    <content-loader :height="10" :width="1000" :speed="5"></content-loader>
                  </td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="(reserve, index) in reserves" :key="index">
                  <td class="text-center d-none d-md-table-cell" v-text="index + 1"></td>
                  <td class="d-flex justify-content-start align-items-center">
                    <!-- <img
                    class="img-avatar img-avatar-thumb img-avatar32"
                    :src="token.img"
                    alt="Token Logo"
                    />-->
                    {{ reserve.balance }}
                  </td>
                  <td class="d-none d-md-table-cell">
                    <span class="text-muted font-size-sm">{{ reserve.contract }}</span>
                  </td>
                  <td
                    class="text-center font-w700"
                  >{{ numeral(reserve.ratio / 1000000).format('0.00%') }}</td>
                  <td class="text-right">
                    <b-button
                      size="sm"
                      @click="toggleReserve(reserve)"
                    >{{ reserve.sale_enabled ? 'Disable' : 'Enable' }}</b-button>
                  </td>
                  <td class="text-right">
                    <!-- <b-btn
                    @click="initAction('convert', token.symbol)"
                    size="sm"
                    variant="success"
                    class="mr-1"
                  >
                    <font-awesome-icon icon="exchange-alt" />
                  </b-btn>
                  <b-btn
                    @click="initAction('transfer', token.symbol)"
                    size="sm"
                    variant="info"
                  >
                    <font-awesome-icon icon="arrow-right" />
                    </b-btn>-->
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import { tableApi } from "@/api/TableWrapper";
import TokensTable from "@/components/tables/TokensTable.vue";
import HeroActions from "@/components/hero/HeroActions.vue";
import { multiContract } from "@/api/multiContractActionGen";
import wait from "waait";
// import numeral from 'numeral'
const numeral = require("numeral");
const { ContentLoader } = require("vue-content-loader");

@Component({
  components: {
    HeroActions,
    TokensTable,
    ContentLoader
  }
})
export default class Token extends Vue {
  // prop
  // data
  numeral: any = numeral;
  reserves: any = [];
  newContract: string = "";
  newSymbolName: string = "";
  newSymbolPrecision: string = "4";
  newRatio: string = "";
  loading: boolean = true;
  newEnabled: boolean = false;

  // computed
  get wallet() {
    return vxm.eosTransit.wallet;
  }

  get direction() {
    return vxm.convert.convertDirection;
  }

  get precisionExample() {
    return `E.g. ${Number(1000).toFixed(Number(this.newSymbolPrecision))} ${this
      .newSymbolName || "EOS"}`;
  }

  get isAuthenticated() {
    if (vxm.eosTransit.walletState)
      return vxm.eosTransit.walletState.authenticated;
    else return false;
  }

  // methods
  async created() {
    vxm.general.setHeroAction("relay");
    this.fetchRelays();
  }

  async toggleReserve(reserve: any) {
    const { balance, ratio, sale_enabled, contract } = reserve;
    const [amount, symbol] = balance.split(" ");
    const precision = amount.split(".")[1].length;
    const actions = multiContract.setReserve(
      this.$route.params.account,
      `${precision},${symbol}`,
      contract,
      !sale_enabled,
      ratio
    );
    const wallet = vxm.eosTransit.wallet;

    if (wallet && wallet.auth) {
      const res = await vxm.eosTransit.tx(actions);
      await wait(1000);
      this.fetchRelays();
    }
  }

  async fetchRelays() {
    try {
      const reserves = await tableApi.getReservesMulti(
        this.$route.params.account
      );
      console.log(reserves);
      this.reserves = reserves;
    } catch (e) {
      console.log(e);
    }
    this.loading = false;
  }

  async addReserve() {
    const adjustedRatio = Number(this.newRatio) * 10000;
    console.log(
      this.$route.params.account,
      this.newSymbolName,
      this.newContract,
      this.newEnabled,
      adjustedRatio
    );

    const actions = multiContract.setReserve(
      this.$route.params.account,
      `${this.newSymbolPrecision},${this.newSymbolName}`,
      this.newContract,
      this.newEnabled,
      adjustedRatio
    );

    const wallet = vxm.eosTransit.wallet;

    if (wallet && wallet.auth) {
      const res = await vxm.eosTransit.tx(actions);
      await wait(1000);
      this.fetchRelays();
    }
  }
}
</script>

<style lang="scss"></style>
