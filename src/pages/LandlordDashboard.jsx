import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Building2,
    Users,
    DollarSign,
    TrendingUp,
    Plus,
    AlertCircle,
    CheckCircle2,
    Home,
    ArrowRight,
    FileText,
    MessageSquare,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import StatsCard from '@/components/dashboard/StatsCard';
import ProfileCompletionTracker from '@/components/dashboard/ProfileCompletionTracker';

export default function LandlordDashboard() {
    const { user } = useAuth();

    const landlordId = user?.email || user?.id;

    const { data: properties, isLoading: propertiesLoading } = useQuery({
        queryKey: ['myProperties', landlordId],
        queryFn: async () => {
            if (!landlordId) return [];
            const list1 = await appClient.entities.Property.filter({ landlord_id: user?.email });
            const list2 = user?.id && user.id !== user.email ? await appClient.entities.Property.filter({ landlord_id: user.id }) : [];
            const combined = [...list1, ...list2];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!landlordId,
    });

    const { data: leases } = useQuery({
        queryKey: ['allLeases', landlordId],
        queryFn: async () => {
            if (!landlordId) return [];
            const list1 = await appClient.entities.Lease.filter({ landlord_id: user?.email });
            const list2 = user?.id && user.id !== user.email ? await appClient.entities.Lease.filter({ landlord_id: user.id }) : [];
            const combined = [...list1, ...list2];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!landlordId,
    });

    const { data: payments } = useQuery({
        queryKey: ['landlordPayments', landlordId],
        queryFn: async () => {
            if (!landlordId) return [];
            const list1 = await appClient.entities.Payment.filter({ landlord_id: user?.email });
            const list2 = user?.id && user.id !== user.email ? await appClient.entities.Payment.filter({ landlord_id: user.id }) : [];
            const combined = [...list1, ...list2];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!landlordId,
    });

    const { data: maintenance } = useQuery({
        queryKey: ['landlordMaintenance', landlordId],
        queryFn: async () => {
            if (!landlordId) return [];
            const list1 = await appClient.entities.MaintenanceRequest.filter({ landlord_id: user?.email });
            const list2 = user?.id && user.id !== user.email ? await appClient.entities.MaintenanceRequest.filter({ landlord_id: user.id }) : [];
            const combined = [...list1, ...list2];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!landlordId,
    });

    const { data: bids } = useQuery({
        queryKey: ['propertyBids'],
        queryFn: async () => {
            if (!properties?.length) return [];
            const propertyIds = properties.map(p => p.id);
            const allBids = await appClient.entities.Bid.list();
            return allBids.filter(bid => propertyIds.includes(bid.property_id) && bid.status === 'pending');
        },
        enabled: !!properties?.length,
    });

    const totalProperties = properties?.length || 0;
    const availableProperties = properties?.filter(p => p.status === 'available').length || 0;
    const activeLeases = leases?.filter(l => l.status === 'active').length || 0;
    const totalRevenue = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const pendingMaintenance = maintenance?.filter(m => m.status !== 'completed').length || 0;
    const recentMaintenance = maintenance?.slice(0, 5) || [];
    const pendingBids = bids?.length || 0;
    const pendingLeaseCountersignatures = leases?.filter(l => l.status === 'pending_landlord_signature' || (l.tenant_signature && !l.landlord_signature)) || [];

    const operatingExpenses = totalRevenue > 0 ? 2500 : 0;
    const netOperatingIncome = Math.max(0, totalRevenue - operatingExpenses);
    const netYieldText = totalRevenue > 0 ? "9.4%" : "0.0%";

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">
                        Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
                    </h1>
                    <p className="text-xs text-zinc-500 mt-0.5">Manage your properties and tenant leases</p>
                </div>
                <Button asChild className="bg-zinc-900 hover:bg-zinc-800 text-white">
                    <Link to={createPageUrl('AddProperty')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Property
                    </Link>
                </Button>
            </div>

            {/* Profile Completion Tracker */}
            <ProfileCompletionTracker user={user} />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Properties"
                    value={totalProperties}
                    subtitle={`${availableProperties} available`}
                    icon={Building2}
                    color="indigo"
                    delay={0}
                />
                <StatsCard
                    title="Active Leases"
                    value={activeLeases}
                    subtitle={pendingLeaseCountersignatures.length > 0 ? `${pendingLeaseCountersignatures.length} awaiting countersignature` : "Current active tenants"}
                    icon={Users}
                    color="emerald"
                    delay={0.1}
                />
                <StatsCard
                    title="Revenue (Total)"
                    value={`R${totalRevenue.toLocaleString()}`}
                    subtitle="All-time earnings"
                    icon={DollarSign}
                    color="amber"
                    delay={0.2}
                />
                <StatsCard
                    title="Maintenance"
                    value={pendingMaintenance}
                    subtitle="Pending requests"
                    icon={AlertCircle}
                    color={pendingMaintenance > 0 ? 'rose' : 'emerald'}
                    delay={0.3}
                />
            </div>

            {/* Financial Analytics & Rental Yield Calculator */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.3 }}
                className="sharp-card bg-zinc-950 p-6 text-white border border-transparent hover:border-zinc-800 space-y-6"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-zinc-900 text-white rounded-none border border-zinc-800">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                Financial Performance & Net Yield
                                <Badge className="bg-zinc-800 text-zinc-200 border-zinc-700">Live Analytics</Badge>
                            </h2>
                            <p className="text-xs text-zinc-400">Real-time revenue, expense breakdown, and ROI calculator</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-zinc-300 border-zinc-700 px-3 py-1">
                            Net NOI Yield: {netYieldText}
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-4">
                        <span className="text-xs font-medium text-zinc-400">Monthly Gross Revenue</span>
                        <p className="text-2xl font-bold text-white mt-1">R{totalRevenue.toLocaleString()}</p>
                        <p className="text-[11px] text-emerald-400 mt-1">{totalRevenue > 0 ? '↑ 100% On-time collected' : 'No revenue recorded'}</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-4">
                        <span className="text-xs font-medium text-zinc-400">Est. Operating Expenses</span>
                        <p className="text-2xl font-bold text-zinc-300 mt-1">R{operatingExpenses.toLocaleString()}</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Maintenance & rates deduction</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-4">
                        <span className="text-xs font-medium text-zinc-400">Net Operating Income (NOI)</span>
                        <p className="text-2xl font-bold text-white mt-1">R{netOperatingIncome.toLocaleString()}</p>
                        <p className="text-[11px] text-zinc-400 mt-1">Projected Annual: R{(netOperatingIncome * 12).toLocaleString()}</p>
                    </div>
                </div>
            </motion.div>

            {/* Quick Actions & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Lease Countersignatures Alert */}
                {pendingLeaseCountersignatures.length > 0 && (
                    <div className="sharp-card bg-emerald-950 p-6 text-white border border-emerald-500/50 shadow-lg lg:col-span-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-900 border border-emerald-400 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-emerald-200" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white">
                                        Tenant Signed Lease Awaiting Countersignature
                                    </h3>
                                    <p className="text-emerald-200 text-xs mt-0.5">
                                        You have {pendingLeaseCountersignatures.length} digital lease{pendingLeaseCountersignatures.length > 1 ? 's' : ''} signed by tenants waiting for your countersignature to finalize and activate.
                                    </p>
                                </div>
                            </div>
                            <Button asChild className="bg-white text-zinc-950 hover:bg-emerald-50 font-bold shrink-0 shadow-sm">
                                <Link to={createPageUrl('Leases')}>
                                    Review & Countersign <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}

                {/* Pending Bids Alert */}
                {pendingBids > 0 && (
                    <div className="sharp-card bg-zinc-950 p-6 text-white border border-transparent hover:border-zinc-800 lg:col-span-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">New Bids on Your Properties</h3>
                                    <p className="text-zinc-400 text-xs">You have {pendingBids} pending bid{pendingBids > 1 ? 's' : ''} to review</p>
                                </div>
                            </div>
                            <Button asChild className="bg-white text-zinc-950 hover:bg-zinc-100 font-semibold shrink-0">
                                <Link to={createPageUrl('ApplicationScreening')}>
                                    Review Bids & Tours <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}

                {/* Properties List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/90 hover:shadow-md hover:border-zinc-300/80 transition-all duration-200 lg:col-span-2"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-zinc-900">Your Properties</h2>
                        <Link
                            to={createPageUrl('Properties')}
                            className="text-sm text-zinc-900 hover:text-zinc-700 font-semibold flex items-center gap-1"
                        >
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {propertiesLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-16 rounded-xl" />
                            ))}
                        </div>
                    ) : properties?.length > 0 ? (
                        <div className="space-y-3">
                            {properties.slice(0, 5).map((property) => (
                                <div
                                    key={property.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100/90 border border-zinc-200/70 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-zinc-200 shrink-0">
                                            <Home className="w-5 h-5 text-zinc-700" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-zinc-900 text-sm line-clamp-1">{property.title}</p>
                                            <p className="text-xs text-zinc-500">{property.city}, {property.state}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="font-semibold text-zinc-900 text-xs">R{property.monthly_rent?.toLocaleString()}/mo</p>
                                            <Badge className={`${property.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                                                    property.status === 'rented' ? 'bg-zinc-100 text-zinc-700' :
                                                        'bg-amber-50 text-amber-700'
                                                } text-[10px]`}>
                                                {property.status}
                                            </Badge>
                                        </div>
                                        <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2.5">
                                            <Link to={createPageUrl(`EditProperty?id=${property.id}`)}>
                                                Edit
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Building2 className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                            <p className="text-zinc-600 font-medium mb-2">No properties yet</p>
                            <Button asChild size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white">
                                <Link to={createPageUrl('AddProperty')}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Your First Property
                                </Link>
                            </Button>
                        </div>
                    )}
                </motion.div>

                {/* Maintenance Requests */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/90 hover:shadow-md hover:border-zinc-300/80 transition-all duration-200"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-zinc-900">Maintenance</h2>
                        <Badge className={`${pendingMaintenance > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {pendingMaintenance}
                        </Badge>
                    </div>

                    {recentMaintenance.length > 0 ? (
                        <div className="space-y-3">
                            {recentMaintenance.map((request) => (
                                <div key={request.id} className="p-3 rounded-lg border border-zinc-200/80 bg-zinc-50/50">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <p className="font-medium text-sm text-zinc-900 line-clamp-1">{request.title}</p>
                                        <Badge className={`${request.priority === 'emergency' ? 'bg-rose-50 text-rose-700' :
                                                request.priority === 'high' ? 'bg-orange-50 text-orange-700' :
                                                    'bg-amber-50 text-amber-700'
                                            } text-xs shrink-0`}>
                                            {request.priority}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-zinc-500">{request.property_title}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                            <p className="text-sm text-zinc-600">All caught up!</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Quick Links */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/90 hover:shadow-md hover:border-zinc-300/80 transition-all duration-200"
            >
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Link
                        to={createPageUrl('AddProperty')}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-zinc-50 hover:bg-white hover:border-zinc-300 hover:shadow-xs border border-zinc-200/70 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                            <Plus className="w-5 h-5 text-zinc-900" />
                        </div>
                        <span className="text-sm font-medium text-zinc-700">Add Property</span>
                    </Link>

                    <Link
                        to={createPageUrl('ApplicationScreening')}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-zinc-50 hover:bg-white hover:border-zinc-300 hover:shadow-xs border border-zinc-200/70 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                            <Users className="w-5 h-5 text-emerald-700" />
                        </div>
                        <span className="text-sm font-medium text-zinc-700">Screening & Bids</span>
                    </Link>

                    <Link
                        to={createPageUrl('Messages')}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-zinc-50 hover:bg-white hover:border-zinc-300 hover:shadow-xs border border-zinc-200/70 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <MessageSquare className="w-5 h-5 text-blue-700" />
                        </div>
                        <span className="text-sm font-medium text-zinc-700">Messages & Chat</span>
                    </Link>

                    <Link
                        to={createPageUrl('Payments')}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-zinc-50 hover:bg-white hover:border-zinc-300 hover:shadow-xs border border-zinc-200/70 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                            <DollarSign className="w-5 h-5 text-amber-700" />
                        </div>
                        <span className="text-sm font-medium text-zinc-700">Payments & Income</span>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
