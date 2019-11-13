import axios from "axios";
import { vxm } from "@/store";
import { JsonRpc } from "eosjs";
import { Asset, split } from "eos-common";
import { EosAccount } from "bancorx/build/interfaces";
import { rpc } from "./rpc";
import { client } from "./dFuse";

const tokenMetaDataEndpoint =
  "https://raw.githubusercontent.com/eoscafe/eos-airdrops/master/tokens.json";

const eosRpc: JsonRpc = rpc;

interface TokenMeta {
  name: string;
  logo: string;
  logo_lg: string;
  symbol: string;
  account: string;
  chain: string;
}

interface TraditionalStat {
  supply: Asset;
  max_supply: Asset;
}

export const getBalance = async (
  contract: string,
  symbolName: string
): Promise<any> => {
  // @ts-ignore
  const account = vxm.eosTransit.wallet.auth.accountName;
  const tableResult = await eosRpc.get_currency_balance(
    contract,
    account,
    symbolName
  );
  if (tableResult.length == 0) return `0.0000 ${symbolName}`;
  return tableResult[0];
};

export const fetchTokenStats = async (
  contract: string,
  symbol: string
): Promise<TraditionalStat> => {
  const tableResult = await eosRpc.get_table_rows({
    code: contract,
    table: "stat",
    scope: symbol,
    limit: 1
  });
  const tokenExists = tableResult.rows.length > 0;
  if (!tokenExists) throw new Error("Token does not exist");
  const { supply, max_supply } = tableResult.rows[0];
  return {
    supply: split(supply),
    max_supply: split(max_supply)
  };
};

let tokenMeta: TokenMeta[] = [
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

let shouldDownload = true;

export const cacheMetaData = async () => {
  const res = await axios.get(tokenMetaDataEndpoint);
  tokenMeta = [
    ...res.data.filter((meta: TokenMeta) => meta.chain == "eos"),
    ...tokenMeta
  ];
  shouldDownload = false;
};

export const fetchTokenMeta = async (
  contract: string,
  symbol: string
): Promise<TokenMeta> => {
  if (shouldDownload) {
    await cacheMetaData();
  }
  const metaData = tokenMeta.find(
    (tokenMeta: any) =>
      tokenMeta.symbol == symbol && tokenMeta.account == contract
  );
  if (!metaData) throw new Error("Token not found");
  return metaData;
};

export const fetchRelays = async (): Promise<any[]> => {
  const { scopes } = await client.stateTableScopes(
    "welovebancor",
    "converters"
  );
  console.log(scopes, "were the scopes");
  const rawConverters = await client.stateTablesForScopes(
    "welovebancor",
    scopes,
    "converters"
  );
  const polishedConverters = rawConverters.tables;
  const rawReserves = await client.stateTablesForScopes(
    "welovebancor",
    scopes,
    "reserves"
  );
  const polishedReserves = rawReserves.tables;

  const flatRelays = polishedReserves
    .filter(reserveTable => reserveTable.rows.length == 2)
    .map(reserveTable => {
      // @ts-ignore
      const { json, key } = polishedConverters.find(
        converter => converter.scope == reserveTable.scope
      )!.rows[0];
      return {
        key,
        settings: json,
        reserves: reserveTable.rows.map(reserve => reserve.json)
      };
    });

  return flatRelays;
};
