// Thin wrapper around a SerialPortLike that gives us byte-oriented read/write
// with a timeout, which is what the protocol layer wants.

import type { SerialPortLike } from './types.ts';

export class TimedPort {
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private buffer: Uint8Array = new Uint8Array(0);
  private port: SerialPortLike;

  constructor(port: SerialPortLike) {
    this.port = port;
  }

  async open(baudRate: number): Promise<void> {
    await this.port.open({ baudRate });
    if (!this.port.readable || !this.port.writable) {
      throw new Error('Serial port not readable/writable after open');
    }
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
  }

  async close(): Promise<void> {
    try {
      await this.reader?.cancel();
      this.reader?.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      await this.writer?.close();
      this.writer?.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      await this.port.close();
    } catch {
      /* ignore */
    }
  }

  async writeBytes(bytes: Uint8Array): Promise<void> {
    if (!this.writer) throw new Error('Port not open');
    await this.writer.write(bytes);
  }

  /** Read exactly `count` bytes (or throw on timeout / EOF). */
  async readExact(count: number, timeoutMs = 2000): Promise<Uint8Array> {
    const deadline = Date.now() + timeoutMs;
    while (this.buffer.length < count) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error(`timed out reading ${count} bytes`);
      const chunk = await this.readChunkWithTimeout(remaining);
      if (!chunk) throw new Error('serial stream closed');
      const merged = new Uint8Array(this.buffer.length + chunk.length);
      merged.set(this.buffer);
      merged.set(chunk, this.buffer.length);
      this.buffer = merged;
    }
    const out = this.buffer.slice(0, count);
    this.buffer = this.buffer.slice(count);
    return out;
  }

  private async readChunkWithTimeout(timeoutMs: number): Promise<Uint8Array | null> {
    if (!this.reader) throw new Error('Port not open');
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    const read = this.reader.read().then((r) => (r.done ? null : r.value));
    const result = await Promise.race([read, timeout]);
    if (timer) clearTimeout(timer);
    if (result === null) throw new Error('read timeout');
    return result;
  }
}
