import type { RadioSettings } from '../image/schema.ts';
import {
  ALARM_MODE_VALUES,
  BATTERY_SAVER_VALUES,
  DISPLAY_MODE_VALUES,
  LED_COLOR_VALUES,
  SCAN_RESUME_VALUES,
  TUNING_STEPS_KHZ,
  VOICE_VALUES,
} from '../image/settings.ts';
import type { SettingsProfile } from './types.ts';

export const SETTINGS_PROFILE_STORAGE_KEY = 'honk.settingsProfiles.v1';

interface ProfileStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function createCustomSettingsProfile(
  name: string,
  settings: RadioSettings,
): SettingsProfile {
  return {
    id: `custom-${uniqueId()}`,
    name: name.trim(),
    kind: 'custom',
    settings: { ...settings },
  };
}

export function loadCustomSettingsProfiles(
  storage: ProfileStorage | null = browserStorage(),
): SettingsProfile[] {
  if (!storage) return [];

  try {
    const raw = storage.getItem(SETTINGS_PROFILE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredCustomProfile).map((profile) => ({
      ...profile,
      settings: { ...profile.settings },
    }));
  } catch {
    return [];
  }
}

export function saveCustomSettingsProfiles(
  profiles: readonly SettingsProfile[],
  storage: ProfileStorage | null = browserStorage(),
): void {
  if (!storage) return;
  const customProfiles = profiles.filter(isStoredCustomProfile);
  storage.setItem(SETTINGS_PROFILE_STORAGE_KEY, JSON.stringify(customProfiles));
}

function isStoredCustomProfile(value: unknown): value is SettingsProfile {
  if (!isRecord(value)) return false;
  return (
    value.kind === 'custom' &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    (value.description === undefined || typeof value.description === 'string') &&
    isRadioSettings(value.settings)
  );
}

function isRadioSettings(value: unknown): value is RadioSettings {
  if (!isRecord(value)) return false;
  return (
    isIntInRange(value.squelch, 0, 9) &&
    includes(TUNING_STEPS_KHZ, value.stepKhz) &&
    includes(BATTERY_SAVER_VALUES, value.batterySaver) &&
    isIntInRange(value.vox, 0, 10) &&
    isIntInRange(value.backlightSeconds, 0, 24) &&
    typeof value.dualWatch === 'boolean' &&
    typeof value.beep === 'boolean' &&
    isTimeout(value.timeoutSeconds) &&
    includes(VOICE_VALUES, value.voice) &&
    includes(SCAN_RESUME_VALUES, value.scanResume) &&
    includes(DISPLAY_MODE_VALUES, value.displayModeA) &&
    includes(DISPLAY_MODE_VALUES, value.displayModeB) &&
    typeof value.busyChannelLockout === 'boolean' &&
    typeof value.automaticKeyLock === 'boolean' &&
    typeof value.broadcastFmRadio === 'boolean' &&
    includes(LED_COLOR_VALUES, value.standbyLed) &&
    includes(LED_COLOR_VALUES, value.rxLed) &&
    includes(LED_COLOR_VALUES, value.txLed) &&
    includes(ALARM_MODE_VALUES, value.alarmMode)
  );
}

function browserStorage(): ProfileStorage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function isTimeout(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 15 &&
      value <= 600 &&
      value % 15 === 0)
  );
}

function includes<T>(values: readonly T[], value: unknown): value is T {
  return values.includes(value as T);
}

function uniqueId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
