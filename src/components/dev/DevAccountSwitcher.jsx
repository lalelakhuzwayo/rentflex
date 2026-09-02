import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wrench,
    Shield,
    Building2,
    Home,
    Check,
    ChevronUp,
    ChevronDown,
    Database,
    UserCheck,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function DevAccountSwitcher() {
    const [user, setUser] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const queryClient = useQueryClient();

    // Check if development environment
    const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

    const loadData = async () => {
        try {
            const currentUser = await appClient.auth.me();
            setUser(currentUser);
            const dbAccounts = await appClient.auth.getAccounts();
            setAccounts(dbAccounts);
        } catch (err) {
            console.error('Error loading dev accounts:', err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (!isDev) return null;

    const handleSwitch = async (targetEmail, targetRole) => {
        setLoading(true);
        try {
            const switchedUser = await appClient.auth.switchAccount(targetEmail || targetRole);
            setUser(switchedUser);
            queryClient.clear();
            toast.success(`Active Account switched to ${switchedUser.full_name} (${switchedUser.user_type}) in Database!`);
            
            // Navigate or refresh to load role-specific views
            setTimeout(() => {
                if (switchedUser.user_type === 'sysAdmin') {
                    window.location.href = '/SysAdminDashboard';
                } else if (switchedUser.user_type === 'landlord') {
                    window.location.href = '/LandlordDashboard';
                } else {
                    window.location.href = '/Dashboard';
                }
            }, 300);
        } catch (err) {
            toast.error(`Failed to switch account: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const currentRole = user?.user_type === 'admin' ? 'sysAdmin' : (user?.user_type === 'rentee' ? 'tenant' : (user?.user_type || 'landlord'));

    return (
        <div className="fixed bottom-16 sm:bottom-4 left-3 sm:left-4 z-50 font-sans text-xs">
            <div className="bg-zinc-950 text-white rounded-none border-2 border-amber-400 shadow-2xl overflow-hidden w-[calc(100vw-24px)] max-w-sm sm:max-w-md">
                {/* Header Bar */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="px-3 py-2 bg-amber-400 text-zinc-950 flex items-center justify-between cursor-pointer font-bold select-none gap-2"
                >
                    <div className="flex items-center gap-1.5">
                        <img src="/assets/rentflex-logo.png" alt="RentFlex Logo" className="w-4 h-4 rounded-xs object-contain bg-zinc-950 p-0.5" />
                        <span className="uppercase tracking-wider text-[11px]">DEV TOOL: DB Account Switcher</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-zinc-950 text-amber-400 border-none text-[10px] px-1.5 py-0 capitalize">
                            Active: {currentRole}
                        </Badge>
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </div>
                </div>

                {/* Expanded Switcher Body */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="p-3.5 space-y-3 bg-zinc-900 border-t border-zinc-800"
                        >
                            <div className="flex items-center justify-between text-zinc-300 pb-2 border-b border-zinc-800">
                                <div>
                                    <p className="font-semibold text-white text-xs">{user?.full_name || 'Database User'}</p>
                                    <p className="text-[10px] text-zinc-400 font-mono">{user?.email}</p>
                                </div>
                                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                                    <Database className="w-3 h-3" /> Postgres Live
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                                    Switch active database session ({accounts.length} users):
                                </p>
                                <button
                                    onClick={loadData}
                                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
                                    title="Reload users from PostgreSQL"
                                >
                                    <RefreshCw className="w-3 h-3" /> Refresh
                                </button>
                            </div>

                            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                                {accounts.map((acc) => {
                                    const isCurrent = user?.email === acc.email;
                                    const normalizedType = (acc.user_type === 'admin' ? 'sysAdmin' : (acc.user_type === 'rentee' ? 'tenant' : acc.user_type || 'tenant')).toLowerCase();

                                    let roleIcon = Home;
                                    let roleColor = 'bg-blue-950/80 border-blue-400 text-white';
                                    let badgeColor = 'bg-blue-900 text-blue-200';

                                    if (normalizedType === 'sysadmin') {
                                        roleIcon = Shield;
                                        roleColor = 'bg-purple-950/80 border-purple-400 text-white';
                                        badgeColor = 'bg-purple-900 text-purple-200';
                                    } else if (normalizedType === 'landlord') {
                                        roleIcon = Building2;
                                        roleColor = 'bg-emerald-950/80 border-emerald-400 text-white';
                                        badgeColor = 'bg-emerald-900 text-emerald-200';
                                    } else if (normalizedType === 'contractor') {
                                        roleIcon = Wrench;
                                        roleColor = 'bg-amber-950/80 border-amber-400 text-white';
                                        badgeColor = 'bg-amber-900 text-amber-200';
                                    }

                                    const RoleIconComponent = roleIcon;

                                    return (
                                        <button
                                            key={acc.email}
                                            onClick={() => handleSwitch(acc.email, acc.user_type)}
                                            disabled={loading}
                                            className={`w-full flex items-center justify-between p-2 text-left transition-all border ${
                                                isCurrent
                                                    ? roleColor
                                                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${badgeColor}`}>
                                                    <RoleIconComponent className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-bold text-[11px] text-white truncate">
                                                            {acc.full_name || acc.email.split('@')[0]}
                                                        </p>
                                                        <span className="text-[9px] px-1 py-0 rounded bg-zinc-800 text-zinc-300 font-mono capitalize">
                                                            {acc.user_type}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-400 font-mono truncate">{acc.email}</p>
                                                </div>
                                            </div>
                                            {isCurrent && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1.5" />}
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="text-[9px] text-zinc-500 pt-1 text-center font-mono">
                                Updates PostgreSQL DB session & active user permissions live.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
