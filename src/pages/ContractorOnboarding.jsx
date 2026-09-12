import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function ContractorOnboarding() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);

    const [formData, setFormData] = useState({
        company_name: '',
        description: '',
        services: [],
        years_experience: '',
        license_number: '',
        phone: '',
        service_areas: ''
    });

    useEffect(() => {
        appClient.auth.me().then(setUser);
    }, []);

    const serviceOptions = [
        'plumbing', 'electrical', 'hvac', 'painting',
        'carpentry', 'cleaning', 'landscaping', 'roofing', 'general'
    ];

    const createProfileMutation = useMutation({
        mutationFn: async (data) => {
            const userId = user?.id || user?.email;
            if (!userId) throw new Error('User session not found');

            const serviceAreasList = typeof data.service_areas === 'string' 
                ? data.service_areas.split(',').map(s => s.trim()).filter(Boolean)
                : (data.service_areas || []);

            const mainTradeCategory = (Array.isArray(data.services) && data.services.length > 0)
                ? data.services[0]
                : 'general';

            const payload = {
                user_id: userId,
                business_name: data.company_name?.trim() || 'Contractor',
                company_name: data.company_name?.trim() || 'Contractor',
                trade_category: mainTradeCategory,
                services: data.services || [],
                description: data.description?.trim() || '',
                years_experience: parseFloat(data.years_experience) || 1,
                phone: data.phone?.trim() || '',
                license_number: data.license_number?.trim() || null,
                service_areas: serviceAreasList,
                rating: 5.0,
                subscription_status: 'pro'
            };

            // Check if profile already exists for this user_id
            const existingProfiles = await appClient.entities.Contractor.filter({ user_id: userId });
            if (existingProfiles && existingProfiles.length > 0) {
                await appClient.entities.Contractor.update(existingProfiles[0].id, payload);
            } else {
                await appClient.entities.Contractor.create(payload);
            }

            // Update user type in Auth Profile
            await appClient.auth.updateMe({ user_type: 'contractor' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-contractor-profile'] });
            toast.success('Contractor profile saved successfully!');
            navigate(createPageUrl('ContractorDashboard'));
        },
        onError: (err) => {
            console.error('Contractor profile setup error:', err);
            toast.error(err.message || 'Failed to save contractor profile.');
        }
    });

    const toggleService = (service) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.includes(service)
                ? prev.services.filter(s => s !== service)
                : [...prev.services, service]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.services.length === 0) {
            toast.error('Please select at least one service');
            return;
        }
        createProfileMutation.mutate(formData);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Contractor Profile Setup</h1>
                <p className="text-slate-600">Complete your profile to start bidding on jobs</p>
            </div>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label>Company Name</Label>
                        <Input
                            placeholder="Your Company Name"
                            value={formData.company_name}
                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <Label>Description</Label>
                        <Textarea
                            placeholder="Tell us about your business and experience..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                        />
                    </div>

                    <div>
                        <Label className="mb-3 block">Services Offered</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {serviceOptions.map(service => (
                                <div key={service} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.services.includes(service)}
                                        onCheckedChange={() => toggleService(service)}
                                    />
                                    <label className="text-sm capitalize cursor-pointer" onClick={() => toggleService(service)}>
                                        {service}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Years of Experience</Label>
                            <Input
                                type="number"
                                placeholder="5"
                                value={formData.years_experience}
                                onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label>Phone Number</Label>
                            <Input
                                type="tel"
                                placeholder="+27 123 456 7890"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label>License Number (Optional)</Label>
                        <Input
                            placeholder="123456"
                            value={formData.license_number}
                            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label>Service Areas (comma separated)</Label>
                        <Input
                            placeholder="Cape Town, Johannesburg, Durban"
                            value={formData.service_areas}
                            onChange={(e) => setFormData({ ...formData, service_areas: e.target.value })}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={createProfileMutation.isPending}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                    >
                        {createProfileMutation.isPending ? 'Creating Profile...' : 'Complete Profile'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
