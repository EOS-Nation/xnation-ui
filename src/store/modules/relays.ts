import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from "vuex-class-component";
import { Asset, split } from "eos-common";
import { client } from "@/api/dFuse";
import { calculateCost } from "bancorx";
import axios from "axios";
import { bancorApi } from '@/api/bancor'


interface FlatSymbol {
  _code: string;
  precision: number;
}

interface FlatToken {
  contract: string;
  symbol: FlatSymbol;
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
  contractName: string = process.env.VUE_APP_MULTICONTRACT!;
  smartTokenContract: string = process.env.VUE_APP_SMARTTOKENCONTRACT!;
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
    this.setUsdPrice(Number(await bancorApi.getRate("BNT", "USD")));
  }

  @mutation
  setUsdPrice(usdPrice: number) {
    this.usdPrice = usdPrice;
  }

  get relay() {
    return (symbolName: string) => {
      return this.relays.find(relay => relay.settings.symbolName == symbolName);
    };
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

  get tokens(): PrettyToken[] {
    if (!this.initComplete) return [];
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
          logo
        };
      });


  }

  @action async fetchRelays() {
    if (this.scopes.length == 0) await this.init();
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
