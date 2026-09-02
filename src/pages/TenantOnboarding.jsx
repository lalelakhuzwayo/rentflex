import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import PersonalDetailsStep from '@/components/tenant-onboarding/PersonalDetailsStep';
import VerificationStep from '@/components/tenant-onboarding/VerificationStep';
import EmploymentStep from '@/components/tenant-onboarding/EmploymentStep';
import BankAccountStep from '@/components/tenant-onboarding/BankAccountStep';
import CompleteStep from '@/components/tenant-onboarding/CompleteStep';

const STEPS = ['personal', 'verification', 'employment', 'bank', 'complete'];

export default function TenantOnboarding() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        date_of_birth: '',
        id_number: '',
        id_verified: false,
        employment_status: '',
        employer_name: '',
        monthly_income: '',
        income_verified: false,
        bank_name: '',
        account_number: '',
        debit_order_enabled: false,
    });

    useEffect(() => {
        appClient.auth.me().then(u => {
            setUser(u);
            if (u.onboarding_completed) {
                navigate(createPageUrl('Dashboard'));
            } else if (u.onboarding_step) {
                setCurrentStep(u.onboarding_step);
            }
            // Pre-fill data
            setFormData(prev => ({
                ...prev,
                full_name: u.full_name || '',
                phone: u.phone || '',
            }));
        }).catch(() => { });
    }, []);

    const updateUserMutation = useMutation({
        mutationFn: (data) => appClient.auth.updateMe(data),
    });

    const createRentScoreMutation = useMutation({
        mutationFn: (data) => appClient.entities.RentScore.create(data),
    });

    const handleNext = async () => {
        // Save progress
        if (currentStep > 0) {
            await updateUserMutation.mutateAsync({
                onboarding_step: currentStep + 1
            });
        }

        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        try {
            // Calculate initial RentScore
            let initialScore = 500; // Base score
            if (formData.id_verified) initialScore += 50;
            if (formData.income_verified) initialScore += 100;
            if (formData.debit_order_enabled) initialScore += 75;

            // Update user profile
            await updateUserMutation.mutateAsync({
                user_type: 'tenant',
                full_name: formData.full_name,
                phone: formData.phone,
                date_of_birth: formData.date_of_birth,
                id_number: formData.id_number,
                id_verified: formData.id_verified,
                employment_status: formData.employment_status,
                employer_name: formData.employer_name,
                monthly_income: parseFloat(formData.monthly_income) || 0,
                income_verified: formData.income_verified,
                bank_name: formData.bank_name,
                account_number: formData.account_number,
                debit_order_enabled: formData.debit_order_enabled,
                onboarding_completed: true,
                onboarding_step: STEPS.length,
            });

            // Create initial RentScore
            await createRentScoreMutation.mutateAsync({
                user_id: user?.email,
                score: initialScore,
                payment_history_score: 0,
                lease_completion_score: 0,
                landlord_reviews_score: 0,
                verification_score: formData.id_verified ? 50 : 0,
                on_time_payments: 0,
                late_payments: 0,
                total_payments: 0,
                leases_completed: 0,
                verified_income: formData.income_verified,
                verified_employment: formData.employment_status ? true : false,
                verified_identity: formData.id_verified,
                last_updated: new Date().toISOString(),
            });

            queryClient.invalidateQueries();
            toast.success('Welcome to RentFlex!');
            navigate(createPageUrl('Dashboard'));
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        }
    };

    // Calculate initial score for display
    let initialScore = 500;
    if (formData.id_verified) initialScore += 50;
    if (formData.income_verified) initialScore += 100;
    if (formData.debit_order_enabled) initialScore += 75;

    const progress = ((currentStep + 1) / STEPS.length) * 100;
    const currentStepName = STEPS[currentStep];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Progress Bar */}
                {currentStep < STEPS.length - 1 && (
                    <div className="max-w-2xl mx-auto mb-8">
                        <div className="flex justify-between text-sm text-slate-600 mb-2">
                            <span>Step {currentStep + 1} of {STEPS.length - 1}</span>
                            <span>{Math.round(progress)}% Complete</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                )}

                {/* Steps */}
                <AnimatePresence mode="wait">
                    {currentStepName === 'personal' && (
                        <PersonalDetailsStep
                            key="personal"
                            data={formData}
                            onChange={setFormData}
                            onNext={handleNext}
                        />
                    )}
                    {currentStepName === 'verification' && (
                        <VerificationStep
                            key="verification"
                            data={formData}
                            onChange={setFormData}
                            onNext={handleNext}
                            onBack={handleBack}
                        />
                    )}
                    {currentStepName === 'employment' && (
                        <EmploymentStep
                            key="employment"
                            data={formData}
                            onChange={setFormData}
                            onNext={handleNext}
                            onBack={handleBack}
                        />
                    )}
                    {currentStepName === 'bank' && (
                        <BankAccountStep
                            key="bank"
                            data={formData}
                            onChange={setFormData}
                            onNext={handleNext}
                            onBack={handleBack}
                        />
                    )}
                    {currentStepName === 'complete' && (
                        <CompleteStep
                            key="complete"
                            initialScore={initialScore}
                            onComplete={handleComplete}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
