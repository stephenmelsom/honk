import { useState } from 'react';
import { useHonk } from '../state/store.ts';
import { Field } from './Field.tsx';
import { CTCSS_TONES_HZ } from '../codec/tones.ts';
import {
  buildRepeaterChannel,
  defaultOffsetDirection,
  defaultOffsetMhz,
} from '../radio/repeater.ts';
import type { OffsetDirection, RepeaterInput } from '../radio/repeater.ts';

const initial: RepeaterInput = {
  name: '',
  outputMhz: 146.84,
  offsetDirection: '-',
  offsetMhz: 0.6,
  uplinkTone: { kind: 'ctcss', hz: 100.0 },
  downlinkTone: { kind: 'none' },
  bandwidth: 'wide',
  power: 'high',
};

export function RepeaterWizard({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState<RepeaterInput>(initial);
  const selected = useHonk((s) => s.selectedChannel);
  const channels = useHonk((s) => s.image.channels);
  const updateChannel = useHonk((s) => s.updateChannel);

  const firstEmpty = channels.findIndex((c) => c === null);
  const targetSlot = channels[selected] === null ? selected : firstEmpty;

  const patch = (next: Partial<RepeaterInput>) => setInput((cur) => ({ ...cur, ...next }));

  const onOutputBlur = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    patch({
      outputMhz: n,
      offsetMhz: defaultOffsetMhz(n) || input.offsetMhz,
      offsetDirection: defaultOffsetDirection(n) || input.offsetDirection,
    });
  };

  const onAdd = () => {
    if (targetSlot < 0) {
      alert('No empty channel slots — delete one first.');
      return;
    }
    const ch = buildRepeaterChannel(input);
    updateChannel(targetSlot, ch);
    onClose();
  };

  const targetLabel =
    targetSlot < 0
      ? 'no empty slots'
      : `slot ${targetSlot + 1}${channels[selected] === null ? ' (selected)' : ' (first empty)'}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add a repeater</h2>
        <p className="muted">
          Type what the repeater directory shows. honk will fill in the right
          transmit frequency and tone.
        </p>

        <Field label="Name" hint="Up to 7 characters; shows on the radio display.">
          <input
            type="text"
            maxLength={7}
            value={input.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="W7XYZ"
          />
        </Field>

        <Field label="Output (MHz)" hint="The repeater's published output / downlink frequency — what you listen to.">
          <input
            type="text"
            inputMode="decimal"
            defaultValue={input.outputMhz.toString()}
            onBlur={(e) => onOutputBlur(e.target.value)}
          />
        </Field>

        <Field label="Offset" hint="Which way the input frequency is shifted from the output. Defaults are set automatically from the band.">
          <select
            value={input.offsetDirection}
            onChange={(e) => patch({ offsetDirection: e.target.value as OffsetDirection })}
          >
            <option value="-">Minus (−)</option>
            <option value="+">Plus (+)</option>
            <option value="simplex">Simplex (same freq)</option>
          </select>
        </Field>

        {input.offsetDirection !== 'simplex' && (
          <Field label="Offset (MHz)">
            <input
              type="text"
              inputMode="decimal"
              defaultValue={input.offsetMhz.toString()}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) patch({ offsetMhz: n });
              }}
            />
          </Field>
        )}

        <Field
          label="Uplink tone"
          hint="The tone the repeater requires on its input. Almost always set; look it up in the directory."
        >
          <select
            value={input.uplinkTone.kind === 'ctcss' ? input.uplinkTone.hz : 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v === 0) patch({ uplinkTone: { kind: 'none' } });
              else patch({ uplinkTone: { kind: 'ctcss', hz: v } });
            }}
          >
            <option value={0}>None</option>
            {CTCSS_TONES_HZ.map((hz) => (
              <option key={hz} value={hz}>
                {hz.toFixed(1)} Hz
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Downlink tone"
          hint="A tone the repeater sends. Most users leave this off — turn on only if you want to mute non-repeater traffic on the same frequency."
        >
          <select
            value={input.downlinkTone.kind === 'ctcss' ? input.downlinkTone.hz : 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v === 0) patch({ downlinkTone: { kind: 'none' } });
              else patch({ downlinkTone: { kind: 'ctcss', hz: v } });
            }}
          >
            <option value={0}>None (recommended)</option>
            {CTCSS_TONES_HZ.map((hz) => (
              <option key={hz} value={hz}>
                {hz.toFixed(1)} Hz
              </option>
            ))}
          </select>
        </Field>

        <p className="muted">
          Will save to <strong>{targetLabel}</strong>.
        </p>

        <div className="actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={onAdd} disabled={targetSlot < 0}>
            Add to channel
          </button>
        </div>
      </div>
    </div>
  );
}
