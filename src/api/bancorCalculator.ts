import { vxm } from "@/store";
import { Asset, split, Symbol } from "eos-common";
import {
  calculateCost,
  calculateReturn,
  createPath,
  nRelay,
  composeMemo,
  relaysToConverters,
  HydratedRelay,
  TokenSymbol,
  TokenAmount,
  calculateReserveToSmart,
  calculateSmartToReserve,
  chargeFee,
} from "bancorx";

const reserveToReserveHopping = (lastReward: Asset, relay: HydratedRelay) => {
  const fromReserveBalance = relay.reserves.find((reserve: TokenAmount) =>
    reserve.amount.symbol.isEqual(lastReward.symbol)
  )!;
  const toReserveBalance = relay.reserves.find(
    (reserve: TokenAmount) => !reserve.amount.symbol.isEqual(lastReward.symbol)
  )!;
  const result = calculateReturn(
    fromReserveBalance.amount,
    toReserveBalance.amount,
    lastReward
  );
  const feed = chargeFee(result, relay.fee, 2);
  return feed;
};

class BancorCalculator {
  public async estimateCost(
    amountDesired: Asset,
    from: Symbol
  ): Promise<Asset> {
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

      const result = calculateCost(
        toReserveBalance.amount,
        fromReserveBalance.amount,
        lastCost
      );
      return result;
    }, amountDesired);
    return costAmount;
  }

  public async estimateReturn(amount: Asset, to: Symbol): Promise<Asset> {
    const relays = await this.fetchRelays();

    const relaysRequired = createPath(amount.symbol, to, relays);

    const fromIsSmartToken =
      relaysRequired[0].smartToken.symbol == amount.symbol;
    const toIsSmartToken =
      relaysRequired[relaysRequired.length - 1].smartToken.symbol == to;
    const hydratedRelays = await this.hydrateRelays(relaysRequired);
    const converters = relaysToConverters(amount.symbol, relaysRequired);

    if (fromIsSmartToken && toIsSmartToken) {
      const fromSmartTokenSupply = await this.fetchSmartTokenSupply(
        amount.symbol.code()
      );
      const toSmartTokenSupply = await this.fetchSmartTokenSupply(
        to.code()
      );
      const firstTargetReserveBalance = hydratedRelays[0].reserves.find(
        reserve => reserve.amount.symbol.code() == converters[0].symbol
      )!.amount;
      const firstHopResult = calculateSmartToReserve(
        amount,
        firstTargetReserveBalance,
        fromSmartTokenSupply
      );
      const lastTargetReserveBalance = hydratedRelays[
        hydratedRelays.length - 1
      ].reserves.find(
        reserve =>
          reserve.amount.symbol.code() ==
          converters[converters.length - 1].symbol
      )!.amount;
      const secondLastHopResult = hydratedRelays
        .splice(1)
        .splice(-1)
        .reduce(reserveToReserveHopping, firstHopResult);

      return calculateReserveToSmart(
        secondLastHopResult,
        lastTargetReserveBalance,
        toSmartTokenSupply
      );
    } else if (fromIsSmartToken && !toIsSmartToken) {
      const fromSmartTokenSupply = await this.fetchSmartTokenSupply(
        amount.symbol.code()
      );
      const firstTargetReserveBalance = hydratedRelays[0].reserves.find(
        reserve => reserve.amount.symbol.code() == converters[0].symbol
      )!.amount;
      const firstHopResult = calculateSmartToReserve(
        amount,
        firstTargetReserveBalance,
        fromSmartTokenSupply
      );
      return hydratedRelays
        .splice(1)
        .reduce(reserveToReserveHopping, firstHopResult);
    } else if (!fromIsSmartToken && toIsSmartToken) {
      const toSmartTokenSupply = await this.fetchSmartTokenSupply(
        to.code()
      );
      const lastTargetReserveBalance = hydratedRelays[
        hydratedRelays.length - 1
      ].reserves.find(
        reserve =>
          reserve.amount.symbol.code() ==
          converters[converters.length - 1].symbol
      )!.amount;
      const secondLastHopResult = hydratedRelays
        .splice(-1)
        .reduce(reserveToReserveHopping, amount);
      return calculateReserveToSmart(
        secondLastHopResult,
        lastTargetReserveBalance,
        toSmartTokenSupply
      );
    } else {
      return hydratedRelays.reduce(reserveToReserveHopping, amount);
    }
  }

  // Fetch balance returns Assets of the things
  private hydrateRelay(balances: Asset[], relay: nRelay): HydratedRelay {
    const result = {
      ...relay,
      reserves: relay.reserves.map((reserve: TokenSymbol) => ({
        amount: balances.find(balance =>
          balance.symbol.isEqual(reserve.symbol)
        )!,
        contract: reserve.contract,
      }))
    };
    if (result.reserves.every(reserve => Boolean(reserve.amount)))
    // @ts-ignore
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

  async fetchSmartTokenSupply(symbolCode: string) {
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
    // @ts-ignore
    return vxm.relays.relays.map(relay => ({
      // @ts-ignore
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
      contract: relay.contract,
      fee: relay.settings.fee / 1000000
    }));
  }

  async fetchSingleRelayReserves(contract: string) {
    return [];
  }

  async fetchMultiRelayReserves(contract: string, symbolCode: string) {
    const relay = vxm.relays.relays.find(
      // @ts-ignore
      relay => relay.settings.currency.split(",")[1] == symbolCode
    )!;
    // @ts-ignore
    return relay.reserves.map(reserve => split(reserve.balance));
  }
}

export const bancorCalculator = new BancorCalculator();
