import { describe, expect, it } from 'vitest';
import { emptyImageBuffer } from '../image/synthetic.ts';
import { parseImage } from '../image/parse.ts';
import { serializeImage } from '../image/serialize.ts';
import { detectRadioFromImage, FTM100DR, listRadios, UV5R, UV82L } from './index.ts';

describe('radio registry', () => {
  it('lists the supported UV-5R-family radios', () => {
    expect(listRadios().map((r) => r.id)).toEqual([
      'uv5r',
      'uv6',
      'uv82',
      'uv82hp',
      'uv82l',
      'ftm100dr',
    ]);
  });

  it('detects a loaded image but keeps the preferred model when idents overlap', () => {
    const bytes = emptyImageBuffer(UV82L);
    expect(detectRadioFromImage(bytes, UV82L)).toBe(UV82L);
  });

  it('round-trips channel data for a non-default radio model', () => {
    const img = parseImage(emptyImageBuffer(UV5R), UV5R);
    img.channels[0] = {
      rxHz: 146_520_000,
      txHz: 146_520_000,
      rxTone: { kind: 'none' },
      txTone: { kind: 'ctcss', hz: 100.0 },
      name: 'CALL',
      bandwidth: 'wide',
      power: 'high',
      scanAdd: true,
      busyLockout: false,
      rawFlags: {
        flagsByte0Other: 0,
        isUhf: 0,
        scode: 0,
        flagsByte1: 0,
        flagsByte2Other: 0,
        flagsByte3PttId: 0,
      },
    };

    const bytes = serializeImage(img, UV5R);
    const reparsed = parseImage(bytes, UV5R);
    expect(reparsed.radioId).toBe('uv5r');
    expect(reparsed.channels[0]).toEqual(img.channels[0]);
  });

  it('round-trips Yaesu FTM-100DR channel data in ADMS-style images', () => {
    const img = parseImage(emptyImageBuffer(FTM100DR), FTM100DR);
    img.channels[0] = {
      rxHz: 146_940_000,
      txHz: 146_340_000,
      rxTone: { kind: 'none' },
      txTone: { kind: 'ctcss', hz: 100.0 },
      name: 'RPT100',
      bandwidth: 'wide',
      power: 'high',
      scanAdd: true,
      busyLockout: false,
      rawFlags: {
        flagsByte0Other: 0,
        isUhf: 0,
        scode: 0,
        flagsByte1: 0,
        flagsByte2Other: 0,
        flagsByte3PttId: 0,
      },
    };

    const bytes = serializeImage(img, FTM100DR);
    const reparsed = parseImage(bytes, FTM100DR);
    expect(reparsed.radioId).toBe('ftm100dr');
    expect(reparsed.channels[0]).toEqual(img.channels[0]);
  });
});
