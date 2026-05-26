import { describe, it, expect } from 'vitest';
import { parseImage } from './parse.ts';
import { serializeImage } from './serialize.ts';
import { emptyImageBuffer } from './synthetic.ts';
import { UV82L } from '../radios/uv82l.ts';
import type { Channel } from './schema.ts';
import { mhzToRaw } from '../codec/lbcd.ts';

const blankFlags: Channel['rawFlags'] = {
  flagsByte0Other: 0,
  isUhf: 0,
  scode: 0,
  flagsByte1: 0,
  flagsByte2Other: 0,
  flagsByte3PttId: 0,
};

function simplex(name: string, mhz: number): Channel {
  const hz = mhzToRaw(mhz) * 10;
  return {
    rxHz: hz,
    txHz: hz,
    rxTone: { kind: 'none' },
    txTone: { kind: 'none' },
    name,
    power: 'high',
    bandwidth: 'wide',
    scanAdd: true,
    busyLockout: false,
    rawFlags: blankFlags,
  };
}

function repeater(name: string, outMhz: number, inMhz: number, toneHz: number): Channel {
  return {
    rxHz: mhzToRaw(outMhz) * 10,
    txHz: mhzToRaw(inMhz) * 10,
    rxTone: { kind: 'none' },
    txTone: { kind: 'ctcss', hz: toneHz },
    name,
    power: 'high',
    bandwidth: 'wide',
    scanAdd: true,
    busyLockout: false,
    rawFlags: blankFlags,
  };
}

describe('image round-trip', () => {
  it('parses an empty image as 128 null channels', () => {
    const img = parseImage(emptyImageBuffer(UV82L), UV82L);
    expect(img.channels).toHaveLength(128);
    expect(img.channels.every((c) => c === null)).toBe(true);
    expect(img.raw.length).toBe(UV82L.imageSize);
    expect(img.radioId).toBe('uv82l');
  });

  it('round-trips a few channels byte-for-byte through parse(serialize)', () => {
    const img = parseImage(emptyImageBuffer(UV82L), UV82L);
    img.channels[0] = simplex('CALL', 146.52);
    img.channels[1] = simplex('FRS 1', 462.5625);
    img.channels[2] = repeater('W7RPT', 146.84, 146.24, 100.0); // -0.6 MHz
    img.channels[3] = repeater('UHFRPT', 442.1, 447.1, 88.5);   // +5.0 MHz

    const bytes = serializeImage(img, UV82L);
    expect(bytes.length).toBe(UV82L.imageSize);

    const reparsed = parseImage(bytes, UV82L);
    // The four programmed channels survive a parse->serialize->parse cycle.
    expect(reparsed.channels[0]).toEqual(img.channels[0]);
    expect(reparsed.channels[1]).toEqual(img.channels[1]);
    expect(reparsed.channels[2]).toEqual(img.channels[2]);
    expect(reparsed.channels[3]).toEqual(img.channels[3]);

    // Every other slot stays empty.
    for (let i = 4; i < 128; i++) expect(reparsed.channels[i]).toBeNull();
  });

  it('produces byte-stable output on a no-op edit cycle', () => {
    // Build a populated image, serialize, parse, serialize again. The two
    // serialized buffers must be identical byte-for-byte — this is the
    // strongest guarantee against silent corruption.
    const img = parseImage(emptyImageBuffer(UV82L), UV82L);
    img.channels[0] = repeater('W7AAA', 146.94, 146.34, 100.0);
    img.channels[5] = repeater('K7BBB', 443.5, 448.5, 131.8);
    img.channels[42] = simplex('NOAA-1', 162.55);

    const first = serializeImage(img, UV82L);
    const reparsed = parseImage(first, UV82L);
    const second = serializeImage(reparsed, UV82L);
    expect(second).toEqual(first);
  });
});
