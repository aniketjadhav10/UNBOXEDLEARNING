'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, WifiOff } from 'lucide-react';
import { registerServiceWorker } from './registerServiceWorker';
import { getQueuedMutations, removeQueuedMutation } from '../offline/mutationQueue';
import { markPracticedToday } from '../services/taskService';
import { useToast } from '../store/useToastStore';

async function drainMutationQueue(toast: ReturnType<typeof useToast>) {
  const queue = await getQueuedMutations();
  if (queue.length === 0) return;

  let synced = 0;
  for (const item of queue) {
    try {
      await markPracticedToday(item.taskId, item.updates);
      await removeQueuedMutation(item.id);
      synced += 1;
    } catch {
      break; // still offline or a real failure — stop and retry on the next reconnect
    }
  }

  if (synced > 0) {
    toast.success(`Synced ${synced} offline update${synced === 1 ? '' : 's'}`);
    window.dispatchEvent(new CustomEvent('unboxed:queue-synced'));
  }
}

/** Registers the service worker, and surfaces update / offline-sync UX. Mount once near the app root. */
export function PwaManager() {
  const toast = useToast();
  const [updateReady, setUpdateReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const waitingRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    registerServiceWorker((registration) => {
      waitingRegRef.current = registration;
      setUpdateReady(true);
    });

    if (!('serviceWorker' in navigator)) return;
    const handleControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  useEffect(() => {
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine);

    const handleOnline = () => {
      setOffline(false);
      drainMutationQueue(toast);
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (typeof navigator !== 'undefined' && navigator.onLine) drainMutationQueue(toast);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyUpdate = () => {
    const registration = waitingRegRef.current;
    if (!registration?.waiting) return;
    registration.waiting.postMessage('SKIP_WAITING');
    setUpdateReady(false);
  };

  return (
    <>
      <AnimatePresence>
        {updateReady && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-2rem)] max-w-sm"
          >
            <div className="flex items-center gap-3 bg-nav-from text-white rounded-2xl shadow-xl px-4 py-3">
              <RefreshCw size={16} className="flex-shrink-0" />
              <p className="flex-1 text-sm font-semibold">A new version is ready</p>
              <button
                onClick={applyUpdate}
                className="flex-shrink-0 text-xs font-semibold bg-white text-nav-from rounded-lg px-3 py-1.5 hover:bg-white/90 transition-colors"
              >
                Refresh
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {offline && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[105] pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-gray-900 text-white rounded-full shadow-lg px-4 py-2 text-xs font-semibold">
              <WifiOff size={14} />
              You're offline — changes will sync when you're back
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
