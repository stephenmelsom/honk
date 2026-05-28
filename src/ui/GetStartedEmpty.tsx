import { useRef } from 'react';
import { useHonk } from '../state/store.ts';
import { useToast } from './toastStore.ts';
import { CsvImporter } from './CsvImporter.tsx';

interface Props {
  supportsDirectClone: boolean;
  onReadFromRadio: () => void;
  onAddChannelPack: () => void;
  onAddRepeater: () => void;
}

export function GetStartedEmpty({
  supportsDirectClone,
  onReadFromRadio,
  onAddChannelPack,
  onAddRepeater,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadImage = useHonk((s) => s.loadImage);
  const showToast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const buf = new Uint8Array(await f.arrayBuffer());
    try {
      loadImage(buf, 'file');
    } catch (err) {
      showToast({ kind: 'error', message: `Could not read image file: ${(err as Error).message}` });
    }
    e.target.value = '';
  };

  return (
    <div className="get-started-wrap">
      <div className="get-started">
        {supportsDirectClone && (
          <div className="get-started-card">
            <span className="get-started-card-title">Read from your radio</span>
            <span className="get-started-card-desc muted small">
              Connect via USB and pull channels directly from the radio.
            </span>
            <button type="button" onClick={onReadFromRadio}>
              Connect radio
            </button>
          </div>
        )}
        <div className="get-started-card">
          <span className="get-started-card-title">Open an image file</span>
          <span className="get-started-card-desc muted small">
            Load a .img or .dat file from CHIRP or a previous honk save.
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".img,.dat,application/octet-stream"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Open file
          </button>
        </div>
        <div className="get-started-card">
          <span className="get-started-card-title">Add a channel pack</span>
          <span className="get-started-card-desc muted small">
            Drop in a curated set of channels for your area or activity.
          </span>
          <button type="button" onClick={onAddChannelPack}>
            Browse packs
          </button>
        </div>
        <div className="get-started-card">
          <span className="get-started-card-title">Add a repeater</span>
          <span className="get-started-card-desc muted small">
            Enter a repeater's details and honk will fill in the rest.
          </span>
          <button type="button" onClick={onAddRepeater}>
            Add repeater
          </button>
        </div>
      </div>
      <div className="get-started-csv muted small">
        <CsvImporter />
      </div>
    </div>
  );
}
