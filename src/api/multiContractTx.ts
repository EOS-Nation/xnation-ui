import { vxm } from "@/store/";
import { multiContractAction, SemiAction } from "../contracts/multi";
import { TokenAmount } from "bancorx/build/interfaces";
import { Symbol, Asset } from "eos-common";
import { tableApi, TableWrapper, ReserveTable } from "./TableWrapper";

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
  triggerTx: any;
  table: TableWrapper;

  constructor(contractName: string, getAuth: GetAuth, tableApi: TableWrapper) {
    this.contractName = contractName;
    this.getAuth = getAuth;
    this.triggerTx = () => console.log("MultiContract needs to be updated");
    this.table = tableApi;
  }

  async tx(actions: SemiAction[]) {
    const authedActions = actions.map((action: SemiAction) => ({
      ...action,
      authorization: this.getAuth()
    }));
    return authedActions;
  }

  deleteReserve(symbolCode: string, currency: string): Promise<TxResponse> {
    const action = multiContractAction.delreserve(
      symbolCode,
      currency
    ) as SemiAction;
    return this.tx([action]);
  }

  async toggleReserve(
    symbolCode: string,
    reserveSymbol: Symbol
  ): Promise<TxResponse> {
    const reserves = await this.table.getReservesMulti(symbolCode);
    const singleReserve = reserves.find((reserve: ReserveTable) =>
      reserve.balance.symbol.isEqual(reserveSymbol)
    );
    if (!singleReserve) throw new Error("Failed to find reserve");
    const action = multiContractAction.setreserve(
      symbolCode,
      `${
        singleReserve.balance.symbol.precision
      },${singleReserve.balance.symbol.code()}`,
      singleReserve.contract,
      !singleReserve.sale_enabled,
      singleReserve.ratio
    ) as SemiAction;
    return this.tx([action]);
  }

  setReserveAction(
    symbolCode: string,
    symbol: string,
    tokenContract: string,
    saleEnabled: boolean,
    ratio: number
  ): SemiAction {
    const adjustedRatio = ratio * 10000;
    const action = multiContractAction.setreserve(
      symbolCode,
      symbol,
      tokenContract,
      saleEnabled,
      adjustedRatio
    ) as SemiAction;
    return action;
  }

  setReserve(
    symbolCode: string,
    symbol: string,
    tokenContract: string,
    saleEnabled: boolean,
    ratio: number
  ): Promise<TxResponse> {
    const action = this.setReserveAction(
      symbolCode,
      symbol,
      tokenContract,
      saleEnabled,
      ratio
    ) as SemiAction;
    return this.tx([action]);
  }

  convert(tokenContract: string, amount: Asset, memo: string) {
    const action = {
      account: tokenContract,
      name: "transfer",
      data: {
        from: this.getAuth()[0].actor,
        to: process.env.VUE_APP_NETWORKCONTRACT,
        quantity: amount.toString(),
        memo
      }
    };
    return this.tx([action]);
  }

  updateFee(symbolCode: string, percent: number): Promise<TxResponse> {
    const action = multiContractAction.updatefee(
      symbolCode,
      percent * 1000000
    ) as SemiAction;
    return this.tx([action]);
  }

  updateOwner(symbolCode: string, owner: string): Promise<TxResponse> {
    const action = multiContractAction.updateowner(
      symbolCode,
      owner
    ) as SemiAction;
    return this.tx([action]);
  }

  fund(quantity: string) {
    const action = multiContractAction.fund(
      this.getAuth()[0].actor,
      quantity
    ) as SemiAction;
    return this.tx([action]);
  }

  enableConversionAction(symbolCode: string, enabled: boolean) {
    const action = multiContractAction.enablecnvrt(
      symbolCode,
      enabled
    ) as SemiAction;
    return action;
  }

  enableConversion(symbolCode: string, enabled: boolean): Promise<TxResponse> {
    const action = this.enableConversionAction(
      symbolCode,
      enabled
    ) as SemiAction;
    return this.tx([action]);
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
        name: "transfer",
        data: {
          from: this.getAuth()[0].actor,
          to: this.contractName,
          quantity: amountString,
          memo: `setup;${symbolCode}`
        }
      }
    ]);
  }

  // Creates a relay, adds liquidity and immediately
  // hits enableconvrt action regardless of whether or not it should run
  // purely to put it in 'launched' mode to ensure further liquidity is
  // correctly imbursed
  kickStartRelay(
    symbolCode: string,
    reserves: TokenAmount[],
    active: boolean = true,
    initialSupply: number = 1000,
    maxSupply: number = 10000000000,
    precision: number = 4
  ) {
    const createRelayAction = multiContractAction.create(
      this.getAuth()[0].actor,
      `${initialSupply.toFixed(precision)} ${symbolCode}`,
      `${maxSupply.toFixed(precision)} ${symbolCode}`
    ) as SemiAction;

    const setReserveActions = reserves.map((reserve: TokenAmount) =>
      this.setReserveAction(
        symbolCode,
        `${reserve.amount.symbol.precision},${reserve.amount.symbol.code()}`,
        reserve.contract,
        true,
        50
      )
    );
    const addLiquidityActions = this.addLiquidityActions(
      symbolCode,
      reserves,
      false
    );
    const enableRelayAction = this.enableConversionAction(symbolCode, true);

    const actions: any[] = [
      createRelayAction,
      ...setReserveActions,
      ...addLiquidityActions,
      enableRelayAction
    ];
    if (!active) {
      actions.push(this.enableConversionAction(symbolCode, false));
    }

    console.log(actions, "were actions");
    return this.tx(actions);
  }

  withdrawAction(symbolCode: string, amount: Asset) {
    const owner = this.getAuth()[0].actor;

    const action = multiContractAction.withdraw(
      owner,
      amount.toString(),
      symbolCode
    ) as SemiAction;
    console.log(action, "was the action");
    return action;
  }

  withdraw(symbolCode: string, amount: Asset) {
    return this.tx([this.withdrawAction(symbolCode, amount)]);
  }

  addLiquidity(
    symbolCode: string,
    tokens: TokenAmount[],
    launched: boolean = true
  ) {
    return this.tx(this.addLiquidityActions(symbolCode, tokens, launched));
  }

  removeLiquidity(quantity: Asset, tokenContract: string) {
    return this.tx([
      {
        account: tokenContract,
        name: "transfer",
        data: {
          from: this.getAuth()[0].actor,
          to: this.contractName,
          quantity: quantity.toString(),
          memo: "liquidate;"
        }
      }
    ]);
  }

  addLiquidityActions(
    symbolCode: string,
    tokens: TokenAmount[],
    launched: boolean = true
  ) {
    return tokens.map((token: TokenAmount) => ({
      account: token.contract,
      name: `transfer`,
      data: {
        from: this.getAuth()[0].actor,
        to: this.contractName,
        // @ts-ignore
        quantity: token.amount.to_string(),
        memo: `fund;${symbolCode}`
      }
    }));
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

  tokenTransfer(
    tokenContract: string,
    transferParams: {
      to: string;
      quantity: string;
      memo?: string;
    }
  ) {
    return this.tx([
      {
        account: tokenContract,
        name: "transfer",
        data: {
          from: this.getAuth()[0].actor,
          to: transferParams.to,
          quantity: transferParams.quantity,
          memo: transferParams.memo || ""
        }
      }
    ]);
  }
}

const getAuth: GetAuth = () => {
  const wallet = vxm.eosWallet.wallet;
  return [
    {
      // @ts-ignore
      actor: wallet.auth.accountName,
      // @ts-ignore
      permission: wallet.auth.permission
    }
  ];
};

export const multiContract = new MultiContractTx(
  process.env.VUE_APP_MULTICONTRACT!,
  getAuth,
  tableApi
);
