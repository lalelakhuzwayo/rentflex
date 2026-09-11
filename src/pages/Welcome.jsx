import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { motion } from 'framer-motion';
import {
    Building2,
    Home,
    TrendingUp,
    Shield,
    DollarSign,
    CheckCircle2,
    ArrowRight,
    Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BlockLoader from '@/components/ui/BlockLoader';

export default function Welcome() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        appClient.auth.me()
            .then(u => {
                setUser(u);
                // Redirect based on user type if already logged in
                if (u.onboarding_completed) {
                    if (u.user_type === 'sysAdmin') {
                        navigate(createPageUrl('SysAdminDashboard'));
                    } else if (u.user_type === 'landlord') {
                        navigate(createPageUrl('LandlordDashboard'));
                    } else {
                        navigate(createPageUrl('Dashboard'));
                    }
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleTenantPath = () => {
        if (user) {
            navigate(createPageUrl('Dashboard'));
        } else {
            navigate(createPageUrl('Auth') + '?mode=register');
        }
    };

    const handleLandlordPath = () => {
        if (user) {
            navigate(createPageUrl('LandlordOnboarding'));
        } else {
            navigate(createPageUrl('Auth') + '?mode=register');
        }
    };

    const handleSysAdminPath = () => {
        if (user) {
            navigate(createPageUrl('SysAdminDashboard'));
        } else {
            navigate(createPageUrl('Auth'));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center">
                <BlockLoader size="lg" text="Loading RentFlex" />
            </div>
        );
    }

    return (
        <div className="min-h-screen app-bg-pattern">
            {/* Header */}
            <header className="border-b border-zinc-200/80 bg-white/95 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-3 xs:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 xs:gap-3">
                            <div className="w-9 h-9 xs:w-10 xs:h-10 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-950 border border-zinc-800 shadow-xs shrink-0">
                                <img src="/assets/rentflex-logo.png" alt="RentFlex Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-xl xs:text-2xl font-bold text-zinc-900 tracking-tight">RentFlex</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {!user ? (
                                <>
                                    <Button
                                        variant="ghost"
                                        onClick={() => navigate(createPageUrl('Auth'))}
                                        className="text-sm px-3 font-semibold text-zinc-700 hover:bg-zinc-100"
                                    >
                                        Sign In
                                    </Button>
                                    <Button
                                        onClick={() => navigate(createPageUrl('Auth') + '?mode=register')}
                                        className="text-sm px-4 bg-zinc-950 hover:bg-zinc-900 text-white font-semibold rounded-xl"
                                    >
                                        Create Account
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={() => navigate(createPageUrl('Dashboard'))}
                                    className="text-sm px-4 bg-zinc-950 hover:bg-zinc-900 text-white font-semibold rounded-xl"
                                >
                                    Go to Dashboard
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-8 xs:py-12 sm:py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-3xl xs:text-4xl sm:text-6xl font-bold text-zinc-900 mb-4 xs:mb-6 tracking-tight">
                        The Modern Way to
                        <span className="block text-zinc-900">
                            Rent, Manage & Govern
                        </span>
                    </h1>
                    <p className="text-base xs:text-xl text-zinc-600 max-w-3xl mx-auto px-2">
                        Flexible payments. Verified tenants. Frictionless property management.
                        Dedicated controls for Tenants, Landlords, and Platform SysAdmins.
                    </p>
                </motion.div>

                {/* User Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-16">
                    {/* Tenant Card */}
                    <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150 flex flex-col justify-between">
                        <div>
                            <div className="w-11 h-11 bg-zinc-100 rounded-xl flex items-center justify-center mb-5">
                                <Home className="w-5 h-5 text-zinc-900" />
                            </div>

                            <h2 className="text-xl font-bold text-zinc-900 mb-2">I'm a Tenant</h2>
                            <p className="text-zinc-500 mb-6 text-sm leading-relaxed">
                                Find verified homes, build your portable RentScore, and pay on your own schedule.
                            </p>

                            <div className="space-y-2.5 mb-8">
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-xs text-zinc-700">Flexible weekly & monthly schedules</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-xs text-zinc-700">Build verified RentScore reputation</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-xs text-zinc-700">Browse & bid on verified rentals</span>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleTenantPath}
                            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium h-11 rounded-lg"
                        >
                            Get Started as Tenant
                            <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                    </div>

                    {/* Landlord Card */}
                    <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150 flex flex-col justify-between">
                        <div>
                            <div className="w-11 h-11 bg-zinc-100 rounded-xl flex items-center justify-center mb-5">
                                <Building2 className="w-5 h-5 text-zinc-900" />
                            </div>

                            <h2 className="text-xl font-bold text-zinc-900 mb-2">I'm a Landlord</h2>
                            <p className="text-zinc-500 mb-6 text-sm leading-relaxed">
                                List properties, screen verified tenants, and automate rent collection seamlessly.
                            </p>

                            <div className="space-y-2.5 mb-8">
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-xs text-zinc-700">RentScore tenant screening</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-xs text-zinc-700">Automated payout collection</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-xs text-zinc-700">Maintenance & repairs hub</span>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleLandlordPath}
                            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium h-11 rounded-lg"
                        >
                            Get Started as Landlord
                            <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                    </div>

                    {/* SysAdmin Card */}
                    <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150 flex flex-col justify-between">
                        <div>
                            <div className="w-11 h-11 bg-zinc-900 text-white rounded-xl flex items-center justify-center mb-5">
                                <Shield className="w-5 h-5 text-white" />
                            </div>

                            <h2 className="text-xl font-bold text-zinc-900 mb-2">I'm a SysAdmin</h2>
                            <p className="text-zinc-500 mb-6 text-sm leading-relaxed">
                                System management, platform governance, user role access, and infrastructure telemetry.
                            </p>

                            <div className="space-y-2.5 mb-8">
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-xs text-zinc-700">Triple-tier account management</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-xs text-zinc-700">Property and lease portfolio governance</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-xs text-zinc-700">PostgreSQL telemetry & platform health</span>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleSysAdminPath}
                            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium h-11 rounded-lg"
                        >
                            Access SysAdmin Control
                            <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                    </div>
                </div>

                {/* Features Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="max-w-6xl mx-auto"
                >
                    <h3 className="text-xl xs:text-2xl font-bold text-center text-slate-900 mb-6 xs:mb-10">
                        Why Choose RentFlex?
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150">
                            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center mb-3">
                                <DollarSign className="w-5 h-5 text-zinc-900" />
                            </div>
                            <h4 className="font-semibold text-zinc-900 text-sm mb-1">Flexible Payments</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">Pay weekly, monthly, or split it up with BNPL options</p>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150">
                            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center mb-3">
                                <TrendingUp className="w-5 h-5 text-zinc-900" />
                            </div>
                            <h4 className="font-semibold text-zinc-900 text-sm mb-1">RentScore</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">Build verified rental reputation that follows you</p>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150">
                            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center mb-3">
                                <Shield className="w-5 h-5 text-zinc-900" />
                            </div>
                            <h4 className="font-semibold text-zinc-900 text-sm mb-1">Secure & Safe</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">Bank-level security with deposit protection</p>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150">
                            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center mb-3">
                                <Zap className="w-5 h-5 text-zinc-900" />
                            </div>
                            <h4 className="font-semibold text-zinc-900 text-sm mb-1">Fast Setup</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">Get started in minutes, not days</p>
                        </div>
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-20 bg-zinc-950 rounded-3xl p-10 text-white border border-zinc-800"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 xs:gap-8 max-w-4xl mx-auto">
                        <div className="text-center">
                            <p className="text-2xl xs:text-4xl font-bold mb-2 text-white">10,000+</p>
                            <p className="text-zinc-400 text-sm xs:text-base">Active Properties</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl xs:text-4xl font-bold mb-2 text-white">98%</p>
                            <p className="text-zinc-400 text-sm xs:text-base">On-Time Payments</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl xs:text-4xl font-bold mb-2 text-white">R2.5M+</p>
                            <p className="text-zinc-400 text-sm xs:text-base">Rent Processed</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <footer className="border-t border-zinc-200 bg-white">
                <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-6 xs:py-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 xs:gap-4">
                        <p className="text-zinc-500 text-xs xs:text-sm text-center sm:text-left">© 2026 RentFlex. All rights reserved.</p>
                        <div className="flex gap-4 xs:gap-6 text-xs xs:text-sm text-zinc-600">
                            <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
                            <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
                            <a href="#" className="hover:text-zinc-900 transition-colors">Support</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
