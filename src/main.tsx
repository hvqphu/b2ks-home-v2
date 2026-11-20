import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { initB2KSGameEngine } from './game/b2ksGameEngine';

(window as unknown as { __B2KS_BOOTED__?: boolean }).__B2KS_BOOTED__ = true;

try {
  const hadController = Boolean(typeof navigator !== 'undefined' && navigator.serviceWorker?.controller);
  let reloadedForUpdate = false;
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloadedForUpdate) {
        reloadedForUpdate = true;
        window.location.reload();
      }
    });
  }
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        registration.update().catch(() => {});
      }
    },
    onNeedRefresh() {
      updateSW(true).catch(() => {});
    },
  });
} catch {
  // ignore service worker registration errors in restricted contexts
}

function bootB2KS() {
  initB2KSGameEngine();
  const rootEl = document.getElementById('root');
  if (rootEl) {
    createRoot(rootEl).render(<App />);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootB2KS, { once: true });
} else {
  bootB2KS();
}
