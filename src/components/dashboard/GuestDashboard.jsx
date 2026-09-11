import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import {
    Building2,
    CreditCard,
    TrendingUp,
    Shield,
    Wrench,
    ArrowRight,
    CheckCircle2,
    ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function GuestDashboard() {
    // Fetch preview of available properties
    const { data: properties = [] } = useQuery({
        queryKey: ['guestPreviewProperties'],
        queryFn: async () => {
            const list = await appClient.entities.Property.list();
            return (list || []).filter(p => p.status === 'available').slice(0, 3);
        }
    });

    return (
        <div className="space-y-8 md:space-y-12 pb-8">
            {/* Hero Section for Guests */}
            <div className="relative overflow-hidden rounded-2xl bg-zinc-950 text-white p-6 sm:p-10 md:p-14 border border-zinc-800 shadow-xl">
                {/* Background glow & grid accents */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/4 -mb-8 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 max-w-3xl">

                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                        Rent on your terms, protect your deposit & build credit.
                    </h1>

                    <p className="mt-4 text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed max-w-2xl">
                        RentFlex brings flexible payment cycles, automated bank trust escrow under the Rental Housing Act, and verified RentScore™ reputation tracking to tenants, owners, and contractors.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
                        <Button asChild size="lg" className="bg-white hover:bg-zinc-100 text-zinc-950 font-semibold h-11 px-6 rounded-xl shadow-sm">
                            <Link to={createPageUrl('Auth') + '?mode=register'}>
                                Create Free Account
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>

                        <Button asChild variant="outline" size="lg" className="border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-white font-semibold h-11 px-6 rounded-xl">
                            <Link to={createPageUrl('Auth')}>
                                Sign In
                            </Link>
                        </Button>

                        <Button asChild variant="ghost" size="lg" className="text-zinc-300 hover:text-white hover:bg-zinc-900 h-11 px-4 rounded-xl">
                            <Link to={createPageUrl('Properties')}>
                                <Building2 className="w-4 h-4 mr-2 text-zinc-400" />
                                Browse Homes
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Core Value Pillars */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                            Why South Africa Chooses RentFlex
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-500">
                            Transparent, tech-first rental infrastructure engineered for high trust
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Pillar 1 */}
                    <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-all space-y-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-900 border border-zinc-200">
                            <CreditCard className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm text-zinc-900">Flexible Payment Cycles</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Split monthly rent into weekly or bi-weekly payments matching your income schedule.
                        </p>
                    </div>

                    {/* Pillar 2 */}
                    <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-all space-y-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm text-zinc-900">RentScore™ Credit Builder</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Turn your on-time rental payments into a verified credit credential accepted across top landlords.
                        </p>
                    </div>

                    {/* Pillar 3 */}
                    <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-all space-y-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                            <Shield className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm text-zinc-900">Deposit Escrow Protection</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Security deposits safely locked in regulated trust accounts under the Rental Housing Act.
                        </p>
                    </div>

                    {/* Pillar 4 */}
                    <div className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 transition-all space-y-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                            <Wrench className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm text-zinc-900">Verified Contractor Bids</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Screened service professionals bid on repairs with automated escrow payouts upon inspection.
                        </p>
                    </div>
                </div>
            </div>

            {/* How It Works for Each Role */}
            <div className="bg-zinc-50/80 rounded-2xl p-6 sm:p-8 border border-zinc-200/70 space-y-6">
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                        Engineered for Everyone in the Rental Ecosystem
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-500">
                        Choose how you participate in the RentFlex network
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tenant Card */}
                    <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                            <Badge variant="outline" className="text-zinc-700 border-zinc-300">Tenants</Badge>
                            <h3 className="font-bold text-sm text-zinc-900">Stress-free Renting</h3>
                            <ul className="text-xs text-zinc-600 space-y-2 pt-1">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Split rent payments over the month</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Build a verified RentScore™</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Safe deposit returns & instant maintenance</span>
                                </li>
                            </ul>
                        </div>
                        <Button asChild variant="outline" size="sm" className="w-full mt-4 text-xs font-semibold rounded-lg">
                            <Link to={createPageUrl('Auth') + '?mode=register'}>
                                Register as Tenant <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Link>
                        </Button>
                    </div>

                    {/* Landlord Card */}
                    <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                            <Badge variant="outline" className="text-zinc-700 border-zinc-300">Landlords & Owners</Badge>
                            <h3 className="font-bold text-sm text-zinc-900">Guaranteed Rental Income</h3>
                            <ul className="text-xs text-zinc-600 space-y-2 pt-1">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Automated rent collection & reconciliation</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Pre-screened applicants with RentScore</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Compliant digital lease generation</span>
                                </li>
                            </ul>
                        </div>
                        <Button asChild variant="outline" size="sm" className="w-full mt-4 text-xs font-semibold rounded-lg">
                            <Link to={createPageUrl('Auth') + '?mode=register'}>
                                Register as Landlord <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Link>
                        </Button>
                    </div>

                    {/* Contractor Card */}
                    <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                            <Badge variant="outline" className="text-zinc-700 border-zinc-300">Contractors</Badge>
                            <h3 className="font-bold text-sm text-zinc-900">Escrow-Backed Jobs</h3>
                            <ul className="text-xs text-zinc-600 space-y-2 pt-1">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Bid directly on active repair jobs</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Funds pre-funded into escrow before work begins</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Same-day payout upon completion</span>
                                </li>
                            </ul>
                        </div>
                        <Button asChild variant="outline" size="sm" className="w-full mt-4 text-xs font-semibold rounded-lg">
                            <Link to={createPageUrl('Auth') + '?mode=register'}>
                                Register as Contractor <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Featured Properties Preview */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                            Explore Available Homes
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-500">
                            Pre-verified listings ready for flexible leases
                        </p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-zinc-800">
                        <Link to={createPageUrl('Properties')}>
                            View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                    </Button>
                </div>

                {properties.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {properties.map((prop) => (
                            <div key={prop.id} className="bg-white rounded-xl border border-zinc-200/80 overflow-hidden hover:shadow-sm transition-[box-shadow,border-color] duration-150 flex flex-col">
                                <div className="h-40 bg-zinc-100 relative">
                                    {prop.images?.[0] ? (
                                        <img src={prop.images[0]} alt={prop.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                            <Building2 className="w-8 h-8 opacity-40" />
                                        </div>
                                    )}
                                    <div className="absolute top-2.5 left-2.5">
                                        <Badge className="bg-zinc-900/90 text-white text-[10px]">
                                            R{Number(prop.monthly_rent).toLocaleString('en-ZA')}/mo
                                        </Badge>
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-sm text-zinc-900 truncate">{prop.title}</h3>
                                        <p className="text-xs text-zinc-500 truncate mt-0.5">{prop.address || 'South Africa'}</p>
                                    </div>
                                    <Button asChild size="sm" variant="outline" className="w-full mt-3 text-xs rounded-lg">
                                        <Link to={createPageUrl('Properties')}>View Property</Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center bg-white space-y-3">
                        <Building2 className="w-8 h-8 text-zinc-400 mx-auto" />
                        <h3 className="text-sm font-semibold text-zinc-800">Browse Properties Nationwide</h3>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                            Search thousands of apartments, townhouses, and houses across Johannesburg, Cape Town, and Durban.
                        </p>
                        <Button asChild size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold rounded-lg">
                            <Link to={createPageUrl('Properties')}>
                                Explore Properties Marketplace
                            </Link>
                        </Button>
                    </div>
                )}
            </div>

            {/* Bottom Call to Action for Guests */}
            <div className="rounded-2xl bg-zinc-100 border border-zinc-200/80 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="space-y-1 text-center sm:text-left">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                        Ready to elevate your rental experience?
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-500">
                        Create an account in under 2 minutes and explore flexible leases.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Button asChild size="default" className="bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-semibold rounded-xl h-10 px-5 shadow-xs">
                        <Link to={createPageUrl('Auth') + '?mode=register'}>
                            Get Started
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
