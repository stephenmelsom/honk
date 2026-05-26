import { lbcdDecode, isErasedFreq } from '../codec/lbcd.ts';
import { decodeToneWord } from '../codec/tones.ts';
import type { RadioModel } from '../radios/types.ts';
import { channelOffset, nameOffset } from '../radios/util.ts';
import type { Channel, RadioImage } from './schema.ts';
import { parseSettings } from './settings.ts';

export function parseImage(buf: Uint8Array, model: RadioModel): RadioImage {
  if (buf.length !== model.imageSize) {
    throw new Error(`Expected ${model.imageSize}-byte ${model.label} image, got ${buf.length}`);
  }
  const raw = new Uint8Array(buf); // own copy
  const layout = model.memory;
  const ident = raw.slice(layout.offsets.ident, layout.offsets.ident + layout.identHeaderSize);

  const channels: (Channel | null)[] = [];
  for (let i = 0; i < model.channelCount; i++) {
    channels.push(parseChannel(raw, model, i));
  }

  const settings = parseSettings(raw, model);

  return { radioId: model.id, ident, channels, settings, raw };
}

function parseChannel(raw: Uint8Array, model: RadioModel, index: number): Channel | null {
  const co = channelOffset(model, index);
  const ch = model.memory.channel;
  if (isErasedFreq(raw, co + ch.rxfreq.offset)) {
    return null;
  }

  const rxHz = lbcdDecode(raw, co + ch.rxfreq.offset) * 10;
  const txHz = isErasedFreq(raw, co + ch.txfreq.offset)
    ? rxHz
    : lbcdDecode(raw, co + ch.txfreq.offset) * 10;

  const rxToneWord = raw[co + ch.rxtone.offset] | (raw[co + ch.rxtone.offset + 1] << 8);
  const txToneWord = raw[co + ch.txtone.offset] | (raw[co + ch.txtone.offset + 1] << 8);

  const b0 = raw[co + ch.flagsByte0];
  const b1 = raw[co + ch.flagsByte1];
  const b2 = raw[co + ch.flagsByte2];
  const b3 = raw[co + ch.flagsByte3];

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

  const name = readName(raw, model, index);

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

function readName(raw: Uint8Array, model: RadioModel, index: number): string {
  const no = nameOffset(model, index);
  let out = '';
  for (let i = 0; i < model.memory.nameLength; i++) {
    const c = raw[no + i];
    if (c === 0xff || c === 0x00) break;
    out += String.fromCharCode(c);
  }
  return out.trimEnd();
}
