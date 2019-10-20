import axios, { AxiosInstance } from "axios";
import { BancorWrapper } from "./BaseApi";
import { TokenPrice } from '@/types/bancor'

const bancor = axios.create({
  baseURL: "https://api.bancor.network/0.1/"
});

async function apiBancor(endpoint: string, params: any) {
  try {
    const res = await bancor.get(endpoint, {
      params: params
    });

    console.log({ params: { endpoint, params }, data: res.data });
    return res;
  } catch (error) {
    throw error;
  }
}

export class BancorApi implements BancorWrapper {
  instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: "https://api.bancor.network/0.1/"
    });
  }

  private async request(endpoint: string, params: any) {
    const res = await this.instance.get(endpoint, {
      params: params
    });
    return res.data;
  }

  public async getTokens(): Promise<TokenPrice[]> {
    const res = await this.request("currencies/tokens", {
      blockchainType: "eos",
      fromCurrencyCode: "USD",
      includeTotal: true,
      limit: 150,
      orderBy: "volume24h",
      skip: 0,
      sortOrder: "desc"
    });
    return res.data.page.map((token: TokenPrice) => ({
      ...token,
      primaryCommunityImageName: `https://storage.googleapis.com/bancor-prod-file-store/images/communities/${token.primaryCommunityImageName}`
    }))
  }

  public async getTokenTicker(symbol: string) {
    const endpoint = "currencies/" + symbol + "/ticker";
    const params = {
      displayCurrencyCode: "USD"
    };
    const res = await this.request(endpoint, params);
    return res.data;
  }

  private async priceDiscovery(tokenId: string, params: any) {
    const endpoint = "currencies/" + tokenId + "/value";
    const res = await this.request(endpoint, params);
    return res.data;
  }

  public async calculateCost(fromId: string, toId: string, amount: any) {
    return this.priceDiscovery(fromId, {
      toCurrencyId: toId,
      toAmount: amount,
      streamId: "loadDefaultConversionRateValue"
    });
  }

  public async calculateReturn(fromId: string, toId: string, amount: any) {
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
    })
    return res.data
  }
}

export const bancorApi = new BancorApi();

export default apiBancor;
