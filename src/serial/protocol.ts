// SPDX-License-Identifier: GPL-2.0-only
// UV-82 clone-mode protocol implementation, derived from CHIRP's chirp/drivers/uv5r.py.
// Per-model details (magic bytes, image size, write ranges) come from a
// RadioModel; the framing protocol itself is shared across the UV-5R/UV-82
// family.
//
// Handshake:
//   1. Slowly send the per-radio "magic" bytes (one byte every 10 ms).
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
// Address mapping: the radio addresses its own memory from 0x0000 onward.
// The saved image file prepends the model's ident header, so radio address
// X maps to file offset X + identHeaderSize. CHIRP reads in readBlockSize-byte
// blocks but writes in writeBlockSize-byte blocks, and skips factory-locked
// windows during writes.

import type { RadioModel } from '../radios/types.ts';
import type { TimedPort } from './port.ts';

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

async function identifyRadio(port: TimedPort, magics: readonly Uint8Array[]): Promise<Uint8Array> {
  let lastError: unknown;
  for (const magic of magics) {
    try {
      return await doIdent(port, magic);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Radio did not match any known clone ident');
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
  model: RadioModel,
  progress?: SerialProgress,
): Promise<Uint8Array> {
  if (!model.serial) throw new Error(`${model.label} does not support direct serial cloning yet`);
  const { magics, radioMainSize, readBlockSize } = model.serial;
  const identHeaderSize = model.memory.identHeaderSize;

  const ident = await identifyRadio(port, magics);
  const img = new Uint8Array(model.imageSize);
  img.set(ident.subarray(0, identHeaderSize), 0);

  // Request radio addresses 0x0000..radioMainSize in readBlockSize-byte chunks;
  // data lands in the file at offset addr + identHeaderSize.
  const total = radioMainSize;
  let done = 0;
  let isFirst = true;
  for (let radioAddr = 0; radioAddr < radioMainSize; radioAddr += readBlockSize) {
    const block = await readBlock(port, radioAddr, readBlockSize, isFirst);
    img.set(block, radioAddr + identHeaderSize);
    isFirst = false;
    done += readBlockSize;
    progress?.(done, total);
  }
  return img;
}

export async function uploadImage(
  port: TimedPort,
  model: RadioModel,
  image: Uint8Array,
  progress?: SerialProgress,
): Promise<void> {
  if (!model.serial) throw new Error(`${model.label} does not support direct serial cloning yet`);
  if (image.length !== model.imageSize) {
    throw new Error(`image must be ${model.imageSize} bytes`);
  }
  const { magics, writeBlockSize, writeRangesFile } = model.serial;
  const identHeaderSize = model.memory.identHeaderSize;

  await identifyRadio(port, magics);

  // Total bytes we're going to write, for the progress meter.
  let totalToWrite = 0;
  for (const [s, e] of writeRangesFile) totalToWrite += e - s;
  let done = 0;

  for (const [fileStart, fileEnd] of writeRangesFile) {
    for (let fileAddr = fileStart; fileAddr < fileEnd; fileAddr += writeBlockSize) {
      const radioAddr = fileAddr - identHeaderSize;
      const slice = image.slice(fileAddr, fileAddr + writeBlockSize);
      await writeBlock(port, radioAddr, slice);
      done += writeBlockSize;
      progress?.(done, totalToWrite);
    }
  }
}
