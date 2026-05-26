// Read/write bitfields packed into a single byte, MSB-first to match how CHIRP's
// bitwise DSL declares them (the field listed first occupies the highest bits).

export interface BitFieldSpec {
  /** Field name. */
  name: string;
  /** Number of bits this field occupies. */
  bits: number;
}

export interface BitField {
  name: string;
  /** Bit index of the MSB of this field within the byte (0..7). */
  msbIndex: number;
  bits: number;
  mask: number;
}

export function layoutBitFields(specs: readonly BitFieldSpec[]): BitField[] {
  let cursor = 8;
  const out: BitField[] = [];
  for (const s of specs) {
    cursor -= s.bits;
    if (cursor < 0) {
      throw new Error(`bitfields exceed 8 bits: ${specs.map((x) => x.name).join(',')}`);
    }
    out.push({
      name: s.name,
      msbIndex: cursor + s.bits - 1,
      bits: s.bits,
      mask: ((1 << s.bits) - 1) << cursor,
    });
  }
  if (cursor !== 0) {
    throw new Error(`bitfields do not fill 8 bits: ${specs.map((x) => x.name).join(',')}`);
  }
  return out;
}

export function readBitField(byte: number, field: BitField): number {
  return (byte & field.mask) >> (field.msbIndex - field.bits + 1);
}

export function writeBitField(byte: number, field: BitField, value: number): number {
  const max = (1 << field.bits) - 1;
  const clamped = value & max;
  return (byte & ~field.mask & 0xff) | ((clamped << (field.msbIndex - field.bits + 1)) & 0xff);
}
