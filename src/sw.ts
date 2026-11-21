/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkOnly, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

const SW_CACHE_VERSION = 'v3.12.0-real-2fa-avatar-settings';

// Bắt buộc Service Worker kích hoạt ngay lập tức và giành quyền kiểm soát mọi client
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Xóa sạch toàn bộ cache cũ khi activate version mới
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheName.includes(SW_CACHE_VERSION)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Tự động inject danh sách precache manifest khi build
precacheAndRoute(self.__WB_MANIFEST || []);

/**
 * Feature 20: PWA navigateFallbackDenylist & Network-Only bypass.
 * Ensures /downloads/ (APK binaries), /version.json, and backend /api/ requests
 * are never intercepted, swallowed, or cached as SPA index.html by the Service Worker.
 */
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/downloads/') ||
    url.pathname === '/version.json' ||
    url.pathname.startsWith('/api/'),
  new NetworkOnly()
);

const defaultHandler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(defaultHandler, {
  denylist: [/^\/downloads\/.*/, /^\/version\.json$/, /^\/api\/.*/]
});
registerRoute(navigationRoute);

/**
 * BUG-12: KaTeX Offline CDN Caching.
 * Intercepts external requests to KaTeX stylesheets and webfonts from cdn.jsdelivr.net,
 * storing them locally with CacheFirst strategy so LaTeX formulas render offline.
 */
registerRoute(
  ({ url }) =>
    url.origin === 'https://cdn.jsdelivr.net' &&
    (url.pathname.includes('/katex@') || url.pathname.includes('/fonts/KaTeX_')),
  new CacheFirst({
    cacheName: 'katex-cdn-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
      })
    ]
  })
);

