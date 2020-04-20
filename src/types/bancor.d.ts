import { Pools, Pool } from "sxjs";

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

export interface LiquidityParams {
  smartTokenSymbol: string;
  fundAmount: string;
  token1Amount?: string;
  token1Symbol?: string;
  token2Symbol?: string;
  token2Amount?: string;
  onUpdate?: (index: number, sections: Section[]) => void;
}

export interface OpposingLiquidParams {
  smartTokenSymbol: string;
  tokenSymbol: string;
  tokenAmount: string;
}

export interface OpposingLiquid {
  opposingAmount: string;
  smartTokenAmount: string;
}

export interface Section {
  name: string;
  description: string;
}

export interface ProposedConvertTransaction {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: FloatAmount;
  toAmount: FloatAmount;
  onUpdate?: (index: number, sections: Section[]) => void;
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
  slippage?: number;
}

export interface ViewToken {
  id?: string;
  symbol: string;
  name: string;
  price: number;
  liqDepth: number;
  logo: string;
  change24h?: number;
  volume24h?: number;
  balance?: number;
}

interface TokenWithLogo extends AgnosticToken {
  logo: string[];
}

export interface ViewReserve {
  reserveId: string;
  swap: string;
  smartTokenSymbol: string;
  logo: string[];
  symbol: string;
  contract: string;
  balance?: number;
}

export interface ViewRelay {
  id: string;
  symbol: string;
  smartTokenSymbol: string;
  liqDepth: number;
  reserves: ViewReserve[];
  fee: number;
  owner: string;
  swap: string;
}

export interface TokenPriceExtended extends TokenPrice {
  balance: number;
}

export interface TradingModule {
  init: () => Promise<void>;
  readonly token: (arg0: string) => ViewToken;
  readonly tokens: ViewToken[];
  refreshBalances: (symbols?: BaseToken[]) => Promise<void>;
  convert: (propose: ProposedConvertTransaction) => Promise<string>;
  focusSymbol: (symbolName: string) => Promise<void>;
  getReturn: (propose: ProposedTransaction) => Promise<ConvertReturn>;
  getCost: (propose: ProposedTransaction) => Promise<ConvertReturn>;
}

export interface AgnosticToken {
  contract: string;
  precision: number;
  symbol: string;
  network: string;
  amount: number;
}

export interface EosMultiRelay {
  reserves: AgnosticToken[];
  contract: string;
  owner: string;
  isMultiContract: boolean;
  smartToken: AgnosticToken;
  fee: number;
}

export interface ModalChoice {
  symbol: string;
  contract: string;
  balance: number;
  img: string;
}

export interface NetworkChoice extends ModalChoice {
  usdValue: number;
}

export interface Step {
  name: string;
  description: string;
}

export interface CreatePoolParams {
  reserves: [string, string][];
  fee: number;
  onUpdate: (stepIndex: number, steps: Step[]) => void;
}

export interface CreatePoolModule {
  init: () => Promise<void>;
  readonly newPoolTokenChoices: (networkToken: string) => ModalChoice[];
  readonly newNetworkTokenChoices: ModalChoice[];
  createPool: (param: CreatePoolParams) => Promise<string>;
}

export interface FeeParams {
  fee: number;
  smartTokenSymbol: string;
}

export interface NewOwnerParams {
  newOwner: string;
  smartTokenSymbol: string;
}

export interface BaseToken {
  contract: string;
  symbol: string;
}

export interface PromiseEvent {
  name: string;
  description: string;
  promise: () => Promise<any>;
}

export interface PromiseSequence {
  promises: PromiseEvent[];
  title: string;
}

export interface LiquidityModule {
  init: () => Promise<void>;
  readonly relay: (arg0: string) => ViewRelay;
  readonly relays: ViewRelay[];
  readonly supportedFeatures: (arg0: string) => string[];
  calculateOpposingDeposit: (
    opposingDeposit: OpposingLiquidParams
  ) => Promise<OpposingLiquid>;
  updateFee?: (fee: FeeParams) => Promise<string>;
  updateOwner?: (fee: NewOwnerParams) => Promise<string>;
  calculateOpposingWithdraw: (
    opposingWithdraw: OpposingLiquidParams
  ) => Promise<OpposingLiquid>;
  getUserBalances: (
    symbolName: string
  ) => Promise<{
    token1MaxWithdraw: string;
    token2MaxWithdraw: string;
    token1Balance: string;
    token2Balance: string;
    smartTokenBalance: string;
  }>;
  removeLiquidity: (params: LiquidityParams) => Promise<string>;
  addLiquidity: (params: LiquidityParams) => Promise<string>;
  removeRelay?: (symbolName: string) => Promise<string>;
}

interface GetBalanceParam {
  tokens: TokenBalanceParam[];
  cachedOk?: boolean;
}

interface TokenBalanceParam {
  contract: string;
  symbol: string;
  precision?: number;
}

interface TokenBalanceReturn extends TokenBalanceParam {
  balance: number;
}

export interface NetworkModule {
  readonly networkId: string;
  getBalances: (tokens?: GetBalanceParam) => Promise<TokenBalanceReturn[]>;
}

// Amount in an asset without reference to it's actual precision
// E.g. "10000" will be 1.0000 EOS
export type IntegerAmount = string;

export interface BancorAPIResponseToken {
  id: string;
  code: string;
  name: string;
  primaryCommunityImageName: string;
  liquidityDepth: number;
  decimals: number;
  price: number;
  change24h: number;
  volume24h: Volume24H;
  priceHistory: Array<number[]>;
}

export interface Volume24H {
  ETH: number;
  USD: number;
  EUR: number;
}

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

export interface ModulePool extends Pool {
  volume24h: number;
}

export interface ModulePools {
  [symcode: string]: ModulePool;
}
