import { Decimal } from "decimal.js";
import { Asset, asset_to_number, Sym as Symbol } from "eos-common";

export type EosAccount = string;

export interface TokenSymbol {
  contract: EosAccount;
  symbol: Symbol;
}

export interface BaseRelay {
  contract: EosAccount;
  smartToken: TokenSymbol;
  isMultiContract: boolean;
}

export interface DryRelay extends BaseRelay {
  reserves: TokenSymbol[];
}

export interface HydratedRelay extends BaseRelay {
  reserves: TokenAmount[];
  fee: number;
}

export interface TokenAmount {
  contract: EosAccount;
  amount: Asset;
}

export interface ConvertPath {
  account: string;
  symbol: string;
  multiContractSymbol?: string;
}

export interface ChoppedRelay {
  contract: string;
  reserves: TokenSymbol[];
}

export function calculateReturn(
  balanceFrom: Asset,
  balanceTo: Asset,
  amount: Asset
) {
  if (!balanceFrom.symbol.isEqual(amount.symbol))
    throw new Error("From symbol does not match amount symbol");
  if (amount.amount >= balanceFrom.amount)
    throw new Error("Impossible to buy the entire reserve or more");

  Decimal.set({ precision: 15, rounding: Decimal.ROUND_DOWN });
  const balanceFromNumber = new Decimal(asset_to_number(balanceFrom));
  const balanceToNumber = new Decimal(asset_to_number(balanceTo));
  const amountNumber = new Decimal(asset_to_number(amount));

  const reward = amountNumber
    .div(balanceFromNumber.plus(amountNumber))
    .times(balanceToNumber);

  const rewardAsset = new Asset(
    reward
      .times(Math.pow(10, balanceTo.symbol.precision()))
      .toDecimalPlaces(0, Decimal.ROUND_DOWN)
      .toNumber(),
    balanceTo.symbol
  );
  console.log({
    balanceFrom: balanceFrom.to_string(),
    balanceTo: balanceTo.to_string(),
    amount: amount.to_string(),
    reward: rewardAsset.to_string()
  });

  return rewardAsset;
}

export function calculateCost(
  balanceFrom: Asset,
  balanceTo: Asset,
  amountDesired: Asset
) {
  if (!balanceTo.symbol.isEqual(amountDesired.symbol))
    throw new Error("From symbol does not match amount symbol");
  if (amountDesired.amount >= balanceTo.amount)
    throw new Error("Impossible to buy the entire reserve or more");
  const balanceFromNumber = new Decimal(asset_to_number(balanceFrom));
  const balanceToNumber = new Decimal(asset_to_number(balanceTo));
  const amountNumber = new Decimal(asset_to_number(amountDesired));
  const oneNumber = new Decimal(1);

  Decimal.set({ precision: 15, rounding: Decimal.ROUND_UP });
  const reward = balanceFromNumber
    .div(oneNumber.minus(amountNumber.div(balanceToNumber)))
    .minus(balanceFromNumber);

  return new Asset(
    reward
      .times(Math.pow(10, balanceFrom.symbol.precision()))
      .toDecimalPlaces(0, Decimal.ROUND_FLOOR)
      .toNumber(),
    balanceFrom.symbol
  );
}

export function composeMemo(
  converters: ConvertPath[],
  minReturn: string,
  destAccount: string,
  version = 1
): string {
  const receiver = converters
    .map(({ account, symbol, multiContractSymbol }) => {
      return `${account}${
        multiContractSymbol ? `:${multiContractSymbol}` : ""
      } ${symbol}`;
    })
    .join(" ");

  return `${version},${receiver},${minReturn},${destAccount}`;
}

export function relaysToConvertPaths(
  from: Symbol,
  relays: DryRelay[]
): ConvertPath[] {
  return relays
    .map(relay =>
      relay.reserves.map(token => {
        const base = {
          account: relay.contract,
          symbol: token.symbol.code().to_string()
        };
        return relay.isMultiContract
          ? {
              ...base,
              multiContractSymbol: relay.smartToken.symbol.code().to_string()
            }
          : base;
      })
    )
    .reduce((prev, curr) => prev.concat(curr))
    .filter(converter => converter.symbol !== from.code().to_string())
    .reduce((accum: ConvertPath[], item: ConvertPath) => {
      return accum.find(
        (converter: ConvertPath) => converter.symbol == item.symbol
      )
        ? accum
        : [...accum, item];
    }, []);
}

export function relayHasBothSymbols(
  symbol1: Symbol,
  symbol2: Symbol
): (choppedRelay: ChoppedRelay) => boolean {
  return function(relay: ChoppedRelay) {
    return relay.reserves.every(
      token => token.symbol.isEqual(symbol1) || token.symbol.isEqual(symbol2)
    );
  };
}

const zip = (arr1: any[], arr2: any[]) => {
  return arr1.map((item, index) => [item, arr2[index]]);
};

const reservesAreSame = (one: TokenSymbol, two: TokenSymbol): boolean => {
  return one.contract == two.contract && one.symbol == two.symbol;
};

const relaysAreSame = (one: ChoppedRelay, two: ChoppedRelay): boolean => {
  const zippedReserves = zip(one.reserves, two.reserves);
  const matchingReserves = zippedReserves.every(([reserve, opposingReserve]) =>
    reservesAreSame(reserve, opposingReserve)
  );
  const matchingContract = one.contract == two.contract;
  return matchingContract && matchingReserves;
};

export function removeChoppedRelay(
  relays: ChoppedRelay[],
  departingRelay: ChoppedRelay
): ChoppedRelay[] {
  return relays.filter(relay => !relaysAreSame(relay, departingRelay));
}

export const chopRelay = (item: DryRelay): ChoppedRelay[] => {
  return [
    {
      contract: item.contract,
      reserves: [item.reserves[0], item.smartToken]
    },
    {
      contract: item.contract,
      reserves: [item.reserves[1], item.smartToken]
    }
  ];
};

export const chopRelays = (relays: DryRelay[]) => {
  return relays.reduce((accum: ChoppedRelay[], item: DryRelay) => {
    const [relay1, relay2] = chopRelay(item);
    return [...accum, relay1, relay2];
  }, []);
};

export function getOppositeSymbol(relay: ChoppedRelay, symbol: Symbol): Symbol {
  const oppositeToken = relay.reserves.find(
    token => !token.symbol.isEqual(symbol)
  )!!;
  return oppositeToken.symbol;
}

function relayOffersSymbols(symbol1: Symbol, symbol2: Symbol) {
  return function(relay: DryRelay) {
    const inReserves = relay.reserves.every(
      token => token.symbol.isEqual(symbol1) || token.symbol.isEqual(symbol2)
    );
    if (inReserves) return inReserves;
    const inReserve = relay.reserves.some(
      token => token.symbol.isEqual(symbol1) || token.symbol.isEqual(symbol2)
    );
    const inSmartToken =
      relay.smartToken.symbol.isEqual(symbol1) ||
      relay.smartToken.symbol.isEqual(symbol2);
    return inReserve && inSmartToken;
  };
}

export function unChopRelays(
  choppedRelays: ChoppedRelay[],
  relays: DryRelay[]
) {
  return choppedRelays.reduce(
    (accum: DryRelay[], choppedRelay: ChoppedRelay) => {
      const relayOfInterest = relayOffersSymbols(
        choppedRelay.reserves[0].symbol,
        choppedRelay.reserves[1].symbol
      );
      const alreadyExistingRelay = accum.find(relayOfInterest);
      return alreadyExistingRelay
        ? accum
        : [...accum, relays.find(relayOfInterest)!];
    },
    []
  );
}

export function findPath(
  from: Symbol,
  to: Symbol,
  relays: ChoppedRelay[],
  path: ChoppedRelay[] = [],
  attempt: Symbol = from
): ChoppedRelay[] {
  const finalRelay = relays.find(relayHasBothSymbols(to, attempt));

  if (finalRelay) return [...path, finalRelay];

  const searchScope =
    path.length == 0
      ? relays
      : removeChoppedRelay(relays, path[path.length - 1]);
  const firstRelayContainingAttempt = searchScope.find((relay: ChoppedRelay) =>
    relay.reserves.some(token => token.symbol.isEqual(attempt))
  )!;

  if (!firstRelayContainingAttempt) return findPath(from, to, searchScope, []);

  const oppositeSymbol = getOppositeSymbol(
    firstRelayContainingAttempt,
    attempt
  );
  return findPath(
    from,
    to,
    relays,
    [...path, firstRelayContainingAttempt],
    oppositeSymbol
  );
}

export function createPath(
  from: Symbol,
  to: Symbol,
  relays: DryRelay[]
): DryRelay[] {
  const choppedRelays = chopRelays(relays);
  const choppedRelaysPath: ChoppedRelay[] = findPath(from, to, choppedRelays);
  const wholeRelaysPath: DryRelay[] = unChopRelays(
    choppedRelaysPath,
    relays
  ) as DryRelay[];
  return wholeRelaysPath;
}

export function chargeFee(
  asset: Asset,
  decimalFee: number,
  magnitude: number = 1
): Asset {
  Decimal.set({ precision: 15, rounding: Decimal.ROUND_DOWN });
  const assetAmount = new Decimal(asset_to_number(asset));
  const one = new Decimal(1);
  const totalFee = assetAmount.times(
    one.minus(Decimal.pow(one.minus(decimalFee), magnitude))
  );
  const newAmount = assetAmount.minus(totalFee);
  return new Asset(
    newAmount
      .times(Math.pow(10, asset.symbol.precision()))
      .toDecimalPlaces(0, Decimal.ROUND_FLOOR)
      .toNumber(),
    asset.symbol
  );
}

export const findReturn = (amount: Asset, relaysPath: HydratedRelay[]) =>
  relaysPath.reduce((lastReward, relay) => {
    const fromReserveBalance = relay.reserves.find(reserve =>
      reserve.amount.symbol.isEqual(lastReward.symbol)
    )!;
    const toReserveBalance = relay.reserves.find(
      reserve => !reserve.amount.symbol.isEqual(lastReward.symbol)
    )!;
    const result = calculateReturn(
      fromReserveBalance.amount,
      toReserveBalance.amount,
      lastReward
    );
    return chargeFee(result, relay.fee, 2);
  }, amount);
