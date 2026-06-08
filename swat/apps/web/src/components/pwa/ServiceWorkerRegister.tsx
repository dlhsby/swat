'use client';

import { useEffect } from 'react';

/**
 * Registers the service-worker skeleton in production. Full offline support
 * arrives in Phase 5; for now this only wires the registration lifecycle.
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Registration failures are non-fatal in Phase 0.
    });
  }, []);

  return null;
}
