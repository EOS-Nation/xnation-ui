import { EthAddress } from "@/types/bancor";
import { AbiItem } from "web3-utils";

export const BancorGasLimit: EthAddress =
  "0x607a5C47978e2Eb6d59C6C6f51bc0bF411f4b85a";

export const bancorRegistry = "0x52Ae12ABe5D8BD778BD5397F99cA900624CfADD4";

// ERC20 Token Contract
export const BntTokenContract: EthAddress =
  "0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C";
export const USDBToken: EthAddress =
  "0x309627af60f0926daa6041b8279484312f2bf060";

export const factoryAddress = "0xbEf6A44d3500Fb314a88359A5791FcDCB104d259";

export const ABIContractRegistry: AbiItem[] = [
  {
    constant: true,
    inputs: [],
    name: "BANCOR_CONVERTER_UPGRADER",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "BNT_TOKEN",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_contractName", type: "bytes32" }],
    name: "getAddress",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "CONTRACT_REGISTRY",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_contractName", type: "bytes32" }],
    name: "unregisterAddress",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "uint256" }],
    name: "contractNames",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "BANCOR_CONVERTER_FACTORY",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "BNT_CONVERTER",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_contractName", type: "bytes32" },
      { name: "_contractAddress", type: "address" }
    ],
    name: "registerAddress",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "itemCount",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "BANCOR_FORMULA",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "CONTRACT_FEATURES",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "BANCOR_NETWORK",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "BANCOR_GAS_PRICE_LIMIT",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_contractName", type: "bytes32" }],
    name: "addressOf",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "BANCOR_X",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_contractName", type: "bytes32" },
      { indexed: false, name: "_contractAddress", type: "address" }
    ],
    name: "AddressUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevOwner", type: "address" },
      { indexed: true, name: "_newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  }
];

export const ABIBancorGasPriceLimit: AbiItem[] = [
  {
    constant: false,
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "gasPrice",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "_gasPrice", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevOwner", type: "address" },
      { indexed: true, name: "_newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  },
  {
    constant: false,
    inputs: [{ name: "_gasPrice", type: "uint256" }],
    name: "setGasPrice",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_gasPrice", type: "uint256" }],
    name: "validateGasPrice",
    outputs: [],
    payable: false,
    stateMutability: "view",
    type: "function"
  }
];

export const ABIMultiCallContract: AbiItem[] = [
  {
    constant: false,
    inputs: [
      {
        components: [
          { internalType: "address", name: "target", type: "address" },
          { internalType: "bytes", name: "callData", type: "bytes" }
        ],
        internalType: "struct Multicall.Call[]",
        name: "calls",
        type: "tuple[]"
      },
      { internalType: "bool", name: "strict", type: "bool" }
    ],
    name: "aggregate",
    outputs: [
      { internalType: "uint256", name: "blockNumber", type: "uint256" },
      {
        components: [
          { internalType: "bool", name: "success", type: "bool" },
          { internalType: "bytes", name: "data", type: "bytes" }
        ],
        internalType: "struct Multicall.Return[]",
        name: "returnData",
        type: "tuple[]"
      }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  }
];

export const ABISmartToken: AbiItem[] = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "success", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_disable", type: "bool" }],
    name: "disableTransfers",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "transferFrom",
    outputs: [{ name: "success", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "version",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "withdrawTokens",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "issue",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_from", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "destroy",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "success", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "transfersEnabled",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "address" }, { name: "", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "_name", type: "string" },
      { name: "_symbol", type: "string" },
      { name: "_decimals", type: "uint8" }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "_token", type: "address" }],
    name: "NewSmartToken",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "_amount", type: "uint256" }],
    name: "Issuance",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "_amount", type: "uint256" }],
    name: "Destruction",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_from", type: "address" },
      { indexed: true, name: "_to", type: "address" },
      { indexed: false, name: "_value", type: "uint256" }
    ],
    name: "Transfer",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_owner", type: "address" },
      { indexed: true, name: "_spender", type: "address" },
      { indexed: false, name: "_value", type: "uint256" }
    ],
    name: "Approval",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevOwner", type: "address" },
      { indexed: true, name: "_newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  }
];

export const ABIConverterRegistry: AbiItem[] = [
  {
    constant: false,
    inputs: [{ name: "_onlyOwnerCanUpdateRegistry", type: "bool" }],
    name: "restrictRegistryUpdate",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getSmartTokens",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_convertibleToken", type: "address" }],
    name: "getConvertibleTokenAnchors",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_type", type: "uint16" },
      { name: "_reserveTokens", type: "address[]" },
      { name: "_reserveWeights", type: "uint32[]" }
    ],
    name: "getLiquidityPoolByConfig",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_smartTokens", type: "address[]" }],
    name: "getConvertersBySmartTokens",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "onlyOwnerCanUpdateRegistry",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_value", type: "address" }],
    name: "isConvertibleToken",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_value", type: "address" }],
    name: "isSmartToken",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_convertibleToken", type: "address" }],
    name: "getConvertibleTokenAnchorCount",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "updateRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_index", type: "uint256" }],
    name: "getAnchor",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_type", type: "uint16" },
      { name: "_name", type: "string" },
      { name: "_symbol", type: "string" },
      { name: "_decimals", type: "uint8" },
      { name: "_maxConversionFee", type: "uint32" },
      { name: "_reserveTokens", type: "address[]" },
      { name: "_reserveWeights", type: "uint32[]" }
    ],
    name: "newConverter",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getConvertibleTokens",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_convertibleToken", type: "address" },
      { name: "_index", type: "uint256" }
    ],
    name: "getConvertibleTokenAnchor",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_anchors", type: "address[]" }],
    name: "getConvertersByAnchors",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "prevRegistry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getConvertibleTokenCount",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_converter", type: "address" }],
    name: "addConverter",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_convertibleToken", type: "address" },
      { name: "_value", type: "address" }
    ],
    name: "isConvertibleTokenSmartToken",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getLiquidityPoolCount",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "registry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getLiquidityPools",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_index", type: "uint256" }],
    name: "getConvertibleToken",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_converter", type: "address" }],
    name: "isSimilarLiquidityPoolRegistered",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_converter", type: "address" }],
    name: "isConverterValid",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_converter", type: "address" }],
    name: "removeConverter",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_index", type: "uint256" }],
    name: "getSmartToken",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_convertibleToken", type: "address" }],
    name: "getConvertibleTokenSmartTokenCount",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_index", type: "uint256" }],
    name: "getLiquidityPool",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "restoreRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_convertibleToken", type: "address" },
      { name: "_value", type: "address" }
    ],
    name: "isConvertibleTokenAnchor",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_reserveTokens", type: "address[]" },
      { name: "_reserveWeights", type: "uint32[]" }
    ],
    name: "getLiquidityPoolByReserveConfig",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "safeTransfer",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getAnchorCount",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_convertibleToken", type: "address" },
      { name: "_index", type: "uint256" }
    ],
    name: "getConvertibleTokenSmartToken",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_value", type: "address" }],
    name: "isAnchor",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "safeTransferFrom",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getSmartTokenCount",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_value", type: "address" }],
    name: "isLiquidityPool",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "safeApprove",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getAnchors",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_convertibleToken", type: "address" }],
    name: "getConvertibleTokenSmartTokens",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "_registry", type: "address" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "_anchor", type: "address" }],
    name: "ConverterAnchorAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "_anchor", type: "address" }],
    name: "ConverterAnchorRemoved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "_liquidityPool", type: "address" }],
    name: "LiquidityPoolAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "_liquidityPool", type: "address" }],
    name: "LiquidityPoolRemoved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_convertibleToken", type: "address" },
      { indexed: true, name: "_smartToken", type: "address" }
    ],
    name: "ConvertibleTokenAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_convertibleToken", type: "address" },
      { indexed: true, name: "_smartToken", type: "address" }
    ],
    name: "ConvertibleTokenRemoved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "_smartToken", type: "address" }],
    name: "SmartTokenAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "_smartToken", type: "address" }],
    name: "SmartTokenRemoved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevOwner", type: "address" },
      { indexed: true, name: "_newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  }
];

export const V2PoolsTokenContainer: AbiItem[] = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "withdrawTokens",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "_name", type: "string" },
      { name: "_symbol", type: "string" },
      { name: "_decimals", type: "uint8" }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevOwner", type: "address" },
      { indexed: true, name: "_newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  },
  {
    constant: true,
    inputs: [],
    name: "poolTokens",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "createToken",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "mint",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_from", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "burn",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  }
];

export const ABIConverterV28: AbiItem[] = [
  {
    constant: false,
    inputs: [{ name: "_onlyOwnerCanUpdateRegistry", type: "bool" }],
    name: "restrictRegistryUpdate",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "reserveRatio",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_address", type: "address" }],
    name: "connectors",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint32" },
      { name: "", type: "bool" },
      { name: "", type: "bool" },
      { name: "", type: "bool" }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "hasETHReserve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_index", type: "uint256" }],
    name: "connectorTokens",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_reserveToken", type: "address" }],
    name: "reserveWeight",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "getReturn",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferTokenOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "isActive",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "onlyOwnerCanUpdateRegistry",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptTokenOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "withdrawFromAnchor",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "converterType",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_amount", type: "uint256" }],
    name: "liquidate",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "updateRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_whitelist", type: "address" }],
    name: "setConversionWhitelist",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "version",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "conversionFee",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "withdrawTokens",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "prevRegistry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferAnchorOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_to", type: "address" }],
    name: "withdrawETH",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_weight", type: "uint32" }
    ],
    name: "addReserve",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_x", type: "uint256" }],
    name: "decimalLength",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "connectorTokenCount",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "registry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_reserveTokens", type: "address[]" },
      { name: "_reserveAmounts", type: "uint256[]" },
      { name: "_minReturn", type: "uint256" }
    ],
    name: "addLiquidity",
    outputs: [],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "maxConversionFee",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "reserveTokenCount",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_values", type: "uint256[]" }],
    name: "geometricMean",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "targetAmountAndFee",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_amount", type: "uint256" },
      { name: "_reserveTokens", type: "address[]" },
      { name: "_reserveMinReturnAmounts", type: "uint256[]" }
    ],
    name: "removeLiquidity",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "restoreRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_n", type: "uint256" }, { name: "_d", type: "uint256" }],
    name: "roundDiv",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "conversionsEnabled",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "conversionWhitelist",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_amount", type: "uint256" }],
    name: "fund",
    outputs: [],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptAnchorOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "uint256" }],
    name: "reserveTokens",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "isV28OrHigher",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "anchor",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "upgrade",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "address" }],
    name: "reserves",
    outputs: [
      { name: "balance", type: "uint256" },
      { name: "weight", type: "uint32" },
      { name: "deprecated1", type: "bool" },
      { name: "deprecated2", type: "bool" },
      { name: "isSet", type: "bool" }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_connectorToken", type: "address" }],
    name: "getConnectorBalance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_reserveToken", type: "address" }],
    name: "reserveBalance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_trader", type: "address" },
      { name: "_beneficiary", type: "address" }
    ],
    name: "convert",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_conversionFee", type: "uint32" }],
    name: "setConversionFee",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "token",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "_token", type: "address" },
      { name: "_registry", type: "address" },
      { name: "_maxConversionFee", type: "uint32" }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  { payable: true, stateMutability: "payable", type: "fallback" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_connectorToken", type: "address" },
      { indexed: false, name: "_tokenSupply", type: "uint256" },
      { indexed: false, name: "_connectorBalance", type: "uint256" },
      { indexed: false, name: "_connectorWeight", type: "uint32" }
    ],
    name: "PriceDataUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_provider", type: "address" },
      { indexed: true, name: "_reserveToken", type: "address" },
      { indexed: false, name: "_amount", type: "uint256" },
      { indexed: false, name: "_newBalance", type: "uint256" },
      { indexed: false, name: "_newSupply", type: "uint256" }
    ],
    name: "LiquidityAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_provider", type: "address" },
      { indexed: true, name: "_reserveToken", type: "address" },
      { indexed: false, name: "_amount", type: "uint256" },
      { indexed: false, name: "_newBalance", type: "uint256" },
      { indexed: false, name: "_newSupply", type: "uint256" }
    ],
    name: "LiquidityRemoved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "_anchor", type: "address" },
      { indexed: false, name: "_activated", type: "bool" }
    ],
    name: "Activation",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_fromToken", type: "address" },
      { indexed: true, name: "_toToken", type: "address" },
      { indexed: true, name: "_trader", type: "address" },
      { indexed: false, name: "_amount", type: "uint256" },
      { indexed: false, name: "_return", type: "uint256" },
      { indexed: false, name: "_conversionFee", type: "int256" }
    ],
    name: "Conversion",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_token1", type: "address" },
      { indexed: true, name: "_token2", type: "address" },
      { indexed: false, name: "_rateN", type: "uint256" },
      { indexed: false, name: "_rateD", type: "uint256" }
    ],
    name: "TokenRateUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "_prevFee", type: "uint32" },
      { indexed: false, name: "_newFee", type: "uint32" }
    ],
    name: "ConversionFeeUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevOwner", type: "address" },
      { indexed: true, name: "_newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  }
];

export const ABIConverter: AbiItem[] = [
  {
    constant: false,
    inputs: [{ name: "_onlyOwnerCanUpdateRegistry", type: "bool" }],
    name: "restrictRegistryUpdate",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "reserveRatio",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_address", type: "address" }],
    name: "connectors",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint32" },
      { name: "", type: "bool" },
      { name: "", type: "bool" },
      { name: "", type: "bool" }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "hasETHReserve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_index", type: "uint256" }],
    name: "connectorTokens",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_reserveToken", type: "address" }],
    name: "reserveWeight",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "getReturn",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferTokenOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "isActive",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "onlyOwnerCanUpdateRegistry",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptTokenOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "withdrawFromAnchor",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "converterType",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_amount", type: "uint256" }],
    name: "liquidate",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "rateAndFee",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "updateRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_whitelist", type: "address" }],
    name: "setConversionWhitelist",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "version",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "conversionFee",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "withdrawTokens",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "prevRegistry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferAnchorOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_to", type: "address" }],
    name: "withdrawETH",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_weight", type: "uint32" }
    ],
    name: "addReserve",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_x", type: "uint256" }],
    name: "decimalLength",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "connectorTokenCount",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "registry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_reserveTokens", type: "address[]" },
      { name: "_reserveAmounts", type: "uint256[]" },
      { name: "_minReturn", type: "uint256" }
    ],
    name: "addLiquidity",
    outputs: [],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "maxConversionFee",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "reserveTokenCount",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_values", type: "uint256[]" }],
    name: "geometricMean",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_amount", type: "uint256" },
      { name: "_reserveTokens", type: "address[]" },
      { name: "_reserveMinReturnAmounts", type: "uint256[]" }
    ],
    name: "removeLiquidity",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "restoreRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_n", type: "uint256" }, { name: "_d", type: "uint256" }],
    name: "roundDiv",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "conversionsEnabled",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "conversionWhitelist",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_amount", type: "uint256" }],
    name: "fund",
    outputs: [],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptAnchorOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "uint256" }],
    name: "reserveTokens",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "safeTransfer",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "isV28OrHigher",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "anchor",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "upgrade",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "address" }],
    name: "reserves",
    outputs: [
      { name: "balance", type: "uint256" },
      { name: "weight", type: "uint32" },
      { name: "deprecated1", type: "bool" },
      { name: "deprecated2", type: "bool" },
      { name: "isSet", type: "bool" }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_connectorToken", type: "address" }],
    name: "getConnectorBalance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "safeTransferFrom",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_reserveToken", type: "address" }],
    name: "reserveBalance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_trader", type: "address" },
      { name: "_beneficiary", type: "address" }
    ],
    name: "convert",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "safeApprove",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_conversionFee", type: "uint32" }],
    name: "setConversionFee",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "token",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "_token", type: "address" },
      { name: "_registry", type: "address" },
      { name: "_maxConversionFee", type: "uint32" }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  { payable: true, stateMutability: "payable", type: "fallback" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_connectorToken", type: "address" },
      { indexed: false, name: "_tokenSupply", type: "uint256" },
      { indexed: false, name: "_connectorBalance", type: "uint256" },
      { indexed: false, name: "_connectorWeight", type: "uint32" }
    ],
    name: "PriceDataUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_provider", type: "address" },
      { indexed: true, name: "_reserveToken", type: "address" },
      { indexed: false, name: "_amount", type: "uint256" },
      { indexed: false, name: "_newBalance", type: "uint256" },
      { indexed: false, name: "_newSupply", type: "uint256" }
    ],
    name: "LiquidityAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_provider", type: "address" },
      { indexed: true, name: "_reserveToken", type: "address" },
      { indexed: false, name: "_amount", type: "uint256" },
      { indexed: false, name: "_newBalance", type: "uint256" },
      { indexed: false, name: "_newSupply", type: "uint256" }
    ],
    name: "LiquidityRemoved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "_anchor", type: "address" },
      { indexed: false, name: "_activated", type: "bool" }
    ],
    name: "Activation",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_fromToken", type: "address" },
      { indexed: true, name: "_toToken", type: "address" },
      { indexed: true, name: "_trader", type: "address" },
      { indexed: false, name: "_amount", type: "uint256" },
      { indexed: false, name: "_return", type: "uint256" },
      { indexed: false, name: "_conversionFee", type: "int256" }
    ],
    name: "Conversion",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_token1", type: "address" },
      { indexed: true, name: "_token2", type: "address" },
      { indexed: false, name: "_rateN", type: "uint256" },
      { indexed: false, name: "_rateD", type: "uint256" }
    ],
    name: "TokenRateUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "_prevFee", type: "uint32" },
      { indexed: false, name: "_newFee", type: "uint32" }
    ],
    name: "ConversionFeeUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevOwner", type: "address" },
      { indexed: true, name: "_newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  }
];

export const smartTokenByteCode =
  "60c0604052600360808190527f302e33000000000000000000000000000000000000000000000000000000000060a09081526200004091600891906200015a565b506009805460ff191660011790553480156200005b57600080fd5b5060405162000f1a38038062000f1a833981016040908152815160208301519183015160008054600160a060020a03191633178155918401805190949390930192909184918491849181108015620000b4575060008351115b1515620000c057600080fd5b8351620000d59060029060208701906200015a565b508251620000eb9060039060208601906200015a565b506004805460ff191660ff939093169290921790915560058190553360009081526006602090815260409182902092909255805130815290517ff4cd1f8571e8d9c97ffcb81558807ab73f9803d54de5da6a0420593c82a4a9f09450908190039091019150a1505050620001ff565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106200019d57805160ff1916838001178555620001cd565b82800160010185558215620001cd579182015b82811115620001cd578251825591602001919060010190620001b0565b50620001db929150620001df565b5090565b620001fc91905b80821115620001db5760008155600101620001e6565b90565b610d0b806200020f6000396000f3006080604052600436106101065763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166306fdde03811461010b578063095ea7b3146101955780631608f18f146101cd57806318160ddd146101e957806323b872dd14610210578063313ce5671461023a57806354fd4d50146102655780635e35359e1461027a57806370a08231146102a457806379ba5097146102c5578063867904b4146102da5780638da5cb5b146102fe57806395d89b411461032f578063a24835d114610344578063a9059cbb14610368578063bef97c871461038c578063d4ee1d90146103a1578063dd62ed3e146103b6578063f2fde38b146103dd575b600080fd5b34801561011757600080fd5b506101206103fe565b6040805160208082528351818301528351919283929083019185019080838360005b8381101561015a578181015183820152602001610142565b50505050905090810190601f1680156101875780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3480156101a157600080fd5b506101b9600160a060020a0360043516602435610489565b604080519115158252519081900360200190f35b3480156101d957600080fd5b506101e76004351515610542565b005b3480156101f557600080fd5b506101fe61056b565b60408051918252519081900360200190f35b34801561021c57600080fd5b506101b9600160a060020a0360043581169060243516604435610571565b34801561024657600080fd5b5061024f61059f565b6040805160ff9092168252519081900360200190f35b34801561027157600080fd5b506101206105a8565b34801561028657600080fd5b506101e7600160a060020a0360043581169060243516604435610603565b3480156102b057600080fd5b506101fe600160a060020a03600435166106f9565b3480156102d157600080fd5b506101e761070b565b3480156102e657600080fd5b506101e7600160a060020a0360043516602435610793565b34801561030a57600080fd5b5061031361089c565b60408051600160a060020a039092168252519081900360200190f35b34801561033b57600080fd5b506101206108ab565b34801561035057600080fd5b506101e7600160a060020a0360043516602435610906565b34801561037457600080fd5b506101b9600160a060020a03600435166024356109ef565b34801561039857600080fd5b506101b9610a1b565b3480156103ad57600080fd5b50610313610a24565b3480156103c257600080fd5b506101fe600160a060020a0360043581169060243516610a33565b3480156103e957600080fd5b506101e7600160a060020a0360043516610a50565b6002805460408051602060018416156101000260001901909316849004601f810184900484028201840190925281815292918301828280156104815780601f1061045657610100808354040283529160200191610481565b820191906000526020600020905b81548152906001019060200180831161046457829003601f168201915b505050505081565b600082600160a060020a03811615156104a157600080fd5b8215806104cf5750336000908152600760209081526040808320600160a060020a0388168452909152902054155b15156104da57600080fd5b336000818152600760209081526040808320600160a060020a03891680855290835292819020879055805187815290519293927f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925929181900390910190a35060019392505050565b600054600160a060020a0316331461055957600080fd5b6009805460ff19169115919091179055565b60055481565b60095460009060ff16151561058257fe5b61058d848484610ab1565b151561059557fe5b5060019392505050565b60045460ff1681565b6008805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156104815780601f1061045657610100808354040283529160200191610481565b600054600160a060020a0316331461061a57600080fd5b82600160a060020a038116151561063057600080fd5b82600160a060020a038116151561064657600080fd5b83600160a060020a03811630141561065d57600080fd5b85600160a060020a031663a9059cbb86866040518363ffffffff167c01000000000000000000000000000000000000000000000000000000000281526004018083600160a060020a0316600160a060020a0316815260200182815260200192505050600060405180830381600087803b1580156106d957600080fd5b505af11580156106ed573d6000803e3d6000fd5b50505050505050505050565b60066020526000908152604090205481565b600154600160a060020a0316331461072257600080fd5b60015460008054604051600160a060020a0393841693909116917f343765429aea5a34b3ff6a3785a98a5abb2597aca87bfbb58632c173d585373a91a3600180546000805473ffffffffffffffffffffffffffffffffffffffff19908116600160a060020a03841617909155169055565b600054600160a060020a031633146107aa57600080fd5b81600160a060020a03811615156107c057600080fd5b82600160a060020a0381163014156107d757600080fd5b6005546107ea908463ffffffff610bda16565b600555600160a060020a038416600090815260066020526040902054610816908463ffffffff610bda16565b600160a060020a03851660009081526006602090815260409182902092909255805185815290517f9386c90217c323f58030f9dadcbc938f807a940f4ff41cd4cead9562f5da7dc3929181900390910190a1604080518481529051600160a060020a038616913091600080516020610cc08339815191529181900360200190a350505050565b600054600160a060020a031681565b6003805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156104815780601f1061045657610100808354040283529160200191610481565b33600160a060020a03831614806109275750600054600160a060020a031633145b151561093257600080fd5b600160a060020a03821660009081526006602052604090205461095b908263ffffffff610bf316565b600160a060020a038316600090815260066020526040902055600554610987908263ffffffff610bf316565b6005556040805182815290513091600160a060020a03851691600080516020610cc08339815191529181900360200190a36040805182815290517f9a1b418bc061a5d80270261562e6986a35d995f8051145f277be16103abd34539181900360200190a15050565b60095460009060ff161515610a0057fe5b610a0a8383610c08565b1515610a1257fe5b50600192915050565b60095460ff1681565b600154600160a060020a031681565b600760209081526000928352604080842090915290825290205481565b600054600160a060020a03163314610a6757600080fd5b600054600160a060020a0382811691161415610a8257600080fd5b6001805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0392909216919091179055565b600083600160a060020a0381161515610ac957600080fd5b83600160a060020a0381161515610adf57600080fd5b600160a060020a0386166000908152600760209081526040808320338452909152902054610b13908563ffffffff610bf316565b600160a060020a038716600081815260076020908152604080832033845282528083209490945591815260069091522054610b54908563ffffffff610bf316565b600160a060020a038088166000908152600660205260408082209390935590871681522054610b89908563ffffffff610bda16565b600160a060020a0380871660008181526006602090815260409182902094909455805188815290519193928a1692600080516020610cc083398151915292918290030190a350600195945050505050565b600082820183811015610bec57600080fd5b9392505050565b600081831015610c0257600080fd5b50900390565b600082600160a060020a0381161515610c2057600080fd5b33600090815260066020526040902054610c40908463ffffffff610bf316565b3360009081526006602052604080822092909255600160a060020a03861681522054610c72908463ffffffff610bda16565b600160a060020a038516600081815260066020908152604091829020939093558051868152905191923392600080516020610cc08339815191529281900390910190a350600193925050505600ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa165627a7a72305820ce51519b7f4e3128abe81f88a7ef774780cd8fec3f3a7fe7e2cd72f7ce44e58d0029";

export const ethErc20WrapperContract =
  "0xc0829421C1d260BD3cB3E0F06cfE2D52db2cE315";

export const ethReserveAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const ABINetworkPathFinder: AbiItem[] = [
  {
    constant: false,
    inputs: [{ name: "_adminOnly", type: "bool" }],
    name: "restrictRegistryUpdate",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_anchorToken", type: "address" }],
    name: "setAnchorToken",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "updateRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "prevRegistry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" }
    ],
    name: "generatePath",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "registry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "restoreRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "adminOnly",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "anchorToken",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "_registry", type: "address" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevOwner", type: "address" },
      { indexed: true, name: "_newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  }
];

export const ABINetworkContract: AbiItem[] = [
  {
    constant: false,
    inputs: [{ name: "_onlyOwnerCanUpdateRegistry", type: "bool" }],
    name: "restrictRegistryUpdate",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_register", type: "bool" }
    ],
    name: "registerEtherToken",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" }
    ],
    name: "getReturnByPath",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_beneficiary", type: "address" },
      { name: "_affiliateAccount", type: "address" },
      { name: "_affiliateFee", type: "uint256" }
    ],
    name: "claimAndConvertFor2",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "onlyOwnerCanUpdateRegistry",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "updateRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_affiliateAccount", type: "address" },
      { name: "_affiliateFee", type: "uint256" }
    ],
    name: "convert2",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "maxAffiliateFee",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "withdrawTokens",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "prevRegistry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "registry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" }
    ],
    name: "rateByPath",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "address" }],
    name: "etherTokens",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_bancorX", type: "address" },
      { name: "_conversionId", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_beneficiary", type: "address" }
    ],
    name: "completeXConversion",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_beneficiary", type: "address" },
      { name: "_affiliateAccount", type: "address" },
      { name: "_affiliateFee", type: "uint256" }
    ],
    name: "convertFor2",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_beneficiary", type: "address" }
    ],
    name: "claimAndConvertFor",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "restoreRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_beneficiary", type: "address" },
      { name: "_affiliateAccount", type: "address" },
      { name: "_affiliateFee", type: "uint256" }
    ],
    name: "convertByPath",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_targetBlockchain", type: "bytes32" },
      { name: "_targetAccount", type: "bytes32" },
      { name: "_conversionId", type: "uint256" }
    ],
    name: "xConvert",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" }
    ],
    name: "claimAndConvert",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_beneficiary", type: "address" }
    ],
    name: "convertFor",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_targetBlockchain", type: "bytes32" },
      { name: "_targetAccount", type: "bytes32" },
      { name: "_conversionId", type: "uint256" },
      { name: "_affiliateAccount", type: "address" },
      { name: "_affiliateFee", type: "uint256" }
    ],
    name: "xConvert2",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "safeTransfer",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" }
    ],
    name: "conversionPath",
    outputs: [{ name: "", type: "address[]" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "safeTransferFrom",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_affiliateAccount", type: "address" },
      { name: "_affiliateFee", type: "uint256" }
    ],
    name: "claimAndConvert2",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "safeApprove",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" }
    ],
    name: "convert",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_maxAffiliateFee", type: "uint256" }],
    name: "setMaxAffiliateFee",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "_registry", type: "address" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_smartToken", type: "address" },
      { indexed: true, name: "_fromToken", type: "address" },
      { indexed: true, name: "_toToken", type: "address" },
      { indexed: false, name: "_fromAmount", type: "uint256" },
      { indexed: false, name: "_toAmount", type: "uint256" },
      { indexed: false, name: "_trader", type: "address" }
    ],
    name: "Conversion",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevOwner", type: "address" },
      { indexed: true, name: "_newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  }
];

export const ABIV2Converter: AbiItem[] = [
  {
    constant: false,
    inputs: [{ name: "_onlyOwnerCanUpdateRegistry", type: "bool" }],
    name: "restrictRegistryUpdate",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "primaryReserveToken",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "maxStakedBalanceEnabled",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "reserveRatio",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_address", type: "address" }],
    name: "connectors",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint32" },
      { name: "", type: "bool" },
      { name: "", type: "bool" },
      { name: "", type: "bool" }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "hasETHReserve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_index", type: "uint256" }],
    name: "connectorTokens",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_reserveToken", type: "address" }],
    name: "reserveWeight",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "getReturn",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferTokenOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "priceOracle",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "onlyOwnerCanUpdateRegistry",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptTokenOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "withdrawFromAnchor",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "updateRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_whitelist", type: "address" }],
    name: "setConversionWhitelist",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "version",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "conversionFee",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "withdrawTokens",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "prevRegistry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferAnchorOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_to", type: "address" }],
    name: "withdrawETH",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "connectorTokenCount",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "registry",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "maxConversionFee",
    outputs: [{ name: "", type: "uint32" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "address" }],
    name: "maxStakedBalances",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "reserveTokenCount",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "referenceRate",
    outputs: [{ name: "n", type: "uint256" }, { name: "d", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "restoreRegistry",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "conversionsEnabled",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "referenceRateUpdateTime",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "conversionWhitelist",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptAnchorOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "uint256" }],
    name: "reserveTokens",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "isV28OrHigher",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "anchor",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "upgrade",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "", type: "address" }],
    name: "reserves",
    outputs: [
      { name: "balance", type: "uint256" },
      { name: "weight", type: "uint32" },
      { name: "deprecated1", type: "bool" },
      { name: "deprecated2", type: "bool" },
      { name: "isSet", type: "bool" }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_connectorToken", type: "address" }],
    name: "getConnectorBalance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "secondaryReserveToken",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_reserveToken", type: "address" }],
    name: "reserveBalance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_trader", type: "address" },
      { name: "_beneficiary", type: "address" }
    ],
    name: "convert",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_conversionFee", type: "uint32" }],
    name: "setConversionFee",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "lastConversionRate",
    outputs: [{ name: "n", type: "uint256" }, { name: "d", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "token",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "_poolTokensContainer", type: "address" },
      { name: "_registry", type: "address" },
      { name: "_maxConversionFee", type: "uint32" }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  { payable: true, stateMutability: "payable", type: "fallback" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_provider", type: "address" },
      { indexed: true, name: "_reserveToken", type: "address" },
      { indexed: false, name: "_amount", type: "uint256" },
      { indexed: false, name: "_newBalance", type: "uint256" },
      { indexed: false, name: "_newSupply", type: "uint256" }
    ],
    name: "LiquidityAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_provider", type: "address" },
      { indexed: true, name: "_reserveToken", type: "address" },
      { indexed: false, name: "_amount", type: "uint256" },
      { indexed: false, name: "_newBalance", type: "uint256" },
      { indexed: false, name: "_newSupply", type: "uint256" }
    ],
    name: "LiquidityRemoved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "_anchor", type: "address" },
      { indexed: false, name: "_activated", type: "bool" }
    ],
    name: "Activation",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_fromToken", type: "address" },
      { indexed: true, name: "_toToken", type: "address" },
      { indexed: true, name: "_trader", type: "address" },
      { indexed: false, name: "_amount", type: "uint256" },
      { indexed: false, name: "_return", type: "uint256" },
      { indexed: false, name: "_conversionFee", type: "int256" }
    ],
    name: "Conversion",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_token1", type: "address" },
      { indexed: true, name: "_token2", type: "address" },
      { indexed: false, name: "_rateN", type: "uint256" },
      { indexed: false, name: "_rateD", type: "uint256" }
    ],
    name: "TokenRateUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "_prevFee", type: "uint32" },
      { indexed: false, name: "_newFee", type: "uint32" }
    ],
    name: "ConversionFeeUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevOwner", type: "address" },
      { indexed: true, name: "_newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  },
  {
    constant: true,
    inputs: [],
    name: "converterType",
    outputs: [{ name: "", type: "uint16" }],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "isActive",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_primaryReserveToken", type: "address" },
      { name: "_primaryReserveOracle", type: "address" },
      { name: "_secondaryReserveOracle", type: "address" }
    ],
    name: "activate",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_reserveToken", type: "address" }],
    name: "reserveStakedBalance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_reserveToken", type: "address" },
      { name: "_balance", type: "uint256" }
    ],
    name: "setReserveStakedBalance",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_reserve1MaxStakedBalance", type: "uint256" },
      { name: "_reserve2MaxStakedBalance", type: "uint256" }
    ],
    name: "setMaxStakedBalances",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "disableMaxStakedBalances",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_reserveToken", type: "address" }],
    name: "poolToken",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_poolToken", type: "address" }],
    name: "liquidationLimit",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_weight", type: "uint32" }
    ],
    name: "addReserve",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "effectiveTokensRate",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_sourceToken", type: "address" },
      { name: "_targetToken", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "targetAmountAndFee",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_reserveToken", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" }
    ],
    name: "addLiquidity",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_poolToken", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" }
    ],
    name: "removeLiquidity",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_poolToken", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "removeLiquidityReturn",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "effectiveReserveWeights",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  }
];
