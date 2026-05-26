import { lbcdEncode, writeErasedFreq } from '../codec/lbcd.ts';
import { encodeToneWord } from '../codec/tones.ts';
import {
  CHANNEL_COUNT,
  CHANNEL_LAYOUT,
  IMAGE_SIZE,
  NAME_BYTES,
  NAME_LENGTH,
  OFFSETS,
  channelOffset,
  nameOffset,
} from './layout.ts';
import type { Channel, RadioImage } from './schema.ts';

export function serializeImage(img: RadioImage): Uint8Array {
  if (img.raw.length !== IMAGE_SIZE) {
    throw new Error(`raw buffer must be ${IMAGE_SIZE} bytes`);
  }
  if (img.channels.length !== CHANNEL_COUNT) {
    throw new Error(`expected ${CHANNEL_COUNT} channels`);
  }

  const out = new Uint8Array(img.raw);
  // Write the ident header back from the source (verbatim).
  out.set(img.ident.subarray(0, 8), OFFSETS.ident);

  for (let i = 0; i < CHANNEL_COUNT; i++) {
    writeChannel(out, i, img.channels[i]);
  }
  return out;
}

function writeChannel(out: Uint8Array, index: number, ch: Channel | null): void {
  const co = channelOffset(index);
  const no = nameOffset(index);

  if (ch === null) {
    // CHIRP empties the 16 channel bytes and the 16 name bytes to 0xff.
    for (let i = 0; i < 16; i++) out[co + i] = 0xff;
    for (let i = 0; i < NAME_BYTES; i++) out[no + i] = 0xff;
    return;
  }

  // Frequencies: stored as 10 Hz units in LBCD.
  out.set(lbcdEncode(Math.round(ch.rxHz / 10)), co + CHANNEL_LAYOUT.rxfreq.offset);
  if (ch.txHz === ch.rxHz) {
    out.set(lbcdEncode(Math.round(ch.txHz / 10)), co + CHANNEL_LAYOUT.txfreq.offset);
  } else if (ch.txHz === -1) {
    // Sentinel for TX-disabled ("off" duplex in CHIRP).
    writeErasedFreq(out, co + CHANNEL_LAYOUT.txfreq.offset);
  } else {
    out.set(lbcdEncode(Math.round(ch.txHz / 10)), co + CHANNEL_LAYOUT.txfreq.offset);
  }

  const rxToneWord = encodeToneWord(ch.rxTone);
  const txToneWord = encodeToneWord(ch.txTone);
  out[co + CHANNEL_LAYOUT.rxtone.offset] = rxToneWord & 0xff;
  out[co + CHANNEL_LAYOUT.rxtone.offset + 1] = (rxToneWord >> 8) & 0xff;
  out[co + CHANNEL_LAYOUT.txtone.offset] = txToneWord & 0xff;
  out[co + CHANNEL_LAYOUT.txtone.offset + 1] = (txToneWord >> 8) & 0xff;

  // Flag bytes — combine preserved bits with our fields.
  // b0: unused1:3, isuhf:1, scode:4
  const b0 =
    (ch.rawFlags.flagsByte0Other & 0xe0) |
    ((ch.rawFlags.isUhf & 0x01) << 4) |
    (ch.rawFlags.scode & 0x0f);
  out[co + CHANNEL_LAYOUT.flagsByte0] = b0;

  // b1: preserved verbatim (txtoneicon is display-only).
  out[co + CHANNEL_LAYOUT.flagsByte1] = ch.rawFlags.flagsByte1;

  // b2: mailicon:3, unknown2:3, lowpower:2
  const lowpower = ch.power === 'high' ? 0 : 1;
  const b2 = (ch.rawFlags.flagsByte2Other & 0xfc) | (lowpower & 0x03);
  out[co + CHANNEL_LAYOUT.flagsByte2] = b2;

  // b3: unknown3:1, wide:1, unknown4:2, bcl:1, scan:1, pttid:2
  // unknown3 and unknown4 bits are not preserved from the source byte; CHIRP
  // emits zero for them on writes (uv5r.py `_mem.set_raw("\x00" * 16)` before
  // populating fields), so we do the same.
  const b3 =
    ((ch.bandwidth === 'wide' ? 1 : 0) << 6) |
    ((ch.busyLockout ? 1 : 0) << 3) |
    ((ch.scanAdd ? 1 : 0) << 2) |
    (ch.rawFlags.flagsByte3PttId & 0x03);
  out[co + CHANNEL_LAYOUT.flagsByte3] = b3;

  // Name: 7 ASCII bytes, pad right with 0xFF.
  for (let i = 0; i < NAME_LENGTH; i++) {
    const c = ch.name.charCodeAt(i);
    out[no + i] = i < ch.name.length && Number.isFinite(c) ? c & 0x7f : 0xff;
  }
  // Padding bytes 7..15 preserved from raw (CHIRP leaves them untouched).
}
