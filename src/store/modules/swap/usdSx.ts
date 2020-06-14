import { VuexModule, action, Module, mutation } from "vuex-class-component";
import {
  ProposedConvertTransaction,
  TradingModule,
  ViewToken,
  BaseToken,
  ProposedFromTransaction,
  ProposedToTransaction,
  ViewAmount
} from "@/types/bancor";
import { vxm } from "@/store";
import {
  get_settings,
  get_volume,
  get_rate,
  get_price,
  get_inverse_rate,
  Tokens,
  Settings,
  get_tokens,
  Token,
  Volume
} from "sxjs";
import { rpc } from "@/api/rpc";
import { asset_to_number, number_to_asset, symbol, Sym } from "eos-common";
import {
  compareString,
  retryPromise,
  findOrThrow,
  getSxContracts,
  buildTokenId
} from "@/api/helpers";
import _ from "lodash";

interface SxToken {
  id: string;
  symbol: string;
  precision: number;
  contract: string;
  volume24h: number;
  price: number;
  liqDepth: number;
}

const accumulateLiq = (acc: SxToken, token: SxToken) => {
  return {
    ...acc,
    liqDepth: acc.liqDepth + token.liqDepth
  };
};

const accumulateVolume = (acc: SxToken, token: SxToken) => {
  return {
    ...acc,
    volume24h: acc.volume24h + token.volume24h
  };
};

const tokensToArray = (tokens: Tokens): Token[] =>
  Object.keys(tokens).map(key => tokens[key]);

interface AddedVolume extends Token {
  volume24h?: number;
}

const contract = process.env.VUE_APP_USDSTABLE!;

interface SXToken {
  id: string;
  symbol: string;
  precision: number;
  contract: string;
  volume24h: number;
  price: number;
  liqDepth: number;
}

@Module({ namespacedPath: "usdsBancor/" })
export class UsdBancorModule extends VuexModule implements TradingModule {
  newTokens: SxToken[] = [];
  initiated: boolean = false;
  tokensObj: Tokens | undefined = undefined;
  settings: Settings | undefined = undefined;
  lastLoaded: number = 0;

  get wallet() {
    return "eos";
  }

  get tokens(): ViewToken[] {
    if (!this.initiated) {
      return [];
    }
    return this.newTokens
      .map(token => {
        let name, logo: string;
        const { contract, symbol } = token;

        try {
          const eosModuleBorrowed = vxm.eosBancor.tokenMeta.find(
            tokenMeta => tokenMeta.symbol == token.symbol
          )!;
          if (!eosModuleBorrowed) throw new Error("Failed to find token");
          name = eosModuleBorrowed.name;
          logo = eosModuleBorrowed.logo;
        } catch (e) {
          console.warn("Failed to find name", token.symbol);
          name = token.symbol;
          logo =
            "https://storage.googleapis.com/bancor-prod-file-store/images/communities/f39c32b0-cfae-11e9-9f7d-af4705d95e66.jpeg";
        }

        const baseToken: BaseToken = {
          contract,
          symbol
        };
        const tokenBalance = vxm.eosNetwork.balance(baseToken);

        return {
          ...token,
          id: buildTokenId(baseToken),
          name,
          logo,
          balance: tokenBalance && tokenBalance.balance
        };
      })
      .sort((a, b) => b.liqDepth - a.liqDepth);
  }

  get token() {
    return (arg0: string) => {
      return findOrThrow(
        this.tokens,
        token => compareString(token.id, arg0),
        `getter: token ${arg0}`
      );
    };
  }

  @mutation moduleInitiated() {
    this.initiated = true;
  }

  @action async fetchContract(contract: string) {
    const [tokens, volume, settings] = await Promise.all([
      retryPromise(() => get_tokens(rpc, contract), 4, 500),
      retryPromise(() => get_volume(rpc, contract, 1), 4, 500),
      retryPromise(() => get_settings(rpc, contract), 4, 500)
    ]);

    return { tokens, volume, settings };
  }

  @action async init() {
    const registryData = await getSxContracts();
    const contracts = registryData.map(x => x.contract);
    const allTokens = await Promise.all(contracts.map(this.fetchContract));
    console.log(allTokens, "is all tokens");

    const [tokens, volume, settings] = await Promise.all([
      retryPromise(() => get_tokens(rpc, contract), 4, 500),
      retryPromise(() => get_volume(rpc, contract, 1), 4, 500),
      retryPromise(() => get_settings(rpc, contract), 4, 500)
    ]);
    retryPromise(() => this.updateStats(), 4, 1000);
    console.log(tokens, volume, settings);

    const all = await Promise.all(
      allTokens.flatMap(token =>
        this.buildTokens({
          tokens: token.tokens,
          volume: token.volume[0],
          settings: token.settings
        })
      )
    );

    console.log(all, "is all");
    this.moduleInitiated();
    setInterval(() => this.checkRefresh(), 20000);

    vxm.eosNetwork.getBalances({
      tokens: registryData.flatMap(data => data.tokens),
      slow: true
    });

    const allWithId: SxToken[] = all.flatMap(x =>
      x.map(token => ({
        ...token,
        id: buildTokenId(token)
      }))
    );

    const uniqTokens = _.uniqBy(allWithId, "id").map(x => x.id);

    const newTokens = uniqTokens.map(
      (id): SxToken => {
        const allTokensOfId = allWithId.filter(token =>
          compareString(id, token.id)
        );

        const { precision, price, contract, symbol } = allTokensOfId[0];

        return {
          precision,
          price,
          contract,
          id,
          liqDepth: allTokensOfId.reduce(accumulateLiq).liqDepth,
          symbol,
          volume24h: allTokensOfId.reduce(accumulateVolume).volume24h
        };
      }
    );

    this.setNewTokens(newTokens);
  }

  @action async buildTokens({
    tokens,
    volume,
    settings
  }: {
    tokens: Tokens;
    settings: Settings;
    volume: Volume;
  }) {
    const tokensArray: Token[] = tokensToArray(tokens);
    const addedPossibleVolumes: AddedVolume[] = tokensArray.map(token => {
      const symbolName = token.sym.code().to_string();
      const hasVolume = Object.keys(volume.volume).includes(symbolName);
      return hasVolume
        ? { ...token, volume24h: volume.volume[symbolName] }
        : token;
    });

    const newTokens = await Promise.all(
      addedPossibleVolumes.map(async token => {
        const symbolName = token.sym.code().to_string();
        const precision = token.sym.precision();
        const contract = token.contract.to_string();
        const volume24h = token.volume24h || 0;

        const price =
          symbolName == "USDT"
            ? 1
            : 1 /
              (await get_price("1.0000 USDT", symbolName, tokens, settings));

        return {
          id: buildTokenId({ contract, symbol: symbolName }),
          symbol: symbolName,
          precision,
          contract,
          volume24h,
          price,
          liqDepth: asset_to_number(token.depth) * price
        };
      })
    );
    return newTokens;
  }

  @mutation setNewTokens(tokens: any[]) {
    this.newTokens = tokens;
  }

  @action async tokenById(id: string) {
    return findOrThrow(
      this.newTokens,
      token => compareString(token.id, id),
      `failed to find ${id} in sx tokenById`
    );
  }

  @action async viewAmountToAsset(amount: ViewAmount) {
    const token = await this.tokenById(amount.id);
    return number_to_asset(
      Number(amount.amount),
      new Sym(token.symbol, token.precision)
    );
  }

  @action async focusSymbol(symbolName: string) {
    const tokens = this.newTokens.filter(token =>
      compareString(token.symbol, symbolName)
    );
    vxm.eosNetwork.getBalances({
      tokens: tokens.map(token => ({
        contract: token.contract,
        symbol: token.symbol
      }))
    });
  }

  @action async refreshBalances(symbols: BaseToken[] = []) {}

  get isAuthenticated() {
    // @ts-ignore
    return this.$store.rootGetters[`${this.wallet}Wallet/isAuthenticated`];
  }

  @action async convert(propose: ProposedConvertTransaction) {
    const accountName = this.isAuthenticated;

    const fromToken = await this.tokenById(propose.from.id);
    const toToken = await this.tokenById(propose.to.id);
    const tokens = [fromToken, toToken];

    const amountAsset = await this.viewAmountToAsset(propose.from);

    const tokenContract = fromToken.contract;

    const tokenContractsAndSymbols: BaseToken[] = tokens.map(
      ({ contract, symbol }) => ({ contract, symbol })
    );

    const [txRes, originalBalances] = await Promise.all([
      this.triggerTx([
        {
          account: tokenContract,
          name: "transfer",
          data: {
            from: accountName,
            to: process.env.VUE_APP_USDSTABLE!,
            memo: toToken.symbol,
            quantity: amountAsset.to_string()
          }
        }
      ]),
      vxm.eosNetwork.getBalances({
        tokens: tokenContractsAndSymbols
      })
    ]);
    vxm.eosNetwork.pingTillChange({ originalBalances });

    return txRes.transaction_id;
  }

  @action async triggerTx(actions: any[]) {
    // @ts-ignore
    return this.$store.dispatch("eosWallet/tx", actions, { root: true });
  }

  @action async checkRefresh() {
    const biggestGap = 5000;
    const timeNow = new Date().getTime();
    if (this.lastLoaded + biggestGap < timeNow) {
      this.updateStats();
    }
  }

  @action async getTradeData({
    propose
  }: {
    propose: ProposedFromTransaction | ProposedToTransaction;
  }) {
    if (Object.keys(propose).includes("from")) {
      const data = propose as ProposedFromTransaction;

      const toToken = await this.tokenById(data.toId);

      const amountAsset = await this.viewAmountToAsset(data.from);
      const opposingSymbol = symbol(toToken.symbol, toToken.precision);

      return {
        opposingSymbol,
        amountAsset
      };
    } else {
      const data = propose as ProposedToTransaction;

      const fromToken = await this.tokenById(data.fromId);

      const amountAsset = await this.viewAmountToAsset(data.to);
      const opposingSymbol = symbol(fromToken.symbol, fromToken.precision);

      return {
        opposingSymbol,
        amountAsset
      };
    }
  }

  @action async getReturn(propose: ProposedFromTransaction) {
    this.checkRefresh();
    const { opposingSymbol, amountAsset } = await this.getTradeData({
      propose
    });

    const pools = this.tokensObj!;
    const settings = this.settings!;

    const out = get_rate(amountAsset, opposingSymbol.code(), pools, settings);

    return {
      amount: String(asset_to_number(out))
    };
  }

  @action async getCost(propose: ProposedToTransaction) {
    this.checkRefresh();
    const { opposingSymbol, amountAsset } = await this.getTradeData({
      propose
    });

    const pools = this.tokensObj!;
    const settings = this.settings!;

    const expectedReward = amountAsset;
    const offering = opposingSymbol;

    const quantity = get_inverse_rate(
      expectedReward,
      offering.code(),
      pools,
      settings
    );

    return {
      amount: String(asset_to_number(quantity))
    };
  }

  @mutation resetTimer() {
    this.lastLoaded = new Date().getTime();
  }

  @action async updateStats() {
    this.resetTimer();
    const [tokens, settings] = await Promise.all([
      get_tokens(rpc, contract),
      get_settings(rpc, contract)
    ]);
    this.setStats({ tokens, settings });
    return { tokens, settings };
  }

  @mutation setStats({
    tokens,
    settings
  }: {
    tokens: Tokens;
    settings: Settings;
  }) {
    this.tokensObj = tokens;
    this.settings = settings;
    this.lastLoaded = new Date().getTime();
  }
}

export const usdsBancor = UsdBancorModule.ExtractVuexModule(UsdBancorModule);
