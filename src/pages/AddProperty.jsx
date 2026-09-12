import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, X, ArrowLeft, Building2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const AMENITIES_OPTIONS = [
    'Parking', 'WiFi', 'Pool', 'Gym', 'Security', 'Pet Friendly',
    'Laundry', 'Air Conditioning', 'Heating', 'Balcony', 'Garden',
    'Furnished', 'Dishwasher', 'Elevator', 'Storage'
];

export default function AddProperty() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const propertyId = searchParams.get('id');
    const isEditing = Boolean(propertyId);

    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        property_type: 'apartment',
        bedrooms: 1,
        bathrooms: 1,
        sqft: '',
        monthly_rent: '',
        deposit_amount: '',
        min_rentscore: 600,
        amenities: [],
        images: [],
        description: '',
        available_date: '',
        status: 'available',
        accepts_bidding: false,
        bidding_ends: '',
        flexible_payments: true
    });

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => navigate(createPageUrl('Welcome')));
    }, [navigate]);

    // Fetch property data if in edit mode
    const { data: existingProperty, isLoading: loadingProperty } = useQuery({
        queryKey: ['property-edit', propertyId],
        queryFn: () => appClient.entities.Property.get(propertyId),
        enabled: !!propertyId
    });

    useEffect(() => {
        if (existingProperty) {
            setFormData({
                title: existingProperty.title || '',
                address: existingProperty.address || '',
                city: existingProperty.city || '',
                state: existingProperty.state || '',
                zip_code: existingProperty.zip_code || '',
                property_type: existingProperty.property_type || 'apartment',
                bedrooms: existingProperty.bedrooms || 1,
                bathrooms: existingProperty.bathrooms || 1,
                sqft: existingProperty.sqft || '',
                monthly_rent: existingProperty.monthly_rent || '',
                deposit_amount: existingProperty.deposit_amount || '',
                min_rentscore: existingProperty.min_rentscore || 600,
                amenities: Array.isArray(existingProperty.amenities) ? existingProperty.amenities : [],
                images: Array.isArray(existingProperty.images) ? existingProperty.images : [],
                description: existingProperty.description || '',
                available_date: existingProperty.available_date || '',
                status: existingProperty.status || 'available',
                accepts_bidding: Boolean(existingProperty.accepts_bidding),
                bidding_ends: existingProperty.bidding_ends || '',
                flexible_payments: existingProperty.flexible_payments !== false
            });
        }
    }, [existingProperty]);

    const savePropertyMutation = useMutation({
        mutationFn: (data) => {
            if (isEditing && propertyId) {
                return appClient.entities.Property.update(propertyId, data);
            }
            return appClient.entities.Property.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            queryClient.invalidateQueries({ queryKey: ['properties-list'] });
            queryClient.invalidateQueries({ queryKey: ['myProperties'] });
            toast.success(isEditing ? 'Property updated successfully!' : 'Property added successfully!');
            navigate(createPageUrl('Properties'));
        },
        onError: (error) => {
            toast.error(isEditing ? 'Failed to update property' : 'Failed to add property');
            console.error(error);
        }
    });

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = files.map(file =>
                appClient.integrations.Core.UploadFile({ file })
            );
            const results = await Promise.all(uploadPromises);
            const imageUrls = results.map(r => r.file_url);

            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...imageUrls]
            }));
            toast.success(`${files.length} image(s) uploaded`);
        } catch (error) {
            toast.error('Failed to upload images');
            console.error(error);
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

    const toggleAmenity = (amenity) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter(a => a !== amenity)
                : [...prev.amenities, amenity]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.title || !formData.address || !formData.monthly_rent) {
            toast.error('Please fill in all required fields');
            return;
        }

        const landlordId = existingProperty?.landlord_id || user?.email || user?.id || 'landlord';

        const propertyData = {
            ...formData,
            landlord_id: landlordId,
            bedrooms: Number(formData.bedrooms || 0),
            bathrooms: Number(formData.bathrooms || 0),
            sqft: Number(formData.sqft || 0),
            monthly_rent: Number(formData.monthly_rent || 0),
            deposit_amount: Number(formData.deposit_amount || 0),
            min_rentscore: Number(formData.min_rentscore || 600)
        };

        savePropertyMutation.mutate(propertyData);
    };

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate(createPageUrl('Properties'))}
                    className="mb-4 text-zinc-600 hover:text-zinc-900"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Properties
                </Button>
                <div className="flex items-center gap-3">
                    <Building2 className="w-7 h-7 text-zinc-900" />
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                        {isEditing ? 'Edit Property Details' : 'Add New Property'}
                    </h1>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                    {isEditing ? 'Update rent prices, photos, description, and status' : 'Fill in the information below to list your property'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <Card className="sharp-card bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-zinc-900">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-xs font-semibold text-zinc-700">Property Title *</Label>
                            <Input
                                placeholder="e.g. Modern 2-Bedroom Luxury Apartment in Sea Point"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Address *</Label>
                                <Input
                                    placeholder="123 Beach Road"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">City / Suburb *</Label>
                                <Input
                                    placeholder="Cape Town"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    required
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Province / State</Label>
                                <Input
                                    placeholder="Western Cape"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Postal / Zip Code</Label>
                                <Input
                                    placeholder="8005"
                                    value={formData.zip_code}
                                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Property Type</Label>
                                <Select
                                    value={formData.property_type}
                                    onValueChange={(val) => setFormData({ ...formData, property_type: val })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="apartment">Apartment</SelectItem>
                                        <SelectItem value="house">House</SelectItem>
                                        <SelectItem value="condo">Condo</SelectItem>
                                        <SelectItem value="townhouse">Townhouse</SelectItem>
                                        <SelectItem value="studio">Studio</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {isEditing && (
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700 block mb-1">Listing Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">Available (Public)</SelectItem>
                                        <SelectItem value="rented">Rented / Occupied</SelectItem>
                                        <SelectItem value="pending">Pending Application</SelectItem>
                                        <SelectItem value="unlisted">Unlisted / Private</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Details & Pricing */}
                <Card className="sharp-card bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-zinc-900">Property Features & Financials</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Bedrooms</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.bedrooms}
                                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Bathrooms</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={formData.bathrooms}
                                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Square Feet / Meters (m²)</Label>
                                <Input
                                    type="number"
                                    placeholder="85"
                                    value={formData.sqft}
                                    onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Monthly Rent (ZAR) *</Label>
                                <Input
                                    type="number"
                                    placeholder="15000"
                                    value={formData.monthly_rent}
                                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Deposit Amount (ZAR)</Label>
                                <Input
                                    type="number"
                                    placeholder="15000"
                                    value={formData.deposit_amount}
                                    onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700">Min. RentScore Required</Label>
                                <Input
                                    type="number"
                                    placeholder="600"
                                    value={formData.min_rentscore}
                                    onChange={(e) => setFormData({ ...formData, min_rentscore: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Photos & Description */}
                <Card className="sharp-card bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-zinc-900">Photos & Description</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-xs font-semibold text-zinc-700">Property Photos</Label>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {formData.images.map((url, idx) => (
                                    <div key={idx} className="relative h-28 rounded-lg overflow-hidden border border-zinc-200 group">
                                        <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1.5 right-1.5 p-1 bg-zinc-950/80 text-white rounded-full hover:bg-zinc-950"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}

                                <label className="h-28 border-2 border-dashed border-zinc-300 hover:border-zinc-900 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors text-center p-2">
                                    <Upload className="w-5 h-5 text-zinc-500 mb-1" />
                                    <span className="text-xs font-semibold text-zinc-700">
                                        {uploading ? 'Uploading...' : 'Upload Photos'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold text-zinc-700">Description</Label>
                            <Textarea
                                placeholder="Describe key highlights, neighborhood attractions, transport access..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="mt-1"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Amenities */}
                <Card className="sharp-card bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-zinc-900">Amenities & Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {AMENITIES_OPTIONS.map((amenity) => {
                                const selected = formData.amenities.includes(amenity);
                                return (
                                    <button
                                        key={amenity}
                                        type="button"
                                        onClick={() => toggleAmenity(amenity)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                            selected
                                                ? 'border-zinc-950 bg-zinc-950 text-white'
                                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                                        }`}
                                    >
                                        {selected && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                                        {amenity}
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(createPageUrl('Properties'))}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={savePropertyMutation.isPending}
                        className="bg-zinc-950 hover:bg-zinc-900 text-white px-8 font-semibold"
                    >
                        {savePropertyMutation.isPending
                            ? (isEditing ? 'Saving Changes...' : 'Listing Property...')
                            : (isEditing ? 'Save Changes' : 'Create Property Listing')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
