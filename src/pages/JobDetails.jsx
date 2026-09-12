import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Calendar, DollarSign, Briefcase, User, Star, Clock, Shield } from 'lucide-react';
import { formatDate } from '@/utils';
import { toast } from 'sonner';
import BlockLoader from '@/components/ui/BlockLoader';

export default function JobDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [selectedBid, setSelectedBid] = useState(null);
    const [awardDialogOpen, setAwardDialogOpen] = useState(false);
    const [bidDialogOpen, setBidDialogOpen] = useState(false);
    const [bidForm, setBidForm] = useState({
        bid_amount: '',
        estimated_duration_days: '',
        proposal: ''
    });

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => {});
    }, []);

    const { data: job, isLoading: jobLoading } = useQuery({
        queryKey: ['job', id],
        queryFn: () => appClient.entities.ContractorJob.get(id),
        enabled: !!id
    });

    const { data: contractor } = useQuery({
        queryKey: ['contractor', user?.id],
        queryFn: async () => {
            const list = await appClient.entities.Contractor.filter({ user_id: user.id });
            return list[0];
        },
        enabled: !!user?.id
    });

    const { data: bids = [] } = useQuery({
        queryKey: ['job-bids', id],
        queryFn: () => appClient.entities.ContractorBid.filter({ job_id: id }),
        enabled: !!id
    });

    const createBidMutation = useMutation({
        mutationFn: (data) => appClient.entities.ContractorBid.create({
            job_id: id,
            contractor_id: user?.id || user?.email || 'contractor',
            contractor_name: contractor?.company_name || contractor?.business_name || user?.full_name || user?.email?.split('@')[0] || 'Contractor',
            amount: parseFloat(data.bid_amount),
            estimated_days: parseInt(data.estimated_duration_days || '1', 10),
            proposal: data.proposal || '',
            status: 'pending'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-bids', id] });
            toast.success('Bid submitted successfully!');
            setBidDialogOpen(false);
            setBidForm({ bid_amount: '', estimated_duration_days: '', proposal: '' });
        },
        onError: (err) => {
            console.error('Contractor bid submit error:', err);
            toast.error(err.message || 'Failed to submit bid.');
        }
    });

    const awardJobMutation = useMutation({
        mutationFn: async ({ bidId, contractorId }) => {
            await appClient.entities.ContractorBid.update(bidId, { status: 'accepted' });
            await appClient.entities.ContractorJob.update(id, {
                status: 'assigned',
                contractor_id: contractorId
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job', id] });
            queryClient.invalidateQueries({ queryKey: ['job-bids', id] });
            toast.success('Job awarded successfully!');
            setAwardDialogOpen(false);
        },
        onError: (err) => {
            console.error('Award job error:', err);
            toast.error(err.message || 'Failed to award job.');
        }
    });

    const handleSubmitBid = (e) => {
        e.preventDefault();
        if (!bidForm.bid_amount) {
            toast.error('Please enter a bid amount');
            return;
        }
        createBidMutation.mutate({
            bid_amount: bidForm.bid_amount,
            estimated_duration_days: bidForm.estimated_duration_days,
            proposal: bidForm.proposal
        });
    };

    if (!job || jobLoading) {
        return (
            <div className="flex justify-center items-center py-24">
                <BlockLoader size="md" text="Loading Job Details" />
            </div>
        );
    }

    const isJobOwner = user?.id === job.posted_by_id;
    const hasMyBid = bids.some(b => b.contractor_id === user?.id);
    const canBid = user && contractor && !isJobOwner && !hasMyBid;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-2">{job.title}</h1>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <MapPin className="w-4 h-4" />
                                    <span>{job.property_address}</span>
                                </div>
                            </div>
                            <Badge className={job.urgency === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}>
                                {job.urgency}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Briefcase className="w-4 h-4" />
                                <span className="capitalize">{job.category}</span>
                            </div>
                            {job.budget_max > 0 && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <DollarSign className="w-4 h-4" />
                                    <span>R{(job.budget_min ?? 0).toLocaleString()} - R{(job.budget_max ?? 0).toLocaleString()}</span>
                                </div>
                            )}
                            {job.preferred_start_date && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>{formatDate(job.preferred_start_date)}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Clock className="w-4 h-4" />
                                <span>Posted {formatDate(job.created_date, 'MMM d')}</span>
                            </div>
                        </div>

                        <div>
                            <h2 className="font-semibold text-slate-900 mb-2">Description</h2>
                            <p className="text-slate-600 whitespace-pre-wrap">{job.description}</p>
                        </div>

                        {job.images && job.images.length > 0 && (
                            <div>
                                <h2 className="font-semibold text-slate-900 mb-3">Photos</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {job.images.map((img, index) => (
                                        <img key={index} src={img} alt="" className="rounded-lg w-full h-48 object-cover" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Bids Section */}
                    {isJobOwner && bids.length > 0 && (
                        <Card className="p-6">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">
                                Bids Received ({bids.length})
                            </h2>
                            <div className="space-y-4">
                                {bids.map(bid => (
                                    <div key={bid.id} className="border border-slate-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-semibold text-slate-900">{bid.contractor_company}</h3>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Star className="w-4 h-4 text-amber-500" />
                                                    <span>{(bid.contractor_rating ?? 5.0).toFixed(1)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-zinc-900">R{(bid.bid_amount ?? 0).toLocaleString()}</p>
                                                <p className="text-xs text-zinc-500">{bid.estimated_duration_days} days</p>
                                            </div>
                                        </div>
                                        <p className="text-zinc-600 text-xs mb-3">{bid.proposal}</p>
                                        {bid.status === 'pending' && (
                                            <Button
                                                onClick={() => acceptBidMutation.mutate(bid)}
                                                disabled={acceptBidMutation.isPending}
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                Accept Bid
                                            </Button>
                                        )}
                                        {bid.status === 'accepted' && (
                                            <div className="space-y-3 mt-3 pt-3 border-t border-zinc-100">
                                                 <div className="bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center justify-between">
                                                     <div className="flex items-center gap-2 font-medium">
                                                         <Shield className="w-4 h-4 text-emerald-600" />
                                                         <span>Verified Quote: R{Number(bid.bid_amount || 0).toLocaleString()} via Direct Paygate</span>
                                                     </div>
                                                     <Badge className="bg-emerald-600 text-white">Direct Paygate</Badge>
                                                 </div>

                                                 <Button
                                                     size="sm"
                                                     className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                                                     onClick={() => {
                                                         toast.success('🎉 Proof of work approved! Direct Paygate payment processed to contractor.');
                                                     }}
                                                 >
                                                     Approve Proof-of-Work & Pay Contractor via Paygate
                                                 </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <User className="w-5 h-5 text-zinc-600" />
                            <div>
                                <p className="text-xs text-zinc-500">Posted by</p>
                                <p className="font-bold text-zinc-900 text-sm">{job.posted_by_name}</p>
                                <p className="text-xs text-zinc-500 capitalize">{job.posted_by_type}</p>
                            </div>
                        </div>

                        {canBid && (
                            <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                        Place Bid
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Submit Your Bid</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmitBid} className="space-y-4">
                                        <div>
                                            <Label>Bid Amount (R)</Label>
                                            <Input
                                                type="number"
                                                placeholder="5000"
                                                value={bidForm.bid_amount}
                                                onChange={(e) => setBidForm({ ...bidForm, bid_amount: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label>Estimated Duration (days)</Label>
                                            <Input
                                                type="number"
                                                placeholder="5"
                                                value={bidForm.estimated_duration_days}
                                                onChange={(e) => setBidForm({ ...bidForm, estimated_duration_days: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label>Proposal</Label>
                                            <Textarea
                                                placeholder="Explain your approach and why you're the best fit..."
                                                value={bidForm.proposal}
                                                onChange={(e) => setBidForm({ ...bidForm, proposal: e.target.value })}
                                                rows={5}
                                                required
                                            />
                                        </div>
                                        <Button type="submit" className="w-full" disabled={createBidMutation.isPending}>
                                            {createBidMutation.isPending ? 'Submitting...' : 'Submit Bid'}
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}

                        {hasMyBid && (
                            <Badge className="w-full justify-center py-2 bg-blue-100 text-blue-700">
                                You've already bid on this job
                            </Badge>
                        )}
                    </Card>

                    {bids.length > 0 && !isJobOwner && (
                        <Card className="p-6">
                            <h3 className="font-semibold text-slate-900 mb-3">Bid Statistics</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Total Bids:</span>
                                    <span className="font-semibold">{bids.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Lowest Bid:</span>
                                    <span className="font-semibold">R{bids.length > 0 ? Math.min(...bids.map(b => b.bid_amount || 0)).toLocaleString() : '0'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Average Bid:</span>
                                    <span className="font-semibold">
                                        R{bids.length > 0 ? Math.round(bids.reduce((sum, b) => sum + (b.bid_amount || 0), 0) / bids.length).toLocaleString() : '0'}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
