import { describe, expect, it } from 'vitest';
import type { Channel } from '../image/schema.ts';
import { compactChannels, deleteSlot, insertEmptySlot, sortChannels } from './organize.ts';

function channel(name: string, rxHz: number): Channel {
  return {
    name,
    rxHz,
    txHz: rxHz,
    rxTone: { kind: 'none' },
    txTone: { kind: 'none' },
    power: 'high',
    bandwidth: 'wide',
    scanAdd: true,
    busyLockout: false,
    rawFlags: {
      flagsByte0Other: 0,
      isUhf: 0,
      scode: 0,
      flagsByte1: 0,
      flagsByte2Other: 0,
      flagsByte3PttId: 0,
    },
  };
}

describe('channel organization', () => {
  it('compacts programmed channels without changing their order', () => {
    const a = channel('A', 146_520_000);
    const b = channel('B', 462_562_500);

    expect(compactChannels([null, a, null, b, null])).toEqual([a, b, null, null, null]);
  });

  it('sorts programmed channels and leaves empty slots at the end', () => {
    const noName = channel('', 147_000_000);
    const repeater = channel('Repeater 2', 146_940_000);
    const call = channel('Call', 146_520_000);

    expect(sortChannels([noName, null, repeater, call], 'name')).toEqual([
      call,
      repeater,
      noName,
      null,
    ]);
    expect(sortChannels([noName, null, repeater, call], 'rx')).toEqual([
      call,
      repeater,
      noName,
      null,
    ]);
  });

  it('inserts an empty slot by shifting later slots down and dropping the last slot', () => {
    const a = channel('A', 1);
    const b = channel('B', 2);
    const c = channel('C', 3);

    expect(insertEmptySlot([a, b, c], 1)).toEqual([a, null, b]);
  });

  it('deletes a slot by shifting later slots up and appending an empty slot', () => {
    const a = channel('A', 1);
    const b = channel('B', 2);
    const c = channel('C', 3);

    expect(deleteSlot([a, b, c], 1)).toEqual([a, c, null]);
  });
});
