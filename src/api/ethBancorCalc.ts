import { ContractSendMethod } from "web3-eth-contract";
import _ from "lodash";
import { CallReturn, ContractMethods } from "@/types/bancor.d.ts";
import {
  ABIConverter,
  ABISmartToken,
  ABIConverterRegistry,
  ABIConverterV28,
  ABINetworkContract,
  ABIV2Converter,
  V2PoolsTokenContainer,
  ABIMultiCallContract,
  ABIContainerContract
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

export interface MinimalRelay {
  contract: string;
  anchorAddress: string;
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

export const chopRelays = (relays: DryRelay[]) =>
  relays.reduce((accum: ChoppedRelay[], item: DryRelay) => {
    const [relay1, relay2] = chopRelay(item);
    return [...accum, relay1, relay2];
  }, []);

export const generateEthPath = (from: string, relays: MinimalRelay[]) =>
  relays.reduce<{ lastSymbol: string; path: string[] }>(
    (acc, item) => {
      const destinationSymbol = item.reserves.find(
        reserve => reserve.symbol !== acc.lastSymbol
      )!;
      return {
        path: [...acc.path, item.anchorAddress, destinationSymbol.contract],
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
}> => buildContract(ABISmartToken, contractAddress);

export const buildContainerContract = (
  contractAddress?: string
): ContractMethods<{
  poolTokens(): CallReturn<string[]>;
  symbol: () => CallReturn<string>;
  decimals: () => CallReturn<string>;
}> => buildContract(ABIContainerContract, contractAddress);

export const buildV2PoolsContainer = (
  contractAddress: string
): ContractMethods<{
  poolTokens: () => CallReturn<string[]>;
}> => buildContract(V2PoolsTokenContainer, contractAddress);

export const buildMultiCallContract = (
  contractAddress: string
): ContractMethods<{
  aggregate: (
    calls: any[],
    strict: boolean
  ) => CallReturn<{
    blockNumber: string;
    returnData: {
      success: boolean;
      data: string;
    }[];
  }>;
}> => buildContract(ABIMultiCallContract, contractAddress);

export const buildConverterContract = (
  contractAddress?: string
): ContractMethods<{
  acceptTokenOwnership: () => ContractSendMethod;
  reserves: (reserveAddress: string) => CallReturn<any[]>;
  reserveBalance: (reserveAddress: string) => CallReturn<string>;
  getConnectorBalance: (reserveAddress: string) => CallReturn<string>;
  getReserveBalance: (reserveAdress: string) => CallReturn<string>;
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

export const buildV2Converter = (
  contractAddress?: string
): ContractMethods<{
  activate: (
    primaryReserveToken: string,
    primaryReserveOracle: string,
    secondaryReserveOracle: string
  ) => ContractSendMethod;
  reserveStakedBalance: (reserveToken: string) => CallReturn<string>;
  primaryReserveToken: () => CallReturn<string>;
  secondaryReserveToken: () => CallReturn<string>;
  poolToken: (reserveToken: string) => CallReturn<string>;
  liquidationLimit: (poolToken: string) => CallReturn<string>;
  effectiveReserveWeights: () => CallReturn<{ "0": string; "1": string }>;
  removeLiquidityReturn: (
    poolToken: string,
    amount: string
  ) => CallReturn<string>;
  addLiquidity: (
    reserveTokenAddress: string,
    amount: string,
    minReturn: string
  ) => ContractSendMethod;
  removeLiquidity: (
    poolTokenAddress: string,
    amount: string,
    minReturn: string
  ) => ContractSendMethod;
}> => buildContract(ABIV2Converter, contractAddress);

export const buildV28ConverterContract = (
  contractAddress?: string
): ContractMethods<{
  acceptTokenOwnership: () => ContractSendMethod;
  acceptOwnership: () => ContractSendMethod;
  setConversionFee: (ppm: number) => ContractSendMethod;
  addLiquidity: (
    reserveTokens: string[],
    reserveAmounts: string[],
    minReturn: string
  ) => ContractSendMethod;
  removeLiquidity: (
    amount: string,
    reserveTokens: string[],
    reserveMinReturnAmounts: string[]
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
  reserveBalance: (reserveToken: string) => CallReturn<string>;
}> => buildContract(ABIConverterV28, contractAddress);

export const buildNetworkContract = (
  contractAddress: string
): ContractMethods<{
  rateByPath: (path: string[], amount: string) => CallReturn<string>;
  convertByPath: (
    path: string[],
    amount: string,
    minReturn: string,
    beneficiary: string,
    affiliateAccount: string,
    affiliateFee: number
  ) => ContractSendMethod;
  conversionPath: (
    sourceToken: string,
    destinationToken: string
  ) => CallReturn<string[]>;
}> => buildContract(ABINetworkContract, contractAddress);

export const buildRegistryContract = (
  contractAddress: string
): ContractMethods<{
  getConvertibleTokens: () => CallReturn<string[]>;
  getConvertibleTokenAnchors: (
    convertibleToken: string
  ) => CallReturn<string[]>;
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

export const makeBatchRequest = (calls: any[], from: string) => {
  let batch = new web3.BatchRequest();
  let promises = calls.map(
    call =>
      new Promise((resolve, reject) => {
        let request = call.request({ from }, (error: any, data: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        });
        batch.add(request);
      })
  );

  batch.execute();

  return Promise.all(promises);
};
