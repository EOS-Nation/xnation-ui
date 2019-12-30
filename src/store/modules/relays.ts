import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from "vuex-class-component";
import { Asset, split, Symbol } from "eos-common";
import { client } from "@/api/dFuse";
import { calculateCost } from "bancorx";
import axios from "axios";
import { bancorApi, ethBancorApi } from "@/api/bancor";
import { SimpleToken, SimpleTokenWithMarketData } from "@/types/bancor";
import { multiContract } from "@/api/multiContractTx";

import { bancorCalculator } from "@/api/bancorCalculator";
import wait from "waait";

import { createAsset } from "@/api/helpers";

interface TokenMeta {
  name: string;
  logo: string;
  logo_lg: string;
  symbol: string;
  account: string;
  chain: string;
}

export interface PlainRelay {
  key: string;
  isMultiContract: boolean;
  contract: string;
  settings: Settings;
  reserves: Reserve[];
}

export interface Reserve {
  balance: string;
  sale_enabled: boolean;
  ratio: number;
  contract: string;
  symbol: string;
  precision: number;
}

export interface Settings {
  fee: number;
  stake_enabled: boolean;
  launched: boolean;
  enabled: boolean;
  owner: string;
  currency: string;
  contract: string;
}

export type FloatAmount = number;

export interface ProposedTransaction {
  fromSymbol: string;
  toSymbol: string;
  amount: FloatAmount;
}

export interface ProposedConvertTransaction {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: FloatAmount;
  toAmount: FloatAmount;
}

@Module({ namespacedPath: "relays/" })
export class RelaysModule extends VuexModule {
  relaysList: PlainRelay[] = [];
  scopes: string[] = [];
  contractName: string = process.env.VUE_APP_MULTICONTRACT!;
  smartTokenContract: string = process.env.VUE_APP_SMARTTOKENCONTRACT!;
  tokenMeta: TokenMeta[] = [];
  usdPrice: number = 0;
  initComplete: boolean = false;
  selectedNetwork: string = "eos";
  relaysDb: any = {};
  ethTokensList: any = [];

  @action async init() {
    if (this.initComplete) {
      console.log("Init already called");
    }
    await Promise.all([this.fetchUsdPrice(), this.initEos(), this.initEth()]);
    await wait();
    this.initCompleted();
  }

  @action async initEos() {
    await Promise.all([this.fetchScopes(), this.fetchMeta()]);
    await this.fetchRelays();
  }

  @action async initEth() {
    const tokens = await ethBancorApi.getTokens();
    this.ethTokensList = tokens;
  }

  @mutation
  initCompleted() {
    this.initComplete = true;
  }

  @action async fetchUsdPrice() {
    this.setUsdPrice(Number(await bancorApi.getRate("BNT", "USD")));
  }

  @action async getCost(proposedTransaction: ProposedTransaction) {
    console.log({ proposedTransaction });
    if (this.selectedNetwork == "eos")
      return this.getCostEos(proposedTransaction);
    else return this.getCostEth(proposedTransaction);
  }

  @action async getCostEos({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction) {
    const fromToken = this.token(fromSymbol)!;
    const toToken = this.token(toSymbol)!;

    const reward = await bancorCalculator.estimateCost(
      new Asset(
        amount * Math.pow(10, toToken.precision),
        new Symbol(toToken.symbol, toToken.precision)
      ),
      new Symbol(fromToken.symbol, fromToken.precision)
    );

    return { amount: String(reward.toNumber()) };
  }

  @action async getCostEth({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction) {
    const fromSymbolApiInstance = this.ethSymbolNameToApiObj(fromSymbol);
    const toSymbolApiInstance = this.ethSymbolNameToApiObj(toSymbol);
    const [fromTokenDetail, toTokenDetail] = await Promise.all([
      ethBancorApi.getTokenTicker(fromSymbolApiInstance.id),
      ethBancorApi.getTokenTicker(toSymbolApiInstance.id)
    ]);
    const result = await ethBancorApi.calculateCost(
      fromSymbolApiInstance.id,
      toSymbolApiInstance.id,
      String(amount * Math.pow(10, toTokenDetail.decimals))
    );
    return {
      amount: String(Number(result) / Math.pow(10, fromTokenDetail.decimals))
    };
  }

  @action async getReturn(proposedTransaction: ProposedTransaction) {
    if (this.selectedNetwork == "eos")
      return this.getReturnEos(proposedTransaction);
    else return this.getReturnEth(proposedTransaction);
  }

  @action async getReturnEos({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction) {
    const fromToken = this.token(fromSymbol)!;
    const toToken = this.token(toSymbol)!;

    const reward = await bancorCalculator.estimateReturn(
      createAsset(amount, fromToken.symbol, fromToken.precision),
      new Symbol(toToken.symbol, toToken.precision)
    );
    return { amount: String(reward.toNumber()) };
  }

  @action async getReturnEth({
    fromSymbol,
    toSymbol,
    amount
  }: ProposedTransaction) {
    const fromSymbolApiInstance = this.ethSymbolNameToApiObj(fromSymbol);
    const toSymbolApiInstance = this.ethSymbolNameToApiObj(toSymbol);
    const [fromTokenDetail, toTokenDetail] = await Promise.all([
      ethBancorApi.getTokenTicker(fromSymbolApiInstance.id),
      ethBancorApi.getTokenTicker(toSymbolApiInstance.id)
    ]);
    const result = await ethBancorApi.calculateReturn(
      fromSymbolApiInstance.id,
      toSymbolApiInstance.id,
      String(amount * Math.pow(10, fromTokenDetail.decimals))
    );
    return {
      amount: String(Number(result) / Math.pow(10, toTokenDetail.decimals))
    };
  }

  @action async convert(proposedTransaction: ProposedConvertTransaction) {
    if (this.selectedNetwork == "eos")
      return this.convertEos(proposedTransaction);
    else return this.convertEth(proposedTransaction);
  }

  @action async triggerTx(actions: any[]) {
    console.log("relays has", actions, "and giving them to eosTransit");
    this.$store.dispatch("eosTransit/tx", actions, { root: true });
  }

  @action async convertEos({
    fromAmount,
    fromSymbol,
    toAmount,
    toSymbol
  }: ProposedConvertTransaction) {
    // @ts-ignore
    const accountName = this.$store.rootState.eosTransit.wallet.auth
      .accountName;
    const fromToken = this.token(fromSymbol)!;
    const toToken = this.token(toSymbol)!;

    const fromAmountAsset = new Asset(
      Number(fromAmount) * Math.pow(10, fromToken.precision),
      new Symbol(fromToken.symbol, fromToken.precision)
    );
    const toAmountAsset = new Asset(
      Number(toAmount) * Math.pow(10, toToken.precision),
      new Symbol(toToken.symbol, toToken.precision)
    );
    const minimumReturn = new Asset(
      toAmountAsset.amount * 0.98,
      toAmountAsset.symbol
    );
    const minimumReturnString = minimumReturn.toString().split(" ")[0];
    const memo = await bancorCalculator.composeMemo(
      new Symbol(fromToken.symbol, fromToken.precision),
      new Symbol(toToken.symbol, toToken.precision),
      minimumReturnString,
      accountName
    );

    try {
      const actions = await multiContract.convert(
        fromToken.contract,
        fromAmountAsset,
        memo
      );
      this.triggerTx(actions);
    } catch (e) {
      console.warn("TX Error:", e);
    }
  }

  @action async convertEth(proposedTransaction: ProposedConvertTransaction) {
    console.log("f");
  }

  @mutation
  setUsdPrice(usdPrice: number) {
    this.usdPrice = usdPrice;
  }

  get network() {
    return this.selectedNetwork;
  }

  @mutation
  setNetwork(newNetwork: string) {
    this.selectedNetwork = newNetwork;
  }

  get token() {
    return (symbolName: string) =>
      this.tokens.find(token => token.symbol == symbolName);
  }

  get relay() {
    return (symbolName: string) =>
      this.relays.find(relay => relay.settings.symbolName == symbolName);
  }

  get relays() {
    return this.relaysList.map(relay => ({
      ...relay,
      liqDepth: this.usdPrice * Number(relay.reserves[1].balance.split(" ")[0]),
      reserves: relay.reserves.map(reserve => ({
        ...reserve,
        logo:
          this.tokenMeta.find(
            (tokenMeta: TokenMeta) => tokenMeta.symbol == reserve.symbol
          )!.logo ||
          "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/128x128/plain/symbol_questionmark.png"
      })),
      settings: {
        ...relay.settings,
        symbolName: relay.settings.currency.split(",")[1]
      }
    }));
  }

  get ethSymbolNameToApiObj() {
    return (symbolName: string) =>
      this.ethTokensList.find((token: any) => token.code == symbolName);
  }

  get ethTokens(): SimpleTokenWithMarketData[] {
    const ethToken = this.ethTokensList.find(
      (token: any) => token.code == "ETH"
    )!;
    if (!ethToken) return [];
    // @ts-ignore
    return this.ethTokensList.map((token: any) => ({
      symbol: token.code,
      name: token.name,
      price: token.price,
      liqDepth: token.liquidityDepth * Number(ethToken.price),
      logo: token.primaryCommunityImageName
    }));
  }

  get eosTokens(): SimpleTokenWithMarketData[] {
    // @ts-ignore
    return this.relaysList
      .filter(relay => relay.settings.enabled)
      .map(relay => relay.reserves)
      .map(reserves => {
        const [token, bnt] = reserves;
        const liqDepth = this.usdPrice * Number(bnt.balance.split(" ")[0]);
        const bntAsset = split(bnt.balance);
        const tokenAsset = split(token.balance);

        const desired = new Asset(1, tokenAsset.symbol);
        const cost =
          calculateCost(bntAsset, tokenAsset, desired).toNumber() *
          Math.pow(10, token.precision);

        return reserves.map(reserve => ({
          ...reserve,
          liqDepth,
          price: cost * this.usdPrice
        }));
      })
      .flat(1)
      .reduce((accum: Reserve[], item: Reserve) => {
        return accum.find((token: Reserve) => token.symbol == item.symbol)
          ? accum
          : [...accum, item];
      }, [])
      .map((token: Reserve) => {
        const { name, logo } = this.tokenMeta.find(
          tokenMeta =>
            tokenMeta.symbol == token.symbol &&
            tokenMeta.account == token.contract
        )!;
        return {
          ...token,
          name,
          logo,
          contract: token.contract,
          precision: token.balance.split(" ")[0].split(".")[1].length
        };
      });
  }

  get tokens(): SimpleToken[] {
    console.log(
      "Tokens has been engaged when the length of tokens is",
      this.ethTokens.length,
      "for eth and",
      this.eosTokens.length,
      "for eos"
    );
    return this.selectedNetwork == "eos" ? this.eosTokens : this.ethTokens;
  }

  @action async fetchRelays() {
    try {
      const [rawConverters, rawReserves] = await Promise.all([
        client.stateTablesForScopes(
          this.contractName,
          this.scopes,
          "converters"
        ),
        client.stateTablesForScopes(this.contractName, this.scopes, "reserves")
      ]);

      const polishedConverters = rawConverters.tables;
      const polishedReserves = rawReserves.tables;

      //@ts-ignore
      const cutDownRelays: PlainRelay[] = polishedReserves
        .filter((reserveTable: any) => reserveTable.rows.length == 2)
        .map((reserveTable: any) => {
          // @ts-ignore
          const { json, key } = polishedConverters.find(
            (converter: any) => converter.scope == reserveTable.scope
          )!.rows[0];
          return {
            key,
            isMultiContract: true,
            contract: this.contractName,
            settings: {
              // @ts-ignore
              ...json,
              contract: this.smartTokenContract
            },
            reserves: reserveTable.rows
              .map((reserve: any) => reserve.json)
              .map((reserve: any) => ({
                ...reserve,
                symbol: reserve.balance.split(" ")[1],
                precision: Number(
                  reserve.balance.split(" ")[0].split(".")[1].length
                )
              }))
              .sort((a: any) =>
                a.symbol == "BNT" && a.contract == "bntbntbntbnt" ? 1 : -1
              )
          };
        });

      this.setRelays(cutDownRelays);
      return cutDownRelays;
    } catch (e) {
      console.error("Failed while fetching relays on vxm.relays", e);
    }
  }

  @mutation setScopes(scopes: string[]) {
    this.scopes = scopes;
  }
  @mutation setRelays(relays: PlainRelay[]) {
    this.relaysList = relays;
  }
  @mutation setTokenMeta(tokens: TokenMeta[]) {
    this.tokenMeta = [
      ...tokens,
      {
        name: "EOS",
        logo:
          "https://storage.googleapis.com/bancor-prod-file-store/images/communities/359b8290-0767-11e8-8744-97748b632eaf.png",
        logo_lg:
          "https://storage.googleapis.com/bancor-prod-file-store/images/communities/359b8290-0767-11e8-8744-97748b632eaf.png",
        symbol: "EOS",
        account: "eosio.token",
        chain: "eos"
      }
    ];
  }

  @action async fetchMeta() {
    const res = await axios.get(
      "https://raw.githubusercontent.com/eoscafe/eos-airdrops/master/tokens.json"
    );
    this.setTokenMeta(
      res.data.filter((meta: TokenMeta) => meta.chain == "eos")
    );
  }

  @action async fetchScopes() {
    try {
      const { scopes } = await client.stateTableScopes(
        this.contractName,
        "converters"
      );
      this.setScopes(scopes);
    } catch (e) {
      console.warn(
        "Failed to find scopes on contract",
        this.contractName,
        "is there any converters set yet?"
      );
    }
  }
}

export const relays = RelaysModule.ExtractVuexModule(RelaysModule);
