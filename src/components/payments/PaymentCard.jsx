import { formatDate } from '@/utils';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BlockLoader from '@/components/ui/BlockLoader';

export default function PaymentCard({ payment, index = 0, onPayNow }) {
    const statusConfig = {
        paid: {
            icon: CheckCircle2,
            color: 'text-emerald-700',
            bg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        },
        pending: {
            icon: Clock,
            color: 'text-amber-700',
            bg: 'bg-amber-50 text-amber-700 border-amber-200'
        },
        late: {
            icon: AlertCircle,
            color: 'text-rose-700',
            bg: 'bg-rose-50 text-rose-700 border-rose-200'
        },
        processing: {
            icon: null,
            color: 'text-zinc-900',
            bg: 'bg-zinc-100 text-zinc-900 border-zinc-200'
        },
        failed: {
            icon: AlertCircle,
            color: 'text-rose-700',
            bg: 'bg-rose-50 text-rose-700 border-rose-200'
        },
    };

    const config = statusConfig[payment.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            className="sharp-card bg-white rounded-none p-5 border border-zinc-200/90 shadow-card hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-150"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-none border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0 ${config.bg.split(' ')[0]}`}>
                        {payment.status === 'processing' ? (
                            <BlockLoader size="xs" variant="grid" />
                        ) : (
                            <StatusIcon className={`w-5 h-5 ${config.color}`} />
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-zinc-950 tracking-tight text-sm sm:text-base">
                            {payment.property_title || (payment.type === 'maintenance' ? 'Maintenance / Contractor Payout' : payment.type === 'deposit' ? 'Security Deposit' : 'Rent Payment')}
                        </h4>
                        <p className="text-xs text-zinc-600 mt-0.5 font-medium">
                            {payment.status === 'paid' && payment.paid_date ? `Paid: ${formatDate(payment.paid_date)}` : `Due: ${formatDate(payment.due_date)}`}
                        </p>
                        {payment.transaction_id && (
                            <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                                Ref: {payment.transaction_id}
                            </p>
                        )}
                        {payment.payment_type === 'bnpl_installment' && (
                            <p className="text-xs text-zinc-950 font-bold mt-1">
                                Installment {payment.bnpl_installment_number}/{payment.bnpl_total_installments}
                            </p>
                        )}
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <p className="text-base sm:text-lg font-black text-zinc-950 tracking-tight">R{payment.amount?.toLocaleString()}</p>
                    <Badge className={`${config.bg} mt-1 rounded-none text-[10.5px] font-bold capitalize border border-zinc-200/90 shadow-xs`}>
                        {payment.status}
                    </Badge>
                    {payment.payment_method && (
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-1">
                            {payment.payment_method === 'paystack' ? 'Instant Card / EFT' : payment.payment_method}
                        </p>
                    )}
                </div>
            </div>

            {(payment.status === 'pending' || payment.status === 'late') && onPayNow && (
                <div className="mt-4 pt-4 border-t-2 border-zinc-100">
                    <Button
                        onClick={() => onPayNow(payment)}
                        className="w-full bg-zinc-950 hover:bg-zinc-900 text-white flex items-center justify-center gap-2 font-bold h-10 rounded-none border border-zinc-200/90 shadow-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    >
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        Pay R{payment.amount?.toLocaleString()}
                    </Button>
                </div>
            )}
        </motion.div>
    );
}
