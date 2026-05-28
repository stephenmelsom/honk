import { useEffect, useRef, useState } from 'react';

interface Props {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}

export function InlineConfirmButton({ label, confirmLabel, onConfirm, className, disabled }: Props) {
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setPending(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (pending) {
    return (
      <span className="inline-confirm">
        <button
          type="button"
          className="inline-confirm-yes"
          onClick={() => { reset(); onConfirm(); }}
        >
          {confirmLabel ?? `Confirm ${label.toLowerCase()}`}
        </button>
        <button type="button" onClick={reset}>
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => {
        setPending(true);
        timerRef.current = setTimeout(reset, 5000);
      }}
    >
      {label}
    </button>
  );
}
