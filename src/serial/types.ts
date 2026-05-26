// Minimal subset of the Web Serial types we use, so we don't need a separate
// @types package and so `mock.ts` can implement the interface for tests.

export interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
}

export interface SerialLike {
  requestPort(options?: object): Promise<SerialPortLike>;
}

export function getNavigatorSerial(): SerialLike | null {
  // Web Serial is only available in Chromium-family browsers over HTTPS or
  // localhost. Firefox / Safari return undefined.
  if (typeof navigator === 'undefined') return null;
  const n = navigator as unknown as { serial?: SerialLike };
  return n.serial ?? null;
}
