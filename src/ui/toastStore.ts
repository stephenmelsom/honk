import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error' | 'warn';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  ttlMs: number;
}

interface ToastStore {
  toasts: Toast[];
  show: (opts: { kind: ToastKind; message: string; ttlMs?: number }) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: ({ kind, message, ttlMs = 4000 }) => {
    const id = `${Date.now()}-${Math.random()}`;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message, ttlMs }] }));
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  return useToastStore((s) => s.show);
}
