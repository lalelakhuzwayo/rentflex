import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Home, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RentScoreGauge from '@/components/dashboard/RentScoreGauge';

export default function CompleteStep({ initialScore, onComplete }) {
    const nextSteps = [
        {
            icon: Home,
            title: 'Browse available apartments',
            description: 'Find your perfect home from verified landlords'
        },
        {
            icon: TrendingUp,
            title: 'Build your RentScore',
            description: 'Every on-time payment increases your score'
        },
        {
            icon: DollarSign,
            title: 'Set up flexible payments',
            description: 'Pay weekly, monthly, or use BNPL options'
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

            <h2 className="text-3xl font-bold text-slate-900 mb-3">Your Rent Profile is Ready!</h2>
            <p className="text-lg text-slate-600 mb-8">
                Welcome to RentFlex! You can start browsing apartments and building your RentScore.
            </p>

            {/* RentScore Display */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm mb-8">
                <h3 className="font-semibold text-slate-900 mb-6">Your Starting RentScore</h3>
                <div className="flex justify-center mb-4">
                    <RentScoreGauge score={initialScore} size="large" />
                </div>
                <p className="text-sm text-slate-600">
                    Your initial score is based on the verifications you completed.
                    It will improve as you make on-time payments and maintain good rental history.
                </p>
            </div>

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
