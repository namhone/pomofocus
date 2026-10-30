/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
cleanupOutdatedCaches();

// Tự động inject danh sách precache manifest khi build, an toàn trong môi trường dev
precacheAndRoute(self.__WB_MANIFEST || []);
