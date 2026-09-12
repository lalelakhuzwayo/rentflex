import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { authActions } from '@/api/authActions';
import { appClient } from '@/api/appClient';
import { toast } from 'sonner';

const defaultAuthValue = {
    user: null,
    role: 'tenant',
    isSysAdmin: false,
    isLandlord: false,
    isTenant: true,
    isRentee: true,
    isContractor: false,
    hasRole: () => false,
    isAuthenticated: false,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    securityStatus: {
        isSecured: true,
        protocol: 'PostgreSQL Multi-Tenant RLS & TLS 1.3',
        encryption: 'AES-256 (At-Rest) / TLS 1.3 (In-Transit)',
        compliance: 'POPIA Act No. 4 of 2013 & PAIA Act No. 2 of 2000',
        popiaOfficer: 'RentFlex Information Security Office'
    },
    signUp: async (_data) => ({ user: null, session: null }),
    signIn: async (_credentials) => ({ user: null, session: null }),
    signInWithGoogle: async (_redirectUrl) => ({}),
    signInWithFacebook: async (_redirectUrl) => ({}),
    signInWithApple: async (_redirectUrl) => ({}),
    signInWithWindows: async (_redirectUrl) => ({}),
    signInWithSupabase: async (_email, _password) => ({ user: null, session: null }),
    logout: async (_shouldRedirect) => {},
    navigateToLogin: () => {},
    checkAppState: async () => {},
    updateUser: async (_data) => ({})
};

const AuthContext = createContext(defaultAuthValue);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authError, setAuthError] = useState(null);

    // Security metadata
    const securityStatus = {
        isSecured: true,
        protocol: 'PostgreSQL Multi-Tenant RLS & TLS 1.3',
        encryption: 'AES-256 (At-Rest) / TLS 1.3 (In-Transit)',
        compliance: 'POPIA Act No. 4 of 2013 & PAIA Act No. 2 of 2000',
        popiaOfficer: 'RentFlex Information Security Office'
    };

    const checkUserAuth = useCallback(async () => {
        try {
            setIsLoadingAuth(true);
            setAuthError(null);
            const currentUser = await authActions.getCurrentUser();
            if (currentUser && currentUser.email) {
                setUser(currentUser);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            setUser(null);
            setIsAuthenticated(false);
            setAuthError({
                type: 'unknown',
                message: error.message || 'Failed to authenticate user'
            });
        } finally {
            setIsLoadingAuth(false);
        }
    }, []);

    useEffect(() => {
        // Initial auth check
        checkUserAuth();

        // Listen for all Supabase Auth session lifecycle events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (session?.user) {
                    await checkUserAuth();
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setIsAuthenticated(false);
                setIsLoadingAuth(false);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [checkUserAuth]);

    // Role-Based Access Control (RBAC) helpers
    const rawRole = (user?.user_type || 'tenant').toLowerCase();
    const role = (rawRole === 'tenant' || rawRole === 'rentee') 
        ? 'tenant' 
        : (rawRole === 'sysadmin' ? 'sysAdmin' : rawRole);

    const isSysAdmin = role === 'sysAdmin';
    const isLandlord = role === 'landlord';
    const isTenant = role === 'tenant';
    const isRentee = isTenant;
    const isContractor = role === 'contractor';

    const hasRole = (allowedRoles = []) => {
        if (isSysAdmin) return true; // Super user has unrestricted access to everything
        const normalized = allowedRoles.map(r => r.toLowerCase());
        return normalized.includes(role.toLowerCase()) || (isSysAdmin && normalized.includes('sysadmin'));
    };

    // Scalable OAuth / SSO Provider Connectors
    const signInWithGoogle = async (role = 'tenant', redirectUrl = `${window.location.origin}/Auth`) => {
        try {
            if (role) localStorage.setItem('pending_oauth_role', role);
        } catch (e) {}
        toast.info(`Connecting to Google Identity Services...`);
        return appClient.auth.redirectToLogin(redirectUrl, 'google');
    };

    const signInWithFacebook = async (role = 'tenant', redirectUrl = `${window.location.origin}/Auth`) => {
        try {
            if (role) localStorage.setItem('pending_oauth_role', role);
        } catch (e) {}
        toast.info('Connecting to Facebook Login...');
        return appClient.auth.redirectToLogin(redirectUrl, 'facebook');
    };

    const signInWithApple = async (role = 'tenant', redirectUrl = `${window.location.origin}/Auth`) => {
        try {
            if (role) localStorage.setItem('pending_oauth_role', role);
        } catch (e) {}
        toast.info('Connecting to Apple ID Sign-In (iOS)...');
        return appClient.auth.redirectToLogin(redirectUrl, 'apple');
    };

    const signInWithWindows = async (role = 'tenant', redirectUrl = `${window.location.origin}/Auth`) => {
        try {
            if (role) localStorage.setItem('pending_oauth_role', role);
        } catch (e) {}
        toast.info('Connecting to Microsoft Azure AD / Windows Hello...');
        return appClient.auth.redirectToLogin(redirectUrl, 'azure');
    };

    const signInWithSupabase = async (email, password) => {
        toast.info('Authenticating via Supabase Secured Auth...');
        return appClient.auth.signInWithPassword ? appClient.auth.signInWithPassword({ email, password }) : checkUserAuth();
    };

    // Secured Account Registration & Sign-In Actions
    const signUp = async ({ email, password, full_name, user_type, phone }) => {
        try {
            setIsLoadingAuth(true);
            setAuthError(null);
            const result = await authActions.registerAndAuthenticateUser({ email, password, full_name, user_type, phone });
            await checkUserAuth();
            toast.success(`Account created successfully! Welcome, ${full_name || email}`);
            return result;
        } catch (err) {
            console.error('Registration error:', err);
            toast.error(err.message || 'Registration failed');
            throw err;
        } finally {
            setIsLoadingAuth(false);
        }
    };

    const signIn = async ({ email, password }) => {
        try {
            setIsLoadingAuth(true);
            setAuthError(null);
            const result = await authActions.loginUser({ email, password });
            await checkUserAuth();
            toast.success('Welcome back!');
            return result;
        } catch (err) {
            console.error('Sign-in error:', err);
            toast.error(err.message || 'Sign in failed');
            throw err;
        } finally {
            setIsLoadingAuth(false);
        }
    };

    const logout = async (shouldRedirect = true) => {
        setUser(null);
        setIsAuthenticated(false);
        await authActions.logoutUser();
        toast.info('Signed out securely');
        if (shouldRedirect) {
            window.location.href = '/Auth';
        }
    };

    const navigateToLogin = () => {
        appClient.auth.redirectToLogin(window.location.href);
    };

    const updateUser = async (data) => {
        try {
            const updated = await authActions.updateUserProfile(data);
            setUser(prev => ({ ...prev, ...updated }));
            toast.success('Profile updated');
            return updated;
        } catch (error) {
            console.error('Failed to update user profile:', error);
            toast.error(error.message || 'Failed to update profile');
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            role,
            isSysAdmin,
            isLandlord,
            isTenant,
            isRentee,
            isContractor,
            hasRole,
            isAuthenticated,
            isLoadingAuth,
            isLoadingPublicSettings: false,
            authError,
            securityStatus,
            signUp,
            signIn,
            signInWithGoogle,
            signInWithFacebook,
            signInWithApple,
            signInWithWindows,
            signInWithSupabase,
            logout,
            navigateToLogin,
            checkAppState: checkUserAuth,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    return context || defaultAuthValue;
};
