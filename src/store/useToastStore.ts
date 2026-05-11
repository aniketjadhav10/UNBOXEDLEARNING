// ============================================================
// store/useToastStore.ts — Global unified toast notification store
// Replaces both useAdminStore.showToast AND TaskToastContainer
// ============================================================
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms, default 3500
}

interface ToastStore {
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
  clear: () => void;
  // Convenience methods
  success: (message: string, title?: string) => void;
  error:   (message: string, title?: string) => void;
  info:    (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

let toastSeq = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  add(toast) {
    const id = `toast-${++toastSeq}`;
    const duration = toast.duration ?? 3500;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().remove(id), duration);
  },

  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  clear() {
    set({ toasts: [] });
  },

  success: (message, title) => useToastStore.getState().add({ type: 'success', message, title }),
  error:   (message, title) => useToastStore.getState().add({ type: 'error',   message, title }),
  info:    (message, title) => useToastStore.getState().add({ type: 'info',    message, title }),
  warning: (message, title) => useToastStore.getState().add({ type: 'warning', message, title }),
}));

// ── Convenience hook ─────────────────────────────────────────
export function useToast() {
  const { success, error, info, warning } = useToastStore();
  return { success, error, info, warning };
}
