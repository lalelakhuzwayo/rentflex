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
            await appClient.entities.Contractor.create({
                ...data,
                user_id: user.id,
                service_areas: data.service_areas.split(',').map(s => s.trim()),
                years_experience: parseFloat(data.years_experience)
            });

            // Update user type
            await appClient.auth.updateMe({ user_type: 'contractor' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['my-contractor-profile']);
            toast.success('Profile created successfully!');
            navigate(createPageUrl('ContractorSubscription'));
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
