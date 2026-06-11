import type { RadioModel, RadioSupport } from './types.ts';

export const UV5R_MODEL_291 = new Uint8Array([0x50, 0xbb, 0xff, 0x20, 0x12, 0x07, 0x25]);
export const UV5R_MODEL_ORIG = new Uint8Array([0x50, 0xbb, 0xff, 0x12, 0x03, 0x98, 0x4d]);
export const UV5R_MODEL_UV82 = new Uint8Array([0x50, 0xbb, 0xff, 0x20, 0x13, 0x01, 0x05]);
export const UV5R_MODEL_UV6 = new Uint8Array([0x50, 0xbb, 0xff, 0x20, 0x12, 0x08, 0x23]);
export const UV5R_MODEL_UV6_ORIG = new Uint8Array([0x50, 0xbb, 0xff, 0x12, 0x03, 0x98, 0x4d]);

const IDENT_END = 0xdd;

const UV5R_MEMORY: RadioModel['memory'] = {
  identHeaderSize: 0x0008,
  channelBytes: 16,
  nameBytes: 16,
  nameLength: 7,
  offsets: {
    ident: 0x0000,
    channels: 0x0008,
    pttid: 0x0b08,
    ani: 0x0c88,
    settings: 0x0e28,
    wmchannel: 0x0e7e,
    vfoa: 0x0f10,
    vfob: 0x0f30,
    fmPresets: 0x0f56,
    names: 0x1008,
    sixPowerOnMsg: 0x1818,
    firmwareMsg: 0x1838,
  },
  channel: {
    rxfreq: { offset: 0, length: 4 },
    txfreq: { offset: 4, length: 4 },
    rxtone: { offset: 8, length: 2 },
    txtone: { offset: 10, length: 2 },
    flagsByte0: 12,
    flagsByte1: 13,
    flagsByte2: 14,
    flagsByte3: 15,
  },
};

const UV5R_WRITE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0008, 0x0cf8],
  [0x0d08, 0x0df8],
  [0x0e08, 0x1808],
];

function identFromMagic(magic: Uint8Array): Uint8Array {
  const ident = new Uint8Array(magic.length + 1);
  ident.set(magic);
  ident[magic.length] = IDENT_END;
  return ident;
}

function identMatchesAny(magics: readonly Uint8Array[], bytes: Uint8Array): boolean {
  return magics.some((magic) => {
    if (bytes.length < magic.length) return false;
    for (let i = 0; i < magic.length; i++) {
      if (bytes[i] !== magic[i]) return false;
    }
    return true;
  });
}

export function defineUv5rFamilyModel(options: {
  id: string;
  label: string;
  support: RadioSupport;
  magics: readonly Uint8Array[];
  vhf: readonly [number, number];
  uhf: readonly [number, number];
  defaultRxHz?: number;
}): RadioModel {
  return {
    id: options.id,
    label: options.label,
    support: options.support,
    imageSize: 0x1808,
    channelCount: 128,
    memory: UV5R_MEMORY,
    serial: {
      magics: options.magics,
      baud: 9600,
      radioMainSize: 0x1800,
      readBlockSize: 0x40,
      writeBlockSize: 0x10,
      writeRangesFile: UV5R_WRITE_RANGES,
    },
    frequencyLimits: {
      vhf: options.vhf,
      uhf: options.uhf,
    },
    defaultRxHz: options.defaultRxHz ?? 146_520_000,
    expectedIdent: identFromMagic(options.magics[0]),
    identMatches(bytes) {
      return identMatchesAny(options.magics, bytes);
    },
  };
}
