import { describe, it, expect } from 'vitest';
import { FakeRadioPort } from './mock.ts';
import { readFromRadio, writeToRadio } from './session.ts';
import { parseImage } from '../image/parse.ts';
import { serializeImage } from '../image/serialize.ts';
import { emptyImageBuffer } from '../image/synthetic.ts';
import { mhzToRaw } from '../codec/lbcd.ts';
import type { Channel } from '../image/schema.ts';

const blankFlags: Channel['rawFlags'] = {
  flagsByte0Other: 0,
  isUhf: 0,
  scode: 0,
  flagsByte1: 0,
  flagsByte2Other: 0,
  flagsByte3PttId: 0,
};

describe('serial session against FakeRadioPort', () => {
  it('downloads exactly what the radio holds', async () => {
    // Seed mock memory with a programmed channel.
    const seed = parseImage(emptyImageBuffer());
    seed.channels[0] = {
      rxHz: mhzToRaw(146.84) * 10,
      txHz: mhzToRaw(146.24) * 10,
      rxTone: { kind: 'none' },
      txTone: { kind: 'ctcss', hz: 100.0 },
      name: 'W7TEST',
      power: 'high',
      bandwidth: 'wide',
      scanAdd: true,
      busyLockout: false,
      rawFlags: blankFlags,
    };
    const seeded = serializeImage(seed);

    const port = FakeRadioPort.withImage(seeded);
    const downloaded = await readFromRadio(undefined, port);

    // The mock overwrites the ident header; the rest must match byte-for-byte.
    expect(downloaded.length).toBe(seeded.length);
    const reparsed = parseImage(downloaded);
    expect(reparsed.channels[0]?.name).toBe('W7TEST');
    expect(reparsed.channels[0]?.rxHz).toBe(146_840_000);
    expect(reparsed.channels[0]?.txTone).toEqual({ kind: 'ctcss', hz: 100.0 });
  }, 15000);

  it('preserves channel names through a read (regression test for radio<->file address shift)', async () => {
    // Names live in the second half of memory. If we got the radio<->file
    // address mapping wrong, the 8-byte shift would put us in the 9-byte
    // padding region of each 16-byte name slot — the visible 7-char name
    // would become garbage.
    const seed = parseImage(emptyImageBuffer());
    const blank = blankFlags;
    seed.channels[0] = {
      rxHz: mhzToRaw(146.52) * 10,
      txHz: mhzToRaw(146.52) * 10,
      rxTone: { kind: 'none' },
      txTone: { kind: 'none' },
      name: 'CALL',
      power: 'high',
      bandwidth: 'wide',
      scanAdd: true,
      busyLockout: false,
      rawFlags: blank,
    };
    seed.channels[7] = {
      rxHz: mhzToRaw(442.5) * 10,
      txHz: mhzToRaw(442.5) * 10,
      rxTone: { kind: 'none' },
      txTone: { kind: 'none' },
      name: 'TESTING', // exactly 7 chars — fills the whole name slot
      power: 'high',
      bandwidth: 'wide',
      scanAdd: true,
      busyLockout: false,
      rawFlags: blank,
    };
    const seeded = serializeImage(seed);
    const port = FakeRadioPort.withImage(seeded);
    const downloaded = await readFromRadio(undefined, port);
    const reparsed = parseImage(downloaded);
    expect(reparsed.channels[0]?.name).toBe('CALL');
    expect(reparsed.channels[7]?.name).toBe('TESTING');
  }, 15000);

  it('uploads back what we send', async () => {
    const port = FakeRadioPort.withImage(emptyImageBuffer());
    // Build an image with a different channel and write it.
    const newImage = parseImage(emptyImageBuffer());
    newImage.channels[5] = {
      rxHz: mhzToRaw(442.5) * 10,
      txHz: mhzToRaw(447.5) * 10,
      rxTone: { kind: 'none' },
      txTone: { kind: 'ctcss', hz: 88.5 },
      name: 'UHFTEST',
      power: 'high',
      bandwidth: 'wide',
      scanAdd: true,
      busyLockout: false,
      rawFlags: blankFlags,
    };
    const bytes = serializeImage(newImage);
    await writeToRadio(bytes, undefined, port);

    // After upload, the fake radio's memory should contain channel 5.
    const reparsed = parseImage(port.memory);
    expect(reparsed.channels[5]?.name).toBe('UHFTEST');
    expect(reparsed.channels[5]?.txHz).toBe(447_500_000);
  }, 45000);
});
