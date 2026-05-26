import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type HintPosition = {
  left: number;
  top: number;
};

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const [hintPosition, setHintPosition] = useState<HintPosition | null>(null);
  const hintId = useId();
  const hintRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!hintOpen) return;

    function positionHint() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setHintPosition({
        left: rect.left + rect.width / 2,
        top: rect.top,
      });
    }

    function onPointerDown(e: PointerEvent) {
      if (hintRef.current?.contains(e.target as Node)) return;
      setHintOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setHintOpen(false);
    }

    positionHint();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', positionHint);
    window.addEventListener('scroll', positionHint, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', positionHint);
      window.removeEventListener('scroll', positionHint, true);
    };
  }, [hintOpen]);

  function toggleHint(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setHintOpen((open) => !open);
  }

  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && (
          <span className="field-hint-wrap" ref={hintRef}>
            <button
              aria-describedby={hintOpen ? hintId : undefined}
              aria-expanded={hintOpen}
              aria-label={`${label} hint`}
              className="field-hint"
              onClick={toggleHint}
              ref={buttonRef}
              type="button"
            >
              ?
            </button>
            {hintOpen &&
              hintPosition &&
              createPortal(
                <span
                  className="field-hint-popover"
                  id={hintId}
                  role="tooltip"
                  style={{
                    left: hintPosition.left,
                    top: hintPosition.top,
                  }}
                >
                  {hint}
                </span>,
                document.body,
              )}
          </span>
        )}
      </span>
      <span className="field-input">{children}</span>
    </label>
  );
}
