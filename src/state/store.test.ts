import { describe, expect, it } from 'vitest';
import { DEFAULT_RADIO_SETTINGS } from '../image/settings.ts';
import type { SettingsProfile } from '../settingsProfiles/types.ts';
import { useHonk } from './store.ts';

describe('honk store settings profiles', () => {
  it('applies a full settings profile without changing image data outside settings', () => {
    const state = useHonk.getState();
    state.newBlankImage();
    useHonk.setState({ dirty: false, selectedChannel: 12 });

    const before = useHonk.getState();
    const channels = before.image.channels;
    const raw = before.image.raw;
    const radio = before.radio;
    const profile: SettingsProfile = {
      id: 'custom-test',
      name: 'Custom test',
      kind: 'custom',
      settings: {
        ...DEFAULT_RADIO_SETTINGS,
        squelch: 2,
        beep: false,
        voice: 'off',
        scanResume: 'co',
      },
    };

    before.applySettingsProfile(profile);

    const after = useHonk.getState();
    expect(after.image.settings).toEqual(profile.settings);
    expect(after.dirty).toBe(true);
    expect(after.image.channels).toBe(channels);
    expect(after.image.raw).toBe(raw);
    expect(after.selectedChannel).toBe(12);
    expect(after.radio).toBe(radio);
  });
});
