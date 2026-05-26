import { getNavigatorSerial } from './types.ts';

export function hasWebSerial(): boolean {
  return getNavigatorSerial() !== null;
}
