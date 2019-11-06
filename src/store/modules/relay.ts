import {
  VuexModule,
  mutation,
  action,
  getter,
  Module
} from "vuex-class-component";
import { tableApi } from "@/api/TableWrapper";
import { Asset, Symbol } from "eos-common";
import { getBalance } from "@/api/helpers";

interface TraditionalReserves {
  token1SymbolName: string;
  token1Balance: string;
  token1Contract: string;
  token2SymbolName: string;
  token2Balance: string;
  token2Contract: string;
}

@Module({ namespacedPath: "relay/" })
export class RelayModule extends VuexModule {
  @getter token1SymbolName: string = "";
  @getter token1Balance: string = "";
  @getter token1Contract: string = "";
  @getter token2SymbolName: string = "";
  @getter token2Balance: string = "";
  @getter token2Contract: string = "";
  @getter relayExists: boolean = false;
  @getter smartTokenSymbol: string = "";
  @getter owner: string = "";
  @getter enabled: boolean = false;
  @getter launched: boolean = false;
  @getter loading: boolean = true;
  @getter fee: number = 0;
  @getter token1UserBalance: string = "N/A";
  @getter token2UserBalance: string = "N/A";

  @action async fetchRelays(symbol: string) {
    console.log("f");
  }

  @mutation draftNewRelayMutation(data: {
    smartTokenSymbol: string;
    precision: string;
    symbolName: string;
    tokenContract: string;
  }) {
    this.relayExists = false;
    this.smartTokenSymbol = this.smartTokenSymbol;
    const zero = 0;
    this.token1Balance = `${zero.toFixed(Number(data.precision))} ${
      data.symbolName
    }`;
    this.token1Contract = data.tokenContract;
    this.token1SymbolName = data.symbolName;

    this.token2SymbolName = "BNT";
    this.token2Balance = "0.0000000000 BNT";
    this.token2Contract = "bntbntbntbnt";


  }

  @mutation setUserBalances(balances: any) {
    const [token1, token2] = balances;
    this.token1UserBalance = token1;
    this.token2UserBalance = token2;
  }

  @action async draftNewRelay(data: {
    smartTokenSymbol: string;
    precision: string;
    symbolName: string;
    tokenContract: string;
  }) {
    this.draftNewRelayMutation(data);
    this.fetchUserBalances([
      [this.token1Contract, this.token1SymbolName],
      [this.token2Contract, this.token2SymbolName]
    ]);

  }

  @action async fetchUserBalances(tokens: any) {
    const [
      [token1Contract, token1SymbolName],
      [token2Contract, token2SymbolName]
    ] = tokens;
    const [token1Balance, token2Balance] = await Promise.all([
      getBalance(
        token1Contract,
        token1SymbolName
      ),
      getBalance(
        token2Contract,
        token2SymbolName
      )
    ]);
    this.setUserBalances([token1Balance, token2Balance])
    console.log('received at the store', {token1Balance, token2Balance})
  }

  @mutation relayDoesNotExist() {
    this.relayExists = false;
  }

  @mutation setReserves(data: TraditionalReserves) {
    const {
      token1SymbolName,
      token1Balance,
      token1Contract,
      token2SymbolName,
      token2Balance,
      token2Contract
    } = data;

    this.token1SymbolName = token1SymbolName;
    this.token1Balance = token1Balance;
    this.token1Contract = token1Contract;
    this.token2SymbolName = token2SymbolName;
    this.token2Balance = token2Balance;
    this.token2Contract = token2Contract;
  }

  @mutation setTokenSymbol(tokenSymbol: string) {
    this.smartTokenSymbol = tokenSymbol;
  }

  @mutation stopLoading() {
    this.loading = false;
  }

  @action async refreshReserves() {
    const reserves = await tableApi.getReservesMulti(this.smartTokenSymbol);

    const isTraditionalRelay =
      reserves.some(reserve =>
        reserve.balance.symbol.isEqual(new Symbol("BNT", 10))
      ) &&
      reserves.reduce((acc, reserve) => {
        return acc + reserve.ratio;
      }, 0) == 1000000 &&
      reserves.length == 2;

    if (!isTraditionalRelay) throw new Error("Relay is foreign");

    const bntIndex = reserves.findIndex(reserve =>
      reserve.balance.symbol.isEqual(new Symbol("BNT", 10))
    );
    const foreignTokenIndex = bntIndex == 0 ? 1 : 0;
    const token1 = reserves[foreignTokenIndex];
    const token2 = reserves[bntIndex];
    this.setReserves({
      token1SymbolName: token1.balance.symbol.code(),
      token1Balance: token1.balance.toString(),
      token1Contract: token1.contract,
      token2SymbolName: token2.balance.symbol.code(),
      token2Balance: token2.balance.toString(),
      token2Contract: token2.contract
    });
    this.stopLoading();
  }

  @mutation setSettings(settings: any) {
    const { currency, owner, enabled, launched, stake_enabled, fee } = settings;
    this.launched = launched;
    this.enabled = enabled;
    this.owner = owner;
    this.fee = fee;
  }

  @action async initSymbol(symbol: string) {
    this.setTokenSymbol(symbol);
    try {
      const settings = await tableApi.getSettingsMulti(symbol);
      this.setSettings(settings);
      await this.refreshReserves();
      return true;
    } catch (e) {
      // Assume relay does not exist
      this.relayDoesNotExist();
      console.log("Relay does not exist");
      return false;
    }
  }
}

export const relay = RelayModule.ExtractVuexModule(RelayModule);
