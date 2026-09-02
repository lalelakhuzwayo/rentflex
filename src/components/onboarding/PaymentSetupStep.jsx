import { motion } from 'framer-motion';
import { Landmark, CreditCard, CheckCircle2, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PaymentSetupStep({ data, onChange, onNext, onBack }) {
    const handleConnectStripe = () => {
        // In real app, this would open Stripe Connect flow
        onChange({ ...data, payment_setup_complete: true });
    };

    const benefits = [
        { icon: Zap, text: 'Get paid automatically every month' },
        { icon: Shield, text: 'Bank-level security and fraud protection' },
        { icon: CheckCircle2, text: 'No setup fees or monthly charges' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Landmark className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Set Up Payments</h2>
                <p className="text-slate-600">Connect your bank account to receive rent payments</p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm space-y-6">
                <div className="text-center">
                    {!data.payment_setup_complete ? (
                        <>
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Landmark className="w-10 h-10 text-slate-400" />
                            </div>
                            <p className="text-slate-600 mb-6">
                                We use Stripe to ensure you get paid securely and on time.
                                You'll be redirected to Stripe to complete a quick setup.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                            </div>
                            <p className="text-emerald-900 font-semibold mb-2">Payment Account Connected!</p>
                            <p className="text-slate-600 mb-6">
                                Your bank account is connected and ready to receive payments.
                            </p>
                        </>
                    )}
                </div>

                <div className="space-y-3">
                    {benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-50">
                            <div className="w-8 h-8 bg-white flex items-center justify-center border border-zinc-200">
                                <benefit.icon className="w-4 h-4 text-zinc-900" />
                            </div>
                            <span className="text-xs text-zinc-700">{benefit.text}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-amber-50 p-3.5 border border-amber-200">
                    <p className="text-xs text-amber-900">
                        <strong>Note:</strong> You can skip this step and set it up later, but you won't be able to receive payments until it's completed.
                    </p>
                </div>

                {!data.payment_setup_complete && (
                    <Button
                        onClick={handleConnectStripe}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                        size="lg"
                    >
                        <Landmark className="w-4 h-4 mr-2" />
                        Connect Payout Account
                    </Button>
                )}

                <div className="flex gap-3 pt-3">
                    <Button variant="outline" onClick={onBack} className="flex-1 border-zinc-200">
                        Back
                    </Button>
                    <Button
                        onClick={onNext}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
                    >
                        {data.payment_setup_complete ? 'Continue' : 'Skip for Now'}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
