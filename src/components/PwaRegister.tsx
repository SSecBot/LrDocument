'use client';

import { useEffect } from 'react';
// Imported here (root layout) so the browser's install offer is caught as early as possible.
import '@/lib/pwaInstall';

/** Registers the service worker (public/sw.js) that makes LrDocument installable as an app. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
