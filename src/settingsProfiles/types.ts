import type { RadioSettings } from '../image/schema.ts';
import { DEFAULT_RADIO_SETTINGS } from '../image/settings.ts';

export interface SettingsProfile {
  id: string;
  name: string;
  description?: string;
  kind: 'builtin' | 'custom';
  settings: RadioSettings;
}

export const BUILTIN_SETTINGS_PROFILES: readonly SettingsProfile[] = [
  {
    id: 'everyday',
    name: 'Everyday',
    description: 'General handheld use with familiar defaults.',
    kind: 'builtin',
    settings: {
      ...DEFAULT_RADIO_SETTINGS,
    },
  },
  {
    id: 'quiet',
    name: 'Quiet',
    description: 'Minimizes radio prompts and indicator noise.',
    kind: 'builtin',
    settings: {
      ...DEFAULT_RADIO_SETTINGS,
      beep: false,
      voice: 'off',
      backlightSeconds: 3,
      standbyLed: 'off',
      rxLed: 'blue',
      txLed: 'orange',
      alarmMode: 'site',
    },
  },
  {
    id: 'battery-saver',
    name: 'Battery saver',
    description: 'Reduces prompts and display time for longer standby.',
    kind: 'builtin',
    settings: {
      ...DEFAULT_RADIO_SETTINGS,
      batterySaver: '1:4',
      beep: false,
      voice: 'off',
      backlightSeconds: 2,
      dualWatch: false,
      broadcastFmRadio: false,
      standbyLed: 'off',
    },
  },
  {
    id: 'field-monitoring',
    name: 'Field monitoring',
    description: 'Keeps scan and visibility behavior practical in active use.',
    kind: 'builtin',
    settings: {
      ...DEFAULT_RADIO_SETTINGS,
      squelch: 3,
      batterySaver: '1:2',
      backlightSeconds: 10,
      dualWatch: true,
      beep: true,
      voice: 'off',
      scanResume: 'co',
      displayModeA: 'name',
      displayModeB: 'frequency',
      standbyLed: 'purple',
      rxLed: 'blue',
      txLed: 'orange',
    },
  },
];
