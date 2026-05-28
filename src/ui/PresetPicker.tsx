import { useEffect, useState } from 'react';
import { useHonk } from '../state/store.ts';
import { loadAllPresets } from '../presets/loader.ts';
import { presetToChannel } from '../presets/types.ts';
import type { PresetPack } from '../presets/types.ts';
import { useToast } from './toastStore.ts';

export function PresetPicker({ onClose }: { onClose: () => void }) {
  const [packs, setPacks] = useState<PresetPack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const channels = useHonk((s) => s.image.channels);
  const updateChannel = useHonk((s) => s.updateChannel);
  const showToast = useToast();

  useEffect(() => {
    void loadAllPresets(import.meta.env.BASE_URL.replace(/\/$/, ''))
      .then(setPacks)
      .catch((err: Error) => setError(err.message));
  }, []);

  const applyPack = (pack: PresetPack) => {
    const next = channels.slice();
    let cursor = 0;
    let placed = 0;
    for (const p of pack.channels) {
      while (cursor < next.length && next[cursor] !== null) cursor++;
      if (cursor >= next.length) break;
      next[cursor] = presetToChannel(p);
      placed++;
      cursor++;
    }
    if (placed === 0) {
      showToast({ kind: 'error', message: 'No empty channel slots available.' });
      return;
    }
    next.forEach((c, i) => {
      if (c !== channels[i]) updateChannel(i, c);
    });
    onClose();
    showToast({ kind: 'success', message: `Added ${placed} channel${placed === 1 ? '' : 's'} from ${pack.name}.` });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Channel packs</h2>
        <p className="muted">
          Pick a pack to drop its channels into your next free slots. Existing channels are
          untouched.
        </p>
        {error && <p className="error">Couldn't load packs: {error}</p>}
        <ul className="preset-list">
          {packs.map((pack) => (
            <li key={pack.id}>
              <div>
                <strong>{pack.name}</strong> — {pack.channels.length} channels
                <div className="muted small">{pack.description}</div>
              </div>
              <button onClick={() => applyPack(pack)}>Add</button>
            </li>
          ))}
        </ul>
        <div className="actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
