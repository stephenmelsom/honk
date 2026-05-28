import { useState } from 'react';
import { useHonk } from '../state/store.ts';
import { listRadios } from '../radios/index.ts';

export function RadioPicker() {
  const radio = useHonk((s) => s.radio);
  const dirty = useHonk((s) => s.dirty);
  const setRadio = useHonk((s) => s.setRadio);
  const radios = listRadios();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const displayId = pendingId ?? radio.id;

  return (
    <div className="radio-picker-wrap">
      <label className="radio-picker tagline">
        Radio:
        <select
          value={displayId}
          onChange={(e) => {
            const id = e.target.value;
            if (id === radio.id) {
              setPendingId(null);
              return;
            }
            if (dirty) {
              setPendingId(id);
            } else {
              setRadio(id);
            }
          }}
          aria-label="Radio model"
        >
          {radios.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      {pendingId && (
        <div className="radio-switch-confirm">
          <span className="muted small">Switch and lose changes?</span>
          <button
            type="button"
            onClick={() => {
              setRadio(pendingId);
              setPendingId(null);
            }}
          >
            Switch
          </button>
          <button type="button" onClick={() => setPendingId(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
