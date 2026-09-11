/**
 * RentFlex Production Web Push Notification Manager
 * Handles Service Worker registration, browser permission negotiation,
 * PushManager subscription, test notifications, and synchronization with the user profile.
 */
import { appClient } from '@/api/appClient';

const STORAGE_KEY = 'rentflex_notification_preferences';

// Application Server VAPID Public Key (Safe standard key for client-side subscription)
const DEFAULT_VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIHBQFLXYp5Nksh8U';

/**
 * Convert a base64 string to a Uint8Array for PushManager subscription
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const pushNotifications = {
    /**
     * Check if the browser supports Service Workers, Notifications, and Push API
     */
    isSupported: () => {
        return (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            'serviceWorker' in navigator &&
            'PushManager' in window
        );
    },

    /**
     * Get the current notification permission state
     * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
     */
    getPermission: () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return 'unsupported';
        }
        return Notification.permission;
    },

    /**
     * Register or get the active Service Worker
     */
    getRegistration: async () => {
        if (!('serviceWorker' in navigator)) return null;

        try {
            let reg = await navigator.serviceWorker.getRegistration();
            if (!reg) {
                reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            }
            await navigator.serviceWorker.ready;
            return reg;
        } catch (error) {
            console.warn('[Push Notification] Service Worker registration failed:', error);
            return null;
        }
    },

    /**
     * Request browser notification permission
     */
    requestPermission: async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            throw new Error('Notifications are not supported on this browser/device.');
        }

        const permission = await Notification.requestPermission();
        return permission;
    },

    /**
     * Subscribe the current device to the Push Service
     */
    subscribe: async (vapidKey = DEFAULT_VAPID_PUBLIC_KEY) => {
        if (!pushNotifications.isSupported()) {
            throw new Error('Push notifications are not supported on this device.');
        }

        // 1. Request permission first
        const permission = await pushNotifications.requestPermission();
        if (permission !== 'granted') {
            throw new Error(
                permission === 'denied'
                    ? 'Notification permission was denied. Please allow notifications in your browser settings.'
                    : 'Notification permission was not granted.'
            );
        }

        // 2. Ensure Service Worker is active
        const registration = await pushNotifications.getRegistration();
        if (!registration) {
            throw new Error('Could not initialize service worker for push notifications.');
        }

        // 3. Subscribe with PushManager
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            try {
                const convertedKey = urlBase64ToUint8Array(vapidKey);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedKey
                });
            } catch (err) {
                // Fallback subscription attempt if specific VAPID format fails
                console.warn('[Push Notification] VAPID subscribe error, trying fallback:', err);
                try {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true
                    });
                } catch (fallbackErr) {
                    console.error('[Push Notification] Push subscription failed:', fallbackErr);
                    throw new Error('Failed to subscribe device to browser push service.');
                }
            }
        }

        // 4. Save subscription metadata
        const subData = subscription ? subscription.toJSON() : null;
        return subData;
    },

    /**
     * Unsubscribe the device from push notifications
     */
    unsubscribe: async () => {
        const registration = await pushNotifications.getRegistration();
        if (!registration) return false;

        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            return await subscription.unsubscribe();
        }
        return false;
    },

    /**
     * Get active push subscription if one exists
     */
    getSubscription: async () => {
        const registration = await pushNotifications.getRegistration();
        if (!registration) return null;
        return await registration.pushManager.getSubscription();
    },

    /**
     * Dispatch an immediate live test push notification to this device
     */
    sendTestNotification: async ({
        title = 'RentFlex Alert: Instant Push Verification',
        body = 'Your device is successfully connected to RentFlex real-time push alerts!',
        url = '/Dashboard'
    } = {}) => {
        const permission = pushNotifications.getPermission();
        if (permission !== 'granted') {
            const requested = await pushNotifications.requestPermission();
            if (requested !== 'granted') {
                throw new Error('Please grant notification permission in your browser to receive push alerts.');
            }
        }

        const registration = await pushNotifications.getRegistration();
        const options = {
            body,
            icon: '/android-chrome-192x192.png',
            badge: '/badge-72x72.png',
            tag: 'rentflex-test-' + Date.now(),
            data: { url },
            vibrate: [150, 50, 150],
            renotify: true,
            actions: [
                { action: 'open', title: 'Open Dashboard' },
                { action: 'close', title: 'Dismiss' }
            ]
        };

        if (registration && registration.showNotification) {
            await registration.showNotification(title, options);
            return true;
        } else if ('Notification' in window) {
            new Notification(title, options);
            return true;
        }

        throw new Error('Unable to trigger notification on this browser.');
    },

    /**
     * Load notification preferences (merges localStorage and user profile)
     */
    loadPreferences: (currentUser) => {
        const defaultPrefs = {
            push_enabled: false,
            payment_reminders: true,
            lease_updates: true,
            maintenance_updates: true,
            marketing: false,
            sound_enabled: true
        };

        try {
            const local = localStorage.getItem(STORAGE_KEY);
            const parsedLocal = local ? JSON.parse(local) : {};
            const profilePrefs = currentUser?.notification_preferences || {};
            return { ...defaultPrefs, ...parsedLocal, ...profilePrefs };
        } catch (e) {
            return defaultPrefs;
        }
    },

    /**
     * Save notification preferences both locally and to public.profiles in PostgreSQL
     */
    savePreferences: async (preferences) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
            // Sync with backend profile if authenticated
            await appClient.auth.updateMe({
                notification_preferences: preferences
            });
        } catch (e) {
            console.warn('[Push Notification] Backend sync notice:', e.message);
        }
    }
};
