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
    ContractorJob: 'jobs',
    ContractorBid: 'contractor_bids',
    Bid: 'bids',
    Contractor: 'contractors',
    RentScore: 'rent_scores',
    Inspection: 'inspections',
    Message: 'messages',
    Application: 'applications',
    Profile: 'profiles',
    TourSchedule: 'tour_schedules',
    Favorite: 'favorites',
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

const ALLOWED_COLUMNS_MAP = {
    Message: ['id', 'conversation_id', 'sender_id', 'receiver_id', 'content', 'file_url', 'created_at', 'status', 'read_at'],
    Bid: [
        'id', 'property_id', 'tenant_id', 'tenant_name', 'tenant_email', 'tenant_phone', 
        'landlord_id', 'proposed_rent', 'move_in_date', 'lease_duration_months', 'status', 
        'message', 'counter_rent', 'landlord_notes', 'response_notes', 'responded_at', 
        'created_at', 'updated_at', 'property_title', 'property_address', 'property_image'
    ],
    TourSchedule: [
        'id', 'property_id', 'tenant_id', 'tenant_name', 'tenant_email', 'tenant_phone', 
        'landlord_id', 'requested_date', 'requested_time', 'status', 'reschedule_date', 
        'reschedule_time', 'rescheduled_by', 'notes', 'tenant_response', 'tenant_notes', 
        'tenant_confirmed_at', 'completed_at', 'declined_reason', 'created_at', 'updated_at', 
        'property_title', 'property_address'
    ],
    Application: [
        'id', 'property_id', 'tenant_id', 'landlord_id', 'rent_score', 'status', 
        'landlord_notes', 'created_at', 'property_title', 'property_address', 'tenant_email', 
        'tenant_name', 'tenant_phone', 'move_in_date', 'monthly_income', 'employment_status', 
        'employer', 'credit_score', 'documents', 'reviewed_at', 'reviewed_by', 'updated_at'
    ],
    Lease: [
        'id', 'property_id', 'property_title', 'property_address', 'property_image',
        'landlord_id', 'landlord_name', 'tenant_id', 'tenant_name',
        'monthly_rent', 'deposit_amount', 'start_date', 'end_date', 'status',
        'documents', 'signed', 'tenant_signature', 'tenant_signed_at',
        'landlord_signature', 'landlord_signed_at', 'terms',
        'created_from_bid_id', 'room_number', 'is_room_rental',
        'occupancy_status', 'active_months_monitored', 'last_rentscore_reward_date',
        'termination_date', 'terminated_reason', 'created_at', 'updated_at'
    ],
    MaintenanceRequest: [
        'id', 'lease_id', 'tenant_id', 'landlord_id', 'property_id', 'property_title',
        'title', 'description', 'category', 'priority', 'status', 'images',
        'contractor_id', 'estimated_cost', 'created_at', 'updated_at'
    ],
    Job: [
        'id', 'maintenance_request_id', 'posted_by_id', 'title', 'description',
        'category', 'budget_max', 'location', 'urgency', 'status',
        'accepted_bid_id', 'created_at'
    ]
};

const sanitizeEntityData = (entityName, data) => {
    if (!data || typeof data !== 'object') return data;
    const prepData = { ...data };

    if (entityName === 'Bid') {
        if (prepData.bid_amount !== undefined && prepData.proposed_rent === undefined) {
            prepData.proposed_rent = Number(prepData.bid_amount);
        }
        if (prepData.proposed_lease_months !== undefined && prepData.lease_duration_months === undefined) {
            prepData.lease_duration_months = parseInt(prepData.proposed_lease_months, 10);
        }
    }

    if (entityName === 'Lease') {
        if (prepData.created_date && !prepData.created_at) {
            prepData.created_at = prepData.created_date;
        }
        if (prepData.monthly_rent !== undefined) {
            prepData.monthly_rent = Number(prepData.monthly_rent);
        }
        if (prepData.deposit_amount !== undefined) {
            prepData.deposit_amount = Number(prepData.deposit_amount);
        }
    }

    const allowed = ALLOWED_COLUMNS_MAP[entityName];
    if (!allowed) return prepData;

    const cleanData = {};
    Object.keys(prepData).forEach(key => {
        if (allowed.includes(key)) {
            cleanData[key] = prepData[key];
        }
    });
    return cleanData;
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
            const payload = sanitizeEntityData(entityName, data);
            const { data: created, error } = await supabase.from(tableName).insert([payload]).select().single();
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
            const payload = sanitizeEntityData(entityName, data);
            const { data: updated, error } = await supabase.from(tableName).update(payload).eq('id', id).select().single();
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
                        const sanitizedName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'upload.png';
                        const fileName = `${Date.now()}_${sanitizedName}`;
                        const { data, error } = await supabase.storage
                            .from('rentflex-files')
                            .upload(fileName, file, {
                                upsert: true,
                                contentType: file.type || 'image/jpeg'
                            });

                        if (error) {
                            console.error('Supabase storage upload error:', error);
                            throw new Error(error.message || 'Storage upload failed');
                        }

                        if (data) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('rentflex-files')
                                .getPublicUrl(fileName);
                            return { file_url: publicUrl };
                        }
                    } catch (e) {
                        console.error('Supabase storage upload catch:', e);
                        throw e;
                    }
                }
                throw new Error('Supabase client is not configured for storage uploads.');
            }
        }
    }
};

export const base44 = appClient;
export default appClient;
