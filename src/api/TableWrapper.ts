import { vxm } from "@/store";

class TableWrapper {

  public async getReserves(contractName: string, scope = contractName): Promise<{
    contract: string;
    currency: string;
    p_enabled: number;
    ratio: number;
  }[]> {
    const table = await vxm.eosTransit.accessContext.eosRpc.get_table_rows({
      code: contractName,
      table: "reserves",
      scope: scope,
      limit: 2
    });

    return table.rows;
  }

  public async getSettings(contractName: string, scope = contractName): Promise<{
    enabled: number;
    fee: number;
    max_fee: number;
    network: string;
    require_balance: number;
    smart_contract: string;
    smart_currency: string;
    smart_enabled: number;
  }> {
    const table = await vxm.eosTransit.accessContext.eosRpc.get_table_rows({
      code: contractName,
      table: 'settings',
      scope,
      limit: 1
    })
    return table.rows[0]
  }
}


export const tableApi = new TableWrapper();