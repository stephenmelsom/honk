import { describe, it, expect } from 'vitest';
import {
  CTCSS_TONES_HZ,
  DCS_CODES,
  decodeToneWord,
  encodeToneWord,
} from './tones.ts';
import type { ToneSlot } from './tones.ts';

describe('tones', () => {
  it('treats 0 and 0xFFFF as no tone', () => {
    expect(decodeToneWord(0)).toEqual({ kind: 'none' });
    expect(decodeToneWord(0xffff)).toEqual({ kind: 'none' });
  });

  it('round-trips every CTCSS tone', () => {
    for (const hz of CTCSS_TONES_HZ) {
      const slot: ToneSlot = { kind: 'ctcss', hz };
      const word = encodeToneWord(slot);
      expect(word).toBe(Math.round(hz * 10));
      expect(decodeToneWord(word)).toEqual(slot);
    }
  });

  it('round-trips every DCS code in both polarities', () => {
    for (const code of DCS_CODES) {
      for (const polarity of ['N', 'R'] as const) {
        const slot: ToneSlot = { kind: 'dcs', code, polarity };
        const word = encodeToneWord(slot);
        expect(decodeToneWord(word)).toEqual(slot);
      }
    }
  });

  it('has 105 DCS codes (104 + 645)', () => {
    expect(DCS_CODES.length).toBe(105);
    expect(DCS_CODES).toContain(645);
  });
});
