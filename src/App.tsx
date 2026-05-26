import { useEffect, useRef, useState } from 'react';
import { ChannelTable } from './ui/ChannelTable.tsx';
import { ChannelEditor } from './ui/ChannelEditor.tsx';
import { ChannelOrganizer } from './ui/ChannelOrganizer.tsx';
import { SettingsEditor } from './ui/SettingsEditor.tsx';
import { ImportExport } from './ui/ImportExport.tsx';
import { CsvImporter } from './ui/CsvImporter.tsx';
import { RepeaterWizard } from './ui/RepeaterWizard.tsx';
import { PresetPicker } from './ui/PresetPicker.tsx';
import { ConnectWizard, WriteToRadioButton } from './ui/ConnectWizard.tsx';
import { RadioPicker } from './ui/RadioPicker.tsx';
import { hasWebSerial } from './serial/capability.ts';

type Modal = 'none' | 'repeater' | 'presets' | 'connect';
type EditorTab = 'channels' | 'organize' | 'settings';

declare global {
  interface Window {
    GitHubButton?: {
      render: (anchor: HTMLAnchorElement, callback: (button: HTMLElement) => void) => void;
    };
  }
}

function SupportButtons() {
  const bmcButtonRef = useRef<HTMLDivElement>(null);
  const githubButtonRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const bmcButton = bmcButtonRef.current;
    if (!bmcButton) return;

    bmcButton.textContent = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js';
    script.dataset.name = 'bmc-button';
    script.dataset.slug = 'stephenmelsom';
    script.dataset.color = '#FFDD00';
    script.dataset.emoji = '';
    script.dataset.font = 'Cookie';
    script.dataset.text = 'Buy me some coax';
    script.dataset.outlineColor = '#000000';
    script.dataset.fontColor = '#000000';
    script.dataset.coffeeColor = '#ffffff';
    bmcButton.appendChild(script);

    return () => {
      bmcButton.textContent = '';
    };
  }, []);

  useEffect(() => {
    const renderButton = () => {
      const anchor = githubButtonRef.current;
      if (!anchor || !window.GitHubButton) return;

      window.GitHubButton.render(anchor, (button) => {
        button.classList.add('github-star-button');
        anchor.replaceWith(button);
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://buttons.github.io/buttons.js"]',
    );

    if (existingScript) {
      if (window.GitHubButton) {
        renderButton();
        return;
      }

      existingScript.addEventListener('load', renderButton, { once: true });
      return () => existingScript.removeEventListener('load', renderButton);
    }

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = 'https://buttons.github.io/buttons.js';
    script.addEventListener('load', renderButton, { once: true });
    document.body.appendChild(script);

    return () => script.removeEventListener('load', renderButton);
  }, []);

  return (
    <footer className="support-buttons" aria-label="Support and repository links">
      <div ref={bmcButtonRef} className="bmc-script-button" />
      <a
        href="https://www.buymeacoffee.com/stephenmelsom"
        target="_blank"
        rel="noreferrer"
      >
        <img
          src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
          alt="Buy Me a Coffee"
          className="bmc-image-button"
        />
      </a>
      <a
        ref={githubButtonRef}
        className="github-button"
        href="https://github.com/stephenmelsom/honk"
        data-color-scheme="no-preference: dark; light: dark; dark: dark;"
        data-icon="octicon-star"
        data-size="large"
        aria-label="Star stephenmelsom/honk on GitHub"
      >
        Star
      </a>
    </footer>
  );
}

export function App() {
  const [modal, setModal] = useState<Modal>('none');
  const [editorTab, setEditorTab] = useState<EditorTab>('channels');
  const supportsSerial = hasWebSerial();

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          <span className="logo">🪿</span> honk
        </h1>
        <RadioPicker />
      </header>

      <section className="toolbar-row">
        <ImportExport />
        <div className="toolbar">
          {supportsSerial && (
            <>
              <button onClick={() => setModal('connect')}>Read from radio</button>
              <WriteToRadioButton />
            </>
          )}
          <button onClick={() => setModal('repeater')}>+ Repeater</button>
          <button onClick={() => setModal('presets')}>+ Channel pack</button>
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
        <section className="right-column">
          <h2>Edit</h2>
          <div className="right-panel">
            <div className="tabs" role="tablist" aria-label="Editor">
              <button
                type="button"
                role="tab"
                aria-selected={editorTab === 'channels'}
                className={editorTab === 'channels' ? 'active' : ''}
                onClick={() => setEditorTab('channels')}
              >
                Channels
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={editorTab === 'organize'}
                className={editorTab === 'organize' ? 'active' : ''}
                onClick={() => setEditorTab('organize')}
              >
                Organize
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={editorTab === 'settings'}
                className={editorTab === 'settings' ? 'active' : ''}
                onClick={() => setEditorTab('settings')}
              >
                Settings
              </button>
            </div>
            {editorTab === 'channels' && <ChannelEditor />}
            {editorTab === 'organize' && <ChannelOrganizer />}
            {editorTab === 'settings' && <SettingsEditor />}
          </div>
        </section>
      </div>

      <SupportButtons />

      {modal === 'repeater' && <RepeaterWizard onClose={() => setModal('none')} />}
      {modal === 'presets' && <PresetPicker onClose={() => setModal('none')} />}
      {modal === 'connect' && <ConnectWizard onClose={() => setModal('none')} />}
    </div>
  );
}
