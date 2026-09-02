import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDate } from '@/utils';
import {
    Wrench,
    Plus,
    AlertTriangle,
    Clock,
    CheckCircle2,
    Calendar,
    Upload,
    X,
    Droplets,
    Zap,
    Wind,
    Refrigerator,
    Home,
    Bug
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
    low: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Low' },
    medium: { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Medium' },
    high: { color: 'bg-orange-50 text-orange-700 border-orange-200', label: 'High' },
    emergency: { color: 'bg-red-50 text-red-700 border-red-200', label: 'Emergency' },
};

const statusConfig = {
    submitted: { color: 'bg-zinc-100 text-zinc-800 border-zinc-200', icon: Clock },
    in_progress: { color: 'bg-amber-50 text-amber-800 border-amber-200', icon: Wrench },
    scheduled: { color: 'bg-zinc-100 text-zinc-900 border-zinc-300', icon: Calendar },
    completed: { color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
    cancelled: { color: 'bg-zinc-100 text-zinc-600 border-zinc-200', icon: X },
};

export default function Maintenance() {
    const [user, setUser] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
    });

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const { data: requests, isLoading } = useQuery({
        queryKey: ['maintenance', user?.email],
        queryFn: () => appClient.entities.MaintenanceRequest.filter({ tenant_id: user?.email }),
        enabled: !!user?.email,
    });

    const { data: leases } = useQuery({
        queryKey: ['activeLeases', user?.email],
        queryFn: () => appClient.entities.Lease.filter({ tenant_id: user?.email, status: 'active' }),
        enabled: !!user?.email,
    });

    const createMutation = useMutation({
        mutationFn: (data) => appClient.entities.MaintenanceRequest.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            setDialogOpen(false);
            setForm({ title: '', description: '', category: 'other', priority: 'medium' });
            toast.success('Maintenance request submitted!');
        },
    });

    const handleSubmit = () => {
        if (!form.title || !form.description) {
            toast.error('Please fill in all required fields');
            return;
        }

        const activeLease = leases?.[0];

        createMutation.mutate({
            ...form,
            tenant_id: user?.email,
            landlord_id: activeLease?.landlord_id,
            property_id: activeLease?.property_id,
            property_title: activeLease?.property_title || 'My Rental',
            status: 'submitted'
        });
    };

    const filteredRequests = requests?.filter(req => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'open') return ['submitted', 'in_progress', 'scheduled'].includes(req.status);
        return req.status === filterStatus;
    }) || [];

    const openCount = requests?.filter(r => ['submitted', 'in_progress', 'scheduled'].includes(r.status)).length || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Maintenance</h1>
                    <p className="text-slate-500 mt-1">Submit and track maintenance requests</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-zinc-900 hover:bg-zinc-800 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            New Request
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Submit Maintenance Request</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div>
                                <Label>Issue Title</Label>
                                <Input
                                    placeholder="e.g., Leaking kitchen sink"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Category</Label>
                                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="plumbing">Plumbing</SelectItem>
                                            <SelectItem value="electrical">Electrical</SelectItem>
                                            <SelectItem value="appliance">Appliance</SelectItem>
                                            <SelectItem value="hvac">HVAC</SelectItem>
                                            <SelectItem value="structural">Structural</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Priority</Label>
                                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="emergency">Emergency</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label>Description</Label>
                                <Textarea
                                    placeholder="Please describe the issue in detail..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={4}
                                />
                            </div>

                            <Button
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                                onClick={handleSubmit}
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="sharp-card bg-white p-4 border border-transparent hover:border-zinc-900 transition-all duration-200"
                >
                    <p className="text-xs text-zinc-500">Open Requests</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-1">{openCount}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="sharp-card bg-white p-4 border border-transparent hover:border-zinc-900 transition-all duration-200"
                >
                    <p className="text-xs text-zinc-500">In Progress</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                        {requests?.filter(r => r.status === 'in_progress').length || 0}
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="sharp-card bg-white p-4 border border-transparent hover:border-zinc-900 transition-all duration-200"
                >
                    <p className="text-xs text-zinc-500">Scheduled</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-1">
                        {requests?.filter(r => r.status === 'scheduled').length || 0}
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="sharp-card bg-white p-4 border border-transparent hover:border-zinc-900 transition-all duration-200"
                >
                    <p className="text-xs text-zinc-500">Completed</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {requests?.filter(r => r.status === 'completed').length || 0}
                    </p>
                </motion.div>
            </div>

            {/* Filter */}
            <div className="segmented-track flex-wrap">
                {['all', 'open', 'submitted', 'in_progress', 'scheduled', 'completed'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        data-active={filterStatus === status}
                        className="filter-pill-btn capitalize"
                    >
                        {status === 'all' ? 'All' : status === 'open' ? 'Open' : status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Requests List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                </div>
            ) : filteredRequests.length > 0 ? (
                <div className="space-y-4">
                    {filteredRequests.map((request, idx) => {
                        const CategoryIcon = categoryIcons[request.category] || Wrench;
                        const status = statusConfig[request.status] || statusConfig.submitted;
                        const StatusIcon = status.icon;
                        const priority = priorityConfig[request.priority] || priorityConfig.medium;

                        return (
                            <motion.div
                                key={request.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05, duration: 0.3 }}
                                className="sharp-card bg-white p-5 border border-transparent hover:border-zinc-900 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${request.priority === 'emergency' ? 'bg-red-100' : 'bg-slate-100'
                                        }`}>
                                        <CategoryIcon className={`w-6 h-6 ${request.priority === 'emergency' ? 'text-red-600' : 'text-slate-600'
                                            }`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <h3 className="font-semibold text-slate-900">{request.title}</h3>
                                            <Badge className={`${status.color} border shrink-0`}>
                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                {request.status?.replace('_', ' ')}
                                            </Badge>
                                        </div>

                                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{request.description}</p>

                                        <div className="flex flex-wrap items-center gap-3 text-sm">
                                            <Badge variant="outline" className="capitalize">
                                                {request.category}
                                            </Badge>
                                            <Badge className={`${priority.color} border`}>
                                                {priority.label} Priority
                                            </Badge>
                                            <span className="text-slate-400">
                                                {formatDate(request.created_date)}
                                            </span>
                                            {request.scheduled_date && (
                                                <span className="flex items-center gap-1 text-zinc-900 font-medium">
                                                    <Calendar className="w-3 h-3" />
                                                    Scheduled: {formatDate(request.scheduled_date, 'MMM d')}
                                                </span>
                                            )}
                                        </div>

                                        {request.notes && (
                                            <div className="mt-3 p-3 bg-zinc-50 border border-zinc-100 text-xs text-zinc-600">
                                                <span className="font-medium">Note:</span> {request.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 sharp-card bg-white border border-transparent hover:border-zinc-900 transition-all duration-200">
                    <Wrench className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <h3 className="font-bold text-sm text-zinc-900 mb-1">No maintenance requests</h3>
                    <p className="text-xs text-zinc-500 mb-4">Submit a request when you need help with your rental</p>
                    <Button onClick={() => setDialogOpen(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Submit Request
                    </Button>
                </div>
            )}
        </div>
    );
}
