import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

/**
 * RentFlex Production Authentication & Server Actions
 * Standardized Supabase Auth Actions following best industry practices.
 */

export const authActions = {
    /**
     * Register a new user with Supabase Auth.
     * Automatically triggers public.handle_new_user() in PostgreSQL.
     */
    registerUser: async ({ email, password, full_name, user_type = 'tenant', phone }) => {
        if (!isSupabaseConfigured) {
            throw new Error('Supabase client is not configured.');
        }

        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
                data: {
                    full_name: full_name?.trim(),
                    user_type: user_type?.toLowerCase(),
                    phone: phone?.trim() || null
                }
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        // If user already exists (identities empty), Supabase returns empty identities array
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            throw new Error('An account with this email address already exists. Please sign in instead.');
        }

        return data;
    },

    /**
     * Sign in existing user with email and password.
     */
    loginUser: async ({ email, password }) => {
        if (!isSupabaseConfigured) {
            throw new Error('Supabase client is not configured.');
        }

        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    },

    /**
     * Terminate user session and clear Supabase tokens.
     */
    logoutUser: async () => {
        if (!isSupabaseConfigured) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.warn('Supabase signOut warning:', error.message);
        }
    },

    /**
     * Get the current active session and authenticated user profile.
     */
    getCurrentUser: async () => {
        if (!isSupabaseConfigured) return null;

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) return null;

            // Fetch enriched profile from public.profiles
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                console.warn('Profile fetch notice:', profileError.message);
            }

            return {
                id: user.id,
                email: user.email,
                full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
                user_type: (profile?.user_type === 'rentee' ? 'tenant' : profile?.user_type) || user.user_metadata?.user_type || 'tenant',
                phone: profile?.phone || user.user_metadata?.phone || null,
                ...profile
            };
        } catch (err) {
            console.error('Error fetching current user:', err);
            return null;
        }
    },

    /**
     * Update user profile in public.profiles.
     */
    updateUserProfile: async (profileData) => {
        if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('User is not authenticated');

        const { data: updated, error } = await supabase
            .from('profiles')
            .update({
                ...profileData,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return updated;
    },

    /**
     * Send password reset email.
     */
    resetPassword: async (email, redirectTo) => {
        if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
            redirectTo: redirectTo || `${window.location.origin}/Auth?mode=reset`
        });
        if (error) throw new Error(error.message);
        return { success: true };
    },

    /**
     * Live Database Connection & Health Verification Action.
     * Pings the PostgreSQL database in Central EU (Frankfurt) and returns latency in ms.
     */
    checkDatabaseHealth: async () => {
        if (!isSupabaseConfigured) {
            return {
                ok: false,
                status: 'Unconfigured',
                region: 'Local / Disconnected',
                latencyMs: 0,
                error: 'Supabase URL or Key missing in environment'
            };
        }

        const start = performance.now();
        try {
            const { count, error, status } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true });

            const latencyMs = Math.round(performance.now() - start);

            if (error && status !== 200) {
                return {
                    ok: false,
                    status: 'Degraded',
                    statusCode: status,
                    region: 'Central EU (Frankfurt)',
                    latencyMs,
                    error: error.message
                };
            }

            return {
                ok: true,
                status: 'Healthy & Operational',
                statusCode: status,
                region: 'Central EU (Frankfurt)',
                latencyMs,
                totalUsers: count || 0,
                timestamp: new Date().toLocaleTimeString()
            };
        } catch (err) {
            const latencyMs = Math.round(performance.now() - start);
            return {
                ok: false,
                status: 'Error',
                region: 'Central EU (Frankfurt)',
                latencyMs,
                error: err.message
            };
        }
    }
};
