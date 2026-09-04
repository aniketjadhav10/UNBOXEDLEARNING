'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useInstallStore, type BeforeInstallPromptEvent } from './useInstallStore';

export function useInstallPrompt() {
  const { deferredPrompt, isInstalled, setDeferredPrompt } = useInstallStore();

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return { isInstallable: !!deferredPrompt, isInstalled, promptInstall };
}

/** Listens for the browser's install signals; mount once near the app root. */
export function InstallPromptListener() {
  const { setDeferredPrompt, setInstalled } = useInstallStore();

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) setInstalled(true);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [setDeferredPrompt, setInstalled]);

  return null;
}

/** Dismissible bottom banner shown once the browser signals the app is installable. */
export function InstallBanner() {
  const { deferredPrompt, isInstalled, bannerDismissed, dismissBanner, setDeferredPrompt } = useInstallStore();
  const show = !!deferredPrompt && !isInstalled && !bannerDismissed;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-3 right-3 z-[110] sm:left-1/2 sm:right-auto sm:w-[min(calc(100%-2rem),22rem)] sm:-translate-x-1/2 lg:bottom-6"
        >
          <div className="flex items-center gap-2 rounded-xl bg-nav-from px-3 py-2.5 text-white shadow-xl">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
              <Download size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold leading-tight">Install app</p>
              <p className="truncate text-xs text-white/70">Save for quick offline access.</p>
            </div>
            <button
              onClick={handleInstall}
              className="min-h-9 flex-shrink-0 rounded-lg bg-white px-3 text-xs font-semibold text-nav-from transition-colors hover:bg-white/90"
            >
              Install
            </button>
            <button
              onClick={dismissBanner}
              aria-label="Dismiss install prompt"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
