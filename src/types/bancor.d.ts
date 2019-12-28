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
  price: string;
  liqDepth: number;
  logo: string;
  precision: number;
}
