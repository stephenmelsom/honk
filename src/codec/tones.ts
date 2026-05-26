// CTCSS and DCS (a.k.a. DTCS) tone encoding for Baofeng UV-5R / UV-82 family.
//
// Each channel has rxtone and txtone as little-endian uint16. CHIRP's rules
// (see chirp/drivers/uv5r.py around lines 966-1140):
//   0x0000 or 0xFFFF -> no tone
//   value >= 0x0258 (600 decimal) -> CTCSS, Hz = value / 10
//   value <= 0x0258 and > 0 -> DCS
//     index = (value > 0x69) ? value - 0x6A (reverse polarity)
//                            : value - 1    (normal polarity)
// DCS code list is CHIRP's UV5R_DTCS = sorted(DTCS_CODES + (645,)) -> 105 codes.

export type ToneSlot =
  | { kind: 'none' }
  | { kind: 'ctcss'; hz: number } // e.g. 100.0
  | { kind: 'dcs'; code: number; polarity: 'N' | 'R' };

// 50 standard CTCSS tones (CHIRP TONES).
export const CTCSS_TONES_HZ: readonly number[] = [
  67.0, 69.3, 71.9, 74.4, 77.0, 79.7, 82.5, 85.4, 88.5, 91.5,
  94.8, 97.4, 100.0, 103.5, 107.2, 110.9, 114.8, 118.8, 123.0, 127.3,
  131.8, 136.5, 141.3, 146.2, 151.4, 156.7, 159.8, 162.2, 165.5, 167.9,
  171.3, 173.8, 177.3, 179.9, 183.5, 186.2, 189.9, 192.8, 196.6, 199.5,
  203.5, 206.5, 210.7, 218.1, 225.7, 229.1, 233.6, 241.8, 250.3, 254.1,
];

// CHIRP DTCS_CODES (104) + 645 = 105 sorted codes.
const BASE_DTCS = [
  23, 25, 26, 31, 32, 36, 43, 47, 51, 53, 54,
  65, 71, 72, 73, 74, 114, 115, 116, 122, 125, 131,
  132, 134, 143, 145, 152, 155, 156, 162, 165, 172, 174,
  205, 212, 223, 225, 226, 243, 244, 245, 246, 251, 252,
  255, 261, 263, 265, 266, 271, 274, 306, 311, 315, 325,
  331, 332, 343, 346, 351, 356, 364, 365, 371, 411, 412,
  413, 423, 431, 432, 445, 446, 452, 454, 455, 462, 464,
  465, 466, 503, 506, 516, 523, 526, 532, 546, 565, 606,
  612, 624, 627, 631, 632, 654, 662, 664, 703, 712, 723,
  731, 732, 734, 743, 754,
];
export const DCS_CODES: readonly number[] = [...BASE_DTCS, 645].sort((a, b) => a - b);

const REVERSE_OFFSET = 0x6a;
const CTCSS_THRESHOLD = 0x0258; // 600 decimal

export function decodeToneWord(word: number): ToneSlot {
  if (word === 0 || word === 0xffff) return { kind: 'none' };
  if (word >= CTCSS_THRESHOLD) return { kind: 'ctcss', hz: word / 10 };
  // DCS range
  if (word >= REVERSE_OFFSET) {
    const idx = word - REVERSE_OFFSET;
    if (idx >= 0 && idx < DCS_CODES.length) {
      return { kind: 'dcs', code: DCS_CODES[idx], polarity: 'R' };
    }
  } else {
    const idx = word - 1;
    if (idx >= 0 && idx < DCS_CODES.length) {
      return { kind: 'dcs', code: DCS_CODES[idx], polarity: 'N' };
    }
  }
  return { kind: 'none' };
}

export function encodeToneWord(slot: ToneSlot): number {
  switch (slot.kind) {
    case 'none':
      return 0;
    case 'ctcss': {
      const word = Math.round(slot.hz * 10);
      if (word < CTCSS_THRESHOLD) {
        throw new Error(`CTCSS hz ${slot.hz} below valid threshold`);
      }
      return word;
    }
    case 'dcs': {
      const idx = DCS_CODES.indexOf(slot.code);
      if (idx < 0) throw new Error(`Unknown DCS code: ${slot.code}`);
      const base = slot.polarity === 'R' ? REVERSE_OFFSET : 1;
      return base + idx;
    }
  }
}
