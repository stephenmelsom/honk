import { useHonk } from '../state/store.ts';
import { listRadios } from '../radios/index.ts';

export function RadioPicker() {
  const radio = useHonk((s) => s.radio);
  const setRadio = useHonk((s) => s.setRadio);
  const radios = listRadios();

  return (
    <label className="radio-picker tagline">
      Radio:
      <select
        value={radio.id}
        onChange={(e) => setRadio(e.target.value)}
        aria-label="Radio model"
      >
        {radios.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}
