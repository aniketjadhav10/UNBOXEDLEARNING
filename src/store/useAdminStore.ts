import { create } from 'zustand';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface AdminState {
  selectedItem: Record<string, unknown> | null;
  loading: boolean;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
  toast: ToastState | null;
  setSelectedItem: (item: Record<string, unknown> | null) => void;
  setLoading: (loading: boolean) => void;
  openForm: (item?: Record<string, unknown> | null) => void;
  closeForm: () => void;
  openDelete: (item: Record<string, unknown>) => void;
  closeDelete: () => void;
  showToast: (toast: ToastState) => void;
  clearToast: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  selectedItem: null,
  loading: false,
  isFormOpen: false,
  isDeleteOpen: false,
  toast: null,
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setLoading: (loading) => set({ loading }),
  openForm: (item = null) => set({ selectedItem: item, isFormOpen: true }),
  closeForm: () => set({ selectedItem: null, isFormOpen: false }),
  openDelete: (item) => set({ selectedItem: item, isDeleteOpen: true }),
  closeDelete: () => set({ selectedItem: null, isDeleteOpen: false }),
  showToast: (toast) => {
    set({ toast });
    window.setTimeout(() => set({ toast: null }), 2600);
  },
  clearToast: () => set({ toast: null }),
}));
