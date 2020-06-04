import { Contract, ContractSendMethod } from "web3-eth-contract";
import _ from "lodash";
import { CallReturn, ContractMethods } from "@/types/bancor.d.ts";
import {
  ABIConverter,
  ABISmartToken,
  ABIConverterRegistry,
  ABIConverterV28,
  ABINetworkContract
} from "@/api/ethConfig";
import { web3 } from "@/api/helpers";
import BigNumber from "bignumber.js";
import { AbiItem } from "web3-utils";

export const expandToken = (amount: string | number, precision: number) =>
  new BigNumber(amount).times(new BigNumber(10).pow(precision)).toFixed(0);

export const shrinkToken = (amount: string | number, precision: number) =>
  new BigNumber(amount)
    .div(new BigNumber(10).pow(precision))
    .toFixed(precision);

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
  return relays.filter(r => !_.isEqual(r, relay));
};

const relayHasBothSymbols = (symbol1: string, symbol2: string) => (
  relay: ChoppedRelay
) =>
  relay.reserves.every(
    reserve => reserve.symbol == symbol1 || reserve.symbol == symbol2
  );

const getOppositeSymbol = (relay: ChoppedRelay, symbol: string) =>
  relay.reserves.find(reserve => reserve.symbol !== symbol)!.symbol;

export function firstPathFound(
  from: string,
  to: string,
  relays: ChoppedRelay[],
  attemptNumber: number = 0,
  path: ChoppedRelay[] = [],
  attempt: string = from
): ChoppedRelay[] {
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
    return firstPathFound(from, to, searchScope, attemptNumber + 1, []);

  const oppositeSymbol = getOppositeSymbol(potentialHopRelay, attempt);
  return firstPathFound(
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
): { choppedRelaysPath: ChoppedRelay[]; dryRelays: DryRelay[] } {
  const sortedRelays = relays.sort(sortRelaysBy(to));

  const choppedRelays = chopRelays(sortedRelays);
  const choppedRelaysPath = firstPathFound(from, to, choppedRelays);

  const dryRelays = unChopRelays(choppedRelaysPath);

  // To do
  // Count the amount of duplicate conversions, eliminate the relays between them as they are redundant
  // then either just return straight up, or run again
  const allReserves = dryRelays.flatMap(relay => relay.reserves);
  const uniqueReserves = _.uniqWith(
    allReserves,
    (a, b) => a.contract.toLowerCase() == b.contract.toLowerCase()
  );
  const counted = uniqueReserves
    .map(reserve => [
      reserve.symbol,
      allReserves.filter(
        r => r.contract.toLowerCase() == reserve.contract.toLowerCase()
      ).length
    ])
    .filter(([symbol, count]) => count > 2);
  if (counted.length > 0) {
    console.error(
      "Recommended a path longer than what was needed, the following tokens were found in the relay reserves path",
      counted
    );
  }

  return {
    choppedRelaysPath,
    dryRelays
  };
}

export const generateEthPath = (from: string, relays: DryRelay[]) =>
  relays.reduce<{ lastSymbol: string; path: string[] }>(
    (acc, item) => {
      const destinationSymbol = item.reserves.find(
        reserve => reserve.symbol !== acc.lastSymbol
      )!;
      return {
        path: [
          ...acc.path,
          item.smartToken.contract,
          destinationSymbol.contract
        ],
        lastSymbol: destinationSymbol.symbol
      };
    },
    {
      lastSymbol: from,
      path: [
        relays[0].reserves.find(reserve => reserve.symbol == from)!.contract
      ]
    }
  ).path;

const buildContract = (abi: AbiItem[], contractAddress?: string) =>
  contractAddress
    ? new web3.eth.Contract(abi, contractAddress)
    : new web3.eth.Contract(abi);

export const buildTokenContract = (
  contractAddress?: string
): ContractMethods<{
  symbol: () => CallReturn<string>;
  decimals: () => CallReturn<string>;
  totalSupply: () => CallReturn<string>;
  allowance: (owner: string, spender: string) => CallReturn<string>;
  balanceOf: (owner: string) => CallReturn<string>;
  transferOwnership: (converterAddress: string) => ContractSendMethod;
  issue: (address: string, wei: string) => ContractSendMethod;
  transfer: (to: string, weiAmount: string) => ContractSendMethod;
  approve: (
    approvedAddress: string,
    approvedAmount: string
  ) => ContractSendMethod;
}> => {
  return buildContract(ABISmartToken, contractAddress);
};

export const buildConverterContract = (
  contractAddress: string
): ContractMethods<{
  acceptTokenOwnership: () => ContractSendMethod;
  acceptOwnership: () => ContractSendMethod;
  fund: (fundAmount: string) => ContractSendMethod;
  liquidate: (fundAmount: string) => ContractSendMethod;
  setConversionFee: (ppm: number) => ContractSendMethod;
  addReserve: (
    reserveAddress: string,
    connectorWeight: number
  ) => ContractSendMethod;
  getSaleReturn: (
    toAddress: string,
    wei: string
  ) => CallReturn<{ "0": string; "1": string }>;
  getReturn: (
    fromTokenAddress: string,
    toTokenAddress: string,
    wei: string
  ) => CallReturn<{ "0": string; "1": string }>;
  owner: () => CallReturn<string>;
  version: () => CallReturn<string>;
  connectorTokenCount: () => CallReturn<string>;
  connectorTokens: (index: number) => CallReturn<string>;
  conversionFee: () => CallReturn<string>;
}> => buildContract(ABIConverter, contractAddress);

export const buildV28ConverterContract = (
  contractAddress: string
): ContractMethods<{
  acceptTokenOwnership: () => ContractSendMethod;
  acceptOwnership: () => ContractSendMethod;
  setConversionFee: (ppm: number) => ContractSendMethod;
  addLiquidity: (
    reserveTokens: string[],
    reserveAmounts: string[],
    minReturn: string
  ) => ContractSendMethod;
  addReserve: (
    reserveAddress: string,
    connectorWeight: number
  ) => ContractSendMethod;
  getReturn: (
    fromTokenAddress: string,
    toTokenAddress: string,
    wei: string
  ) => CallReturn<{ "0": string; "1": string }>;
  rateAndFee: (
    fromTokenAddress: string,
    toTokenAddress: string,
    wei: string
  ) => CallReturn<{ "0": string; "1": string }>;
  owner: () => CallReturn<string>;
  version: () => CallReturn<string>;
  converterType: () => CallReturn<string>;
  connectorTokenCount: () => CallReturn<string>;
  connectorTokens: (index: number) => CallReturn<string>;
  conversionFee: () => CallReturn<string>;
}> => buildContract(ABIConverterV28, contractAddress);

export const buildNetworkContract = (
  contractAddress: string
): ContractMethods<{
  rateByPath: (path: string[], amount: number) => CallReturn<string>;
  convertByPath: (
    path: string[],
    amount: string,
    minReturn: string,
    beneficiary: string,
    affiliateAccount: string,
    affiliateFee: number
  ) => ContractSendMethod;
}> => buildContract(ABINetworkContract, contractAddress);

export const buildRegistryContract = (
  contractAddress: string
): ContractMethods<{
  newConverter: (
    type: number,
    smartTokenName: string,
    smartTokenSymbol: string,
    smartTokenDecimals: number,
    maxConversionFee: number,
    reserveTokens: string[],
    reserveWeights: number[]
  ) => ContractSendMethod;
}> => buildContract(ABIConverterRegistry, contractAddress);
