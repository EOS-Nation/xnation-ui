import { vxm } from "@/store/";
import { multiContractAction } from "./multiContractAction";
import { SemiAction } from "./multiContractAction";
import { ReserveInstance } from '@/types/bancor';

interface Action {
  account: string;
  name: string;
  data: any;
  authorization: Auth[];
}

type TxResponse = any;

interface Auth {
  actor: string;
  permission: string;
}
type GetAuth = () => Auth[];
type TriggerTx = (actions: Action[]) => Promise<TxResponse>;

class MultiContractTx {
  contractName: string;
  getAuth: GetAuth;
  triggerTx: TriggerTx;

  constructor(contractName: string, getAuth: GetAuth, triggerTx: TriggerTx) {
    this.contractName = contractName;
    this.getAuth = getAuth;
    this.triggerTx = triggerTx;
  }

  async tx(actions: SemiAction[]) {
    const authedActions = actions.map((action: SemiAction) => ({
      ...action,
      authorization: this.getAuth()
    }));
    return this.triggerTx(authedActions);
  }

  deleteReserve(symbolCode: string, currency: string): Promise<TxResponse> {
    const action = multiContractAction.delreserve(symbolCode, currency) as SemiAction;
    return this.tx([action])
  }

  toggleReserve(symbolCode: string, reserve: ReserveInstance) {
    const { balance, ratio, sale_enabled, contract } = reserve;
    const [amount, symbol] = balance.split(" ");
    const precision = amount.split(".")[1].length;

    const action = multiContractAction.setreserve(symbolCode, `${precision},${symbol}`, contract, !sale_enabled, ratio) as SemiAction
    return this.tx([action]);
  }

  setReserve(
    symbolCode: string,
    symbol: string,
    tokenContract: string,
    saleEnabled: boolean,
    ratio: number
  ): Promise<TxResponse> {
    const adjustedRatio = ratio * 10000;
    const action = multiContractAction.setreserve(symbolCode, symbol, tokenContract, saleEnabled, adjustedRatio) as SemiAction
    return this.tx([action]);
  }

  updateOwner(symbolCode: string, owner: string): Promise<TxResponse> {
    const action = multiContractAction.updateowner(symbolCode, owner) as SemiAction
    return this.tx([action]);
  }

  fund(quantity: string) {
    const action = multiContractAction.fund(this.getAuth()[0].actor, quantity) as SemiAction
    return this.tx([action])
  }

  enableConversion(symbolCode: string, enabled: boolean): Promise<TxResponse> {
    const action = multiContractAction.enablecnvrt(symbolCode, enabled) as SemiAction
    return this.tx([action])
  }

  createRelay(
    symbol: string,
    precision: number,
    initialSupply: number,
    maxSupply: number
  ): Promise<TxResponse> {

    const owner = this.getAuth()[0].actor;

    const action = multiContractAction.create(
      owner,
      `${initialSupply.toFixed(precision)} ${symbol}`,
      `${maxSupply.toFixed(precision)} ${symbol}`
    ) as SemiAction;

    return this.tx([action]);
  }

  setupTransfer(
    tokenContract: string,
    amountString: string,
    symbolCode: string
  ) {
    return this.tx([
      {
        account: tokenContract,
        name: `transfer`,
        data: {
          from: this.getAuth()[0].actor,
          to: this.contractName,
          quantity: amountString,
          memo: `setup;${symbolCode}`
        }
      }
    ]);
  }

  fundTransfer(
    tokenContract: string,
    amountString: string,
    symbolCode: string
  ) {
    return this.tx([
      {
        account: tokenContract,
        name: `transfer`,
        data: {
          from: this.getAuth()[0].actor,
          to: this.contractName,
          quantity: amountString,
          memo: `fund;${symbolCode}`
        }
      }
    ]);
  }


}


const getAuth: GetAuth = () => {
  const wallet = vxm.eosTransit.wallet;
  return [
    {
      // @ts-ignore
      actor: wallet.auth.accountName,
      // @ts-ignore
      permission: wallet.auth.permission
    }
  ];
}

export const multiContract = new MultiContractTx(
  "welovebancor",
  getAuth,
  vxm.eosTransit.tx
);
