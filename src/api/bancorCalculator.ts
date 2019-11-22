import { client } from "./dFuse";
import { vxm } from "@/store";
import { Asset, split, Symbol } from "eos-common";
import {
  calculateCost,
  calculateReturn,
  createPath,
  nRelay,
  composeMemo,
  EosAccount,
  relaysToConverters,
  HydratedRelay,
  TokenSymbol,
  TokenAmount
} from "bancorx";

class BancorCalculator {
  public async estimateCost(
    amountDesired: Asset,
    from: Symbol
  ): Promise<Asset> {
    console.log(
      "I have been asked to calculate the cost of",
      amountDesired.toString(),
      "coming from",
      from.code()
    );
    const reverseRelaysRequired = createPath(
      amountDesired.symbol,
      from,
      await this.fetchRelays()
    );

    const hydratedRelays = await this.hydrateRelays(reverseRelaysRequired);

    const costAmount = hydratedRelays.reduce((lastCost, relay) => {
      const fromReserveBalance = relay.reserves.find((reserve: TokenAmount) =>
        reserve.amount.symbol.isEqual(lastCost.symbol)
      )!;
      const toReserveBalance = relay.reserves.find(
        (reserve: TokenAmount) =>
          !reserve.amount.symbol.isEqual(lastCost.symbol)
      )!;

      console.log(
        fromReserveBalance.amount.toString(),
        toReserveBalance.amount.toString()
      );
      console.log(
        "I will be trying to calculate the cost with the following variables,",
        toReserveBalance.amount.toString(),
        fromReserveBalance.amount.toString(),
        lastCost.toString()
      );

      const result = calculateCost(
        toReserveBalance.amount,
        fromReserveBalance.amount,
        lastCost
      );
      return result;
    }, amountDesired);
    console.log("And I have decided to return", costAmount.toString());
    return costAmount;
  }

  public async estimateReturn(amount: Asset, to: Symbol): Promise<Asset> {
    const relaysRequired = createPath(
      amount.symbol,
      to,
      await this.fetchRelays()
    );
    const hydratedRelays = await this.hydrateRelays(relaysRequired);
    console.log({ hydratedRelays });
    console.log({ relaysRequired });

    const returnAmount = hydratedRelays.reduce((lastReward, relay) => {
      const fromReserveBalance = relay.reserves.find((reserve: TokenAmount) =>
        reserve.amount.symbol.isEqual(lastReward.symbol)
      )!;
      const toReserveBalance = relay.reserves.find(
        (reserve: TokenAmount) =>
          !reserve.amount.symbol.isEqual(lastReward.symbol)
      )!;
      const result = calculateReturn(
        fromReserveBalance.amount,
        toReserveBalance.amount,
        lastReward
      );
      return result;
    }, amount);

    return returnAmount;
  }

  // Fetch balance returns Assets of the things
  private hydrateRelay(balances: Asset[], relay: nRelay): HydratedRelay {
    const result = {
      ...relay,
      reserves: relay.reserves.map((reserve: TokenSymbol) => ({
        amount: balances.find(balance =>
          balance.symbol.isEqual(reserve.symbol)
        )!,
        contract: reserve.contract
      }))
    };
    if (result.reserves.every(reserve => Boolean(reserve.amount)))
      return result;
    throw new Error("Reserve mismatch in relays");
  }

  public async hydrateRelays(relays: nRelay[]): Promise<HydratedRelay[]> {
    const hydratedRelays = [];

    for (var i = 0; i < relays.length; i++) {
      let reserves: Asset[] = relays[i].isMultiContract
        ? await this.fetchMultiRelayReserves(
            relays[i].contract,
            relays[i].smartToken.symbol.code()
          )
        : await this.fetchSingleRelayReserves(relays[i].contract);
      let newRelay: HydratedRelay = this.hydrateRelay(reserves, relays[i]);
      // @ts-ignore
      hydratedRelays.push(newRelay);
    }

    return hydratedRelays;
  }

  async fetchSmartTokenSupply(contractName: string, symbolCode: string) {
    return new Asset(1, new Symbol("EOS", 4));
  }

  async composeMemo(
    from: Symbol,
    to: Symbol,
    minReturn: string,
    destAccount: string,
    version = 1
  ) {
    const relays = createPath(from, to, await this.fetchRelays());
    const converters = relaysToConverters(from, relays);
    return composeMemo(converters, minReturn, destAccount, version);
  }

  async fetchRelays() {
    return vxm.relays.relays.map(relay => ({
      reserves: relay.reserves.map(reserve => ({
        contract: reserve.contract,
        symbol: split(reserve.balance).symbol
      })),
      smartToken: {
        contract: relay.settings.contract,
        symbol: new Symbol(
          relay.settings.currency.split(",")[1],
          Number(relay.settings.currency.split(",")[0])
        )
      },
      isMultiContract: relay.isMultiContract,
      contract: relay.contract
    }));
  }

  async fetchSingleRelayReserves(contract: string) {
    return [];
  }

  async fetchMultiRelayReserves(contract: string, symbolCode: string) {
    const relay = vxm.relays.relays.find(
      relay => relay.settings.currency.split(",")[1] == symbolCode
    )!;
    return relay.reserves.map(reserve => split(reserve.balance));
  }
}

export const bancorCalculator = new BancorCalculator();
