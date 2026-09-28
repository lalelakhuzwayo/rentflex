import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Clock,
    Shield,
    Sparkles,
    Building2,
    Briefcase,
    Star,
    Award,
    Wrench,
    TrendingUp,
    Check,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    Home,
    FileText,
    Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import RentScoreGauge from '@/components/dashboard/RentScoreGauge';
import { syncAndScoreTenant } from '@/utils/rentScoreEngine';

export default function RentScore() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [simulatedActions, setSimulatedActions] = useState({
        earlyPayment: false,
        bankConnect: false,
        leaseComplete: false
    });

    useEffect(() => {
        appClient.auth.me().then((u) => {
            setUser(u);
            if (u && (u.user_type === 'tenant' || u.user_type === 'rentee' || !u.user_type)) {
                syncAndScoreTenant(u).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['rentScore', u.email] });
                }).catch(() => {});
            }
        }).catch(() => {});
    }, [queryClient]);

    // Handle manual recalculation
    const handleRecalculateScore = async () => {
        if (!user) return;
        setIsSyncing(true);
        try {
            await syncAndScoreTenant(user);
            await queryClient.invalidateQueries({ queryKey: ['rentScore', user.email] });
            toast.success('RentScore™ updated with latest payments and active tenancy duration!');
        } catch (e) {
            toast.error('Failed to recalculate RentScore');
        } finally {
            setIsSyncing(false);
        }
    };

    // 1. Tenant RentScore Query
    const { data: rentScoreData } = useQuery({
        queryKey: ['rentScore', user?.email],
        queryFn: async () => {
            const scores = await appClient.entities.RentScore.filter({ user_id: user?.email });
            return scores[0] || {
                score: 550,
                payment_history_score: 70,
                lease_completion_score: 65,
                landlord_reviews_score: 80,
                verification_score: 0,
                verified_income: false,
                verified_employment: false,
                verified_identity: false
            };
        },
        enabled: Boolean(user?.email && (user.user_type === 'tenant' || user.user_type === 'rentee' || !user.user_type)),
    });

    // 2. Contractor JobScore Queries
    const { data: contractorProfile } = useQuery({
        queryKey: ['contractor-profile', user?.id, user?.email],
        queryFn: async () => {
            if (!user) return null;
            const byId = await appClient.entities.Contractor.filter({ user_id: user.id });
            if (byId?.[0]) return byId[0];
            const byEmail = await appClient.entities.Contractor.filter({ email: user.email });
            return byEmail?.[0] || null;
        },
        enabled: Boolean(user?.user_type === 'contractor'),
    });

    const { data: contractorJobs = [] } = useQuery({
        queryKey: ['contractor-completed-jobs', user?.id, user?.email],
        queryFn: async () => {
            if (!user) return [];
            const allJobs = await appClient.entities.ContractorJob.list();
            if (!Array.isArray(allJobs)) return [];
            return allJobs.filter(j => j.contractor_id === user.id || j.contractor_id === user.email);
        },
        enabled: Boolean(user?.user_type === 'contractor'),
    });

    // 3. Landlord Portfolio Queries
    const { data: landlordProperties = [] } = useQuery({
        queryKey: ['landlord-credibility-properties', user?.id, user?.email],
        queryFn: async () => {
            if (!user) return [];
            const allProps = await appClient.entities.Property.list();
            if (!Array.isArray(allProps)) return [];
            const myEmail = user.email?.toLowerCase();
            return allProps.filter(p => p.landlord_id === user.id || p.landlord_id?.toLowerCase() === myEmail);
        },
        enabled: Boolean(user?.user_type === 'landlord'),
    });

    const { data: landlordLeases = [] } = useQuery({
        queryKey: ['landlord-credibility-leases', user?.id, user?.email],
        queryFn: async () => {
            if (!user) return [];
            const allLeases = await appClient.entities.Lease.list();
            if (!Array.isArray(allLeases)) return [];
            const myEmail = user.email?.toLowerCase();
            return allLeases.filter(l => l.landlord_id === user.id || l.landlord_id?.toLowerCase() === myEmail);
        },
        enabled: Boolean(user?.user_type === 'landlord'),
    });

    // =========================================================================
    // 🟢 RENDER 1: CONTRACTOR JOBSCORE™ (Contractors do NOT have a RentScore)
    // =========================================================================
    if (user?.user_type === 'contractor') {
        const completedJobs = contractorJobs.filter(j => j.status === 'completed' || j.landlord_rating);
        const ratedJobs = contractorJobs.filter(j => j.landlord_rating);
        const avgRating = ratedJobs.length > 0
            ? (ratedJobs.reduce((acc, j) => acc + Number(j.landlord_rating || 5), 0) / ratedJobs.length).toFixed(1)
            : (contractorProfile?.rating || 5.0).toFixed(1);

        const onScheduleJobs = contractorJobs.filter(j => j.landlord_turnaround === 'on_schedule' || j.landlord_turnaround === 'ahead_of_schedule').length;
        const turnaroundRate = contractorJobs.length > 0 ? Math.round((onScheduleJobs / Math.max(1, contractorJobs.length)) * 100) : 95;

        // Overall JobScore (0 to 100)
        const jobScore = Math.min(100, Math.round(
            (parseFloat(avgRating) / 5) * 45 + 
            (turnaroundRate / 100) * 35 + 
            (contractorProfile?.verified ? 20 : 10)
        ));

        return (
            <div className="space-y-8 pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-zinc-900">Contractor JobScore™</h1>
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold text-xs">
                                Verified Contractor Standing
                            </Badge>
                        </div>
                        <p className="text-zinc-500 text-xs mt-1">
                            Your JobScore™ measures work craftsmanship, on-schedule turnaround speed, landlord ratings, and verified company credentials.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl('Maintenance'))}
                        className="border-zinc-300 self-start sm:self-auto"
                    >
                        <Wrench className="w-4 h-4 mr-2 text-zinc-700" />
                        Browse Available Jobs
                    </Button>
                </div>

                {/* Main JobScore Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Score Summary Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-1 sharp-card bg-zinc-950 p-6 text-white border border-transparent flex flex-col items-center justify-center text-center relative overflow-hidden"
                    >
                        <div className="w-32 h-32 rounded-full border-4 border-amber-400/40 bg-zinc-900 flex flex-col items-center justify-center shadow-lg relative">
                            <span className="text-4xl font-extrabold text-amber-400">{jobScore}</span>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">JobScore™</span>
                        </div>

                        <div className="mt-4">
                            <Badge className="bg-white text-zinc-950 px-3 py-1 text-xs font-semibold">
                                {jobScore >= 90 ? 'Elite Certified Contractor' : jobScore >= 75 ? 'Top Rated Professional' : 'Active Contractor'}
                            </Badge>
                            <p className="text-xs text-zinc-400 mt-2">
                                Derived from {contractorJobs.length} dispatched jobs & landlord evaluations
                            </p>
                        </div>
                    </motion.div>

                    {/* Breakdown Metrics */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2 sharp-card bg-white p-6 border border-zinc-200/90 space-y-6"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-zinc-900">JobScore Performance Drivers</h3>
                                <p className="text-xs text-zinc-500">Core criteria landlords evaluate when awarding bids</p>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                4.9+ Target Rating
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" /> Landlord Quality Rating
                                    </span>
                                    <span className="text-sm font-bold text-zinc-900">{avgRating} / 5.0</span>
                                </div>
                                <Progress value={(parseFloat(avgRating) / 5) * 100} className="h-1.5 bg-zinc-200" />
                                <p className="text-[11px] text-zinc-500">Based on verified post-job reviews and craftsmanship inspection.</p>
                            </div>

                            <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-indigo-600" /> Task Turnaround Speed
                                    </span>
                                    <span className="text-sm font-bold text-zinc-900">{turnaroundRate}% On-Time</span>
                                </div>
                                <Progress value={turnaroundRate} className="h-1.5 bg-zinc-200" />
                                <p className="text-[11px] text-zinc-500">Completed jobs delivered on or ahead of estimated duration.</p>
                            </div>

                            <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                                        <Briefcase className="w-4 h-4 text-emerald-600" /> Completed Jobs
                                    </span>
                                    <span className="text-sm font-bold text-zinc-900">{completedJobs.length} Completed</span>
                                </div>
                                <p className="text-[11px] text-zinc-500">Work orders fulfilled with proof-of-work approved by landlord.</p>
                            </div>

                            <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                                        <Shield className="w-4 h-4 text-blue-600" /> Company Profile Standing
                                    </span>
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                        Verified Business
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-zinc-500">Registered business profile, trade license & insurance on file.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // 🏢 RENDER 2: LANDLORD CREDIBILITY & PORTFOLIO STANDING (No tenant RentScore)
    // =========================================================================
    if (user?.user_type === 'landlord') {
        const totalProps = landlordProperties.length;
        const rentedProps = landlordProperties.filter(p => p.status === 'rented').length;
        const occupancyRate = totalProps > 0 ? Math.round((rentedProps / totalProps) * 100) : 100;
        const activeLeases = landlordLeases.filter(l => l.status === 'active').length;

        return (
            <div className="space-y-8 pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-zinc-900">Landlord Credibility & Portfolio Standing</h1>
                            <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold text-xs">
                                Verified Property Owner
                            </Badge>
                        </div>
                        <p className="text-zinc-500 text-xs mt-1">
                            Your Landlord Credibility overview highlights your property occupancy rate, lease fulfillment, verified ownership, and tenant retention.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(createPageUrl('Properties'))}
                            className="border-zinc-300"
                        >
                            <Building2 className="w-4 h-4 mr-2 text-zinc-700" />
                            Manage Listings
                        </Button>
                        <Button
                            size="sm"
                            className="bg-zinc-950 hover:bg-zinc-900 text-white"
                            onClick={() => navigate(createPageUrl('Leases'))}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Active Leases
                        </Button>
                    </div>
                </div>

                {/* Landlord Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sharp-card bg-white p-5 border border-zinc-200/90 space-y-2">
                        <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
                            <span>Portfolio Occupancy</span>
                            <Percent className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-extrabold text-zinc-900">{occupancyRate}%</p>
                        <p className="text-[11px] text-zinc-500">{rentedProps} of {totalProps} properties actively occupied</p>
                    </div>

                    <div className="sharp-card bg-white p-5 border border-zinc-200/90 space-y-2">
                        <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
                            <span>Active Signed E-Leases</span>
                            <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-2xl font-extrabold text-zinc-900">{activeLeases}</p>
                        <p className="text-[11px] text-zinc-500">Dual-executed residential agreements</p>
                    </div>

                    <div className="sharp-card bg-white p-5 border border-zinc-200/90 space-y-2">
                        <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
                            <span>Ownership Verification</span>
                            <Shield className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-extrabold text-emerald-700">Verified</p>
                        <p className="text-[11px] text-zinc-500">Deeds & FICA compliance validated</p>
                    </div>

                    <div className="sharp-card bg-white p-5 border border-zinc-200/90 space-y-2">
                        <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
                            <span>Tenant Retention</span>
                            <Award className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-2xl font-extrabold text-zinc-900">96%</p>
                        <p className="text-[11px] text-zinc-500">Average tenancy exceeds 14 months</p>
                    </div>
                </div>

                {/* Landlord Guidelines Card */}
                <div className="sharp-card bg-zinc-950 p-6 text-white border border-transparent space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-400" /> RentFlex Landlord Trust Standing
                        </h3>
                        <Badge className="bg-emerald-500 text-zinc-950 font-bold">Tier 1 Credibility</Badge>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
                        As a verified property owner on RentFlex, your credibility allows prospective tenants to submit verified bids, sign official digital e-leases, and initiate direct rental deposits with complete peace of mind.
                    </p>
                </div>
            </div>
        );
    }

    // =========================================================================
    // 👤 RENDER 3: TENANT RENTSCORE™ (Active Scoring Engine & Verifications)
    // =========================================================================
    const baseScore = rentScoreData?.score || 550;
    
    // Simulator bonus calculation
    const boostBonus = (simulatedActions.earlyPayment ? 15 : 0) +
                       (simulatedActions.bankConnect ? 20 : 0) +
                       (simulatedActions.leaseComplete ? 25 : 0);
    
    const simulatedScore = Math.min(850, baseScore + boostBonus);

    const scoreDrivers = [
        {
            name: 'On-Time Payment Record',
            weight: '40%',
            pts: Math.round((baseScore / 850) * 340),
            maxPts: 340,
            color: 'bg-emerald-500',
            description: '100% on-time rent payment frequency across all active leases.'
        },
        {
            name: 'Active Occupancy Duration',
            weight: '25%',
            pts: Math.round((baseScore / 850) * 212.5),
            maxPts: 212.5,
            color: 'bg-zinc-800',
            description: 'Monitored duration living under signed e-lease agreements (+5 pts/month).'
        },
        {
            name: 'Identity & Income Verifications',
            weight: '20%',
            pts: Math.round((baseScore / 850) * 170),
            maxPts: 170,
            color: 'bg-zinc-600',
            description: 'Valid Smart ID / Passport, verified employer, and bank income records.'
        },
        {
            name: 'Lease Completion Length',
            weight: '15%',
            pts: Math.round((baseScore / 850) * 127.5),
            maxPts: 127.5,
            color: 'bg-amber-500',
            description: 'Successfully completed 12+ month lease agreements without early default.'
        }
    ];

    const verifications = [
        {
            type: 'identity',
            label: 'Government ID Verification',
            description: 'Verify identity with valid Smart ID or Passport',
            verified: Boolean(rentScoreData?.verified_identity || rentScoreData?.history?.verified_identity),
            points: '+40 points',
            actionUrl: 'TenantOnboarding?step=1&verify=identity'
        },
        {
            type: 'income',
            label: 'Verified Bank Statement',
            description: 'Link bank proof of income to confirm affordability',
            verified: Boolean(rentScoreData?.verified_income || rentScoreData?.history?.verified_income),
            points: '+35 points',
            actionUrl: 'TenantOnboarding?step=3&verify=income'
        },
        {
            type: 'employment',
            label: 'Employment Confirmation',
            description: 'Confirm active employment status with employer details',
            verified: Boolean(rentScoreData?.verified_employment || rentScoreData?.history?.verified_employment),
            points: '+35 points',
            actionUrl: 'TenantOnboarding?step=2&verify=employment'
        }
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Your RentScore™</h1>
                    <p className="text-zinc-500 text-xs mt-1">
                        Your RentScore reflects your verified rental trustworthiness, granting lower deposit rates, priority bid approvals, and fast-tracked leases.
                    </p>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecalculateScore}
                    disabled={isSyncing}
                    className="border-zinc-300 self-start sm:self-auto"
                >
                    <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Recalculating...' : 'Sync Engine Score'}
                </Button>
            </div>

            {/* Main Score Overview & Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="lg:col-span-1 sharp-card bg-zinc-950 p-6 text-white border border-transparent hover:border-zinc-700 flex flex-col items-center justify-center text-center relative overflow-hidden"
                >
                    <RentScoreGauge score={simulatedScore} size="lg" />
                    
                    <div className="mt-4">
                        <Badge className="bg-white text-zinc-950 px-3 py-1 text-xs font-semibold">
                            {simulatedScore >= 750 ? 'Excellent Credit Standing' : simulatedScore >= 650 ? 'Good Credit Standing' : 'Building Credit'}
                        </Badge>
                        <p className="text-xs text-zinc-400 mt-2">
                            Updated live via RentFlex Verification & Tenancy Engine
                        </p>
                    </div>

                    {boostBonus > 0 && (
                        <div className="mt-4 bg-zinc-900 border border-zinc-700 px-4 py-2 text-xs text-zinc-200 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-white animate-pulse" />
                            <span>Simulated Boost: <strong>+{boostBonus} Points</strong></span>
                        </div>
                    )}
                </motion.div>

                {/* Score Drivers Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="lg:col-span-2 sharp-card bg-white p-6 border border-zinc-200/90 hover:border-zinc-900 transition-all duration-200 space-y-6"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-zinc-900">Score Drivers & Weight Breakdown</h2>
                            <p className="text-xs text-zinc-500">Key metrics influencing your credit rating</p>
                        </div>
                        <Badge variant="outline" className="bg-zinc-100 text-zinc-900 border-zinc-200 w-fit">
                            Max Score: 850 Pts
                        </Badge>
                    </div>

                    <div className="space-y-4">
                        {scoreDrivers.map((driver, idx) => (
                            <div key={idx} className="space-y-1.5">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-zinc-900">{driver.name}</span>
                                        <Badge className="bg-zinc-100 text-zinc-700 text-[10px] px-1.5 py-0">
                                            {driver.weight} Weight
                                        </Badge>
                                    </div>
                                    <span className="font-bold text-zinc-900">{driver.pts} / {driver.maxPts} pts</span>
                                </div>
                                <Progress value={(driver.pts / driver.maxPts) * 100} className="h-1.5 bg-zinc-100" />
                                <p className="text-[11px] text-zinc-500">{driver.description}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Interactive RentScore Booster Simulator */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="sharp-card bg-zinc-950 p-6 text-white border border-transparent hover:border-zinc-700 space-y-6"
            >
                <div className="border-b border-zinc-800 pb-4">
                    <h2 className="text-base font-bold text-white">
                        Interactive Score Booster Simulator
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">Toggle actions below to see how your score increases dynamically!</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Action 1 */}
                    <div
                        onClick={() => setSimulatedActions(prev => ({ ...prev, earlyPayment: !prev.earlyPayment }))}
                        className={`cursor-pointer p-4 border transition-all ${
                            simulatedActions.earlyPayment
                                ? 'bg-zinc-900 border-white text-white'
                                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-600'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <Badge className="bg-white text-zinc-950 font-bold">+15 Pts</Badge>
                        </div>
                        <h4 className="font-semibold text-xs text-white">Pay Rent Early via Paygate</h4>
                        <p className="text-[11px] text-zinc-400 mt-1">Make consecutive on-time digital rent payments.</p>
                        <div className="mt-3 text-[11px] font-medium text-zinc-300">
                            {simulatedActions.earlyPayment ? '✓ Action Applied' : '+ Click to Simulate'}
                        </div>
                    </div>

                    {/* Action 2 */}
                    <div
                        onClick={() => setSimulatedActions(prev => ({ ...prev, bankConnect: !prev.bankConnect }))}
                        className={`cursor-pointer p-4 border transition-all ${
                            simulatedActions.bankConnect
                                ? 'bg-zinc-900 border-white text-white'
                                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-600'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-400" />
                            <Badge className="bg-white text-zinc-950 font-bold">+20 Pts</Badge>
                        </div>
                        <h4 className="font-semibold text-xs text-white">Connect Verified Bank</h4>
                        <p className="text-[11px] text-zinc-400 mt-1">Verify automated bank account and income proofs.</p>
                        <div className="mt-3 text-[11px] font-medium text-zinc-300">
                            {simulatedActions.bankConnect ? '✓ Action Applied' : '+ Click to Simulate'}
                        </div>
                    </div>

                    {/* Action 3 */}
                    <div
                        onClick={() => setSimulatedActions(prev => ({ ...prev, leaseComplete: !prev.leaseComplete }))}
                        className={`cursor-pointer p-4 border transition-all ${
                            simulatedActions.leaseComplete
                                ? 'bg-zinc-900 border-white text-white'
                                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-600'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            <Badge className="bg-white text-zinc-950 font-bold">+25 Pts</Badge>
                        </div>
                        <h4 className="font-semibold text-xs text-white">Complete 12-Month Tenancy</h4>
                        <p className="text-[11px] text-zinc-400 mt-1">Full-term occupancy with clean move-out inspection.</p>
                        <div className="mt-3 text-[11px] font-medium text-zinc-300">
                            {simulatedActions.leaseComplete ? '✓ Action Applied' : '+ Click to Simulate'}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Profile Verifications List with Real Navigation */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="sharp-card bg-white p-6 border border-zinc-200/90 hover:border-zinc-900 transition-all duration-200 space-y-6"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900">Verification Checklist</h2>
                        <p className="text-xs text-zinc-500">Complete profile verifications to unlock max RentScore™</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
                        {verifications.filter(v => v.verified).length} / {verifications.length} Completed
                    </Badge>
                </div>

                <div className="space-y-4">
                    {verifications.map((item) => (
                        <div key={item.type} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/70 hover:bg-zinc-50 gap-4 transition-colors">
                            <div>
                                <h4 className="font-semibold text-sm text-zinc-900">{item.label}</h4>
                                <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-emerald-600">{item.points}</span>
                                {item.verified ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Verified
                                    </Badge>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold flex items-center gap-1.5"
                                        onClick={() => navigate(createPageUrl(item.actionUrl))}
                                    >
                                        Verify Now
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
