// Memory map for the Baofeng UV-82(L) image file as used by CHIRP. All offsets
// are within the saved .img file, which begins with an 8-byte ident header
// (read from the radio during the clone handshake) followed by the raw memory
// dump. CHIRP places channels at file offset 0x0008 — i.e. immediately after
// the ident — so the offsets here include that 8-byte header.

export const IMAGE_SIZE = 0x1808;          // 6152 bytes total
export const IDENT_HEADER_SIZE = 0x0008;   // 8-byte ident prefix
export const CHANNEL_COUNT = 128;
export const CHANNEL_BYTES = 16;

export const OFFSETS = {
  ident: 0x0000,
  channels: 0x0008,        // memory[128] @ 16 bytes each = 0x0800
  pttid: 0x0B08,
  ani: 0x0C88,
  settings: 0x0E28,
  wmchannel: 0x0E7E,
  vfoa: 0x0F10,
  vfob: 0x0F30,
  fmPresets: 0x0F56,
  names: 0x1008,           // names[128] @ 16 bytes each = 0x0800
  sixPowerOnMsg: 0x1818,
  firmwareMsg: 0x1838,
} as const;

export const NAME_BYTES = 16;   // 7-byte name + 9 padding bytes per entry
export const NAME_LENGTH = 7;   // visible name characters

// Per-channel byte layout within a 16-byte channel record.
export const CHANNEL_LAYOUT = {
  rxfreq: { offset: 0, length: 4 },
  txfreq: { offset: 4, length: 4 },
  rxtone: { offset: 8, length: 2 },
  txtone: { offset: 10, length: 2 },
  flagsByte0: 12, // unused1:3, isuhf:1, scode:4
  flagsByte1: 13, // unknown1:7, txtoneicon:1
  flagsByte2: 14, // mailicon:3, unknown2:3, lowpower:2
  flagsByte3: 15, // unknown3:1, wide:1, unknown4:2, bcl:1, scan:1, pttid:2
} as const;

export function channelOffset(index: number): number {
  if (index < 0 || index >= CHANNEL_COUNT) throw new RangeError(`channel ${index} out of range`);
  return OFFSETS.channels + index * CHANNEL_BYTES;
}

export function nameOffset(index: number): number {
  if (index < 0 || index >= CHANNEL_COUNT) throw new RangeError(`name ${index} out of range`);
  return OFFSETS.names + index * NAME_BYTES;
}
