import { vxm } from '@/store'
import numeral from 'numeral'
import apiBancor from '@/api/bancor'
/**
 * Bancor X
 *
 * @param {string} from token to convert FROM
 * @param {string} to token to convert TO
 * @param {number} amount amount to convert FROM
 * @param {string} receiver destination acccount
 * @param {number} [version=1] bancor protocol version
 * @returns {object} min return amount and parsed bancor memo
 * @example
 *
 * // Convert EOS => CUSD
 * bancorx.bancorx('EOS', 'CUSD' '3.1717', '<account>')
 * // => '1,bnt2eoscnvrt BNT bancorc11144 CUSD,3.17,<account>'
 */
export async function minReturnFormula(
  from: string,
  to: string,
  amount: string
) {
  //
  // GET RELAY BALANCES
  //
  const {
    balanceFrom,
    balanceBnt,
    balanceBntFrom,
    balanceTo
  } = await relayBalances(from, to)

  //
  // CALCULATE MIN RETURN AMOUNT
  //
  // get BTN Amount
  const amountBntFrom = bancorFormula(
    balanceFrom,
    balanceBnt,
    parseFloat(amount)
  )

  // get min return amount
  let minReturn = bancorFormula(balanceBntFrom, balanceTo, amountBntFrom)

  minReturn = minReturn * 0.99

  return tokenPrecision(to, minReturn.toString())
}

/**
 * Relay Balances - get current balances of needed relays
 *
 * @param {string} from token symbol to convert FROM
 * @param {string} to token symbol to convert TO
 * @returns {{ number, number, number, number }} object with relay balances
 * @example
 *
 * // Calculate min return BNT
 */
export async function relayBalances(from: string, to: string) {
  // Get Relays
  const relayFrom = relays[from]
  const relayTo = relays[to]
  const relayBnt = relays.BNT

  // Get Relay Balance FROM
  const balanceFrom = parseFloat(
    await vxm.eosTransit.accessContext.eosRpc.get_currency_balance(
      relayFrom.code,
      relayFrom.account,
      relayFrom.symbol
    )
  )

  // Get Relay Balance BNT FROM
  const balanceBnt = parseFloat(
    await vxm.eosTransit.accessContext.eosRpc.get_currency_balance(
      relayBnt.code,
      relayFrom.account,
      relayBnt.symbol
    )
  )

  // Get Relay Balance BNT TO
  const balanceBntFrom = parseFloat(
    await vxm.eosTransit.accessContext.eosRpc.get_currency_balance(
      relayBnt.code,
      relayTo.account,
      relayBnt.symbol
    )
  )

  // Get Relay Balance TO
  const balanceTo = parseFloat(
    await vxm.eosTransit.accessContext.eosRpc.get_currency_balance(
      relayTo.code,
      relayTo.account,
      relayTo.symbol
    )
  )

  return { balanceFrom, balanceBnt, balanceBntFrom, balanceTo }
}

/**
 * Bancor Memo - parse bancor memo
 *
 * @param {string} from symbol to convert FROM
 * @param {string} to symbol to convert TO
 * @param {string} receiver account to credit after conversion
 * @param {number} minReturn min return amount
 * @param {number} [version=1] bancor protocol version
 * @returns {string} parsed bancor memo
 * @example
 *
 * // Calculate min return BNT
 */
export function bancorMemo(
  from: string,
  to: string,
  minReturn: string,
  receiver: string,
  version = 1
) {
  // Get Relays
  const relayFrom: TokenInfo | false = getTokenInfo(from)
  const relayTo: TokenInfo | false = getTokenInfo(to)
  const amount = tokenPrecision(to, minReturn)
  //
  // PARSE MEMO
  //
  if (relayFrom && relayTo) {
    if (from.includes('BNT'))
      return `${version},${relayTo.relayContract} ${
        relayTo.symbol
      },${amount},${receiver}`
    else if (to.includes('BNT'))
      return `${version},${relayFrom.relayContract} ${
        relayTo.symbol
      },${amount},${receiver}`
    else
      return `${version},${relayFrom.relayContract} BNT ${
        relayTo.relayContract
      } ${relayTo.symbol},${amount},${receiver}`
  } else return
}

/**
 * Bancor Memo - parse bancor memo
 *
 * @param {string} from symbol to convert FROM
 * @param {string} to symbol to convert TO
 * @param {string} receiver account to credit after conversion
 * @param {number} minReturn min return amount
 * @param {number} [version=1] bancor protocol version
 * @returns {string} parsed bancor memo
 * @example
 *
 * // Calculate min return BNT
 */
export function bancorMemoLiquidity(
  relay: string,
  action: 'remove' | 'add',
  minReturn: string,
  receiver: string,
  version = 1
) {
  // Get Relays
  const relayInfo = getTokenInfo(relay)
  if (relayInfo) {
    //
    // PARSE MEMO
    //
    if (action === 'add')
      return `${version},${
        relayInfo.relayContract
      } ${relay},${minReturn},${receiver}`
    else
      return `${version},${relayInfo.relayContract} ${
        relayInfo.counterSymbol
      },${minReturn},${receiver}`
  }
}

/**
 * Bancor Formula - calculate min return
 *
 * @param {number} balanceFrom relay FROM balance
 * @param {number} balanceTo relay TO balance
 * @param {number} amount amount to convert FROM
 * @returns {number} conversion min return amount
 * @example
 *
 * // Calculate min return BNT
 */
export function bancorFormula(
  balanceFrom: number,
  balanceTo: number,
  amount: number
) {
  //
  // CALCULATE MIN RETURN AMOUNT
  //
  return (amount / (balanceFrom + amount)) * balanceTo
}

/**
 * Set Token Precision - set correct bancor token decimal precision for given asset
 *
 * @param {string} symbol symbol of asset
 * @param {number} amount amount to set precision
 * @returns {number} amount with correct decimal precision
 * @example
 *
 * // Calculate min return BNT
 */
export function tokenPrecision(symbol: string, amount: string) {
  let decimal = ''
  //@ts-ignore
  for (let i = 0; i < getTokenInfo(symbol).precision; i++) {
    decimal += '0'
  }
  let numeralAmount = numeral(amount).format('0.' + decimal)
  return numeralAmount
}

/**
 * Relays
 *
 * @example
 *
 * bancorx.relays.BNT
 * // => { code: 'bntbntbntbnt', account: 'bnt2eoscnvrt', symbol: 'BNT', precision: 10 }
 *
 * bancorx.relays.CUSD
 * // => { code: 'stablecarbon', account: 'bancorc11144', symbol: 'CUSD', precision: 2 }
 *
 */
export function getTokenInfo(symbol: string): TokenInfo | false {
  const t = tokenDb.find((t: TokenInfo) => {
    return t.symbol === symbol
  })
  if (t) return t
  else return false
}
export function setPrecision(symbol: string, amount: number) {
  const tokenInfo = tokenDb.find((t: TokenInfo) => {
    return t.symbol === symbol
  })
  let decimal = ''
  // @ts-ignore
  for (let i = 0; i < tokenInfo.precision; i++) {
    decimal += '0'
  }
  const result = amount / parseFloat('1' + decimal)
  return numeral(result).format('0.' + decimal)
}
export async function calcRate(
  from: string,
  to: string,
  amount: string,
  inverse: boolean = false
) {
  console.log(from)
  const fromInfo = tokenDb.find((t: TokenInfo) => {
    return t.symbol === from
  })
  const toInfo = tokenDb.find((t: TokenInfo) => {
    return t.symbol === to
  })
  let decimalFrom = ''
  let decimalTo = ''
  // @ts-ignore
  for (let i = 0; i < fromInfo.precision; i++) {
    decimalFrom += '0'
  }
  // @ts-ignore
  for (let i = 0; i < toInfo.precision; i++) {
    decimalTo += '0'
  }
  // @ts-ignore
  const endpoint = 'currencies/' + fromInfo.id + '/value'
  let params: any = {
    // @ts-ignore
    toCurrencyId: toInfo.id,
    fromAmount: parseFloat(amount) * parseInt('1' + decimalFrom),
    streamId: 'loadValue'
  }
  if (inverse)
    params = {
      // @ts-ignore
      toCurrencyId: toInfo.id,
      toAmount: parseFloat(amount) * parseInt('1' + decimalTo),
      streamId: 'loadDefaultConversionRateValue'
    }
  const resp = await apiBancor(endpoint, params)
  if (inverse) return setPrecision(from, resp.data.data).toString()
  else return setPrecision(to, resp.data.data).toString()
}

export function getTokenDb(tokens: boolean = true, relays: boolean = true) {
  if (tokens && relays) return tokenDb
  else if (tokens) return tokenDb.filter((t: TokenInfo) => !t.relayToken)
  else return tokenDb.filter((t: TokenInfo) => t.relayToken)
}

export async function calcDualLiquidityRate(
  type: 'add' | 'remove',
  relay: string,
  amount: string,
  amountBnt: boolean = false,
  inverse: boolean = false
) {
  const relayInfo = getTokenInfo(relay)
  console.log(relayInfo)
  let from = ''
  let bnt = ''
  let to = ''
  if (relayInfo) {
    if (type === 'add') {
      if (!amountBnt) {
        if (!inverse) {
          to = await calcRate(relayInfo.counterSymbol, relayInfo.symbol, amount)
          bnt = await calcRate('BNT', relayInfo.symbol, to, true)
        } else {
          from = await calcRate(
            relayInfo.counterSymbol,
            relayInfo.symbol,
            (parseFloat(amount) / 2).toString(),
            true
          )
          bnt = await calcRate(
            'BNT',
            relayInfo.symbol,
            (parseFloat(amount) / 2).toString(),
            true
          )
        }
      } else {
        if (!inverse) {
          to = await calcRate('BNT', relayInfo.symbol, amount)
          from = await calcRate(
            relayInfo.counterSymbol,
            relayInfo.symbol,
            to,
            true
          )
        } else {
          from = await calcRate(
            relayInfo.counterSymbol,
            relayInfo.symbol,
            amount,
            true
          )
          bnt = await calcRate('BNT', relayInfo.symbol, amount, true)
        }
      }
      to = (parseFloat(to) * 2).toString()
    } else {
      if (!amountBnt) {
        if (!inverse) {
          to = await calcRate(
            relayInfo.symbol,
            relayInfo.counterSymbol,
            (parseFloat(amount) / 2).toString()
          )
          bnt = await calcRate(
            relayInfo.symbol,
            'BNT',
            (parseFloat(amount) / 2).toString()
          )
        } else {
          from = await calcRate(
            relayInfo.symbol,
            relayInfo.counterSymbol,
            amount,
            true
          )
          bnt = await calcRate(relayInfo.symbol, 'BNT', from)
        }
      } else {
        if (!inverse) {
          to = await calcRate('BNT', relayInfo.symbol, amount)
          from = await calcRate(
            relayInfo.counterSymbol,
            relayInfo.symbol,
            to,
            true
          )
        } else {
          from = await calcRate(relayInfo.symbol, 'BNT', amount, true)
          to = await calcRate(relayInfo.symbol, relayInfo.counterSymbol, from)
        }
      }
      from = (parseFloat(from) * 2).toString()
    }
  }
  return { from, to, bnt }
}

export const tokenDb: TokenInfo[] = [
  {
    relayToken: false,
    id: '5a1eb3753203d200012b8b75',
    name: 'EOS',
    img: '359b8290-0767-11e8-8744-97748b632eaf.png',
    tokenContract: 'eosio.token',
    relayContract: 'bnt2eoscnvrt',
    symbol: 'EOS',
    counterSymbol: 'BNTEOS',
    precision: 4
  },
  {
    relayToken: false,
    id: '594bb7e468a95e00203b048d',
    name: 'Bancor',
    img: 'f80f2a40-eaf5-11e7-9b5e-179c6e04aa7c.png',
    tokenContract: 'bntbntbntbnt',
    relayContract: 'bnt2eoscnvrt',
    symbol: 'BNT',
    counterSymbol: 'BNTEOS',
    precision: 10
  },
  {
    relayToken: false,
    id: '5c0e3f4464f6f90710095f3c',
    name: 'eosBLACK',
    img: 'BLACK.png',
    tokenContract: 'eosblackteam',
    relayContract: 'bancorc11111',
    symbol: 'BLACK',
    counterSymbol: 'BNTBLK',
    precision: 4
  },
  {
    relayToken: false,
    id: '5c0e40c553c03b14b3e30193',
    name: 'KARMA',
    img: 'KARMA.png',
    tokenContract: 'therealkarma',
    relayContract: 'bancorc11112',
    symbol: 'KARMA',
    counterSymbol: 'BNTKRM',
    precision: 4
  },
  {
    relayToken: false,
    id: '5c0e5181c01d8814fa2296f0',
    name: 'HorusPay',
    img: 'HORUS.png',
    tokenContract: 'horustokenio',
    relayContract: 'bancorc11121',
    symbol: 'HORUS',
    counterSymbol: 'BNTHRUS',
    precision: 4
  },
  {
    relayToken: false,
    id: '5c0e529564f6f94efa0a075d',
    name: 'Meet.One',
    img: 'MEETONE.png',
    tokenContract: 'eosiomeetone',
    relayContract: 'bancorc11122',
    symbol: 'MEETONE',
    counterSymbol: 'BNTMEET',
    precision: 4
  },
  {
    relayToken: false,
    id: '5c0e62bb675bcfb491451108',
    name: 'Everipedia',
    img: 'IQ.png',
    tokenContract: 'everipediaiq',
    relayContract: 'bancorc11123',
    symbol: 'IQ',
    counterSymbol: 'BNTIQ',
    precision: 3
  },
  {
    relayToken: false,
    id: '5c0e640cc01d8846c42327ad',
    name: 'Prochain',
    img: 'EPRA.png',
    tokenContract: 'epraofficial',
    relayContract: 'bancorc11124',
    symbol: 'EPRA',
    counterSymbol: 'BNTEPRA',
    precision: 4
  },
  {
    relayToken: false,
    id: '5c0e8fdb675bcfda09467194',
    name: 'BetDice',
    img: 'DICE.png',
    tokenContract: 'betdicetoken',
    relayContract: 'bancorc11125',
    symbol: 'DICE',
    counterSymbol: 'BNTDICE',
    precision: 4
  },
  {
    relayToken: false,
    id: '5c0e662c54ed33261ddb853b',
    name: 'HireVibes',
    img: 'HVT.png',
    tokenContract: 'hirevibeshvt',
    relayContract: 'bancorc11131',
    symbol: 'HVT',
    counterSymbol: 'BNTHVT',
    precision: 4
  },
  {
    relayToken: false,
    id: '5c0e67d364f6f9d3670aa4c7',
    name: '',
    img: 'OCT.png',
    tokenContract: 'octtothemoon',
    relayContract: 'bancorc11132',
    symbol: 'OCT',
    counterSymbol: 'BNTOCT',
    precision: 4
  },
  {
    relayToken: false,
    id: '5c0e698a48ded4568c33eea3',
    name: '',
    img: 'MEV.png',
    tokenContract: 'eosvegascoin',
    relayContract: 'bancorc11134',
    symbol: 'MEV',
    counterSymbol: 'BNTMEV',
    precision: 4
  },
  {
    relayToken: false,
    id: '5c45c33851c75d8823bd7b0f',
    name: 'Carbon',
    img: 'a361f700-434d-11e9-ad20-e575d9756680.jpeg',
    tokenContract: 'stablecarbon',
    relayContract: 'bancorc11144',
    symbol: 'CUSD',
    counterSymbol: 'BNTCUSD',
    precision: 2
  },
  {
    relayToken: false,
    id: '5c473ab671d550188b192ff7',
    name: '',
    img: 'f146c8c0-1e6c-11e9-96e6-590b33725e90.jpeg',
    tokenContract: 'realgoldtael',
    relayContract: 'bancorc11145',
    symbol: 'TAEL',
    counterSymbol: 'BNTTAEL',
    precision: 6
  },
  {
    relayToken: false,
    id: '5c63f8830827730edbc00acb',
    name: '',
    img: '636a3e10-328f-11e9-99c6-21750f32c67e.jpeg',
    tokenContract: 'zosdiscounts',
    relayContract: 'bancorc11151',
    symbol: 'ZOS',
    counterSymbol: 'BNTZOS',
    precision: 4
  },
  {
    relayToken: false,
    id: '5c8fc348e3980143ba9c2a9a',
    name: '',
    img: 'd3d80ae0-4a24-11e9-a46f-35c476431ffa.jpeg',
    tokenContract: 'equacasheos1',
    relayContract: 'bancorc11152',
    symbol: 'EQUA',
    counterSymbol: 'BNTEQA',
    precision: 8
  },
  {
    relayToken: false,
    id: '5c9a45f86b2727dd7d9bcd48',
    name: '',
    img: '43b630c0-5075-11e9-aca5-1729c4b9e7ec.jpeg',
    tokenContract: 'thepeostoken',
    relayContract: 'bancorc11153',
    symbol: 'PEOS',
    counterSymbol: 'BNTPEOS',
    precision: 4
  },
  {
    relayToken: false,
    id: '5ca5e3022a656a3cfa349f60',
    name: '',
    img: '2ec8fd20-5915-11e9-a884-d9a39f6dd542.jpeg',
    tokenContract: 'dappservices',
    relayContract: 'bancorc11154',
    symbol: 'DAPP',
    counterSymbol: 'BNTDAPP',
    precision: 4
  },
  {
    relayToken: false,
    id: '5ca9c443b86b7f9c661bf0d6',
    name: '',
    img: '7fe547c0-5c37-11e9-9f0e-7591708e99af.jpeg',
    tokenContract: 'chexchexchex',
    relayContract: 'bancorc11155',
    symbol: 'CHEX',
    counterSymbol: 'BNTCHEX',
    precision: 8
  },
  {
    relayToken: false,
    id: '5cdd5d5e0decd23d4d166f82',
    name: '',
    img: 'e2cb0b90-7a0a-11e9-b782-ada5bce4fec5.jpeg',
    tokenContract: 'eosdtnutoken',
    relayContract: 'bancorc11215',
    symbol: 'NUT',
    counterSymbol: 'BNTNUT',
    precision: 9
  },
  {
    relayToken: false,
    id: '5cdd614e1127b347988aa3f5',
    name: '',
    img: '8ae0ca00-7a0a-11e9-8030-719579044b8d.jpeg',
    tokenContract: 'eosdtsttoken',
    relayContract: 'bancorc11222',
    symbol: 'EOSDT',
    counterSymbol: 'BNTESDT',
    precision: 9
  },
  {
    relayToken: false,
    id: '5cb3182485a3fe72bd022d79',
    name: '',
    img: '86de9de0-5f8b-11e9-b1ba-17256a19b712.jpeg',
    tokenContract: 'stuff.eos',
    relayContract: 'bancorc11212',
    symbol: 'STUFF',
    counterSymbol: 'BNTSTUFF',
    precision: 4
  },
  {
    relayToken: false,
    id: '5cadd9406898e60890d6cf2b',
    name: '',
    img: '77c385a0-6675-11e9-9f0e-7591708e99af.jpeg',
    tokenContract: 'finxtokenvci',
    relayContract: 'bancorc11211',
    symbol: 'FINX',
    counterSymbol: 'BNTFINX',
    precision: 8
  },
  {
    relayToken: false,
    id: '5ccec3152834f21d81cac218',
    name: '',
    img: 'emanate.png',
    tokenContract: 'emanateoneos',
    relayContract: 'bancorc11213',
    symbol: 'EMT',
    counterSymbol: 'BNTEMT',
    precision: 4
  },
  {
    relayToken: false,
    id: '5cf90e0ca2d0ebddf483b50e',
    name: '',
    img: 'Dragon_Token_Logo.png',
    tokenContract: 'eosdragontkn',
    relayContract: 'bancorc11223',
    symbol: 'DRAGON',
    counterSymbol: 'BNTDRGN',
    precision: 4
  },
  {
    relayToken: false,
    id: '5cd16ff6f5f40462e142059e',
    name: 'Pixeos',
    img: 'e4e6acf0-7496-11e9-a884-d9a39f6dd542.jpeg',
    tokenContract: 'pixeos1token',
    relayContract: 'bancorc11214',
    symbol: 'PIXEOS',
    counterSymbol: 'BNTPIXE',
    precision: 4
  },
  {
    relayToken: false,
    id: '5ca0941885ca09be081d31c0',
    name: 'Lumeos',
    img: '3d091d90-53be-11e9-9f0e-7591708e99af.jpeg',
    tokenContract: 'lumetokenctr',
    relayContract: 'bancorc11225',
    symbol: 'LUME',
    counterSymbol: 'BNTLUME',
    precision: 3
  },
  {
    relayToken: false,
    id: '5d99c8fb96daa79e02b410f7',
    name: 'Tether',
    img: '037b16e0-e8d4-11e9-a2af-8190118e5faa.jpeg',
    tokenContract: 'tethertether',
    relayContract: 'bancorc11232',
    symbol: 'USDT',
    counterSymbol: 'BNTUSDT',
    precision: 4
  },
  {
    relayToken: false,
    id: '5d77968496daa79e02770355',
    name: 'Sense Chat',
    img: '3530b230-d79a-11e9-923a-f50a5610b222.jpeg',
    tokenContract: 'sensegenesis',
    relayContract: 'bancorc11231',
    symbol: 'SENSE',
    counterSymbol: 'BNTSENS',
    precision: 4
  },
  {
    relayToken: true,
    id: '5c52fcf05846f6ba4cba3241',
    name: 'EOS',
    img: '67f6de20-be94-11e9-9a05-cbab59e2b3f4.png',
    tokenContract: 'bnt2eosrelay',
    relayContract: 'bnt2eoscnvrt',
    symbol: 'BNTEOS',
    counterSymbol: 'EOS',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c0e996048ded4151c358d6b',
    name: 'eosBLACK',
    img: 'b5f82800-be93-11e9-b8be-dde27538bad2.png',
    tokenContract: 'bancorr11111',
    relayContract: 'bancorc11111',
    symbol: 'BNTBLK',
    counterSymbol: 'BLACK',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c0e99a048ded457a135913c',
    name: 'KARMA',
    img: 'e447dfa0-cca0-11e9-8460-27f39bf3e0f9.jpeg',
    tokenContract: 'bancorr11112',
    relayContract: 'bancorc11112',
    symbol: 'BNTKRM',
    counterSymbol: 'KARMA',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c0e6f89675bcf8db6456b23',
    name: 'HorusPay',
    img: 'HORUS.png',
    tokenContract: 'bancorr11121',
    relayContract: 'bancorc11121',
    symbol: 'BNTHRUS',
    counterSymbol: 'HORUS',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c0e5305c01d8824a722a48e',
    name: 'Meet.One',
    img: 'MEETONE.png',
    tokenContract: 'bancorr11122',
    relayContract: 'bancorc11122',
    symbol: 'BNTMEET',
    counterSymbol: 'MEETONE',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c0e632754ed3363e5db6aec',
    name: 'Everipedia',
    img: 'IQ.png',
    tokenContract: 'bancorr11123',
    relayContract: 'bancorc11123',
    symbol: 'BNTIQ',
    counterSymbol: 'IQ',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c0e64f054ed33335adb7628',
    name: 'Prochain',
    img: 'f31d5800-be92-11e9-9a05-cbab59e2b3f4.png',
    tokenContract: 'bancorr11124',
    relayContract: 'bancorc11124',
    symbol: 'BNTEPRA',
    counterSymbol: 'EPRA',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c0e9041c01d885109246880',
    name: 'BetDice',
    img: '1f14b9c0-be94-11e9-b8be-dde27538bad2.png',
    tokenContract: 'bancorr11125',
    relayContract: 'bancorc11125',
    symbol: 'BNTDICE',
    counterSymbol: 'DICE',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c0e66aa48ded4fd2f33df61',
    name: 'HireVibes',
    img: '5efefd30-be93-11e9-9f28-b73a27308d12.png',
    tokenContract: 'bancorr11131',
    relayContract: 'bancorc11131',
    symbol: 'BNTHVT',
    counterSymbol: 'HVT',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c0e683ac01d882416234a16',
    name: '',
    img: '17c7c9b0-be93-11e9-b8be-dde27538bad2.png',
    tokenContract: 'bancorr11132',
    relayContract: 'bancorc11132',
    symbol: 'BNTOCT',
    counterSymbol: 'OCT',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c0e69f3675bcfd9774543e5',
    name: '',
    img: '290a1f70-be93-11e9-9f28-b73a27308d12.png',
    tokenContract: 'bancorr11134',
    relayContract: 'bancorc11134',
    symbol: 'BNTMEV',
    counterSymbol: 'MEV',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c45c47a01b31d2f788ff0c7',
    name: 'Carbon',
    img: '0ea607b0-be94-11e9-b8be-dde27538bad2.png',
    tokenContract: 'bancorr11144',
    relayContract: 'bancorc11144',
    symbol: 'BNTCUSD',
    counterSymbol: 'CUSD',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c473bdb40bc74075071cf02',
    name: '',
    img: '21906310-1e6d-11e9-a4f7-432886ea7c8f.jpeg',
    tokenContract: 'bancorr11145',
    relayContract: 'bancorc11145',
    symbol: 'BNTTAEL',
    counterSymbol: 'TAEL',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c63f8f62bb1c157a2fd9c06',
    name: '',
    img: '9f75cb40-328f-11e9-96e6-590b33725e90.jpeg',
    tokenContract: 'bancorr11151',
    relayContract: 'bancorc11151',
    symbol: 'BNTZOS',
    counterSymbol: 'ZOS',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c93517d268cafc6e3c9a7d2',
    name: '',
    img: '2eb501d0-4be1-11e9-ad0a-c759377f1f63.jpeg',
    tokenContract: 'bancorr11152',
    relayContract: 'bancorc11152',
    symbol: 'BNTEQA',
    counterSymbol: 'EQUA',
    precision: 10
  },
  {
    relayToken: true,
    id: '5c9a48586b2727b02a9bcd95',
    name: '',
    img: '90fd5cf0-5075-11e9-aca5-1729c4b9e7ec.jpeg',
    tokenContract: 'bancorr11153',
    relayContract: 'bancorc11153',
    symbol: 'BNTPEOS',
    counterSymbol: 'PEOS',
    precision: 10
  },
  {
    relayToken: true,
    id: '5ca5e398eeeac36e799303b2',
    name: '',
    img: '1fd419d0-5915-11e9-a884-d9a39f6dd542.jpeg',
    tokenContract: 'bancorr11154',
    relayContract: 'bancorc11154',
    symbol: 'BNTDAPP',
    counterSymbol: 'DAPP',
    precision: 10
  },
  {
    relayToken: true,
    id: '5ca9c525eeeac32b4e93adbd',
    name: '',
    img: 'c7cb0ac0-5c37-11e9-b1ba-17256a19b712.jpeg',
    tokenContract: 'bancorr11155',
    relayContract: 'bancorc11155',
    symbol: 'BNTCHEX',
    counterSymbol: 'CHEX',
    precision: 10
  },
  {
    relayToken: true,
    id: '5cdd5e9514342896a42ec336',
    name: '',
    img: 'd1f692d0-7a0a-11e9-b782-ada5bce4fec5.jpeg',
    tokenContract: 'bancorr11215',
    relayContract: 'bancorc11215',
    symbol: 'BNTNUT',
    counterSymbol: 'NUT',
    precision: 10
  },
  {
    relayToken: true,
    id: '5cdd626b9806c37f5faea43c',
    name: '',
    img: '41cacef0-7a0b-11e9-93c4-03a782e66826.jpeg',
    tokenContract: 'bancorr11222',
    relayContract: 'bancorc11222',
    symbol: 'BNTESDT',
    counterSymbol: 'EOSDT',
    precision: 10
  },
  {
    relayToken: true,
    id: '5cb3196d66f85354a126df8c',
    name: '',
    img: '6d2bca30-5f8b-11e9-b1ba-17256a19b712.jpeg',
    tokenContract: 'bancorr11212',
    relayContract: 'bancorc11212',
    symbol: 'BNTSTUFF',
    counterSymbol: 'STUFF',
    precision: 10
  },
  {
    relayToken: true,
    id: '5cadd9e72ff5f4b8c1b2d444',
    name: '',
    img: '90876570-6675-11e9-a884-d9a39f6dd542.jpeg',
    tokenContract: 'bancorr11211',
    relayContract: 'bancorc11211',
    symbol: 'BNTFINX',
    counterSymbol: 'FINX',
    precision: 10
  },
  {
    relayToken: true,
    id: '5ccec3c13b0a56193d99bb0c',
    name: '',
    img: 'df807b00-be93-11e9-9f28-b73a27308d12.png',
    tokenContract: 'bancorr11213',
    relayContract: 'bancorc11213',
    symbol: 'BNTEMT',
    counterSymbol: 'EMT',
    precision: 10
  },
  {
    relayToken: true,
    id: '5cf90e9042d6afe3f736cfa5',
    name: '',
    img: 'Dragon_Token_Logo.png',
    tokenContract: 'bancorr11223',
    relayContract: 'bancorc11223',
    symbol: 'BNTDRGN',
    counterSymbol: 'DRAGON',
    precision: 10
  },
  {
    relayToken: true,
    id: '5cd172fae2a418dfe08890cd',
    name: 'Pixeos',
    img: 'c76bdf50-7497-11e9-b1ba-17256a19b712.jpeg',
    tokenContract: 'bancorr11214',
    relayContract: 'bancorc11214',
    symbol: 'BNTPIXE',
    counterSymbol: 'PIXEOS',
    precision: 10
  },
  {
    relayToken: true,
    id: '5ca094c685ca0968271d3236',
    name: 'Lumeos',
    img: '97250c30-53be-11e9-9f0e-7591708e99af.jpeg',
    tokenContract: 'bancorr11225',
    relayContract: 'bancorc11225',
    symbol: 'BNTLUME',
    counterSymbol: 'LUME',
    precision: 10
  },
  {
    relayToken: true,
    id: '5d99c99d96daa79e02b6b70c',
    name: 'Tether',
    img: 'cache/eff783b0-e8d3-11e9-a05e-0d8b357a8f4b_200w.jpeg',
    tokenContract: 'bancorr11232',
    relayContract: 'bancorc11232',
    symbol: 'BNTUSDT',
    counterSymbol: 'USDT',
    precision: 10
  },
  {
    relayToken: true,
    id: '5d779ae996daa79e028971a7',
    name: 'Sense Chat',
    img: 'cache/5a15bbe0-d79a-11e9-8353-b7b6bbf0ecf4_400w.jpeg',
    tokenContract: 'bancorr11231',
    relayContract: 'bancorc11231',
    symbol: 'BNTSENS',
    counterSymbol: 'SENSE',
    precision: 10
  }
]
export const relays: Relays = {
  EOS: {
    code: 'eosio.token',
    account: 'bnt2eoscnvrt',
    symbol: 'EOS',
    precision: 4
  },
  BNT: {
    code: 'bntbntbntbnt',
    account: 'bnt2eoscnvrt',
    symbol: 'BNT',
    precision: 10
  },
  BLACK: {
    code: 'eosblackteam',
    account: 'bancorc11111',
    symbol: 'BLACK',
    precision: 4
  },
  KARMA: {
    code: 'therealkarma',
    account: 'bancorc11112',
    symbol: 'KARMA',
    precision: 4
  },
  PGL: {
    code: 'prospectorsg',
    account: 'bancorc11113',
    symbol: 'PGL',
    precision: 4
  },
  CET: {
    code: 'eosiochaince',
    account: 'bancorc11114',
    symbol: 'CET',
    precision: 4
  },
  HORUS: {
    code: 'horustokenio',
    account: 'bancorc11121',
    symbol: 'HORUS',
    precision: 4
  },
  MEETONE: {
    code: 'eosiomeetone',
    account: 'bancorc11122',
    symbol: 'MEETONE',
    precision: 4
  },
  IQ: {
    code: 'everipediaiq',
    account: 'bancorc11123',
    symbol: 'IQ',
    precision: 3
  },
  EPRA: {
    code: 'epraofficial',
    account: 'bancorc11124',
    symbol: 'EPRA',
    precision: 4
  },
  DICE: {
    code: 'betdicetoken',
    account: 'bancorc11125',
    symbol: 'DICE',
    precision: 4
  },
  HVT: {
    code: 'hirevibeshvt',
    account: 'bancorc11131',
    symbol: 'HVT',
    precision: 4
  },
  OCT: {
    code: 'octtothemoon',
    account: 'bancorc11132',
    symbol: 'OCT',
    precision: 4
  },
  MEV: {
    code: 'eosvegascoin',
    account: 'bancorc11134',
    symbol: 'MEV',
    precision: 4
  },
  ZKS: {
    code: 'zkstokensr4u',
    account: 'bancorc11142',
    symbol: 'ZKS',
    precision: 0
  },
  CUSD: {
    code: 'stablecarbon',
    account: 'bancorc11144',
    symbol: 'CUSD',
    precision: 2
  },
  TAEL: {
    code: 'realgoldtael',
    account: 'bancorc11145',
    symbol: 'TAEL',
    precision: 6
  },
  ZOS: {
    code: 'zosdiscounts',
    account: 'bancorc11151',
    symbol: 'ZOS',
    precision: 4
  },
  EQUA: {
    code: 'equacasheos1',
    account: 'bancorc11152',
    symbol: 'EQUA',
    precision: 8
  },
  PEOS: {
    code: 'thepeostoken',
    account: 'bancorc11153',
    symbol: 'PEOS',
    precision: 4
  },
  DAPP: {
    code: 'dappservices',
    account: 'bancorc11154',
    symbol: 'DAPP',
    precision: 4
  },
  CHEX: {
    code: 'chexchexchex',
    account: 'bancorc11155',
    symbol: 'CHEX',
    precision: 8
  },
  NUT: {
    code: 'eosdtnutoken',
    account: 'bancorc11215',
    symbol: 'NUT',
    precision: 9
  },
  EOSDT: {
    code: 'eosdtsttoken',
    account: 'bancorc11222',
    symbol: 'EOSDT',
    precision: 9
  },
  STUFF: {
    code: 'stuff.eos',
    account: 'bancorc11212',
    symbol: 'STUFF',
    precision: 4
  },
  FINX: {
    code: 'finxtokenvci',
    account: 'bancorc11211',
    symbol: 'FINX',
    precision: 8
  },
  EMT: {
    code: 'emanateoneos',
    account: 'bancorc11213',
    symbol: 'EMT',
    precision: 4
  },
  DRAGON: {
    code: 'eosdragontkn',
    account: 'bancorc11223',
    symbol: 'DRAGON',
    precision: 4
  },
  PIXEOS: {
    code: 'pixeos1token',
    account: 'bancorc11214',
    symbol: 'PIXEOS',
    precision: 4
  },
  LUME: {
    code: 'lumetokenctr',
    account: 'bancorc11225',
    symbol: 'LUME',
    precision: 3
  },
  SENSE: {
    code: 'sensegenesis',
    account: 'bancorc11231',
    symbol: 'SENSE',
    precision: 4
  },
  USDT: {
    code: 'tethertether',
    account: 'bancorc11232',
    symbol: 'USDT',
    precision: 4
  }
}

export const reserveTokens: Relays = {
  EOS: {
    code: 'bnt2eosrelay',
    account: 'bnt2eoscnvrt',
    symbol: 'BNTEOS',
    precision: 10
  },
  BNT: {
    code: 'bnt2eosrelay',
    account: 'bnt2eoscnvrt',
    symbol: 'BNTEOS',
    precision: 10
  },
  BLACK: {
    code: 'bancorr11111',
    account: 'bancorc11111',
    symbol: 'BNTBLK',
    precision: 10
  },
  KARMA: {
    code: 'bancorr11112',
    account: 'bancorc11112',
    symbol: 'BNTKRM',
    precision: 10
  },
  PGL: {
    code: 'bancorr11113',
    account: 'bancorc11113',
    symbol: 'BNTPGL',
    precision: 10
  },
  CET: {
    code: 'bancorr11114',
    account: 'bancorc11114',
    symbol: 'BNTCET',
    precision: 10
  },
  HORUS: {
    code: 'bancorr11121',
    account: 'bancorc11121',
    symbol: 'BNTHRUS',
    precision: 10
  },
  MEETONE: {
    code: 'bancorr11122',
    account: 'bancorc11122',
    symbol: 'BNTMEET',
    precision: 10
  },
  IQ: {
    code: 'bancorr11123',
    account: 'bancorc11123',
    symbol: 'BNTIQ',
    precision: 10
  },
  EPRA: {
    code: 'bancorr11124',
    account: 'bancorc11124',
    symbol: 'BNTEPRA',
    precision: 10
  },
  DICE: {
    code: 'bancorr11125',
    account: 'bancorc11125',
    symbol: 'BNTDICE',
    precision: 10
  },
  HVT: {
    code: 'bancorr11131',
    account: 'bancorc11131',
    symbol: 'BNTHVT',
    precision: 10
  },
  OCT: {
    code: 'bancorr11132',
    account: 'bancorc11132',
    symbol: 'BNTOCT',
    precision: 10
  },
  MEV: {
    code: 'bancorr11134',
    account: 'bancorc11134',
    symbol: 'BNTMEV',
    precision: 10
  },
  ZKS: {
    code: 'bancorr11142',
    account: 'bancorc11142',
    symbol: 'BNTZKS',
    precision: 10
  },
  CUSD: {
    code: 'bancorr11144',
    account: 'bancorc11144',
    symbol: 'BNTCUSD',
    precision: 10
  },
  TAEL: {
    code: 'bancorr11145',
    account: 'bancorc11145',
    symbol: 'BNTTAEL',
    precision: 10
  },
  ZOS: {
    code: 'bancorr11151',
    account: 'bancorc11151',
    symbol: 'BNTZOS',
    precision: 10
  },
  EQUA: {
    code: 'bancorr11152',
    account: 'bancorc11152',
    symbol: 'BNTEQA',
    precision: 10
  },
  PEOS: {
    code: 'bancorr11153',
    account: 'bancorc11153',
    symbol: 'BNTPEOS',
    precision: 10
  },
  DAPP: {
    code: 'bancorr11154',
    account: 'bancorc11154',
    symbol: 'BNTDAPP',
    precision: 10
  },
  CHEX: {
    code: 'bancorr11155',
    account: 'bancorc11155',
    symbol: 'BNTCHEX',
    precision: 10
  },
  NUT: {
    code: 'bancorr11215',
    account: 'bancorc11215',
    symbol: 'BNTNUT',
    precision: 10
  },
  EOSDT: {
    code: 'bancorr11222',
    account: 'bancorc11222',
    symbol: 'BNTESDT',
    precision: 10
  },
  STUFF: {
    code: 'bancorr11212',
    account: 'bancorc11212',
    symbol: 'BNTSTUFF',
    precision: 10
  },
  FINX: {
    code: 'bancorr11211',
    account: 'bancorc11211',
    symbol: 'BNTFINX',
    precision: 10
  },
  EMT: {
    code: 'bancorr11213',
    account: 'bancorc11213',
    symbol: 'BNTEMT',
    precision: 10
  },
  DRAGON: {
    code: 'bancorr11223',
    account: 'bancorc11223',
    symbol: 'BNTDRGN',
    precision: 10
  },
  PIXEOS: {
    code: 'bancorr11214',
    account: 'bancorc11214',
    symbol: 'BNTPIXE',
    precision: 10
  },
  LUME: {
    code: 'bancorr11225',
    account: 'bancorc11225',
    symbol: 'BNTLUME',
    precision: 10
  },
  SENSE: {
    code: 'bancorr11231',
    account: 'bancorc11231',
    symbol: 'BNTSENS',
    precision: 10
  },
  USDT: {
    code: 'bancorr11232',
    account: 'bancorc11232',
    symbol: 'BNTUSDT',
    precision: 10
  }
}

export interface TokenInfo {
  relayToken: boolean
  id: string
  name: string
  img: string
  tokenContract: string
  relayContract: string
  symbol: string
  counterSymbol: string
  precision: number
}

export interface Relay {
  code: string
  account: string
  symbol: string
  precision: number
}

export interface Relays {
  EOS: Relay
  BNT: Relay

  BLACK: Relay
  KARMA: Relay
  PGL: Relay
  CET: Relay
  HORUS: Relay
  MEETONE: Relay
  IQ: Relay
  EPRA: Relay
  DICE: Relay
  HVT: Relay

  OCT: Relay
  MEV: Relay
  ZKS: Relay
  CUSD: Relay
  TAEL: Relay
  ZOS: Relay
  EQUA: Relay
  PEOS: Relay
  DAPP: Relay
  SENSE: Relay
  USDT: Relay
  CHEX: Relay

  NUT: Relay
  EOSDT: Relay
  STUFF: Relay
  FINX: Relay

  EMT: Relay
  DRAGON: Relay
  PIXEOS: Relay
  LUME: Relay

  [relay: string]: Relay
}
