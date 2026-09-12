import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { Link } from 'react-router-dom';
import { createPageUrl, formatDate } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatsCard from '@/components/dashboard/StatsCard';
import { Briefcase, DollarSign, Star, Clock, MapPin, AlertCircle, CheckCircle2, XCircle, ShieldCheck, ShieldAlert, FileText, ChevronRight } from 'lucide-react';
import BlockLoader from '@/components/ui/BlockLoader';
import { validateSouthAfricanID } from '@/utils/contractorVerificationEngine';

export default function ContractorDashboard() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        appClient.auth.me().then(setUser);
    }, []);

    const { data: contractor, isLoading: isLoadingContractor } = useQuery({
        queryKey: ['my-contractor-profile', user?.id || user?.email],
        queryFn: () => appClient.entities.Contractor.filter({ user_id: user?.id || user?.email }).then(r => r[0]),
        enabled: !!user
    });

    const { data: availableJobs = [] } = useQuery({
        queryKey: ['available-jobs'],
        queryFn: () => appClient.entities.Job.filter({ status: 'open' }),
        enabled: !!contractor
    });

    const { data: myBids = [] } = useQuery({
        queryKey: ['my-bids', user?.id || user?.email],
        queryFn: () => appClient.entities.ContractorBid.filter({ contractor_id: user?.id || user?.email }),
        enabled: !!user
    });

    const { data: activeJobs = [] } = useQuery({
        queryKey: ['my-active-jobs'],
        queryFn: async () => {
            const acceptedBids = myBids.filter(b => b.status === 'accepted');
            const jobs = await Promise.all(
                acceptedBids.map(bid => appClient.entities.Job.filter({ id: bid.job_id }))
            );
            return jobs.flat();
        },
        enabled: myBids.length > 0
    });

    if (isLoadingContractor || !user) {
        return (
            <div className="flex justify-center items-center py-20">
                <BlockLoader size="md" text="Loading Contractor Portal" />
            </div>
        );
    }

    if (!contractor) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12 sharp-card bg-white p-8 border border-transparent hover:border-zinc-900">
                <AlertCircle className="w-12 h-12 text-zinc-900 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Complete Your Contractor Profile</h2>
                <p className="text-xs text-zinc-500 mb-6">Set up your contractor profile to start bidding on jobs</p>
                <Button asChild className="bg-zinc-900 hover:bg-zinc-800 text-white">
                    <Link to={createPageUrl('ContractorOnboarding')}>Complete Profile & Verification</Link>
                </Button>
            </div>
        );
    }

    const pendingBids = myBids.filter(b => b.status === 'pending').length;
    const acceptedBids = myBids.filter(b => b.status === 'accepted').length;
    const rejectedBids = myBids.filter(b => b.status === 'rejected').length;
    const totalEarnings = myBids
        .filter(b => b.status === 'accepted')
        .reduce((sum, bid) => sum + (Number(bid.bid_amount) || 0), 0);

    // Automated Verification Stats
    const idValid = contractor.id_number && validateSouthAfricanID(contractor.id_number).valid;
    const verificationScore = contractor.verification_score || 0;
    const verificationStatus = contractor.verification_status || (contractor.verified ? 'verified' : 'pending');

    const verificationChecklist = [
        { label: 'SA ID Number Validated (Luhn Check)', done: Boolean(idValid) },
        { label: 'Government ID / Passport Uploaded', done: Boolean(contractor.id_document_url) },
        { label: 'Trade License / Certificate Uploaded', done: Boolean(contractor.trade_certificate_url) },
        { label: 'Proof of Address Uploaded', done: Boolean(contractor.proof_of_address_url) }
    ];
    const completedChecklistCount = verificationChecklist.filter(v => v.done).length;

    const displayName = contractor.company_name || contractor.business_name || 'Contractor';

    return (
        <div>
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-zinc-900">
                            Welcome back, {displayName}!
                        </h1>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">Manage your bids and find new opportunities</p>
                </div>

                <Button asChild variant="outline" size="sm" className="w-fit">
                    <Link to={createPageUrl('ContractorOnboarding')}>
                        Edit Profile & Verification
                    </Link>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatsCard
                    title="Active Jobs"
                    value={activeJobs.length}
                    icon={Briefcase}
                    color="indigo"
                />
                <StatsCard
                    title="Pending Bids"
                    value={pendingBids}
                    icon={Clock}
                    color="blue"
                />
                <StatsCard
                    title="Total Earnings"
                    value={`R${totalEarnings.toLocaleString()}`}
                    icon={DollarSign}
                    color="emerald"
                />
                <StatsCard
                    title="Rating"
                    value={Number(contractor.rating || 5.0).toFixed(1)}
                    icon={Star}
                    color="amber"
                />
            </div>

            {/* 100% Free Contractor Membership Banner */}
            <Card className="p-6 mb-8 sharp-card bg-zinc-950 text-white border border-transparent hover:border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-base text-white">100% Free Contractor Access</h3>
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Active</Badge>
                        </div>
                        <p className="text-xs text-zinc-400">
                            No monthly fees, zero commission on bids, and unlimited access to maintenance job listings nationwide.
                        </p>
                    </div>
                    <Badge className="bg-white text-zinc-950 font-bold px-3 py-1 shrink-0 w-fit">Free Forever</Badge>
                </div>
            </Card>

            {/* Automated Verification Dashboard Card */}
            <Card className="p-6 mb-8 sharp-card bg-white border border-zinc-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-bold text-lg text-zinc-900">Automated Verification Protocol</h3>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Real-time South African ID Luhn validation and automated document verification engine.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <span className="text-xs text-zinc-500 block">Verification Score</span>
                            <span className="text-2xl font-black text-zinc-900">{verificationScore}/100</span>
                        </div>
                        <Button asChild size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white">
                            <Link to={createPageUrl('ContractorOnboarding')}>
                                Update Documents
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {verificationChecklist.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 sharp-card bg-zinc-50 border border-zinc-100">
                            {item.done ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-zinc-300 shrink-0" />
                            )}
                            <span className={`text-xs font-medium ${item.done ? 'text-zinc-900' : 'text-zinc-500'}`}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Active Bids */}
            {myBids.length > 0 && (
                <Card className="p-6 mb-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">My Bids</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-blue-900">{pendingBids}</p>
                            <p className="text-sm text-blue-700">Pending</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-4 text-center">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-emerald-900">{acceptedBids}</p>
                            <p className="text-sm text-emerald-700">Won</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                            <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-red-900">{rejectedBids}</p>
                            <p className="text-sm text-red-700">Lost</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {myBids.slice(0, 3).map(bid => (
                            <div key={bid.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-slate-900">{bid.job_title}</p>
                                    <p className="text-sm text-slate-600">R{bid.bid_amount.toLocaleString()}</p>
                                </div>
                                <Badge className={
                                    bid.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                                        bid.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-red-100 text-red-700'
                                }>
                                    {bid.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Available Jobs */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900">Available Jobs</h2>
                    <Button variant="outline" size="sm" asChild>
                        <Link to={createPageUrl('Jobs')}>View All</Link>
                    </Button>
                </div>

                <div className="grid gap-4">
                    {availableJobs.slice(0, 5).map(job => (
                        <Card key={job.id} className="p-6 hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{job.title}</h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <MapPin className="w-4 h-4" />
                                        <span>{job.property_address}</span>
                                    </div>
                                </div>
                                <Badge className={job.urgency === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}>
                                    {job.urgency}
                                </Badge>
                            </div>

                            <p className="text-slate-600 text-sm mb-4 line-clamp-2">{job.description}</p>

                            <div className="flex items-center justify-between">
                                <div className="flex gap-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-1">
                                        <Briefcase className="w-4 h-4" />
                                        <span className="capitalize">{job.category}</span>
                                    </div>
                                    {job.budget_max > 0 && (
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="w-4 h-4" />
                                            <span>Up to R{job.budget_max.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                                <Button size="sm" asChild>
                                    <Link to={createPageUrl(`JobDetails?id=${job.id}`)}>Bid Now</Link>
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>

                {availableJobs.length === 0 && (
                    <Card className="p-12 text-center">
                        <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No jobs available</h3>
                        <p className="text-slate-600">Check back later for new opportunities</p>
                    </Card>
                )}
            </div>
        </div>
    );
}
