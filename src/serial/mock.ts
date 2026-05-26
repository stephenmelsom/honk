// In-memory fake port that speaks the UV-82 protocol back to us. Used by
// tests so we can exercise downloadImage/uploadImage without hardware.

import type { SerialPortLike } from './types.ts';
import { IDENT_HEADER_SIZE, IMAGE_SIZE } from '../image/layout.ts';
import { UV82_MAGIC } from './protocol.ts';

const ACK = 0x06;

export class FakeRadioPort implements SerialPortLike {
  private toClient: Uint8Array = new Uint8Array(0);
  private toRadio: Uint8Array = new Uint8Array(0);
  private state: 'idle' | 'awaitingMagicEnd' | 'awaitingPostMagicAck' | 'idented' = 'idle';
  private magicReceived = 0;
  private opened = false;

  readable: ReadableStream<Uint8Array> | null = null;
  writable: WritableStream<Uint8Array> | null = null;
  memory: Uint8Array;

  constructor(memory: Uint8Array) {
    if (memory.length !== IMAGE_SIZE) throw new Error('memory must be 0x1808 bytes');
    this.memory = memory;
  }

  open(): Promise<void> {
    this.opened = true;
    this.readable = new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        while (this.opened && this.toClient.length === 0) {
          await new Promise((r) => setTimeout(r, 5));
        }
        if (!this.opened) {
          controller.close();
          return;
        }
        const chunk = this.toClient;
        this.toClient = new Uint8Array(0);
        controller.enqueue(chunk);
      },
    });
    this.writable = new WritableStream<Uint8Array>({
      write: (chunk) => {
        this.handleFromClient(chunk);
      },
    });
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.opened = false;
    return Promise.resolve();
  }

  private emit(bytes: Uint8Array | number[]): void {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const merged = new Uint8Array(this.toClient.length + arr.length);
    merged.set(this.toClient);
    merged.set(arr, this.toClient.length);
    this.toClient = merged;
  }

  private handleFromClient(chunk: Uint8Array): void {
    const merged = new Uint8Array(this.toRadio.length + chunk.length);
    merged.set(this.toRadio);
    merged.set(chunk, this.toRadio.length);
    this.toRadio = merged;
    this.processBuffer();
  }

  private processBuffer(): void {
    while (this.toRadio.length > 0) {
      if (this.state === 'idle') {
        // Reading magic byte-by-byte.
        if (this.toRadio[0] === UV82_MAGIC[this.magicReceived]) {
          this.magicReceived++;
          this.toRadio = this.toRadio.slice(1);
          if (this.magicReceived === UV82_MAGIC.length) {
            this.emit([ACK]);
            this.state = 'awaitingMagicEnd';
          }
        } else {
          this.toRadio = this.toRadio.slice(1);
          this.magicReceived = 0;
        }
      } else if (this.state === 'awaitingMagicEnd') {
        // Expecting 0x02 then we respond with 8-byte ident ending in 0xDD.
        if (this.toRadio[0] === 0x02) {
          this.toRadio = this.toRadio.slice(1);
          const ident = new Uint8Array([0x50, 0xbb, 0xff, 0x20, 0x13, 0x01, 0x05, 0xdd]);
          // Mirror what a real radio sends back; honk uses this as the ident header.
          this.memory.set(ident, 0); // ensure mock memory ident matches
          this.emit(ident);
          this.state = 'awaitingPostMagicAck';
        } else {
          this.toRadio = this.toRadio.slice(1);
        }
      } else if (this.state === 'awaitingPostMagicAck') {
        if (this.toRadio[0] === ACK) {
          this.toRadio = this.toRadio.slice(1);
          this.emit([ACK]);
          this.state = 'idented';
        } else {
          this.toRadio = this.toRadio.slice(1);
        }
      } else if (this.state === 'idented') {
        // Read or write commands. Need at least 4 bytes.
        if (this.toRadio.length < 4) return;
        const cmd = this.toRadio[0];
        const addr = (this.toRadio[1] << 8) | this.toRadio[2];
        const size = this.toRadio[3];
        if (cmd === 'S'.charCodeAt(0)) {
          this.toRadio = this.toRadio.slice(4);
          // Reply: 'X' + addr_be + size + payload. `addr` here is a *radio*
          // address; we translate to file offset by adding the 8-byte ident.
          const fileOffset = addr + IDENT_HEADER_SIZE;
          const reply = new Uint8Array(4 + size);
          reply[0] = 'X'.charCodeAt(0);
          reply[1] = (addr >> 8) & 0xff;
          reply[2] = addr & 0xff;
          reply[3] = size;
          reply.set(this.memory.subarray(fileOffset, fileOffset + size), 4);
          this.emit(reply);
        } else if (cmd === 'X'.charCodeAt(0)) {
          if (this.toRadio.length < 4 + size) return;
          const payload = this.toRadio.slice(4, 4 + size);
          this.toRadio = this.toRadio.slice(4 + size);
          this.memory.set(payload, addr + IDENT_HEADER_SIZE);
          this.emit([ACK]);
        } else if (cmd === ACK) {
          // Client ACK after a block read. The real radio responds with its
          // own ACK; the client's `_read_block` reads it at the start of the
          // next iteration (first_command=False path).
          this.toRadio = this.toRadio.slice(1);
          this.emit([ACK]);
        } else {
          // Unknown — drop and hope.
          this.toRadio = this.toRadio.slice(1);
        }
      }
    }
  }

  /** Re-seed the mock memory's ident header so it matches what the client expects. */
  static withImage(image: Uint8Array): FakeRadioPort {
    const mem = new Uint8Array(image);
    // Ensure the ident header looks right for the UV-82.
    mem.set([0x50, 0xbb, 0xff, 0x20, 0x13, 0x01, 0x05, 0xdd], 0);
    return new FakeRadioPort(mem);
  }

  /** Reset state so the same instance can be reused for upload after download. */
  resetSession(): void {
    this.state = 'idle';
    this.magicReceived = 0;
    this.toClient = new Uint8Array(0);
    this.toRadio = new Uint8Array(0);
  }
}

