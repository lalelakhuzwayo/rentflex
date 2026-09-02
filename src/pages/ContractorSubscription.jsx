import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Star, Crown } from 'lucide-react';
import { toast } from 'sonner';

export default function ContractorSubscription() {
    const [user, setUser] = useState(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        appClient.auth.me().then(setUser);
    }, []);

    const { data: contractor } = useQuery({
        queryKey: ['my-contractor-profile'],
        queryFn: () => appClient.entities.Contractor.filter({ user_id: user?.id }).then(r => r[0]),
        enabled: !!user
    });

    const subscribeMutation = useMutation({
        mutationFn: async (plan) => {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);

            return appClient.entities.Contractor.update(contractor.id, {
                subscription_plan: plan,
                subscription_status: 'active',
                subscription_end_date: endDate.toISOString().split('T')[0]
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['my-contractor-profile']);
            toast.success('Subscription activated!');
        }
    });

    const plans = [
        {
            name: 'Basic',
            price: 99,
            plan_id: 'basic',
            icon: Zap,
            features: [
                'Bid on unlimited jobs',
                'Basic profile listing',
                'Email notifications',
                'Standard support'
            ]
        },
        {
            name: 'Pro',
            price: 199,
            plan_id: 'pro',
            icon: Star,
            popular: true,
            features: [
                'Everything in Basic',
                'Featured profile listing',
                'Priority job alerts',
                'Analytics dashboard',
                'Priority support'
            ]
        },
        {
            name: 'Enterprise',
            price: 399,
            plan_id: 'enterprise',
            icon: Crown,
            features: [
                'Everything in Pro',
                'Top-tier profile placement',
                'Dedicated account manager',
                'Advanced analytics',
                'API access',
                '24/7 premium support'
            ]
        }
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Contractor Subscription Plans</h1>
                <p className="text-xl text-slate-600">Choose the plan that works best for your business</p>
            </div>

            {contractor?.subscription_status === 'active' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-8 text-center">
                    <p className="text-emerald-800 font-medium">
                        Your <span className="capitalize">{contractor.subscription_plan}</span> subscription is active until{' '}
                        {new Date(contractor.subscription_end_date).toLocaleDateString()}
                    </p>
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan) => {
                    const Icon = plan.icon;
                    const isCurrentPlan = contractor?.subscription_plan === plan.plan_id;

                    return (
                        <Card
                            key={plan.plan_id}
                            className={`p-6 relative sharp-card ${plan.popular ? 'border-zinc-900 shadow-md' : 'border-transparent'
                                }`}
                        >
                            {plan.popular && (
                                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white font-bold">
                                    Most Popular
                                </Badge>
                            )}

                            <div className="text-center mb-6">
                                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                                    <Icon className="w-6 h-6 text-zinc-900" />
                                </div>
                                <h3 className="text-xl font-bold text-zinc-900 mb-2">{plan.name}</h3>
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-3xl font-bold text-zinc-900">R{plan.price}</span>
                                    <span className="text-zinc-500 text-xs">/month</span>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-2.5 text-xs">
                                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span className="text-zinc-700">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => subscribeMutation.mutate(plan.plan_id)}
                                disabled={isCurrentPlan || subscribeMutation.isPending}
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                            >
                                {isCurrentPlan ? 'Current Plan' : 'Subscribe Now'}
                            </Button>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-12 text-center text-slate-600">
                <p>All plans include a 7-day free trial. Cancel anytime.</p>
            </div>
        </div>
    );
}
