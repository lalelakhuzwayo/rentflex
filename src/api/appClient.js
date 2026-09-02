import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { 
    cacheEntityData, 
    getCachedEntityData, 
    enqueueOfflineMutation 
} from '@/lib/offlineSync';

const isLocalPostgresConfigured = Boolean(
    import.meta.env.VITE_USE_LOCAL_POSTGRES === 'true' ||
    import.meta.env.VITE_LOCAL_API_URL
);

const LOCAL_API_BASE = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:5000/api';

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

// Built-in mock dataset for offline / standalone fallback
const mockStore = {
    users: [
        { id: 'usr_admin', email: 'admin@rentflex.co.za', full_name: 'Doc SysAdmin', user_type: 'sysAdmin' },
        { id: 'usr_landlord', email: 'landlord@rentflex.co.za', full_name: 'John Landlord', user_type: 'landlord' },
        { id: 'usr_tenant', email: 'tenant@rentflex.co.za', full_name: 'Sarah Tenant', user_type: 'tenant' },
        { id: 'usr_contractor', email: 'contractor@rentflex.co.za', full_name: 'Pro Repairs Co.', user_type: 'contractor' },
    ],
    properties: [
        {
            id: 'prop_1',
            title: 'Luxury 2BR Sea-View Apartment',
            address: '12 Beach Road, Sea Point',
            city: 'Cape Town',
            state: 'Western Cape',
            zip_code: '8005',
            property_type: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            sqft: 95,
            monthly_rent: 18500,
            deposit_amount: 37000,
            min_rentscore: 650,
            amenities: ['Parking', 'WiFi', 'Security', 'Balcony'],
            images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'],
            description: 'Stunning 2-bedroom apartment with ocean views and modern finishes.',
            status: 'available',
            landlord_id: 'landlord@rentflex.co.za',
            accepts_bidding: true,
            flexible_payments: true
        }
    ],
    leases: [
        {
            id: 'lease_1',
            property_id: 'prop_1',
            property_title: 'Luxury 2BR Sea-View Apartment',
            tenant_id: 'tenant@rentflex.co.za',
            landlord_id: 'landlord@rentflex.co.za',
            monthly_rent: 18500,
            deposit_amount: 37000,
            status: 'active',
            signed: true,
            start_date: '2026-01-01',
            end_date: '2026-12-31'
        }
    ],
    payments: [
        {
            id: 'pay_1',
            lease_id: 'lease_1',
            tenant_id: 'tenant@rentflex.co.za',
            landlord_id: 'landlord@rentflex.co.za',
            amount: 18500,
            due_date: '2026-09-01',
            status: 'pending',
            type: 'rent'
        }
    ],
    maintenance_requests: [],
    jobs: [],
    contractor_bids: [],
    bids: [],
    contractors: [],
    rent_scores: [
        { id: 'rs_1', user_id: 'tenant@rentflex.co.za', score: 720, history: [{ date: '2026-08-01', score: 720, reason: 'On-time rent payment' }] },
        { id: 'rs_2', user_id: 'landlord@rentflex.co.za', score: 780, history: [{ date: '2026-08-01', score: 780, reason: 'Verified landlord & payment record' }] }
    ],
    deposit_disputes: [],
    inspections: [],
    messages: [],
    applications: []
};

const createMockEntityHandler = (tableName) => {
    return {
        list: async () => mockStore[tableName] || [],
        filter: async (criteria = {}) => {
            const list = mockStore[tableName] || [];
            return list.filter(item => {
                return Object.entries(criteria).every(([key, val]) => {
                    if (val === undefined || val === null) return true;
                    return item[key] === val || item[key] === String(val);
                });
            });
        },
        get: async (id) => (mockStore[tableName] || []).find(item => item.id === id) || null,
        create: async (data) => {
            const newItem = { id: `${tableName}_${Date.now()}`, ...data };
            if (!mockStore[tableName]) mockStore[tableName] = [];
            mockStore[tableName].push(newItem);
            return newItem;
        },
        update: async (id, data) => {
            const list = mockStore[tableName] || [];
            const idx = list.findIndex(item => item.id === id);
            if (idx !== -1) {
                list[idx] = { ...list[idx], ...data };
                return list[idx];
            }
            return { id, ...data };
        },
        delete: async (id) => {
            const list = mockStore[tableName] || [];
            mockStore[tableName] = list.filter(item => item.id !== id);
            return { success: true };
        }
    };
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

const createLocalPostgresEntityHandler = (entityName) => {
    return {
        list: async () => {
            if (navigator.onLine) {
                try {
                    const res = await fetch(`${LOCAL_API_BASE}/entities/${entityName}`);
                    if (res.ok) {
                        const data = await res.json();
                        const normalized = normalizeItemNumbers(data);
                        cacheEntityData(entityName, normalized);
                        return normalized;
                    }
                } catch (e) {
                    console.warn(`Local PostgreSQL server unreachable for ${entityName}:`, e.message);
                }
            }
            // Offline or fallback cache
            const cached = getCachedEntityData(entityName);
            if (cached) return normalizeItemNumbers(cached);
            return createMockEntityHandler(ENTITY_TABLE_MAP[entityName] || entityName.toLowerCase() + 's').list();
        },
        filter: async (criteria = {}) => {
            if (navigator.onLine) {
                try {
                    const query = new URLSearchParams();
                    Object.entries(criteria).forEach(([k, v]) => {
                        if (v !== undefined && v !== null) query.append(k, v);
                    });
                    const res = await fetch(`${LOCAL_API_BASE}/entities/${entityName}?${query.toString()}`);
                    if (res.ok) {
                        const data = await res.json();
                        return normalizeItemNumbers(data);
                    }
                } catch (e) {
                    console.warn(`Local PostgreSQL filter error on ${entityName}:`, e.message);
                }
            }
            // Offline filtering from cached dataset
            const cached = getCachedEntityData(entityName);
            if (cached && Array.isArray(cached)) {
                return cached.filter(item => {
                    return Object.entries(criteria).every(([key, val]) => {
                        if (val === undefined || val === null) return true;
                        return item[key] === val || item[key] === String(val);
                    });
                });
            }
            return createMockEntityHandler(ENTITY_TABLE_MAP[entityName] || entityName.toLowerCase() + 's').filter(criteria);
        },
        get: async (id) => {
            if (navigator.onLine) {
                try {
                    const res = await fetch(`${LOCAL_API_BASE}/entities/${entityName}/${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        return normalizeItemNumbers(data);
                    }
                } catch (e) {
                    console.warn(`Local PostgreSQL get error on ${entityName}:`, e.message);
                }
            }
            const cached = getCachedEntityData(entityName);
            if (cached && Array.isArray(cached)) {
                const found = cached.find(item => item.id === id);
                if (found) return normalizeItemNumbers(found);
            }
            return createMockEntityHandler(ENTITY_TABLE_MAP[entityName] || entityName.toLowerCase() + 's').get(id);
        },
        create: async (data) => {
            if (!navigator.onLine) {
                return enqueueOfflineMutation(entityName, 'create', data);
            }
            try {
                const res = await fetch(`${LOCAL_API_BASE}/entities/${entityName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    const created = await res.json();
                    return created;
                }
            } catch (e) {
                console.warn(`Local PostgreSQL create network error on ${entityName}, queueing offline:`, e.message);
                return enqueueOfflineMutation(entityName, 'create', data);
            }
            return enqueueOfflineMutation(entityName, 'create', data);
        },
        update: async (id, data) => {
            if (!navigator.onLine) {
                return enqueueOfflineMutation(entityName, 'update', data, id);
            }
            try {
                const res = await fetch(`${LOCAL_API_BASE}/entities/${entityName}/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn(`Local PostgreSQL update error on ${entityName}, queueing offline:`, e.message);
                return enqueueOfflineMutation(entityName, 'update', data, id);
            }
            return enqueueOfflineMutation(entityName, 'update', data, id);
        },
        delete: async (id) => {
            if (!navigator.onLine) {
                return enqueueOfflineMutation(entityName, 'delete', null, id);
            }
            try {
                const res = await fetch(`${LOCAL_API_BASE}/entities/${entityName}/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn(`Local PostgreSQL delete error on ${entityName}, queueing offline:`, e.message);
                return enqueueOfflineMutation(entityName, 'delete', null, id);
            }
            return enqueueOfflineMutation(entityName, 'delete', null, id);
        }
    };
};

const createSupabaseEntityHandler = (tableName) => {
    return {
        list: async () => {
            if (!isSupabaseConfigured) return createMockEntityHandler(tableName).list();
            const { data, error } = await supabase.from(tableName).select('*');
            if (error) {
                console.error(`Supabase list error on ${tableName}:`, error);
                return createMockEntityHandler(tableName).list();
            }
            return data || [];
        },
        filter: async (criteria = {}) => {
            if (!isSupabaseConfigured) return createMockEntityHandler(tableName).filter(criteria);
            let query = supabase.from(tableName).select('*');

            Object.entries(criteria).forEach(([key, val]) => {
                if (val !== undefined && val !== null) {
                    query = query.eq(key, val);
                }
            });

            const { data, error } = await query;
            if (error) {
                console.error(`Supabase filter error on ${tableName}:`, error);
                return createMockEntityHandler(tableName).filter(criteria);
            }
            return data || [];
        },
        get: async (id) => {
            if (!isSupabaseConfigured) return createMockEntityHandler(tableName).get(id);
            const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
            if (error) {
                console.error(`Supabase get error on ${tableName}:`, error);
                return createMockEntityHandler(tableName).get(id);
            }
            return data;
        },
        create: async (data) => {
            if (!isSupabaseConfigured) return createMockEntityHandler(tableName).create(data);
            const { data: created, error } = await supabase.from(tableName).insert([data]).select().single();
            if (error) {
                console.error(`Supabase create error on ${tableName}:`, error);
                return createMockEntityHandler(tableName).create(data);
            }
            return created;
        },
        update: async (id, data) => {
            if (!isSupabaseConfigured) return createMockEntityHandler(tableName).update(id, data);
            const { data: updated, error } = await supabase.from(tableName).update(data).eq('id', id).select().single();
            if (error) {
                console.error(`Supabase update error on ${tableName}:`, error);
                return createMockEntityHandler(tableName).update(id, data);
            }
            return updated;
        },
        delete: async (id) => {
            if (!isSupabaseConfigured) return createMockEntityHandler(tableName).delete(id);
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) {
                console.error(`Supabase delete error on ${tableName}:`, error);
                return createMockEntityHandler(tableName).delete(id);
            }
            return { success: true };
        }
    };
};

let cachedCurrentUser = null;

export const appClient = {
    auth: {
        me: async () => {
            const currentEmail = localStorage.getItem('rentflex_user_email');
            if (!currentEmail) {
                if (isSupabaseConfigured) {
                    try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', user.id)
                                .single();

                            const fullUser = {
                                id: user.id,
                                email: user.email,
                                full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
                                user_type: (profile?.user_type === 'rentee' ? 'tenant' : profile?.user_type) || user.user_metadata?.user_type || 'tenant',
                                ...profile
                            };
                            cachedCurrentUser = fullUser;
                            return fullUser;
                        }
                    } catch (e) {
                        console.warn('Supabase auth check fallback:', e);
                    }
                }
                cachedCurrentUser = null;
                return null;
            }

            if (isLocalPostgresConfigured) {
                try {
                    const res = await fetch(`${LOCAL_API_BASE}/auth/me?email=${encodeURIComponent(currentEmail)}`, {
                        headers: { 'x-user-email': currentEmail }
                    });
                    if (res.ok) {
                        const user = await res.json();
                        cachedCurrentUser = user;
                        return user;
                    }
                } catch (e) {
                    console.warn('Local PostgreSQL auth fetch error:', e.message);
                }
            }

            cachedCurrentUser = null;
            return null;
        },
        updateMe: async (data) => {
            const currentEmail = localStorage.getItem('rentflex_user_email') || 'landlord@rentflex.co.za';
            if (isLocalPostgresConfigured) {
                try {
                    const res = await fetch(`${LOCAL_API_BASE}/auth/me`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'x-user-email': currentEmail
                        },
                        body: JSON.stringify({ ...data, email: currentEmail })
                    });
                    if (res.ok) {
                        const updated = await res.json();
                        cachedCurrentUser = updated;
                        return updated;
                    }
                } catch (e) {
                    console.error('Local PostgreSQL updateMe error:', e.message);
                }
            }
            if (isSupabaseConfigured) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: updatedProfile } = await supabase
                            .from('profiles')
                            .upsert({ id: user.id, email: user.email, ...data })
                            .select()
                            .single();
                        return updatedProfile;
                    }
                } catch (e) {
                    console.error('Supabase updateMe error:', e);
                }
            }
            cachedCurrentUser = { ...cachedCurrentUser, ...data };
            return cachedCurrentUser;
        },
        switchAccount: async (emailOrRole) => {
            let targetEmail = emailOrRole;
            if (emailOrRole === 'sysAdmin' || emailOrRole === 'admin') targetEmail = 'admin@rentflex.co.za';
            else if (emailOrRole === 'landlord') targetEmail = 'landlord@rentflex.co.za';
            else if (emailOrRole === 'tenant' || emailOrRole === 'rentee') targetEmail = 'tenant@rentflex.co.za';
            else if (emailOrRole === 'contractor') targetEmail = 'contractor@rentflex.co.za';

            localStorage.setItem('rentflex_user_email', targetEmail);

            if (isLocalPostgresConfigured) {
                try {
                    const res = await fetch(`${LOCAL_API_BASE}/auth/me?email=${encodeURIComponent(targetEmail)}`, {
                        headers: { 'x-user-email': targetEmail }
                    });
                    if (res.ok) {
                        const user = await res.json();
                        cachedCurrentUser = user;
                        return user;
                    }
                } catch (e) {
                    console.error('Error switching account in DB:', e);
                }
            }
            
            cachedCurrentUser = {
                id: targetEmail,
                email: targetEmail,
                full_name: targetEmail.startsWith('admin') ? 'Doc SysAdmin' : (targetEmail.startsWith('tenant') || targetEmail.startsWith('rentee') ? 'Sarah Tenant' : 'John Landlord'),
                user_type: targetEmail.startsWith('admin') ? 'sysAdmin' : (targetEmail.startsWith('tenant') || targetEmail.startsWith('rentee') ? 'tenant' : 'landlord')
            };
            return cachedCurrentUser;
        },
        getAccounts: async () => {
            if (isLocalPostgresConfigured) {
                try {
                    const res = await fetch(`${LOCAL_API_BASE}/auth/accounts`);
                    if (res.ok) return await res.json();
                } catch (e) {
                    console.warn('Fallback getting accounts:', e.message);
                }
            }
            return [
                { email: 'admin@rentflex.co.za', full_name: 'Doc SysAdmin', user_type: 'sysAdmin', phone: '+27 11 000 0001' },
                { email: 'landlord@rentflex.co.za', full_name: 'John Landlord', user_type: 'landlord', phone: '+27 82 555 1234' },
                { email: 'tenant@rentflex.co.za', full_name: 'Sarah Tenant', user_type: 'tenant', phone: '+27 83 777 9876' },
                { email: 'contractor@rentflex.co.za', full_name: 'Pro Repairs Co.', user_type: 'contractor', phone: '+27 84 999 0000' },
            ];
        },
        signUp: async ({ email, password, full_name, user_type = 'tenant', phone }) => {
            if (isLocalPostgresConfigured) {
                const res = await fetch(`${LOCAL_API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, full_name, user_type, phone })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to register account.');
                }
                localStorage.setItem('rentflex_user_email', data.user.email);
                if (data.token) localStorage.setItem('rentflex_session_token', data.token);
                cachedCurrentUser = data.user;
                return data;
            }
            if (isSupabaseConfigured) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name, user_type, phone } }
                });
                if (error) throw error;
                return data;
            }
            const user = { id: `usr_${Date.now()}`, email, full_name, user_type, phone };
            localStorage.setItem('rentflex_user_email', email);
            cachedCurrentUser = user;
            return { success: true, user, token: `rf_sec_${Date.now()}` };
        },
        signIn: async ({ email, password }) => {
            if (isLocalPostgresConfigured) {
                const res = await fetch(`${LOCAL_API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Invalid email or password.');
                }
                localStorage.setItem('rentflex_user_email', data.user.email);
                if (data.token) localStorage.setItem('rentflex_session_token', data.token);
                cachedCurrentUser = data.user;
                return data;
            }
            if (isSupabaseConfigured) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                return data;
            }
            const user = { id: `usr_${Date.now()}`, email, full_name: email.split('@')[0], user_type: 'tenant' };
            localStorage.setItem('rentflex_user_email', email);
            cachedCurrentUser = user;
            return { success: true, user };
        },
        logout: async (redirectUrl) => {
            const currentEmail = localStorage.getItem('rentflex_user_email');
            if (isLocalPostgresConfigured && currentEmail) {
                try {
                    await fetch(`${LOCAL_API_BASE}/auth/logout`, {
                        method: 'POST',
                        headers: { 'x-user-email': currentEmail }
                    });
                } catch (e) {}
            }
            if (isSupabaseConfigured) {
                await supabase.auth.signOut();
            }
            localStorage.removeItem('rentflex_user_email');
            localStorage.removeItem('rentflex_session_token');
            cachedCurrentUser = null;
            if (redirectUrl) window.location.href = redirectUrl;
        },
        redirectToLogin: (redirectUrl) => {
            if (isSupabaseConfigured) {
                supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } });
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
            if (isLocalPostgresConfigured) {
                return createLocalPostgresEntityHandler(prop);
            }
            const tableName = ENTITY_TABLE_MAP[prop] || prop.toLowerCase() + 's';
            return createSupabaseEntityHandler(tableName);
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
