import { describe, it, expect } from 'vitest';
import { buildRepeaterChannel, readRepeaterChannel } from './repeater.ts';

describe('repeater builder', () => {
  it('builds a 2m minus-offset repeater', () => {
    const ch = buildRepeaterChannel({
      name: 'W7TEST',
      outputMhz: 146.84,
      offsetDirection: '-',
      offsetMhz: 0.6,
      uplinkTone: { kind: 'ctcss', hz: 100.0 },
      downlinkTone: { kind: 'none' },
      bandwidth: 'wide',
      power: 'high',
    });
    expect(ch.rxHz).toBe(146_840_000);
    expect(ch.txHz).toBe(146_240_000);
    expect(ch.txTone).toEqual({ kind: 'ctcss', hz: 100.0 });
    expect(ch.rxTone).toEqual({ kind: 'none' });
    expect(ch.name).toBe('W7TEST');
  });

  it('builds a 70cm plus-offset repeater', () => {
    const ch = buildRepeaterChannel({
      name: 'K7UHF',
      outputMhz: 442.1,
      offsetDirection: '+',
      offsetMhz: 5.0,
      uplinkTone: { kind: 'ctcss', hz: 88.5 },
      downlinkTone: { kind: 'none' },
      bandwidth: 'wide',
      power: 'high',
    });
    expect(ch.rxHz).toBe(442_100_000);
    expect(ch.txHz).toBe(447_100_000);
  });

  it('round-trips through readRepeaterChannel', () => {
    const input = {
      name: 'RT',
      outputMhz: 147.32,
      offsetDirection: '+' as const,
      offsetMhz: 0.6,
      uplinkTone: { kind: 'ctcss' as const, hz: 123.0 },
      downlinkTone: { kind: 'none' as const },
      bandwidth: 'narrow' as const,
      power: 'low' as const,
    };
    const ch = buildRepeaterChannel(input);
    const read = readRepeaterChannel(ch);
    expect(read.outputMhz).toBeCloseTo(input.outputMhz, 4);
    expect(read.offsetDirection).toBe('+');
    expect(read.offsetMhz).toBeCloseTo(0.6, 3);
    expect(read.uplinkTone).toEqual(input.uplinkTone);
  });
});
