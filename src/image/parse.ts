import { lbcdDecode, isErasedFreq } from '../codec/lbcd.ts';
import { decodeToneWord } from '../codec/tones.ts';
import {
  CHANNEL_COUNT,
  CHANNEL_LAYOUT,
  IMAGE_SIZE,
  NAME_LENGTH,
  OFFSETS,
  channelOffset,
  nameOffset,
} from './layout.ts';
import type { Channel, RadioImage } from './schema.ts';

export function parseImage(buf: Uint8Array): RadioImage {
  if (buf.length !== IMAGE_SIZE) {
    throw new Error(`Expected ${IMAGE_SIZE}-byte image, got ${buf.length}`);
  }
  const raw = new Uint8Array(buf); // own copy
  const ident = raw.slice(OFFSETS.ident, OFFSETS.ident + 8);

  const channels: (Channel | null)[] = [];
  for (let i = 0; i < CHANNEL_COUNT; i++) {
    channels.push(parseChannel(raw, i));
  }

  return { ident, channels, raw };
}

function parseChannel(raw: Uint8Array, index: number): Channel | null {
  const co = channelOffset(index);
  if (isErasedFreq(raw, co + CHANNEL_LAYOUT.rxfreq.offset)) {
    return null;
  }

  const rxHz = lbcdDecode(raw, co + CHANNEL_LAYOUT.rxfreq.offset) * 10;
  const txHz = isErasedFreq(raw, co + CHANNEL_LAYOUT.txfreq.offset)
    ? rxHz
    : lbcdDecode(raw, co + CHANNEL_LAYOUT.txfreq.offset) * 10;

  const rxToneWord = raw[co + CHANNEL_LAYOUT.rxtone.offset] | (raw[co + CHANNEL_LAYOUT.rxtone.offset + 1] << 8);
  const txToneWord = raw[co + CHANNEL_LAYOUT.txtone.offset] | (raw[co + CHANNEL_LAYOUT.txtone.offset + 1] << 8);

  const b0 = raw[co + CHANNEL_LAYOUT.flagsByte0];
  const b1 = raw[co + CHANNEL_LAYOUT.flagsByte1];
  const b2 = raw[co + CHANNEL_LAYOUT.flagsByte2];
  const b3 = raw[co + CHANNEL_LAYOUT.flagsByte3];

  // b0: unused1:3, isuhf:1, scode:4  (MSB-first packing per CHIRP bitwise DSL)
  const isUhf = (b0 >> 4) & 0x01;
  const scode = b0 & 0x0f;
  const flagsByte0Other = b0 & 0xe0; // preserve unused1:3 bits in the top three

  // b2: mailicon:3, unknown2:3, lowpower:2
  const lowpower = b2 & 0x03;
  const flagsByte2Other = b2 & 0xfc;

  // b3: unknown3:1, wide:1, unknown4:2, bcl:1, scan:1, pttid:2
  const wide = (b3 >> 6) & 0x01;
  const bcl = (b3 >> 3) & 0x01;
  const scan = (b3 >> 2) & 0x01;
  const pttid = b3 & 0x03;

  const name = readName(raw, index);

  return {
    rxHz,
    txHz,
    rxTone: decodeToneWord(rxToneWord),
    txTone: decodeToneWord(txToneWord),
    name,
    power: lowpower === 0 ? 'high' : 'low',
    bandwidth: wide ? 'wide' : 'narrow',
    scanAdd: !!scan,
    busyLockout: !!bcl,
    rawFlags: {
      flagsByte0Other,
      isUhf,
      scode,
      flagsByte1: b1,
      flagsByte2Other,
      flagsByte3PttId: pttid,
    },
  };
}

function readName(raw: Uint8Array, index: number): string {
  const no = nameOffset(index);
  let out = '';
  for (let i = 0; i < NAME_LENGTH; i++) {
    const c = raw[no + i];
    if (c === 0xff || c === 0x00) break;
    out += String.fromCharCode(c);
  }
  return out.trimEnd();
}
