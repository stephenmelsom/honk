// Build a synthetic image buffer that resembles a real CHIRP-exported .img:
// the radio's ident bytes, all-0xFF body (the "erased" pattern Baofeng radios
// use for empty slots), then specific channels written in by serialize.ts on
// demand. Used by tests to avoid requiring a hardware-exported fixture.

import type { RadioModel } from '../radios/types.ts';
import { writeDefaultSettings } from './settings.ts';

export function emptyImageBuffer(model: RadioModel): Uint8Array {
  const buf = new Uint8Array(model.imageSize);
  buf.fill(0xff);
  buf.set(model.expectedIdent, model.memory.offsets.ident);
  writeDefaultSettings(buf, model);
  return buf;
}
