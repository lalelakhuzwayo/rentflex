import React, { useState } from 'react';
import { appClient } from '@/api/appClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/utils';
import { formatUserDisplayName } from '@/utils/userFormatting';
import {
    Wrench,
    Plus,
    Droplets,
    Zap,
    Wind,
    Refrigerator,
    Home,
    Bug,
    Upload,
    Briefcase,
    CheckCircle2,
    Clock,
    DollarSign,
    ShieldCheck,
    CreditCard,
    Send,
    Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ThreePartyCompletionCard from '@/components/maintenance/ThreePartyCompletionCard';
import { executePaystackPayment } from '@/utils/paymentProcessingEngine';

const categoryIcons = {
    plumbing: Droplets,
    electrical: Zap,
    hvac: Wind,
    appliance: Refrigerator,
    structural: Home,
    pest: Bug,
    other: Wrench,
};

const priorityConfig = {
    low: { color: 'bg-zinc-100 text-zinc-700 border-zinc-200', label: 'Low' },
    medium: { color: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Medium' },
    high: { color: 'bg-orange-50 text-orange-800 border-orange-200', label: 'High' },
    emergency: { color: 'bg-rose-50 text-rose-800 border-rose-200 font-bold', label: '🚨 Emergency' },
};

const statusConfig = {
    open: { color: 'bg-zinc-100 text-zinc-800 border-zinc-200', label: 'Open' },
    submitted: { color: 'bg-zinc-100 text-zinc-800 border-zinc-200', label: 'Submitted' },
    job_dispatched: { color: 'bg-blue-50 text-blue-800 border-blue-300 font-semibold', label: 'Dispatched to Jobs' },
    in_progress: { color: 'bg-amber-50 text-amber-900 border-amber-300 font-bold', label: 'In Progress' },
    scheduled: { color: 'bg-blue-50 text-blue-800 border-blue-200', label: 'Scheduled' },
    assigned: { color: 'bg-purple-50 text-purple-800 border-purple-200', label: 'Assigned' },
    work_completed: { color: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-medium', label: 'Work Completed (Awaiting Sign-off)' },
    resolved: { color: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold', label: 'Resolved' },
    completed: { color: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold', label: 'Completed' },
    cancelled: { color: 'bg-zinc-100 text-zinc-500 border-zinc-200', label: 'Cancelled' },
};

const isValidUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export default function Maintenance() {
    const navigate = useNavigate();
    const { user, role, isLandlord, isContractor, isSysAdmin, isTenant } = useAuth();
    const queryClient = useQueryClient();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [uploadingImage, setUploadingImage] = useState(false);

    // Landlord Dispatch Dialog State
    const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
    const [selectedRequestToDispatch, setSelectedRequestToDispatch] = useState(null);
    const [dispatchForm, setDispatchForm] = useState({
        budget_max: '1500',
        urgency: 'normal',
        category: 'plumbing',
        notes: ''
    });

    // Contractor Update Dialog State
    const [contractorUpdateOpen, setContractorUpdateOpen] = useState(false);
    const [selectedRequestToUpdate, setSelectedRequestToUpdate] = useState(null);
    const [contractorForm, setContractorForm] = useState({
        status: 'in_progress',
        notes: ''
    });

    // Tenant New Request Form
    const [form, setForm] = useState({
        lease_id: '',
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
        images: []
    });

    const userEmail = user?.email;
    const userId = user?.id;

    // Fetch maintenance requests for the user's role
    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['maintenance-requests', userEmail, userId, role],
        queryFn: async () => {
            if (isSysAdmin) {
                return await appClient.entities.MaintenanceRequest.list();
            }

            if (isLandlord) {
                const list1 = await appClient.entities.MaintenanceRequest.filter({ landlord_id: userEmail }).catch(() => []);
                const list2 = userId && userId !== userEmail ? await appClient.entities.MaintenanceRequest.filter({ landlord_id: userId }).catch(() => []) : [];
                const combined = [...list1, ...list2];
                return Array.from(new Map(combined.map(item => [item.id, item])).values());
            }

            if (isContractor) {
                // Contractors see tasks assigned to them, plus open/dispatched requests available for bidding/claiming
                const list1 = await appClient.entities.MaintenanceRequest.filter({ contractor_id: userEmail }).catch(() => []);
                const list2 = userId && userId !== userEmail ? await appClient.entities.MaintenanceRequest.filter({ contractor_id: userId }).catch(() => []) : [];
                const openList = await appClient.entities.MaintenanceRequest.filter({ status: 'open' }).catch(() => []);
                const dispatchedList = await appClient.entities.MaintenanceRequest.filter({ status: 'job_dispatched' }).catch(() => []);
                const combined = [...list1, ...list2, ...openList, ...dispatchedList];
                return Array.from(new Map(combined.map(item => [item.id, item])).values());
            }

            // Tenant
            const list1 = await appClient.entities.MaintenanceRequest.filter({ tenant_id: userEmail }).catch(() => []);
            const list2 = userId && userId !== userEmail ? await appClient.entities.MaintenanceRequest.filter({ tenant_id: userId }).catch(() => []) : [];
            const combined = [...list1, ...list2];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!user,
    });

    // Fetch tenant's active leases to auto-attach property & landlord info
    const { data: leases = [] } = useQuery({
        queryKey: ['my-active-leases', userEmail, userId],
        queryFn: async () => {
            const list1 = await appClient.entities.Lease.filter({ tenant_id: userEmail }).catch(() => []);
            const list2 = userId && userId !== userEmail ? await appClient.entities.Lease.filter({ tenant_id: userId }).catch(() => []) : [];
            const combined = [...list1, ...list2];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!user,
    });

    // Fetch contractor profile if user is contractor
    const { data: contractorProfile } = useQuery({
        queryKey: ['contractor-profile', userEmail, userId],
        queryFn: () => appClient.entities.Contractor.filter({ user_id: userId || userEmail }).then(r => r[0]).catch(() => null),
        enabled: isContractor,
    });

    // Mutation: Submit a new maintenance request (Tenant)
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const created = await appClient.entities.MaintenanceRequest.create(data);
            const msgContent = `🔧 New Maintenance Request: "${data.title}" submitted for ${data.property_title || 'property'}. Priority: ${String(data.priority).toUpperCase()}.`;

            await appClient.entities.Message.create({
                conversation_id: `maint_${created.id}`,
                sender_id: data.tenant_id,
                receiver_id: data.landlord_id,
                content: msgContent
            }).catch(() => {});

            return created;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            setDialogOpen(false);
            setForm({ lease_id: '', title: '', description: '', category: 'other', priority: 'medium', images: [] });
            toast.success('Maintenance request submitted successfully!');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to submit maintenance request');
        }
    });

    // Mutation: Convert / Dispatch Maintenance Request to Contractor Job Board (Landlord)
    const dispatchJobMutation = useMutation({
        mutationFn: async ({ request, budget, urgency, category, notes }) => {
            // 1. Create a public job in jobs table
            const newJob = await appClient.entities.Job.create({
                maintenance_request_id: (request.id && isValidUuid(request.id)) ? request.id : null,
                posted_by_id: userEmail || userId,
                title: request.title,
                description: notes ? `${request.description}\n\nLandlord Notes: ${notes}` : request.description,
                category: category || request.category || 'general',
                budget_max: Number(budget || 2000),
                location: request.property_title || 'Rental Property',
                urgency: urgency || (request.priority === 'emergency' ? 'emergency' : request.priority === 'high' ? 'urgent' : 'normal'),
                status: 'open',
                claim_status: 'unclaimed'
            });

            // 2. Link job_id and update status on maintenance_requests
            await appClient.entities.MaintenanceRequest.update(request.id, {
                status: 'job_dispatched',
                job_id: newJob.id,
                estimated_cost: Number(budget || 2000)
            });

            // 3. Notify tenant
            if (request.tenant_id) {
                const notice = `🛠️ Maintenance Dispatched! Landlord has published a work order for "${request.title}" to accredited contractors on RentFlex.`;
                await appClient.entities.Message.create({
                    conversation_id: `maint_${request.id}`,
                    sender_id: userEmail || userId || 'landlord',
                    receiver_id: request.tenant_id,
                    content: notice
                }).catch(() => {});
            }

            return newJob;
        },
        onSuccess: (job) => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            queryClient.invalidateQueries({ queryKey: ['available-jobs'] });
            setDispatchDialogOpen(false);
            setSelectedRequestToDispatch(null);
            toast.success('🎉 Request dispatched to Contractors Jobs Board! Contractors can now claim or bid.');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to dispatch job');
        }
    });

    // Mutation: Contractor claims / takes request directly
    const claimRequestMutation = useMutation({
        mutationFn: async (request) => {
            const contractorDisplayName = contractorProfile?.company_name || contractorProfile?.business_name || user?.full_name || 'Contractor';
            
            const patch = {
                contractor_id: userEmail || userId,
                contractor_name: contractorDisplayName,
                status: 'in_progress'
            };

            const updated = await appClient.entities.MaintenanceRequest.update(request.id, patch);

            // Also update linked job if present
            if (request.job_id) {
                await appClient.entities.Job.update(request.job_id, {
                    contractor_id: userEmail || userId,
                    contractor_name: contractorDisplayName,
                    claim_status: 'claimed',
                    status: 'assigned'
                }).catch(() => {});
            }

            // Notify landlord & tenant
            const msg = `🛠️ Contractor ${contractorDisplayName} has taken on maintenance request "${request.title}" and is starting work!`;
            if (request.landlord_id) {
                await appClient.entities.Message.create({
                    conversation_id: `maint_${request.id}`,
                    sender_id: userEmail || userId,
                    receiver_id: request.landlord_id,
                    content: msg
                }).catch(() => {});
            }
            if (request.tenant_id) {
                await appClient.entities.Message.create({
                    conversation_id: `maint_${request.id}`,
                    sender_id: userEmail || userId,
                    receiver_id: request.tenant_id,
                    content: msg
                }).catch(() => {});
            }

            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            queryClient.invalidateQueries({ queryKey: ['available-jobs'] });
            toast.success('You have successfully claimed this request! Work is marked In Progress.');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to claim request');
        }
    });

    // Mutation: Contractor updates request (work progress / notes)
    const updateContractorMutation = useMutation({
        mutationFn: async ({ requestId, data, notes }) => {
            const patch = {
                status: data.status,
                ...(notes ? { contractor_notes: notes } : {})
            };

            const updated = await appClient.entities.MaintenanceRequest.update(requestId, patch);
            if (updated.job_id) {
                await appClient.entities.Job.update(updated.job_id, patch).catch(() => {});
            }

            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            setContractorUpdateOpen(false);
            setSelectedRequestToUpdate(null);
            toast.success('Maintenance progress updated successfully!');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to update request');
        }
    });

    // Paystack Payout for Landlord upon 3-Party Completion
    const handlePaystackContractorPayout = (req) => {
        const amount = Number(req.estimated_cost || 1500);
        executePaystackPayment({
            email: userEmail,
            amount: amount,
            flowType: 'landlord_to_contractor',
            payerId: userEmail || userId,
            payeeId: req.contractor_id,
            paymentType: 'maintenance',
            description: `Maintenance Job Payout: ${req.title} (${req.property_title || 'Rental Unit'})`,
            onSuccess: ({ paystack }) => {
                queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
                queryClient.invalidateQueries({ queryKey: ['payments'] });
                queryClient.invalidateQueries({ queryKey: ['contractor'] });
                toast.success(`🎉 R${amount.toLocaleString()} contractor payout settled! Contractor JobScore™ updated.`);
            },
            onClose: () => toast.info('Payment checkout closed.'),
            onError: (err) => toast.error(err.message || 'Payout failed')
        });
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const res = await appClient.integrations.Core.UploadFile({ file });
            if (res?.file_url) {
                setForm(prev => ({ ...prev, images: [...prev.images, res.file_url] }));
                toast.success('Photo uploaded');
            }
        } catch (err) {
            toast.error('Failed to upload photo');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim()) {
            toast.error('Please enter a title and description');
            return;
        }

        const selectedLease = leases.find(l => String(l.id) === String(form.lease_id)) || leases[0];
        const landlordId = selectedLease?.landlord_id || 'landlord@rentflex.co.za';

        createMutation.mutate({
            lease_id: (selectedLease?.id && isValidUuid(selectedLease.id)) ? selectedLease.id : null,
            tenant_id: userEmail || userId || 'tenant',
            landlord_id: landlordId,
            property_id: (selectedLease?.property_id && isValidUuid(selectedLease.property_id)) ? selectedLease.property_id : null,
            property_title: selectedLease?.property_title || 'Rental Property',
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            priority: form.priority,
            images: form.images,
            status: 'open'
        });
    };

    const filteredRequests = requests.filter(req => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'active') return ['open', 'submitted', 'job_dispatched', 'in_progress', 'scheduled', 'assigned', 'work_completed'].includes(req.status);
        if (filterStatus === 'completed') return ['resolved', 'completed'].includes(req.status);
        if (filterStatus === 'pending_confirmation') {
            const all3 = req.tenant_completed && req.landlord_completed && req.contractor_completed;
            return !all3 && ['in_progress', 'work_completed', 'assigned'].includes(req.status);
        }
        return req.status === filterStatus;
    });

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Maintenance & Repairs Hub</h1>
                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                            3-Party Signoff Active
                        </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        {isLandlord
                            ? 'Review tenant repair issues, dispatch jobs to accredited contractors, and inspect completions.'
                            : isContractor
                                ? 'Browse landlord maintenance requests, claim jobs, and log repair signoffs.'
                                : 'Log maintenance issues with your landlord and verify repairs once complete.'}
                    </p>
                </div>

                {/* Tenant Submit Button */}
                {(isTenant || isSysAdmin) && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-zinc-950 hover:bg-zinc-900 text-white font-semibold shadow-sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Submit Maintenance Request
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md rounded-none border border-zinc-200/90 shadow-3d-modal bg-white p-6">
                            <DialogHeader className="border-b-2 border-zinc-950 pb-3">
                                <DialogTitle className="text-base font-black uppercase tracking-wider text-zinc-950">New Maintenance Request</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                                {leases.length > 0 && (
                                    <div>
                                        <Label className="text-xs font-semibold text-zinc-700 block mb-1">Leased Property / Unit</Label>
                                        <Select 
                                            value={form.lease_id || String(leases[0]?.id || '')} 
                                            onValueChange={(val) => setForm(prev => ({ ...prev, lease_id: val }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select leased property" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {leases.map(lease => (
                                                    <SelectItem key={lease.id} value={String(lease.id)}>
                                                        {lease.property_title || 'Rental Unit'} {lease.room_number ? `(Room ${lease.room_number})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div>
                                    <Label className="text-xs font-semibold text-zinc-700 block mb-1">Issue Title *</Label>
                                    <Input
                                        placeholder="e.g. Leaking kitchen tap"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs font-semibold text-zinc-700 block mb-1">Category</Label>
                                        <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="plumbing">Plumbing</SelectItem>
                                                <SelectItem value="electrical">Electrical</SelectItem>
                                                <SelectItem value="hvac">HVAC / Heating</SelectItem>
                                                <SelectItem value="appliance">Appliance</SelectItem>
                                                <SelectItem value="structural">Structural</SelectItem>
                                                <SelectItem value="pest">Pest Control</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className="text-xs font-semibold text-zinc-700 block mb-1">Urgency / Priority</Label>
                                        <Select value={form.priority} onValueChange={(val) => setForm({ ...form, priority: val })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low Priority</SelectItem>
                                                <SelectItem value="medium">Medium Priority</SelectItem>
                                                <SelectItem value="high">High Priority</SelectItem>
                                                <SelectItem value="emergency">🚨 Emergency</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold text-zinc-700 block mb-1">Description *</Label>
                                    <Textarea
                                        placeholder="Describe the issue, location in house, and when it started..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        rows={3}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold text-zinc-700 block mb-1">Attach Photos</Label>
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-300 hover:border-zinc-900 text-xs font-semibold text-zinc-900 sharp-card transition-all">
                                            <Upload className="w-3.5 h-3.5" />
                                            {uploadingImage ? 'Uploading...' : 'Choose File'}
                                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                        </label>
                                        <span className="text-xs text-zinc-500">{form.images.length} photo(s) attached</span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="w-full bg-zinc-950 hover:bg-zinc-900 text-white font-semibold mt-4"
                                >
                                    {createMutation.isPending ? 'Submitting...' : 'Submit Maintenance Request'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-2 sm:inline-flex sm:items-center gap-2 w-full sm:w-auto">
                {[
                    { id: 'all', label: 'All Requests' },
                    { id: 'active', label: 'Active Repairs' },
                    { id: 'pending_confirmation', label: '3-Party Signoff Pending' },
                    { id: 'completed', label: 'Resolved & Closed' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        data-active={filterStatus === tab.id}
                        className="filter-pill-btn w-full sm:w-auto justify-center text-center py-2 px-3.5"
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Requests Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-56 rounded-none border border-zinc-200/90" />
                    ))}
                </div>
            ) : filteredRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRequests.map(req => {
                        const Icon = categoryIcons[req.category] || Wrench;
                        const prio = priorityConfig[req.priority] || priorityConfig.medium;
                        const status = statusConfig[req.status] || statusConfig.open;

                        const isAll3Complete = Boolean(req.tenant_completed && req.contractor_completed && req.landlord_completed);
                        const isClaimedByMe = req.contractor_id === (userEmail || userId);
                        const isDispatched = req.status === 'job_dispatched';

                        return (
                            <Card key={req.id} className="p-5 sharp-card bg-white border border-zinc-200/90 shadow-card hover:shadow-3d-lg transition-all flex flex-col justify-between space-y-4 rounded-none">
                                <div className="space-y-3">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-none bg-zinc-100 text-zinc-950 border border-zinc-200/90 shadow-xs">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="font-black uppercase tracking-wider text-zinc-950 text-sm">{req.title}</h3>
                                                <p className="text-[11px] font-bold text-zinc-600">{req.property_title || 'Rental Property'}</p>
                                            </div>
                                        </div>
                                        <Badge className={`${prio.color} text-[10px] px-2 py-0.5 shrink-0 border border-zinc-200/90 shadow-xs`}>
                                            {prio.label}
                                        </Badge>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-zinc-700 line-clamp-2 leading-relaxed font-medium">
                                        {req.description}
                                    </p>

                                    {/* Photos if any */}
                                    {Array.isArray(req.images) && req.images.length > 0 && (
                                        <div className="flex gap-2">
                                            {req.images.map((img, idx) => (
                                                <img key={idx} src={img} alt="Attachment" className="w-12 h-12 object-cover rounded-none border border-zinc-200/90 shadow-xs" />
                                            ))}
                                        </div>
                                    )}

                                    {/* Contractor Assigned Info */}
                                    {req.contractor_id && (
                                        <div className="bg-zinc-50 rounded-none p-3 border border-zinc-200/90 shadow-xs flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <Wrench className="w-3.5 h-3.5 text-zinc-950" />
                                                <span className="text-zinc-800 font-bold">
                                                    Contractor: <strong className="text-zinc-950">{formatUserDisplayName(req.contractor_name || req.contractor_id, 'Contractor')}</strong>
                                                </span>
                                            </div>
                                            {req.estimated_cost && (
                                                <span className="font-black text-zinc-950">
                                                    R{Number(req.estimated_cost).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Embedded 3-Party Completion Verification */}
                                    <ThreePartyCompletionCard
                                        item={req}
                                        itemType="maintenance"
                                        currentUser={user}
                                        userRole={role}
                                        onUpdated={() => queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })}
                                    />
                                </div>

                                {/* Actions Footer */}
                                <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Badge className={`${status.color} text-[10px]`}>
                                            {status.label}
                                        </Badge>
                                        <span className="text-[10px] text-zinc-400">
                                            {req.created_at ? formatDate(req.created_at) : 'Recent'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Landlord Action 1: Dispatch to Contractors as Job */}
                                        {(isLandlord || isSysAdmin) && (req.status === 'open' || req.status === 'submitted') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedRequestToDispatch(req);
                                                    setDispatchForm({
                                                        budget_max: req.estimated_cost ? String(req.estimated_cost) : '1500',
                                                        urgency: req.priority === 'emergency' ? 'emergency' : req.priority === 'high' ? 'urgent' : 'normal',
                                                        category: req.category || 'plumbing',
                                                        notes: ''
                                                    });
                                                    setDispatchDialogOpen(true);
                                                }}
                                                className="h-8 text-xs border-zinc-300 hover:border-zinc-900 font-semibold flex items-center gap-1.5"
                                            >
                                                <Briefcase className="w-3.5 h-3.5 text-zinc-700" />
                                                Dispatch as Job for Contractors
                                            </Button>
                                        )}

                                        {/* Landlord Action 2: If 3/3 confirmed and contractor assigned, pay via Paystack */}
                                        {(isLandlord || isSysAdmin) && isAll3Complete && req.contractor_id && (
                                            <Button
                                                size="sm"
                                                onClick={() => handlePaystackContractorPayout(req)}
                                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
                                            >
                                                <CreditCard className="w-3.5 h-3.5" />
                                                Release Contractor Payout
                                            </Button>
                                        )}

                                        {/* Contractor Action 1: Claim / Take Request */}
                                        {isContractor && (req.status === 'open' || req.status === 'job_dispatched') && !req.contractor_id && (
                                            <Button
                                                size="sm"
                                                onClick={() => claimRequestMutation.mutate(req)}
                                                disabled={claimRequestMutation.isPending}
                                                className="h-8 text-xs bg-zinc-950 hover:bg-zinc-900 text-white font-bold flex items-center gap-1.5"
                                            >
                                                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                                                Take / Claim Request
                                            </Button>
                                        )}

                                        {/* Contractor Action 2: Update Progress / Notes */}
                                        {isContractor && isClaimedByMe && req.status !== 'resolved' && req.status !== 'completed' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedRequestToUpdate(req);
                                                    setContractorForm({
                                                        status: req.status || 'in_progress',
                                                        notes: req.contractor_notes || ''
                                                    });
                                                    setContractorUpdateOpen(true);
                                                }}
                                                className="h-8 text-xs border-zinc-300 font-semibold flex items-center gap-1.5"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 text-zinc-700" />
                                                Update Progress
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="p-12 text-center sharp-card bg-white border border-zinc-200/90 shadow-card rounded-none">
                    <Wrench className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                    <h3 className="text-base font-black uppercase tracking-wider text-zinc-950 mb-1">No maintenance requests found</h3>
                    <p className="text-xs text-zinc-600 font-medium">
                        {isTenant
                            ? 'All your rental maintenance items are currently resolved.'
                            : 'No pending maintenance tasks found for this filter.'}
                    </p>
                </Card>
            )}

            {/* Landlord Dispatch Job Dialog */}
            <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-none border border-zinc-200/90 shadow-3d-modal bg-white p-6">
                    <DialogHeader className="border-b-2 border-zinc-950 pb-3">
                        <DialogTitle className="text-base font-black uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-zinc-950" />
                            Dispatch Request to Contractors Board
                        </DialogTitle>
                    </DialogHeader>

                    {selectedRequestToDispatch && (
                        <div className="space-y-4 pt-3">
                            <div className="bg-zinc-50 p-3 rounded-none border border-zinc-200/90 shadow-xs text-xs">
                                <p className="font-black uppercase tracking-wider text-zinc-950 mb-1">{selectedRequestToDispatch.title}</p>
                                <p className="text-zinc-700 line-clamp-2 font-medium">{selectedRequestToDispatch.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-black uppercase tracking-wider text-zinc-950 block mb-1">Budget Max (ZAR)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-xs font-black text-zinc-500">R</span>
                                        <Input
                                            type="number"
                                            className="pl-7 h-9 text-xs font-bold"
                                            value={dispatchForm.budget_max}
                                            onChange={(e) => setDispatchForm({ ...dispatchForm, budget_max: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs font-black uppercase tracking-wider text-zinc-950 block mb-1">Urgency</Label>
                                    <Select 
                                        value={dispatchForm.urgency} 
                                        onValueChange={(val) => setDispatchForm({ ...dispatchForm, urgency: val })}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                            <SelectItem value="emergency">Emergency</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs font-black uppercase tracking-wider text-zinc-950 block mb-1">Trade Category</Label>
                                <Select 
                                    value={dispatchForm.category} 
                                    onValueChange={(val) => setDispatchForm({ ...dispatchForm, category: val })}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="plumbing">Plumbing</SelectItem>
                                        <SelectItem value="electrical">Electrical</SelectItem>
                                        <SelectItem value="hvac">HVAC / Aircon</SelectItem>
                                        <SelectItem value="appliance">Appliance Repair</SelectItem>
                                        <SelectItem value="structural">Structural / Handyman</SelectItem>
                                        <SelectItem value="painting">Painting</SelectItem>
                                        <SelectItem value="cleaning">Deep Cleaning</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs font-black uppercase tracking-wider text-zinc-950 block mb-1">Landlord Instructions for Contractors</Label>
                                <Textarea
                                    rows={2}
                                    placeholder="e.g. Please bring pipe replacement fittings. Access code available."
                                    value={dispatchForm.notes}
                                    onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                                    className="text-xs"
                                />
                            </div>

                            <DialogFooter className="mt-4 pt-3 border-t-2 border-zinc-950 flex gap-2 sm:justify-end">
                                <Button variant="outline" size="sm" onClick={() => setDispatchDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-zinc-950 hover:bg-zinc-900 text-white font-black uppercase tracking-wider"
                                    disabled={dispatchJobMutation.isPending}
                                    onClick={() => dispatchJobMutation.mutate({
                                        request: selectedRequestToDispatch,
                                        budget: dispatchForm.budget_max,
                                        urgency: dispatchForm.urgency,
                                        category: dispatchForm.category,
                                        notes: dispatchForm.notes
                                    })}
                                >
                                    {dispatchJobMutation.isPending ? 'Publishing...' : 'Publish to Contractors'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Contractor Update Progress Dialog */}
            <Dialog open={contractorUpdateOpen} onOpenChange={setContractorUpdateOpen}>
                <DialogContent className="sm:max-w-md rounded-none border border-zinc-200/90 shadow-3d-modal bg-white p-6">
                    <DialogHeader className="border-b-2 border-zinc-950 pb-3">
                        <DialogTitle className="text-base font-black uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-zinc-950" />
                            Update Maintenance Progress
                        </DialogTitle>
                    </DialogHeader>

                    {selectedRequestToUpdate && (
                        <div className="space-y-4 pt-3">
                            <div>
                                <Label className="text-xs font-black uppercase tracking-wider text-zinc-950 block mb-1">Progress Status</Label>
                                <Select 
                                    value={contractorForm.status} 
                                    onValueChange={(val) => setContractorForm({ ...contractorForm, status: val })}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in_progress">In Progress (Work Underway)</SelectItem>
                                        <SelectItem value="scheduled">Scheduled for Site Visit</SelectItem>
                                        <SelectItem value="work_completed">Work Completed (Ready for Sign-off)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs font-black uppercase tracking-wider text-zinc-950 block mb-1">Contractor Progress Note</Label>
                                <Textarea
                                    rows={3}
                                    placeholder="Describe the repair progress, parts installed, or completion notes..."
                                    value={contractorForm.notes}
                                    onChange={(e) => setContractorForm({ ...contractorForm, notes: e.target.value })}
                                    className="text-xs"
                                />
                            </div>

                            <DialogFooter className="mt-4 pt-3 border-t-2 border-zinc-950 flex gap-2 sm:justify-end">
                                <Button variant="outline" size="sm" onClick={() => setContractorUpdateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-zinc-950 hover:bg-zinc-900 text-white font-black uppercase tracking-wider"
                                    disabled={updateContractorMutation.isPending}
                                    onClick={() => updateContractorMutation.mutate({
                                        requestId: selectedRequestToUpdate.id,
                                        data: { status: contractorForm.status },
                                        notes: contractorForm.notes
                                    })}
                                >
                                    {updateContractorMutation.isPending ? 'Saving...' : 'Save Progress'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
