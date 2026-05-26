import type { ToneSlot } from '../codec/tones.ts';

export type PowerLevel = 'high' | 'low';
export type Bandwidth = 'wide' | 'narrow';
export type TuningStepKhz = 2.5 | 5 | 6.25 | 10 | 12.5 | 20 | 25 | 50;
export type BatterySaver = 'off' | '1:1' | '1:2' | '1:3' | '1:4';
export type VoiceMode = 'off' | 'english' | 'chinese';
export type ScanResume = 'to' | 'co' | 'se';
export type DisplayMode = 'channel' | 'name' | 'frequency';
export type LedColor = 'off' | 'blue' | 'orange' | 'purple';
export type AlarmMode = 'site' | 'tone' | 'code';

export interface RadioSettings {
  squelch: number;
  stepKhz: TuningStepKhz;
  batterySaver: BatterySaver;
  vox: number;
  backlightSeconds: number;
  dualWatch: boolean;
  beep: boolean;
  timeoutSeconds: number | null;
  voice: VoiceMode;
  scanResume: ScanResume;
  displayModeA: DisplayMode;
  displayModeB: DisplayMode;
  busyChannelLockout: boolean;
  automaticKeyLock: boolean;
  broadcastFmRadio: boolean;
  standbyLed: LedColor;
  rxLed: LedColor;
  txLed: LedColor;
  alarmMode: AlarmMode;
}

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
  /** Identifies which radio model this image is for (matches a key in the RADIOS registry). */
  radioId: string;
  /** Ident header bytes from the radio's clone handshake. Length = model.memory.identHeaderSize. */
  ident: Uint8Array;
  /** Channel slots; null = empty/erased. Length = model.channelCount. */
  channels: (Channel | null)[];
  /** Common radio-wide settings decoded from the model's settings block. */
  settings: RadioSettings;
  /** Everything else (settings, VFO, ANI, firmware msg, etc.) preserved verbatim. */
  raw: Uint8Array; // length = model.imageSize
}

export const EMPTY_CHANNEL_MARKER = 0xff;
