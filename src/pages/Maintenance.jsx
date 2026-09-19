import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDate } from '@/utils';
import {
    Wrench,
    Plus,
    Clock,
    CheckCircle2,
    Calendar,
    X,
    Droplets,
    Zap,
    Wind,
    Refrigerator,
    Home,
    Bug,
    Upload,
    Briefcase,
    User,
    Shield,
    ChevronRight
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
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
    emergency: { color: 'bg-rose-50 text-rose-800 border-rose-200 font-bold', label: 'Emergency' },
};

const statusConfig = {
    open: { color: 'bg-zinc-100 text-zinc-800 border-zinc-200', label: 'Open' },
    submitted: { color: 'bg-zinc-100 text-zinc-800 border-zinc-200', label: 'Submitted' },
    in_progress: { color: 'bg-amber-50 text-amber-900 border-amber-300 font-bold', label: 'In Progress' },
    scheduled: { color: 'bg-blue-50 text-blue-800 border-blue-200', label: 'Scheduled' },
    assigned: { color: 'bg-purple-50 text-purple-800 border-purple-200', label: 'Assigned' },
    resolved: { color: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold', label: 'Resolved' },
    completed: { color: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold', label: 'Completed' },
    cancelled: { color: 'bg-zinc-100 text-zinc-500 border-zinc-200', label: 'Cancelled' },
};

export default function Maintenance() {
    const navigate = useNavigate();
    const { user, role, isLandlord, isContractor, isSysAdmin, isTenant } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [uploadingImage, setUploadingImage] = useState(false);
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
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
                const list1 = await appClient.entities.MaintenanceRequest.filter({ landlord_id: userEmail });
                const list2 = userId && userId !== userEmail ? await appClient.entities.MaintenanceRequest.filter({ landlord_id: userId }) : [];
                const combined = [...list1, ...list2];
                return Array.from(new Map(combined.map(item => [item.id, item])).values());
            }

            if (isContractor) {
                const list1 = await appClient.entities.MaintenanceRequest.filter({ contractor_id: userEmail });
                const list2 = userId && userId !== userEmail ? await appClient.entities.MaintenanceRequest.filter({ contractor_id: userId }) : [];
                const openList = await appClient.entities.MaintenanceRequest.filter({ status: 'open' });
                const combined = [...list1, ...list2, ...openList];
                return Array.from(new Map(combined.map(item => [item.id, item])).values());
            }

            // Tenant
            const list1 = await appClient.entities.MaintenanceRequest.filter({ tenant_id: userEmail });
            const list2 = userId && userId !== userEmail ? await appClient.entities.MaintenanceRequest.filter({ tenant_id: userId }) : [];
            const combined = [...list1, ...list2];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!user,
    });

    // Fetch tenant's active leases to auto-attach property & landlord info
    const { data: leases = [] } = useQuery({
        queryKey: ['my-active-leases', userEmail, userId],
        queryFn: async () => {
            const list1 = await appClient.entities.Lease.filter({ tenant_id: userEmail });
            const list2 = userId && userId !== userEmail ? await appClient.entities.Lease.filter({ tenant_id: userId }) : [];
            const combined = [...list1, ...list2];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!user,
    });

    // Mutation to submit a new maintenance request
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

            if (data.tenant_id && data.landlord_id) {
                await appClient.entities.Message.create({
                    conversation_id: `${data.tenant_id}_${data.landlord_id}`,
                    sender_id: data.tenant_id,
                    receiver_id: data.landlord_id,
                    content: msgContent
                }).catch(() => {});
            }
            return created;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
            setDialogOpen(false);
            setForm({ title: '', description: '', category: 'other', priority: 'medium', images: [] });
            toast.success('Maintenance request submitted successfully!');
        },
        onError: (err) => {
            console.error('Maintenance creation error:', err);
            toast.error(err.message || 'Failed to submit maintenance request');
        }
    });

    // Mutation to update maintenance request status
    const updateMutation = useMutation({
        mutationFn: async ({ id, data, requestInfo }) => {
            const updated = await appClient.entities.MaintenanceRequest.update(id, data);
            const statusLabel = String(data.status).toUpperCase();
            const title = requestInfo?.title || updated.title || 'Maintenance Request';
            const msgContent = data.status === 'resolved' || data.status === 'completed'
                ? `✅ Maintenance Request "${title}" HAS BEEN RESOLVED & Completed!`
                : data.status === 'in_progress'
                    ? `🔧 Maintenance Request "${title}" is now IN PROGRESS.`
                    : data.status === 'scheduled'
                        ? `📅 Maintenance Request "${title}" HAS BEEN SCHEDULED.`
                        : data.status === 'cancelled'
                            ? `❌ Maintenance Request "${title}" WAS CANCELLED.`
                            : `ℹ️ Maintenance Request "${title}" updated to ${statusLabel}.`;

            const targetReceiver = userEmail === updated.landlord_id ? updated.tenant_id : updated.landlord_id;

            await appClient.entities.Message.create({
                conversation_id: `maint_${id}`,
                sender_id: userEmail || userId || 'user',
                receiver_id: targetReceiver || 'user',
                content: msgContent
            }).catch(() => {});

            if (updated.tenant_id && updated.landlord_id) {
                await appClient.entities.Message.create({
                    conversation_id: `${updated.tenant_id}_${updated.landlord_id}`,
                    sender_id: userEmail || userId || 'user',
                    receiver_id: targetReceiver || 'user',
                    content: msgContent
                }).catch(() => {});
            }
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
            toast.success('Maintenance request updated!');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to update maintenance request');
        }
    });

    // Mutation for Landlord to convert a maintenance request into a Contractor Job
    const convertToJobMutation = useMutation({
        mutationFn: async (request) => {
            const newJob = await appClient.entities.Job.create({
                maintenance_request_id: request.id,
                posted_by_id: userEmail || userId,
                title: request.title,
                description: request.description,
                category: request.category || 'general',
                budget_max: Number(request.estimated_cost || 2500),
                location: request.property_title || 'Rental Property',
                urgency: request.priority === 'emergency' ? 'emergency' : request.priority === 'high' ? 'urgent' : 'normal',
                status: 'open'
            });

            await appClient.entities.MaintenanceRequest.update(request.id, {
                status: 'assigned'
            });

            return newJob;
        },
        onSuccess: (job) => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            queryClient.invalidateQueries({ queryKey: ['available-jobs'] });
            toast.success('Converted to Job Listing! Contractors can now bid on this task.');
            navigate(createPageUrl(`JobDetails?id=${job.id}`));
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to convert maintenance request into a job');
        }
    });

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

        const activeLease = leases[0];
        const landlordId = activeLease?.landlord_id || 'landlord@rentflex.co.za';

        createMutation.mutate({
            lease_id: activeLease?.id || null,
            tenant_id: userEmail || userId || 'tenant',
            landlord_id: landlordId,
            property_id: activeLease?.property_id || null,
            property_title: activeLease?.property_title || 'My Rental Property',
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
        if (filterStatus === 'active') return ['open', 'submitted', 'in_progress', 'scheduled', 'assigned'].includes(req.status);
        if (filterStatus === 'completed') return ['resolved', 'completed'].includes(req.status);
        return req.status === filterStatus;
    });

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Maintenance Requests</h1>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        {isLandlord
                            ? 'Manage tenant requests and assign qualified contractors'
                            : isContractor
                                ? 'Accept maintenance tasks and log completed repair work'
                                : 'Log maintenance issues and track repair progress in real-time'}
                    </p>
                </div>

                {/* Tenant Submit Button */}
                {(isTenant || isSysAdmin) && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-zinc-950 hover:bg-zinc-900 text-white font-semibold shadow-sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Submit Request
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-lg font-bold text-zinc-900">New Maintenance Request</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
            <div className="flex border-b border-zinc-200 text-xs font-semibold">
                {['all', 'active', 'completed'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilterStatus(tab)}
                        className={`py-2.5 px-4 capitalize border-b-2 transition-all ${
                            filterStatus === tab
                                ? 'border-zinc-950 text-zinc-950 font-bold'
                                : 'border-transparent text-zinc-500 hover:text-zinc-800'
                        }`}
                    >
                        {tab === 'all' ? 'All Requests' : tab === 'active' ? 'In Progress / Open' : 'Resolved'}
                    </button>
                ))}
            </div>

            {/* Requests Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-44 rounded-xl" />
                    ))}
                </div>
            ) : filteredRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRequests.map(req => {
                        const Icon = categoryIcons[req.category] || Wrench;
                        const prio = priorityConfig[req.priority] || priorityConfig.medium;
                        const status = statusConfig[req.status] || statusConfig.open;

                        return (
                            <Card key={req.id} className="p-5 sharp-card bg-white border border-zinc-200/80 hover:border-zinc-300 transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-zinc-900 text-sm">{req.title}</h3>
                                                <p className="text-[11px] text-zinc-500">{req.property_title || 'Rental Property'}</p>
                                            </div>
                                        </div>
                                        <Badge className={`${prio.color} text-[10px] px-2 py-0.5 shrink-0`}>
                                            {prio.label}
                                        </Badge>
                                    </div>

                                    <p className="text-xs text-zinc-600 my-3 line-clamp-2 leading-relaxed">
                                        {req.description}
                                    </p>

                                    {Array.isArray(req.images) && req.images.length > 0 && (
                                        <div className="flex gap-2 mb-3">
                                            {req.images.map((img, idx) => (
                                                <img key={idx} src={img} alt="Attachment" className="w-12 h-12 object-cover rounded-md border border-zinc-200" />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Badge className={`${status.color} text-[10px]`}>
                                            {status.label}
                                        </Badge>
                                        <span className="text-[10px] text-zinc-400">
                                            {req.created_at ? formatDate(req.created_at) : 'Recent'}
                                        </span>
                                    </div>

                                    {/* Role Interactions */}
                                    <div className="flex items-center gap-1.5">
                                        {/* Contractor Action */}
                                        {isContractor && req.status !== 'resolved' && req.status !== 'completed' && (
                                            req.contractor_id === (userEmail || userId) ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => updateMutation.mutate({ id: req.id, data: { status: 'resolved' } })}
                                                    className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 font-bold"
                                                >
                                                    Mark Resolved
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => updateMutation.mutate({ id: req.id, data: { contractor_id: userEmail || userId, status: 'in_progress' } })}
                                                    className="h-7 text-[11px] bg-zinc-950 hover:bg-zinc-900 text-white px-2.5"
                                                >
                                                    Accept & Start
                                                </Button>
                                            )
                                        )}

                                        {/* Landlord Action: Post as Contractor Job */}
                                        {(isLandlord || isSysAdmin) && req.status !== 'resolved' && req.status !== 'completed' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => convertToJobMutation.mutate(req)}
                                                disabled={convertToJobMutation.isPending}
                                                className="h-7 text-[11px] border-zinc-300 hover:border-zinc-900 font-semibold"
                                            >
                                                <Briefcase className="w-3 h-3 mr-1" />
                                                Post Job for Bidding
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="p-12 text-center sharp-card bg-white border border-zinc-200">
                    <Wrench className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-zinc-900 mb-1">No maintenance requests</h3>
                    <p className="text-xs text-zinc-500">
                        {isTenant
                            ? 'All your rental maintenance items are currently resolved.'
                            : 'No pending maintenance tasks found for your properties.'}
                    </p>
                </Card>
            )}
        </div>
    );
}
