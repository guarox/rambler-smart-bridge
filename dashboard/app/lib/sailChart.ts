// J/99 Sail Chart — from sail chart.txt
// Rows: TWS 1–50 kts | Cols: TWA 35–180° in 5° steps (index 0 = 35°, index 29 = 180°)
// null = no recommendation at that combination

export type SailName = 'J-3' | 'J-1' | 'J-0' | 'C-65' | 'A-3' | 'A-2' | 'A-1.5' | null;

export const SAIL_COLORS: Record<string, string> = {
  'J-3':   '#3b82f6', // blue
  'J-1':   '#f97316', // orange
  'J-0':   '#22c55e', // green
  'C-65':  '#06b6d4', // cyan
  'A-3':   '#eab308', // gold
  'A-2':   '#a855f7', // purple
  'A-1.5': '#ef4444', // red
};

export const SAIL_DISPLAY: Record<string, string> = {
  'J-3':   'J3',
  'J-1':   'J1',
  'J-0':   'J0',
  'C-65':  'C65',
  'A-3':   'A3',
  'A-2':   'A2',
  'A-1.5': 'A1.5',
};

// TWA column indices: 0=35°, 1=40°, ... 29=180°
export const TWA_COLS = [35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180];

type R = SailName;
const _ = null;
const J3 = 'J-3' as R, J1 = 'J-1' as R, J0 = 'J-0' as R;
const C6 = 'C-65' as R, A3 = 'A-3' as R, A2 = 'A-2' as R, A15 = 'A-1.5' as R;

// SAIL_CHART[tws] = array of 30 sail names (index = TWA col)
// tws index 0 = TWS 0 (unused), index 1 = TWS 1 kts, ..., index 50 = TWS 50 kts
export const SAIL_CHART: R[][] = [
  /* 0  */ Array(30).fill(_),
  /* 1  */ [_,J0,J0,J0,J0,C6,C6,C6,C6,C6,A15,A15,A15,A15,A15,A15,A15,_,_,_,_,_,_,_,_,_,_,_,_,_],
  /* 2  */ [_,J0,J0,J0,J0,C6,C6,C6,C6,C6,A15,A15,A15,A15,A15,A15,A15,_,_,_,_,_,_,_,_,_,_,_,_,_],
  /* 3  */ [_,J0,J0,J0,J0,C6,C6,C6,C6,C6,C6,A15,A15,A15,A15,A15,A15,A15,_,_,_,_,_,_,_,_,_,_,_,_],
  /* 4  */ [_,J0,J0,J0,J0,C6,C6,C6,C6,C6,C6,A15,A15,A15,A15,A15,A15,A15,A15,A15,_,_,_,_,_,_,_,_,_,_],
  /* 5  */ [_,J0,J0,J0,J0,C6,C6,C6,C6,C6,C6,C6,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,_,_,_,_,_,_,_,_],
  /* 6  */ [_,J0,J0,J0,J0,C6,C6,C6,C6,C6,C6,C6,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,_,_,_,_,_],
  /* 7  */ [_,J1,J0,J0,J0,C6,C6,C6,C6,C6,C6,C6,C6,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15],
  /* 8  */ [_,J1,J1,J0,J0,C6,C6,C6,C6,C6,C6,C6,C6,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15],
  /* 9  */ [_,J1,J1,J1,J0,C6,C6,C6,C6,C6,C6,C6,C6,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15],
  /* 10 */ [_,J1,J1,J1,J0,C6,C6,C6,C6,C6,C6,C6,C6,A3, A3, A3, A3, A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15],
  /* 11 */ [_,J1,J1,J1,J1,J0,C6,C6,C6,C6,C6,C6,C6,A3, A3, A3, A3, A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15],
  /* 12 */ [_,J1,J1,J1,J1,J0,C6,C6,C6,C6,C6,C6,C6,A3, A3, A3, A3, A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15],
  /* 13 */ [_,J1,J1,J1,J1,J0,J0,C6,C6,C6,C6,C6,C6,A3, A3, A3, A3, A3, A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15],
  /* 14 */ [_,J1,J1,J1,J1,J0,J0,C6,C6,C6,C6,C6,C6,C6,A3, A3, A3, A3, A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15],
  /* 15 */ [_,J1,J1,J1,J1,J1,J0,J0,C6,C6,C6,C6,C6,C6,C6,A3, A3, A3, A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15,A15],
  /* 16 */ [_,J1,J1,J1,J1,J1,J0,J0,C6,C6,C6,C6,C6,C6,C6,A3, A3, A3, A15,A15,A15,A15,A2, A2, A2, A2, A2, A2, A2, A2],
  /* 17 */ [_,J1,J1,J1,J1,J1,J0,J0,J0,C6,C6,C6,C6,C6,C6,A3, A3, A3, A15,A15,A15,A15,A2, A2, A2, A2, A2, A2, A2, A2],
  /* 18 */ [_,J3,J1,J1,J1,J1,J0,J0,J0,C6,C6,C6,C6,C6,C6,A3, A3, A3, A15,A15,A15,A15,A2, A2, A2, A2, A2, A2, A2, A2],
  /* 19 */ [_,J3,J3,J1,J1,J1,J0,J0,J0,J0,C6,C6,C6,C6,C6,A3, A3, A3, A3, A3, A15,A15,A2, A2, A2, A2, A2, A2, A2, A2],
  /* 20 */ [_,J3,J3,J3,J1,J1,J0,J0,J0,J0,C6,C6,C6,C6,C6,A3, A3, A3, A3, A3, A15,A15,A2, A2, A2, A2, A2, A2, A2, A2],
  /* 21 */ [_,J3,J3,J3,J1,J1,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2, A2, A2],
  /* 22 */ [_,J3,J3,J3,J1,J1,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2, A2, A2],
  /* 23 */ [_,J3,J3,J3,J1,J1,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 24 */ [_,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 25 */ [_,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 26 */ [_,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,J0,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 27 */ [_,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,J0,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 28 */ [_,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,J0,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 29 */ [_,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,J0,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 30 */ [_,J3,J3,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 31 */ [_,J3,J3,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 32 */ [_,J3,J3,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 33 */ [_,J3,J3,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 34 */ [_,J3,J3,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 35 */ [_,J3,J3,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2],
  /* 36-50: same as 35 */
  ...(Array(15).fill([_,J3,J3,J3,J3,J3,J3,J3,J0,J0,J0,J0,J0,C6,C6,C6,C6,A3, A3, A3, A3, A3, A3, A3, A2, A2, A2, A2, A2, A2])),
];

/** Look up the recommended sail for given TWS (kts) and TWA (degrees absolute) */
export function getSail(tws: number, twa: number): SailName {
  const twsIdx = Math.max(1, Math.min(50, Math.round(tws)));
  // Find nearest TWA column
  const twaAbs = Math.max(35, Math.min(180, Math.abs(twa)));
  const colIdx = Math.round((twaAbs - 35) / 5);
  const clampedCol = Math.max(0, Math.min(29, colIdx));
  return SAIL_CHART[twsIdx]?.[clampedCol] ?? null;
}
