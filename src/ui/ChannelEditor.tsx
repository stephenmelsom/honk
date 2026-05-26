import { useHonk } from '../state/store.ts';
import { Field } from './Field.tsx';
import type { Channel } from '../image/schema.ts';
import { CTCSS_TONES_HZ, DCS_CODES } from '../codec/tones.ts';
import type { ToneSlot } from '../codec/tones.ts';
import { formatMhz, parseMhz } from '../radio/format.ts';
import type { RadioModel } from '../radios/types.ts';
import { isFreqInBands } from '../radios/util.ts';

const blankFlags: Channel['rawFlags'] = {
  flagsByte0Other: 0,
  isUhf: 0,
  scode: 0,
  flagsByte1: 0,
  flagsByte2Other: 0,
  flagsByte3PttId: 0,
};

function emptyChannel(model: RadioModel): Channel {
  return {
    rxHz: model.defaultRxHz,
    txHz: model.defaultRxHz,
    rxTone: { kind: 'none' },
    txTone: { kind: 'none' },
    name: '',
    power: 'high',
    bandwidth: 'wide',
    scanAdd: true,
    busyLockout: false,
    rawFlags: blankFlags,
  };
}

export function ChannelEditor() {
  const index = useHonk((s) => s.selectedChannel);
  const channel = useHonk((s) => s.image.channels[index]);
  const updateChannel = useHonk((s) => s.updateChannel);
  const radio = useHonk((s) => s.radio);

  if (!channel) {
    return (
      <aside className="editor">
        <h2>Channel {index + 1}</h2>
        <p>
          <em>This slot is empty.</em>
        </p>
        <button onClick={() => updateChannel(index, emptyChannel(radio))}>
          Add a channel here
        </button>
      </aside>
    );
  }

  const rxOutOfBand = !isFreqInBands(channel.rxHz, radio);
  const txOutOfBand = !isFreqInBands(channel.txHz, radio);

  const patch = (next: Partial<Channel>) =>
    updateChannel(index, { ...channel, ...next });

  return (
    <aside className="editor">
      <header className="editor-header">
        <h2>Channel {index + 1}</h2>
        <button onClick={() => updateChannel(index, null)}>Delete</button>
      </header>

      <Field label="Name" hint="Up to 7 characters; shown on the radio display.">
        <input
          type="text"
          maxLength={7}
          value={channel.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </Field>

      <Field
        label="Receive (MHz)"
        hint="The frequency you listen on. For a repeater, this is its output."
      >
        <input
          key={`rx-${index}`}
          type="text"
          inputMode="decimal"
          defaultValue={formatMhz(channel.rxHz)}
          onBlur={(e) => {
            const hz = parseMhz(e.target.value);
            if (hz) patch({ rxHz: hz });
            else e.target.value = formatMhz(channel.rxHz);
          }}
        />
        {rxOutOfBand && <BandWarning model={radio} />}
      </Field>

      <Field
        label="Transmit (MHz)"
        hint="The frequency you transmit on. For a repeater, this is its input. Set equal to RX for simplex."
      >
        <input
          key={`tx-${index}`}
          type="text"
          inputMode="decimal"
          defaultValue={formatMhz(channel.txHz)}
          onBlur={(e) => {
            const hz = parseMhz(e.target.value);
            if (hz) patch({ txHz: hz });
            else e.target.value = formatMhz(channel.txHz);
          }}
        />
        {txOutOfBand && channel.txHz !== -1 && <BandWarning model={radio} />}
      </Field>

      <Field
        label="TX tone"
        hint="The tone your radio sends. Most repeaters require a specific CTCSS tone."
      >
        <ToneSelect tone={channel.txTone} onChange={(t) => patch({ txTone: t })} />
      </Field>

      <Field
        label="RX tone"
        hint="A tone your radio requires to hear traffic. Usually left as 'none' for repeaters."
      >
        <ToneSelect tone={channel.rxTone} onChange={(t) => patch({ rxTone: t })} />
      </Field>

      <Field label="Bandwidth" hint="Narrow (12.5 kHz) is required on FRS, GMRS narrowband, and many business channels.">
        <select
          value={channel.bandwidth}
          onChange={(e) => patch({ bandwidth: e.target.value as 'wide' | 'narrow' })}
        >
          <option value="wide">Wide (25 kHz)</option>
          <option value="narrow">Narrow (12.5 kHz)</option>
        </select>
      </Field>

      <Field label="Power" hint="Low power conserves battery and is required on some channels.">
        <select
          value={channel.power}
          onChange={(e) => patch({ power: e.target.value as 'high' | 'low' })}
        >
          <option value="high">High</option>
          <option value="low">Low</option>
        </select>
      </Field>

      <Field label="Include in scan">
        <input
          type="checkbox"
          checked={channel.scanAdd}
          onChange={(e) => patch({ scanAdd: e.target.checked })}
        />
      </Field>

      <Field label="Busy lockout" hint="When on, the radio won't transmit if it hears traffic on the channel.">
        <input
          type="checkbox"
          checked={channel.busyLockout}
          onChange={(e) => patch({ busyLockout: e.target.checked })}
        />
      </Field>
    </aside>
  );
}

function BandWarning({ model }: { model: RadioModel }) {
  const bands: string[] = [];
  const { vhf, uhf } = model.frequencyLimits;
  if (vhf) bands.push(`${(vhf[0] / 1e6).toFixed(0)}–${(vhf[1] / 1e6).toFixed(0)} MHz`);
  if (uhf) bands.push(`${(uhf[0] / 1e6).toFixed(0)}–${(uhf[1] / 1e6).toFixed(0)} MHz`);
  return (
    <span className="warn small">
      Outside {model.label} bands ({bands.join(', ')}). Saved anyway, but the radio
      may not accept it.
    </span>
  );
}

function ToneSelect({ tone, onChange }: { tone: ToneSlot; onChange: (t: ToneSlot) => void }) {
  const kind = tone.kind;
  return (
    <span className="tone-select">
      <select
        value={kind}
        onChange={(e) => {
          const next = e.target.value as ToneSlot['kind'];
          if (next === 'none') onChange({ kind: 'none' });
          else if (next === 'ctcss') onChange({ kind: 'ctcss', hz: 100.0 });
          else onChange({ kind: 'dcs', code: DCS_CODES[0], polarity: 'N' });
        }}
      >
        <option value="none">None</option>
        <option value="ctcss">CTCSS</option>
        <option value="dcs">DCS</option>
      </select>
      {kind === 'ctcss' && (
        <select
          value={tone.kind === 'ctcss' ? tone.hz : 100.0}
          onChange={(e) => onChange({ kind: 'ctcss', hz: Number(e.target.value) })}
        >
          {CTCSS_TONES_HZ.map((hz) => (
            <option key={hz} value={hz}>
              {hz.toFixed(1)} Hz
            </option>
          ))}
        </select>
      )}
      {kind === 'dcs' && tone.kind === 'dcs' && (
        <>
          <select
            value={tone.code}
            onChange={(e) =>
              onChange({ kind: 'dcs', code: Number(e.target.value), polarity: tone.polarity })
            }
          >
            {DCS_CODES.map((code) => (
              <option key={code} value={code}>
                D{String(code).padStart(3, '0')}
              </option>
            ))}
          </select>
          <select
            value={tone.polarity}
            onChange={(e) =>
              onChange({
                kind: 'dcs',
                code: tone.code,
                polarity: e.target.value as 'N' | 'R',
              })
            }
          >
            <option value="N">Normal</option>
            <option value="R">Reverse</option>
          </select>
        </>
      )}
    </span>
  );
}
