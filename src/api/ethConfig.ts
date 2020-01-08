import { EthAddress } from "@/types/bancor";

export const BancorGasLimit: EthAddress =
  "0x607a5C47978e2Eb6d59C6C6f51bc0bF411f4b85a";

// ERC20 Token Contract
export const BntTokenContract: EthAddress =
  "0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C";
export const USDBToken: EthAddress =
  "0x309627af60f0926daa6041b8279484312f2bf060";

export const blackListedConverters: EthAddress[] = [
  "0x3f7Ba8B8F663fdDB47568CCA30eac7aeD3D2F1A3",
  "0x8606704880234178125B2d44cbbe190CCdBde015",
  "0xB018AF916Ed0116404537D1238b18988D652733a",
  "0x38a3Fc625DF834dD34e8EDE60E10Cd3024a6650E",
  "0xb85E52268CBF57b97Ae15136Aa65D4F567B8107c",
  "0xb8a6920962655c97F0E3Eab40E5706Ed934907Cc",
  "0xa00655976c5c9A1eD58b3707b190867069bAbEe5",
  "0x5142127A6703F5Fc80BF11b7b57fF68998F218E4",
  "0x9b10206f236669F4f40E8e9806De9ab1813d3f65",
  "0x587044b74004E3D5eF2D453b7F8d198d9e4cB558",
  "0x967f1c667fC490ddd2fb941e3a461223C03D40e9",
  "0x0160AE697A3538668CDb4698d3B89C7F36AD990d",
  "0xDB9272880400e0AE8e522994f6a959122D94C7B7",
  "0x8a7bDf8388aDD5A24B357D947911bE3a07801C56",
  "0xC04B5a4556d00Bca8eac5F5accA31981a6597409",
  "0x3B42239a8bc2f07bb16b17578fE44fF2422C16F6",
  "0x4F88DFc8e1D7bA696Db158656457797cfBDfB844",
  "0xc11CcE040583640001f5a7E945DFd82f662cC0aE",
  "0x5A9f1cD844cE91AAADAA03059677EeBCf3CF00df",
  "0xAA8CEc9CbD7D051BA86d9DEFF1EC0775Bd4B13c5",
  "0x8bB76C5AE6b7D6bd1678510edD06444AcDf8F72B",
  "0x7E4b0AbAd3407b87a381c1C05aF78d7ad42975E7",
  "0x0Fec04a7526F601a1019eDcD5d5B003101c46A0c",
  "0xFE62e9d7C7781936499eAAe20fBf3671B641516D",
  "0x635C9C9940D512bF5CB455706a28F9C7174d307f",
  "0x73f73391e5F56Ce371A61fC3e18200A73d44Cf6f",
  "0xbE1DAF05Bf9e054b3e28b7E9C318819eF5dAcb58",
  "0x2dAD2c84f6c3957Ef4B83a5DF6F1339Dfd9E6080",
  "0x3B0116363e435D9E4EF24ecA6282a21b7CC662df",
  "0x3167cc146d228C6977dCbadA380dF926b39865b1",
  "0x20d23C7A4b2Ea38f9Dc885bd25b1BC8c2601D44d",
  "0x8658863984d116d4B3A0A5af45979eceAC8a62f1",
  "0x71168843b49E305E4d53dE158683903eF261B37f",
  "0x9F547E89078B24d0e2269Ba08EB411102E98CA14",
  "0x810C99C5De0A673E4bc86090f9bFE96a6D1B49a7",
  "0xE65c7e27C1c086f26CE0Daa986C3d9c24Ef3c2D8",
  "0x32131848eDc60E032aBf0369241D34ec969EBf90",
  "0xd361339550CD8B3e9446Bbb12AEA337785A7aea4",
  "0xFE75413e059EeCF6eb2b92F06456276E8596862B",
  "0x8C73126b85f59d85Aa61391579B4C2710DD70f96",
  "0xBA2BE1Cd1F00470c21385B7cbED6211aeFAc0172",
  "0x4f138e1CEeC7b33dfA4f3051594Ec016a08c7513",
  "0x7BAc8115f3789F4d7a3BFE241EB1bCb4D7F71665",
  "0x2cE573C05c9b8F6ef1a476cc40250972F1f3D63C",
  "0xE0569fd1C3f0affD7E08131A16C06f3381C9355a",
  "0x7B00EFba58CC6fdaB1c162a9C9528B935F5F1af7",
  "0x9b42a6DDE041Bd3b812e4dDe32aD2887fB9D08da",
  "0x0D86A7A059f316F81FcEF32495aAe41Cd0C80511",
  "0x8aD99BAc8cEEb7ab51837909cE0Fd243F15F75AD",
  "0x0D1Fa37b1Dfd006e8f6FAB6FA0d2351856030Ef5",
  "0xdc59242010E2d29617Bfeec57E62c7C00a5ACb52",
  "0xfdbb3b3Cfd6fcc0DD5C1B5bff05bFfAC1DB42258",
  "0xDdA1BFaF552b0F303d27853a4a13Dd440C7E849f",
  "0x1229e2a0711660BE162521f5626C68E85Ec99c7f",
  "0x5039D9B575bD5722d310AF6D2fC11e053c6D03DA",
  "0x6431750a2E43AC6C6b3d84444875576b0Aa7Bd5E"
];

export const ABIBancorGasPriceLimit = [
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

export const ABISmartToken = [
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
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "address" }
    ],
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

export const ABIConverter = [
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
    inputs: [
      { name: "_connectorToken", type: "address" },
      { name: "", type: "uint32" },
      { name: "", type: "bool" },
      { name: "_virtualBalance", type: "uint256" }
    ],
    name: "updateConnector",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
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
    name: "bancorX",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_reserveToken", type: "address" }],
    name: "getReserveBalance",
    outputs: [{ name: "", type: "uint256" }],
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
    inputs: [
      { name: "_fromToken", type: "address" },
      { name: "_toToken", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "getReturn",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" }
    ],
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
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_block", type: "uint256" },
      { name: "_v", type: "uint8" },
      { name: "_r", type: "bytes32" },
      { name: "_s", type: "bytes32" }
    ],
    name: "quickConvertPrioritized",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_disable", type: "bool" }],
    name: "disableConversions",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_fromToken", type: "address" },
      { name: "_toToken", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" }
    ],
    name: "convertInternal",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_reserveToken", type: "address" }],
    name: "getReserveRatio",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_minReturn", type: "uint256" },
      { name: "_conversionId", type: "uint256" },
      { name: "_signature", type: "uint256[]" }
    ],
    name: "completeXConversion2",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
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
    constant: true,
    inputs: [
      { name: "_amount", type: "uint256" },
      { name: "_magnitude", type: "uint8" }
    ],
    name: "getFinalAmount",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "converterType",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_weight", type: "uint32" },
      { name: "", type: "bool" }
    ],
    name: "addConnector",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
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
    inputs: [
      { name: "_token", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "withdrawFromToken",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newManager",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "manager",
    outputs: [{ name: "", type: "address" }],
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
    constant: false,
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_minReturn", type: "uint256" },
      { name: "_conversionId", type: "uint256" },
      { name: "_block", type: "uint256" },
      { name: "_v", type: "uint8" },
      { name: "_r", type: "bytes32" },
      { name: "_s", type: "bytes32" }
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
    constant: false,
    inputs: [
      { name: "_fromToken", type: "address" },
      { name: "_toToken", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" }
    ],
    name: "change",
    outputs: [{ name: "", type: "uint256" }],
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
    inputs: [{ name: "_scaleFactor", type: "uint16" }],
    name: "enableVirtualBalances",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_token", type: "address" },
      { name: "_ratio", type: "uint32" }
    ],
    name: "addReserve",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_fromToken", type: "address" },
      { name: "_toToken", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" },
      { name: "_affiliateAccount", type: "address" },
      { name: "_affiliateFee", type: "uint256" }
    ],
    name: "convert2",
    outputs: [{ name: "", type: "uint256" }],
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
    constant: true,
    inputs: [
      { name: "_reserveToken", type: "address" },
      { name: "_sellAmount", type: "uint256" }
    ],
    name: "getSaleReturn",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_fromToken", type: "address" },
      { name: "_toToken", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" }
    ],
    name: "convert",
    outputs: [{ name: "", type: "uint256" }],
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
    inputs: [
      { name: "_fromConnectorToken", type: "address" },
      { name: "_toConnectorToken", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "getCrossConnectorReturn",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "CONVERTER_CONVERSION_WHITELIST",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_reserveToken", type: "address" },
      { name: "_virtualBalance", type: "uint256" }
    ],
    name: "updateReserveVirtualBalance",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
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
    constant: false,
    inputs: [
      { name: "_connectorToken", type: "address" },
      { name: "_disable", type: "bool" }
    ],
    name: "disableConnectorSale",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_reserveToken", type: "address" },
      { name: "_depositAmount", type: "uint256" }
    ],
    name: "getPurchaseReturn",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_reserveToken", type: "address" },
      { name: "_disable", type: "bool" }
    ],
    name: "disableReserveSale",
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
      { name: "_signature", type: "uint256[]" },
      { name: "_affiliateAccount", type: "address" },
      { name: "_affiliateFee", type: "uint256" }
    ],
    name: "quickConvertPrioritized2",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
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
    name: "conversionWhitelist",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [],
    name: "acceptManagement",
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
    constant: false,
    inputs: [{ name: "_amount", type: "uint256" }],
    name: "fund",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_fromReserveToken", type: "address" },
      { name: "_toReserveToken", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "getCrossReserveReturn",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" }
    ],
    payable: false,
    stateMutability: "view",
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
      { name: "virtualBalance", type: "uint256" },
      { name: "ratio", type: "uint32" },
      { name: "isVirtualBalanceEnabled", type: "bool" },
      { name: "isSaleEnabled", type: "bool" },
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
    inputs: [{ name: "_bancorX", type: "address" }],
    name: "setBancorX",
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
    name: "quickConvert2",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "_newManager", type: "address" }],
    name: "transferManagement",
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
    inputs: [
      { name: "_path", type: "address[]" },
      { name: "_amount", type: "uint256" },
      { name: "_minReturn", type: "uint256" }
    ],
    name: "quickConvert",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
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
    constant: false,
    inputs: [
      { name: "_from", type: "address" },
      { name: "_amount", type: "uint256" }
    ],
    name: "claimTokens",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "_token", type: "address" },
      { name: "_registry", type: "address" },
      { name: "_maxConversionFee", type: "uint32" },
      { name: "_reserveToken", type: "address" },
      { name: "_reserveRatio", type: "uint32" }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
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
      { indexed: false, name: "_prevFee", type: "uint32" },
      { indexed: false, name: "_newFee", type: "uint32" }
    ],
    name: "ConversionFeeUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "_conversionsEnabled", type: "bool" }],
    name: "ConversionsEnable",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "_enabled", type: "bool" }],
    name: "VirtualBalancesEnable",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_prevManager", type: "address" },
      { indexed: true, name: "_newManager", type: "address" }
    ],
    name: "ManagerUpdate",
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
