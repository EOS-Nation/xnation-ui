import { vxm } from "@/store";
import { Symbol, Asset, split } from "eos-common";
import { rpc } from "./rpc";
import { JsonRpc } from "eosjs";

interface ConverterTable {
  currency: Symbol;
  owner: string;
  enabled: boolean;
  launched: boolean;
  stake_enabled: boolean;
  fee: number;
}

export interface ReserveTable {
  contract: string;
  ratio: number;
  sale_enabled: boolean;
  balance: Asset;
}

export class TableWrapper {
  multiContract: string;
  rpc: JsonRpc;

  constructor(multiContract: string, rpc: JsonRpc) {
    this.multiContract = multiContract;
    this.rpc = rpc;
  }

  public async getReservesMulti(symbol: string): Promise<ReserveTable[]> {
    const table = await this.rpc.get_table_rows({
      code: this.multiContract,
      table: "reserves",
      scope: symbol,
      limit: 10
    });

    return table.rows
      .map((row: any) => {
        return {
          contract: row.contract,
          ratio: row.ratio,
          sale_enabled: Boolean(row.sale_enabled),
          balance: split(row.balance)
        };
      })
      .sort((a: any) => {
        return a.contract == "bntbntbntbnt" ? 1 : -1;
      });
  }

  public async getSettingsMulti(symbol: string): Promise<ConverterTable> {
    const table = await this.rpc.get_table_rows({
      code: this.multiContract,
      table: "converters",
      scope: symbol,
      limit: 1
    });
    if (table.rows.length == 0) throw new Error("Converter does not exist");
    const {
      currency,
      owner,
      enabled,
      launched,
      stake_enabled,
      fee
    } = table.rows[0];
    const [precision, symbolName] = currency.split(",");
    return {
      currency: new Symbol(symbolName, precision),
      owner,
      enabled: Boolean(enabled),
      launched: Boolean(launched),
      stake_enabled: Boolean(stake_enabled),
      fee
    };
  }

  public async getReserves(
    contractName: string,
    scope = contractName
  ): Promise<
    {
      contract: string;
      currency: string;
      p_enabled: number;
      ratio: number;
    }[]
  > {
    const table = await this.rpc.get_table_rows({
      code: contractName,
      table: "reserves",
      scope: scope,
      limit: 2
    });

    return table.rows;
  }

  public async getSettings(
    contractName: string,
    scope = contractName
  ): Promise<{
    enabled: number;
    fee: number;
    max_fee: number;
    network: string;
    require_balance: number;
    smart_contract: string;
    smart_currency: string;
    smart_enabled: number;
  }> {
    const table = await this.rpc.get_table_rows({
      code: contractName,
      table: "settings",
      scope,
      limit: 1
    });
    return table.rows[0];
  }
}

export const tableApi = new TableWrapper(process.env.VUE_APP_MULTICONTRACT!, rpc);
