// UV-82 clone-mode protocol implementation, ported from chirp/drivers/uv5r.py.
//
// Handshake:
//   1. Slowly send a 7-byte "magic" (one byte every 10 ms).
//   2. Read 1 byte ACK; must be 0x06.
//   3. Send 0x02.
//   4. Read bytes one at a time until 0xDD; expect total length 8 or 12.
//      (The 12-byte case is reduced to 8 by dropping bytes 1, 2, 4, 6.)
//   5. Send 0x06; read 0x06 ACK.
//
// Block read (`S` command):
//   send: 'S' + uint16_be(addr) + uint8(len)
//   recv: 'X' + uint16_be(addr) + uint8(len) + payload
//   then send 0x06 ACK.
//
// Block write (`X` command):
//   send: 'X' + uint16_be(addr) + uint8(len) + payload
//   recv: 0x06 ACK.
//
// Address mapping: the radio addresses its own memory from 0x0000 to 0x17FF
// (0x1800 bytes). The saved image file prepends the 8-byte clone-ident header,
// so radio address X maps to file offset X + 8. CHIRP reads in 0x40-byte
// blocks but writes in 0x10-byte blocks, and skips two factory-locked windows
// during writes.

import type { TimedPort } from './port.ts';
import { IMAGE_SIZE, IDENT_HEADER_SIZE } from '../image/layout.ts';

export const UV82_MAGIC = new Uint8Array([0x50, 0xbb, 0xff, 0x20, 0x13, 0x01, 0x05]);
export const BAUD = 9600;
export const READ_BLOCK_SIZE = 0x40;
export const WRITE_BLOCK_SIZE = 0x10;
export const RADIO_MAIN_SIZE = 0x1800; // 0x0000..0x17FF on the radio side

// File-offset ranges that get written to the radio. Anything outside these is
// left untouched on the radio. Matches CHIRP's _ranges_main_default for UV-5R.
const WRITE_RANGES_FILE: ReadonlyArray<readonly [number, number]> = [
  [0x0008, 0x0cf8],
  [0x0d08, 0x0df8],
  [0x0e08, 0x1808],
];

const ACK = 0x06;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function sendMagic(port: TimedPort, magic: Uint8Array): Promise<void> {
  for (const byte of magic) {
    await port.writeBytes(new Uint8Array([byte]));
    await sleep(10);
  }
}

async function doIdent(port: TimedPort, magic: Uint8Array): Promise<Uint8Array> {
  await sendMagic(port, magic);
  const ack = await port.readExact(1, 2000);
  if (ack[0] !== ACK) throw new Error(`No ACK after magic (got 0x${ack[0].toString(16)})`);
  await port.writeBytes(new Uint8Array([0x02]));

  // Read bytes until 0xDD or 12 bytes.
  const collected: number[] = [];
  for (let i = 0; i < 12; i++) {
    const b = await port.readExact(1, 2000);
    collected.push(b[0]);
    if (b[0] === 0xdd) break;
  }
  if (collected.length !== 8 && collected.length !== 12) {
    throw new Error(`Unexpected ident length ${collected.length}`);
  }
  let ident: Uint8Array;
  if (collected.length === 12) {
    // Reduce to 8 per CHIRP: bytes 0, 3, 5, then 7..11
    ident = new Uint8Array([collected[0], collected[3], collected[5], ...collected.slice(7)]);
  } else {
    ident = new Uint8Array(collected);
  }
  await port.writeBytes(new Uint8Array([ACK]));
  const ack2 = await port.readExact(1, 2000);
  if (ack2[0] !== ACK) throw new Error('Radio refused clone (no second ACK)');
  return ident;
}

function packReadCmd(addr: number, size: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = 'S'.charCodeAt(0);
  out[1] = (addr >> 8) & 0xff;
  out[2] = addr & 0xff;
  out[3] = size & 0xff;
  return out;
}

function packWriteCmd(addr: number, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + payload.length);
  out[0] = 'X'.charCodeAt(0);
  out[1] = (addr >> 8) & 0xff;
  out[2] = addr & 0xff;
  out[3] = payload.length & 0xff;
  out.set(payload, 4);
  return out;
}

async function readBlock(
  port: TimedPort,
  addr: number,
  size: number,
  isFirst: boolean,
): Promise<Uint8Array> {
  await port.writeBytes(packReadCmd(addr, size));
  if (!isFirst) {
    const ack = await port.readExact(1, 2000);
    if (ack[0] !== ACK) throw new Error(`Radio refused block 0x${addr.toString(16)}`);
  }
  const header = await port.readExact(4, 3000);
  const cmd = header[0];
  const rAddr = (header[1] << 8) | header[2];
  const rSize = header[3];
  if (cmd !== 'X'.charCodeAt(0) || rAddr !== addr || rSize !== size) {
    throw new Error(`Bad block header at 0x${addr.toString(16)}`);
  }
  const payload = await port.readExact(size, 3000);
  await port.writeBytes(new Uint8Array([ACK]));
  await sleep(50);
  return payload;
}

async function writeBlock(port: TimedPort, addr: number, payload: Uint8Array): Promise<void> {
  await port.writeBytes(packWriteCmd(addr, payload));
  const ack = await port.readExact(1, 3000);
  if (ack[0] !== ACK) throw new Error(`Radio refused write at 0x${addr.toString(16)}`);
  await sleep(50);
}

export interface SerialProgress {
  (done: number, total: number): void;
}

export async function downloadImage(
  port: TimedPort,
  magic: Uint8Array,
  progress?: SerialProgress,
): Promise<Uint8Array> {
  const ident = await doIdent(port, magic);
  const img = new Uint8Array(IMAGE_SIZE);
  img.set(ident.subarray(0, IDENT_HEADER_SIZE), 0);

  // Request radio addresses 0x0000..0x17FF in 0x40-byte chunks; data lands
  // in the file at offset addr + 8.
  const total = RADIO_MAIN_SIZE;
  let done = 0;
  let isFirst = true;
  for (let radioAddr = 0; radioAddr < RADIO_MAIN_SIZE; radioAddr += READ_BLOCK_SIZE) {
    const block = await readBlock(port, radioAddr, READ_BLOCK_SIZE, isFirst);
    img.set(block, radioAddr + IDENT_HEADER_SIZE);
    isFirst = false;
    done += READ_BLOCK_SIZE;
    progress?.(done, total);
  }
  return img;
}

export async function uploadImage(
  port: TimedPort,
  magic: Uint8Array,
  image: Uint8Array,
  progress?: SerialProgress,
): Promise<void> {
  if (image.length !== IMAGE_SIZE) throw new Error(`image must be ${IMAGE_SIZE} bytes`);
  await doIdent(port, magic);

  // Total bytes we're going to write, for the progress meter.
  let totalToWrite = 0;
  for (const [s, e] of WRITE_RANGES_FILE) totalToWrite += e - s;
  let done = 0;

  for (const [fileStart, fileEnd] of WRITE_RANGES_FILE) {
    for (let fileAddr = fileStart; fileAddr < fileEnd; fileAddr += WRITE_BLOCK_SIZE) {
      const radioAddr = fileAddr - IDENT_HEADER_SIZE;
      const slice = image.slice(fileAddr, fileAddr + WRITE_BLOCK_SIZE);
      await writeBlock(port, radioAddr, slice);
      done += WRITE_BLOCK_SIZE;
      progress?.(done, totalToWrite);
    }
  }
}
