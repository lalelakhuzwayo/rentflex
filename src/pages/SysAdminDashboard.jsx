import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { authActions } from '@/api/authActions';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Shield,
    Users,
    Building2,
    CheckCircle2,
    Search,
    Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BlockLoader from '@/components/ui/BlockLoader';
import { toast } from 'sonner';

export default function SysAdminDashboard() {
    const queryClient = useQueryClient();
    const [currentUser, setCurrentUser] = useState(null);
    const [searchUser, setSearchUser] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [systemHealth, setSystemHealth] = useState({ status: 'checking', db: 'connecting...' });
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        appClient.auth.me().then(setCurrentUser).catch(() => { });
        checkHealth();
    }, []);

    const checkHealth = async () => {
        if (!isSupabaseConfigured) {
            setSystemHealth({ status: 'degraded', db: 'Supabase credentials not configured in .env' });
            return;
        }
        try {
            const { error } = await supabase.from('profiles').select('id').limit(1);
            if (!error) {
                setSystemHealth({ status: 'healthy', db: 'Supabase PostgreSQL', time: new Date().toISOString() });
            } else {
                setSystemHealth({ status: 'degraded', db: 'Supabase: ' + error.message });
            }
        } catch {
            setSystemHealth({ status: 'offline', db: 'Supabase Unreachable' });
        }
    };

    // Queries
    const { data: properties = [], isLoading: loadingProps } = useQuery({
        queryKey: ['sysadmin-properties'],
        queryFn: () => appClient.entities.Property.list(),
    });

    const { data: leases = [] } = useQuery({
        queryKey: ['sysadmin-leases'],
        queryFn: () => appClient.entities.Lease.list(),
    });

    const { data: payments = [] } = useQuery({
        queryKey: ['sysadmin-payments'],
        queryFn: () => appClient.entities.Payment.list(),
    });

    const { data: realProfiles = [], refetch: refetchProfiles } = useQuery({
        queryKey: ['sysadmin-profiles'],
        queryFn: () => appClient.entities.Profile.list(),
    });

    const usersList = realProfiles || [];

    const handleUpdateUserRole = async (userId, newRole) => {
        try {
            await authActions.updateUserRole(userId, newRole);

            if (currentUser?.id === userId || currentUser?.email === usersList.find(u => u.id === userId)?.email) {
                await appClient.auth.updateMe({ user_type: newRole });
                window.location.reload();
            } else {
                queryClient.invalidateQueries({ queryKey: ['sysadmin-profiles'] });
            }
            toast.success(`User role updated to ${newRole}`);
        } catch (err) {
            console.error('Error updating user role:', err);
            toast.error(err.message || 'Failed to update user role');
            refetchProfiles();
        }
    };

    const handleToggleVerification = async (userId) => {
        try {
            const targetUser = usersList.find(u => u.id === userId);
            const nextVerified = !(targetUser?.verified || targetUser?.id_verified);

            await authActions.verifyUserAccount(userId, nextVerified);

            queryClient.invalidateQueries({ queryKey: ['sysadmin-profiles'] });
            toast.success(`Account verification updated to ${nextVerified ? 'Verified' : 'Pending'}`);
        } catch (err) {
            console.error('Error toggling verification:', err);
            toast.error(err.message || 'Failed to update verification status');
            refetchProfiles();
        }
    };

    const handleSwitchCurrentRole = async (newRole) => {
        try {
            await appClient.auth.updateMe({ user_type: newRole });
            toast.success(`Active portal role switched to ${newRole}`);
            setTimeout(() => {
                window.location.reload();
            }, 300);
        } catch (e) {
            toast.error(e.message || 'Failed to switch role');
        }
    };


    const totalRentProcessed = payments
        .filter(p => p.status === 'paid' || p.status === 'completed')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const activeLandlords = usersList.filter(u => u.user_type === 'landlord').length;
    const activeTenants = usersList.filter(u => u.user_type === 'tenant' || u.user_type === 'rentee').length;
    const activeContractors = usersList.filter(u => u.user_type === 'contractor').length;
    const activeAdmins = usersList.filter(u => u.user_type === 'sysAdmin').length;

    const filteredUsers = usersList.filter(u => {
        const matchesSearch = u.full_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchUser.toLowerCase());
        const matchesRole = roleFilter === 'all' || u.user_type === roleFilter || (roleFilter === 'tenant' && u.user_type === 'rentee');
        const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    if (loadingProps) {
        return (
            <div className="flex justify-center items-center py-24">
                <BlockLoader size="lg" text="Loading System Administrator Control Center" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200/80 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">System Administration</h1>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                        Platform governance, multi-role account matrix, lease oversight, and infrastructure metrics.
                    </p>
                </div>
            </div>

            {/* Platform KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="sharp-card bg-white p-3.5 sm:p-5 border border-transparent hover:border-zinc-900 transition-all duration-200"
                >
                    <div className="mb-1 sm:mb-2">
                        <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">Account Matrix</span>
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-zinc-900 tracking-tight">{usersList.length} Accounts</div>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-1 sm:mt-2 text-[10px] sm:text-[11px] text-zinc-500 font-medium leading-tight">
                        <span className="text-zinc-900 font-bold">{activeAdmins} Admin</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">{activeLandlords} Owners</span>
                        <span>•</span>
                        <span className="text-blue-700 font-bold">{activeTenants} Tenants</span>
                        <span>•</span>
                        <span className="text-amber-700 font-bold">{activeContractors} Contractors</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.2 }}
                    className="sharp-card bg-white p-3.5 sm:p-5 border border-transparent hover:border-zinc-900 transition-all duration-200"
                >
                    <div className="mb-1 sm:mb-2">
                        <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">Managed Properties</span>
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-zinc-900 tracking-tight">{properties.length} Units</div>
                    <div className="flex items-center gap-1.5 mt-1 sm:mt-2 text-[10px] sm:text-[11px] text-zinc-500 font-medium leading-tight">
                        <span className="text-emerald-700 font-bold">{properties.filter(p => p.status === 'available').length} Vacant</span>
                        <span>•</span>
                        <span className="text-zinc-900 font-bold">{properties.filter(p => p.status === 'rented').length} Occupied</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="sharp-card bg-white p-3.5 sm:p-5 border border-transparent hover:border-zinc-900 transition-all duration-200"
                >
                    <div className="mb-1 sm:mb-2">
                        <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Tenancies</span>
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-zinc-900 tracking-tight">{leases.length} Leases</div>
                    <div className="flex items-center gap-1.5 mt-1 sm:mt-2 text-[10px] sm:text-[11px] text-zinc-500 font-medium leading-tight">
                        <span className="text-emerald-700 font-bold">{leases.filter(l => l.status === 'active').length} Active</span>
                        <span>•</span>
                        <span className="text-zinc-600">{leases.filter(l => l.status === 'pending').length} Pending</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.2 }}
                    className="sharp-card bg-white p-3.5 sm:p-5 border border-transparent hover:border-zinc-900 transition-all duration-200"
                >
                    <div className="mb-1 sm:mb-2">
                        <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">Settled Rent Volume</span>
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-zinc-900 tracking-tight">R{totalRentProcessed.toLocaleString()}</div>
                    <div className="flex items-center gap-1.5 mt-1 sm:mt-2 text-[10px] sm:text-[11px] text-zinc-500 font-medium leading-tight">
                        <span className="text-emerald-700 font-bold">100% Guaranteed</span>
                        <span>•</span>
                        <span className="text-zinc-600">Zero Escrow Defaults</span>
                    </div>
                </motion.div>
            </div>

            {/* Quick Impersonation Sandbox Drawer */}
            <div className="sharp-card bg-zinc-950 p-4 sm:p-6 text-white border border-transparent hover:border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                            Role Switcher Sandbox
                            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono text-[10px]">Direct Switch</Badge>
                        </h2>
                        <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">Switch active user role in PostgreSQL database to inspect portal views.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    <button
                        onClick={() => handleSwitchCurrentRole('sysAdmin')}
                        className={`flex items-center justify-between p-3 border transition-all text-left ${
                            currentUser?.user_type === 'sysAdmin'
                                ? 'bg-purple-950/80 border-purple-400 text-white'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                    >
                        <div>
                            <p className="font-bold text-xs text-white">SysAdmin Master</p>
                            <p className="text-[10px] text-zinc-400 font-mono">System Administrator</p>
                        </div>
                        <Shield className="w-4 h-4 text-purple-400" />
                    </button>

                    <button
                        onClick={() => handleSwitchCurrentRole('landlord')}
                        className={`flex items-center justify-between p-3 border transition-all text-left ${
                            currentUser?.user_type === 'landlord'
                                ? 'bg-zinc-800 border-white text-white'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                    >
                        <div>
                            <p className="font-bold text-xs text-white">Landlord Portal</p>
                            <p className="text-[10px] text-zinc-400 font-mono">Property Manager / Owner</p>
                        </div>
                        <Building2 className="w-4 h-4 text-zinc-300" />
                    </button>

                    <button
                        onClick={() => handleSwitchCurrentRole('tenant')}
                        className={`flex items-center justify-between p-3 border transition-all text-left ${
                            currentUser?.user_type === 'tenant' || currentUser?.user_type === 'rentee'
                                ? 'bg-emerald-950/80 border-emerald-400 text-white'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                    >
                        <div>
                            <p className="font-bold text-xs text-white">Tenant Portal</p>
                            <p className="text-[10px] text-zinc-400 font-mono">Verified Tenant / Rentee</p>
                        </div>
                        <Users className="w-4 h-4 text-emerald-400" />
                    </button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-zinc-100 p-1 border border-zinc-200">
                    <TabsTrigger value="users" className="data-[state=active]:bg-white text-xs font-semibold">User Matrix</TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-white text-xs font-semibold">Platform Audit Log</TabsTrigger>
                </TabsList>

                {/* Tab 1: Users Matrix */}
                <TabsContent value="users" className="space-y-4">
                    <div className="sharp-card bg-white p-3.5 sm:p-6 border border-transparent hover:border-zinc-900">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div>
                                <h3 className="font-bold text-sm sm:text-base text-zinc-900">User Account Hierarchy</h3>
                                <p className="text-[11px] sm:text-xs text-zinc-500">Manage sysAdmin, landlord, and tenant accounts and permissions</p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:flex-initial">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={searchUser}
                                        onChange={(e) => setSearchUser(e.target.value)}
                                        className="h-8 sm:h-9 pl-8 text-xs w-full sm:w-60 border-zinc-200"
                                    />
                                </div>
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                     <SelectTrigger className="h-8 sm:h-9 text-xs w-full sm:w-36 border-zinc-200">
                                         <SelectValue placeholder="Filter Role" />
                                     </SelectTrigger>
                                     <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="sysAdmin">SysAdmin</SelectItem>
                                        <SelectItem value="landlord">Landlord</SelectItem>
                                        <SelectItem value="contractor">Contractor</SelectItem>
                                        <SelectItem value="tenant">Tenant</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Mobile Compact User List */}
                        <div className="block md:hidden space-y-2.5">
                            {filteredUsers.map((user) => (
                                <div key={user.id} className="p-3 bg-zinc-50/70 border border-zinc-200 rounded-xl space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-xs text-zinc-900 truncate">{user.full_name}</p>
                                            <p className="text-[11px] text-zinc-500 font-mono truncate">{user.email}</p>
                                        </div>
                                        <Badge
                                            className={`capitalize text-[10px] font-semibold shrink-0 px-2 py-0.5 ${
                                                user.user_type === 'sysAdmin'
                                                    ? 'bg-purple-900 text-white'
                                                    : user.user_type === 'landlord'
                                                        ? 'bg-zinc-900 text-white'
                                                        : user.user_type === 'contractor'
                                                            ? 'bg-amber-900 text-white'
                                                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                            }`}
                                        >
                                            {user.user_type === 'rentee' ? 'tenant' : user.user_type}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
                                        <div className="flex items-center gap-1.5">
                                            {user.verified ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                                                    <Clock className="w-3 h-3 text-amber-600" />
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <Select
                                            value={user.user_type === 'rentee' ? 'tenant' : user.user_type}
                                            onValueChange={(newRole) => handleUpdateUserRole(user.id, newRole)}
                                        >
                                            <SelectTrigger className="h-7 text-[11px] flex-1 border-zinc-200 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sysAdmin">SysAdmin</SelectItem>
                                                <SelectItem value="landlord">Landlord</SelectItem>
                                                <SelectItem value="contractor">Contractor</SelectItem>
                                                <SelectItem value="tenant">Tenant</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[11px] px-2.5 border-zinc-200 hover:bg-zinc-100 bg-white shrink-0"
                                            onClick={() => handleToggleVerification(user.id)}
                                        >
                                            {user.verified ? 'Revoke' : 'Verify'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Tabular View */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-zinc-50">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold text-zinc-900">User</TableHead>
                                        <TableHead className="text-xs font-bold text-zinc-900">Account Type</TableHead>
                                        <TableHead className="text-xs font-bold text-zinc-900">Verification</TableHead>
                                        <TableHead className="text-xs font-bold text-zinc-900">Joined</TableHead>
                                        <TableHead className="text-xs font-bold text-zinc-900 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow key={user.id} className="hover:bg-zinc-50/50">
                                            <TableCell>
                                                <div>
                                                    <p className="font-semibold text-xs text-zinc-900">{user.full_name}</p>
                                                    <p className="text-[11px] text-zinc-500 font-mono">{user.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={`capitalize text-[11px] font-semibold ${user.user_type === 'sysAdmin'
                                                            ? 'bg-purple-900 text-white'
                                                            : user.user_type === 'landlord'
                                                                ? 'bg-zinc-900 text-white'
                                                                : user.user_type === 'contractor'
                                                                    ? 'bg-amber-900 text-white'
                                                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                                        }`}
                                                >
                                                    {user.user_type === 'rentee' ? 'tenant' : user.user_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.verified ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                        Verified
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                        Pending
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-zinc-500">
                                                {user.joined}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Select
                                                        value={user.user_type === 'rentee' ? 'tenant' : user.user_type}
                                                        onValueChange={(newRole) => handleUpdateUserRole(user.id, newRole)}
                                                    >
                                                        <SelectTrigger className="h-8 text-[11px] w-28 border-zinc-200">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="sysAdmin">SysAdmin</SelectItem>
                                                            <SelectItem value="landlord">Landlord</SelectItem>
                                                            <SelectItem value="contractor">Contractor</SelectItem>
                                                            <SelectItem value="tenant">Tenant</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-[11px] border border-zinc-200 hover:bg-zinc-100"
                                                        onClick={() => handleToggleVerification(user.id)}
                                                    >
                                                        {user.verified ? 'Revoke' : 'Verify'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>


                {/* Tab 3: Global Properties */}
                <TabsContent value="properties" className="space-y-4">
                    <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-base text-zinc-900">Global Listings Oversight</h3>
                                <p className="text-xs text-zinc-500">Monitor all rentals published across the RentFlex ecosystem</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {properties.map((p) => (
                                <div key={p.id} className="sharp-card p-4 border border-zinc-200 bg-zinc-50/30">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h4 className="font-bold text-sm text-zinc-900 truncate">{p.title}</h4>
                                        <Badge variant="outline" className="text-[10px] uppercase">
                                            {p.status || 'available'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-zinc-500 mb-2 truncate">{p.address}, {p.city}</p>
                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-200/80">
                                        <span className="font-bold text-zinc-900">R{(p.monthly_rent || 0).toLocaleString()}/mo</span>
                                        <span className="text-zinc-500 text-[11px]">Owner: {p.landlord_id || 'Unassigned'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
