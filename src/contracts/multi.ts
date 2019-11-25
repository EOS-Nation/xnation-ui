export interface BareAction {
  name: string;
  data: any;
}

export interface SemiAction extends BareAction {
  account: string;
}

class MultiContractAction {
  contractName?: string;

  constructor(contractName?: string) {
    this.contractName = contractName;
  }

  addAccountProperty(action: BareAction): BareAction | SemiAction {
    return this.contractName
      ? {
          ...action,
          account: this.contractName
        }
      : action;
  }

  delreserve(converter: string, currency: string): BareAction | SemiAction {
    return this.addAccountProperty({
      name: "delreserve",
      data: {
        converter,
        currency
      }
    });
  }

  setreserve(
    converter_currency_code: string,
    currency: string,
    contract: string,
    sale_enabled: boolean,
    ratio: number
  ): BareAction | SemiAction {
    return this.addAccountProperty({
      name: "setreserve",
      data: {
        converter_currency_code,
        currency,
        contract,
        sale_enabled,
        ratio
      }
    });
  }

  withdraw(sender: string, quantity: string, converter_currency_code: string) {
    return this.addAccountProperty({
      name: 'withdraw',
      data: {
        sender,
        quantity,
        converter_currency_code
      }
    })
  }

  updateowner(currency: string, owner: string): BareAction | SemiAction {
    return this.addAccountProperty({
      name: "updateowner",
      data: {
        currency,
        owner
      }
    });
  }

  fund(sender: string, quantity: string): BareAction | SemiAction {
    return this.addAccountProperty({
      name: "fund",
      data: {
        sender,
        quantity
      }
    });
  }

  enablecnvrt(currency: string, enabled: boolean): BareAction | SemiAction {
    return this.addAccountProperty({
      name: "enablecnvrt",
      data: {
        currency,
        enabled
      }
    });
  }

  updatefee(currency: string, fee: number) {
    return this.addAccountProperty({
      name: 'updatefee',
      data: {
        currency,
        fee
      }
    })
  }

  create(
    owner: string,
    initial_supply: string,
    maximum_supply: string
  ): BareAction | SemiAction {
    return this.addAccountProperty({
      name: "create",
      data: {
        owner,
        initial_supply,
        maximum_supply
      }
    });
  }
}

export const multiContractAction = new MultiContractAction(process.env.VUE_APP_MULTICONTRACT!);
