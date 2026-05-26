import type { ToneSlot } from '../codec/tones.ts';

export type PowerLevel = 'high' | 'low';
export type Bandwidth = 'wide' | 'narrow';

export interface Channel {
  /** Receive frequency in Hz. */
  rxHz: number;
  /** Transmit frequency in Hz. Equal to rxHz for simplex. */
  txHz: number;
  /** Receive squelch tone (what the radio listens for). */
  rxTone: ToneSlot;
  /** Transmit tone (what the radio sends). */
  txTone: ToneSlot;
  name: string;
  power: PowerLevel;
  bandwidth: Bandwidth;
  /** Include in scan when true. */
  scanAdd: boolean;
  /** Busy channel lockout. */
  busyLockout: boolean;
  /** Raw remaining flag bits we round-trip without interpreting. */
  rawFlags: {
    flagsByte0Other: number; // unused1:3 + isuhf:1 + scode:4 (we preserve isuhf and scode)
    isUhf: number;
    scode: number;
    flagsByte1: number;
    flagsByte2Other: number;
    flagsByte3PttId: number;
  };
}

export interface RadioImage {
  /** 8-byte ident from the radio's clone handshake. */
  ident: Uint8Array;
  channels: (Channel | null)[]; // 128 entries; null = empty/erased slot
  /** Everything else (settings, VFO, ANI, firmware msg, etc.) preserved verbatim. */
  raw: Uint8Array; // length = IMAGE_SIZE
}

export const EMPTY_CHANNEL_MARKER = 0xff;
