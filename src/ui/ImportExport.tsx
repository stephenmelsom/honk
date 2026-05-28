import { useRef } from 'react';
import { useHonk } from '../state/store.ts';
import { downloadBlob } from '../utils/download.ts';
import { useToast } from './toastStore.ts';

export function OpenImageButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const loadImage = useHonk((s) => s.loadImage);
  const showToast = useToast();

  const onFile = async (file: File) => {
    const buf = new Uint8Array(await file.arrayBuffer());
    try {
      loadImage(buf, 'file');
    } catch (err) {
      showToast({ kind: 'error', message: `Could not read image file: ${(err as Error).message}` });
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".img,.dat,application/octet-stream"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = '';
        }}
      />
      <button onClick={() => inputRef.current?.click()}>Open image</button>
    </>
  );
}

export function NewBlankButton() {
  const newBlankImage = useHonk((s) => s.newBlankImage);

  return <button onClick={() => newBlankImage()}>New blank</button>;
}

export function SaveImageButton() {
  const exportImage = useHonk((s) => s.exportImage);
  const radio = useHonk((s) => s.radio);

  const onExport = () => {
    const bytes = exportImage();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const extension = radio.imageCodec === 'yaesu-ftm' ? 'dat' : 'img';
    downloadBlob(bytes, `honk-${radio.id}-${stamp}.${extension}`, 'application/octet-stream');
  };

  return <button onClick={onExport}>Save {radio.imageCodec === 'yaesu-ftm' ? '.dat' : '.img'}</button>;
}

export function ImportExport() {
  const dirty = useHonk((s) => s.dirty);
  const imageSource = useHonk((s) => s.imageSource);

  return (
    <section className="toolbar">
      <OpenImageButton />
      <SaveImageButton />
      <NewBlankButton />
      <span className="status">
        {imageSource === 'blank' && 'New image'}
        {imageSource === 'file' && 'Loaded from file'}
        {imageSource === 'radio' && 'Read from radio'}
        {dirty && ' • unsaved changes'}
      </span>
    </section>
  );
}
