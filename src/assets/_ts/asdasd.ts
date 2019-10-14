// import { vxm } from '@/store'
// import numeral from 'numeral'
// import apiBancor from '@/api/bancor'
//
// /**
//  * Get Token Info - get info for specific Token listed on Bancor
//  *
//  * @param {string} symbol Token symbol to receive information from
//  * @returns {TokenInfo | false} Information found for provided symbol - returns false if symbol not found
//  * @example
//  *
//  * const CUSD = bancorx.getTokenInfo("CUSD");
//  *
//  * // console.log(CUSD) =>
//  * // {
//  * //    relayToken: false,
//  * //    id: '5c45c33851c75d8823bd7b0f',
//  * //    name: 'Carbon',
//  * //    img: 'a361f700-434d-11e9-ad20-e575d9756680.jpeg',
//  * //    tokenContract: 'stablecarbon',
//  * //    relayContract: 'bancorc11144',
//  * //    symbol: 'CUSD',
//  * //    counterSymbol: 'BNTCUSD',
//  * //    precision: 2
//  * // }
//  */
// export function getTokenInfo(symbol: string): TokenInfo | false {
//   const t = tokenDb.find((t: TokenInfo) => {
//     return t.symbol === symbol
//   })
//   if (t) return t
//   else return false
// }
//
// /**
//  * Bancor Memo - parse bancor memo
//  *
//  * @param {string} from symbol to convert FROM
//  * @param {string} to symbol to convert TO
//  * @param {string} receiver account to credit after conversion
//  * @param {number} minReturn min return amount
//  * @param {number} [version=1] bancor protocol version
//  * @returns {string} parsed bancor memo for conversion
//  * @example
//  *
//  * const memo = bancorMemo('DAPP', 'IQ', '123.456', 'sampleaccount')
//  * console.log(memo)
//  * // => ''
//  */
// export function bancorMemo(
//   from: string,
//   to: string,
//   minReturn: string,
//   receiver: string,
//   version = 1
// ) {
//   // Get Relays
//   const relayFrom: TokenInfo | false = getTokenInfo(from)
//   const relayTo: TokenInfo | false = getTokenInfo(to)
//   const amount = tokenPrecision(to, minReturn)
//   //
//   // PARSE MEMO
//   //
//   if (relayFrom && relayTo) {
//     if (from === 'BNT')
//       return `${version},${relayTo.relayContract} ${
//         relayTo.symbol
//       },${amount},${receiver}`
//     else if (to === 'BNT')
//       return `${version},${relayFrom.relayContract} ${
//         relayTo.symbol
//       },${amount},${receiver}`
//     else
//       return `${version},${relayFrom.relayContract} BNT ${
//         relayTo.relayContract
//       } ${relayTo.symbol},${amount},${receiver}`
//   } else return
// }
//
// /**
//  * Set Token Precision - set correct bancor token decimal precision for given asset
//  *
//  * @param {string} symbol symbol of asset
//  * @param {number} amount amount to apply precision
//  * @returns {number} modified amount with correct decimal precision
//  * @example
//  *
//  * const amount = tokenPrecision('BNT', '123.4)
//  * console.log(amount)
//  * // => '123.40000000'
//  */
// export function tokenPrecision(symbol: string, amount: string) {
//   let decimal = ''
//   //@ts-ignore
//   for (let i = 0; i < getTokenInfo(symbol).precision; i++) {
//     decimal += '0'
//   }
//   let numeralAmount = numeral(amount).format('0.' + decimal)
//   return numeralAmount
// }
//
// export function setPrecision(symbol: string, amount: number) {
//   const tokenInfo = tokenDb.find((t: TokenInfo) => {
//     return t.symbol === symbol
//   })
//   let decimal = ''
//   // @ts-ignore
//   for (let i = 0; i < tokenInfo.precision; i++) {
//     decimal += '0'
//   }
//   const result = amount / parseFloat('1' + decimal)
//   return numeral(result).format('0.' + decimal)
// }
// export async function calcRate(
//   from: string,
//   to: string,
//   amount: string,
//   inverse: boolean = false
// ) {
//   const fromInfo = tokenDb.find((t: TokenInfo) => {
//     return t.symbol === from
//   })
//   const toInfo = tokenDb.find((t: TokenInfo) => {
//     return t.symbol === to
//   })
//   let decimalFrom = ''
//   let decimalTo = ''
//   // @ts-ignore
//   for (let i = 0; i < fromInfo.precision; i++) {
//     decimalFrom += '0'
//   }
//   // @ts-ignore
//   for (let i = 0; i < toInfo.precision; i++) {
//     decimalTo += '0'
//   }
//   // @ts-ignore
//   const endpoint = 'currencies/' + fromInfo.id + '/value'
//   let params: any = {
//     // @ts-ignore
//     toCurrencyId: toInfo.id,
//     fromAmount: parseFloat(amount) * parseInt('1' + decimalFrom),
//     streamId: 'loadValue'
//   }
//   if (inverse)
//     params = {
//       // @ts-ignore
//       toCurrencyId: toInfo.id,
//       toAmount: parseFloat(amount) * parseInt('1' + decimalTo),
//       streamId: 'loadDefaultConversionRateValue'
//     }
//   const resp = await apiBancor(endpoint, params)
//   if (inverse) return setPrecision(from, resp.data.data).toString()
//   else return setPrecision(to, resp.data.data).toString()
// }
//
// export async function calcDualLiquidityRate(
//   type: 'add' | 'remove',
//   relay: string,
//   amount: string,
//   amountBnt: boolean = false,
//   inverse: boolean = false
// ) {
//   const relayInfo = getTokenInfo(relay)
//   let from = ''
//   let bnt = ''
//   let to = ''
//   if (relayInfo) {
//     if (type === 'add') {
//       if (!amountBnt) {
//         if (!inverse) {
//           to = await calcRate(relayInfo.counterSymbol, relayInfo.symbol, amount)
//           bnt = await calcRate('BNT', relayInfo.symbol, to, true)
//         } else {
//           from = await calcRate(
//             relayInfo.counterSymbol,
//             relayInfo.symbol,
//             amount,
//             true
//           )
//           bnt = await calcRate('BNT', relayInfo.symbol, amount, true)
//         }
//       } else {
//         if (!inverse) {
//           to = await calcRate('BNT', relayInfo.symbol, amount)
//           from = await calcRate(
//             relayInfo.counterSymbol,
//             relayInfo.symbol,
//             to,
//             true
//           )
//         } else {
//           from = await calcRate(
//             relayInfo.counterSymbol,
//             relayInfo.symbol,
//             amount,
//             true
//           )
//           bnt = await calcRate('BNT', relayInfo.symbol, amount, true)
//         }
//       }
//     } else {
//       if (!amountBnt) {
//         if (!inverse) {
//           to = await calcRate(relayInfo.counterSymbol, relayInfo.symbol, amount)
//           bnt = await calcRate('BNT', relayInfo.symbol, to, true)
//         } else {
//           from = await calcRate(
//             relayInfo.counterSymbol,
//             relayInfo.symbol,
//             amount,
//             true
//           )
//           bnt = await calcRate('BNT', relayInfo.symbol, amount, true)
//         }
//       } else {
//         if (!inverse) {
//           to = await calcRate('BNT', relayInfo.symbol, amount)
//           from = await calcRate(
//             relayInfo.counterSymbol,
//             relayInfo.symbol,
//             to,
//             true
//           )
//         } else {
//           from = await calcRate(
//             relayInfo.counterSymbol,
//             relayInfo.symbol,
//             amount,
//             true
//           )
//           bnt = await calcRate('BNT', relayInfo.symbol, amount, true)
//         }
//       }
//     }
//   }
//   return { from, to, bnt }
// }
//
// export function getTokenDb(tokens: boolean = true, relays: boolean = true) {
//   if (tokens && relays) return tokenDb
//   else if (tokens) return tokenDb.filter((t: TokenInfo) => !t.relayToken)
//   else return tokenDb.filter((t: TokenInfo) => t.relayToken)
// }
//
// export const tokenDb: TokenInfo[] = [
//   {
//     relayToken: false,
//     id: '5a1eb3753203d200012b8b75',
//     name: 'EOS',
//     img: '359b8290-0767-11e8-8744-97748b632eaf.png',
//     tokenContract: 'eosio.token',
//     relayContract: 'bnt2eoscnvrt',
//     symbol: 'EOS',
//     counterSymbol: 'BNTEOS',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '594bb7e468a95e00203b048d',
//     name: 'Bancor',
//     img: 'f80f2a40-eaf5-11e7-9b5e-179c6e04aa7c.png',
//     tokenContract: 'bntbntbntbnt',
//     relayContract: 'bnt2eoscnvrt',
//     symbol: 'BNT',
//     counterSymbol: 'BNTEOS',
//     precision: 10
//   },
//   {
//     relayToken: false,
//     id: '5c0e3f4464f6f90710095f3c',
//     name: 'eosBLACK',
//     img: 'BLACK.png',
//     tokenContract: 'eosblackteam',
//     relayContract: 'bancorc11111',
//     symbol: 'BLACK',
//     counterSymbol: 'BNTBLK',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5c0e40c553c03b14b3e30193',
//     name: 'KARMA',
//     img: 'KARMA.png',
//     tokenContract: 'therealkarma',
//     relayContract: 'bancorc11112',
//     symbol: 'KARMA',
//     counterSymbol: 'BNTKRM',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5c0e5181c01d8814fa2296f0',
//     name: 'HorusPay',
//     img: 'HORUS.png',
//     tokenContract: 'horustokenio',
//     relayContract: 'bancorc11121',
//     symbol: 'HORUS',
//     counterSymbol: 'BNTHRUS',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5c0e529564f6f94efa0a075d',
//     name: 'Meet.One',
//     img: 'MEETONE.png',
//     tokenContract: 'eosiomeetone',
//     relayContract: 'bancorc11122',
//     symbol: 'MEETONE',
//     counterSymbol: 'BNTMEET',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5c0e62bb675bcfb491451108',
//     name: 'Everipedia',
//     img: 'IQ.png',
//     tokenContract: 'everipediaiq',
//     relayContract: 'bancorc11123',
//     symbol: 'IQ',
//     counterSymbol: 'BNTIQ',
//     precision: 3
//   },
//   {
//     relayToken: false,
//     id: '5c0e640cc01d8846c42327ad',
//     name: 'Prochain',
//     img: 'EPRA.png',
//     tokenContract: 'epraofficial',
//     relayContract: 'bancorc11124',
//     symbol: 'EPRA',
//     counterSymbol: 'BNTEPRA',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5c0e8fdb675bcfda09467194',
//     name: 'BetDice',
//     img: 'DICE.png',
//     tokenContract: 'betdicetoken',
//     relayContract: 'bancorc11125',
//     symbol: 'DICE',
//     counterSymbol: 'BNTDICE',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5c0e662c54ed33261ddb853b',
//     name: 'HireVibes',
//     img: 'HVT.png',
//     tokenContract: 'hirevibeshvt',
//     relayContract: 'bancorc11131',
//     symbol: 'HVT',
//     counterSymbol: 'BNTHVT',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5c0e67d364f6f9d3670aa4c7',
//     name: '',
//     img: 'OCT.png',
//     tokenContract: 'octtothemoon',
//     relayContract: 'bancorc11132',
//     symbol: 'OCT',
//     counterSymbol: 'BNTOCT',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5c0e698a48ded4568c33eea3',
//     name: '',
//     img: 'MEV.png',
//     tokenContract: 'eosvegascoin',
//     relayContract: 'bancorc11134',
//     symbol: 'MEV',
//     counterSymbol: 'BNTMEV',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5c45c33851c75d8823bd7b0f',
//     name: '',
//     img: 'a361f700-434d-11e9-ad20-e575d9756680.jpeg',
//     tokenContract: 'stablecarbon',
//     relayContract: 'bancorc11144',
//     symbol: 'CUSD',
//     counterSymbol: 'BNTCUSD',
//     precision: 2
//   },
//   {
//     relayToken: false,
//     id: '5c473ab671d550188b192ff7',
//     name: '',
//     img: 'f146c8c0-1e6c-11e9-96e6-590b33725e90.jpeg',
//     tokenContract: 'realgoldtael',
//     relayContract: 'bancorc11145',
//     symbol: 'TAEL',
//     counterSymbol: 'BNTTAEL',
//     precision: 6
//   },
//   {
//     relayToken: false,
//     id: '5c63f8830827730edbc00acb',
//     name: '',
//     img: '636a3e10-328f-11e9-99c6-21750f32c67e.jpeg',
//     tokenContract: 'zosdiscounts',
//     relayContract: 'bancorc11151',
//     symbol: 'ZOS',
//     counterSymbol: 'BNTZOS',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5c8fc348e3980143ba9c2a9a',
//     name: '',
//     img: 'd3d80ae0-4a24-11e9-a46f-35c476431ffa.jpeg',
//     tokenContract: 'equacasheos1',
//     relayContract: 'bancorc11152',
//     symbol: 'EQUA',
//     counterSymbol: 'BNTEQA',
//     precision: 8
//   },
//   {
//     relayToken: false,
//     id: '5c9a45f86b2727dd7d9bcd48',
//     name: '',
//     img: '43b630c0-5075-11e9-aca5-1729c4b9e7ec.jpeg',
//     tokenContract: 'thepeostoken',
//     relayContract: 'bancorc11153',
//     symbol: 'PEOS',
//     counterSymbol: 'BNTPEOS',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5ca5e3022a656a3cfa349f60',
//     name: '',
//     img: '2ec8fd20-5915-11e9-a884-d9a39f6dd542.jpeg',
//     tokenContract: 'dappservices',
//     relayContract: 'bancorc11154',
//     symbol: 'DAPP',
//     counterSymbol: 'BNTDAPP',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5ca9c443b86b7f9c661bf0d6',
//     name: '',
//     img: '7fe547c0-5c37-11e9-9f0e-7591708e99af.jpeg',
//     tokenContract: 'chexchexchex',
//     relayContract: 'bancorc11155',
//     symbol: 'CHEX',
//     counterSymbol: 'BNTCHEX',
//     precision: 8
//   },
//   {
//     relayToken: false,
//     id: '5cdd5d5e0decd23d4d166f82',
//     name: '',
//     img: 'e2cb0b90-7a0a-11e9-b782-ada5bce4fec5.jpeg',
//     tokenContract: 'eosdtnutoken',
//     relayContract: 'bancorc11215',
//     symbol: 'NUT',
//     counterSymbol: 'BNTNUT',
//     precision: 9
//   },
//   {
//     relayToken: false,
//     id: '5cdd614e1127b347988aa3f5',
//     name: '',
//     img: '8ae0ca00-7a0a-11e9-8030-719579044b8d.jpeg',
//     tokenContract: 'eosdtsttoken',
//     relayContract: 'bancorc11222',
//     symbol: 'EOSDT',
//     counterSymbol: 'BNTESDT',
//     precision: 9
//   },
//   {
//     relayToken: false,
//     id: '5cb3182485a3fe72bd022d79',
//     name: '',
//     img: '86de9de0-5f8b-11e9-b1ba-17256a19b712.jpeg',
//     tokenContract: 'stuff.eos',
//     relayContract: 'bancorc11212',
//     symbol: 'STUFF',
//     counterSymbol: 'BNTSTUFF',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5cadd9406898e60890d6cf2b',
//     name: '',
//     img: '77c385a0-6675-11e9-9f0e-7591708e99af.jpeg',
//     tokenContract: 'finxtokenvci',
//     relayContract: 'bancorc11211',
//     symbol: 'FINX',
//     counterSymbol: 'BNTFINX',
//     precision: 8
//   },
//   {
//     relayToken: false,
//     id: '5ccec3152834f21d81cac218',
//     name: '',
//     img: 'emanate.png',
//     tokenContract: 'emanateoneos',
//     relayContract: 'bancorc11213',
//     symbol: 'EMT',
//     counterSymbol: 'BNTEMT',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5cf90e0ca2d0ebddf483b50e',
//     name: '',
//     img: 'Dragon_Token_Logo.png',
//     tokenContract: 'eosdragontkn',
//     relayContract: 'bancorc11223',
//     symbol: 'DRAGON',
//     counterSymbol: 'BNTDRGN',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5cd16ff6f5f40462e142059e',
//     name: '',
//     img: 'e4e6acf0-7496-11e9-a884-d9a39f6dd542.jpeg',
//     tokenContract: 'pixeos1token',
//     relayContract: 'bancorc11214',
//     symbol: 'PIXEOS',
//     counterSymbol: 'BNTPIXE',
//     precision: 4
//   },
//   {
//     relayToken: false,
//     id: '5ca0941885ca09be081d31c0',
//     name: '',
//     img: '3d091d90-53be-11e9-9f0e-7591708e99af.jpeg',
//     tokenContract: 'lumetokenctr',
//     relayContract: 'bancorc11225',
//     symbol: 'LUME',
//     counterSymbol: 'BNTLUME',
//     precision: 3
//   },
//   {
//     relayToken: true,
//     id: '5c52fcf05846f6ba4cba3241',
//     name: '',
//     img: '67f6de20-be94-11e9-9a05-cbab59e2b3f4.png',
//     tokenContract: 'bnt2eosrelay',
//     relayContract: 'bnt2eoscnvrt',
//     symbol: 'BNTEOS',
//     counterSymbol: '',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c0e996048ded4151c358d6b',
//     name: 'eosBLACK',
//     img: 'b5f82800-be93-11e9-b8be-dde27538bad2.png',
//     tokenContract: 'bancorr11111',
//     relayContract: 'bancorc11111',
//     symbol: 'BNTBLK',
//     counterSymbol: 'BLACK',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c0e99a048ded457a135913c',
//     name: 'KARMA',
//     img: 'e447dfa0-cca0-11e9-8460-27f39bf3e0f9.jpeg',
//     tokenContract: 'bancorr11112',
//     relayContract: 'bancorc11112',
//     symbol: 'BNTKRM',
//     counterSymbol: 'KARMA',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c0e6f89675bcf8db6456b23',
//     name: 'HorusPay',
//     img: 'HORUS.png',
//     tokenContract: 'bancorr11121',
//     relayContract: 'bancorc11121',
//     symbol: 'BNTHRUS',
//     counterSymbol: 'HORUS',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c0e5305c01d8824a722a48e',
//     name: 'Meet.One',
//     img: 'MEETONE.png',
//     tokenContract: 'bancorr11122',
//     relayContract: 'bancorc11122',
//     symbol: 'BNTMEET',
//     counterSymbol: 'MEETONE',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c0e632754ed3363e5db6aec',
//     name: 'Everipedia',
//     img: 'IQ.png',
//     tokenContract: 'bancorr11123',
//     relayContract: 'bancorc11123',
//     symbol: 'BNTIQ',
//     counterSymbol: 'IQ',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c0e64f054ed33335adb7628',
//     name: 'Prochain',
//     img: 'f31d5800-be92-11e9-9a05-cbab59e2b3f4.png',
//     tokenContract: 'bancorr11124',
//     relayContract: 'bancorc11124',
//     symbol: 'BNTEPRA',
//     counterSymbol: 'EPRA',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c0e9041c01d885109246880',
//     name: 'BetDice',
//     img: '1f14b9c0-be94-11e9-b8be-dde27538bad2.png',
//     tokenContract: 'bancorr11125',
//     relayContract: 'bancorc11125',
//     symbol: 'BNTDICE',
//     counterSymbol: 'DICE',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c0e66aa48ded4fd2f33df61',
//     name: 'HireVibes',
//     img: '5efefd30-be93-11e9-9f28-b73a27308d12.png',
//     tokenContract: 'bancorr11131',
//     relayContract: 'bancorc11131',
//     symbol: 'BNTHVT',
//     counterSymbol: 'HVT',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c0e683ac01d882416234a16',
//     name: '',
//     img: '17c7c9b0-be93-11e9-b8be-dde27538bad2.png',
//     tokenContract: 'bancorr11132',
//     relayContract: 'bancorc11132',
//     symbol: 'BNTOCT',
//     counterSymbol: 'OCT',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c0e69f3675bcfd9774543e5',
//     name: '',
//     img: '290a1f70-be93-11e9-9f28-b73a27308d12.png',
//     tokenContract: 'bancorr11134',
//     relayContract: 'bancorc11134',
//     symbol: 'BNTMEV',
//     counterSymbol: 'MEV',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c45c47a01b31d2f788ff0c7',
//     name: '',
//     img: '0ea607b0-be94-11e9-b8be-dde27538bad2.png',
//     tokenContract: 'bancorr11144',
//     relayContract: 'bancorc11144',
//     symbol: 'BNTCUSD',
//     counterSymbol: 'CUSD',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c473bdb40bc74075071cf02',
//     name: '',
//     img: '21906310-1e6d-11e9-a4f7-432886ea7c8f.jpeg',
//     tokenContract: 'bancorr11145',
//     relayContract: 'bancorc11145',
//     symbol: 'BNTTAEL',
//     counterSymbol: 'TAEL',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c63f8f62bb1c157a2fd9c06',
//     name: '',
//     img: '9f75cb40-328f-11e9-96e6-590b33725e90.jpeg',
//     tokenContract: 'bancorr11151',
//     relayContract: 'bancorc11151',
//     symbol: 'BNTZOS',
//     counterSymbol: 'ZOS',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c93517d268cafc6e3c9a7d2',
//     name: '',
//     img: '2eb501d0-4be1-11e9-ad0a-c759377f1f63.jpeg',
//     tokenContract: 'bancorr11152',
//     relayContract: 'bancorc11152',
//     symbol: 'BNTEQA',
//     counterSymbol: 'EQUA',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5c9a48586b2727b02a9bcd95',
//     name: '',
//     img: '90fd5cf0-5075-11e9-aca5-1729c4b9e7ec.jpeg',
//     tokenContract: 'bancorr11153',
//     relayContract: 'bancorc11153',
//     symbol: 'BNTPEOS',
//     counterSymbol: 'PEOS',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5ca5e398eeeac36e799303b2',
//     name: '',
//     img: '1fd419d0-5915-11e9-a884-d9a39f6dd542.jpeg',
//     tokenContract: 'bancorr11154',
//     relayContract: 'bancorc11154',
//     symbol: 'BNTDAPP',
//     counterSymbol: 'DAPP',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5ca9c525eeeac32b4e93adbd',
//     name: '',
//     img: 'c7cb0ac0-5c37-11e9-b1ba-17256a19b712.jpeg',
//     tokenContract: 'bancorr11155',
//     relayContract: 'bancorc11155',
//     symbol: 'BNTCHEX',
//     counterSymbol: 'CHEX',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5cdd5e9514342896a42ec336',
//     name: '',
//     img: 'd1f692d0-7a0a-11e9-b782-ada5bce4fec5.jpeg',
//     tokenContract: 'bancorr11215',
//     relayContract: 'bancorc11215',
//     symbol: 'BNTNUT',
//     counterSymbol: 'NUT',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5cdd626b9806c37f5faea43c',
//     name: '',
//     img: '41cacef0-7a0b-11e9-93c4-03a782e66826.jpeg',
//     tokenContract: 'bancorr11222',
//     relayContract: 'bancorc11222',
//     symbol: 'BNTESDT',
//     counterSymbol: 'EOSDT',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5cb3196d66f85354a126df8c',
//     name: '',
//     img: '6d2bca30-5f8b-11e9-b1ba-17256a19b712.jpeg',
//     tokenContract: 'bancorr11212',
//     relayContract: 'bancorc11212',
//     symbol: 'BNTSTUFF',
//     counterSymbol: 'STUFF',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5cadd9e72ff5f4b8c1b2d444',
//     name: '',
//     img: '90876570-6675-11e9-a884-d9a39f6dd542.jpeg',
//     tokenContract: 'bancorr11211',
//     relayContract: 'bancorc11211',
//     symbol: 'BNTFINX',
//     counterSymbol: 'FINX',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5ccec3c13b0a56193d99bb0c',
//     name: '',
//     img: 'df807b00-be93-11e9-9f28-b73a27308d12.png',
//     tokenContract: 'bancorr11213',
//     relayContract: 'bancorc11213',
//     symbol: 'BNTEMT',
//     counterSymbol: 'EMT',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5cf90e9042d6afe3f736cfa5',
//     name: '',
//     img: 'Dragon_Token_Logo.png',
//     tokenContract: 'bancorr11223',
//     relayContract: 'bancorc11223',
//     symbol: 'BNTDRGN',
//     counterSymbol: 'DRAGON',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5cd172fae2a418dfe08890cd',
//     name: '',
//     img: 'c76bdf50-7497-11e9-b1ba-17256a19b712.jpeg',
//     tokenContract: 'bancorr11214',
//     relayContract: 'bancorc11214',
//     symbol: 'BNTPIXE',
//     counterSymbol: 'PIXEOS',
//     precision: 10
//   },
//   {
//     relayToken: true,
//     id: '5ca094c685ca0968271d3236',
//     name: '',
//     img: '97250c30-53be-11e9-9f0e-7591708e99af.jpeg',
//     tokenContract: 'bancorr11225',
//     relayContract: 'bancorc11225',
//     symbol: 'BNTLUME',
//     counterSymbol: 'LUME',
//     precision: 10
//   }
// ]
//
// export interface TokenInfo {
//   relayToken: boolean
//   id: string
//   name: string
//   img: string
//   tokenContract: string
//   relayContract: string
//   symbol: string
//   counterSymbol: string
//   precision: number
// }
