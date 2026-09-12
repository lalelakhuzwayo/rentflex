import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { authActions } from './authActions';
import { 
    cacheEntityData, 
    getCachedEntityData, 
    enqueueOfflineMutation 
} from '@/lib/offlineSync';

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
    Inspection: 'inspections',
    Message: 'messages',
    Application: 'applications',
    Profile: 'profiles',
};

const normalizeItemNumbers = (data) => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(normalizeItemNumbers);
    }
    if (typeof data === 'object') {
        const item = { ...data };
        if ('monthly_rent' in item && item.monthly_rent !== null) item.monthly_rent = Number(item.monthly_rent);
        if ('deposit_amount' in item && item.deposit_amount !== null) item.deposit_amount = Number(item.deposit_amount);
        if ('amount' in item && item.amount !== null) item.amount = Number(item.amount);
        if ('score' in item && item.score !== null) item.score = Number(item.score);
        return item;
    }
    return data;
};

const createSupabaseEntityHandler = (entityName) => {
    const tableName = ENTITY_TABLE_MAP[entityName] || entityName.toLowerCase() + 's';

    return {
        list: async () => {
            if (!isSupabaseConfigured) {
                const cached = getCachedEntityData(entityName);
                return cached ? normalizeItemNumbers(cached) : [];
            }
            if (navigator.onLine) {
                try {
                    const { data, error } = await supabase.from(tableName).select('*');
                    if (error) {
                        console.error(`Supabase list error on ${tableName}:`, error);
                        const cached = getCachedEntityData(entityName);
                        return cached ? normalizeItemNumbers(cached) : [];
                    }
                    const normalized = normalizeItemNumbers(data || []);
                    cacheEntityData(entityName, normalized);
                    return normalized;
                } catch (e) {
                    console.warn(`Supabase network error on ${tableName}:`, e);
                }
            }
            const cached = getCachedEntityData(entityName);
            return cached ? normalizeItemNumbers(cached) : [];
        },
        filter: async (criteria = {}) => {
            if (!isSupabaseConfigured) {
                const cached = getCachedEntityData(entityName);
                if (cached && Array.isArray(cached)) {
                    return cached.filter(item => {
                        return Object.entries(criteria).every(([key, val]) => {
                            if (val === undefined || val === null) return true;
                            return item[key] === val || item[key] === String(val);
                        });
                    });
                }
                return [];
            }
            if (navigator.onLine) {
                try {
                    let query = supabase.from(tableName).select('*');
                    Object.entries(criteria).forEach(([key, val]) => {
                        if (val !== undefined && val !== null) {
                            query = query.eq(key, val);
                        }
                    });
                    const { data, error } = await query;
                    if (error) {
                        console.error(`Supabase filter error on ${tableName}:`, error);
                        return [];
                    }
                    return normalizeItemNumbers(data || []);
                } catch (e) {
                    console.warn(`Supabase filter error on ${tableName}:`, e);
                }
            }
            const cached = getCachedEntityData(entityName);
            if (cached && Array.isArray(cached)) {
                return cached.filter(item => {
                    return Object.entries(criteria).every(([key, val]) => {
                        if (val === undefined || val === null) return true;
                        return item[key] === val || item[key] === String(val);
                    });
                });
            }
            return [];
        },
        get: async (id) => {
            if (!isSupabaseConfigured) {
                const cached = getCachedEntityData(entityName);
                return (cached || []).find(item => item.id === id) || null;
            }
            if (navigator.onLine) {
                try {
                    const { data, error } = await supabase.from(tableName).select('*').eq('id', id).maybeSingle();
                    if (error) {
                        console.error(`Supabase get error on ${tableName}:`, error);
                        return null;
                    }
                    return normalizeItemNumbers(data);
                } catch (e) {
                    console.warn(`Supabase get error on ${tableName}:`, e);
                }
            }
            const cached = getCachedEntityData(entityName);
            return (cached || []).find(item => item.id === id) || null;
        },
        create: async (data) => {
            if (!isSupabaseConfigured) {
                throw new Error('Supabase is not configured.');
            }
            const { data: created, error } = await supabase.from(tableName).insert([data]).select().single();
            if (error) {
                console.error(`Supabase create error on ${tableName}:`, error);
                throw new Error(error.message || `Failed to create ${entityName}`);
            }
            return normalizeItemNumbers(created);
        },
        update: async (id, data) => {
            if (!isSupabaseConfigured) {
                throw new Error('Supabase is not configured.');
            }
            const { data: updated, error } = await supabase.from(tableName).update(data).eq('id', id).select().single();
            if (error) {
                console.error(`Supabase update error on ${tableName}:`, error);
                throw new Error(error.message || `Failed to update ${entityName}`);
            }
            return normalizeItemNumbers(updated);
        },
        delete: async (id) => {
            if (!isSupabaseConfigured) {
                throw new Error('Supabase is not configured.');
            }
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) {
                console.error(`Supabase delete error on ${tableName}:`, error);
                throw new Error(error.message || `Failed to delete ${entityName}`);
            }
            return { success: true };
        }
    };
};

let cachedCurrentUser = null;

export const appClient = {
    auth: {
        me: async () => {
            const user = await authActions.getCurrentUser();
            cachedCurrentUser = user;
            return user;
        },
        updateMe: async (data) => {
            const updated = await authActions.updateUserProfile(data);
            cachedCurrentUser = { ...cachedCurrentUser, ...updated };
            return cachedCurrentUser;
        },
        signUp: async ({ email, password, full_name, user_type = 'tenant', phone }) => {
            return authActions.registerUser({ email, password, full_name, user_type, phone });
        },
        login: async ({ email, password }) => {
            return authActions.loginUser({ email, password });
        },
        signIn: async ({ email, password }) => {
            return authActions.loginUser({ email, password });
        },
        signInWithPassword: async ({ email, password }) => {
            return authActions.loginUser({ email, password });
        },
        logout: async (redirectUrl) => {
            await authActions.logoutUser();
            cachedCurrentUser = null;
            if (redirectUrl) window.location.href = redirectUrl;
        },
        redirectToLogin: (redirectUrl, provider = 'google') => {
            const targetUrl = (typeof redirectUrl === 'string' && redirectUrl.startsWith('http')) 
                ? redirectUrl 
                : `${window.location.origin}/Auth`;

            if (isSupabaseConfigured) {
                supabase.auth.signInWithOAuth({ 
                    provider, 
                    options: { 
                        redirectTo: targetUrl 
                    } 
                });
            } else {
                window.location.href = '/Auth';
            }
        }
    },
    appLogs: {
        logUserInApp: async (pageName) => {
            return { success: true, pageName };
        }
    },
    entities: /** @type {any} */ (new Proxy({}, {
        get: (target, prop) => {
            return createSupabaseEntityHandler(/** @type {string} */ (prop));
        }
    })),
    integrations: {
        Core: {
            UploadFile: async ({ file }) => {
                if (isSupabaseConfigured) {
                    try {
                        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                        const { data, error } = await supabase.storage
                            .from('rentflex-files')
                            .upload(fileName, file);

                        if (!error && data) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('rentflex-files')
                                .getPublicUrl(fileName);
                            return { file_url: publicUrl };
                        }
                    } catch (e) {
                        console.error('Supabase storage upload error:', e);
                    }
                }
                return { file_url: URL.createObjectURL(file) };
            }
        }
    }
};

export const base44 = appClient;
export default appClient;
