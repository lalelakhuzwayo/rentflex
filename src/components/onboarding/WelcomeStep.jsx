import { motion } from 'framer-motion';
import { TrendingUp, Shield, Zap, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WelcomeStep({ onNext }) {
    const features = [
        {
            icon: TrendingUp,
            title: 'Verified Tenants',
            description: 'Access RentScore to find reliable tenants with proven payment history'
        },
        {
            icon: DollarSign,
            title: 'Flexible Payments',
            description: 'Let tenants pay weekly, monthly, or use BNPL - you get paid monthly'
        },
        {
            icon: Shield,
            title: 'Automated Management',
            description: 'Handle maintenance, lease agreements, and inspections all in one platform'
        },
        {
            icon: Zap,
            title: 'Fast Setup',
            description: 'Get started in minutes and list your first property today'
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="max-w-4xl mx-auto text-center">
                <div className="mb-8">
                    <div className="w-14 h-14 bg-zinc-950 flex items-center justify-center mx-auto mb-6 rounded-xl overflow-hidden border border-zinc-800 shadow-sm">
                        <img src="/assets/rentflex-logo.png" alt="RentFlex Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-zinc-900 mb-3">
                        Welcome to RentFlex for Landlords
                    </h1>
                    <p className="text-sm text-zinc-600 max-w-2xl mx-auto">
                        The modern way to manage your rental properties, find quality tenants, and get paid on time - every time.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200 text-left"
                        >
                            <div className="w-10 h-10 bg-zinc-100 flex items-center justify-center mb-4">
                                <feature.icon className="w-5 h-5 text-zinc-900" />
                            </div>
                            <h3 className="font-bold text-sm text-zinc-900 mb-1">{feature.title}</h3>
                            <p className="text-xs text-zinc-600">{feature.description}</p>
                        </div>
                    ))}
                </div>

                <div className="sharp-card bg-zinc-950 p-6 text-white border border-transparent hover:border-zinc-800 mb-8">
                    <div className="flex items-center justify-around max-w-2xl mx-auto">
                        <div className="text-center">
                            <p className="text-2xl font-bold mb-1">10k+</p>
                            <p className="text-zinc-400 text-xs">Properties Listed</p>
                        </div>
                        <div className="h-10 w-px bg-zinc-800" />
                        <div className="text-center">
                            <p className="text-2xl font-bold mb-1">98%</p>
                            <p className="text-zinc-400 text-xs">On-Time Payments</p>
                        </div>
                        <div className="h-10 w-px bg-zinc-800" />
                        <div className="text-center">
                            <p className="text-2xl font-bold mb-1">R2.5M+</p>
                            <p className="text-zinc-400 text-xs">Rent Processed</p>
                        </div>
                    </div>
                </div>

                <Button
                    size="lg"
                    className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium px-8 py-4 text-sm"
                    onClick={onNext}
                >
                    Get Started
                </Button>
                <p className="text-sm text-slate-500 mt-4">Takes less than 5 minutes to complete</p>
            </div>
        </motion.div>
    );
}
