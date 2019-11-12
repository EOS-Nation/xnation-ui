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
  token1Enabled: boolean;
  token2SymbolName: string;
  token2Balance: string;
  token2Contract: string;
  token2Enabled: boolean;
}

@Module({ namespacedPath: "relay/" })
export class RelayModule extends VuexModule {
  @getter token1SymbolName: string = "";
  @getter token1Balance: string = "";
  @getter token1Contract: string = "";
  @getter token1Enabled: boolean = false;
  @getter token2SymbolName: string = "";
  @getter token2Balance: string = "";
  @getter token2Contract: string = "";
  @getter token2Enabled: boolean = false;
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

  @mutation setToken1Enabled(status: boolean) {
    this.token1Enabled = status;
  }

  @mutation setToken2Enabled(status: boolean) {
    this.token2Enabled = status;
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

  @mutation setRelayExistence(status: boolean) {
    this.relayExists = status;
  }

  @mutation setReserves(data: TraditionalReserves) {
    const {
      token1SymbolName,
      token1Balance,
      token1Contract,
      token1Enabled,
      token2SymbolName,
      token2Balance,
      token2Contract,
      token2Enabled
    } = data;

    this.token1SymbolName = token1SymbolName;
    this.token1Balance = token1Balance;
    this.token1Contract = token1Contract;
    this.token1Enabled = token1Enabled
    this.token2SymbolName = token2SymbolName;
    this.token2Balance = token2Balance;
    this.token2Contract = token2Contract;
    this.token2Enabled = token2Enabled
  }

  @mutation setTokenSymbol(tokenSymbol: string) {
    this.smartTokenSymbol = tokenSymbol;
  }

  @mutation stopLoading() {
    this.loading = false;
  }

  @action async refreshReserves(): Promise<void> {
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
      token1Enabled: token1.sale_enabled,
      token2SymbolName: token2.balance.symbol.code(),
      token2Balance: token2.balance.toString(),
      token2Contract: token2.contract,
      token2Enabled: token2.sale_enabled
    });
    try {
      await this.fetchUserBalances([
        [token1.contract, token1.balance.symbol.code()],
        [token2.contract, token2.balance.symbol.code()]
      ]);
    } catch {}
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
    console.log(symbol, 'was received at initSymbol')
    this.setTokenSymbol(symbol);
    try {
      const settings = await tableApi.getSettingsMulti(symbol);
      console.log('setting to true')
      this.setRelayExistence(true);
      this.setSettings(settings);
      await this.refreshReserves();
      return true;
    } catch (e) {
      console.log(e)
      // Assume relay does not exist
      this.setRelayExistence(false);
      console.log("Relay does not exist");
      return false;
    }
  }
}

export const relay = RelayModule.ExtractVuexModule(RelayModule);
