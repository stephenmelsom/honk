// Repeater entry model. The user types the way a repeater is published
// (output freq + offset direction + offset MHz + uplink tone) and we map it
// to the underlying Channel fields (rxHz, txHz, rxTone, txTone).

import type { Channel } from '../image/schema.ts';
import type { ToneSlot } from '../codec/tones.ts';

export type OffsetDirection = '+' | '-' | 'simplex';

export interface RepeaterInput {
  name: string;
  outputMhz: number;
  offsetDirection: OffsetDirection;
  offsetMhz: number;
  uplinkTone: ToneSlot;
  downlinkTone: ToneSlot;
  bandwidth: 'wide' | 'narrow';
  power: 'high' | 'low';
}

const blankFlags: Channel['rawFlags'] = {
  flagsByte0Other: 0,
  isUhf: 0,
  scode: 0,
  flagsByte1: 0,
  flagsByte2Other: 0,
  flagsByte3PttId: 0,
};

/** Default offset for a band, in MHz. Based on the US repeater band plan. */
export function defaultOffsetMhz(outputMhz: number): number {
  if (outputMhz >= 140 && outputMhz <= 180) return 0.6;   // 2m: 600 kHz
  if (outputMhz >= 220 && outputMhz <= 230) return 1.6;   // 1.25m
  if (outputMhz >= 400 && outputMhz <= 480) return 5.0;   // 70cm: 5 MHz
  if (outputMhz >= 902 && outputMhz <= 928) return 12.0;  // 33cm
  if (outputMhz >= 1240 && outputMhz <= 1300) return 20.0; // 23cm
  return 0;
}

/** Default offset direction. Most US 2m repeaters are minus below 147 MHz and plus above. */
export function defaultOffsetDirection(outputMhz: number): OffsetDirection {
  if (outputMhz >= 145.2 && outputMhz < 147.0) return '-';
  if (outputMhz >= 147.0 && outputMhz < 148.0) return '+';
  if (outputMhz >= 442.0 && outputMhz < 450.0) return '+'; // common UHF convention
  if (outputMhz >= 440.0 && outputMhz < 442.0) return '-';
  return '-';
}

export function buildRepeaterChannel(input: RepeaterInput): Channel {
  const rxHz = Math.round(input.outputMhz * 1_000_000);
  const offsetHz = Math.round(input.offsetMhz * 1_000_000);
  let txHz = rxHz;
  if (input.offsetDirection === '+') txHz = rxHz + offsetHz;
  else if (input.offsetDirection === '-') txHz = rxHz - offsetHz;

  return {
    rxHz,
    txHz,
    rxTone: input.downlinkTone,
    txTone: input.uplinkTone,
    name: input.name.slice(0, 7),
    power: input.power,
    bandwidth: input.bandwidth,
    scanAdd: true,
    busyLockout: false,
    rawFlags: blankFlags,
  };
}

/** Reverse direction: best-effort recovery of a RepeaterInput from a Channel. */
export function readRepeaterChannel(ch: Channel): RepeaterInput {
  const outputMhz = ch.rxHz / 1_000_000;
  const diffHz = ch.txHz - ch.rxHz;
  let offsetDirection: OffsetDirection = 'simplex';
  let offsetMhz = 0;
  if (ch.rxHz !== ch.txHz) {
    offsetDirection = diffHz > 0 ? '+' : '-';
    offsetMhz = Math.abs(diffHz) / 1_000_000;
  }
  return {
    name: ch.name,
    outputMhz,
    offsetDirection,
    offsetMhz,
    uplinkTone: ch.txTone,
    downlinkTone: ch.rxTone,
    bandwidth: ch.bandwidth,
    power: ch.power,
  };
}
