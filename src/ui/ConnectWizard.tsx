import { useState } from 'react';
import { useHonk } from '../state/store.ts';
import { hasWebSerial } from '../serial/capability.ts';
import { readFromRadio, writeToRadio } from '../serial/session.ts';

type Step = 'intro' | 'cable' | 'reading' | 'done' | 'error';

export function ConnectWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('intro');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const loadImage = useHonk((s) => s.loadImage);
  const radio = useHonk((s) => s.radio);

  const supported = hasWebSerial();

  const startRead = async () => {
    setStep('reading');
    setProgress(0);
    try {
      const bytes = await readFromRadio(radio, (f) => setProgress(f));
      loadImage(bytes, 'radio');
      setStep('done');
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStep('error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {!supported && (
          <>
            <h2>Browser not supported</h2>
            <p>
              honk talks to the radio using the Web Serial API, which only works in
              Chrome, Edge, Opera, and other Chromium-based browsers. Try one of those.
            </p>
            <p className="muted">
              You can still open and save <code>.img</code> files exported from CHIRP in any
              browser.
            </p>
            <div className="actions">
              <button onClick={onClose}>OK</button>
            </div>
          </>
        )}

        {supported && step === 'intro' && (
          <>
            <h2>Read from your {radio.label}</h2>
            <p>
              We'll walk through two quick steps to copy your radio's current channels
              into honk. After that you can edit them and write them back.
            </p>
            <p className="muted small">
              Make sure the picker at the top matches your radio model before reading.
            </p>
            <ol className="steps">
              <li>Plug in your programming cable and turn the radio on</li>
              <li>Pick the cable from a browser prompt and let it read</li>
            </ol>
            <div className="actions">
              <button onClick={onClose}>Cancel</button>
              <button onClick={() => setStep('cable')}>Start</button>
            </div>
          </>
        )}

        {supported && step === 'cable' && (
          <>
            <h2>Step 1 of 2 — Cable</h2>
            <p>
              Plug your Baofeng programming cable (usually a USB-to-2.5/3.5mm plug)
              into the computer and the radio's side jack. Make sure the radio is
              turned on and the volume is up to roughly mid-level.
            </p>
            <p className="muted">
              First time on macOS? You may need to allow the USB driver in{' '}
              <em>System Settings → Privacy &amp; Security</em>.
            </p>
            <div className="actions">
              <button onClick={() => setStep('intro')}>Back</button>
              <button onClick={() => void startRead()}>Read radio →</button>
            </div>
          </>
        )}

        {supported && step === 'reading' && (
          <>
            <h2>Reading</h2>
            <p>A browser prompt should ask you to choose your cable's serial port.</p>
            <progress value={progress} max={1} />
            <p className="muted small">{Math.round(progress * 100)}%</p>
          </>
        )}

        {supported && step === 'done' && (
          <>
            <h2>Done!</h2>
            <p>Channels from your radio are loaded. You can edit, then come back to write them.</p>
            <div className="actions">
              <button onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {supported && step === 'error' && (
          <>
            <h2>Something went wrong</h2>
            <p className="error">{errorMsg}</p>
            <p className="muted">
              Common causes: the radio is off or asleep, the cable isn't fully seated,
              or another program (CHIRP, a serial monitor) is holding the port open.
            </p>
            <div className="actions">
              <button onClick={() => setStep('intro')}>Try again</button>
              <button onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function WriteToRadioButton() {
  const supported = hasWebSerial();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const exportImage = useHonk((s) => s.exportImage);
  const imageSource = useHonk((s) => s.imageSource);
  const radio = useHonk((s) => s.radio);

  if (!supported) return null;

  const onWrite = async () => {
    if (imageSource !== 'radio') {
      const ok = confirm(
        `You haven't read from this ${radio.label} yet. Writing without reading first could overwrite settings unique to your radio. Continue anyway?`,
      );
      if (!ok) return;
    }
    if (!confirm(`Write all channels and settings to the ${radio.label}?`)) return;
    setBusy(true);
    setProgress(0);
    try {
      await writeToRadio(radio, exportImage(), (f) => setProgress(f));
      alert('Done. Power-cycle the radio to use the new channels.');
    } catch (err) {
      alert(`Write failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={() => void onWrite()} disabled={busy}>
      {busy ? `Writing ${Math.round(progress * 100)}%` : 'Write to radio'}
    </button>
  );
}
