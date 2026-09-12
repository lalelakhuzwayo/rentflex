import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useAuth } from '@/lib/AuthContext';
import {
    Home,
    Building2,
    CreditCard,
    Shield,
    ShieldCheck,
    Settings,
    Menu,
    LogOut,
    User,
    Users,
    Wrench,
    FileText,
    TrendingUp,
    ArrowUp,
    Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import DatabaseHealthCard from '@/components/dashboard/DatabaseHealthCard';
import MobileInstallBanner from '@/components/pwa/MobileInstallBanner';

// Zero-re-render high performance scroll progress indicator with compositor offloading
function ScrollProgressBar() {
    const barRef = React.useRef(null);

    useEffect(() => {
        // If native CSS scroll-timeline is supported, browser animates purely on GPU compositor thread
        if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline', 'scroll()')) {
            return;
        }

        let ticking = false;
        let maxScroll = 1;

        const updateMaxScroll = () => {
            maxScroll = Math.max(1, (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight);
        };

        const updateProgress = () => {
            if (!barRef.current) return;
            const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
            barRef.current.style.transform = `scaleX(${progress})`;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateProgress);
                ticking = true;
            }
        };

        updateMaxScroll();
        updateProgress();

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', updateMaxScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', updateMaxScroll);
        };
    }, []);

    return (
        <div className="w-full h-0.5 bg-zinc-200/60 overflow-hidden pointer-events-none">
            <div
                ref={barRef}
                className="h-full w-full bg-zinc-900 origin-left scroll-progress-fill transform-gpu will-change-transform"
                style={{ transform: 'scaleX(0)' }}
            />
        </div>
    );
}

// Zero-lag scroll-to-top button (desktop/tablet only, hidden on mobile to avoid blocking navigation bar)
function ScrollToTopButton() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let ticking = false;
        const checkScroll = () => {
            const isScrolled = window.scrollY > 250;
            setVisible((prev) => (prev !== isScrolled ? isScrolled : prev));
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(checkScroll);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        checkScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!visible) return null;

    return (
        <button
            onClick={scrollToTop}
            title="Scroll to Top"
            className="hidden md:flex fixed bottom-6 right-6 z-30 bg-zinc-900 hover:bg-zinc-800 text-white p-3 rounded-full shadow-lg transition-all duration-200 items-center justify-center border border-zinc-700/50 hover:scale-105 active:scale-95"
            aria-label="Scroll to top"
        >
            <ArrowUp className="w-4 h-4 text-white" />
        </button>
    );
}

export default function Layout({ children, currentPageName }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { 
        user, 
        logout, 
        role: userRole, 
        securityStatus 
    } = useAuth();
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Hide navigation chrome when user is on the Auth login/register page
    const isAuthPage = 
        currentPageName?.toLowerCase() === 'auth' || 
        location.pathname.toLowerCase().includes('/auth');

    // Scroll to top on every page mount / route change
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [currentPageName]);

    let mainNavigation = [];
    let secondaryNavigation = [];

    if (!user) {
        // Guest Mode Navigation
        mainNavigation = [
            { name: 'Home', href: createPageUrl('Dashboard'), icon: Home, badge: null },
            { name: 'Explore Properties', href: createPageUrl('Properties'), icon: Building2, badge: 'Explore' },
            { name: 'RentScore System', href: createPageUrl('RentScore'), icon: TrendingUp, badge: null },
        ];
        secondaryNavigation = [
            { name: 'Legal & POPIA Policy', href: createPageUrl('PrivacyPolicy'), icon: ShieldCheck, badge: 'POPIA' },
        ];
    } else if (userRole === 'sysAdmin') {
        mainNavigation = [
            { name: 'System Admin', href: createPageUrl('SysAdminDashboard'), icon: Shield, badge: 'Control' },
            { name: 'All Properties', href: createPageUrl('Properties'), icon: Building2, badge: null },
            { name: 'Screening & Users', href: createPageUrl('ApplicationScreening'), icon: Users, badge: null },
            { name: 'Payments & Paygate', href: createPageUrl('Payments'), icon: CreditCard, badge: null },
            { name: 'Leases', href: createPageUrl('Leases'), icon: FileText, badge: null },
        ];
        secondaryNavigation = [
            { name: 'Tenant Portal', href: createPageUrl('Dashboard'), icon: Home, badge: 'Portal' },
            { name: 'Landlord Portal', href: createPageUrl('LandlordDashboard'), icon: Building2, badge: 'Portal' },
            { name: 'Maintenance', href: createPageUrl('Maintenance'), icon: Wrench, badge: null },
            { name: 'Jobs Board', href: createPageUrl('Jobs'), icon: Wrench, badge: null },
            { name: 'Legal & POPIA Policy', href: createPageUrl('PrivacyPolicy'), icon: ShieldCheck, badge: 'POPIA' },
        ];
    } else if (userRole === 'landlord') {
        mainNavigation = [
            { name: 'Dashboard', href: createPageUrl('LandlordDashboard'), icon: Home, badge: null },
            { name: 'My Properties', href: createPageUrl('Properties'), icon: Building2, badge: null },
            { name: 'Tenant Screening', href: createPageUrl('ApplicationScreening'), icon: Users, badge: 'Review' },
            { name: 'Rent Payments', href: createPageUrl('Payments'), icon: CreditCard, badge: null },
            { name: 'Leases', href: createPageUrl('Leases'), icon: FileText, badge: null },
        ];
        secondaryNavigation = [
            { name: 'Maintenance', href: createPageUrl('Maintenance'), icon: Wrench, badge: null },
            { name: 'Contractor Jobs', href: createPageUrl('Jobs'), icon: Wrench, badge: null },
            { name: 'Legal & POPIA Policy', href: createPageUrl('PrivacyPolicy'), icon: ShieldCheck, badge: 'POPIA' },
        ];
    } else if (userRole === 'contractor') {
        mainNavigation = [
            { name: 'Contractor Hub', href: createPageUrl('ContractorDashboard'), icon: Wrench, badge: 'Contractor' },
            { name: 'Jobs Board', href: createPageUrl('Jobs'), icon: Building2, badge: 'Jobs' },
            { name: 'Maintenance Tasks', href: createPageUrl('Maintenance'), icon: Wrench, badge: null },
            { name: 'Pro Subscription', href: createPageUrl('ContractorSubscription'), icon: CreditCard, badge: 'Pro' },
        ];
        secondaryNavigation = [
            { name: 'Contractor Verification', href: createPageUrl('ContractorOnboarding'), icon: ShieldCheck, badge: null },
            { name: 'Legal & POPIA Policy', href: createPageUrl('PrivacyPolicy'), icon: ShieldCheck, badge: 'POPIA' },
        ];
    } else {
        // Tenant
        mainNavigation = [
            { name: 'Dashboard', href: createPageUrl('Dashboard'), icon: Home, badge: null },
            { name: 'Browse Homes', href: createPageUrl('Properties'), icon: Building2, badge: 'Find' },
            { name: 'My Payments', href: createPageUrl('Payments'), icon: CreditCard, badge: 'BNPL' },
            { name: 'RentScore', href: createPageUrl('RentScore'), icon: TrendingUp, badge: 'Rating' },
            { name: 'My Leases', href: createPageUrl('Leases'), icon: FileText, badge: null },
        ];
        secondaryNavigation = [
            { name: 'Maintenance Request', href: createPageUrl('Maintenance'), icon: Wrench, badge: null },
            { name: 'Legal & POPIA Policy', href: createPageUrl('PrivacyPolicy'), icon: ShieldCheck, badge: 'POPIA' },
        ];
    }

    const handleLogout = () => {
        logout();
    };

    const mobileNavItems = !user ? [
        { name: 'Home', href: createPageUrl('Dashboard'), icon: Home, page: 'Dashboard' },
        { name: 'Explore', href: createPageUrl('Properties'), icon: Building2, page: 'Properties' },
        { name: 'Sign In', href: createPageUrl('Auth'), icon: User, page: 'Auth' },
        { name: 'Register', href: createPageUrl('Auth') + '?mode=register', icon: Lock, page: 'Auth' },
    ] : userRole === 'sysAdmin' ? [
        { name: 'Admin', href: createPageUrl('SysAdminDashboard'), icon: Shield, page: 'SysAdminDashboard' },
        { name: 'Listings', href: createPageUrl('Properties'), icon: Building2, page: 'Properties' },
        { name: 'Screening', href: createPageUrl('ApplicationScreening'), icon: Users, page: 'ApplicationScreening' },
        { name: 'Payments', href: createPageUrl('Payments'), icon: CreditCard, page: 'Payments' },
    ] : userRole === 'landlord' ? [
        { name: 'Home', href: createPageUrl('LandlordDashboard'), icon: Home, page: 'LandlordDashboard' },
        { name: 'Units', href: createPageUrl('Properties'), icon: Building2, page: 'Properties' },
        { name: 'Screening', href: createPageUrl('ApplicationScreening'), icon: Users, page: 'ApplicationScreening' },
        { name: 'Payments', href: createPageUrl('Payments'), icon: CreditCard, page: 'Payments' },
    ] : userRole === 'contractor' ? [
        { name: 'Hub', href: createPageUrl('ContractorDashboard'), icon: Wrench, page: 'ContractorDashboard' },
        { name: 'Jobs', href: createPageUrl('Jobs'), icon: Building2, page: 'Jobs' },
        { name: 'Maintenance', href: createPageUrl('Maintenance'), icon: Wrench, page: 'Maintenance' },
        { name: 'Plan', href: createPageUrl('ContractorSubscription'), icon: CreditCard, page: 'ContractorSubscription' },
    ] : [
        { name: 'Home', href: createPageUrl('Dashboard'), icon: Home, page: 'Dashboard' },
        { name: 'Explore', href: createPageUrl('Properties'), icon: Building2, page: 'Properties' },
        { name: 'Payments', href: createPageUrl('Payments'), icon: CreditCard, page: 'Payments' },
        { name: 'RentScore', href: createPageUrl('RentScore'), icon: TrendingUp, page: 'RentScore' },
    ];

    return (
        <div className="min-h-screen app-bg-pattern font-sans antialiased flex flex-col relative pb-[env(safe-area-inset-bottom)]">
            {/* Top Sticky Navigation Bar (Hidden when Auth form is active) */}
            {!isAuthPage && (
                <header className="bg-white/95 backdrop-blur-md border-b border-zinc-200/70 sticky top-0 z-40 transform-gpu will-change-transform">
                {/* Top Smart Scroll Progress Line Indicator */}
                <ScrollProgressBar />

                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        
                        {/* Left: Drawer Menu Button & Logo */}
                        <div className="flex items-center gap-2.5 sm:gap-4">
                            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="hidden md:flex items-center gap-2 border border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900 font-medium text-zinc-700 h-9 px-3 rounded-lg"
                                        aria-label="Open Navigation Drawer"
                                    >
                                        <Menu className="w-4 h-4 text-zinc-800" />
                                        <span className="text-xs font-semibold tracking-wide uppercase">Menu</span>
                                    </Button>
                                </SheetTrigger>

                                {/* Navigation Drawer Slide-Out (Left Side) */}
                                <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col justify-between border-r border-zinc-200 bg-white shadow-2xl">
                                    <div className="flex-1 overflow-hidden flex flex-col">
                                        {/* Drawer Header */}
                                        <div className="h-16 px-4 border-b border-zinc-800 bg-zinc-950 text-white flex items-center justify-start pr-12 shrink-0">
                                            <Link to={createPageUrl('Dashboard')} onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-zinc-900 border border-zinc-700 shadow-xs shrink-0">
                                                    <img src="/assets/rentflex-logo.png" alt="RentFlex Logo" className="w-full h-full object-contain" />
                                                </div>
                                                <span className="hidden sm:inline-block text-base font-bold tracking-tight text-white leading-none">
                                                    RentFlex
                                                </span>
                                            </Link>
                                        </div>

                                        {/* User Quick Info or Guest Info */}
                                        {user ? (
                                            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between gap-2.5 shrink-0">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Avatar className="w-8 h-8 border border-zinc-200 shadow-none shrink-0">
                                                        <AvatarFallback className="bg-zinc-900 text-white font-semibold text-xs">
                                                            {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-zinc-900 truncate">
                                                            {user.full_name || 'User Account'}
                                                        </p>
                                                        <p className="text-[11px] text-zinc-500 truncate">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="bg-zinc-200 text-zinc-800 border-zinc-300 capitalize text-[10px] px-2 py-0.5 shrink-0 font-semibold">
                                                    {userRole}
                                                </Badge>
                                            </div>
                                        ) : (
                                            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between gap-2.5 shrink-0">
                                                <div>
                                                    <p className="text-xs font-semibold text-zinc-900">Guest Visitor</p>
                                                    <p className="text-[11px] text-zinc-500">Sign in to access your portal</p>
                                                </div>
                                                <Link to={createPageUrl('Auth')} onClick={() => setDrawerOpen(false)}>
                                                    <Button size="sm" className="h-7 text-xs bg-zinc-950 hover:bg-zinc-900 text-white px-2.5 rounded-lg">
                                                        Sign In
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}

                                        {/* Main Scrollable Navigation Links & Accounts Switcher */}
                                        <div className="p-4 space-y-6 overflow-y-auto flex-1">
                                            {/* Section 1: Main Portal Navigation */}
                                            <div>
                                                <h3 className="px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                                    Main Portal
                                                </h3>
                                                <nav className="space-y-1">
                                                    {mainNavigation.map((item) => {
                                                        const isActive = currentPageName === item.name || (item.name === 'Jobs Board' && currentPageName === 'Jobs');
                                                        return (
                                                            <Link
                                                                key={item.name}
                                                                to={item.href}
                                                                onClick={() => setDrawerOpen(false)}
                                                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                                                    isActive
                                                                        ? 'bg-zinc-900 text-white font-semibold'
                                                                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <item.icon className="w-4 h-4" />
                                                                    <span>{item.name}</span>
                                                                </div>
                                                                {item.badge && (
                                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                                                                        {item.badge}
                                                                    </span>
                                                                )}
                                                            </Link>
                                                        );
                                                    })}
                                                </nav>
                                            </div>

                                            {/* Section 2: Operations & Governance */}
                                            {secondaryNavigation.length > 0 && (
                                                <div>
                                                    <h3 className="px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                                        Operations & Governance
                                                    </h3>
                                                    <nav className="space-y-1">
                                                        {secondaryNavigation.map((item) => {
                                                            const isActive = currentPageName === item.name || (item.name === 'Legal & POPIA Policy' && currentPageName === 'PrivacyPolicy');
                                                            return (
                                                                <Link
                                                                    key={item.name}
                                                                    to={item.href}
                                                                    onClick={() => setDrawerOpen(false)}
                                                                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                                                        isActive
                                                                            ? 'bg-zinc-900 text-white font-semibold'
                                                                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <item.icon className="w-4 h-4" />
                                                                        <span>{item.name}</span>
                                                                    </div>
                                                                    {item.badge && (
                                                                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                                                            {item.badge}
                                                                        </span>
                                                                    )}
                                                                </Link>
                                                            );
                                                        })}
                                                    </nav>
                                                </div>
                                            )}


                                            {/* Section 4: Preferences & Security */}
                                            <div className="pt-2 border-t border-zinc-100">
                                                <h3 className="px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                                    Preferences
                                                </h3>
                                                <Link
                                                    to={createPageUrl('Settings')}
                                                    onClick={() => setDrawerOpen(false)}
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                                        currentPageName === 'Settings'
                                                            ? 'bg-zinc-900 text-white font-semibold'
                                                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                                    }`}
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    <span>Settings & Profile</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Drawer Footer with Database Health & Sign Out */}
                                    <div className="p-4 border-t border-zinc-100 bg-zinc-50 space-y-3 shrink-0">
                                        {/* Real-time Database Health & Connection Test (Development Only) */}
                                        {import.meta.env.DEV && <DatabaseHealthCard />}

                                        {user ? (
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <LogOut className="w-4 h-4" />
                                                    <span>Sign Out</span>
                                                </div>
                                            </button>
                                        ) : (
                                            <Link
                                                to={createPageUrl('Auth')}
                                                onClick={() => setDrawerOpen(false)}
                                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Lock className="w-4 h-4 text-zinc-700" />
                                                    <span>Sign In / Register</span>
                                                </div>
                                                <ArrowUp className="w-3.5 h-3.5 rotate-45 text-zinc-500" />
                                            </Link>
                                        )}
                                    </div>
                                </SheetContent>
                            </Sheet>

                            {/* Brand Logo */}
                            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2 sm:gap-2.5">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex items-center justify-center bg-zinc-950 border border-zinc-900 shadow-xs shrink-0">
                                    <img src="/assets/rentflex-logo.png" alt="RentFlex Logo" className="w-full h-full object-contain" />
                                </div>
                                <span className="hidden sm:inline-block text-base sm:text-lg font-bold text-zinc-900 tracking-tight">RentFlex</span>
                            </Link>

                            {/* Active Page Indicator */}
                            {currentPageName && (
                                <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-zinc-200">
                                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        {currentPageName}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Right: Quick Action Shortcuts & User Menu */}
                        <div className="flex items-center gap-1.5 sm:gap-3">
                            {user ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="flex items-center gap-1.5 hover:bg-zinc-100 p-1 sm:px-3 rounded-lg h-8 sm:h-9">
                                            <Avatar className="w-6 h-6 sm:w-7 sm:h-7 border border-zinc-200">
                                                <AvatarFallback className="bg-zinc-900 text-white text-[10px] sm:text-[11px] font-bold">
                                                    {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="hidden md:block text-xs font-medium text-zinc-700 max-w-[100px] truncate">
                                                {user.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                                            </span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border border-zinc-200 p-1">
                                        <div className="px-3 py-2">
                                            <p className="text-sm font-semibold text-zinc-900">{user.full_name || 'Account'}</p>
                                            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                                            <Badge className={`mt-1.5 capitalize text-[10px] ${
                                                userRole === 'sysAdmin' ? 'bg-purple-900 text-white' :
                                                userRole === 'landlord' ? 'bg-zinc-900 text-white' :
                                                'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                            }`}>
                                                Role: {userRole}
                                            </Badge>
                                        </div>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link to={createPageUrl('Settings')} className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                                                <Settings className="w-4 h-4 text-zinc-500" />
                                                Settings
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleLogout} className="text-xs font-medium text-rose-600 cursor-pointer">
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Sign out
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Link to={createPageUrl('Auth')}>
                                        <Button size="sm" variant="ghost" className="text-xs font-semibold h-8 sm:h-9 px-3 rounded-lg hover:bg-zinc-100">
                                            Sign In
                                        </Button>
                                    </Link>
                                    <Link to={createPageUrl('Auth') + '?mode=register'}>
                                        <Button size="sm" className="text-xs font-semibold h-8 sm:h-9 px-3.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-lg shadow-xs">
                                            Register
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            )}

            {/* Main Page Content */}
            <main className={`flex-1 w-full mx-auto ${isAuthPage ? 'max-w-full p-0' : 'max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8'}`}>
                {children}
            </main>

            {/* Mobile Bottom Navigation Bar (Hidden when Auth form is active) */}
            {!isAuthPage && (
                <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 md:hidden mobile-bottom-nav transform-gpu will-change-transform">
                    <div className="grid grid-cols-5 h-14 items-center justify-around px-1 max-w-md mx-auto">
                        {mobileNavItems.map((item) => {
                            const isActive = currentPageName === item.page || (item.page === 'Dashboard' && currentPageName === 'Home');
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`flex flex-col items-center justify-center h-full py-1 transition-all ${
                                        isActive ? 'text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-700'
                                    }`}
                                >
                                    <div className={`p-1 rounded-md transition-colors ${isActive ? 'bg-zinc-100 text-zinc-950' : ''}`}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] tracking-tight leading-tight mt-0.5">{item.name}</span>
                                </Link>
                            );
                        })}

                        {/* Quick Menu Button to Open Full Drawer */}
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="flex flex-col items-center justify-center h-full py-1 text-zinc-400 hover:text-zinc-700 transition-all"
                        >
                            <div className="p-1 rounded-md">
                                <Menu className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] tracking-tight leading-tight mt-0.5">More</span>
                        </button>
                    </div>
                </nav>
            )}

            {/* Smart Floating Scroll-to-Top Button */}
            <ScrollToTopButton />

            {/* Mobile PWA Download & Installation Banner */}
            {!isAuthPage && <MobileInstallBanner />}
        </div>
    );
}
