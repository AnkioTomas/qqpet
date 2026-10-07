// Extracted verbatim from the original renderer bundle.
/** Clickable face spots: interact/<key><n>.swf, n in [s ?? 1, e ?? s ?? 1]. */
export interface FacePoint {
  top: string
  left: string
  s?: number
  e?: number
}

type Points = Record<string, FacePoint>

export const FACE: Record<string, { Adult: Record<string, Points>; Kid: Points; Egg: Points }> = {
  MM: {
    Adult: {
      happy: {
        BE: {
          top: '78%',
          left: '50%',
          e: 5,
        },
        H: {
          top: '45%',
          left: '50%',
          e: 3,
        },
        LE: {
          left: '43%',
          top: '55%',
        },
        LF: {
          top: '85%',
          left: '35%',
          e: 3,
        },
        LFA: {
          top: '61%',
          left: '36%',
        },
        LH: {
          top: '74%',
          left: '22%',
          e: 3,
        },
        M: {
          top: '63%',
          left: '48%',
          e: 5,
        },
        RF: {
          top: '85%',
          left: '59%',
          e: 2,
        },
        RH: {
          top: '73%',
          left: '73%',
          e: 5,
        },
        SC: {
          top: '72%',
          left: '40%',
          e: 2,
        },
      },
      peaceful: {
        BE: {
          top: '78%',
          left: '50%',
          e: 6,
        },
        H: {
          top: '45%',
          left: '50%',
          e: 8,
        },
        LE: {
          left: '43%',
          top: '55%',
          e: 3,
        },
        LF: {
          top: '85%',
          left: '35%',
          e: 5,
        },
        LH: {
          top: '74%',
          left: '22%',
          e: 4,
        },
        M: {
          top: '63%',
          left: '48%',
          e: 5,
        },
        RE: {
          left: '54%',
          top: '55%',
          e: 4,
        },
        RF: {
          top: '85%',
          left: '59%',
          e: 3,
        },
        RH: {
          top: '73%',
          left: '73%',
          e: 3,
        },
        SC: {
          top: '72%',
          left: '40%',
          e: 3,
        },
      },
      upset: {
        BE: {
          top: '81%',
          left: '45%',
          e: 2,
        },
        H: {
          top: '51%',
          left: '50%',
          e: 3,
        },
        LF: {
          top: '82%',
          left: '32%',
          e: 3,
        },
        M: {
          top: '72%',
          left: '48%',
          e: 6,
        },
        RH: {
          top: '80%',
          left: '54%',
        },
      },
      sad: {
        E: {
          top: '77%',
          left: '42%',
          e: 2,
        },
        H: {
          top: '63%',
          left: '43%',
          e: 4,
        },
        LF: {
          top: '75%',
          left: '25%',
          e: 2,
        },
        LH: {
          top: '84%',
          left: '31%',
        },
        M: {
          top: '85%',
          left: '43%',
          e: 9,
        },
        RF: {
          top: '79%',
          left: '67%',
          e: 4,
        },
      },
    },
    Kid: {
      H: {
        top: '46%',
        left: '47%',
        e: 1,
      },
      LE: {
        left: '42%',
        top: '56.5%',
        e: 2,
      },
      LF: {
        top: '85%',
        left: '30%',
        s: 2,
        e: 2,
      },
      LFA: {
        top: '64%',
        left: '35%',
      },
      LH: {
        top: '74%',
        left: '23%',
        s: 2,
        e: 4,
      },
      M: {
        top: '63%',
        left: '46%',
        e: 2,
      },
      RE: {
        left: '51%',
        top: '56.5%',
        e: 2,
      },
      RF: {
        top: '85%',
        left: '53%',
        s: 2,
        e: 2,
      },
      RH: {
        top: '74%',
        left: '69%',
        s: 2,
        e: 4,
      },
      S: {
        top: '72%',
        left: '54%',
        e: 2,
      },
    },
    Egg: {
      E: {
        top: '54%',
        left: '46%',
        e: 3,
      },
      F: {
        top: '84%',
        left: '46%',
        e: 5,
      },
      H: {
        top: '41%',
        left: '46%',
        e: 4,
      },
      M: {
        top: '65%',
        left: '46%',
        e: 2,
      },
    },
  },
  GG: {
    Adult: {
      happy: {
        BE: {
          top: '78%',
          left: '50%',
          e: 7,
        },
        H: {
          top: '45%',
          left: '50%',
          e: 3,
        },
        LE: {
          left: '43%',
          top: '55%',
        },
        LF: {
          top: '85%',
          left: '35%',
          e: 3,
        },
        LFA: {
          top: '61%',
          left: '36%',
        },
        LH: {
          top: '74%',
          left: '22%',
          e: 3,
        },
        M: {
          top: '63%',
          left: '48%',
          e: 5,
        },
        RF: {
          top: '85%',
          left: '59%',
          e: 2,
        },
        RH: {
          top: '73%',
          left: '73%',
          e: 5,
        },
      },
      peaceful: {
        BE: {
          top: '78%',
          left: '50%',
          e: 6,
        },
        H: {
          top: '45%',
          left: '50%',
          e: 8,
        },
        LE: {
          left: '43%',
          top: '55%',
          e: 3,
        },
        LF: {
          top: '85%',
          left: '35%',
          e: 5,
        },
        LH: {
          top: '74%',
          left: '22%',
          e: 4,
        },
        M: {
          top: '63%',
          left: '48%',
          e: 5,
        },
        RE: {
          left: '54%',
          top: '55%',
          e: 4,
        },
        RF: {
          top: '85%',
          left: '59%',
          e: 3,
        },
        RH: {
          top: '73%',
          left: '73%',
          e: 3,
        },
        SC: {
          top: '72%',
          left: '40%',
          e: 3,
        },
      },
      upset: {
        BE: {
          top: '81%',
          left: '45%',
          e: 2,
        },
        H: {
          top: '51%',
          left: '50%',
          e: 3,
        },
        LF: {
          top: '82%',
          left: '32%',
          e: 3,
        },
        M: {
          top: '72%',
          left: '48%',
          e: 6,
        },
        RH: {
          top: '80%',
          left: '54%',
        },
      },
      sad: {
        E: {
          top: '77%',
          left: '42%',
          e: 2,
        },
        H: {
          top: '63%',
          left: '43%',
          e: 4,
        },
        LF: {
          top: '75%',
          left: '25%',
          e: 2,
        },
        LH: {
          top: '84%',
          left: '31%',
        },
        M: {
          top: '85%',
          left: '43%',
          e: 9,
        },
        RF: {
          top: '79%',
          left: '67%',
          e: 4,
        },
      },
    },
    Kid: {
      H: {
        top: '46%',
        left: '47%',
        e: 2,
      },
      LE: {
        left: '42%',
        top: '56.5%',
        e: 2,
      },
      LF: {
        top: '85%',
        left: '30%',
        s: 2,
        e: 2,
      },
      LFA: {
        top: '64%',
        left: '35%',
      },
      LH: {
        top: '74%',
        left: '23%',
        s: 2,
        e: 4,
      },
      M: {
        top: '63%',
        left: '46%',
        e: 2,
      },
      RE: {
        left: '51%',
        top: '56.5%',
        e: 2,
      },
      RF: {
        top: '85%',
        left: '53%',
        s: 2,
        e: 2,
      },
      RH: {
        top: '74%',
        left: '69%',
        s: 2,
        e: 4,
      },
      S: {
        top: '72%',
        left: '54%',
        e: 2,
      },
    },
    Egg: {
      E: {
        top: '54%',
        left: '46%',
        e: 3,
      },
      F: {
        top: '84%',
        left: '46%',
        e: 5,
      },
      H: {
        top: '41%',
        left: '46%',
        e: 4,
      },
      M: {
        top: '65%',
        left: '46%',
        e: 2,
      },
    },
  },
}
