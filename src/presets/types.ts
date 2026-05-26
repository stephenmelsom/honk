// Preset pack schema: a small library of well-known channels (NOAA, FRS,
// GMRS, MURS, ham simplex) the user can drop in with one click.

import type { ToneSlot } from '../codec/tones.ts';
import type { Channel } from '../image/schema.ts';

export interface PresetChannel {
  name: string;
  rxMhz: number;
  txMhz?: number; // omit for simplex (= rxMhz)
  txTone?: ToneSlot;
  rxTone?: ToneSlot;
  bandwidth?: 'wide' | 'narrow';
  power?: 'high' | 'low';
  /** When true, the user can't change bandwidth/power (e.g. FRS narrow + low). */
  locked?: boolean;
}

export interface PresetPack {
  id: string;
  name: string;
  description: string;
  regulatory?: 'FRS' | 'GMRS' | 'MURS' | 'NOAA' | 'ham';
  channels: PresetChannel[];
}

const blankFlags: Channel['rawFlags'] = {
  flagsByte0Other: 0,
  isUhf: 0,
  scode: 0,
  flagsByte1: 0,
  flagsByte2Other: 0,
  flagsByte3PttId: 0,
};

export function presetToChannel(p: PresetChannel): Channel {
  const rxHz = Math.round(p.rxMhz * 1_000_000);
  const txHz = p.txMhz ? Math.round(p.txMhz * 1_000_000) : rxHz;
  return {
    rxHz,
    txHz,
    rxTone: p.rxTone ?? { kind: 'none' },
    txTone: p.txTone ?? { kind: 'none' },
    name: p.name.slice(0, 7),
    power: p.power ?? 'high',
    bandwidth: p.bandwidth ?? 'wide',
    scanAdd: true,
    busyLockout: false,
    rawFlags: blankFlags,
  };
}
