import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Clock,
    Shield,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';


import { toast } from 'sonner';
import RentScoreGauge from '@/components/dashboard/RentScoreGauge';

export default function RentScore() {
    const [user, setUser] = useState(null);
    const [simulatedActions, setSimulatedActions] = useState({
        earlyPayment: false,
        bankConnect: false,
        leaseComplete: false
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const { data: rentScoreData, isLoading } = useQuery({
        queryKey: ['rentScore', user?.email],
        queryFn: async () => {
            const scores = await appClient.entities.RentScore.filter({ user_id: user?.email });
            return scores[0] || {
                score: 0,
                payment_history_score: 0,
                lease_completion_score: 0,
                landlord_reviews_score: 0,
                verification_score: 0,
                verified_income: false,
                verified_employment: false,
                verified_identity: false
            };
        },
        enabled: !!user?.email,
    });

    const updateScoreMutation = useMutation({
        mutationFn: (/** @type {{ id: string, data: any }} */ { id, data }) => appClient.entities.RentScore.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rentScore'] });
            toast.success('RentScore updated!');
        },
    });

    const handleVerify = async (verificationType) => {
        if (!rentScoreData) return;
        const currentScore = rentScoreData.score || 550;
        const updates = {
            [`verified_${verificationType}`]: true,
            verification_score: Math.min(100, (rentScoreData.verification_score || 0) + 25),
            score: Math.min(850, currentScore + 25),
            last_updated: new Date().toISOString()
        };
        if (rentScoreData.id) {
            updateScoreMutation.mutate({ id: rentScoreData.id, data: updates });
        } else if (user?.email) {
            await appClient.entities.RentScore.create({
                user_id: user.email,
                ...updates
            });
            queryClient.invalidateQueries({ queryKey: ['rentScore'] });
            toast.success('Verification submitted and RentScore initialized!');
        }
    };

    const baseScore = rentScoreData?.score || 0;
    
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
            name: 'Income-to-Rent Ratio',
            weight: '25%',
            pts: Math.round((baseScore / 850) * 212.5),
            maxPts: 212.5,
            color: 'bg-zinc-800',
            description: 'Verified monthly earnings exceed 3x monthly rent requirement.'
        },
        {
            name: 'Property Care & Condition',
            weight: '20%',
            pts: Math.round((baseScore / 850) * 170),
            maxPts: 170,
            color: 'bg-zinc-600',
            description: 'Impeccable move-in and move-out inspection records with full deposit return.'
        },
        {
            name: 'Lease Completion Length',
            weight: '15%',
            pts: Math.round((baseScore / 850) * 127.5),
            maxPts: 127.5,
            color: 'bg-amber-500',
            description: 'Successfully completed 12+ month lease agreements without early exit.'
        }
    ];

    const verifications = [
        {
            type: 'identity',
            label: 'Government ID Verification',
            description: 'Verify identity with valid Smart ID or Passport',
            verified: rentScoreData?.verified_identity,
            points: '+15 points'
        },
        {
            type: 'income',
            label: 'Verified Bank Statement',
            description: 'Link bank proof of income to confirm affordability',
            verified: rentScoreData?.verified_income,
            points: '+15 points'
        },
        {
            type: 'employment',
            label: 'Employment Confirmation',
            description: 'Confirm active employment status with employer letter',
            verified: rentScoreData?.verified_employment,
            points: '+15 points'
        }
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">Your RentScore™</h1>
                <p className="text-zinc-500 text-xs mt-1">
                    Your RentScore reflects your rental trustworthiness, giving you access to lower deposit rates and priority rental approvals.
                </p>
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
                            Updated live via RentFlex Verification Engine
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
                    className="lg:col-span-2 sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200 space-y-6"
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
                    <p className="text-xs text-zinc-400 mt-1">Toggle actions below to see how your score increases instantly!</p>
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
                            <Clock className="w-4 h-4 text-white" />
                            <Badge className="bg-white text-zinc-950 font-bold">+15 Pts</Badge>
                        </div>
                        <h4 className="font-semibold text-xs text-white">Pay Rent 3 Days Early</h4>
                        <p className="text-[11px] text-zinc-400 mt-1">Demonstrates proactive liquidity & payment discipline.</p>
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
                            <Shield className="w-4 h-4 text-white" />
                            <Badge className="bg-white text-zinc-950 font-bold">+20 Pts</Badge>
                        </div>
                        <h4 className="font-semibold text-xs text-white">Verify Bank Income Proof</h4>
                        <p className="text-[11px] text-zinc-400 mt-1">Confirms verified monthly income ratio exceeding 3x rent.</p>
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
                        <h4 className="font-semibold text-xs text-white">Complete 12-Month Lease</h4>
                        <p className="text-[11px] text-zinc-400 mt-1">Completes full term with clean move-out inspection.</p>
                        <div className="mt-3 text-[11px] font-medium text-zinc-300">
                            {simulatedActions.leaseComplete ? '✓ Action Applied' : '+ Click to Simulate'}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Profile Verifications List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200 space-y-6"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900">Verification Checklist</h2>
                        <p className="text-xs text-zinc-500">Complete profile verifications to unlock max RentScore</p>
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
                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">
                                        Verified
                                    </Badge>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="bg-zinc-900 hover:bg-zinc-800 text-white"
                                        onClick={() => handleVerify(item.type)}
                                        disabled={updateScoreMutation.isPending}
                                    >
                                        Verify Now
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
