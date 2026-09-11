// RentFlex Production Service Worker & Push Notification Engine
// Version: 2.0.0
const CACHE_NAME = 'rentflex-v2-cache';

const STATIC_PWA_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/maskable-icon-192x192.png',
    '/maskable-icon-512x512.png',
    '/badge-72x72.png',
    '/assets/rentflex-logo.png'
];

// 1. Install & Cache Shell Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_PWA_ASSETS);
        })
    );
    self.skipWaiting();
});

// 2. Activate & Purge Obsolete Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// 3. Network-First / Cache-Fallback Fetch Handler
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only process GET requests with standard HTTP or HTTPS schemes (ignore chrome-extension, file, blob, etc.)
    if (event.request.method !== 'GET' || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
        return;
    }

    // Let API and cross-origin auth requests bypass SW caching
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache).catch(() => { });
                    }).catch(() => { });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('/index.html');
                });
            })
    );
});

// 4. Production Web Push Notification Handler
self.addEventListener('push', (event) => {
    let payload = {
        title: 'RentFlex Notification',
        body: 'You have a new update from RentFlex.',
        icon: '/android-chrome-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'rentflex-notification',
        data: { url: '/Dashboard' }
    };

    if (event.data) {
        try {
            const data = event.data.json();
            payload = {
                title: data.title || payload.title,
                body: data.body || payload.body,
                icon: data.icon || payload.icon,
                badge: data.badge || payload.badge,
                tag: data.tag || payload.tag,
                data: {
                    url: data.url || (data.data && data.data.url) || '/Dashboard'
                },
                vibrate: data.vibrate || [100, 50, 100],
                actions: data.actions || [
                    { action: 'open', title: 'View Details' },
                    { action: 'close', title: 'Dismiss' }
                ]
            };
        } catch (e) {
            // Text fallback
            payload.body = event.data.text() || payload.body;
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        data: payload.data,
        vibrate: payload.vibrate || [100, 50, 100],
        renotify: true,
        actions: payload.actions || [
            { action: 'open', title: 'View Details' },
            { action: 'close', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

// 5. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const targetUrl = (event.notification.data && event.notification.data.url) || '/Dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Focus if a window with this origin already exists
            for (let client of windowClients) {
                if (client.url && 'focus' in client) {
                    if (targetUrl && client.url.includes(targetUrl)) {
                        return client.focus();
                    } else if ('navigate' in client) {
                        client.navigate(targetUrl);
                        return client.focus();
                    }
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// 6. Push Subscription Change Event
self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(
        self.registration.pushManager.subscribe(event.oldSubscription.options)
            .then((subscription) => {
                // Post subscription to active client windows to sync with backend
                return self.clients.matchAll().then((clients) => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'PUSH_SUBSCRIPTION_CHANGED',
                            subscription: JSON.stringify(subscription)
                        });
                    });
                });
            })
            .catch((err) => {
                console.warn('Failed to resubscribe to push:', err);
            })
    );
});
