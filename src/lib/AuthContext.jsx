import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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
    signUp: async () => {},
    signIn: async () => {},
    signInWithGoogle: async () => {},
    signInWithFacebook: async () => {},
    signInWithApple: async () => {},
    signInWithWindows: async () => {},
    signInWithSupabase: async () => {},
    logout: async () => {},
    navigateToLogin: () => {},
    checkAppState: async () => {},
    updateUser: async () => {}
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
            const currentUser = await appClient.auth.me();
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
        checkUserAuth();
    }, [checkUserAuth]);

    // Role-Based Access Control (RBAC) helpers
    const rawRole = (user?.user_type || 'tenant').toLowerCase();
    const role = (rawRole === 'tenant' || rawRole === 'rentee') 
        ? 'tenant' 
        : ((rawRole === 'admin' || rawRole === 'sysadmin') ? 'sysAdmin' : rawRole);

    const isSysAdmin = role === 'sysAdmin';
    const isLandlord = role === 'landlord';
    const isTenant = role === 'tenant';
    const isRentee = isTenant;
    const isContractor = role === 'contractor';

    const hasRole = (allowedRoles = []) => {
        const normalized = allowedRoles.map(r => r.toLowerCase());
        return normalized.includes(role.toLowerCase()) || (isSysAdmin && normalized.includes('sysadmin'));
    };

    // Scalable OAuth / SSO Provider Connectors
    const signInWithGoogle = async (redirectUrl = window.location.href) => {
        toast.info('Connecting to Google Identity Services...');
        return appClient.auth.redirectToLogin(redirectUrl, 'google');
    };

    const signInWithFacebook = async (redirectUrl = window.location.href) => {
        toast.info('Connecting to Facebook Login...');
        return appClient.auth.redirectToLogin(redirectUrl, 'facebook');
    };

    const signInWithApple = async (redirectUrl = window.location.href) => {
        toast.info('Connecting to Apple ID Sign-In (iOS)...');
        return appClient.auth.redirectToLogin(redirectUrl, 'apple');
    };

    const signInWithWindows = async (redirectUrl = window.location.href) => {
        toast.info('Connecting to Microsoft Azure AD / Windows Hello...');
        return appClient.auth.redirectToLogin(redirectUrl, 'azure');
    };

    const signInWithSupabase = async (email, password) => {
        toast.info('Authenticating via Supabase Secured Auth...');
        return appClient.auth.signInWithPassword ? appClient.auth.signInWithPassword({ email, password }) : checkUserAuth();
    };

    // Manual Secured Account Registration & Sign-In
    const signUp = async ({ email, password, full_name, user_type, phone }) => {
        try {
            setIsLoadingAuth(true);
            const result = await appClient.auth.signUp({ email, password, full_name, user_type, phone });
            setUser(result.user);
            setIsAuthenticated(true);
            toast.success(`Account created successfully! Welcome, ${result.user.full_name || result.user.email}`);
            return result;
        } catch (err) {
            toast.error(err.message || 'Registration failed');
            throw err;
        } finally {
            setIsLoadingAuth(false);
        }
    };

    const signIn = async ({ email, password }) => {
        try {
            setIsLoadingAuth(true);
            const result = await appClient.auth.signIn({ email, password });
            setUser(result.user);
            setIsAuthenticated(true);
            toast.success(`Welcome back, ${result.user.full_name || result.user.email}`);
            return result;
        } catch (err) {
            toast.error(err.message || 'Sign in failed');
            throw err;
        } finally {
            setIsLoadingAuth(false);
        }
    };

    const logout = async (shouldRedirect = true) => {
        setUser(null);
        setIsAuthenticated(false);
        await appClient.auth.logout();
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
            const updated = await appClient.auth.updateMe(data);
            setUser(updated);
            toast.success('Security profile updated');
            return updated;
        } catch (error) {
            console.error('Failed to update user profile:', error);
            toast.error('Failed to update security profile');
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
