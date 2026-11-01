/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

const SW_CACHE_VERSION = 'v2.5.0-vietqr-live';

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
