import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Wrench, Upload, X, Droplet, Zap, Wind, Paintbrush, Hammer, Sparkles, Trees, Home } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

const categoryIcons = {
    plumbing: Droplet,
    electrical: Zap,
    hvac: Wind,
    painting: Paintbrush,
    carpentry: Hammer,
    cleaning: Sparkles,
    landscaping: Trees,
    roofing: Home,
    general: Wrench
};

export default function PostJob() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        property_id: '',
        category: 'general',
        budget_min: 1000,
        budget_max: 10000,
        urgency: 'medium',
        preferred_start_date: '',
        images: []
    });

    useEffect(() => {
        appClient.auth.me().then(setUser);
    }, []);

    const { data: properties = [] } = useQuery({
        queryKey: ['user-properties'],
        queryFn: async () => {
            const user = await appClient.auth.me();
            if (user.user_type === 'landlord') {
                return await appClient.entities.Property.filter({ landlord_id: user.id });
            } else {
                const leases = await appClient.entities.Lease.filter({ tenant_id: user.id, status: 'active' });
                return await Promise.all(leases.map(lease =>
                    appClient.entities.Property.filter({ id: lease.property_id })
                )).then(results => results.flat());
            }
        },
        enabled: !!user
    });

    const createJobMutation = useMutation({
        mutationFn: async (jobData) => {
            const property = properties.find(p => p.id === jobData.property_id);
            return appClient.entities.Job.create({
                ...jobData,
                posted_by_id: user.id,
                posted_by_name: user.full_name,
                posted_by_type: user.user_type,
                property_title: property?.title,
                property_address: property?.address
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['jobs']);
            toast.success('Job posted successfully!');
            navigate(createPageUrl('Jobs'));
        }
    });

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        setUploading(true);

        try {
            const uploadedUrls = await Promise.all(
                files.map(async (file) => {
                    const result = await appClient.integrations.Core.UploadFile({ file });
                    return result.file_url;
                })
            );

            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...uploadedUrls]
            }));
        } catch (error) {
            toast.error('Failed to upload images');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        createJobMutation.mutate(formData);
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Post a Service Job</h1>
                <p className="text-slate-600">Get competitive bids from verified contractors</p>
            </div>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label>Property</Label>
                        <Select value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                                {properties.map(property => (
                                    <SelectItem key={property.id} value={property.id}>
                                        {property.title} - {property.address}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Job Title</Label>
                        <Input
                            placeholder="e.g., Fix leaking kitchen faucet"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <Label>Description</Label>
                        <Textarea
                            placeholder="Provide detailed information about the job..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={5}
                            required
                        />
                    </div>

                    <div>
                        <Label className="mb-3 block">Service Category</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(categoryIcons).map(([cat, Icon]) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, category: cat })}
                                    className={`flex flex-col items-center gap-2 p-4 border transition-all ${formData.category === cat
                                            ? 'border-zinc-900 bg-zinc-50 text-zinc-900 font-bold'
                                            : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-xs font-medium capitalize">{cat}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-zinc-700">Urgency</Label>
                        <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="mb-2 block text-xs font-semibold text-zinc-700">Budget Range: R{formData.budget_min.toLocaleString()} - R{formData.budget_max.toLocaleString()}</Label>
                        <div className="px-2">
                            <Slider
                                min={500}
                                max={50000}
                                step={500}
                                value={[formData.budget_min, formData.budget_max]}
                                onValueChange={(values) => setFormData({ ...formData, budget_min: values[0], budget_max: values[1] })}
                                className="mb-2"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-zinc-700">Preferred Start Date</Label>
                        <Input
                            type="date"
                            value={formData.preferred_start_date}
                            onChange={(e) => setFormData({ ...formData, preferred_start_date: e.target.value })}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-zinc-700">Photos</Label>
                        <div className="mt-2">
                            <label className="flex items-center justify-center w-full h-28 border border-dashed border-zinc-300 cursor-pointer hover:border-zinc-900 transition-colors">
                                <div className="text-center">
                                    <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-1.5" />
                                    <p className="text-xs text-zinc-600">
                                        {uploading ? 'Uploading...' : 'Click to upload images'}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        {formData.images.length > 0 && (
                            <div className="grid grid-cols-4 gap-3 mt-3">
                                {formData.images.map((url, index) => (
                                    <div key={index} className="relative group">
                                        <img src={url} alt="" className="w-full h-20 object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-zinc-900 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(createPageUrl('Jobs'))}
                            className="flex-1 border-zinc-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createJobMutation.isPending}
                            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
                        >
                            <Wrench className="w-4 h-4 mr-2" />
                            {createJobMutation.isPending ? 'Posting...' : 'Post Job'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
