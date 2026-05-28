import { useEffect, useRef } from 'react';
import { useToastStore } from './toastStore.ts';
import type { Toast } from './toastStore.ts';

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  dismiss,
}: {
  toast: Toast;
  dismiss: (id: string) => void;
}) {
  const dismissRef = useRef(dismiss);
  const idRef = useRef(toast.id);
  useEffect(() => {
    dismissRef.current = dismiss;
  });

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(idRef.current), toast.ttlMs);
    return () => clearTimeout(timer);
  }, [toast.ttlMs]);

  return (
    <div className={`toast toast-${toast.kind}`} role="status">
      <span>{toast.message}</span>
      <button
        className="toast-close"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
