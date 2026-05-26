// Display formatters: Hz <-> "146.520" string, tone slot -> "100.0 Hz" / "D023N".

import type { ToneSlot } from '../codec/tones.ts';

export function formatMhz(hz: number): string {
  if (!Number.isFinite(hz) || hz <= 0) return '';
  return (hz / 1_000_000).toFixed(4);
}

/** Parse a user-typed MHz string into Hz. Returns null when blank or invalid. */
export function parseMhz(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1_000_000);
}

export function formatTone(t: ToneSlot): string {
  switch (t.kind) {
    case 'none':
      return '—';
    case 'ctcss':
      return `${t.hz.toFixed(1)} Hz`;
    case 'dcs':
      return `D${String(t.code).padStart(3, '0')}${t.polarity}`;
  }
}

export function duplexDescription(rxHz: number, txHz: number): {
  kind: 'simplex' | 'plus' | 'minus' | 'split' | 'off';
  offsetMhz: number;
} {
  if (txHz === -1 || txHz === 0) return { kind: 'off', offsetMhz: 0 };
  if (txHz === rxHz) return { kind: 'simplex', offsetMhz: 0 };
  const diff = txHz - rxHz;
  const offsetMhz = Math.abs(diff) / 1_000_000;
  if (Math.abs(diff) > 70_000_000) return { kind: 'split', offsetMhz: txHz / 1_000_000 };
  return { kind: diff > 0 ? 'plus' : 'minus', offsetMhz };
}
