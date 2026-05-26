import type {
  AlarmMode,
  BatterySaver,
  DisplayMode,
  LedColor,
  RadioSettings,
  ScanResume,
  TuningStepKhz,
  VoiceMode,
} from './schema.ts';
import type { RadioModel } from '../radios/types.ts';

export const TUNING_STEPS_KHZ: readonly TuningStepKhz[] = [
  2.5,
  5,
  6.25,
  10,
  12.5,
  20,
  25,
  50,
];
export const BATTERY_SAVER_VALUES: readonly BatterySaver[] = ['off', '1:1', '1:2', '1:3', '1:4'];
export const VOICE_VALUES: readonly VoiceMode[] = ['off', 'english', 'chinese'];
export const SCAN_RESUME_VALUES: readonly ScanResume[] = ['to', 'co', 'se'];
export const DISPLAY_MODE_VALUES: readonly DisplayMode[] = ['channel', 'name', 'frequency'];
export const LED_COLOR_VALUES: readonly LedColor[] = ['off', 'blue', 'orange', 'purple'];
export const ALARM_MODE_VALUES: readonly AlarmMode[] = ['site', 'tone', 'code'];

export const DEFAULT_RADIO_SETTINGS: RadioSettings = {
  squelch: 5,
  stepKhz: 12.5,
  batterySaver: '1:3',
  vox: 0,
  backlightSeconds: 5,
  dualWatch: false,
  beep: true,
  timeoutSeconds: 60,
  voice: 'english',
  scanResume: 'to',
  displayModeA: 'name',
  displayModeB: 'frequency',
  busyChannelLockout: false,
  automaticKeyLock: false,
  broadcastFmRadio: true,
  standbyLed: 'purple',
  rxLed: 'blue',
  txLed: 'orange',
  alarmMode: 'site',
};

const SettingsByte = {
  Squelch: 0,
  Step: 1,
  Save: 3,
  Vox: 4,
  Abr: 6,
  Tdr: 7,
  Beep: 8,
  Timeout: 9,
  Voice: 14,
  ScanResume: 18,
  DisplayModeA: 21,
  DisplayModeB: 22,
  BusyChannelLockout: 23,
  AutomaticKeyLock: 24,
  StandbyLed: 29,
  RxLed: 30,
  TxLed: 31,
  AlarmMode: 32,
  FeatureFlags: 42,
} as const;

export function parseSettings(raw: Uint8Array, model: RadioModel): RadioSettings {
  const base = settingsOffset(model);

  return {
    squelch: readRange(raw[base + SettingsByte.Squelch], 0, 9, DEFAULT_RADIO_SETTINGS.squelch),
    stepKhz: readList(raw[base + SettingsByte.Step], TUNING_STEPS_KHZ, DEFAULT_RADIO_SETTINGS.stepKhz),
    batterySaver: readList(
      raw[base + SettingsByte.Save],
      BATTERY_SAVER_VALUES,
      DEFAULT_RADIO_SETTINGS.batterySaver,
    ),
    vox: readRange(raw[base + SettingsByte.Vox], 0, 10, DEFAULT_RADIO_SETTINGS.vox),
    backlightSeconds: readRange(
      raw[base + SettingsByte.Abr],
      0,
      24,
      DEFAULT_RADIO_SETTINGS.backlightSeconds,
    ),
    dualWatch: !!raw[base + SettingsByte.Tdr],
    beep: !!raw[base + SettingsByte.Beep],
    timeoutSeconds: parseTimeout(raw[base + SettingsByte.Timeout]),
    voice: readList(raw[base + SettingsByte.Voice], VOICE_VALUES, DEFAULT_RADIO_SETTINGS.voice),
    scanResume: readList(
      raw[base + SettingsByte.ScanResume] & 0x03,
      SCAN_RESUME_VALUES,
      DEFAULT_RADIO_SETTINGS.scanResume,
    ),
    displayModeA: readList(
      raw[base + SettingsByte.DisplayModeA],
      DISPLAY_MODE_VALUES,
      DEFAULT_RADIO_SETTINGS.displayModeA,
    ),
    displayModeB: readList(
      raw[base + SettingsByte.DisplayModeB],
      DISPLAY_MODE_VALUES,
      DEFAULT_RADIO_SETTINGS.displayModeB,
    ),
    busyChannelLockout: !!raw[base + SettingsByte.BusyChannelLockout],
    automaticKeyLock: !!raw[base + SettingsByte.AutomaticKeyLock],
    broadcastFmRadio: !!((raw[base + SettingsByte.FeatureFlags] >> 4) & 0x01),
    standbyLed: readList(
      raw[base + SettingsByte.StandbyLed],
      LED_COLOR_VALUES,
      DEFAULT_RADIO_SETTINGS.standbyLed,
    ),
    rxLed: readList(raw[base + SettingsByte.RxLed], LED_COLOR_VALUES, DEFAULT_RADIO_SETTINGS.rxLed),
    txLed: readList(raw[base + SettingsByte.TxLed], LED_COLOR_VALUES, DEFAULT_RADIO_SETTINGS.txLed),
    alarmMode: readList(
      raw[base + SettingsByte.AlarmMode],
      ALARM_MODE_VALUES,
      DEFAULT_RADIO_SETTINGS.alarmMode,
    ),
  };
}

export function writeSettings(out: Uint8Array, model: RadioModel, settings: RadioSettings): void {
  const base = settingsOffset(model);

  out[base + SettingsByte.Squelch] = clampInt(settings.squelch, 0, 9);
  out[base + SettingsByte.Step] = listIndex(TUNING_STEPS_KHZ, settings.stepKhz);
  out[base + SettingsByte.Save] = listIndex(BATTERY_SAVER_VALUES, settings.batterySaver);
  out[base + SettingsByte.Vox] = clampInt(settings.vox, 0, 10);
  out[base + SettingsByte.Abr] = clampInt(settings.backlightSeconds, 0, 24);
  out[base + SettingsByte.Tdr] = settings.dualWatch ? 1 : 0;
  out[base + SettingsByte.Beep] = settings.beep ? 1 : 0;
  out[base + SettingsByte.Timeout] =
    settings.timeoutSeconds === null ? 0x28 : clampInt(Math.round(settings.timeoutSeconds / 15) - 1, 0, 39);
  out[base + SettingsByte.Voice] = listIndex(VOICE_VALUES, settings.voice);
  out[base + SettingsByte.ScanResume] =
    (out[base + SettingsByte.ScanResume] & 0xfc) | listIndex(SCAN_RESUME_VALUES, settings.scanResume);
  out[base + SettingsByte.DisplayModeA] = listIndex(DISPLAY_MODE_VALUES, settings.displayModeA);
  out[base + SettingsByte.DisplayModeB] = listIndex(DISPLAY_MODE_VALUES, settings.displayModeB);
  out[base + SettingsByte.BusyChannelLockout] = settings.busyChannelLockout ? 1 : 0;
  out[base + SettingsByte.AutomaticKeyLock] = settings.automaticKeyLock ? 1 : 0;
  out[base + SettingsByte.StandbyLed] = listIndex(LED_COLOR_VALUES, settings.standbyLed);
  out[base + SettingsByte.RxLed] = listIndex(LED_COLOR_VALUES, settings.rxLed);
  out[base + SettingsByte.TxLed] = listIndex(LED_COLOR_VALUES, settings.txLed);
  out[base + SettingsByte.AlarmMode] = listIndex(ALARM_MODE_VALUES, settings.alarmMode);
  out[base + SettingsByte.FeatureFlags] =
    (out[base + SettingsByte.FeatureFlags] & 0xef) | (settings.broadcastFmRadio ? 0x10 : 0);
}

export function writeDefaultSettings(out: Uint8Array, model: RadioModel): void {
  writeSettings(out, model, DEFAULT_RADIO_SETTINGS);
}

function settingsOffset(model: RadioModel): number {
  const offset = model.memory.offsets.settings;
  if (offset === undefined) throw new Error(`${model.label} does not define a settings block`);
  return offset;
}

function readRange(value: number, min: number, max: number, fallback: number): number {
  return value >= min && value <= max ? value : fallback;
}

function readList<T>(index: number, values: readonly T[], fallback: T): T {
  return index >= 0 && index < values.length ? values[index] : fallback;
}

function parseTimeout(value: number): number | null {
  if (value === 0x28) return null;
  if (value >= 0 && value <= 39) return (value + 1) * 15;
  return DEFAULT_RADIO_SETTINGS.timeoutSeconds;
}

function listIndex<T>(values: readonly T[], value: T): number {
  const index = values.indexOf(value);
  return index === -1 ? 0 : index;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
