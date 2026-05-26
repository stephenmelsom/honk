// Lightweight CSV import. Supports CHIRP and RepeaterBook export formats by
// matching on column header names. Anything we can't recognize is skipped.

import type { Channel } from '../image/schema.ts';
import { buildRepeaterChannel } from './repeater.ts';
import type { ToneSlot } from '../codec/tones.ts';

export interface CsvImportResult {
  channels: Channel[];
  skipped: { row: number; reason: string }[];
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === ',') {
        out.push(cur);
        cur = '';
      } else if (c === '"') {
        inQuotes = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

function parseTone(input: string | undefined): ToneSlot {
  if (!input) return { kind: 'none' };
  const trimmed = input.trim();
  if (!trimmed || trimmed === '0' || /^none$/i.test(trimmed)) return { kind: 'none' };
  // CTCSS: "100.0" or "100"
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const hz = Number(trimmed);
    if (hz >= 60) return { kind: 'ctcss', hz };
  }
  // DCS: "D023N", "023N", "23"
  const m = trimmed.match(/^D?0?(\d{2,3})([NR])?$/i);
  if (m) {
    return { kind: 'dcs', code: Number(m[1]), polarity: (m[2]?.toUpperCase() as 'N' | 'R') ?? 'N' };
  }
  return { kind: 'none' };
}

function parseDuplex(s: string | undefined): '+' | '-' | 'simplex' {
  const t = (s ?? '').trim();
  if (t === '+') return '+';
  if (t === '-') return '-';
  return 'simplex';
}

export function parseCsv(text: string): CsvImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { channels: [], skipped: [] };

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const nameCol = col('name');
  const freqCol = col('frequency', 'freq', 'output frequency', 'output');
  const duplexCol = col('duplex');
  const offsetCol = col('offset');
  // CHIRP convention: the "Tone" column holds the mode (Tone/TSQL/DTCS/etc.),
  // and "rToneFreq" / "cToneFreq" hold the actual Hz values.
  const tmodeCol = col('tmode', 'tone mode', 'tone');
  const rtoneCol = col('rtonefreq', 'r-tone-freq', 'rtone', 'uplink tone');
  const ctoneCol = col('ctonefreq', 'c-tone-freq', 'ctone', 'downlink tone');
  const dtcsCol = col('dtcscode', 'dtcs code', 'dtcs');
  const modeCol = col('mode');

  const channels: Channel[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const freqStr = cells[freqCol];
    const outputMhz = Number(freqStr);
    if (!Number.isFinite(outputMhz) || outputMhz <= 0) {
      skipped.push({ row: i, reason: `bad frequency "${freqStr}"` });
      continue;
    }
    const tmode = (cells[tmodeCol] ?? '').trim();
    const rtone = parseTone(cells[rtoneCol]);
    const ctone = parseTone(cells[ctoneCol]);
    const dtcs = parseTone(cells[dtcsCol]);

    let uplinkTone: ToneSlot = { kind: 'none' };
    let downlinkTone: ToneSlot = { kind: 'none' };
    if (/^Tone$/i.test(tmode)) uplinkTone = rtone;
    else if (/^TSQL$/i.test(tmode)) {
      uplinkTone = ctone.kind === 'none' ? rtone : ctone;
      downlinkTone = uplinkTone;
    } else if (/^DTCS$/i.test(tmode)) {
      uplinkTone = dtcs;
      downlinkTone = dtcs;
    }

    const offsetMhz = Number(cells[offsetCol]) || 0;
    const ch = buildRepeaterChannel({
      name: (cells[nameCol] ?? '').slice(0, 7),
      outputMhz,
      offsetDirection: parseDuplex(cells[duplexCol]),
      offsetMhz,
      uplinkTone,
      downlinkTone,
      bandwidth: /NFM/i.test(cells[modeCol] ?? '') ? 'narrow' : 'wide',
      power: 'high',
    });
    channels.push(ch);
  }

  return { channels, skipped };
}
