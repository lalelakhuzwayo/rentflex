import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import ProfileStep from '@/components/onboarding/ProfileStep';
import VerificationStep from '@/components/onboarding/VerificationStep';
import PropertyStep from '@/components/onboarding/PropertyStep';
import PaymentSetupStep from '@/components/onboarding/PaymentSetupStep';
import CompleteStep from '@/components/onboarding/CompleteStep';

const STEPS = [
    'welcome',
    'profile',
    'verification',
    'property',
    'payment',
    'complete'
];

export default function LandlordOnboarding() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        // Profile
        landlord_type: 'individual',
        full_name: '',
        phone: '',
        company_name: '',
        // Verification
        identity_verified: false,
        business_verified: false,
        // Property
        property_title: '',
        property_address: '',
        property_city: '',
        property_state: '',
        property_zip: '',
        property_type: 'apartment',
        bedrooms: '',
        monthly_rent: '',
        deposit_amount: '',
        property_description: '',
        // Payment
        payment_setup_complete: false,
    });

    useEffect(() => {
        appClient.auth.me().then(u => {
            setUser(u);
            if (u.onboarding_completed) {
                navigate(createPageUrl('LandlordDashboard'));
            } else if (u.onboarding_step) {
                setCurrentStep(u.onboarding_step);
            }
        }).catch(() => { });
    }, []);

    const updateUserMutation = useMutation({
        mutationFn: (data) => appClient.auth.updateMe(data),
    });

    const createPropertyMutation = useMutation({
        mutationFn: (data) => appClient.entities.Property.create(data),
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
            // Update user profile
            await updateUserMutation.mutateAsync({
                user_type: 'landlord',
                full_name: formData.full_name,
                phone: formData.phone,
                company_name: formData.company_name,
                business_verified: formData.business_verified,
                onboarding_completed: true,
                onboarding_step: STEPS.length,
                total_properties: 1,
            });

            // Create first property
            if (formData.property_title) {
                await createPropertyMutation.mutateAsync({
                    title: formData.property_title,
                    address: formData.property_address,
                    city: formData.property_city,
                    state: formData.property_state,
                    zip_code: formData.property_zip,
                    property_type: formData.property_type,
                    bedrooms: parseInt(formData.bedrooms) || 0,
                    monthly_rent: parseFloat(formData.monthly_rent),
                    deposit_amount: parseFloat(formData.deposit_amount) || 0,
                    description: formData.property_description,
                    status: 'available',
                    landlord_id: user?.email,
                    flexible_payments: true,
                    accepts_bidding: false,
                });
            }

            queryClient.invalidateQueries();
            toast.success('Welcome to RentFlex!');
            navigate(createPageUrl('LandlordDashboard'));
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        }
    };

    const progress = ((currentStep + 1) / STEPS.length) * 100;
    const currentStepName = STEPS[currentStep];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Progress Bar */}
                {currentStep > 0 && currentStep < STEPS.length - 1 && (
                    <div className="max-w-2xl mx-auto mb-8">
                        <div className="flex justify-between text-sm text-slate-600 mb-2">
                            <span>Step {currentStep} of {STEPS.length - 2}</span>
                            <span>{Math.round(progress)}% Complete</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                )}

                {/* Steps */}
                <AnimatePresence mode="wait">
                    {currentStepName === 'welcome' && (
                        <WelcomeStep key="welcome" onNext={handleNext} />
                    )}
                    {currentStepName === 'profile' && (
                        <ProfileStep
                            key="profile"
                            data={formData}
                            onChange={setFormData}
                            onNext={handleNext}
                            onBack={handleBack}
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
                    {currentStepName === 'property' && (
                        <PropertyStep
                            key="property"
                            data={formData}
                            onChange={setFormData}
                            onNext={handleNext}
                            onBack={handleBack}
                        />
                    )}
                    {currentStepName === 'payment' && (
                        <PaymentSetupStep
                            key="payment"
                            data={formData}
                            onChange={setFormData}
                            onNext={handleNext}
                            onBack={handleBack}
                        />
                    )}
                    {currentStepName === 'complete' && (
                        <CompleteStep key="complete" onComplete={handleComplete} />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
