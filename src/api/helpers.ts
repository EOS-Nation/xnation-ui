import axios from "axios";
import { vxm } from "@/store";
import { JsonRpc } from "eosjs";
import { Asset, split } from "eos-common";

const tokenMetaDataEndpoint =
  "https://raw.githubusercontent.com/eoscafe/eos-airdrops/master/tokens.json";

const eosRpc: JsonRpc = vxm.eosTransit.accessContext.eosRpc;

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

export const fetchTokenMeta = async (
  contract: string,
  symbol: string
): Promise<TokenMeta> => {
  const res = await axios.get(tokenMetaDataEndpoint);
  const metaData = res.data.find(
    (tokenMeta: any) =>
      tokenMeta.symbol == symbol && tokenMeta.account == contract
  );
  return metaData || new Error(`Failed to find Metadata for ${symbol}`);
};
