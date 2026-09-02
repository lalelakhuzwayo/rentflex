import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDate } from '@/utils';
import {
    Shield,
    Plus,
    AlertCircle,
    Clock,
    CheckCircle2,
    Scale,
    FileText,
    Upload,
    DollarSign,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

const statusConfig = {
    open: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock, label: 'Open' },
    under_review: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Scale, label: 'Under Review' },
    resolved: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Resolved' },
    escalated: { color: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle, label: 'Escalated' },
};

export default function Disputes() {
    const [user, setUser] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        disputed_amount: '',
        reason: '',
        lease_id: '',
    });

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const { data: disputes, isLoading } = useQuery({
        queryKey: ['disputes', user?.email],
        queryFn: () => appClient.entities.DepositDispute.filter({ tenant_id: user?.email }),
        enabled: !!user?.email,
    });

    const { data: leases } = useQuery({
        queryKey: ['leases', user?.email],
        queryFn: () => appClient.entities.Lease.filter({ tenant_id: user?.email }),
        enabled: !!user?.email,
    });

    const createMutation = useMutation({
        mutationFn: (data) => appClient.entities.DepositDispute.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disputes'] });
            setDialogOpen(false);
            setForm({ disputed_amount: '', reason: '', lease_id: '' });
            toast.success('Dispute submitted successfully!');
        },
    });

    const handleSubmit = () => {
        if (!form.disputed_amount || !form.reason || !form.lease_id) {
            toast.error('Please fill in all required fields');
            return;
        }

        const selectedLease = leases?.find(l => l.id === form.lease_id);

        createMutation.mutate({
            lease_id: form.lease_id,
            tenant_id: user?.email,
            landlord_id: selectedLease?.landlord_id,
            property_title: selectedLease?.property_title || 'Rental Property',
            deposit_amount: selectedLease?.deposit_amount || 0,
            disputed_amount: parseFloat(form.disputed_amount),
            reason: form.reason,
            status: 'open',
            tenant_evidence: [],
            landlord_evidence: []
        });
    };

    const openDisputes = disputes?.filter(d => d.status === 'open' || d.status === 'under_review') || [];
    const resolvedDisputes = disputes?.filter(d => d.status === 'resolved') || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Deposit Disputes</h1>
                    <p className="text-slate-500 mt-1">Resolve deposit disputes fairly and transparently</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-zinc-900 hover:bg-zinc-800 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            File Dispute
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>File Deposit Dispute</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div>
                                <Label>Select Lease</Label>
                                <Select value={form.lease_id} onValueChange={(v) => setForm({ ...form, lease_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a lease" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {leases?.map(lease => (
                                            <SelectItem key={lease.id} value={lease.id}>
                                                {lease.property_title || 'Rental'} - R{lease.deposit_amount?.toLocaleString()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Disputed Amount (R)</Label>
                                <Input
                                    type="number"
                                    placeholder="Enter the amount you're disputing"
                                    value={form.disputed_amount}
                                    onChange={(e) => setForm({ ...form, disputed_amount: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label>Reason for Dispute</Label>
                                <Textarea
                                    placeholder="Explain why you believe the deductions are unfair..."
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    rows={4}
                                />
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                                <p className="font-medium mb-2">What happens next?</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>We'll review your dispute and notify your landlord</li>
                                    <li>Both parties can submit evidence</li>
                                    <li>Our team will mediate and reach a fair resolution</li>
                                </ol>
                            </div>

                            <Button
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                                onClick={handleSubmit}
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Submitting...' : 'Submit Dispute'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Info Banner */}
            <div className="sharp-card bg-zinc-950 p-6 text-white border border-transparent hover:border-zinc-800">
                <h3 className="font-bold text-sm text-white mb-1">Fair Dispute Resolution</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                    RentFlex provides an impartial platform to resolve deposit disputes.
                    Both tenants and landlords can submit evidence, and our team ensures fair outcomes.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/90 hover:shadow-md hover:border-slate-300/80 hover:-translate-y-0.5 transition-all duration-200"
                >
                    <p className="text-sm text-slate-500">Active Disputes</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{openDisputes.length}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/90 hover:shadow-md hover:border-slate-300/80 hover:-translate-y-0.5 transition-all duration-200"
                >
                    <p className="text-sm text-slate-500">Resolved</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{resolvedDisputes.length}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/90 hover:shadow-md hover:border-slate-300/80 hover:-translate-y-0.5 transition-all duration-200"
                >
                    <p className="text-sm text-slate-500">Total Disputed</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                        R{(disputes?.reduce((sum, d) => sum + (d.disputed_amount || 0), 0) ?? 0).toLocaleString()}
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/90 hover:shadow-md hover:border-slate-300/80 hover:-translate-y-0.5 transition-all duration-200"
                >
                    <p className="text-sm text-slate-500">Recovered</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                        R{(resolvedDisputes?.reduce((sum, d) => sum + (d.resolved_amount || 0), 0) ?? 0).toLocaleString()}
                    </p>
                </motion.div>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-2 sm:inline-flex sm:items-center gap-2 w-full sm:w-auto">
                {[
                    { key: 'all', label: 'All Disputes' },
                    { key: 'open', label: 'Open' },
                    { key: 'under_review', label: 'Under Review' },
                    { key: 'resolved', label: 'Resolved' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilterStatus(tab.key)}
                        data-active={filterStatus === tab.key}
                        className="filter-pill-btn w-full sm:w-auto justify-center text-center py-2 px-3"
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Disputes List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-40 rounded-2xl" />
                    ))}
                </div>
            ) : (disputes?.filter(d => filterStatus === 'all' || (filterStatus === 'under_review' ? (d.status === 'under_review' || d.status === 'escalated') : d.status === filterStatus)) || []).length > 0 ? (
                <div className="space-y-4">
                    {(disputes.filter(d => filterStatus === 'all' || (filterStatus === 'under_review' ? (d.status === 'under_review' || d.status === 'escalated') : d.status === filterStatus))).map((dispute, idx) => {
                        const status = statusConfig[dispute.status] || statusConfig.open;
                        const StatusIcon = status.icon;
                        const progressSteps = ['open', 'under_review', 'resolved'];
                        const currentStep = progressSteps.indexOf(dispute.status === 'escalated' ? 'under_review' : dispute.status);
                        const progress = ((currentStep + 1) / progressSteps.length) * 100;

                        return (
                            <motion.div
                                key={dispute.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/90 hover:shadow-md hover:border-slate-300/80 transition-all duration-200"
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge className={`${status.color} border`}>
                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                {status.label}
                                            </Badge>
                                            <span className="text-sm text-slate-400">
                                                Filed {formatDate(dispute.created_date)}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-slate-900">{dispute.property_title}</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500">Disputed Amount</p>
                                        <p className="text-xl font-bold text-slate-900">R{dispute.disputed_amount?.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                                        <span>Filed</span>
                                        <span>Under Review</span>
                                        <span>Resolved</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>

                                {/* Reason */}
                                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                                    <p className="text-sm font-medium text-slate-700 mb-1">Dispute Reason</p>
                                    <p className="text-sm text-slate-600">{dispute.reason}</p>
                                </div>

                                {/* Evidence */}
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <FileText className="w-4 h-4" />
                                        <span>Your Evidence: {dispute.tenant_evidence?.length || 0} files</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <FileText className="w-4 h-4" />
                                        <span>Landlord Evidence: {dispute.landlord_evidence?.length || 0} files</span>
                                    </div>
                                </div>

                                {/* Resolution */}
                                {dispute.status === 'resolved' && dispute.resolved_amount !== undefined && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-sm text-slate-600">Resolution Amount</span>
                                        <span className="font-semibold text-emerald-600">
                                            R{dispute.resolved_amount?.toLocaleString()} returned
                                        </span>
                                    </div>
                                )}

                                {dispute.resolution && (
                                    <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <p className="text-sm font-medium text-emerald-800 mb-1">Resolution</p>
                                        <p className="text-sm text-emerald-700">{dispute.resolution}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                {(dispute.status === 'open' || dispute.status === 'under_review') && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <Button variant="outline" size="sm">
                                            <Upload className="w-4 h-4 mr-2" />
                                            Add Evidence
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 sharp-card bg-white border border-transparent hover:border-zinc-900 transition-all duration-200">
                    <Shield className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <h3 className="font-bold text-sm text-zinc-900 mb-1">No disputes filed</h3>
                    <p className="text-xs text-zinc-500 mb-4">If you have a deposit dispute, we're here to help</p>
                    <Button onClick={() => setDialogOpen(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        File Dispute
                    </Button>
                </div>
            )}
        </div>
    );
}
