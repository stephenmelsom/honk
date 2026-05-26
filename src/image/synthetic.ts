// Build a synthetic image buffer that resembles a real CHIRP-exported .img:
// 8-byte ident, all-0xFF body (the "erased" pattern Baofeng radios use for
// empty slots), then specific channels written in by serialize.ts on demand.
// Used by tests to avoid requiring a hardware-exported fixture.

import { IMAGE_SIZE, OFFSETS } from './layout.ts';

export function emptyImageBuffer(): Uint8Array {
  const buf = new Uint8Array(IMAGE_SIZE);
  buf.fill(0xff);
  // Ident header: pick the UV-82 ident bytes that CHIRP records.
  // Any 8 bytes here are fine for round-trip tests; using a recognizable
  // pattern makes debugging easier.
  const ident = new Uint8Array([0x50, 0xbb, 0xff, 0x20, 0x13, 0x01, 0x05, 0xdd]);
  buf.set(ident, OFFSETS.ident);
  return buf;
}
