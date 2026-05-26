import type { RadioModel } from './types.ts';
import { UV5R } from './uv5r.ts';
import { UV6 } from './uv6.ts';
import { UV82 } from './uv82.ts';
import { UV82HP } from './uv82hp.ts';
import { UV82L } from './uv82l.ts';

export const RADIOS: Readonly<Record<string, RadioModel>> = {
  [UV5R.id]: UV5R,
  [UV6.id]: UV6,
  [UV82.id]: UV82,
  [UV82HP.id]: UV82HP,
  [UV82L.id]: UV82L,
};

export const DEFAULT_RADIO_ID = UV82L.id;

export function getRadio(id: string): RadioModel {
  const m = RADIOS[id];
  if (!m) throw new Error(`Unknown radio id: ${id}`);
  return m;
}

export function listRadios(): RadioModel[] {
  return Object.values(RADIOS);
}

export function detectRadioFromImage(bytes: Uint8Array, preferred?: RadioModel): RadioModel | null {
  const radios = preferred ? [preferred, ...listRadios().filter((r) => r !== preferred)] : listRadios();
  return radios.find((radio) => {
    if (bytes.length !== radio.imageSize) return false;
    const ident = radio.memory.offsets.ident;
    const identHeaderSize = radio.memory.identHeaderSize;
    return radio.identMatches(bytes.subarray(ident, ident + identHeaderSize));
  }) ?? null;
}

export { UV5R } from './uv5r.ts';
export { UV6 } from './uv6.ts';
export { UV82 } from './uv82.ts';
export { UV82HP } from './uv82hp.ts';
export { UV82L } from './uv82l.ts';
export type { RadioModel, MemoryLayout, ChannelBitLayout, FrequencyLimits, SerialProtocolSpec } from './types.ts';
