import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Building2,
    CreditCard,
    TrendingUp,
    Calendar,
    ArrowRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Wrench,
    Gavel,
    Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import StatsCard from '@/components/dashboard/StatsCard';
import RentScoreGauge from '@/components/dashboard/RentScoreGauge';
import PaymentCard from '@/components/payments/PaymentCard';

export default function Dashboard() {
    const { user } = useAuth();

    const { data: rentScore } = useQuery({
        queryKey: ['rentScore', user?.email],
        queryFn: async () => {
            if (!user?.email) return [];
            return await appClient.entities.RentScore.filter({ user_id: user.email });
        },
        enabled: !!user?.email,
    });

    const { data: leases } = useQuery({
        queryKey: ['leases', user?.email],
        queryFn: async () => {
            if (!user?.email) return [];
            const asTenant = await appClient.entities.Lease.filter({ tenant_id: user.email });
            const asLandlord = await appClient.entities.Lease.filter({ landlord_id: user.email });
            const combined = [...asTenant, ...asLandlord];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!user?.email,
    });

    const { data: payments, isLoading: paymentsLoading } = useQuery({
        queryKey: ['payments', user?.email],
        queryFn: async () => {
            if (!user?.email) return [];
            const asTenant = await appClient.entities.Payment.filter({ tenant_id: user.email });
            const asLandlord = await appClient.entities.Payment.filter({ landlord_id: user.email });
            const combined = [...asTenant, ...asLandlord];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!user?.email,
    });

    const { data: maintenanceRequests } = useQuery({
        queryKey: ['maintenance', user?.email],
        queryFn: async () => {
            if (!user?.email) return [];
            const asTenant = await appClient.entities.MaintenanceRequest.filter({ tenant_id: user.email });
            const asLandlord = await appClient.entities.MaintenanceRequest.filter({ landlord_id: user.email });
            const combined = [...asTenant, ...asLandlord];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!user?.email,
    });

    const { data: bids } = useQuery({
        queryKey: ['bids', user?.email],
        queryFn: async () => {
            if (!user?.email) return [];
            return await appClient.entities.Bid.filter({ tenant_id: user.email });
        },
        enabled: !!user?.email,
    });

    const currentRentScore = rentScore?.[0]?.score || 0;
    const activeLeases = leases?.length || 0;
    const pendingPayments = payments?.filter(p => p.status === 'pending' || p.status === 'late') || [];
    const paidThisMonth = payments?.filter(p => p.status === 'paid')?.length || 0;
    const openMaintenance = maintenanceRequests?.filter(m => m.status !== 'completed')?.length || 0;
    const activeBids = bids?.filter(b => b.status === 'pending')?.length || 0;

    const upcomingPayments = pendingPayments.slice(0, 3);

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Welcome Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                        Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
                    </h1>
                    <p className="text-slate-500 mt-1 text-xs sm:text-sm">Here's what's happening with your rentals</p>
                </div>
                <Button asChild className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto h-10 px-5 font-semibold shrink-0">
                    <Link to={createPageUrl('Properties')}>
                        <Building2 className="w-4 h-4 mr-2" />
                        Browse Properties
                    </Link>
                </Button>
            </div>

            {/* Stats Grid (1 column on mobile, 2 on tablet, 4 on desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="RentScore"
                    value={currentRentScore}
                    subtitle="Your rental reputation"
                    icon={TrendingUp}
                    color="indigo"
                    delay={0}
                />
                <StatsCard
                    title="Active Leases"
                    value={activeLeases}
                    subtitle="Current rentals"
                    icon={Building2}
                    color="emerald"
                    delay={0.1}
                />
                <StatsCard
                    title="Pending Payments"
                    value={pendingPayments.length}
                    subtitle="Due soon"
                    icon={CreditCard}
                    color={pendingPayments.length > 0 ? 'amber' : 'emerald'}
                    delay={0.2}
                />
                <StatsCard
                    title="Open Requests"
                    value={openMaintenance}
                    subtitle="Maintenance tickets"
                    icon={Wrench}
                    color="rose"
                    delay={0.3}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* RentScore Card */}
                <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150 lg:row-span-2">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-bold text-zinc-900">RentScore</h2>
                        <Link
                            to={createPageUrl('RentScore')}
                            className="text-xs font-semibold text-zinc-900 hover:text-zinc-600 flex items-center gap-1"
                        >
                            View Details <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="flex justify-center mb-5">
                        <RentScoreGauge score={currentRentScore} />
                    </div>

                    <div className="space-y-3 pt-3 border-t border-zinc-100">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">On-time Payments</span>
                            <span className="font-semibold text-zinc-900">{rentScore?.[0]?.on_time_payments || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Leases Completed</span>
                            <span className="font-semibold text-zinc-900">{rentScore?.[0]?.leases_completed || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Identity Verified</span>
                            <span className={`font-semibold ${rentScore?.[0]?.verified_identity ? 'text-emerald-700' : 'text-zinc-400'}`}>
                                {rentScore?.[0]?.verified_identity ? 'Yes' : 'Pending'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Upcoming Payments */}
                <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-zinc-900">Upcoming Payments</h2>
                        <Link
                            to={createPageUrl('Payments')}
                            className="text-xs font-semibold text-zinc-900 hover:text-zinc-600 flex items-center gap-1"
                        >
                            View All <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {paymentsLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-16 rounded-lg" />
                            ))}
                        </div>
                    ) : upcomingPayments.length > 0 ? (
                        <div className="space-y-2.5">
                            {upcomingPayments.map((payment, idx) => (
                                <PaymentCard key={payment.id} payment={payment} index={idx} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-zinc-800">All caught up!</p>
                            <p className="text-xs text-zinc-400">No pending payments</p>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150 lg:col-span-2">
                    <h2 className="text-base font-bold text-zinc-900 mb-3">Quick Actions</h2>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <Link
                            to={createPageUrl('Properties')}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/90 border border-zinc-200/70 transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-md bg-white border border-zinc-200 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-zinc-900" />
                            </div>
                            <span className="text-xs font-medium text-zinc-700 text-center">Find Rentals</span>
                        </Link>

                        <Link
                            to={createPageUrl('Payments')}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/90 border border-zinc-200/70 transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-md bg-white border border-zinc-200 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-zinc-900" />
                            </div>
                            <span className="text-xs font-medium text-zinc-700 text-center">Pay Rent</span>
                        </Link>

                        <Link
                            to={createPageUrl('Maintenance')}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/90 border border-zinc-200/70 transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-md bg-white border border-zinc-200 flex items-center justify-center">
                                <Wrench className="w-4 h-4 text-zinc-900" />
                            </div>
                            <span className="text-xs font-medium text-zinc-700 text-center">Maintenance</span>
                        </Link>

                        <Link
                            to={createPageUrl('Disputes')}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/90 border border-zinc-200/70 transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-md bg-white border border-zinc-200 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-zinc-900" />
                            </div>
                            <span className="text-xs font-medium text-zinc-700 text-center">Disputes</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Active Bids Section */}
            {activeBids > 0 && (
                <div className="sharp-card bg-zinc-950 p-4 xs:p-6 text-white border border-transparent hover:border-zinc-800">
                    <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 xs:gap-4">
                        <div className="flex items-center gap-3 xs:gap-4">
                            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                <Gavel className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm xs:text-base">Active Bids</h3>
                                <p className="text-zinc-400 text-xs">You have {activeBids} pending bid{activeBids > 1 ? 's' : ''} on properties</p>
                            </div>
                        </div>
                        <Button asChild className="bg-white text-zinc-950 hover:bg-zinc-100 w-full xs:w-auto font-semibold">
                            <Link to={createPageUrl('Properties')}>
                                View Bids <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
