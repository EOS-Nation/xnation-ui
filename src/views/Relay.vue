<template>
  <div>
    <hero-actions />
    <div class="d-none d-md-block content content-boxed">
      <div class="block">
        <div class="block-header">
          <h3 class="block-title">
            Reserves
            <small>- EOS</small>
          </h3>
          <div class="block-options">
            <b-button size="sm">Test</b-button>
          </div>
        </div>
        <div class="block-content px-0 px-md-3">
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
