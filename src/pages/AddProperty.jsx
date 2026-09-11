import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const AMENITIES_OPTIONS = [
    'Parking', 'WiFi', 'Pool', 'Gym', 'Security', 'Pet Friendly',
    'Laundry', 'Air Conditioning', 'Heating', 'Balcony', 'Garden',
    'Furnished', 'Dishwasher', 'Elevator', 'Storage'
];

export default function AddProperty() {
    const navigate = useNavigate();
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
    }, []);

    const createPropertyMutation = useMutation({
        mutationFn: (data) => appClient.entities.Property.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            toast.success('Property added successfully!');
            navigate(createPageUrl('LandlordDashboard'));
        },
        onError: (error) => {
            toast.error('Failed to add property');
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

        const landlordId = user?.email || user?.id || 'landlord';

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

        createPropertyMutation.mutate(propertyData);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate(createPageUrl('LandlordDashboard'))}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>
                <h1 className="text-3xl font-bold text-slate-900">Add New Property</h1>
                <p className="text-slate-600 mt-2">List your property and start receiving applications</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="title">Property Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Modern 2BR Apartment in City Center"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe your property..."
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="property_type">Property Type</Label>
                                <Select
                                    value={formData.property_type}
                                    onValueChange={(value) => setFormData({ ...formData, property_type: value })}
                                >
                                    <SelectTrigger>
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

                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">Available</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="rented">Rented</SelectItem>
                                        <SelectItem value="unlisted">Unlisted</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Location */}
                <Card>
                    <CardHeader>
                        <CardTitle>Location</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="address">Street Address *</Label>
                            <Input
                                id="address"
                                placeholder="123 Main Street"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    placeholder="Cape Town"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="state">State/Province</Label>
                                <Input
                                    id="state"
                                    placeholder="Western Cape"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="zip_code">Zip/Postal Code</Label>
                                <Input
                                    id="zip_code"
                                    placeholder="8001"
                                    value={formData.zip_code}
                                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Property Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Property Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="bedrooms">Bedrooms</Label>
                                <Input
                                    id="bedrooms"
                                    type="number"
                                    min="0"
                                    value={formData.bedrooms}
                                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="bathrooms">Bathrooms</Label>
                                <Input
                                    id="bathrooms"
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={formData.bathrooms}
                                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="sqft">Square Feet</Label>
                                <Input
                                    id="sqft"
                                    type="number"
                                    placeholder="1200"
                                    value={formData.sqft}
                                    onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pricing & Requirements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="monthly_rent">Monthly Rent (R) *</Label>
                                <Input
                                    id="monthly_rent"
                                    type="number"
                                    placeholder="15000"
                                    value={formData.monthly_rent}
                                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="deposit_amount">Deposit Amount (R)</Label>
                                <Input
                                    id="deposit_amount"
                                    type="number"
                                    placeholder="15000"
                                    value={formData.deposit_amount}
                                    onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="min_rentscore">Minimum RentScore</Label>
                            <Input
                                id="min_rentscore"
                                type="number"
                                min="300"
                                max="850"
                                placeholder="600"
                                value={formData.min_rentscore}
                                onChange={(e) => setFormData({ ...formData, min_rentscore: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="available_date">Available From</Label>
                            <Input
                                id="available_date"
                                type="date"
                                value={formData.available_date}
                                onChange={(e) => setFormData({ ...formData, available_date: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Features */}
                <Card>
                    <CardHeader>
                        <CardTitle>Features & Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Accept Bidding</Label>
                                <p className="text-sm text-slate-500">Allow tenants to place bids on this property</p>
                            </div>
                            <Switch
                                checked={formData.accepts_bidding}
                                onCheckedChange={(checked) => setFormData({ ...formData, accepts_bidding: checked })}
                            />
                        </div>

                        {formData.accepts_bidding && (
                            <div>
                                <Label htmlFor="bidding_ends">Bidding Ends</Label>
                                <Input
                                    id="bidding_ends"
                                    type="datetime-local"
                                    value={formData.bidding_ends}
                                    onChange={(e) => setFormData({ ...formData, bidding_ends: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Flexible Payments</Label>
                                <p className="text-sm text-slate-500">Allow weekly/bi-weekly payment schedules</p>
                            </div>
                            <Switch
                                checked={formData.flexible_payments}
                                onCheckedChange={(checked) => setFormData({ ...formData, flexible_payments: checked })}
                            />
                        </div>

                        <div>
                            <Label>Amenities</Label>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {AMENITIES_OPTIONS.map(amenity => (
                                    <Badge
                                        key={amenity}
                                        variant={formData.amenities.includes(amenity) ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => toggleAmenity(amenity)}
                                    >
                                        {amenity}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Images */}
                <Card>
                    <CardHeader>
                        <CardTitle>Property Images</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                                <input
                                    type="file"
                                    id="images"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                                <label htmlFor="images" className="cursor-pointer">
                                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                    <p className="text-slate-600 font-medium">
                                        {uploading ? 'Uploading...' : 'Click to upload images'}
                                    </p>
                                    <p className="text-sm text-slate-400 mt-1">PNG, JPG up to 10MB each</p>
                                </label>
                            </div>

                            {formData.images.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {formData.images.map((url, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={url}
                                                alt={`Property ${index + 1}`}
                                                className="w-full h-32 object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(createPageUrl('LandlordDashboard'))}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={createPropertyMutation.isPending}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
                    >
                        {createPropertyMutation.isPending ? 'Adding Property...' : 'Add Property'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
