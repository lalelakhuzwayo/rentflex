import React, { useState, useEffect, useMemo } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDate } from '@/utils';
import { formatUserDisplayName } from '@/utils/userFormatting';
import {
    CreditCard,
    CheckCircle2,
    Clock,
    Repeat,
    Landmark,
    BadgePercent,
    Plus,
    Wrench,
    ArrowUpRight,
    ArrowDownLeft,
    ShieldCheck,
    Send,
    Home,
    Sparkles,
    Briefcase,
    Zap,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import PaymentCard from '@/components/payments/PaymentCard';
import { executePaystackPayment } from '@/utils/paymentProcessingEngine';

export default function Payments() {
    const [user, setUser] = useState(null);
    const [processingPaymentId, setProcessingPaymentId] = useState(null);
    const [newPaymentDialogOpen, setNewPaymentDialogOpen] = useState(false);
    const [newPaymentForm, setNewPaymentForm] = useState({
        flowType: 'tenant_to_landlord',
        payeeEmail: '',
        amount: '',
        paymentType: 'rent',
        description: '',
        leaseId: '',
        contractorId: ''
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const isSysAdmin = user?.user_type === 'sysAdmin';
    const isLandlord = user?.user_type === 'landlord';
    const isContractor = user?.user_type === 'contractor';
    const isTenant = user?.user_type === 'tenant' || user?.user_type === 'rentee' || !user?.user_type;

    // Set smart default for custom payment flow based on current user role
    useEffect(() => {
        if (isLandlord) {
            setNewPaymentForm(prev => ({
                ...prev,
                flowType: 'landlord_to_contractor',
                paymentType: 'maintenance'
            }));
        } else if (isContractor) {
            setNewPaymentForm(prev => ({
                ...prev,
                flowType: 'contractor_to_landlord',
                paymentType: 'fee'
            }));
        }
    }, [user?.user_type]);

    // 1. Fetch Recorded Payments / Ledger
    const { data: payments, isLoading } = useQuery({
        queryKey: ['payments', user?.email, isSysAdmin],
        queryFn: async () => {
            if (!user?.email) return [];
            if (isSysAdmin) {
                return await appClient.entities.Payment.list();
            }
            const asTenant = await appClient.entities.Payment.filter({ tenant_id: user.email }).catch(() => []);
            const asLandlord = await appClient.entities.Payment.filter({ landlord_id: user.email }).catch(() => []);
            const combined = [...asTenant, ...asLandlord];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!user?.email,
    });

    // 2. Fetch Active Rentings (Leases) for both Tenant and Landlord
    const { data: leases = [], isLoading: isLoadingLeases } = useQuery({
        queryKey: ['payments-active-leases', user?.email, user?.id, isLandlord, isSysAdmin],
        queryFn: async () => {
            if (!user?.email) return [];
            if (isSysAdmin) return await appClient.entities.Lease.list().catch(() => []);
            if (isLandlord) {
                const list1 = await appClient.entities.Lease.filter({ landlord_id: user.email }).catch(() => []);
                const list2 = user.id && user.id !== user.email ? await appClient.entities.Lease.filter({ landlord_id: user.id }).catch(() => []) : [];
                return Array.from(new Map([...list1, ...list2].map(l => [l.id, l])).values());
            }
            const list1 = await appClient.entities.Lease.filter({ tenant_id: user.email }).catch(() => []);
            const list2 = user.id && user.id !== user.email ? await appClient.entities.Lease.filter({ tenant_id: user.id }).catch(() => []) : [];
            return Array.from(new Map([...list1, ...list2].map(l => [l.id, l])).values());
        },
        enabled: !!user?.email,
    });

    // 3. Fetch Maintenance Requests (Jobs) for quick payouts & settlements
    const { data: maintenanceRequests = [], isLoading: isLoadingJobs } = useQuery({
        queryKey: ['payments-maintenance-jobs', user?.email, user?.id, isLandlord, isContractor, isSysAdmin],
        queryFn: async () => {
            if (!user?.email) return [];
            if (isSysAdmin) return await appClient.entities.MaintenanceRequest.list().catch(() => []);
            if (isLandlord) {
                const list1 = await appClient.entities.MaintenanceRequest.filter({ landlord_id: user.email }).catch(() => []);
                const list2 = user.id && user.id !== user.email ? await appClient.entities.MaintenanceRequest.filter({ landlord_id: user.id }).catch(() => []) : [];
                return Array.from(new Map([...list1, ...list2].map(r => [r.id, r])).values());
            }
            if (isContractor) {
                const list1 = await appClient.entities.MaintenanceRequest.filter({ contractor_id: user.email }).catch(() => []);
                const list2 = user.id && user.id !== user.email ? await appClient.entities.MaintenanceRequest.filter({ contractor_id: user.id }).catch(() => []) : [];
                return Array.from(new Map([...list1, ...list2].map(r => [r.id, r])).values());
            }
            // For tenant
            const list1 = await appClient.entities.MaintenanceRequest.filter({ tenant_id: user.email }).catch(() => []);
            const list2 = user.id && user.id !== user.email ? await appClient.entities.MaintenanceRequest.filter({ tenant_id: user.id }).catch(() => []) : [];
            return Array.from(new Map([...list1, ...list2].map(r => [r.id, r])).values());
        },
        enabled: !!user?.email,
    });

    // 4. Fetch Public Contractor Jobs
    const { data: boardJobs = [] } = useQuery({
        queryKey: ['payments-board-jobs', user?.email, user?.id, isLandlord, isContractor, isSysAdmin],
        queryFn: async () => {
            if (!user?.email) return [];
            if (isLandlord || isSysAdmin) {
                const list = await appClient.entities.Job.list().catch(() => []);
                return isSysAdmin ? list : list.filter(j => j.posted_by_id === user.email || j.posted_by_id === user.id);
            }
            if (isContractor) {
                const list = await appClient.entities.Job.list().catch(() => []);
                return list.filter(j => j.contractor_id === user.email || j.contractor_id === user.id);
            }
            return [];
        },
        enabled: !!user?.email && (isLandlord || isContractor || isSysAdmin),
    });

    const { data: contractors = [] } = useQuery({
        queryKey: ['contractors-list'],
        queryFn: () => appClient.entities.Contractor.list().catch(() => []),
        enabled: isLandlord || isSysAdmin,
    });

    // Active Rentings (Leases)
    const activeRentings = useMemo(() => {
        return (leases || []).filter(l => l.status === 'active' || !l.status);
    }, [leases]);

    // Active & Completed Jobs requiring settlement
    const activeJobs = useMemo(() => {
        const combined = [...maintenanceRequests];
        const existingReqIds = new Set(maintenanceRequests.map(r => r.id));
        boardJobs.forEach(j => {
            if (!j.maintenance_request_id || !existingReqIds.has(j.maintenance_request_id)) {
                combined.push({
                    id: j.id,
                    title: j.title,
                    property_title: j.location || 'Rental Property',
                    category: j.category || 'maintenance',
                    status: j.status || 'open',
                    estimated_cost: j.budget_max || j.amount || 1500,
                    contractor_id: j.contractor_id,
                    landlord_id: j.posted_by_id,
                    isBoardJob: true
                });
            }
        });
        return combined;
    }, [maintenanceRequests, boardJobs]);

    // Quick Payment Handler: 1-Click Pay Rent
    const handleQuickPayRent = (lease) => {
        const rentAmount = Number(lease.monthly_rent || 0);
        if (!rentAmount || rentAmount <= 0) {
            toast.error('No valid monthly rent specified on this lease.');
            return;
        }

        setProcessingPaymentId(`rent_${lease.id}`);

        executePaystackPayment({
            email: user?.email,
            amount: rentAmount,
            flowType: 'tenant_to_landlord',
            leaseId: lease.id,
            payerId: user?.email || user?.id,
            payeeId: lease.landlord_id,
            paymentType: 'rent',
            description: `Monthly Rent: ${lease.property_title || 'Rental Unit'} (Ref: ${String(lease.id).substring(0, 8)})`,
            onSuccess: ({ paystack }) => {
                setProcessingPaymentId(null);
                queryClient.invalidateQueries({ queryKey: ['payments'] });
                queryClient.invalidateQueries({ queryKey: ['rentScore'] });
                queryClient.invalidateQueries({ queryKey: ['payments-active-leases'] });
                toast.success(`🎉 Rent of R${rentAmount.toLocaleString()} paid! RentScore points accrued (+15 pts). Ref: ${paystack.reference}`);
            },
            onClose: () => {
                setProcessingPaymentId(null);
                toast.info('Payment checkout closed.');
            },
            onError: (err) => {
                setProcessingPaymentId(null);
                toast.error(err.message || 'Payment processing failed');
            }
        });
    };

    // Quick Payment Handler: 1-Click Pay Contractor Job
    const handleQuickPayJob = (job) => {
        const amount = Number(job.estimated_cost || job.budget_max || job.amount || 1500);
        const contractorId = job.contractor_id;

        if (!contractorId) {
            toast.error('No contractor is assigned to this job yet.');
            return;
        }

        setProcessingPaymentId(`job_${job.id}`);

        executePaystackPayment({
            email: user?.email,
            amount: amount,
            flowType: 'landlord_to_contractor',
            jobId: job.id,
            payerId: user?.email || user?.id,
            payeeId: contractorId,
            paymentType: 'maintenance',
            description: `Contractor Payout: ${job.title} (${job.property_title || 'Maintenance'})`,
            onSuccess: ({ paystack }) => {
                setProcessingPaymentId(null);
                queryClient.invalidateQueries({ queryKey: ['payments'] });
                queryClient.invalidateQueries({ queryKey: ['contractor'] });
                queryClient.invalidateQueries({ queryKey: ['payments-maintenance-jobs'] });
                queryClient.invalidateQueries({ queryKey: ['payments-board-jobs'] });
                toast.success(`🎉 Contractor payout of R${amount.toLocaleString()} approved! Contractor JobScore™ accrued. Ref: ${paystack.reference}`);
            },
            onClose: () => {
                setProcessingPaymentId(null);
                toast.info('Payout checkout closed.');
            },
            onError: (err) => {
                setProcessingPaymentId(null);
                toast.error(err.message || 'Payout failed');
            }
        });
    };

    // Payment Handler for Pending Ledger Payments
    const handlePayNow = (payment) => {
        setProcessingPaymentId(payment.id);

        const flow = payment.type === 'maintenance'
            ? 'landlord_to_contractor'
            : 'tenant_to_landlord';

        executePaystackPayment({
            email: user?.email,
            amount: payment.amount,
            flowType: flow,
            paymentId: payment.id,
            leaseId: payment.lease_id,
            payerId: payment.tenant_id || user?.email,
            payeeId: payment.landlord_id,
            paymentType: payment.type || 'rent',
            description: `Payment for ${payment.property_title || 'RentFlex'} (Ref: ${payment.id.substring(0, 8)})`,
            onSuccess: ({ paystack, scoreUpdate, flowType }) => {
                setProcessingPaymentId(null);
                queryClient.invalidateQueries({ queryKey: ['payments'] });
                queryClient.invalidateQueries({ queryKey: ['rentScore'] });
                queryClient.invalidateQueries({ queryKey: ['contractor'] });

                const pointsText = flowType === 'tenant_to_landlord'
                    ? 'RentScore updated (+15 pts)'
                    : 'Contractor JobScore™ accrued';

                toast.success(`🎉 Payment Approved (Ref: ${paystack.reference})! ${pointsText}.`);
            },
            onClose: () => {
                setProcessingPaymentId(null);
                toast.info('Payment checkout closed.');
            },
            onError: (err) => {
                setProcessingPaymentId(null);
                toast.error(err.message || 'Payment processing failed');
            }
        });
    };

    // Handler for Custom / Bidirectional Transfers
    const handleCustomPayment = (e) => {
        e.preventDefault();
        const amountNum = parseFloat(newPaymentForm.amount);
        if (!amountNum || amountNum <= 0) {
            toast.error('Please enter a valid amount in ZAR (Rands).');
            return;
        }

        if (!newPaymentForm.payeeEmail) {
            toast.error('Please enter or select the recipient email.');
            return;
        }

        setProcessingPaymentId('custom');

        executePaystackPayment({
            email: user?.email,
            amount: amountNum,
            flowType: newPaymentForm.flowType,
            payerId: user?.email || user?.id,
            payeeId: newPaymentForm.payeeEmail,
            paymentType: newPaymentForm.paymentType,
            leaseId: newPaymentForm.leaseId || null,
            description: newPaymentForm.description || `Direct ${newPaymentForm.paymentType} payment`,
            onSuccess: ({ paystack, flowType }) => {
                setProcessingPaymentId(null);
                setNewPaymentDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['payments'] });
                queryClient.invalidateQueries({ queryKey: ['rentScore'] });
                queryClient.invalidateQueries({ queryKey: ['contractor'] });

                const pointsBadge = flowType === 'tenant_to_landlord'
                    ? 'Tenant RentScore points accrued (+15 pts)!'
                    : flowType === 'landlord_to_contractor'
                        ? 'Contractor JobScore™ updated with verified payout!'
                        : 'Transfer confirmed in system!';

                toast.success(`🎉 Payment Approved! ${pointsBadge} (Ref: ${paystack.reference})`);

                setNewPaymentForm({
                    flowType: 'tenant_to_landlord',
                    payeeEmail: '',
                    amount: '',
                    paymentType: 'rent',
                    description: '',
                    leaseId: '',
                    contractorId: ''
                });
            },
            onClose: () => {
                setProcessingPaymentId(null);
                toast.info('Payment checkout closed.');
            },
            onError: (err) => {
                setProcessingPaymentId(null);
                toast.error(err.message || 'Payment could not be processed');
            }
        });
    };

    const pendingPayments = payments?.filter(p => p.status === 'pending' || p.status === 'late') || [];
    const completedPayments = payments?.filter(p => p.status === 'paid') || [];
    const contractorPayments = payments?.filter(p => p.type === 'maintenance') || [];

    const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalContractorPaid = contractorPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    return (
        <div className="space-y-6 pb-12">
            {/* Header with Direct Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight uppercase">Payments & Settlement</h1>
                    <p className="text-zinc-600 mt-1 text-xs sm:text-sm font-medium">
                        Instant 1-click payments for your active rentings, contractor maintenance jobs & invoices
                    </p>
                </div>

                <Button
                    onClick={() => setNewPaymentDialogOpen(true)}
                    className="bg-zinc-950 hover:bg-zinc-900 text-white font-bold flex items-center gap-2 rounded-none border border-zinc-200/90 shadow-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Make a Payment
                </Button>
            </div>

            {/* Stats Cards with 3D Depth */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-none p-5 border border-zinc-200/90 shadow-card hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-150"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-none bg-amber-100 border border-zinc-200/90 shadow-xs flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-900" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Pending Due</p>
                            <p className="text-xl font-black text-zinc-950 tracking-tight">R{totalPending.toLocaleString()}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-white rounded-none p-5 border border-zinc-200/90 shadow-card hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-150"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-none bg-emerald-100 border border-zinc-200/90 shadow-xs flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-900" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Settled</p>
                            <p className="text-xl font-black text-zinc-950 tracking-tight">R{totalPaid.toLocaleString()}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-none p-5 border border-zinc-200/90 shadow-card hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-150"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-none bg-zinc-200 border border-zinc-200/90 shadow-xs flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-zinc-950" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Contractor Payouts</p>
                            <p className="text-xl font-black text-zinc-950 tracking-tight">R{totalContractorPaid.toLocaleString()}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ⚡ PROMINENT QUICK PAYMENTS: Active Rentings & Jobs Showcase */}
            {(activeRentings.length > 0 || activeJobs.length > 0) && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-950">
                                Quick Settlement (Active Rentings & Jobs)
                            </h2>
                        </div>
                        <span className="text-[11px] font-bold text-zinc-500">1-Click Instant Pay</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Active Rentings (Leases) */}
                        {activeRentings.map(lease => {
                            const rentAmount = Number(lease.monthly_rent || 0);
                            const isProcessing = processingPaymentId === `rent_${lease.id}`;

                            return (
                                <motion.div
                                    key={`quick_rent_${lease.id}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-none p-4 sm:p-5 border border-zinc-200/90 shadow-card hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-150 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <Badge className="bg-emerald-100 text-emerald-950 border border-zinc-200/90 rounded-none shadow-xs text-[10px] font-extrabold uppercase">
                                                Active Renting
                                            </Badge>
                                            <span className="text-xs font-bold text-zinc-500">
                                                Lease #{String(lease.id).substring(0, 6)}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-3 mt-3">
                                            <div className="w-10 h-10 bg-zinc-950 text-white rounded-none border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0">
                                                <Home className="w-5 h-5 text-zinc-100" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-black text-sm text-zinc-950 truncate">
                                                    {lease.property_title || 'Rental Residence'} {lease.room_number ? `• Unit ${lease.room_number}` : ''}
                                                </h3>
                                                <p className="text-xs text-zinc-600 truncate mt-0.5">
                                                    {isTenant ? `Landlord: ${lease.landlord_id || 'Landlord'}` : `Tenant: ${lease.tenant_id || 'Tenant'}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t-2 border-zinc-100 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[10.5px] uppercase font-bold text-zinc-500">Monthly Rent</p>
                                            <p className="text-lg font-black text-zinc-950 tracking-tight">R{rentAmount.toLocaleString()}</p>
                                        </div>

                                        {isTenant ? (
                                            <Button
                                                onClick={() => handleQuickPayRent(lease)}
                                                disabled={isProcessing || rentAmount <= 0}
                                                className="bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs h-9 px-4 rounded-none border border-zinc-200/90 shadow-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1.5"
                                            >
                                                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                                                {isProcessing ? 'Processing...' : 'Pay Rent Now'}
                                            </Button>
                                        ) : (
                                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 border border-emerald-300">
                                                Active Tenant Account
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}

                        {/* Active / Completed Contractor Jobs */}
                        {activeJobs.map(job => {
                            const jobCost = Number(job.estimated_cost || job.budget_max || job.amount || 1500);
                            const isProcessing = processingPaymentId === `job_${job.id}`;
                            const isResolved = job.status === 'resolved' || job.status === 'completed' || job.status === 'work_completed';

                            return (
                                <motion.div
                                    key={`quick_job_${job.id}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-none p-4 sm:p-5 border border-zinc-200/90 shadow-card hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-150 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <Badge className={`border border-zinc-200/90 rounded-none shadow-xs text-[10px] font-extrabold uppercase ${
                                                isResolved ? 'bg-indigo-100 text-indigo-950' : 'bg-amber-100 text-amber-950'
                                            }`}>
                                                {isResolved ? 'Job Ready for Payout' : 'Job In Progress'}
                                            </Badge>
                                            <span className="text-xs font-bold text-zinc-500 capitalize">
                                                {job.category || 'Repair'}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-3 mt-3">
                                            <div className="w-10 h-10 bg-amber-200 text-zinc-950 rounded-none border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0">
                                                <Wrench className="w-5 h-5 text-zinc-950" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-black text-sm text-zinc-950 truncate">
                                                    {job.title}
                                                </h3>
                                                <p className="text-xs text-zinc-600 truncate mt-0.5 font-medium">
                                                    {job.contractor_id ? `Contractor: ${formatUserDisplayName(job.contractor_company || job.contractor_name || job.contractor_id, 'Contractor')}` : 'Contractor Assigned'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t-2 border-zinc-100 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[10.5px] uppercase font-bold text-zinc-500">Agreed Cost</p>
                                            <p className="text-lg font-black text-zinc-950 tracking-tight">R{jobCost.toLocaleString()}</p>
                                        </div>

                                        {(isLandlord || isSysAdmin) && job.contractor_id ? (
                                            <Button
                                                onClick={() => handleQuickPayJob(job)}
                                                disabled={isProcessing}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-none border border-zinc-200/90 shadow-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1.5"
                                            >
                                                <CreditCard className="w-3.5 h-3.5" />
                                                {isProcessing ? 'Processing...' : 'Release Payout'}
                                            </Button>
                                        ) : (
                                            <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-1 border border-zinc-300">
                                                {job.contractor_id ? 'Assigned' : 'Awaiting Claim'}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Split Rent & Bi-Weekly Installment Scheduler */}
            {isTenant && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-950 rounded-none p-5 sm:p-6 text-white border border-zinc-200/90 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6"
                >
                    <div className="space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center items-start gap-1.5 sm:gap-2">
                            <h3 className="font-black text-base sm:text-lg text-white uppercase tracking-tight">FlexPay™ Bi-Weekly Rent Splitter</h3>
                            <Badge className="bg-zinc-800 text-zinc-200 border-2 border-zinc-700 rounded-none w-fit text-[10px] font-bold">0% Interest</Badge>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                            Split your monthly rent into 2 equal 50% payments (1st & 15th of the month) with automatic scheduled reminders.
                        </p>
                    </div>

                    <Button
                        className="w-full sm:w-auto bg-white hover:bg-zinc-100 text-zinc-950 font-black shrink-0 rounded-none border-2 border-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.4)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                        onClick={async () => {
                            if (pendingPayments.length === 0) {
                                toast.error('No pending rent payments found to split.');
                                return;
                            }
                            const first = pendingPayments[0];
                            const halfAmount = Math.round(Number(first.amount || 0) / 2);
                            
                            await appClient.entities.Payment.create({
                                lease_id: first.lease_id,
                                tenant_id: first.tenant_id,
                                landlord_id: first.landlord_id,
                                amount: halfAmount,
                                due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                                status: 'pending',
                                type: 'rent'
                            });
                            await appClient.entities.Payment.create({
                                lease_id: first.lease_id,
                                tenant_id: first.tenant_id,
                                landlord_id: first.landlord_id,
                                amount: halfAmount,
                                due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                                status: 'pending',
                                type: 'rent'
                            });
                            toast.success(`Split rent into 2 installments of R${halfAmount.toLocaleString()}!`);
                            queryClient.invalidateQueries({ queryKey: ['payments'] });
                        }}
                    >
                        Split Rent Into 2 Installments
                    </Button>
                </motion.div>
            )}

            {/* Payments Tabs with Sharp Tactile Elevation */}
            <Tabs defaultValue="pending" className="space-y-6">
                <TabsList className="bg-white p-1 rounded-none border border-zinc-200/90 shadow-sm flex flex-wrap gap-1 h-auto">
                    <TabsTrigger value="pending" className="flex items-center gap-2 rounded-none font-bold text-xs data-[state=active]:bg-zinc-950 data-[state=active]:text-white">
                        <Clock className="w-4 h-4" />
                        Pending Due
                        {pendingPayments.length > 0 && (
                            <Badge className="bg-amber-400 text-zinc-950 border-zinc-950 rounded-none h-4 px-1 text-[10px] font-extrabold">{pendingPayments.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="rentings" className="flex items-center gap-2 rounded-none font-bold text-xs data-[state=active]:bg-zinc-950 data-[state=active]:text-white">
                        <Home className="w-4 h-4" />
                        Active Rentings ({activeRentings.length})
                    </TabsTrigger>
                    <TabsTrigger value="jobs" className="flex items-center gap-2 rounded-none font-bold text-xs data-[state=active]:bg-zinc-950 data-[state=active]:text-white">
                        <Wrench className="w-4 h-4" />
                        Jobs & Repairs ({activeJobs.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="flex items-center gap-2 rounded-none font-bold text-xs data-[state=active]:bg-zinc-950 data-[state=active]:text-white">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed History ({completedPayments.length})
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Pending Payments */}
                <TabsContent value="pending" className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-24 rounded-none border-2 border-zinc-200" />
                            ))}
                        </div>
                    ) : pendingPayments.length > 0 ? (
                        pendingPayments.map((payment, idx) => (
                            <PaymentCard
                                key={payment.id}
                                payment={payment}
                                index={idx}
                                onPayNow={handlePayNow}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white rounded-none border border-zinc-200/90 shadow-card">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                            <h3 className="font-black text-zinc-950 text-sm mb-0.5 uppercase">All caught up!</h3>
                            <p className="text-xs text-zinc-500 font-medium">No pending invoices due at this moment</p>
                        </div>
                    )}
                </TabsContent>

                {/* Tab: Active Rentings */}
                <TabsContent value="rentings" className="space-y-4">
                    {activeRentings.length > 0 ? (
                        activeRentings.map((lease, idx) => (
                            <div
                                key={lease.id}
                                className="bg-white rounded-none p-5 border border-zinc-200/90 shadow-card hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                                <div className="flex items-start gap-3.5">
                                    <div className="w-11 h-11 bg-zinc-950 text-white rounded-none border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0">
                                        <Home className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-zinc-950 text-base">
                                            {lease.property_title || 'Rental Unit'}
                                        </h4>
                                        <p className="text-xs text-zinc-600 mt-0.5 font-medium">
                                            {lease.room_number ? `Room / Unit ${lease.room_number} • ` : ''}
                                            Landlord: {formatUserDisplayName(lease.landlord_name || lease.landlord_id, 'Landlord')}
                                        </p>
                                        <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                                            Lease Ref: {String(lease.id).substring(0, 8)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                    <p className="text-base sm:text-lg font-black text-zinc-950">
                                        R{Number(lease.monthly_rent || 0).toLocaleString()}/mo
                                    </p>
                                    {isTenant && (
                                        <Button
                                            onClick={() => handleQuickPayRent(lease)}
                                            disabled={processingPaymentId === `rent_${lease.id}`}
                                            className="bg-zinc-950 hover:bg-zinc-900 text-white font-bold h-9 px-4 rounded-none border border-zinc-200/90 shadow-xs active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                        >
                                            <CreditCard className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                            Pay Monthly Rent
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white rounded-none border border-zinc-200/90 shadow-card">
                            <Home className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                            <h3 className="font-black text-zinc-950 text-sm mb-0.5 uppercase">No active rentings</h3>
                            <p className="text-xs text-zinc-500 font-medium">Active leases will appear here with instant pay options</p>
                        </div>
                    )}
                </TabsContent>

                {/* Tab: Contractor Jobs & Maintenance */}
                <TabsContent value="jobs" className="space-y-4">
                    {activeJobs.length > 0 ? (
                        activeJobs.map((job, idx) => (
                            <div
                                key={job.id}
                                className="bg-white rounded-none p-5 border border-zinc-200/90 shadow-card hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                                <div className="flex items-start gap-3.5">
                                    <div className="w-11 h-11 bg-amber-200 text-zinc-950 rounded-none border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0">
                                        <Wrench className="w-5 h-5 text-zinc-950" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-zinc-950 text-base">
                                            {job.title}
                                        </h4>
                                        <p className="text-xs text-zinc-600 mt-0.5 font-medium">
                                            {job.property_title || 'Rental Property'} • {job.contractor_id ? `Assigned to: ${formatUserDisplayName(job.contractor_company || job.contractor_name || job.contractor_id, 'Contractor')}` : 'Contractor unassigned'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge className="bg-zinc-100 text-zinc-950 border border-zinc-200/90 rounded-none text-[10px] font-bold uppercase shadow-xs">
                                                Status: {job.status || 'open'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                    <p className="text-base sm:text-lg font-black text-zinc-950">
                                        R{Number(job.estimated_cost || job.budget_max || 1500).toLocaleString()}
                                    </p>
                                    {(isLandlord || isSysAdmin) && job.contractor_id && (
                                        <Button
                                            onClick={() => handleQuickPayJob(job)}
                                            disabled={processingPaymentId === `job_${job.id}`}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 rounded-none border border-zinc-200/90 shadow-xs active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                        >
                                            <CreditCard className="w-3.5 h-3.5 mr-1" />
                                            Release Payout
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white rounded-none border border-zinc-200/90 shadow-card">
                            <Wrench className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                            <h3 className="font-black text-zinc-950 text-sm mb-0.5 uppercase">No maintenance jobs recorded</h3>
                            <p className="text-xs text-zinc-500 font-medium">When maintenance jobs are logged or dispatched, quick payouts show here</p>
                        </div>
                    )}
                </TabsContent>

                {/* Tab: Completed Payments */}
                <TabsContent value="completed" className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-20 rounded-none border-2 border-zinc-200" />
                            ))}
                        </div>
                    ) : completedPayments.length > 0 ? (
                        completedPayments.map((payment, idx) => (
                            <PaymentCard key={payment.id} payment={payment} index={idx} />
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white rounded-none border border-zinc-200/90 shadow-card">
                            <CreditCard className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                            <h3 className="font-black text-zinc-950 text-sm mb-0.5 uppercase">No completed transactions</h3>
                            <p className="text-xs text-zinc-500 font-medium">Completed transactions will appear here</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Make / Custom Payment Dialog */}
            <Dialog open={newPaymentDialogOpen} onOpenChange={setNewPaymentDialogOpen}>
                <DialogContent className="sm:max-w-lg rounded-none border border-zinc-200/90 shadow-3d-modal">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                            <Send className="w-5 h-5 text-zinc-900" />
                            Make a Payment
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCustomPayment} className="space-y-4 mt-2">
                        {/* Flow Direction Selector */}
                        <div>
                            <Label className="text-xs font-semibold text-zinc-700">Payment Flow</Label>
                            <Select
                                value={newPaymentForm.flowType}
                                onValueChange={(val) => {
                                    let defaultType = 'rent';
                                    if (val === 'landlord_to_contractor') defaultType = 'maintenance';
                                    if (val === 'contractor_to_landlord') defaultType = 'fee';
                                    setNewPaymentForm({
                                        ...newPaymentForm,
                                        flowType: val,
                                        paymentType: defaultType
                                    });
                                }}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select transfer type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tenant_to_landlord">
                                        Tenant → Landlord (Rent, Deposit, Utilities) [Accrues RentScore]
                                    </SelectItem>
                                    <SelectItem value="landlord_to_contractor">
                                        Landlord → Contractor (Maintenance Payout / Bid) [Accrues JobScore™]
                                    </SelectItem>
                                    <SelectItem value="contractor_to_landlord">
                                        Contractor → Landlord (Material Reimbursement / Refund)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Payment Type */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Category</Label>
                                <Select
                                    value={newPaymentForm.paymentType}
                                    onValueChange={(val) => setNewPaymentForm({ ...newPaymentForm, paymentType: val })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rent">Rent</SelectItem>
                                        <SelectItem value="deposit">Security Deposit</SelectItem>
                                        <SelectItem value="maintenance">Maintenance / Repair</SelectItem>
                                        <SelectItem value="fee">Service / Utility Fee</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Amount (ZAR)</Label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">R</span>
                                    <Input
                                        type="number"
                                        min="1"
                                        step="any"
                                        placeholder="0.00"
                                        className="pl-7"
                                        value={newPaymentForm.amount}
                                        onChange={(e) => setNewPaymentForm({ ...newPaymentForm, amount: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payee Selection or Custom Email */}
                        <div>
                            <Label className="text-xs font-semibold text-zinc-700">Recipient Email or ID</Label>
                            {newPaymentForm.flowType === 'landlord_to_contractor' && contractors.length > 0 ? (
                                <div className="space-y-2 mt-1">
                                    <Select
                                        value={newPaymentForm.payeeEmail}
                                        onValueChange={(val) => setNewPaymentForm({ ...newPaymentForm, payeeEmail: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select contractor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {contractors.map(c => (
                                                <SelectItem key={c.id} value={c.user_id || c.email || c.id}>
                                                    {c.company_name || c.business_name || 'Contractor'} ({c.trade_category || 'General'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="Or enter direct email address"
                                        value={newPaymentForm.payeeEmail}
                                        onChange={(e) => setNewPaymentForm({ ...newPaymentForm, payeeEmail: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <Input
                                    className="mt-1"
                                    type="email"
                                    placeholder="e.g. landlord@rentflex.co.za"
                                    value={newPaymentForm.payeeEmail}
                                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, payeeEmail: e.target.value })}
                                    required
                                />
                            )}
                        </div>

                        {/* Description / Note */}
                        <div>
                            <Label className="text-xs font-semibold text-zinc-700">Payment Note / Reference Description</Label>
                            <Textarea
                                className="mt-1"
                                rows={2}
                                placeholder="e.g. September Rent for Apt 4B or Plumbing Job Payout"
                                value={newPaymentForm.description}
                                onChange={(e) => setNewPaymentForm({ ...newPaymentForm, description: e.target.value })}
                            />
                        </div>

                        {/* Notice Box */}
                        <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 text-xs text-zinc-600">
                            <p className="font-semibold text-zinc-900 mb-0.5">Secure Transaction Processing</p>
                            <p className="text-[11px] text-zinc-500">
                                Card and instant EFT payments are encrypted and verified in real-time. RentFlex updates your transaction status and automatically credits tenant RentScore or contractor JobScore™.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11"
                            disabled={processingPaymentId === 'custom'}
                        >
                            {processingPaymentId === 'custom' ? (
                                'Opening Checkout...'
                            ) : (
                                `Proceed to Payment (R${newPaymentForm.amount ? Number(newPaymentForm.amount).toLocaleString() : '0.00'})`
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
