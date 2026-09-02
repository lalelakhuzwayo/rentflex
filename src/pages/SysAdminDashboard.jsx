import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Shield,
    Users,
    Building2,
    CreditCard,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Activity,
    Database,
    Search,
    Filter,
    ArrowUpRight,
    Lock,
    Check,
    RefreshCw,
    Server,
    DollarSign,
    FileText,
    Wrench,
    Clock,
    UserCheck,
    UserPlus
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [arbitrationDecision, setArbitrationDecision] = useState('');
    const [arbitrationAmount, setArbitrationAmount] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        appClient.auth.me().then(setCurrentUser).catch(() => { });
        checkHealth();
    }, []);

    const checkHealth = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/health');
            if (res.ok) {
                const data = await res.json();
                setSystemHealth({ status: 'healthy', db: data.database, time: data.time });
            } else {
                setSystemHealth({ status: 'degraded', db: 'local mock fallback' });
            }
        } catch {
            setSystemHealth({ status: 'degraded', db: 'local storage/mock mode' });
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

    const { data: disputes = [] } = useQuery({
        queryKey: ['sysadmin-disputes'],
        queryFn: () => appClient.entities.DepositDispute.list(),
    });

    // Mock/Real User Directory
    const [usersList, setUsersList] = useState([
        { id: 'usr_admin', email: 'admin@rentflex.co.za', full_name: 'Doc SysAdmin', user_type: 'sysAdmin', status: 'active', verified: true, joined: '2026-01-01' },
        { id: 'usr_1', email: 'landlord@rentflex.co.za', full_name: 'John Landlord', user_type: 'landlord', status: 'active', verified: true, joined: '2026-02-15' },
        { id: 'usr_2', email: 'tenant@rentflex.co.za', full_name: 'Sarah Tenant', user_type: 'tenant', status: 'active', verified: true, joined: '2026-03-01' },
        { id: 'usr_3', email: 'contractor@rentflex.co.za', full_name: 'Pro Repairs Co.', user_type: 'contractor', status: 'active', verified: true, joined: '2026-04-10' },
        { id: 'usr_4', email: 'david.owner@rentflex.co.za', full_name: 'David Owner', user_type: 'landlord', status: 'active', verified: false, joined: '2026-05-12' },
        { id: 'usr_5', email: 'sipho.tenant@mail.com', full_name: 'Sipho Zulu', user_type: 'tenant', status: 'active', verified: true, joined: '2026-06-20' },
    ]);

    const handleUpdateUserRole = async (userId, newRole) => {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, user_type: newRole } : u));
        if (currentUser?.id === userId || currentUser?.email === usersList.find(u => u.id === userId)?.email) {
            await appClient.auth.updateMe({ user_type: newRole });
            window.location.reload();
        }
        toast.success(`User role updated to ${newRole}`);
    };

    const handleToggleVerification = (userId) => {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, verified: !u.verified } : u));
        toast.success('User verification status updated');
    };

    const handleSwitchCurrentRole = async (targetRole) => {
        const switched = await appClient.auth.switchAccount(targetRole);
        toast.success(`Switched active database account to ${switched.full_name} (${switched.user_type})`);
        if (targetRole === 'sysAdmin' || targetRole === 'admin') {
            window.location.href = '/SysAdminDashboard';
        } else if (targetRole === 'landlord') {
            window.location.href = '/LandlordDashboard';
        } else {
            window.location.href = '/Dashboard';
        }
    };

    const handleArbitrateDispute = async (disputeId, decision, amount) => {
        await appClient.entities.DepositDispute.update(disputeId, {
            status: 'resolved',
            resolution: decision,
            resolved_amount: parseFloat(amount) || 0,
            arbitrated_by: 'SysAdmin',
            resolved_date: new Date().toISOString()
        });
        queryClient.invalidateQueries(['sysadmin-disputes']);
        setDialogOpen(false);
        toast.success('Dispute arbitration judgment recorded successfully');
    };

    const totalRentProcessed = payments
        .filter(p => p.status === 'paid' || p.status === 'completed')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const activeLandlords = usersList.filter(u => u.user_type === 'landlord').length;
    const activeTenants = usersList.filter(u => u.user_type === 'tenant' || u.user_type === 'rentee').length;
    const activeAdmins = usersList.filter(u => u.user_type === 'sysAdmin' || u.user_type === 'admin').length;

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
                        Platform governance, triple-tier account matrix, dispute arbitration, and infrastructure metrics.
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
                        <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">Disputes & Escrow</span>
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-zinc-900 tracking-tight">{disputes.length} Open Cases</div>
                    <div className="flex items-center gap-1.5 mt-1 sm:mt-2 text-[10px] sm:text-[11px] text-zinc-500 font-medium leading-tight">
                        <span className="text-amber-700 font-bold">{disputes.filter(d => d.status === 'pending').length} In Review</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">{disputes.filter(d => d.status === 'resolved').length} Resolved</span>
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
                            currentUser?.user_type === 'sysAdmin' || currentUser?.user_type === 'admin'
                                ? 'bg-purple-950/80 border-purple-400 text-white'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                    >
                        <div>
                            <p className="font-bold text-xs text-white">SysAdmin Master</p>
                            <p className="text-[10px] text-zinc-400 font-mono">admin@rentflex.co.za</p>
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
                            <p className="text-[10px] text-zinc-400 font-mono">landlord@rentflex.co.za</p>
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
                            <p className="text-[10px] text-zinc-400 font-mono">tenant@rentflex.co.za</p>
                        </div>
                        <Users className="w-4 h-4 text-emerald-400" />
                    </button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-zinc-100 p-1 border border-zinc-200">
                    <TabsTrigger value="users" className="data-[state=active]:bg-white text-xs font-semibold">User Matrix</TabsTrigger>
                    <TabsTrigger value="disputes" className="data-[state=active]:bg-white text-xs font-semibold">
                        Dispute Arbitration
                        {disputes.length > 0 && <span className="ml-1.5 px-1.5 py-0.2 bg-zinc-900 text-white text-[10px] rounded-full">{disputes.length}</span>}
                    </TabsTrigger>
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

                {/* Tab 2: Dispute & Deposit Arbitration */}
                <TabsContent value="disputes" className="space-y-4">
                    <div className="sharp-card bg-white p-3.5 sm:p-6 border border-transparent hover:border-zinc-900">
                        <div className="mb-4 sm:mb-6">
                            <h3 className="font-bold text-sm sm:text-base text-zinc-900">Dispute & Deposit Arbitration Hub</h3>
                            <p className="text-[11px] sm:text-xs text-zinc-500">Administer binding decisions and authorize deposit escrow disbursements</p>
                        </div>

                        {disputes.length === 0 ? (
                            <div className="text-center py-12 text-zinc-400">
                                <Shield className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                                <p className="text-xs">No unresolved deposit disputes on record.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {disputes.map((d) => (
                                    <div key={d.id} className="p-4 border border-zinc-200 rounded-xl bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm text-zinc-900">{d.lease_id || 'Lease Agreement Dispute'}</h4>
                                                <Badge className={d.status === 'resolved' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}>
                                                    {d.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-zinc-600">{d.dispute_reason || d.description || 'Dispute regarding security deposit refund'}</p>
                                            <p className="text-[11px] text-zinc-400 font-mono">Tenant: {d.tenant_id} • Landlord: {d.landlord_id}</p>
                                        </div>

                                        {d.status !== 'resolved' && (
                                            <div className="shrink-0">
                                                <Dialog open={dialogOpen && selectedDispute?.id === d.id} onOpenChange={(open) => {
                                                    setDialogOpen(open);
                                                    if (open) setSelectedDispute(d);
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs">
                                                            Arbitrate Claim
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-base font-bold text-zinc-900">
                                                                Arbitrate Deposit Dispute
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 pt-2">
                                                            <div>
                                                                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                                                                    Arbitration Ruling / Decision
                                                                </label>
                                                                <Input
                                                                    placeholder="e.g. 50% refund to tenant, 50% retained for repair"
                                                                    value={arbitrationDecision}
                                                                    onChange={(e) => setArbitrationDecision(e.target.value)}
                                                                    className="text-xs"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                                                                    Resolved Amount to Release (R)
                                                                </label>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Amount in ZAR"
                                                                    value={arbitrationAmount}
                                                                    onChange={(e) => setArbitrationAmount(e.target.value)}
                                                                    className="text-xs"
                                                                />
                                                            </div>
                                                            <Button
                                                                className="w-full bg-zinc-900 text-white"
                                                                onClick={() => handleArbitrateDispute(d.id, arbitrationDecision, arbitrationAmount)}
                                                            >
                                                                Submit Binding Judgment
                                                            </Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
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
                                        <span className="text-zinc-500 text-[11px]">Owner: {p.landlord_id || 'john@example.com'}</span>
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
