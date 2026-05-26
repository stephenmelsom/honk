import { describe, it, expect } from 'vitest';
import { lbcdEncode, lbcdDecode, mhzToRaw, rawToMhz } from './lbcd.ts';

describe('lbcd', () => {
  it('encodes 146.520 MHz as expected little-endian BCD', () => {
    // 146.520 MHz -> 14_652_000 in 10-Hz units
    const encoded = lbcdEncode(mhzToRaw(146.52));
    expect(Array.from(encoded)).toEqual([0x00, 0x20, 0x65, 0x14]);
  });

  it('decodes back to the same integer', () => {
    const raw = mhzToRaw(446.0);
    const bytes = lbcdEncode(raw);
    expect(lbcdDecode(bytes)).toBe(raw);
  });

  it('round-trips a range of frequencies', () => {
    const cases = [144.0, 146.52, 147.345, 162.55, 442.0, 446.0, 462.5625, 467.7125];
    for (const mhz of cases) {
      const raw = mhzToRaw(mhz);
      expect(lbcdDecode(lbcdEncode(raw))).toBe(raw);
      expect(rawToMhz(raw)).toBeCloseTo(mhz, 5);
    }
  });
});
