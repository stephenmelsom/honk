import type { Channel } from '../image/schema.ts';

export type ChannelSortKey = 'name' | 'rx';

export function compactChannels(channels: readonly (Channel | null)[]): (Channel | null)[] {
  const programmed = channels.filter((channel): channel is Channel => channel !== null);
  return padToLength(programmed, channels.length);
}

export function sortChannels(
  channels: readonly (Channel | null)[],
  sortKey: ChannelSortKey,
): (Channel | null)[] {
  const programmed = channels.filter((channel): channel is Channel => channel !== null);
  const sorted = programmed.toSorted((a, b) => compareChannels(a, b, sortKey));
  return padToLength(sorted, channels.length);
}

export function insertEmptySlot(
  channels: readonly (Channel | null)[],
  index: number,
): (Channel | null)[] {
  const next = channels.slice();
  next.splice(clampIndex(index, channels.length), 0, null);
  return next.slice(0, channels.length);
}

export function deleteSlot(
  channels: readonly (Channel | null)[],
  index: number,
): (Channel | null)[] {
  const next = channels.slice();
  next.splice(clampIndex(index, channels.length), 1);
  next.push(null);
  return next;
}

function compareChannels(a: Channel, b: Channel, sortKey: ChannelSortKey): number {
  if (sortKey === 'rx') {
    return a.rxHz - b.rxHz || compareNames(a, b);
  }
  return compareNames(a, b) || a.rxHz - b.rxHz;
}

function compareNames(a: Channel, b: Channel): number {
  const aName = a.name.trim() || '\uffff';
  const bName = b.name.trim() || '\uffff';
  return aName.localeCompare(bName, undefined, { sensitivity: 'base', numeric: true });
}

function padToLength(
  programmed: readonly Channel[],
  length: number,
): (Channel | null)[] {
  return [...programmed, ...Array<null>(Math.max(0, length - programmed.length)).fill(null)];
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, Math.trunc(index)));
}
