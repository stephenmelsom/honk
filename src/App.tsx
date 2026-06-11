import { useEffect, useRef, useState } from 'react';
import { ChannelTable } from './ui/ChannelTable.tsx';
import { ChannelEditor } from './ui/ChannelEditor.tsx';
import { ChannelOrganizer } from './ui/ChannelOrganizer.tsx';
import { SettingsEditor } from './ui/SettingsEditor.tsx';
import { NewBlankButton, OpenImageButton, SaveImageButton } from './ui/ImportExport.tsx';
import { CsvImporter } from './ui/CsvImporter.tsx';
import { RepeaterWizard } from './ui/RepeaterWizard.tsx';
import { PresetPicker } from './ui/PresetPicker.tsx';
import { ConnectWizard, WriteToRadioButton } from './ui/ConnectWizard.tsx';
import { RadioPicker } from './ui/RadioPicker.tsx';
import { ToastViewport } from './ui/Toast.tsx';
import { hasWebSerial } from './serial/capability.ts';
import { useHonk } from './state/store.ts';
import { duplexDescription, formatMhz } from './radio/format.ts';
import { isFreqInBands } from './radios/util.ts';
import type { RadioModel } from './radios/types.ts';
import type { Channel } from './image/schema.ts';

type Modal = 'none' | 'repeater' | 'presets' | 'connect' | 'organize';
type InspectorTab = 'channel' | 'settings';

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
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('channel');
  const supportsSerial = hasWebSerial();
  const radio = useHonk((s) => s.radio);
  const supportsDirectClone = supportsSerial && !!radio.serial;
  const channels = useHonk((s) => s.image.channels);
  const selected = useHonk((s) => s.selectedChannel);
  const selectedChannel = channels[selected] ?? null;
  const dirty = useHonk((s) => s.dirty);
  const imageSource = useHonk((s) => s.imageSource);
  const programmedCount = channels.filter((channel) => channel !== null).length;
  const warnings = buildReviewWarnings(channels, radio);
  const sourceLabel =
    imageSource === 'blank'
      ? 'New blank image'
      : imageSource === 'file'
        ? 'Opened from image file'
        : 'Read from radio';

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>
            <span className="logo">🪿</span> honk
          </h1>
          <p className="tagline">Radio image editor for programmable handhelds</p>
        </div>
        <RadioPicker />
      </header>

      <section className="source-panel" aria-label="Source">
        <div className="source-copy">
          <span className="section-kicker">Source</span>
          <h2>{sourceLabel}</h2>
          <p>
            {radio.label} · {programmedCount} of {channels.length} channels programmed
            {dirty ? ' · unsaved changes' : ''}
          </p>
        </div>
        <div className="source-actions">
          {supportsDirectClone && (
            <button onClick={() => setModal('connect')}>Read from radio</button>
          )}
          <OpenImageButton />
          <NewBlankButton />
        </div>
      </section>

      {!supportsSerial && (
        <p className="banner">
          This browser doesn't support direct radio connections. You can still open and
          save radio image files exported from CHIRP or ADMS — try Chrome or Edge to talk
          to your radio over USB.
        </p>
      )}

      <main className="workspace">
        <section className="channel-workspace">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Channels</span>
              <h2>Memory slots</h2>
            </div>
            <div className="toolbar channel-actions">
              <button onClick={() => setModal('repeater')}>
                Add repeater
              </button>
              <button onClick={() => setModal('presets')}>Add channel pack</button>
              <CsvImporter />
              <button onClick={() => setModal('organize')}>Organize</button>
            </div>
          </div>
          <ChannelTable />
        </section>

        <aside className="inspector-column" aria-label="Inspector">
          <SelectedChannelSummary
            channel={selectedChannel}
            index={selected}
            radio={radio}
          />
          <div className="right-panel">
            <div className="tabs" role="tablist" aria-label="Inspector">
              <button
                type="button"
                role="tab"
                aria-selected={inspectorTab === 'channel'}
                className={inspectorTab === 'channel' ? 'active' : ''}
                onClick={() => setInspectorTab('channel')}
              >
                Channel
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inspectorTab === 'settings'}
                className={inspectorTab === 'settings' ? 'active' : ''}
                onClick={() => setInspectorTab('settings')}
              >
                Radio settings
              </button>
            </div>
            {inspectorTab === 'channel' && <ChannelEditor />}
            {inspectorTab === 'settings' && <SettingsEditor />}
          </div>
        </aside>
      </main>

      <section className="review-bar" aria-label="Review and output">
        <div>
          <span className="section-kicker">Review</span>
          <p>
            {warnings.length === 0
              ? 'No channel warnings found.'
              : `${warnings.length} warning${warnings.length === 1 ? '' : 's'} to review before writing.`}
          </p>
          {warnings.length > 0 && (
            <ul className="warning-list">
              {warnings.slice(0, 3).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="output-actions">
          <SaveImageButton />
          {supportsDirectClone && <WriteToRadioButton warnings={warnings} />}
        </div>
      </section>

      <SupportButtons />

      {modal === 'repeater' && <RepeaterWizard onClose={() => setModal('none')} />}
      {modal === 'presets' && <PresetPicker onClose={() => setModal('none')} />}
      {modal === 'connect' && <ConnectWizard onClose={() => setModal('none')} />}
      {modal === 'organize' && (
        <div className="modal-overlay" onClick={() => setModal('none')}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <ChannelOrganizer />
            <div className="actions">
              <button onClick={() => setModal('none')}>Close</button>
            </div>
          </div>
        </div>
      )}

      <ToastViewport />
    </div>
  );
}

function bandOf(hz: number, radio: RadioModel): 'VHF' | 'UHF' | null {
  const { vhf, uhf } = radio.frequencyLimits;
  if (vhf && hz >= vhf[0] && hz <= vhf[1]) return 'VHF';
  if (uhf && hz >= uhf[0] && hz <= uhf[1]) return 'UHF';
  return null;
}

function SelectedChannelSummary({
  channel,
  index,
  radio,
}: {
  channel: Channel | null;
  index: number;
  radio: RadioModel;
}) {
  const chanLabel = String(index + 1).padStart(3, '0');

  if (!channel) {
    return (
      <section className="selected-summary empty-summary">
        <span className="section-kicker">Display</span>
        <div className="lcd lcd-off">
          <div className="lcd-top">
            <span className="lcd-chan">CH {chanLabel}</span>
            <span className="lcd-tag">OFF</span>
          </div>
          <div className="lcd-readout">
            <span className="lcd-ghost" aria-hidden="true">888.8888</span>
            <span className="lcd-value lcd-dim">———.————</span>
          </div>
          <div className="lcd-bottom">
            <span className="lcd-name">empty memory</span>
            <span className="lcd-unit">MHz</span>
          </div>
        </div>
      </section>
    );
  }

  const duplex = duplexDescription(channel.rxHz, channel.txHz);
  const offsetLabel =
    duplex.kind === 'simplex'
      ? 'simplex'
      : duplex.kind === 'off'
        ? 'TX off'
        : duplex.kind === 'split'
          ? `split ${duplex.offsetMhz.toFixed(4)} MHz`
          : `${duplex.kind === 'plus' ? '+' : '-'}${duplex.offsetMhz.toFixed(3)} MHz`;

  const band = bandOf(channel.rxHz, radio);
  const txOutOfBand = channel.txHz !== -1 && !isFreqInBands(channel.txHz, radio);
  const status =
    band === null
      ? { label: 'Out of band', warn: true }
      : txOutOfBand
        ? { label: `${band} · TX out of band`, warn: true }
        : { label: band, warn: false };

  return (
    <section className="selected-summary">
      <span className="section-kicker">Display</span>
      <div className="lcd">
        <div className="lcd-top">
          <span className="lcd-chan">CH {chanLabel}</span>
          <span className="lcd-tag lcd-rx">
            <i className="led" aria-hidden="true" /> RX
          </span>
        </div>
        <div className="lcd-readout">
          <span className="lcd-ghost" aria-hidden="true">888.8888</span>
          <span className="lcd-value">{formatMhz(channel.rxHz)}</span>
        </div>
        <div className="lcd-bottom">
          <span className="lcd-name">{channel.name || 'unnamed'}</span>
          <span className="lcd-unit">MHz</span>
        </div>
      </div>
      <p className="summary-meta">
        <span>{offsetLabel}</span>
        <span className={status.warn ? 'summary-band warn' : 'summary-band'}>
          {status.label}
        </span>
      </p>
    </section>
  );
}

function buildReviewWarnings(
  channels: (Channel | null)[],
  radio: RadioModel,
) {
  const warnings: string[] = [];
  channels.forEach((channel, index) => {
    if (!channel) return;
    if (!isFreqInBands(channel.rxHz, radio)) {
      warnings.push(`Channel ${index + 1}: receive frequency is outside ${radio.label} bands.`);
    }
    if (channel.txHz !== -1 && !isFreqInBands(channel.txHz, radio)) {
      warnings.push(`Channel ${index + 1}: transmit frequency is outside ${radio.label} bands.`);
    }
    if (!channel.name.trim()) {
      warnings.push(`Channel ${index + 1}: no display name.`);
    }
  });
  return warnings;
}
