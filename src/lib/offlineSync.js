// RentFlex Offline-First Background Synchronization Engine
import { queryClientInstance } from './query-client';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { toast } from 'sonner';

const QUEUE_KEY = 'rentflex_offline_mutations_queue';
const CACHE_PREFIX = 'rentflex_entity_cache_';

const ENTITY_TABLE_MAP = {
    Property: 'properties',
    Lease: 'leases',
    Payment: 'payments',
    MaintenanceRequest: 'maintenance_requests',
    Job: 'jobs',
    ContractorBid: 'contractor_bids',
    Bid: 'bids',
    Contractor: 'contractors',
    RentScore: 'rent_scores',
    DepositDispute: 'deposit_disputes',
    Inspection: 'inspections',
    Message: 'messages',
    Application: 'applications',
    Profile: 'profiles',
};

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

    toast.info(`Offline Mode: Saved locally. Will sync to Supabase automatically upon reconnection.`, {
        duration: 4000
    });

    return {
        ...data,
        id: newEntry.targetId,
        _isOfflinePending: true
    };
};

export const cacheEntityData = (entityName, items) => {
    try {
        localStorage.setItem(`${CACHE_PREFIX}${entityName}`, JSON.stringify(items));
    } catch (e) {
        console.warn(`Failed to cache entity ${entityName}:`, e);
    }
};

export const getCachedEntityData = (entityName) => {
    try {
        const raw = localStorage.getItem(`${CACHE_PREFIX}${entityName}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const applyOptimisticUpdate = (entityName, action, targetId, data) => {
    try {
        const cached = getCachedEntityData(entityName);
        if (Array.isArray(cached)) {
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
    if (isSyncing || !navigator.onLine || !isSupabaseConfigured) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    isSyncing = true;
    notifyListeners({ isSyncing: true, queueLength: queue.length, isOnline: true });

    const toastId = toast.loading(`Reconnecting: Synchronizing ${queue.length} pending update(s) to Supabase...`);
    let successfulCount = 0;
    const failedMutations = [];

    for (const mutation of queue) {
        try {
            const { entityName, action, data, targetId } = mutation;
            const tableName = ENTITY_TABLE_MAP[entityName] || entityName.toLowerCase() + 's';
            let error = null;

            if (action === 'create') {
                const cleanData = { ...data };
                if (String(cleanData.id).startsWith('temp_')) {
                    delete cleanData.id;
                }
                const res = await supabase.from(tableName).insert([cleanData]);
                error = res.error;
            } else if (action === 'update') {
                const res = await supabase.from(tableName).update(data).eq('id', targetId);
                error = res.error;
            } else if (action === 'delete') {
                const res = await supabase.from(tableName).delete().eq('id', targetId);
                error = res.error;
            }

            if (!error) {
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
        toast.success(`⚡ Synced: ${successfulCount} offline update(s) uploaded to Supabase!`, {
            duration: 5000
        });
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

export const clearOldOfflineCache = () => {
    if (typeof window === 'undefined') return;
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(CACHE_PREFIX) || key === QUEUE_KEY)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
        console.warn('Failed to clear offline cache:', e);
    }
};
