import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// 1. Import OneSignal SDK
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// 2. Standard PWA Caching (Workbox)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// 3. Listener for skipWaiting (auto-update)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
