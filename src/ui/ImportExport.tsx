import { useRef } from 'react';
import { useHonk } from '../state/store.ts';
import { downloadBlob } from '../utils/download.ts';

export function ImportExport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const loadImage = useHonk((s) => s.loadImage);
  const newBlankImage = useHonk((s) => s.newBlankImage);
  const exportImage = useHonk((s) => s.exportImage);
  const dirty = useHonk((s) => s.dirty);
  const imageSource = useHonk((s) => s.imageSource);

  const onFile = async (file: File) => {
    const buf = new Uint8Array(await file.arrayBuffer());
    try {
      loadImage(buf, 'file');
    } catch (err) {
      alert(`Could not read .img file: ${(err as Error).message}`);
    }
  };

  const onExport = () => {
    const bytes = exportImage();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadBlob(bytes, `honk-${stamp}.img`, 'application/octet-stream');
  };

  return (
    <section className="toolbar">
      <input
        ref={inputRef}
        type="file"
        accept=".img,application/octet-stream"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = '';
        }}
      />
      <button onClick={() => inputRef.current?.click()}>Open .img</button>
      <button onClick={onExport}>Save .img</button>
      <button onClick={() => newBlankImage()}>New blank</button>
      <span className="status">
        {imageSource === 'blank' && 'New image'}
        {imageSource === 'file' && 'Loaded from file'}
        {imageSource === 'radio' && 'Read from radio'}
        {dirty && ' • unsaved changes'}
      </span>
    </section>
  );
}
