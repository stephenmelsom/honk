import type { ReactNode } from 'react';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && (
          <span className="field-hint" title={hint}>
            ?
          </span>
        )}
      </span>
      <span className="field-input">{children}</span>
    </label>
  );
}
