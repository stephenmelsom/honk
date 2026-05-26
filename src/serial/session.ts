// High-level "read the radio" / "write the radio" orchestrators used by the UI.

import type { RadioModel } from '../radios/types.ts';
import { TimedPort } from './port.ts';
import { downloadImage, uploadImage } from './protocol.ts';
import type { SerialPortLike } from './types.ts';
import { getNavigatorSerial } from './types.ts';

export type ProgressCb = (fraction: number) => void;

export async function readFromRadio(
  model: RadioModel,
  progress?: ProgressCb,
  portOverride?: SerialPortLike,
): Promise<Uint8Array> {
  const port = portOverride ?? (await requestPort());
  const timed = new TimedPort(port);
  await timed.open(model.serial.baud);
  try {
    return await downloadImage(timed, model, (done, total) => progress?.(done / total));
  } finally {
    await timed.close();
  }
}

export async function writeToRadio(
  model: RadioModel,
  image: Uint8Array,
  progress?: ProgressCb,
  portOverride?: SerialPortLike,
): Promise<void> {
  const port = portOverride ?? (await requestPort());
  const timed = new TimedPort(port);
  await timed.open(model.serial.baud);
  try {
    await uploadImage(timed, model, image, (done, total) => progress?.(done / total));
  } finally {
    await timed.close();
  }
}

async function requestPort(): Promise<SerialPortLike> {
  const serial = getNavigatorSerial();
  if (!serial) throw new Error('Web Serial API not supported in this browser');
  return serial.requestPort();
}
