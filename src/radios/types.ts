// Radio model abstraction. Adding a new radio is a matter of writing a new
// definition file and registering it in `./index.ts`.

export interface FieldSlot {
  offset: number;
  length: number;
}

export interface ChannelBitLayout {
  rxfreq: FieldSlot;
  txfreq: FieldSlot;
  rxtone: FieldSlot;
  txtone: FieldSlot;
  flagsByte0: number;
  flagsByte1: number;
  flagsByte2: number;
  flagsByte3: number;
}

export interface MemoryLayout {
  /** Bytes the radio prepends to the image during the clone handshake. */
  identHeaderSize: number;
  /** Bytes per channel record. */
  channelBytes: number;
  /** Bytes per name slot (visible name + any padding). */
  nameBytes: number;
  /** Visible-name byte count within each name slot. */
  nameLength: number;
  offsets: {
    ident: number;
    channels: number;
    names: number;
    // Documented but not load-bearing — present so a future radio can omit
    // ones it lacks without a stub. Code does not read these directly today.
    pttid?: number;
    ani?: number;
    settings?: number;
    wmchannel?: number;
    vfoa?: number;
    vfob?: number;
    fmPresets?: number;
    sixPowerOnMsg?: number;
    firmwareMsg?: number;
  };
  channel: ChannelBitLayout;
}

export interface SerialProtocolSpec {
  /** Possible handshake byte sequences sent one-at-a-time at the start of a clone session. */
  magics: readonly Uint8Array[];
  baud: number;
  /** Size of the radio's own memory window (excludes the ident header). */
  radioMainSize: number;
  readBlockSize: number;
  writeBlockSize: number;
  /**
   * File-offset ranges that the writer pushes to the radio. Anything outside
   * these ranges is left untouched on the radio.
   */
  writeRangesFile: ReadonlyArray<readonly [number, number]>;
}

export type FreqBand = readonly [hzLow: number, hzHigh: number];

export interface FrequencyLimits {
  vhf?: FreqBand;
  uhf?: FreqBand;
}

export type RadioSupport = 'verified' | 'beta' | 'experimental';

export interface RadioModel {
  /** Stable identifier, used as a key in the registry and on `RadioImage`. */
  id: string;
  /** Display label shown in the UI picker. */
  label: string;
  /** How well-tested this radio's support is. Shown in the UI as an honesty signal. */
  support: RadioSupport;
  /** Total size of the saved .img file (including ident header). */
  imageSize: number;
  channelCount: number;
  memory: MemoryLayout;
  serial?: SerialProtocolSpec;
  imageCodec?: 'uv5r' | 'yaesu-ftm';
  /** Documented radio-side rx/tx limits. UI uses these for non-blocking warnings. */
  frequencyLimits: FrequencyLimits;
  /** Frequency used when the editor opens an empty channel. */
  defaultRxHz: number;
  /** Ident header bytes the synthetic image / mock radio emit for this model. */
  expectedIdent: Uint8Array;
  /**
   * Predicate used to recognize the radio from observed ident bytes (e.g. on
   * file load or after a serial handshake). Manual picker today; reserved for
   * future auto-detection.
   */
  identMatches(bytes: Uint8Array): boolean;
}
