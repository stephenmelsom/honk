import type { RadioModel } from './types.ts';

export function channelOffset(model: RadioModel, index: number): number {
  if (index < 0 || index >= model.channelCount) {
    throw new RangeError(`channel ${index} out of range`);
  }
  return model.memory.offsets.channels + index * model.memory.channelBytes;
}

export function nameOffset(model: RadioModel, index: number): number {
  if (index < 0 || index >= model.channelCount) {
    throw new RangeError(`name ${index} out of range`);
  }
  return model.memory.offsets.names + index * model.memory.nameBytes;
}

export function isFreqInBands(hz: number, model: RadioModel): boolean {
  const { vhf, uhf } = model.frequencyLimits;
  if (vhf && hz >= vhf[0] && hz <= vhf[1]) return true;
  if (uhf && hz >= uhf[0] && hz <= uhf[1]) return true;
  return false;
}
