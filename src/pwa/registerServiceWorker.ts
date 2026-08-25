// src/pwa/registerServiceWorker.ts — registers the service worker and reports
// back an already-waiting worker (an update ready to activate).
export function registerServiceWorker(onUpdateWaiting: (reg: ServiceWorkerRegistration) => void) {
  if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

  const doRegister = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      if (registration.waiting && registration.active) {
        onUpdateWaiting(registration);
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && registration.active) {
            onUpdateWaiting(registration);
          }
        });
      });
    } catch (error) {
      console.warn('Service worker registration failed', error);
    }
  };

  // By the time this client-component effect runs (post-hydration), the
  // window `load` event has often already fired — don't wait for an event
  // that already passed.
  if (document.readyState === 'complete') {
    doRegister();
  } else {
    window.addEventListener('load', doRegister);
  }
}
