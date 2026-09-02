// RentFlex Offline-First Background Synchronization Engine
import { queryClientInstance } from './query-client';
import { toast } from 'sonner';

const QUEUE_KEY = 'rentflex_offline_mutations_queue';
const CACHE_PREFIX = 'rentflex_entity_cache_';
const LOCAL_API_BASE = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:5000/api';

// Listeners for UI notification
const listeners = new Set();
const notifyListeners = (state) => {
    listeners.forEach((listener) => listener(state));
};

export const getOfflineQueue = () => {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveOfflineQueue = (queue) => {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        notifyListeners({
            queueLength: queue.length,
            isOnline: navigator.onLine,
        });
    } catch (e) {
        console.error('Failed to save offline queue:', e);
    }
};

export const enqueueOfflineMutation = (entityName, action, data, id = null) => {
    const queue = getOfflineQueue();
    const mutationId = `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newEntry = {
        mutationId,
        entityName,
        action, // 'create' | 'update' | 'delete'
        data,
        targetId: id || data?.id || `temp_${Date.now()}`,
        timestamp: new Date().toISOString(),
        retryCount: 0
    };

    queue.push(newEntry);
    saveOfflineQueue(queue);

    // Apply mutation optimistically to local cache mirror
    applyOptimisticUpdate(entityName, action, newEntry.targetId, data);

    toast.info(`Offline Mode: Saved locally. Will sync to database automatically upon reconnection.`, {
        duration: 4000
    });

    return {
        ...data,
        id: newEntry.targetId,
        _isOfflinePending: true
    };
};

export const cacheEntityData = (entityName, data) => {
    try {
        if (!data) return;
        localStorage.setItem(`${CACHE_PREFIX}${entityName}`, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    } catch (e) {
        console.warn(`Could not cache entity ${entityName} data:`, e.message);
    }
};

export const getCachedEntityData = (entityName) => {
    try {
        const raw = localStorage.getItem(`${CACHE_PREFIX}${entityName}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        let items = parsed.data || [];

        // Overlay pending optimistic mutations on top of cached data
        const queue = getOfflineQueue().filter(m => m.entityName === entityName);
        if (Array.isArray(items)) {
            let mutableList = [...items];
            queue.forEach(mutation => {
                if (mutation.action === 'create') {
                    if (!mutableList.some(i => i.id === mutation.targetId)) {
                        mutableList.unshift({ ...mutation.data, id: mutation.targetId, _isOfflinePending: true });
                    }
                } else if (mutation.action === 'update') {
                    const idx = mutableList.findIndex(i => i.id === mutation.targetId);
                    if (idx !== -1) {
                        mutableList[idx] = { ...mutableList[idx], ...mutation.data, _isOfflinePending: true };
                    }
                } else if (mutation.action === 'delete') {
                    mutableList = mutableList.filter(i => i.id !== mutation.targetId);
                }
            });
            return mutableList;
        }
        return items;
    } catch {
        return null;
    }
};

const applyOptimisticUpdate = (entityName, action, targetId, data) => {
    try {
        const cached = getCachedEntityData(entityName);
        if (cached && Array.isArray(cached)) {
            let updated = [...cached];
            if (action === 'create') {
                updated.unshift({ ...data, id: targetId, _isOfflinePending: true });
            } else if (action === 'update') {
                const idx = updated.findIndex(i => i.id === targetId);
                if (idx !== -1) updated[idx] = { ...updated[idx], ...data, _isOfflinePending: true };
            } else if (action === 'delete') {
                updated = updated.filter(i => i.id !== targetId);
            }
            cacheEntityData(entityName, updated);
        }
    } catch (e) {
        console.warn('Error applying optimistic update:', e);
    }
};

let isSyncing = false;

export const processOfflineSync = async () => {
    if (isSyncing || !navigator.onLine) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    isSyncing = true;
    notifyListeners({ isSyncing: true, queueLength: queue.length, isOnline: true });

    const toastId = toast.loading(`Reconnecting: Synchronizing ${queue.length} pending update(s) to PostgreSQL...`);
    let successfulCount = 0;
    const failedMutations = [];

    for (const mutation of queue) {
        try {
            const { entityName, action, data, targetId } = mutation;
            let res;

            if (action === 'create') {
                // If it was a temporary id, remove it before sending to backend
                const cleanData = { ...data };
                if (String(cleanData.id).startsWith('temp_')) {
                    delete cleanData.id;
                }
                res = await fetch(`${LOCAL_API_BASE}/entities/${entityName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cleanData)
                });
            } else if (action === 'update') {
                res = await fetch(`${LOCAL_API_BASE}/entities/${entityName}/${targetId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else if (action === 'delete') {
                res = await fetch(`${LOCAL_API_BASE}/entities/${entityName}/${targetId}`, {
                    method: 'DELETE'
                });
            }

            if (res && (res.ok || res.status === 200 || res.status === 201 || res.status === 204)) {
                successfulCount++;
            } else {
                mutation.retryCount = (mutation.retryCount || 0) + 1;
                if (mutation.retryCount < 5) {
                    failedMutations.push(mutation);
                }
            }
        } catch (err) {
            console.error('Failed to replay mutation:', mutation, err);
            mutation.retryCount = (mutation.retryCount || 0) + 1;
            if (mutation.retryCount < 5) {
                failedMutations.push(mutation);
            }
        }
    }

    saveOfflineQueue(failedMutations);
    isSyncing = false;

    toast.dismiss(toastId);

    if (successfulCount > 0) {
        toast.success(`⚡ Synced: ${successfulCount} offline update(s) uploaded to PostgreSQL!`, {
            duration: 5000
        });
        // Invalidate all query caches to fetch fresh authoritative state from database
        queryClientInstance.invalidateQueries();
    }

    if (failedMutations.length > 0) {
        toast.error(`${failedMutations.length} updates will retry on next connection.`);
    }

    notifyListeners({ isSyncing: false, queueLength: failedMutations.length, isOnline: true });
};

// Global Network Listeners
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        toast.info('Network connection restored. Syncing pending data...');
        processOfflineSync();
    });

    window.addEventListener('offline', () => {
        toast.warning('Network disconnected. RentFlex is operating in offline mode.');
        notifyListeners({ isOnline: false, queueLength: getOfflineQueue().length, isSyncing: false });
    });

    // Periodic heartbeat sync check every 30 seconds
    setInterval(() => {
        if (navigator.onLine && getOfflineQueue().length > 0) {
            processOfflineSync();
        }
    }, 30000);
}

export const subscribeOfflineStatus = (callback) => {
    listeners.add(callback);
    callback({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        queueLength: getOfflineQueue().length,
        isSyncing
    });
    return () => listeners.delete(callback);
};
