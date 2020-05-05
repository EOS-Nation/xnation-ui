import { DryRelay } from "@/api/bancorCalc";
import { Sym } from "eos-common";

const bntToken = {
  contract: "bntbntbntbnt",
  symbol: "10,BNT"
};

const oldRelays = [
  {
    contract: "bnt2eoscnvrt",
    isMultiContract: false,
    smartToken: {
      contract: "bnt2eosrelay",
      symbol: "10,BNTEOS"
    },
    reserves: [
      {
        contract: "eosio.token",
        symbol: "4,EOS"
      },
      bntToken
    ]
  },
  {
    contract: "bancorc11111",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11111",
      symbol: "10,BNTBLK"
    },
    reserves: [
      bntToken,
      {
        contract: "eosblackteam",
        symbol: "4,BLACK"
      }
    ]
  },
  {
    contract: "bancorc11112",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11112",
      symbol: "10,BNTKRM"
    },
    reserves: [
      bntToken,
      {
        contract: "therealkarma",
        symbol: "4,KARMA"
      }
    ]
  },
  {
    contract: "bancorc11121",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11121",
      symbol: "10,BNTHRUS"
    },
    reserves: [
      bntToken,
      {
        contract: "horustokenio",
        symbol: "4,HORUS"
      }
    ]
  },
  {
    contract: "bancorc11122",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11122",
      symbol: "10,BNTMEET"
    },
    reserves: [
      bntToken,
      {
        contract: "eosiomeetone",
        symbol: "4,MEETONE"
      }
    ]
  },
  {
    contract: "bancorc11123",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11123",
      symbol: "10,BNTIQ"
    },
    reserves: [
      {
        contract: "everipediaiq",
        symbol: "3,IQ"
      },
      bntToken
    ]
  },
  {
    contract: "bancorc11124",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11124",
      symbol: "10,BNTEPRA"
    },
    reserves: [
      bntToken,
      {
        contract: "epraofficial",
        symbol: "4,EPRA"
      }
    ]
  },
  {
    contract: "bancorc11125",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11125",
      symbol: "10,BNTDICE"
    },
    reserves: [
      bntToken,
      {
        contract: "betdicetoken",
        symbol: "4,DICE"
      }
    ]
  },
  {
    contract: "bancorc11131",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11131",
      symbol: "10,BNTHVT"
    },
    reserves: [
      bntToken,
      {
        contract: "hirevibeshvt",
        symbol: "4,HVT"
      }
    ]
  },
  {
    contract: "bancorc11132",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11132",
      symbol: "10,BNTOCT"
    },
    reserves: [
      {
        contract: "octtothemoon",
        symbol: "4,OCT"
      },
      bntToken
    ]
  },
  {
    contract: "bancorc11134",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11134",
      symbol: "10,BNTMEV"
    },
    reserves: [
      bntToken,
      {
        contract: "eosvegascoin",
        symbol: "4,MEV"
      }
    ]
  },
  {
    contract: "bancorc11145",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11145",
      symbol: "10,BNTTAEL"
    },
    reserves: [
      bntToken,
      {
        contract: "realgoldtael",
        symbol: "6,TAEL"
      }
    ]
  },
  {
    contract: "bancorc11151",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11151",
      symbol: "10,BNTZOS"
    },
    reserves: [
      {
        contract: "zosdiscounts",
        symbol: "4,ZOS"
      },
      bntToken
    ]
  },
  {
    contract: "bancorc11152",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11152",
      symbol: "10,BNTEQA"
    },
    reserves: [
      bntToken,
      {
        contract: "equacasheos1",
        symbol: "8,EQUA"
      }
    ]
  },
  {
    contract: "bancorc11153",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11153",
      symbol: "10,BNTPEOS"
    },
    reserves: [
      bntToken,
      {
        contract: "thepeostoken",
        symbol: "4,PEOS"
      }
    ]
  },
  {
    contract: "bancorc11154",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11154",
      symbol: "10,BNTDAPP"
    },
    reserves: [
      bntToken,
      {
        contract: "dappservices",
        symbol: "4,DAPP"
      }
    ]
  },
  {
    contract: "bancorc11155",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11155",
      symbol: "10,BNTCHEX"
    },
    reserves: [
      bntToken,
      {
        contract: "chexchexchex",
        symbol: "8,CHEX"
      }
    ]
  },
  {
    contract: "bancorc11211",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11211",
      symbol: "10,BNTFINX"
    },
    reserves: [
      bntToken,
      {
        contract: "finxtokenvci",
        symbol: "8,FINX"
      }
    ]
  },
  {
    contract: "bancorc11213",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11213",
      symbol: "10,BNTEMT"
    },
    reserves: [
      {
        contract: "emanateoneos",
        symbol: "4,EMT"
      },
      bntToken
    ]
  },
  {
    contract: "bancorc11214",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11214",
      symbol: "10,BNTPIXE"
    },
    reserves: [
      bntToken,
      {
        contract: "pixeos1token",
        symbol: "4,PIXEOS"
      }
    ]
  },
  {
    contract: "bancorc11215",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11215",
      symbol: "10,BNTNUT"
    },
    reserves: [
      bntToken,
      {
        contract: "eosdtnutoken",
        symbol: "9,NUT"
      }
    ]
  },
  {
    contract: "bancorc11222",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11222",
      symbol: "10,BNTESDT"
    },
    reserves: [
      bntToken,
      {
        contract: "eosdtsttoken",
        symbol: "9,EOSDT"
      }
    ]
  },
  {
    contract: "bancorc11223",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11223",
      symbol: "10,BNTDRGN"
    },
    reserves: [
      bntToken,
      {
        contract: "eosdragontkn",
        symbol: "4,DRAGON"
      }
    ]
  },
  {
    contract: "bancorc11225",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11225",
      symbol: "10,BNTLUME"
    },
    reserves: [
      bntToken,
      {
        contract: "lumetokenctr",
        symbol: "3,LUME"
      }
    ]
  },
  {
    contract: "bancorc11231",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11231",
      symbol: "10,BNTSENS"
    },
    reserves: [
      bntToken,
      {
        contract: "sensegenesis",
        symbol: "4,SENSE"
      }
    ]
  },
  {
    contract: "bancorc11232",
    isMultiContract: false,
    smartToken: {
      contract: "bancorr11232",
      symbol: "10,BNTUSDT"
    },
    reserves: [
      bntToken,
      {
        contract: "tethertether",
        symbol: "4,USDT"
      }
    ]
  }
];

const getHardCodedRelays = (): DryRelay[] =>
  oldRelays.map(relay => ({
    ...relay,
    smartToken: {
      contract: relay.smartToken.contract,
      symbol: new Sym(relay.smartToken.symbol)
    },
    reserves: relay.reserves.map(reserve => ({
      ...reserve,
      symbol: new Sym(reserve.symbol)
    }))
  }));
