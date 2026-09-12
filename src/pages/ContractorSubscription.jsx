import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

export default function ContractorSubscription() {
    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold px-3 py-1 text-xs">
                    100% Free Platform
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
                    RentFlex is 100% Free for Contractors
                </h1>
                <p className="text-sm sm:text-base text-zinc-500 max-w-2xl mx-auto leading-relaxed">
                    We believe service professionals shouldn't have to pay monthly subscriptions or commissions just to bid on work. Access maintenance jobs, submit quotes, and receive direct paygate settlements for free.
                </p>
            </div>

            {/* Main Free Tier Card */}
            <Card className="sharp-card bg-zinc-950 text-white p-8 border border-transparent hover:border-zinc-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-white">Free Unlimited Membership</h2>
                            <Badge className="bg-emerald-500 text-zinc-950 font-extrabold text-[10px]">ACTIVE</Badge>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">Full access enabled for all registered contractors</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <span className="text-3xl font-extrabold text-white">R0</span>
                        <span className="text-xs text-zinc-400 block">Forever Free</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="flex items-start gap-3 bg-zinc-900/60 p-4 border border-zinc-800">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-xs text-white">Unlimited Bidding</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Bid on unlimited plumbing, electrical, HVAC, and repair jobs without restriction.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 bg-zinc-900/60 p-4 border border-zinc-800">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-xs text-white">Direct Paygate Settlements</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Receive direct payments to your bank account upon landlord inspection & approval.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 bg-zinc-900/60 p-4 border border-zinc-800">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-xs text-white">Zero Commissions</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5">You keep 100% of your quoted bid amount. No platform transaction cuts.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 bg-zinc-900/60 p-4 border border-zinc-800">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-xs text-white">Contractor RentScore™</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Build a verified reputation rating accepted by landlords and property managers nationwide.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-zinc-400">
                        Need to update your trade categories or service areas?
                    </p>
                    <Button asChild className="bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs rounded-lg shadow-sm">
                        <a href="/ContractorOnboarding">Manage Contractor Profile</a>
                    </Button>
                </div>
            </Card>
        </div>
    );
}
