import { vxm } from "@/store/";

interface SemiAction {
  account: string;
  name: string;
  data: any;
  authorization: Auth[];
}

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

  deleteReserve(symbolCode: string, currency: string) {
    return [
      {
        account: this.contractName,
        authorization: this.getAuth(),
        name: "delreserve",
        data: {
          converter: symbolCode,
          currency
        }
      }
    ];
  }

  setReserve(
    symbolCode: string,
    symbol: string,
    tokenContract: string,
    saleEnabled: boolean,
    ratio: number
  ): SemiAction[] {
    return [
      {
        account: this.contractName,
        authorization: this.getAuth(),
        name: "setreserve",
        data: {
          converter_currency_code: symbolCode,
          currency: symbol,
          contract: tokenContract,
          sale_enabled: saleEnabled,
          ratio
        }
      }
    ];
  }

  updateOwner(symbolCode: string, owner: string) {
    return [
      {
        account: this.contractName,
        authorization: this.getAuth(),
        name: "updateowner",
        data: {
          currency: symbolCode,
          owner
        }
      }
    ];
  }

  fund(quantity: string) {
    return [
      {
        account: this.contractName,
        authorization: this.getAuth(),
        name: "fund",
        data: {
          owner: this.getAuth()[0].actor,
          quantity
        }
      }
    ];
  }

  enableConversion(symbolCode: string, enabled: boolean) {
    return [
      {
        account: this.contractName,
        authorization: this.getAuth(),
        name: "enablecnvrt",
        data: {
          currency: symbolCode,
          enabled
        }
      }
    ];
  }

  setupTransfer(
    tokenContract: string,
    amountString: string,
    symbolCode: string
  ) {
    return [
      {
        account: tokenContract,
        authorization: this.getAuth(),
        name: `transfer`,
        data: {
          from: this.getAuth()[0].actor,
          to: this.contractName,
          quantity: amountString,
          memo: `setup;${symbolCode}`
        }
      }
    ];
  }

  fundTransfer(
    tokenContract: string,
    amountString: string,
    symbolCode: string
  ) {
    return [
      {
        account: tokenContract,
        authorization: this.getAuth(),
        name: `transfer`,
        data: {
          from: this.getAuth()[0].actor,
          to: this.contractName,
          quantity: amountString,
          memo: `fund;${symbolCode}`
        }
      }
    ];
  }

  createRelay({
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
  }): SemiAction[] {
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

export const multiContract = new MultiContractActionGen("welovebancor", () => {
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
