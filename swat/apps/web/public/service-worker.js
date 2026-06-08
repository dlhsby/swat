/* SWAT service worker — skeleton.
 * Phase 0 wires the registration lifecycle only. Full offline support
 * (app-shell precache + network-first API with stale fallback) lands in Phase 5
 * per specs/13-design/01-design-system.md §6.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op pass-through for now; the browser handles the request normally.
});
