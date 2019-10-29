interface SemiAction {
  account: string;
  name: string;
  data: any;
  authorization: Auth[];
}

import { vxm } from "@/store/";

interface Auth {
  actor: string;
  permission: string;
}
type GetAuth = () => Auth[];

class MultiContractActionGen {
  contractName: string;
  getAuth: GetAuth;

  constructor(contractName: string, getAuth: GetAuth) {
    this.contractName = contractName;
    this.getAuth = getAuth;
  }

  createRelay(
    {
      owner,
      symbol,
      precision,
      initialSupply,
      maxSupply
    }: {
      owner?: string;
      symbol: string;
      precision: number;
      initialSupply: number;
      maxSupply: number;
    }
  ): SemiAction[] {
   
    return [
      {
        account: this.contractName,
        authorization: this.getAuth(),
        name: "create",
        data: {
          owner: owner || this.getAuth()[0].actor,
          initial_supply: `${initialSupply.toFixed(precision)} ${symbol}`,
          maximum_supply: `${maxSupply.toFixed(precision)} ${symbol}`
        }
      }
    ];
  }
}

export const multiContract = new MultiContractActionGen("derpy", () => {
  const wallet = vxm.eosTransit.wallet;
  return [
    {
      // @ts-ignore
      actor: wallet.auth.accountName,
      // @ts-ignore
      permission: wallet.auth.permission
    }
  ];
});
