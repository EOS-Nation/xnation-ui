import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from "vuex-class-component";
import { tableApi } from "@/api/TableWrapper";
import { Asset, Symbol, split } from "eos-common";
import { getBalance } from "@/api/helpers";
import { client } from "@/api/dFuse";
import { nRelay } from "bancorx/build/interfaces";
import { calculateReturn, calculateCost } from "bancorx";
import axios from "axios";
import { baseApi } from "@/api/BaseApi";
import { relay } from "./relay";

const getOppositeToken = (symbol: FlatToken) => {
  return function(relay: FlatRelay) {
    return relay.reserves.find(
      reserve =>
        reserve.contract !== symbol.contract &&
        reserve.symbol._code !== symbol.symbol._code
    );
  };
};

const parseTokens = (
  relays: FlatRelay[],
  networkToken: FlatToken = {
    contract: "bntbntbntbnt",
    symbol: {
      precision: 10,
      _code: "BNT"
    }
  }
) => {
  return relays.map(getOppositeToken(networkToken)) as FlatToken[];
};

interface FlatSymbol {
  _code: string;
  precision: number;
}

interface FlatToken {
  contract: string;
  symbol: FlatSymbol;
}

interface FlatRelay {
  contract: string;
  isMultiContract: boolean;
  reserves: FlatToken[];
  smartToken: FlatToken;
}

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

interface PrettyToken extends Reserve {
  name: string;
  logo: string;
}

@Module({ namespacedPath: "relays/" })
export class RelaysModule extends VuexModule {
  relaysList: PlainRelay[] = [];
  scopes: string[] = [];
  contractName: string = "welovebancor";
  smartTokenContract: string = "labelaarbaro";
  tokenMeta: TokenMeta[] = [];
  usdPrice: number = 0;
  initComplete: boolean = false;

  @action async init() {
    await Promise.all([
      this.fetchUsdPrice(),
      this.fetchScopes(),
      this.fetchMeta()
    ]);
    this.initCompleted();
  }

  @mutation
  initCompleted() {
    this.initComplete = true;
  }

  @action async fetchUsdPrice() {
    this.setUsdPrice(Number(await baseApi.getRate("BNT", "USD")));
  }

  @mutation
  setUsdPrice(usdPrice: number) {
    this.usdPrice = usdPrice;
  }

  get relays() {
    return this.relaysList
      .map(relay => ({
        ...relay,
        liqDepth: this.usdPrice * Number(relay.reserves[1].balance.split(" ")[0])
      }))
      .map(relay => ({
        ...relay,
        reserves: relay.reserves
          .map(reserve => ({
            ...reserve,
            logo: this.tokenMeta.find((tokenMeta: TokenMeta) => tokenMeta.symbol == reserve.symbol).logo
          }))
      }))
  }

  get tokens(): PrettyToken[] {
    if (!this.initComplete) return [];
    const x = this.relaysList
      .map(relay => relay.reserves)
      .map(reserves => {
        const [token, bnt] = reserves;
        const liqDepth = this.usdPrice * Number(bnt.balance.split(" ")[0]);
        // How much BNT does it cost to get 1 KARMA
        const bntAsset = split(bnt.balance);
        const tokenAsset = split(token.balance);
        const desired = new Asset(
          1,
          tokenAsset.symbol
        );
        
        // calculateCost of 1 KARMA
        const cost = calculateCost(bntAsset, tokenAsset, desired).toNumber() * Math.pow(10, token.precision)

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
          logo
        };
      });

    console.log(x, 'is the good');
    return x;
  }

  @action async fetchRelays() {
    if (this.scopes.length == 0) await this.init();
    const [rawConverters, rawReserves] = await Promise.all([
      client.stateTablesForScopes(this.contractName, this.scopes, "converters"),
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
    const { scopes } = await client.stateTableScopes(
      this.contractName,
      "converters"
    );
    this.setScopes(scopes);
  }
}

export const relays = RelaysModule.ExtractVuexModule(RelaysModule);
