// src/pwa/useInstallStore.ts — shared state for the `beforeinstallprompt` flow,
// consumed by both the install banner and the Settings "Install App" row.
import { create } from 'zustand';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  bannerDismissed: boolean;
  setDeferredPrompt: (e: BeforeInstallPromptEvent | null) => void;
  setInstalled: (v: boolean) => void;
  dismissBanner: () => void;
}

export const useInstallStore = create<InstallState>((set) => ({
  deferredPrompt: null,
  isInstalled: false,
  bannerDismissed: false,
  setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt }),
  setInstalled: (isInstalled) => set((s) => ({ isInstalled, deferredPrompt: isInstalled ? null : s.deferredPrompt })),
  dismissBanner: () => set({ bannerDismissed: true }),
}));
