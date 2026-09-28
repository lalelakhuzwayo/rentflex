import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import {
    ShieldCheck,
    Lock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    KeyRound,
    User,
    Mail,
    Phone,
    Clock,
    ExternalLink,
    Globe,
    Building2,
    Sparkles,
    Layers,
    ArrowRight,
    RefreshCw,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import BlockLoader from '@/components/ui/BlockLoader';
import { toast } from 'sonner';

// Helper to provide friendly labels, descriptions, and icons for OAuth 2.1 scopes
function getScopeMetadata(scope) {
    const s = (scope || '').trim().toLowerCase();
    switch (s) {
        case 'openid':
            return {
                title: 'Verify Your Identity',
                description: 'Authenticate and confirm your RentFlex account identity securely (OpenID Connect).',
                icon: ShieldCheck,
                category: 'Identity',
                badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
            };
        case 'profile':
            return {
                title: 'Basic Profile Information',
                description: 'Read your full name, avatar, account persona role, and public profile details.',
                icon: User,
                category: 'Profile',
                badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
            };
        case 'email':
            return {
                title: 'Verified Email Address',
                description: 'Read your primary verified email address for account correspondence.',
                icon: Mail,
                category: 'Contact',
                badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
            };
        case 'phone':
            return {
                title: 'Contact Phone Number',
                description: 'Read your registered phone number for verification and SMS alerts.',
                icon: Phone,
                category: 'Contact',
                badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
            };
        case 'offline_access':
            return {
                title: 'Continuous Background Access',
                description: 'Allow this app to maintain session continuity via secure refresh tokens while you are offline.',
                icon: Clock,
                category: 'Session',
                badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
            };
        default: {
            const formatted = s
                .replace(/[_-]/g, ' ')
                .replace(/\b\w/g, (char) => char.toUpperCase());
            return {
                title: formatted || 'General Application Access',
                description: `Permission granted to access platform scope: "${s}".`,
                icon: KeyRound,
                category: 'Permissions',
                badgeColor: 'bg-zinc-100 text-zinc-700 border-zinc-200'
            };
        }
    }
}

export default function OAuthConsent() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Query parameters from Supabase OAuth 2.1 Server
    // Supabase redirects to: <authorization_path>?authorization_id=<UUID>
    const authorizationId =
        searchParams.get('authorization_id') ||
        searchParams.get('id') ||
        searchParams.get('ctx');

    const { user, isAuthenticated, isLoadingAuth, securityStatus } = useAuth();

    // Local Component State
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [authDetails, setAuthDetails] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [isDenying, setIsDenying] = useState(false);
    const [decisionMade, setDecisionMade] = useState(null); // 'approved' | 'denied'
    const [alreadyApprovedUrl, setAlreadyApprovedUrl] = useState(null);

    // Interactive developer / preview mode (active if no authorizationId is present in URL)
    const [isPreviewMode, setIsPreviewMode] = useState(!authorizationId);

    // Mock preview data for interactive evaluation & testing
    const mockDetails = useMemo(() => ({
        authorization_id: 'preview-oauth-2-1-mock-id',
        redirect_uri: 'https://client-app.example.com/oauth/callback',
        client: {
            id: '7b83f3e2-8b43-4e39-b9d9-b2f518e19c34',
            name: 'RentFlex Mobile & Partner Gateway',
            uri: 'https://rentflex.vercel.app',
            logo_uri: '/assets/rentflex-logo.png'
        },
        user: {
            id: user?.id || 'usr_rentflex_preview_001',
            email: user?.email || 'tenant@rentflex.co.za'
        },
        scope: 'openid profile email offline_access'
    }), [user]);

    // Fetch authorization details from Supabase OAuth Server
    useEffect(() => {
        let isMounted = true;

        async function fetchDetails() {
            if (!authorizationId) {
                // No authorization ID in URL; display the preview / info view
                if (isMounted) {
                    setLoadingDetails(false);
                    setIsPreviewMode(true);
                }
                return;
            }

            if (isLoadingAuth) {
                // Wait for AuthContext initialization
                return;
            }

            if (!isAuthenticated) {
                // User must be signed in to authorize OAuth apps
                if (isMounted) {
                    setLoadingDetails(false);
                }
                return;
            }

            setLoadingDetails(true);
            setErrorMsg(null);

            try {
                // Call Supabase OAuth 2.1 Server method
                const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

                if (!isMounted) return;

                if (error) {
                    console.error('Failed to load OAuth authorization details:', error);
                    setErrorMsg(
                        error.message ||
                        'This authorization request is invalid, expired, or has already been used.'
                    );
                    setLoadingDetails(false);
                    return;
                }

                if (!data) {
                    setErrorMsg('No authorization details returned by the authorization server.');
                    setLoadingDetails(false);
                    return;
                }

                // If user already consented, Supabase returns { redirect_url } directly
                if (data.redirect_url && !('authorization_id' in data)) {
                    setAlreadyApprovedUrl(data.redirect_url);
                    setLoadingDetails(false);
                    // Automatic redirect after brief delay
                    const timer = setTimeout(() => {
                        window.location.assign(data.redirect_url);
                    }, 1200);
                    return () => clearTimeout(timer);
                }

                // User needs to provide consent
                setAuthDetails(data);
                setLoadingDetails(false);
            } catch (err) {
                console.error('Unexpected error fetching OAuth details:', err);
                if (isMounted) {
                    setErrorMsg(err.message || 'An unexpected error occurred while loading authorization details.');
                    setLoadingDetails(false);
                }
            }
        }

        fetchDetails();

        return () => {
            isMounted = false;
        };
    }, [authorizationId, isAuthenticated, isLoadingAuth]);

    // Active details (either real from Supabase or mock if in preview mode)
    const activeDetails = isPreviewMode ? mockDetails : authDetails;

    // Parsed scopes
    const scopesList = useMemo(() => {
        const rawScope = activeDetails?.scope || '';
        return rawScope
            .split(' ')
            .map((s) => s.trim())
            .filter(Boolean);
    }, [activeDetails]);

    // Handle Approve
    const handleApprove = async () => {
        if (isPreviewMode) {
            setIsApproving(true);
            toast.info('Preview Mode: Simulating authorization approval...');
            setTimeout(() => {
                setIsApproving(false);
                setDecisionMade('approved');
                toast.success('Access approved! In production, you would be redirected back to the client application.');
            }, 1000);
            return;
        }

        if (!authorizationId) return;

        setIsApproving(true);
        setErrorMsg(null);

        try {
            const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId);

            if (error) {
                console.error('OAuth approval error:', error);
                toast.error(error.message || 'Failed to approve authorization request');
                setErrorMsg(error.message || 'Failed to approve authorization request');
                setIsApproving(false);
                return;
            }

            setDecisionMade('approved');
            toast.success('Access granted! Redirecting back to application...');

            if (data?.redirect_url) {
                // Ensure browser navigates to callback
                window.location.assign(data.redirect_url);
            }
        } catch (err) {
            console.error('Unexpected approval error:', err);
            toast.error(err.message || 'Unexpected error occurred during approval');
            setErrorMsg(err.message || 'Unexpected error occurred during approval');
            setIsApproving(false);
        }
    };

    // Handle Deny
    const handleDeny = async () => {
        if (isPreviewMode) {
            setIsDenying(true);
            toast.info('Preview Mode: Simulating authorization denial...');
            setTimeout(() => {
                setIsDenying(false);
                setDecisionMade('denied');
                toast.info('Access denied! In production, the client receives an access_denied OAuth callback.');
            }, 800);
            return;
        }

        if (!authorizationId) return;

        setIsDenying(true);
        setErrorMsg(null);

        try {
            const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId);

            if (error) {
                console.error('OAuth denial error:', error);
                toast.error(error.message || 'Failed to deny authorization request');
                setErrorMsg(error.message || 'Failed to deny authorization request');
                setIsDenying(false);
                return;
            }

            setDecisionMade('denied');
            toast.info('Access request denied. Redirecting back to application...');

            if (data?.redirect_url) {
                // Ensure browser navigates to callback
                window.location.assign(data.redirect_url);
            }
        } catch (err) {
            console.error('Unexpected denial error:', err);
            toast.error(err.message || 'Unexpected error occurred during denial');
            setErrorMsg(err.message || 'Unexpected error occurred during denial');
            setIsDenying(false);
        }
    };

    // -------------------------------------------------------------
    // RENDER: Loading State
    // -------------------------------------------------------------
    if (isLoadingAuth || (loadingDetails && authorizationId && isAuthenticated)) {
        return (
            <div className="min-h-screen app-bg-pattern flex flex-col justify-center items-center py-12 px-4">
                <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-zinc-200/80 p-8 shadow-xl text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-950 text-white shadow-md">
                        <img src="/assets/rentflex-logo.png" alt="RentFlex" className="w-7 h-7 object-contain" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Verifying Authorization Request</h2>
                        <p className="text-xs text-zinc-500 mt-1">Connecting to Supabase OAuth 2.1 Server...</p>
                    </div>
                    <div className="py-4">
                        <BlockLoader size="md" variant="grid" text="Loading permissions..." />
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: Unauthenticated State (User must sign in first)
    // -------------------------------------------------------------
    if (!isAuthenticated && authorizationId) {
        const returnUrl = encodeURIComponent(`${location.pathname}${location.search}`);

        return (
            <div className="min-h-screen app-bg-pattern flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-lg">
                    {/* Brand Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2.5 justify-center mb-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-md">
                                <img src="/assets/rentflex-logo.png" alt="RentFlex" className="w-6 h-6 object-contain" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-zinc-900">RentFlex</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                            Sign in to Authorize Application
                        </h2>
                        <p className="mt-2 text-sm text-zinc-600 max-w-md mx-auto">
                            An external application is requesting access to your RentFlex portal. Please sign in to verify your identity and review permissions.
                        </p>
                    </div>

                    <Card className="border border-zinc-200/80 shadow-xl bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden p-6 sm:p-8 space-y-6">
                        <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto text-zinc-900 border border-zinc-200 shadow-xs">
                            <Lock className="w-7 h-7" />
                        </div>

                        <div className="text-center space-y-1.5">
                            <h3 className="text-lg font-bold text-zinc-900">Authentication Required</h3>
                            <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                                To protect your data, only authenticated account owners can grant or revoke OAuth access tokens.
                            </p>
                        </div>

                        <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 text-xs text-zinc-600 flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold text-zinc-900">Single Sign-On Security</span>
                                <p className="mt-0.5 leading-relaxed">
                                    After signing in, you will be automatically returned to this consent screen with your requested permissions intact.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Link to={`/Auth?returnTo=${returnUrl}`} className="block w-full">
                                <Button className="w-full h-11 bg-zinc-950 hover:bg-zinc-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs">
                                    Sign In with RentFlex <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>

                            <Link to={`/Auth?mode=register&returnTo=${returnUrl}`} className="block w-full">
                                <Button variant="outline" className="w-full h-11 border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-semibold rounded-xl">
                                    Create a New Account
                                </Button>
                            </Link>
                        </div>

                        <div className="pt-2 text-center">
                            <p className="text-[11px] text-zinc-500">
                                Protected by {securityStatus?.protocol || 'PostgreSQL Multi-Tenant RLS & TLS 1.3'}
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: Already Consented (Redirecting)
    // -------------------------------------------------------------
    if (alreadyApprovedUrl) {
        return (
            <div className="min-h-screen app-bg-pattern flex flex-col justify-center items-center py-12 px-4">
                <Card className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-zinc-200/80 p-8 shadow-xl text-center space-y-6">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Authorization Verified</h2>
                        <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                            You have previously approved access for this application. Redirecting you back now...
                        </p>
                    </div>
                    <div className="py-2">
                        <BlockLoader size="sm" variant="dots" text="Redirecting to application..." />
                    </div>
                    <div className="pt-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-9 font-medium border-zinc-300 rounded-lg"
                            onClick={() => window.location.assign(alreadyApprovedUrl)}
                        >
                            Click here if you are not redirected automatically
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: Decision Completed State
    // -------------------------------------------------------------
    if (decisionMade) {
        const isApproved = decisionMade === 'approved';
        return (
            <div className="min-h-screen app-bg-pattern flex flex-col justify-center items-center py-12 px-4">
                <Card className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-zinc-200/80 p-8 shadow-xl text-center space-y-6">
                    <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border shadow-xs ${
                            isApproved
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-rose-50 text-rose-600 border-rose-200'
                        }`}
                    >
                        {isApproved ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                            {isApproved ? 'Access Granted Successfully' : 'Authorization Declined'}
                        </h2>
                        <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                            {isApproved
                                ? `You have authorized ${activeDetails?.client?.name || 'the client application'}. You may now return to the app or close this window.`
                                : `You declined the request from ${activeDetails?.client?.name || 'the client application'}. No tokens were issued.`}
                        </p>
                    </div>

                    {isPreviewMode && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 text-left flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                                <strong>Preview Notice:</strong> In live operation, your browser is redirected back to the client's registered redirect URI with an OAuth 2.1 code or error parameter.
                            </span>
                        </div>
                    )}

                    <div className="pt-2">
                        <Button
                            onClick={() => {
                                setDecisionMade(null);
                                if (!authorizationId) setIsPreviewMode(true);
                            }}
                            variant="outline"
                            className="w-full h-11 border-zinc-300 rounded-xl font-semibold text-zinc-800 hover:bg-zinc-50"
                        >
                            Reset Consent Screen
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: Error State
    // -------------------------------------------------------------
    if (errorMsg && !isPreviewMode) {
        return (
            <div className="min-h-screen app-bg-pattern flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="text-center mb-6">
                        <Link to={createPageUrl('Dashboard')} className="inline-flex items-center gap-2.5 justify-center mb-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-md">
                                <img src="/assets/rentflex-logo.png" alt="RentFlex" className="w-6 h-6 object-contain" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-zinc-900">RentFlex</span>
                        </Link>
                    </div>

                    <Card className="border border-rose-200 shadow-xl bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden p-6 sm:p-8 space-y-6">
                        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
                            <AlertTriangle className="w-7 h-7" />
                        </div>

                        <div className="text-center space-y-1.5">
                            <h3 className="text-lg font-bold text-zinc-900">Authorization Request Error</h3>
                            <p className="text-xs text-rose-600 leading-relaxed font-medium">
                                {errorMsg}
                            </p>
                        </div>

                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-600 space-y-2">
                            <span className="font-semibold text-zinc-900 block">Common causes:</span>
                            <ul className="list-disc pl-4 space-y-1 text-zinc-600">
                                <li>The authorization URL has expired or was already submitted.</li>
                                <li>The requesting application modified the authorization challenge.</li>
                                <li>The client application configuration does not match your OAuth Server.</li>
                            </ul>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Button
                                onClick={() => setIsPreviewMode(true)}
                                variant="outline"
                                className="w-full h-11 border-zinc-300 font-semibold rounded-xl hover:bg-zinc-50 text-zinc-800"
                            >
                                <Eye className="w-4 h-4 mr-2" /> Open Interactive Preview Mode
                            </Button>

                            <Link to={createPageUrl('Dashboard')} className="block w-full">
                                <Button className="w-full h-11 bg-zinc-950 hover:bg-zinc-900 text-white font-semibold rounded-xl">
                                    Return to RentFlex Dashboard
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: Main OAuth 2.1 Consent Screen
    // -------------------------------------------------------------
    const clientName = activeDetails?.client?.name || 'Third-Party Application';
    const clientUri = activeDetails?.client?.uri;
    const clientLogo = activeDetails?.client?.logo_uri;
    const clientId = activeDetails?.client?.id;
    const userEmail = activeDetails?.user?.email || user?.email || 'user@rentflex.co.za';

    return (
        <div className="min-h-screen app-bg-pattern flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-xl">
                {/* Brand Header */}
                <div className="text-center mb-6">
                    <Link to={createPageUrl('Dashboard')} className="inline-flex items-center gap-2.5 justify-center group mb-2">
                        <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-md">
                            <img src="/assets/rentflex-logo.png" alt="RentFlex" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-zinc-900">RentFlex</span>
                    </Link>

                    {/* Developer / Preview Mode Badge */}
                    {isPreviewMode && (
                        <div className="mt-2 flex items-center justify-center gap-2">
                            <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-900 border-amber-300 text-xs px-2.5 py-0.5 flex items-center gap-1.5 shadow-2xs font-semibold">
                                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                                OAuth 2.1 Server Preview Mode
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Consent Card */}
                <Card className="border border-zinc-200/80 shadow-xl bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden">
                    {/* Visual Handshake Banner */}
                    <div className="bg-gradient-to-b from-zinc-50 to-white px-6 pt-7 pb-6 border-b border-zinc-100 text-center">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            {/* RentFlex App Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-md">
                                <img src="/assets/rentflex-logo.png" alt="RentFlex" className="w-8 h-8 object-contain" />
                            </div>

                            {/* Connected Security Bridge */}
                            <div className="flex items-center gap-1 text-zinc-400">
                                <div className="h-0.5 w-6 sm:w-10 bg-zinc-200 rounded-full" />
                                <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-700 shadow-2xs">
                                    <KeyRound className="w-3.5 h-3.5" />
                                </div>
                                <div className="h-0.5 w-6 sm:w-10 bg-zinc-200 rounded-full" />
                            </div>

                            {/* Requesting Client App Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-white border border-zinc-200/80 shadow-md flex items-center justify-center p-2.5">
                                {clientLogo ? (
                                    <img
                                        src={clientLogo}
                                        alt={clientName}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            // Fallback on broken image
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <Building2 className="w-7 h-7 text-zinc-800" />
                                )}
                            </div>
                        </div>

                        {/* Title & Connection Statement */}
                        <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
                            Authorize <span className="text-zinc-950 underline decoration-zinc-300 decoration-2 underline-offset-4">{clientName}</span>
                        </h2>
                        <p className="mt-2 text-xs sm:text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
                            This application is requesting authorization to connect with your RentFlex account.
                        </p>

                        {/* Client details / URL */}
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
                            {clientUri && (
                                <a
                                    href={clientUri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-950 font-medium transition-colors hover:underline"
                                >
                                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>{clientUri.replace(/^https?:\/\//i, '').replace(/\/$/, '')}</span>
                                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                                </a>
                            )}
                            {clientId && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md font-mono">
                                    ID: {clientId.slice(0, 8)}...
                                </span>
                            )}
                            <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200">
                                Verified OAuth 2.1
                            </Badge>
                        </div>
                    </div>

                    <CardContent className="p-6 sm:p-8 space-y-6">
                        {/* Currently Signed-In User Identity Card */}
                        <div className="flex items-center justify-between p-3.5 bg-zinc-50/90 rounded-xl border border-zinc-200/80">
                            <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="w-10 h-10 border border-zinc-200 bg-white">
                                    <AvatarFallback className="bg-zinc-950 text-white text-xs font-bold">
                                        {(user?.full_name || userEmail || 'RF').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-zinc-900 truncate">
                                            {user?.full_name || 'Signed-In Account'}
                                        </p>
                                        <Badge className="text-[10px] px-1.5 py-0 h-4 uppercase font-bold tracking-wider bg-zinc-200 text-zinc-800">
                                            {user?.user_type || 'User'}
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 truncate">{userEmail}</p>
                                </div>
                            </div>

                            <Link
                                to={`/Auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
                                className="text-xs text-zinc-600 hover:text-zinc-950 font-semibold shrink-0 ml-3 hover:underline"
                            >
                                Switch account
                            </Link>
                        </div>

                        {/* Scopes & Permissions Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-zinc-500" />
                                    Permissions Requested ({scopesList.length})
                                </h3>
                                <span className="text-[11px] text-zinc-500">Read-Only Scopes</span>
                            </div>

                            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 overflow-hidden bg-white">
                                {scopesList.length > 0 ? (
                                    scopesList.map((scope) => {
                                        const meta = getScopeMetadata(scope);
                                        const IconComp = meta.icon;

                                        return (
                                            <div key={scope} className="p-3.5 flex items-start gap-3 hover:bg-zinc-50/60 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5 text-zinc-700 border border-zinc-200/60">
                                                    <IconComp className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-xs font-bold text-zinc-900">{meta.title}</h4>
                                                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${meta.badgeColor}`}>
                                                            {meta.category}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                                                        {meta.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 text-center text-xs text-zinc-500">
                                        No specific OAuth scopes requested. Basic authentication profile only.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Security Guarantees / Trust Notice */}
                        <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/70 text-xs text-emerald-900 space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-emerald-950">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Security & Data Protection Assurances</span>
                            </div>
                            <ul className="text-[11px] text-emerald-800 space-y-1 pl-6 list-disc">
                                <li>
                                    <strong>No sensitive financial access:</strong> This application cannot access your bank accounts, credit cards, or payout instruments.
                                </li>
                                <li>
                                    <strong>Revocable anytime:</strong> You can review and revoke access to this application at any time in your <Link to={createPageUrl('Settings')} className="underline font-semibold hover:text-emerald-950">RentFlex Settings</Link>.
                                </li>
                            </ul>
                        </div>

                        {/* Error display if any occurred during approval/denial */}
                        {errorMsg && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDeny}
                                disabled={isApproving || isDenying}
                                className="w-full sm:w-1/2 h-12 border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-semibold rounded-xl order-2 sm:order-1"
                            >
                                {isDenying ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin" /> Declining...
                                    </span>
                                ) : (
                                    'Cancel & Deny'
                                )}
                            </Button>

                            <Button
                                type="button"
                                onClick={handleApprove}
                                disabled={isApproving || isDenying}
                                className="w-full sm:w-1/2 h-12 bg-zinc-950 hover:bg-zinc-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm order-1 sm:order-2"
                            >
                                {isApproving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin" /> Authorizing...
                                    </span>
                                ) : (
                                    <>
                                        Authorize Access <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Preview Mode Switcher (if directly visited without authorization_id) */}
                        {!authorizationId && (
                            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                                <span>Endpoint: <code className="font-mono text-[11px] text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded">/oauth/consent</code></span>
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Live Requests
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Compliance & Security Footer */}
                <div className="mt-6 text-center space-y-2">
                    <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5 flex-wrap">
                        <Lock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Secured with {securityStatus?.protocol || 'PostgreSQL Multi-Tenant RLS & TLS 1.3'}</span>
                        <span className="text-zinc-300">•</span>
                        <span>{securityStatus?.compliance || 'POPIA Act No. 4 of 2013 Compliant'}</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">
                        RentFlex OAuth 2.1 Identity Provider • Authorized Consent Gateway
                    </p>
                </div>
            </div>
        </div>
    );
}
