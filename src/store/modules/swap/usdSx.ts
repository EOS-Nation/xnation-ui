import { VuexModule, action, Module, mutation } from "vuex-class-component";
import {
  ProposedTransaction,
  ProposedConvertTransaction,
  TradingModule,
  ViewToken,
  BaseToken
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
import { asset_to_number, number_to_asset, symbol } from "eos-common";
import { compareString, retryPromise, findOrThrow } from "@/api/helpers";

const tokensToArray = (tokens: Tokens): Token[] =>
  Object.keys(tokens).map(key => tokens[key]);

interface AddedVolume extends Token {
  volume24h?: number;
}

const contract = process.env.VUE_APP_USDSTABLE!;

@Module({ namespacedPath: "usdsBancor/" })
export class UsdBancorModule extends VuexModule implements TradingModule {
  newTokens: any[] = [];
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
        const tokenBalance = vxm.eosNetwork.balance({
          contract: token.contract,
          symbol: token.symbol
        });
        return {
          ...token,
          name,
          logo,
          balance: tokenBalance && tokenBalance.balance
        };
      })
      .sort((a, b) => b.liqDepth - a.liqDepth);
  }

  get token() {
    return (arg0: string) => {
      const token = this.tokens.find(token => token.symbol == arg0);
      if (!token) throw new Error("Cannot find token");
      return token;
    };
  }

  @mutation moduleInitiated() {
    this.initiated = true;
  }

  @action async init() {

    const [tokens, volume, settings] = await Promise.all([
      retryPromise(() => get_tokens(rpc, contract), 4, 500),
      retryPromise(() => get_volume(rpc, contract, 1), 4, 500),
      retryPromise(() => get_settings(rpc, contract), 4, 500)
    ]);
    retryPromise(() => this.updateStats(), 4, 1000);
    console.log(tokens, volume, settings);
    await this.buildTokens({ tokens, settings, volume: volume[0] });
    this.moduleInitiated();
    setInterval(() => this.checkRefresh(), 20000);
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
          symbol: symbolName,
          precision,
          contract,
          volume24h,
          price,
          liqDepth: asset_to_number(token.depth) * price
        };
      })
    );
    vxm.eosNetwork.getBalances({
      tokens: newTokens.map(token => ({
        contract: token.contract,
        symbol: token.symbol
      })),
      slow: true
    });
    this.setNewTokens(newTokens);
  }

  @mutation setNewTokens(tokens: any[]) {
    this.newTokens = tokens;
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

    const fromToken = this.newTokens.find(token =>
      compareString(token.symbol, propose.fromSymbol)
    );

    const tokenContract = fromToken.contract;
    const precision = fromToken.precision;
    const amountAsset = number_to_asset(
      propose.fromAmount,
      symbol(propose.fromSymbol, precision)
    );

    const tokenContractsAndSymbols = [
      {
        contract: tokenContract,
        symbol: propose.fromSymbol
      },
      {
        contract: this.newTokens.find(token =>
          compareString(token.symbol, propose.toSymbol)
        )!.contract,
        symbol: propose.toSymbol
      }
    ];

    const [txRes, originalBalances] = await Promise.all([
      this.triggerTx([
        {
          account: tokenContract,
          name: "transfer",
          data: {
            from: accountName,
            to: process.env.VUE_APP_USDSTABLE!,
            memo: propose.toSymbol,
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
    propose,
    useFrom
  }: {
    propose: ProposedTransaction;
    useFrom: boolean;
  }) {
    const { from, toId } = propose;

    const tokens = tokensToArray(this.tokensObj!);

    const fromPrecision = findOrThrow(tokens, token =>
      compareString(token.sym.code().to_string(), fromSymbol)
    ).sym.precision();

    const toPrecision = findOrThrow(tokens, token =>
      compareString(token.sym.code().to_string(), toSymbol)
    ).sym.precision();

    const assetSymbol = useFrom
      ? symbol(fromSymbol, fromPrecision)
      : symbol(toSymbol, toPrecision);

    const amountAsset = number_to_asset(amount, assetSymbol);
    const opposingSymbol = useFrom
      ? symbol(toSymbol, toPrecision)
      : symbol(fromSymbol, fromPrecision);

    return {
      opposingSymbol,
      amountAsset,
      fromPrecision,
      toPrecision
    };
  }

  @action async getReturn(propose: ProposedTransaction) {
    this.checkRefresh();
    const { opposingSymbol, amountAsset } = await this.getTradeData({
      propose,
      useFrom: true
    });

    const pools = this.tokensObj!;
    const settings = this.settings!;

    const { out, slippage } = get_rate(
      amountAsset,
      opposingSymbol.code(),
      pools,
      settings
    );

    return {
      amount: String(asset_to_number(out)),
      slippage
    };
  }

  @action async getCost(propose: ProposedTransaction) {
    this.checkRefresh();
    const { opposingSymbol, amountAsset } = await this.getTradeData({
      propose,
      useFrom: false
    });

    const pools = this.tokensObj!;
    const settings = this.settings!;

    const expectedReward = amountAsset;
    const offering = opposingSymbol;

    const { quantity, slippage } = get_inverse_rate(
      expectedReward,
      offering.code(),
      pools,
      settings
    );

    return {
      amount: String(asset_to_number(quantity)),
      slippage
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
