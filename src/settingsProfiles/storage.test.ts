import { describe, expect, it } from 'vitest';
import { DEFAULT_RADIO_SETTINGS } from '../image/settings.ts';
import {
  SETTINGS_PROFILE_STORAGE_KEY,
  createCustomSettingsProfile,
  loadCustomSettingsProfiles,
  saveCustomSettingsProfiles,
} from './storage.ts';
import type { SettingsProfile } from './types.ts';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('settings profile storage', () => {
  it('loads valid custom profiles from storage', () => {
    const storage = new MemoryStorage();
    const profile = createCustomSettingsProfile('Trail radio', {
      ...DEFAULT_RADIO_SETTINGS,
      beep: false,
      voice: 'off',
    });

    storage.setItem(SETTINGS_PROFILE_STORAGE_KEY, JSON.stringify([profile]));

    expect(loadCustomSettingsProfiles(storage)).toEqual([profile]);
  });

  it('ignores malformed and invalid stored profiles', () => {
    const storage = new MemoryStorage();
    const valid = createCustomSettingsProfile('Valid', DEFAULT_RADIO_SETTINGS);
    storage.setItem(
      SETTINGS_PROFILE_STORAGE_KEY,
      JSON.stringify([
        valid,
        { ...valid, id: '' },
        { ...valid, kind: 'builtin' },
        { ...valid, settings: { ...DEFAULT_RADIO_SETTINGS, squelch: 20 } },
      ]),
    );

    expect(loadCustomSettingsProfiles(storage)).toEqual([valid]);

    storage.setItem(SETTINGS_PROFILE_STORAGE_KEY, '{nope');
    expect(loadCustomSettingsProfiles(storage)).toEqual([]);
  });

  it('saves only valid custom profiles', () => {
    const storage = new MemoryStorage();
    const custom = createCustomSettingsProfile('Custom', DEFAULT_RADIO_SETTINGS);
    const builtin: SettingsProfile = {
      ...custom,
      id: 'builtin',
      kind: 'builtin',
    };

    saveCustomSettingsProfiles([custom, builtin], storage);

    expect(JSON.parse(storage.getItem(SETTINGS_PROFILE_STORAGE_KEY) ?? '[]')).toEqual([custom]);
  });
});
