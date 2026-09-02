import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Building2, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CompleteStep({ onComplete }) {
    const nextSteps = [
        {
            icon: Building2,
            title: 'Complete your property listing',
            description: 'Add photos, amenities, and detailed information'
        },
        {
            icon: Users,
            title: 'Review tenant applications',
            description: 'See RentScores and select quality tenants'
        },
        {
            icon: BarChart3,
            title: 'Track everything in one place',
            description: 'Payments, maintenance, and analytics'
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
            >
                <CheckCircle2 className="w-12 h-12 text-white" />
            </motion.div>

            <h2 className="text-3xl font-bold text-slate-900 mb-3">You're All Set!</h2>
            <p className="text-sm text-zinc-600 mb-6">
                Welcome to RentFlex! Your landlord account is ready to go.
            </p>

            <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200 mb-6">
                <h3 className="font-bold text-sm text-zinc-900 mb-4">What's Next?</h3>
                <div className="space-y-3">
                    {nextSteps.map((step) => (
                        <div
                            key={step.title}
                            className="flex items-start gap-3 p-3.5 bg-zinc-50 text-left border border-zinc-100"
                        >
                            <div className="w-8 h-8 bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                                <step.icon className="w-4 h-4 text-zinc-900" />
                            </div>
                            <div>
                                <p className="font-semibold text-xs text-zinc-900 mb-0.5">{step.title}</p>
                                <p className="text-[11px] text-zinc-500">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Button
                size="lg"
                className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium px-8 py-4 text-sm"
                onClick={onComplete}
            >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </motion.div>
    );
}
