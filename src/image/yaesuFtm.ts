import { CTCSS_TONES_HZ, DCS_CODES } from '../codec/tones.ts';
import type { ToneSlot } from '../codec/tones.ts';
import type { RadioModel } from '../radios/types.ts';
import { channelOffset, nameOffset } from '../radios/util.ts';
import type { Channel, RadioImage } from './schema.ts';
import { DEFAULT_RADIO_SETTINGS } from './settings.ts';

const CHARSET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!"' +
  '#$%&`()*+,-./:;<=>?@[\\]^_`{|}~?????? ' +
  '?'.repeat(91);
const NAME_END = 0xca;

export function parseYaesuFtmImage(buf: Uint8Array, model: RadioModel): RadioImage {
  if (buf.length !== model.imageSize) {
    throw new Error(`Expected ${model.imageSize}-byte ${model.label} image, got ${buf.length}`);
  }
  const raw = new Uint8Array(buf);
  const ident = raw.slice(model.memory.offsets.ident, model.memory.offsets.ident + model.memory.identHeaderSize);
  const channels: (Channel | null)[] = [];
  for (let i = 0; i < model.channelCount; i++) {
    channels.push(parseChannel(raw, model, i));
  }
  return { radioId: model.id, ident, channels, settings: { ...DEFAULT_RADIO_SETTINGS }, raw };
}

export function serializeYaesuFtmImage(img: RadioImage, model: RadioModel): Uint8Array {
  if (img.raw.length !== model.imageSize) {
    throw new Error(`raw buffer must be ${model.imageSize} bytes`);
  }
  if (img.channels.length !== model.channelCount) {
    throw new Error(`expected ${model.channelCount} channels`);
  }
  const out = new Uint8Array(img.raw);
  out.set(img.ident.subarray(0, model.memory.identHeaderSize), model.memory.offsets.ident);
  for (let i = 0; i < model.channelCount; i++) {
    writeChannel(out, model, i, img.channels[i]);
  }
  return out;
}

export function emptyYaesuFtmBuffer(model: RadioModel): Uint8Array {
  const out = new Uint8Array(model.imageSize);
  out.set(model.expectedIdent, model.memory.offsets.ident);
  for (let i = 0; i < model.channelCount; i++) {
    writeChannel(out, model, i, null);
  }
  return out;
}

function parseChannel(raw: Uint8Array, model: RadioModel, index: number): Channel | null {
  const co = channelOffset(model, index);
  const used = (raw[co] >> 7) & 0x01;
  if (!used) return null;

  const rxHz = decodeFreq(raw, co + 2);
  const oddsplit = (raw[co + 1] >> 2) & 0x01;
  const duplex = raw[co + 1] & 0x03;
  const offsetHz = raw[co + 13] * 50_000;
  const splitHz = decodeFreq(raw, co + 6);
  const txHz = oddsplit ? splitHz : duplex === 2 ? rxHz - offsetHz : duplex === 3 ? rxHz + offsetHz : rxHz;
  const tmode = (raw[co + 5] >> 4) & 0x07;
  const tone = CTCSS_TONES_HZ[raw[co + 9] & 0x3f] ?? 100.0;
  const dcs = DCS_CODES[raw[co + 10] & 0x7f] ?? 23;
  const mode = (raw[co + 1] >> 4) & 0x07;
  const skip = (raw[co] >> 5) & 0x03;
  const power = (raw[co + 9] >> 6) & 0x03;

  return {
    rxHz,
    txHz,
    rxTone: receiveTone(tmode, tone, dcs),
    txTone: transmitTone(tmode, tone, dcs),
    name: readName(raw, model, index),
    power: power === 2 ? 'low' : 'high',
    bandwidth: mode === 2 ? 'narrow' : 'wide',
    scanAdd: skip === 0,
    busyLockout: false,
    rawFlags: {
      flagsByte0Other: raw[co] & 0x1f,
      isUhf: rxHz >= 300_000_000 ? 1 : 0,
      scode: 0,
      flagsByte1: 0,
      flagsByte2Other: raw[co + 5] & 0x8f,
      flagsByte3PttId: 0,
    },
  };
}

function writeChannel(out: Uint8Array, model: RadioModel, index: number, ch: Channel | null): void {
  const co = channelOffset(model, index);
  const no = nameOffset(model, index);

  if (!ch) {
    out[co] = 0;
    for (let i = 1; i < model.memory.channelBytes; i++) out[co + i] = 0;
    for (let i = 0; i < model.memory.nameBytes; i++) out[no + i] = NAME_END;
    return;
  }

  const skip = ch.scanAdd ? 0 : 1;
  out[co] = 0x80 | ((skip & 0x03) << 5) | (ch.rawFlags.flagsByte0Other & 0x1f);
  const mode = ch.bandwidth === 'narrow' ? 2 : 0;
  const duplexInfo = encodeDuplex(ch.rxHz, ch.txHz);
  out[co + 1] = ((mode & 0x07) << 4) | ((duplexInfo.oddsplit ? 1 : 0) << 2) | duplexInfo.duplex;
  encodeFreq(out, co + 2, ch.rxHz);
  out[co + 5] = (toneMode(ch) << 4) | (ch.rawFlags.flagsByte2Other & 0x8f);
  encodeFreq(out, co + 6, duplexInfo.splitHz ?? ch.rxHz);
  out[co + 9] = ((ch.power === 'low' ? 2 : 0) << 6) | toneIndex(ch);
  out[co + 10] = dcsIndex(ch);
  out[co + 11] = ch.name.trim() ? 0x80 : 0;
  out[co + 12] = 0;
  out[co + 13] = duplexInfo.offsetSteps;
  out[co + 14] = 0;
  out[co + 15] = 0;
  writeName(out, no, model.memory.nameLength, ch.name);
}

function receiveTone(tmode: number, tone: number, dcs: number): ToneSlot {
  if (tmode === 2) return { kind: 'ctcss', hz: tone };
  if (tmode === 4) return { kind: 'dcs', code: dcs, polarity: 'N' };
  return { kind: 'none' };
}

function transmitTone(tmode: number, tone: number, dcs: number): ToneSlot {
  if (tmode === 1 || tmode === 2) return { kind: 'ctcss', hz: tone };
  if (tmode === 4) return { kind: 'dcs', code: dcs, polarity: 'N' };
  return { kind: 'none' };
}

function toneMode(ch: Channel): number {
  if (ch.txTone.kind === 'dcs' || ch.rxTone.kind === 'dcs') return 4;
  if (ch.rxTone.kind === 'ctcss') return 2;
  if (ch.txTone.kind === 'ctcss') return 1;
  return 0;
}

function toneIndex(ch: Channel): number {
  const hz = ch.txTone.kind === 'ctcss' ? ch.txTone.hz : ch.rxTone.kind === 'ctcss' ? ch.rxTone.hz : 100.0;
  const index = CTCSS_TONES_HZ.indexOf(hz);
  return index < 0 ? CTCSS_TONES_HZ.indexOf(100.0) : index;
}

function dcsIndex(ch: Channel): number {
  const code = ch.txTone.kind === 'dcs' ? ch.txTone.code : ch.rxTone.kind === 'dcs' ? ch.rxTone.code : 23;
  const index = DCS_CODES.indexOf(code);
  return index < 0 ? 0 : index;
}

function encodeDuplex(rxHz: number, txHz: number): {
  duplex: number;
  oddsplit: boolean;
  offsetSteps: number;
  splitHz?: number;
} {
  if (txHz === -1 || txHz === rxHz) return { duplex: 0, oddsplit: false, offsetSteps: 0 };
  const diff = txHz - rxHz;
  const steps = Math.abs(diff) / 50_000;
  if (Number.isInteger(steps) && steps >= 0 && steps <= 255) {
    return { duplex: diff < 0 ? 2 : 3, oddsplit: false, offsetSteps: steps };
  }
  return { duplex: 0, oddsplit: true, offsetSteps: 0, splitHz: txHz };
}

function decodeFreq(raw: Uint8Array, offset: number): number {
  const units = decodeBbcd3(raw, offset);
  return normalizeFractionalFreq(units * 10_000);
}

function encodeFreq(out: Uint8Array, offset: number, hz: number): void {
  const units = Math.trunc(hz / 10_000);
  let frac = hz % 10_000;
  let flags = 0;
  if (frac >= 5_000) {
    frac -= 5_000;
    flags |= 0x80;
  }
  if (frac >= 2_500) {
    frac -= 2_500;
    flags |= 0x40;
  }
  if (frac >= 1_250) flags |= 0x20;
  encodeBbcd3(out, offset, units);
  out[offset] |= flags;
}

function normalizeFractionalFreq(hz: number): number {
  if (hz > 8_000_000_000) hz = hz - 8_000_000_000 + 5_000;
  if (hz > 4_000_000_000) hz = hz - 4_000_000_000 + 2_500;
  if (hz > 2_000_000_000) hz = hz - 2_000_000_000 + 1_250;
  return hz;
}

function decodeBbcd3(raw: Uint8Array, offset: number): number {
  let value = 0;
  for (let i = 0; i < 3; i++) {
    const b = raw[offset + i];
    value = value * 100 + ((b >> 4) & 0x0f) * 10 + (b & 0x0f);
  }
  return value;
}

function encodeBbcd3(out: Uint8Array, offset: number, value: number): void {
  const digits = Math.max(0, Math.trunc(value)).toString().padStart(6, '0').slice(-6);
  for (let i = 0; i < 3; i++) {
    const hi = Number(digits[i * 2]);
    const lo = Number(digits[i * 2 + 1]);
    out[offset + i] = (hi << 4) | lo;
  }
}

function readName(raw: Uint8Array, model: RadioModel, index: number): string {
  const no = nameOffset(model, index);
  let out = '';
  for (let i = 0; i < model.memory.nameLength; i++) {
    const c = raw[no + i];
    if (c === NAME_END) break;
    out += CHARSET[c] ?? '?';
  }
  return out.trimEnd();
}

function writeName(out: Uint8Array, offset: number, length: number, name: string): void {
  for (let i = 0; i < length; i++) {
    const c = name[i];
    out[offset + i] = c ? Math.max(0, CHARSET.indexOf(c)) : NAME_END;
  }
}
