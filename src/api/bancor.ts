import axios, { AxiosInstance } from "axios";
import { BancorWrapper } from './BaseApi'

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

  public async getTokens() {
    const res = await this.request("currencies/tokens", {
      blockchainType: "eos",
      fromCurrencyCode: "USD",
      includeTotal: true,
      limit: 150,
      orderBy: "volume24h",
      skip: 0,
      sortOrder: "desc"
    });
    return res.data.page
  }
}

export const bancorApi = new BancorApi()

export default apiBancor