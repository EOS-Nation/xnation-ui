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
    <b-modal @ok="fund" id="fund-modal" title="Fund a Reserve">
      <div>
        <b-form-group id="fieldset-1" :label="fundLabel" label-for="input-1">
          <b-form-input id="input-1" placeholder="1000" v-model="fundAmount" trim></b-form-input>
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
            <b-button v-if="canAddReserve" size="sm" v-b-modal="'my-modal'">Add Reserve</b-button>
          </div>
        </div>
        <div class="block-content px-0 px-md-3">
          <b-button
            @click="toggleRelay"
            size="sm"
          >{{ this.enabled ? 'Disable Relay' : 'Enable Relay'}}</b-button>
          <b-button @click="buySmartTokens" v-if="this.enabled" size="sm">Buy Smart Tokens</b-button>
          <table class="table table-striped table-vcenter">
            <thead>
              <tr>
                <th class="text-center d-none d-md-table-cell" style="width: 55px;">#</th>
                <th class="cursor text-left">Relay Balance</th>
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
                     <!--<img
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
                    <font-awesome-icon :icon="reserve.sale_enabled ? 'check' : 'times'" />
                  </td>
                  <td class="text-right">
                    <!-- <b-btn @click="fund(reserve)" size="sm" variant="success" class="mr-1"> -->
                    <!--<b-button size="sm" @click="toggleReserve(reserve)" variant="warning">
                      <font-awesome-icon icon="power-off" />
                    </b-button>-->
                    <b-button
                      size="sm"
                      @click="selectedFund(reserve)"
                      variant="success"
                      v-b-modal="'fund-modal'"
                    >
                      <font-awesome-icon icon="hand-holding-usd" />
                    </b-button>
                    <!-- <b-button
                      size="sm"
                      v-if="!reserve.balance.split(' ')[0]"
                      @click="deleteReserve(reserve)"
                      variant="danger"
                    > -->
                      <font-awesome-icon icon="trash-alt" />
                    </b-button>
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
import { multiContract } from "@/api/multiContractTx";
import wait from "waait";
import { ReserveInstance } from "../types/bancor";

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
  currency: string = "";
  enabled: boolean = false;
  fee: number = 0;
  launched: boolean = false;
  owner: string = "";
  stakeEnabled: boolean = false;
  fundSelected: any = "";
  fundAmount: string = "";

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
    return vxm.eosTransit.walletState && vxm.eosTransit.walletState.authenticated
  }

  get fundLabel() {
    return this.fundSelected
      ? `Amount of ${this.fundSelected.balance.split(" ")[1]}`
      : "";
  }

  get canAddReserve() {
    const totalRatio = this.reserves.reduce((accum: number, item: any) => {
      return accum + item.ratio;
    }, 0);
    return totalRatio !== 1000000;
  }

  // methods
  async created() {
    if (!this.$route.params.isDraft) {
      const relayFound = await vxm.relay.initSymbol(this.$route.params.account)
      if (!relayFound) {
        this.$router.push({
          name: "Relays",
        });
      }
    }
    vxm.general.setHeroAction("relay");
    this.fetchData();
  }

  selectedFund(reserve: any) {
    this.fundSelected = reserve;
  }

  async buySmartTokens() {
    await multiContract.fund("0.0050 BNTEOSS");
    await wait(1000);
    this.fetchData();
  }

  async toggleRelay() {
    await multiContract.enableConversion(
      this.$route.params.account,
      !this.enabled
    );

    await wait(1000);
    this.fetchData();
  }

  async fetchData() {
    this.loading = true;
    // await Promise.all([this.fetchReserves(), this.fetchSettings()]);
    this.loading = false;
  }

  async deleteReserve(reserve: any) {
    const { balance, ratio, sale_enabled, contract } = reserve;
    const [amount, symbol] = balance.split(" ");
    const precision = amount.split(".")[1].length;

    await multiContract.deleteReserve(this.$route.params.account, symbol);
    this.fundAmount = "";
    await wait(1000);
    this.fetchData();
  }

  async fund() {
    const { balance, ratio, sale_enabled, contract } = this.fundSelected;
    const [amount, symbol] = balance.split(" ");
    const precision = amount.split(".")[1].length;
    const amountString = `${Number(this.fundAmount).toFixed(
      precision
    )} ${symbol}`;

    await multiContract[this.launched ? "fundTransfer" : "setupTransfer"](
      this.fundSelected.contract,
      amountString,
      this.$route.params.account
    );

    this.fundAmount = "";
    await wait(1000);
    this.fetchData();
  }

  async fetchSettings() {
    const {
      currency,
      enabled,
      fee,
      launched,
      owner,
      stake_enabled
    } = await tableApi.getSettingsMulti(this.$route.params.account);
    this.currency = currency.code();
    this.enabled = enabled;
    this.fee = fee;
    this.launched = launched;
    this.owner = owner;
    this.stakeEnabled = stake_enabled;
  }

  async fetchReserves() {
    try {
      const reserves = await tableApi.getReservesMulti(
        this.$route.params.account
      );
      this.reserves = reserves;
    } catch (e) {
      console.log(e);
    }
    this.loading = false;
  }

  async addReserve() {
    await multiContract.setReserve(
      this.$route.params.account,
      `${this.newSymbolPrecision},${this.newSymbolName}`,
      this.newContract,
      this.newEnabled,
      Number(this.newRatio)
    );
    await wait(100);
    await this.fetchReserves();
  }
}
</script>

<style lang="scss"></style>
