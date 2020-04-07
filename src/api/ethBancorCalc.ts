import _ from "lodash";

export interface TokenSymbol {
  contract: string;
  symbol: string;
}

export interface BaseRelay {
  contract: string;
  smartToken: TokenSymbol;
}

export interface DryRelay extends BaseRelay {
  reserves: TokenSymbol[];
}

export interface ChoppedRelay {
  contract: string;
  reserves: TokenSymbol[];
}

export const chopRelay = (item: DryRelay): ChoppedRelay[] => [
  {
    contract: item.smartToken.contract,
    reserves: [item.reserves[0], item.smartToken]
  },
  {
    contract: item.smartToken.contract,
    reserves: [item.reserves[1], item.smartToken]
  }
];

export const chopRelays = (relays: DryRelay[]) => {
  return relays.reduce((accum: ChoppedRelay[], item: DryRelay) => {
    const [relay1, relay2] = chopRelay(item);
    return [...accum, relay1, relay2];
  }, []);
};

const removeChoppedRelay = (relays: ChoppedRelay[], relay: ChoppedRelay) => {
  console.log("Removing relay", relay);
  return relays.filter(r => !_.isEqual(r, relay));
};

const relayHasBothSymbols = (symbol1: string, symbol2: string) => (
  relay: ChoppedRelay
) => {
  return relay.reserves.every(
    reserve => reserve.symbol == symbol1 || reserve.symbol == symbol2
  );
};

const getOppositeSymbol = (relay: ChoppedRelay, symbol: string) =>
  relay.reserves.find(reserve => reserve.symbol !== symbol)!.symbol;

export function findPath(
  from: string,
  to: string,
  relays: ChoppedRelay[],
  attemptNumber: number = 0,
  path: ChoppedRelay[] = [],
  attempt: string = from
): ChoppedRelay[] {
  console.log("find path hit");
  const finalRelay = relays.find(relayHasBothSymbols(to, attempt));
  if (finalRelay) return [...path, finalRelay];
  if (attemptNumber >= 3000)
    throw new Error("Unable to find path in decent time");

  const searchScope =
    path.length == 0
      ? relays
      : removeChoppedRelay(relays, path[path.length - 1]);
  const potentialHopRelay = searchScope.find((relay: ChoppedRelay) =>
    relay.reserves.some(token => token.symbol == attempt)
  )!;

  if (!potentialHopRelay)
    return findPath(from, to, searchScope, attemptNumber + 1, []);

  const oppositeSymbol = getOppositeSymbol(potentialHopRelay, attempt);
  return findPath(
    from,
    to,
    searchScope,
    attemptNumber + 1,
    [...path, potentialHopRelay],
    oppositeSymbol
  );
}

export function createPath(
  from: string,
  to: string,
  relays: DryRelay[]
): ChoppedRelay[] {
  const sortedRelays = relays.sort(relay =>
    relay.reserves.some(reserve => reserve.symbol == to) ? -1 : 1
  );

  const choppedRelays = chopRelays(sortedRelays);
  const choppedRelaysPath = findPath(from, to, choppedRelays);
  return choppedRelaysPath;
}