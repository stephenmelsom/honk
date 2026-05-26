import { useRef } from 'react';
import { useHonk } from '../state/store.ts';
import { parseCsv } from '../radio/csv.ts';

export function CsvImporter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const channels = useHonk((s) => s.image.channels);
  const updateChannel = useHonk((s) => s.updateChannel);

  const onFile = async (file: File) => {
    const text = await file.text();
    const r = parseCsv(text);
    if (r.channels.length === 0) {
      alert('No channels found in CSV.');
      return;
    }
    let cursor = 0;
    let placed = 0;
    for (const ch of r.channels) {
      while (cursor < channels.length && channels[cursor] !== null) cursor++;
      if (cursor >= channels.length) break;
      updateChannel(cursor, ch);
      cursor++;
      placed++;
    }
    alert(
      `Imported ${placed} channel${placed === 1 ? '' : 's'}.` +
        (r.skipped.length ? ` Skipped ${r.skipped.length} row(s).` : ''),
    );
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = '';
        }}
      />
      <button onClick={() => inputRef.current?.click()}>Import CSV</button>
    </>
  );
}
