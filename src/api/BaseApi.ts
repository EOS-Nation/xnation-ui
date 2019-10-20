import { bancorApi } from "./bancor";
import { TokenPrice } from "@/types/bancor";

export interface BancorWrapper {
  getTokens(): Promise<TokenPrice[]>;
  getToken(symbol: string): Promise<any>;
  getTokenTicker(symbol: string): Promise<any>;
  calculateCost(fromId: string, toId: string, amount: any): Promise<any>;
  calculateReturn(fromId: string, toId: string, amount: any): Promise<any>;
}

class BaseApi {
  apis: BancorWrapper[];
  symbolDictionary: {
    [index: string]: number;
  };
  idDictionary: {
    [index: string]: number;
  };

  constructor(apis: any[]) {
    this.apis = apis;
    this.symbolDictionary = {};
    this.idDictionary = {};
  }

  private populated(): boolean {
    return Object.keys(this.symbolDictionary).length > 0;
  }

  private async findApiById(id: string): Promise<BancorWrapper> {
    if (!this.populated()) {
      await this.getTokens();
    }
    const index = this.idDictionary[id];
    return this.apis[index];
  }

  private async findApiBySymbol(symbol: string): Promise<BancorWrapper> {
    if (!this.populated()) {
      await this.getTokens();
    }
    const index = this.symbolDictionary[symbol];
    return this.apis[index];
  }

  public async getTokens(): Promise<any> {
    const tokenData = [];
    for (var i = 0; i < this.apis.length; i++) {
      const tokens = await this.apis[i].getTokens();
      tokens.forEach((token: any) => {
        this.symbolDictionary[token.code] = i;
        this.idDictionary[token.id] = i;
      });
      tokenData.push(tokens);
    }
    return tokenData.flat(1);
  }

  public async getToken(symbol: string) {
    const api = await this.findApiBySymbol(symbol);
    return api.getToken(symbol);
  }

  public async calculateCost(fromId: string, toId: string, amount: any) {
    const api = await this.findApiById(fromId);
    return api.calculateCost(fromId, toId, amount);
  }

  public async calculateReturn(fromId: string, toId: string, amount: any) {
    const api = await this.findApiById(fromId);
    return api.calculateReturn(fromId, toId, amount);
  }

  public async getRate(toCurrency: string, fromCurrency: string) {
    // Hard code into BancorApi for Rate
    return bancorApi.getRate(toCurrency, fromCurrency);
  }

  public async getTokenTicker(symbol: string) {
    // TODO
    // Clear hard coded and properly figure out which API to use
    const index = 0;
    return this.apis[index].getTokenTicker(symbol);
  }
}

export const baseApi = new BaseApi([bancorApi]);
