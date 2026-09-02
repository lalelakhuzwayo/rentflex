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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="sharp-card bg-white p-5 border border-transparent hover:border-zinc-900 transition-all duration-200"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center ${config.bg.split(' ')[0]}`}>
                        {payment.status === 'processing' ? (
                            <BlockLoader size="xs" variant="grid" />
                        ) : (
                            <StatusIcon className={`w-5 h-5 ${config.color}`} />
                        )}
                    </div>
                    <div>
                        <h4 className="font-semibold text-zinc-900">{payment.property_title || 'Rent Payment'}</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Due: {formatDate(payment.due_date)}
                        </p>
                        {payment.payment_type === 'bnpl_installment' && (
                            <p className="text-xs text-zinc-900 font-medium mt-1">
                                BNPL Installment {payment.bnpl_installment_number}/{payment.bnpl_total_installments}
                            </p>
                        )}
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-base font-bold text-zinc-900">R{payment.amount?.toLocaleString()}</p>
                    <Badge className={`${config.bg} mt-1`}>
                        {payment.status}
                    </Badge>
                </div>
            </div>

            {(payment.status === 'pending' || payment.status === 'late') && onPayNow && (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                    <Button
                        onClick={() => onPayNow(payment)}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                    >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay Now
                    </Button>
                </div>
            )}
        </motion.div>
    );
}
