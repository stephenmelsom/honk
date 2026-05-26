// LBCD = little-endian packed BCD as used by CHIRP for Baofeng frequencies.
// 4 bytes encode 8 decimal digits. Within each byte the high nibble holds the
// higher-order digit of the pair (standard BCD); across bytes the LOW byte
// holds the LEAST significant pair, i.e. little-endian byte order.
//
// Frequencies are stored in 10 Hz units, so 146.520 MHz = 14_652_000.

export function lbcdEncode(value: number, byteCount = 4): Uint8Array {
  const out = new Uint8Array(byteCount);
  let v = Math.max(0, Math.trunc(value));
  for (let i = 0; i < byteCount; i++) {
    const twoDigits = v % 100;
    v = Math.floor(v / 100);
    const high = Math.floor(twoDigits / 10);
    const low = twoDigits % 10;
    out[i] = (high << 4) | low;
  }
  return out;
}

export function lbcdDecode(bytes: Uint8Array, offset = 0, byteCount = 4): number {
  let val = 0;
  for (let i = byteCount - 1; i >= 0; i--) {
    const b = bytes[offset + i];
    const high = (b >> 4) & 0x0f;
    const low = b & 0x0f;
    // Bad BCD (e.g. 0xFF) yields a corrupt number; callers should check for
    // the all-0xFF sentinel before decoding.
    val = val * 100 + high * 10 + low;
  }
  return val;
}

// 0xFFFFFFFF is the empty/erased marker used by CHIRP/Baofeng.
export function isErasedFreq(bytes: Uint8Array, offset = 0): boolean {
  for (let i = 0; i < 4; i++) if (bytes[offset + i] !== 0xff) return false;
  return true;
}

export function writeErasedFreq(bytes: Uint8Array, offset = 0): void {
  for (let i = 0; i < 4; i++) bytes[offset + i] = 0xff;
}

/** MHz <-> raw 10Hz units. */
export const mhzToRaw = (mhz: number): number => Math.round(mhz * 100_000);
export const rawToMhz = (raw: number): number => raw / 100_000;
