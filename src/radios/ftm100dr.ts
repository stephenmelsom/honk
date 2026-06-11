import type { RadioModel } from './types.ts';

const FTM100DR_HEADER = new Uint8Array([0x41, 0x48, 0x30, 0x33, 0x34, 0x24]); // AH034$

export const FTM100DR: RadioModel = {
  id: 'ftm100dr',
  label: 'Yaesu FTM-100DR',
  support: 'experimental',
  imageSize: 0x10000,
  channelCount: 500,
  imageCodec: 'yaesu-ftm',
  memory: {
    identHeaderSize: FTM100DR_HEADER.length,
    channelBytes: 16,
    nameBytes: 8,
    nameLength: 8,
    offsets: {
      ident: 0x0000,
      channels: 0x0200,
      names: 0x42c0,
    },
    channel: {
      rxfreq: { offset: 2, length: 3 },
      txfreq: { offset: 6, length: 3 },
      rxtone: { offset: 10, length: 1 },
      txtone: { offset: 9, length: 1 },
      flagsByte0: 0,
      flagsByte1: 1,
      flagsByte2: 5,
      flagsByte3: 11,
    },
  },
  frequencyLimits: {
    vhf: [144_000_000, 148_000_000],
    uhf: [430_000_000, 450_000_000],
  },
  defaultRxHz: 146_520_000,
  expectedIdent: FTM100DR_HEADER,
  identMatches(bytes) {
    if (bytes.length < FTM100DR_HEADER.length) return false;
    for (let i = 0; i < FTM100DR_HEADER.length; i++) {
      if (bytes[i] !== FTM100DR_HEADER[i]) return false;
    }
    return true;
  },
};
