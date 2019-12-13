import axios, { AxiosInstance } from "axios";
import { TokenPrice, IntegerAmount, TokenDetail } from "@/types/bancor";

export interface BancorWrapper {
  getTokens(): Promise<TokenPrice[]>;
  getToken(symbol: string): Promise<TokenDetail>;
  getTokenTicker?(symbol: string): Promise<any>;
  calculateCost(fromId: string, toId: string, amount: any): Promise<IntegerAmount>;
  calculateReturn(fromId: string, toId: string, amount: any): Promise<IntegerAmount>;
}

enum Blockchain {
  EOS,
  ETH
}

export class BancorApi implements BancorWrapper {
  instance: AxiosInstance;
  photoBaseUrl: string;
  blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.instance = axios.create({
      baseURL: "https://api.bancor.network/0.1/"
    });
    this.photoBaseUrl = `https://storage.googleapis.com/bancor-prod-file-store/images/communities/`;
    this.blockchain = blockchain;
  }

  private async request(endpoint: string, params: any) {
    const res = await this.instance.get(endpoint, {
      params: params
    });
    return res.data;
  }

  public async getToken(symbol: string) {
    const endpoint = "currencies/" + symbol;
    const res = await this.request(endpoint, {});
    return {
      ...res.data,
      primaryCommunityImageName:
        this.photoBaseUrl + res.data.primaryCommunityImageName
    };
  }

  public async getTokens(): Promise<TokenPrice[]> {
    const res = await this.request("currencies/tokens", {
      blockchainType: this.blockchain == Blockchain.EOS ? "eos" : "ethereum",
      fromCurrencyCode: "USD",
      includeTotal: true,
      limit: 150,
      orderBy: "volume24h",
      skip: 0,
      sortOrder: "desc"
    });
    return res.data.page.map((token: TokenPrice) => ({
      ...token,
      primaryCommunityImageName:
        this.photoBaseUrl + token.primaryCommunityImageName
    }));
  }

  public async getTokenTicker(symbol: string) {
    const endpoint = "currencies/" + symbol + "/ticker";
    const params = {
      displayCurrencyCode: "USD"
    };
    const res = await this.request(endpoint, params);
    return res.data;
  }

  private async priceDiscovery(tokenId: string, params: any): Promise<IntegerAmount> {
    const endpoint = "currencies/" + tokenId + "/value";
    const res = await this.request(endpoint, params);
    return res.data;
  }

  public async calculateCost(fromId: string, toId: string, amount: any): Promise<IntegerAmount> {
    return this.priceDiscovery(fromId, {
      toCurrencyId: toId,
      toAmount: amount,
      streamId: "loadDefaultConversionRateValue"
    });
  }

  public async calculateReturn(fromId: string, toId: string, amount: any): Promise<IntegerAmount> {
    return this.priceDiscovery(fromId, {
      toCurrencyId: toId,
      fromAmount: amount,
      streamId: "loadValue"
    });
  }

  public async getRate(toCurrency: string, fromCurrency: string) {
    const res = await this.request(`currencies/rate`, {
      toCurrencyCode: toCurrency,
      fromCurrencyCode: fromCurrency
    });
    return res.data;
  }
}

export const bancorApi = new BancorApi(Blockchain.EOS);