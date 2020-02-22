export interface TokenPrice {
  id: string;
  code: string;
  name: string;
  primaryCommunityId: string;
  primaryCommunityImageName: string;
  liquidityDepth: number;
  price: number;
  change24h: number;
  volume24h: Volume24h;
  priceHistory: PriceHistory[];
}

export interface Volume24h {
  ETH: number;
  USD: number;
  EUR: number;
}

export interface PriceHistory {
  [index: number]: number;
}

export type FloatAmount = number;

export interface TokenBalances {
  query_time: number;
  account: string;
  tokens: {
    symbol: string;
    precision: number;
    amount: number;
    contract: string;
  }[];
}

export interface ProposedTransaction {
  fromSymbol: string;
  toSymbol: string;
  amount: FloatAmount;
}

export interface ProposedConvertTransaction {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: FloatAmount;
  toAmount: FloatAmount;
}

export interface TokenDetail {
  _id: string;
  type: string;
  code: string;
  lowerCaseCode: string;
  status: string;
  isDiscoverable: boolean;
  createdAt: string;
  isDeleted: boolean;
  primaryCommunityId: string;
  name: string;
  about: string;
  promotionOrder: null;
  textIcon: string;
  adminProfileId: null;
  details: Detail[];
  primaryCommunityImageName: string;
  order: number;
  liquidityDepth: string;
}

export type EthAddress = string;

export interface CoTrade {
  tokenAddress: string;
  symbol: string;
  smartTokenSymbol: string;
  converterAddress: string;
  smartTokenAddress: string;
  owner: string;
  isOfficial: number;
  isCoTraderVerified: number;
  isBlacklisted: number;
  connectorType: string;
  smartTokenSupply: string;
  connectorBancorReserve: string;
  connectorOriginalReserve: string;
  smartTokenInETH: null;
  smartTokeninUSD: null;
  tokenDecimals: number;
  conversionFee: string;
  converterVersion: string;
}

export interface Detail {
  blockchain: Blockchain;
  blockchainId: string;
  type: string;
  stage: string;
  supply: string;
  decimals: number;
  relayCurrencyId: string;
  converter: Converter;
  symbol: string;
}

export interface Blockchain {
  type: string;
  chainId: string;
}

export interface Converter {
  activatedAt: string;
}

export interface ConvertReturn {
  amount: string;
}

export interface ViewToken {
  symbol: string;
  name: string;
  price: number;
  liqDepth: number;
  logo: string;
  change24h: number;
  volume24h: number;
  balance?: string;
}

export interface TokenPriceExtended extends TokenPrice {
  balance: number;
}

export interface TradingModule {
  init: () => Promise<void>;
  readonly tokens: ViewToken[];
  readonly token: (arg0: string) => ViewToken;
  refreshBalances: (symbols?: string[]) => Promise<void>;
  convert: (propose: ProposedConvertTransaction) => Promise<string>;
  focusSymbol: (symbolName: string) => Promise<void>;
  getReturn: (propose: ProposedTransaction) => Promise<ConvertReturn>;
  getCost: (propose: ProposedTransaction) => Promise<ConvertReturn>;
}

// Amount in an asset without reference to it's actual precision
// E.g. "10000" will be 1.0000 EOS
export type IntegerAmount = string;

export interface ReserveInstance {
  balance: string;
  ratio: number;
  sale_enabled: boolean;
  contract: string;
}

export interface SimpleToken {
  symbol: string;
  name: string;
  contract: string;
  logo: string;
  precision: number;
}

export interface SimpleTokenWithMarketData extends SimpleToken {
  price: string;
  liqDepth: number;
}


export interface Price {
  rate: number;
  diff: number;
  diff7d: number;
  ts: number;
  marketCapUsd: number;
  availableSupply: number;
  volume24h: number;
  diff30d: number;
}

export interface ETH {
  balance: number;
  price: Price;
}

export interface TokenInfo {
  address: string;
  name: string;
  decimals: any;
  symbol: string;
  totalSupply: string;
  owner: string;
  lastUpdated: number;
  issuancesCount: number;
  holdersCount: number;
  price: any;
  description: string;
  ethTransfersCount?: number;
}

export interface Token {
  tokenInfo: TokenInfo;
  balance: number;
  totalIn: number;
  totalOut: number;
}

export interface EthplorerBalance {
  address: string;
  ETH: ETH;
  countTxs: number;
  tokens: Token[];
}

export interface kv {
  [symcode: string]: number;
}

export interface Settings {
  paused: boolean;
  pool_fee: number;
  transaction_fee: string;
  stability_fee: number;
  min_convert: string;
  min_stake: string;
}

export interface Pools {
  depth: kv;
  ratio: kv;
  balance: kv;
  pegged: kv;
}

export enum Feature {
  Trade,
  Wallet,
  Liquidity,
  CreatePool
}

export interface Service {
  namespace: string;
  features: Feature[];
}
