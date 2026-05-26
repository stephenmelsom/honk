import { useState } from 'react';
import { ChannelTable } from './ui/ChannelTable.tsx';
import { ChannelEditor } from './ui/ChannelEditor.tsx';
import { ImportExport } from './ui/ImportExport.tsx';
import { CsvImporter } from './ui/CsvImporter.tsx';
import { RepeaterWizard } from './ui/RepeaterWizard.tsx';
import { PresetPicker } from './ui/PresetPicker.tsx';
import { ConnectWizard, WriteToRadioButton } from './ui/ConnectWizard.tsx';
import { hasWebSerial } from './serial/capability.ts';

type Modal = 'none' | 'repeater' | 'presets' | 'connect';

export function App() {
  const [modal, setModal] = useState<Modal>('none');
  const supportsSerial = hasWebSerial();

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          <span className="logo">🪿</span> honk
        </h1>
        <span className="tagline">Easy radio programming for the Baofeng UV-82L</span>
      </header>

      <section className="toolbar-row">
        <ImportExport />
        <div className="toolbar">
          {supportsSerial && (
            <>
              <button onClick={() => setModal('connect')}>Read from radio…</button>
              <WriteToRadioButton />
            </>
          )}
          <button onClick={() => setModal('repeater')}>+ Repeater</button>
          <button onClick={() => setModal('presets')}>+ Channel pack…</button>
          <CsvImporter />
        </div>
      </section>

      {!supportsSerial && (
        <p className="banner">
          This browser doesn't support direct radio connections. You can still open and
          save <code>.img</code> files exported from CHIRP — try Chrome or Edge to talk
          to your radio over USB.
        </p>
      )}

      <div className="split">
        <ChannelTable />
        <ChannelEditor />
      </div>

      {modal === 'repeater' && <RepeaterWizard onClose={() => setModal('none')} />}
      {modal === 'presets' && <PresetPicker onClose={() => setModal('none')} />}
      {modal === 'connect' && <ConnectWizard onClose={() => setModal('none')} />}
    </div>
  );
}
