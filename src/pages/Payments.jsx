import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDate } from '@/utils';
import {
    CreditCard,
    CheckCircle2,
    Clock,
    Repeat,
    Landmark,
    BadgePercent
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
import { toast } from 'sonner';
import PaymentCard from '@/components/payments/PaymentCard';

export default function Payments() {
    const [user, setUser] = useState(null);
    const [paymentDialog, setPaymentDialog] = useState({ open: false, payment: null });
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
    const queryClient = useQueryClient();

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const { data: payments, isLoading } = useQuery({
        queryKey: ['payments', user?.email],
        queryFn: async () => {
            if (!user?.email) return [];
            const asTenant = await appClient.entities.Payment.filter({ tenant_id: user.email });
            const asLandlord = await appClient.entities.Payment.filter({ landlord_id: user.email });
            const combined = [...asTenant, ...asLandlord];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!user?.email,
    });

    const { data: leases } = useQuery({
        queryKey: ['leases', user?.email],
        queryFn: () => appClient.entities.Lease.filter({ tenant_id: user?.email, status: 'active' }),
        enabled: !!user?.email,
    });

    const updatePaymentMutation = useMutation({
        mutationFn: ({ id, data }) => appClient.entities.Payment.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            setPaymentDialog({ open: false, payment: null });
            toast.success('Payment processed successfully!');
        },
    });

    const handlePayNow = (payment) => {
        setPaymentDialog({ open: true, payment });
    };

    const processPayment = () => {
        if (!paymentDialog.payment) return;

        updatePaymentMutation.mutate({
            id: paymentDialog.payment.id,
            data: {
                status: 'paid',
                paid_date: new Date().toISOString().split('T')[0],
                payment_method: paymentMethod,
                transaction_id: `TXN-${Date.now()}`
            }
        });
    };

    const pendingPayments = payments?.filter(p => p.status === 'pending' || p.status === 'late') || [];
    const completedPayments = payments?.filter(p => p.status === 'paid') || [];
    const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const paymentMethods = [
        { value: 'bank_transfer', label: 'Bank Transfer', icon: Landmark, description: 'Direct from your bank account' },
        { value: 'debit', label: 'Debit Card', icon: CreditCard, description: 'Pay with your debit card' },
        { value: 'credit', label: 'Credit Card', icon: CreditCard, description: 'Pay with credit card' },
        { value: 'bnpl', label: 'Buy Now, Pay Later', icon: BadgePercent, description: 'Split into 4 payments' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Payments</h1>
                <p className="text-slate-500 mt-1">Manage your rent payments and view history</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/90 hover:shadow-md hover:border-zinc-300/80 hover:-translate-y-0.5 transition-all duration-200"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-700" />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">Due This Month</p>
                            <p className="text-xl font-bold text-zinc-900">R{totalPending.toLocaleString()}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/90 hover:shadow-md hover:border-zinc-300/80 hover:-translate-y-0.5 transition-all duration-200"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">Total Paid</p>
                            <p className="text-xl font-bold text-zinc-900">R{totalPaid.toLocaleString()}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/90 hover:shadow-md hover:border-zinc-300/80 hover:-translate-y-0.5 transition-all duration-200"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                            <Repeat className="w-5 h-5 text-zinc-900" />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">Active Leases</p>
                            <p className="text-xl font-bold text-zinc-900">{leases?.length || 0}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Split Rent & Bi-Weekly Installment Scheduler */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-950 rounded-2xl p-5 sm:p-6 text-white border border-zinc-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6"
            >
                <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center items-start gap-1.5 sm:gap-2">
                        <h3 className="font-bold text-base sm:text-lg text-white">FlexPay™ Bi-Weekly Rent Splitter</h3>
                        <Badge className="bg-zinc-800 text-zinc-200 border-zinc-700 w-fit text-[11px]">0% Interest</Badge>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        Split your monthly rent into 2 equal 50% payments (1st & 15th of the month) to match your payday cycle.
                    </p>
                </div>

                <Button
                    className="w-full sm:w-auto bg-white hover:bg-zinc-100 text-zinc-950 font-bold shrink-0 shadow-sm"
                    onClick={() => {
                        if (pendingPayments.length === 0) {
                            toast.error('No pending rent payments found to split.');
                            return;
                        }
                        const first = pendingPayments[0];
                        const halfAmount = Math.round(Number(first.amount || 18500) / 2);
                        
                        // Create 2 split payment installment records
                        appClient.entities.Payment.create({
                            lease_id: first.lease_id,
                            tenant_id: first.tenant_id,
                            landlord_id: first.landlord_id,
                            amount: halfAmount,
                            due_date: '2026-09-01',
                            status: 'pending',
                            type: 'rent'
                        });
                        appClient.entities.Payment.create({
                            lease_id: first.lease_id,
                            tenant_id: first.tenant_id,
                            landlord_id: first.landlord_id,
                            amount: halfAmount,
                            due_date: '2026-09-15',
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

            {/* Auto-Pay Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-zinc-900 rounded-2xl p-6 text-white border border-zinc-800 shadow-sm"
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="font-semibold text-lg text-white">Set Up Auto-Pay</h3>
                        <p className="text-zinc-400 text-sm">Never miss a payment and boost your RentScore</p>
                    </div>
                    <Button variant="secondary" className="bg-white text-zinc-950 hover:bg-zinc-100 font-medium shrink-0">
                        Enable Auto-Pay
                    </Button>
                </div>
            </motion.div>

            {/* Payments Tabs */}
            <Tabs defaultValue="pending" className="space-y-6">
                <TabsList className="bg-transparent p-0 border-none gap-2">
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Pending
                        {pendingPayments.length > 0 && (
                            <Badge className="bg-amber-500 text-white h-5 px-1.5">{pendingPayments.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-24 rounded-xl" />
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
                        <div className="text-center py-10 bg-white rounded-xl border border-zinc-200/80">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                            <h3 className="font-semibold text-zinc-900 text-sm mb-0.5">All caught up!</h3>
                            <p className="text-xs text-zinc-500">No pending payments</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-20 rounded-xl" />
                            ))}
                        </div>
                    ) : completedPayments.length > 0 ? (
                        completedPayments.map((payment, idx) => (
                            <PaymentCard key={payment.id} payment={payment} index={idx} />
                        ))
                    ) : (
                        <div className="text-center py-10 bg-white rounded-xl border border-zinc-200/80">
                            <CreditCard className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                            <h3 className="font-semibold text-zinc-900 text-sm mb-0.5">No payment history</h3>
                            <p className="text-xs text-zinc-500">Your completed payments will appear here</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Payment Dialog */}
            <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ open, payment: null })}>
                <DialogContent className="sm:max-w-md rounded-xl border border-zinc-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-zinc-900">Complete Payment</DialogTitle>
                    </DialogHeader>
                    {paymentDialog.payment && (
                        <div className="space-y-5 mt-3">
                            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200/70">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-600 text-xs font-medium">Amount Due</span>
                                    <span className="text-xl font-bold text-zinc-900">
                                        R{(paymentDialog.payment?.amount ?? 0).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Due: {formatDate(paymentDialog.payment?.due_date)}
                                </p>
                            </div>

                            <div>
                                <Label className="mb-2.5 block text-xs font-semibold text-zinc-700">Select Payment Method</Label>
                                <div className="space-y-2">
                                    {paymentMethods.map((method) => (
                                        <button
                                            key={method.value}
                                            onClick={() => setPaymentMethod(method.value)}
                                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${paymentMethod === method.value
                                                    ? 'border-zinc-900 bg-zinc-50/80'
                                                    : 'border-zinc-200 hover:border-zinc-300'
                                                }`}
                                        >
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${paymentMethod === method.value ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
                                                }`}>
                                                <method.icon className="w-4 h-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold text-xs text-zinc-900">{method.label}</p>
                                                <p className="text-[11px] text-zinc-500">{method.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {paymentMethod === 'bnpl' && (
                                <div className="bg-zinc-50 p-3.5 border border-zinc-200">
                                    <p className="font-bold text-xs text-zinc-900 mb-1">Buy Now, Pay Later</p>
                                    <p className="text-xs text-zinc-600">
                                        Split R{(paymentDialog.payment?.amount ?? 0).toLocaleString()} into 4 interest-free payments of R{((paymentDialog.payment?.amount || 0) / 4).toLocaleString()}
                                    </p>
                                </div>
                            )}

                            <Button
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                                onClick={processPayment}
                                disabled={updatePaymentMutation.isPending}
                            >
                                {updatePaymentMutation.isPending ? 'Processing...' : `Pay R${(paymentDialog.payment?.amount ?? 0).toLocaleString()}`}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
