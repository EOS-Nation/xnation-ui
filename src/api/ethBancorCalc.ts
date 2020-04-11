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

const highestRecurringString = (list: string[]): string => {
  const uniqueStrings = _.uniq(list);
  const counts = uniqueStrings.map(uniqueString => ({
    name: uniqueString,
    count: list.filter(x => x == uniqueString).length
  }));
  return counts.sort((a, b) => b.count - a.count)[0].name;
};

const unChopRelays = (relays: ChoppedRelay[]): DryRelay[] => {
  const contractAddresses = relays.map(relay => relay.contract);
  const uniqueAddresses = _.uniq(contractAddresses);
  console.log({ uniqueAddresses });

  const matches = uniqueAddresses.map(address =>
    relays.filter(relay => relay.contract == address)
  );

  return matches.map(
    ([one, two]): DryRelay => {
      const symbols = [...one.reserves, ...two.reserves];
      const smartSymbol = highestRecurringString(symbols.map(x => x.symbol));
      const reserveSymbols = symbols.filter(x => x.symbol !== smartSymbol);

      return {
        contract: one.contract,
        reserves: symbols.filter(x =>
          reserveSymbols.some(reserve => reserve.symbol == x.symbol)
        ),
        smartToken: {
          contract: symbols.find(x => x.symbol == smartSymbol)!.contract,
          symbol: symbols.find(x => x.symbol == smartSymbol)!.symbol
        }
      };
    }
  );
};

const sortRelaysBy = (to: string) => (relay: DryRelay) =>
  relay.reserves.some(reserve => reserve.symbol == to) ? -1 : 1;

export function createPath(
  from: string,
  to: string,
  relays: DryRelay[]
): ChoppedRelay[] {
  const sortedRelays = relays.sort(sortRelaysBy(to));

  const choppedRelays = chopRelays(sortedRelays);
  const choppedRelaysPath = findPath(from, to, choppedRelays);
  const y = unChopRelays(choppedRelaysPath);
  if (y.length > 2) {
    console.log('walker', y.length)
    const toTryWithout = y
      .filter((_, index, arr) => index == 0 || index == arr.length - 1)
      .map(x => x.contract);

    const attempts = toTryWithout
      .map(without => {
        const newRelays = relays
          .filter(relay => relay.smartToken.contract !== without)
          .sort(sortRelaysBy(to));
        console.log(newRelays.length, relays.length, 'donation', without)
        try {
          const path = findPath(from, to, newRelays);
          return path;
        } catch (e) {
          return false;
        }
      })
      .flat(1);

    const x: ChoppedRelay[] = attempts.filter(Boolean);

    if (attempts.length > 0) {
      console.log(x, "new answer!!!!!!!!!!!!!!!");
      return x;
    }
  }
  console.log(y, "xxxxxxxxxxxxx");
  console.log(choppedRelaysPath, "was chopped relays path, can unchop?");

  return choppedRelaysPath;
}
