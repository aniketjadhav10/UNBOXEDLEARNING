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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="flex items-center gap-3 bg-nav-from text-white rounded-2xl shadow-xl px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Download size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">Install UnBoxed Learning</p>
              <p className="text-xs text-white/70 mt-0.5">Add it to your home screen for quick, offline-ready access.</p>
            </div>
            <button
              onClick={handleInstall}
              className="flex-shrink-0 text-xs font-semibold bg-white text-nav-from rounded-lg px-3 py-2 hover:bg-white/90 transition-colors"
            >
              Install
            </button>
            <button
              onClick={dismissBanner}
              aria-label="Dismiss install prompt"
              className="flex-shrink-0 p-1 text-white/50 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
