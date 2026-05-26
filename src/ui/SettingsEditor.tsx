import { useHonk } from '../state/store.ts';
import type {
  AlarmMode,
  BatterySaver,
  DisplayMode,
  LedColor,
  ScanResume,
  TuningStepKhz,
  VoiceMode,
} from '../image/schema.ts';
import {
  ALARM_MODE_VALUES,
  BATTERY_SAVER_VALUES,
  DISPLAY_MODE_VALUES,
  LED_COLOR_VALUES,
  SCAN_RESUME_VALUES,
  TUNING_STEPS_KHZ,
  VOICE_VALUES,
} from '../image/settings.ts';
import { Field } from './Field.tsx';

const VOX_VALUES = Array.from({ length: 11 }, (_, value) => value);
const BACKLIGHT_VALUES = Array.from({ length: 25 }, (_, value) => value);
const SQUELCH_VALUES = Array.from({ length: 10 }, (_, value) => value);
const TIMEOUT_VALUES: readonly (number | null)[] = [
  ...Array.from({ length: 40 }, (_, index) => (index + 1) * 15),
  null,
];

export function SettingsEditor() {
  const settings = useHonk((s) => s.image.settings);
  const updateSettings = useHonk((s) => s.updateSettings);

  return (
    <aside className="editor">
      <h2>Radio settings</h2>

      <Field label="Squelch" hint="Higher values require stronger signals to open the speaker.">
        <select
          value={settings.squelch}
          onChange={(e) => updateSettings({ squelch: Number(e.target.value) })}
        >
          {SQUELCH_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Step" hint="Frequency tuning step used in VFO mode.">
        <select
          value={settings.stepKhz}
          onChange={(e) =>
            updateSettings({ stepKhz: Number(e.target.value) as TuningStepKhz })
          }
        >
          {TUNING_STEPS_KHZ.map((value) => (
            <option key={value} value={value}>
              {value} kHz
            </option>
          ))}
        </select>
      </Field>

      <Field label="Battery saver">
        <select
          value={settings.batterySaver}
          onChange={(e) => updateSettings({ batterySaver: e.target.value as BatterySaver })}
        >
          {BATTERY_SAVER_VALUES.map((value) => (
            <option key={value} value={value}>
              {batterySaverLabel(value)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="VOX" hint="Voice-activated transmit sensitivity.">
        <select
          value={settings.vox}
          onChange={(e) => updateSettings({ vox: Number(e.target.value) })}
        >
          {VOX_VALUES.map((value) => (
            <option key={value} value={value}>
              {value === 0 ? 'Off' : value}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Backlight">
        <select
          value={settings.backlightSeconds}
          onChange={(e) => updateSettings({ backlightSeconds: Number(e.target.value) })}
        >
          {BACKLIGHT_VALUES.map((value) => (
            <option key={value} value={value}>
              {value === 0 ? 'Off' : `${value} sec`}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Timeout timer" hint="Maximum transmit time before the radio stops transmitting.">
        <select
          value={settings.timeoutSeconds ?? 'off'}
          onChange={(e) =>
            updateSettings({
              timeoutSeconds: e.target.value === 'off' ? null : Number(e.target.value),
            })
          }
        >
          {TIMEOUT_VALUES.map((value) => (
            <option key={value ?? 'off'} value={value ?? 'off'}>
              {value === null ? 'Off' : `${value} sec`}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Voice">
        <select
          value={settings.voice}
          onChange={(e) => updateSettings({ voice: e.target.value as VoiceMode })}
        >
          {VOICE_VALUES.map((value) => (
            <option key={value} value={value}>
              {titleLabel(value)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Scan resume">
        <select
          value={settings.scanResume}
          onChange={(e) => updateSettings({ scanResume: e.target.value as ScanResume })}
        >
          {SCAN_RESUME_VALUES.map((value) => (
            <option key={value} value={value}>
              {value.toUpperCase()}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Display A">
        <DisplayModeSelect
          value={settings.displayModeA}
          onChange={(displayModeA) => updateSettings({ displayModeA })}
        />
      </Field>

      <Field label="Display B">
        <DisplayModeSelect
          value={settings.displayModeB}
          onChange={(displayModeB) => updateSettings({ displayModeB })}
        />
      </Field>

      <Field label="Standby LED">
        <LedColorSelect
          value={settings.standbyLed}
          onChange={(standbyLed) => updateSettings({ standbyLed })}
        />
      </Field>

      <Field label="RX LED">
        <LedColorSelect value={settings.rxLed} onChange={(rxLed) => updateSettings({ rxLed })} />
      </Field>

      <Field label="TX LED">
        <LedColorSelect value={settings.txLed} onChange={(txLed) => updateSettings({ txLed })} />
      </Field>

      <Field label="Alarm mode">
        <select
          value={settings.alarmMode}
          onChange={(e) => updateSettings({ alarmMode: e.target.value as AlarmMode })}
        >
          {ALARM_MODE_VALUES.map((value) => (
            <option key={value} value={value}>
              {titleLabel(value)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Dual watch">
        <input
          type="checkbox"
          checked={settings.dualWatch}
          onChange={(e) => updateSettings({ dualWatch: e.target.checked })}
        />
      </Field>

      <Field label="Beep">
        <input
          type="checkbox"
          checked={settings.beep}
          onChange={(e) => updateSettings({ beep: e.target.checked })}
        />
      </Field>

      <Field label="Busy lockout">
        <input
          type="checkbox"
          checked={settings.busyChannelLockout}
          onChange={(e) => updateSettings({ busyChannelLockout: e.target.checked })}
        />
      </Field>

      <Field label="Auto key lock">
        <input
          type="checkbox"
          checked={settings.automaticKeyLock}
          onChange={(e) => updateSettings({ automaticKeyLock: e.target.checked })}
        />
      </Field>

      <Field label="FM radio">
        <input
          type="checkbox"
          checked={settings.broadcastFmRadio}
          onChange={(e) => updateSettings({ broadcastFmRadio: e.target.checked })}
        />
      </Field>
    </aside>
  );
}

function DisplayModeSelect({
  value,
  onChange,
}: {
  value: DisplayMode;
  onChange: (value: DisplayMode) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as DisplayMode)}>
      {DISPLAY_MODE_VALUES.map((mode) => (
        <option key={mode} value={mode}>
          {titleLabel(mode)}
        </option>
      ))}
    </select>
  );
}

function LedColorSelect({
  value,
  onChange,
}: {
  value: LedColor;
  onChange: (value: LedColor) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as LedColor)}>
      {LED_COLOR_VALUES.map((color) => (
        <option key={color} value={color}>
          {titleLabel(color)}
        </option>
      ))}
    </select>
  );
}

function batterySaverLabel(value: BatterySaver): string {
  return value === 'off' ? 'Off' : value;
}

function titleLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
