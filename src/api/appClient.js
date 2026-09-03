import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
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
    DepositDispute: 'deposit_disputes',
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
            if (!navigator.onLine || !isSupabaseConfigured) {
                return enqueueOfflineMutation(entityName, 'create', data);
            }
            try {
                const { data: created, error } = await supabase.from(tableName).insert([data]).select().single();
                if (error) {
                    console.error(`Supabase create error on ${tableName}:`, error);
                    return enqueueOfflineMutation(entityName, 'create', data);
                }
                return normalizeItemNumbers(created);
            } catch (e) {
                console.warn(`Supabase create error on ${tableName}, queueing offline:`, e.message);
                return enqueueOfflineMutation(entityName, 'create', data);
            }
        },
        update: async (id, data) => {
            if (!navigator.onLine || !isSupabaseConfigured) {
                return enqueueOfflineMutation(entityName, 'update', data, id);
            }
            try {
                const { data: updated, error } = await supabase.from(tableName).update(data).eq('id', id).select().single();
                if (error) {
                    console.error(`Supabase update error on ${tableName}:`, error);
                    return enqueueOfflineMutation(entityName, 'update', data, id);
                }
                return normalizeItemNumbers(updated);
            } catch (e) {
                console.warn(`Supabase update error on ${tableName}, queueing offline:`, e.message);
                return enqueueOfflineMutation(entityName, 'update', data, id);
            }
        },
        delete: async (id) => {
            if (!navigator.onLine || !isSupabaseConfigured) {
                return enqueueOfflineMutation(entityName, 'delete', null, id);
            }
            try {
                const { error } = await supabase.from(tableName).delete().eq('id', id);
                if (error) {
                    console.error(`Supabase delete error on ${tableName}:`, error);
                    return enqueueOfflineMutation(entityName, 'delete', null, id);
                }
                return { success: true };
            } catch (e) {
                console.warn(`Supabase delete error on ${tableName}, queueing offline:`, e.message);
                return enqueueOfflineMutation(entityName, 'delete', null, id);
            }
        }
    };
};

let cachedCurrentUser = null;

export const appClient = {
    auth: {
        me: async () => {
            if (isSupabaseConfigured) {
                try {
                    const { data: { user }, error: authErr } = await supabase.auth.getUser();
                    if (authErr || !user) {
                        cachedCurrentUser = null;
                        return null;
                    }

                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .maybeSingle();

                    const fullUser = {
                        id: user.id,
                        email: user.email,
                        full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
                        user_type: (profile?.user_type === 'rentee' ? 'tenant' : profile?.user_type) || user.user_metadata?.user_type || 'tenant',
                        ...profile
                    };
                    cachedCurrentUser = fullUser;
                    return fullUser;
                } catch (e) {
                    console.warn('Supabase auth check error:', e);
                    cachedCurrentUser = null;
                    return null;
                }
            }
            cachedCurrentUser = null;
            return null;
        },
        updateMe: async (data) => {
            if (!isSupabaseConfigured) return null;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: updated, error } = await supabase
                .from('profiles')
                .update(data)
                .eq('id', user.id)
                .select()
                .single();

            if (error) {
                console.error('Supabase profile update error:', error);
                throw error;
            }

            cachedCurrentUser = { ...cachedCurrentUser, ...updated };
            return cachedCurrentUser;
        },
        signUp: async ({ email, password, full_name, user_type = 'tenant', phone }) => {
            if (!isSupabaseConfigured) {
                throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
            }
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { 
                    data: { full_name, user_type, phone } 
                }
            });
            if (error) throw error;
            return data;
        },
        login: async ({ email, password }) => {
            if (!isSupabaseConfigured) {
                throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
            }
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return data;
        },
        signIn: async ({ email, password }) => {
            if (!isSupabaseConfigured) {
                throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
            }
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return data;
        },
        signInWithPassword: async ({ email, password }) => {
            if (!isSupabaseConfigured) {
                throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
            }
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return data;
        },
        logout: async (redirectUrl) => {
            if (isSupabaseConfigured) {
                await supabase.auth.signOut();
            }
            cachedCurrentUser = null;
            if (redirectUrl) window.location.href = redirectUrl;
        },
        redirectToLogin: (redirectUrl, provider = 'google') => {
            if (isSupabaseConfigured) {
                supabase.auth.signInWithOAuth({ 
                    provider, 
                    options: { redirectTo: redirectUrl } 
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
    entities: new Proxy({}, {
        get: (target, prop) => {
            return createSupabaseEntityHandler(prop);
        }
    }),
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
