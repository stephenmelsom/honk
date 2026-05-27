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
  const directCloneSupported = !!radio.serial;

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
        {(!supported || !directCloneSupported) && (
          <>
            <h2>{supported ? 'Direct cloning not supported' : 'Browser not supported'}</h2>
            {supported ? (
              <p>
                {radio.label} support is limited to opening and saving compatible image
                files; direct Web Serial read/write is not enabled for this model yet.
              </p>
            ) : (
              <p>
                honk talks to the radio using the Web Serial API, which only works in
                Chrome, Edge, Opera, and other Chromium-based browsers. Try one of those.
              </p>
            )}
            <p className="muted">You can still open and save radio image files in any browser.</p>
            <div className="actions">
              <button onClick={onClose}>OK</button>
            </div>
          </>
        )}

        {supported && directCloneSupported && step === 'intro' && (
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

        {supported && directCloneSupported && step === 'cable' && (
          <>
            <h2>Step 1 of 2 — Cable</h2>
            <p>
              Plug your radio programming cable into the computer and the radio's
              accessory jack. Make sure the radio is
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

        {supported && directCloneSupported && step === 'reading' && (
          <>
            <h2>Reading</h2>
            <p>A browser prompt should ask you to choose your cable's serial port.</p>
            <progress value={progress} max={1} />
            <p className="muted small">{Math.round(progress * 100)}%</p>
          </>
        )}

        {supported && directCloneSupported && step === 'done' && (
          <>
            <h2>Done!</h2>
            <p>Channels from your radio are loaded. You can edit, then come back to write them.</p>
            <div className="actions">
              <button onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {supported && directCloneSupported && step === 'error' && (
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

export function WriteToRadioButton({ warnings = [] }: { warnings?: string[] }) {
  const supported = hasWebSerial();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ kind: 'idle' | 'done' | 'error'; message?: string }>(
    { kind: 'idle' },
  );
  const exportImage = useHonk((s) => s.exportImage);
  const imageSource = useHonk((s) => s.imageSource);
  const channels = useHonk((s) => s.image.channels);
  const radio = useHonk((s) => s.radio);
  const programmedCount = channels.filter((channel) => channel !== null).length;

  if (!supported || !radio.serial) return null;

  const onWrite = async () => {
    setBusy(true);
    setProgress(0);
    setResult({ kind: 'idle' });
    try {
      await writeToRadio(radio, exportImage(), (f) => setProgress(f));
      setResult({
        kind: 'done',
        message: 'Done. Power-cycle the radio to use the new channels.',
      });
    } catch (err) {
      setResult({ kind: 'error', message: `Write failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className="write-action"
        onClick={() => {
          setResult({ kind: 'idle' });
          setConfirmOpen(true);
        }}
        disabled={busy}
      >
        {busy ? `Writing ${Math.round(progress * 100)}%` : 'Write to radio'}
      </button>

      {confirmOpen && (
        <div className="modal-overlay" onClick={() => !busy && setConfirmOpen(false)}>
          <div className="modal write-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Write to {radio.label}?</h2>
            <p>
              This will replace channels and settings on the connected radio with the
              current image.
            </p>

            <dl className="write-summary">
              <div>
                <dt>Source</dt>
                <dd>
                  {imageSource === 'radio'
                    ? 'Read from radio'
                    : imageSource === 'file'
                      ? 'Opened from image file'
                      : 'New blank image'}
                </dd>
              </div>
              <div>
                <dt>Channels</dt>
                <dd>
                  {programmedCount} of {channels.length} programmed
                </dd>
              </div>
              <div>
                <dt>Review</dt>
                <dd>
                  {warnings.length === 0
                    ? 'No warnings'
                    : `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}
                </dd>
              </div>
            </dl>

            {imageSource !== 'radio' && (
              <p className="warn">
                This image was not read from the connected radio first, so model-specific
                settings may be overwritten.
              </p>
            )}

            {warnings.length > 0 && (
              <ul className="warning-list">
                {warnings.slice(0, 4).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}

            {busy && (
              <>
                <progress value={progress} max={1} />
                <p className="muted small">{Math.round(progress * 100)}%</p>
              </>
            )}

            {result.kind === 'done' && <p className="success">{result.message}</p>}
            {result.kind === 'error' && <p className="error">{result.message}</p>}

            <div className="actions">
              <button onClick={() => setConfirmOpen(false)} disabled={busy}>
                {result.kind === 'done' ? 'Close' : 'Cancel'}
              </button>
              {result.kind !== 'done' && (
                <button className="write-action" onClick={() => void onWrite()} disabled={busy}>
                  {busy ? 'Writing...' : 'Write to radio'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
