import { rpc } from "./rpc";
import { Pools, Settings, kv } from "@/types/bancor";

export const get_pools = async (): Promise<Pools> => {
  const depth: kv = {};
  const ratio: kv = {};
  const balance: kv = {};
  const pegged: kv = {};

  const results = await rpc.get_table_rows({
    json: true,
    code: "stablestable",
    scope: "stablestable",
    table: "v1.pools"
  });
  for (const row of results.rows) {
    const symcode = row.id.sym.split(",")[1];
    depth[symcode] = Number(row.depth.split(" ")[0]);
    ratio[symcode] = row.ratio;
    balance[symcode] = Number(row.balance.split(" ")[0]);
    pegged[symcode] = Number(row.pegged.split(" ")[0]);
  }

  return {
    depth,
    ratio,
    balance,
    pegged
  };
};

export async function get_settings(): Promise<Settings> {
  const results = await rpc.get_table_rows({
    json: true,
    code: "stablestable",
    scope: "stablestable",
    table: "settings",
    limit: 1
  });
  return results.rows[0];
}

export async function get_volume(days = 7) {
  const data: Array<{
    volume: kv;
    proceeds: kv;
  }> = [];

  const results = await rpc.get_table_rows({
    json: true,
    code: "stablestable",
    scope: "stablestable",
    table: "v1.volume",
    reverse: true,
    limit: days
  });
  for (const row of results.rows) {
    data.push(parse_volume(row));
  }
  return data;
}

export async function get_account_balances(account: string): Promise<string[]> {
  const results = await rpc.get_table_rows({
    json: true,
    code: "stablestable",
    scope: "stablestable",
    table: "accounts",
    lower_bound: account,
    upper_bound: account
  });
  if (!results.rows.length) return [];
  return results.rows[0].balances.map((row: any) => row.value);
}

function parse_volume(row: any) {
  const volume: kv = {};
  const proceeds: kv = {};

  // volume
  for (const { key, value } of row.volume) {
    volume[key] = Number(value.split(" ")[0]);
  }
  // proceeds
  for (const { key, value } of row.proceeds) {
    proceeds[key] = Number(value.split(" ")[0]);
  }
  return {
    volume,
    proceeds
  };
}

export function get_apr(proceeds: number, depth: number) {
  return (proceeds * 365) / depth;
}

export async function get_weekly_aprs() {
  const aprs: kv[] = [];
  const { depth } = await get_pools();

  for (const { proceeds } of await get_volume()) {
    aprs.push(parse_daily_apr(depth, proceeds));
  }
  return aprs;
}

function parse_daily_apr(depth: kv, proceeds: kv) {
  const apr: kv = {};

  for (const symcode of Object.keys(depth)) {
    apr[symcode] = get_apr(proceeds[symcode], depth[symcode]);
  }
  return apr;
}

export function get_rate(in_quantity: string, out_quantity: string) {
  const [in_amount, in_symcode] = in_quantity.split(" ");
  const [out_amount, out_symcode] = out_quantity.split(" ");

  if (in_symcode == "EBTC" && out_symcode == "EOS")
    return Number(in_amount) / Number(out_amount);
  if (in_symcode == "EOS") return Number(out_amount) / Number(in_amount);
  else if (in_symcode == "EBTC") return Number(out_amount) / Number(in_amount);
  return Number(in_amount) / Number(out_amount);
}

export async function get_price(
  quantity: string,
  symcode: string,
  pools: Pools,
  settings: Settings
) {
  console.log(pools);
  console.log(settings);
}
