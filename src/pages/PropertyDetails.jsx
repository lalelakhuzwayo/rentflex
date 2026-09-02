import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl, formatDate, formatDateTime } from '@/utils';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    MapPin,
    Bed,
    Bath,
    Square,
    Calendar,
    TrendingUp,
    Gavel,
    Clock,
    Heart,
    Share2,
    CheckCircle2,
    Wifi,
    Car,
    Dumbbell,
    Waves,
    Shield,
    DollarSign,
    CreditCard,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import RentScoreGauge from '@/components/dashboard/RentScoreGauge';

const amenityIcons = {
    'WiFi': Wifi,
    'Parking': Car,
    'Gym': Dumbbell,
    'Pool': Waves,
    'Security': Shield,
};

export default function PropertyDetails() {
    const [user, setUser] = useState(null);
    const [bidDialogOpen, setBidDialogOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(0);
    const queryClient = useQueryClient();

    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const { data: property, isLoading } = useQuery({
        queryKey: ['property', propertyId],
        queryFn: async () => {
            const properties = await appClient.entities.Property.filter({ id: propertyId });
            return properties?.[0] || null;
        },
        enabled: !!propertyId,
    });

    const { data: bids = [] } = useQuery({
        queryKey: ['propertyBids', propertyId],
        queryFn: async () => {
            const res = await appClient.entities.Bid.filter({ property_id: propertyId });
            return res || [];
        },
        enabled: !!propertyId,
    });

    const { data: rentScore } = useQuery({
        queryKey: ['myRentScore', user?.email],
        queryFn: async () => {
            const scores = await appClient.entities.RentScore.filter({ user_id: user?.email });
            return scores?.[0] || null;
        },
        enabled: !!user?.email,
    });

    const [bidForm, setBidForm] = useState({
        bid_amount: '',
        proposed_lease_months: '12',
        move_in_date: '',
        message: ''
    });

    const createBidMutation = useMutation({
        mutationFn: (data) => appClient.entities.Bid.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['propertyBids', propertyId] });
            setBidDialogOpen(false);
            toast.success('Bid submitted successfully!');
        },
    });

    const handleSubmitBid = () => {
        if (!bidForm.bid_amount || !bidForm.move_in_date) {
            toast.error('Please fill in all required fields');
            return;
        }

        createBidMutation.mutate({
            property_id: propertyId,
            bidder_id: user?.email,
            bid_amount: parseFloat(bidForm.bid_amount),
            proposed_lease_months: parseInt(bidForm.proposed_lease_months),
            move_in_date: bidForm.move_in_date,
            message: bidForm.message,
            bidder_rentscore: rentScore?.score || 0,
            status: 'pending'
        });
    };

    const defaultImages = [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
        'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&q=80',
    ];

    const images = property?.images?.length ? property.images : defaultImages;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-96 rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 lg:col-span-2 rounded-2xl" />
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="text-center py-16">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Property not found</h2>
                <Link to={createPageUrl('Properties')}>
                    <Button variant="outline">Back to Properties</Button>
                </Link>
            </div>
        );
    }

    const highestBid = bids?.length ? Math.max(...bids.map(b => b.bid_amount)) : property.monthly_rent;

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link
                to={createPageUrl('Properties')}
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to listings
            </Link>

            {/* Image Gallery */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-3 aspect-[16/10] overflow-hidden bg-zinc-100">
                    <img
                        src={images[selectedImage]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="hidden lg:flex flex-col gap-3">
                    {images.slice(0, 3).map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedImage(idx)}
                            className={`aspect-[4/3] overflow-hidden border transition-colors ${selectedImage === idx ? 'border-zinc-900' : 'border-transparent'
                                }`}
                        >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Property Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                        {property.status}
                                    </Badge>
                                    {property.accepts_bidding && (
                                        <Badge className="bg-zinc-900 text-white border-zinc-800 flex items-center gap-1">
                                            <Gavel className="w-3 h-3" />
                                            Accepting Bids
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="text-2xl font-bold text-zinc-900">{property.title}</h1>
                                <div className="flex items-center gap-1 text-zinc-500 text-xs mt-2">
                                    <MapPin className="w-4 h-4" />
                                    {property.address}, {property.city}, {property.state} {property.zip_code}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" className="border-zinc-200">
                                    <Heart className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="border-zinc-200">
                                    <Share2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 py-4 border-y border-zinc-100">
                            {property.bedrooms && (
                                <div className="flex items-center gap-2">
                                    <Bed className="w-4 h-4 text-zinc-400" />
                                    <span className="font-semibold text-xs text-zinc-900">{property.bedrooms} Beds</span>
                                </div>
                            )}
                            {property.bathrooms && (
                                <div className="flex items-center gap-2">
                                    <Bath className="w-4 h-4 text-zinc-400" />
                                    <span className="font-semibold text-xs text-zinc-900">{property.bathrooms} Baths</span>
                                </div>
                            )}
                            {property.sqft && (
                                <div className="flex items-center gap-2">
                                    <Square className="w-4 h-4 text-zinc-400" />
                                    <span className="font-semibold text-xs text-zinc-900">{property.sqft} sqft</span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {property.description && (
                            <div className="mt-6">
                                <h3 className="font-bold text-sm text-zinc-900 mb-2">About This Property</h3>
                                <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                                    {property.description}
                                </p>
                            </div>
                        )}

                        {/* Amenities */}
                        {property.amenities && property.amenities.length > 0 && (
                            <div className="mt-6">
                                <h3 className="font-bold text-sm text-zinc-900 mb-3">Amenities & Features</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {property.amenities.map((amenity, idx) => {
                                        const Icon = amenityIcons[amenity] || Sparkles;
                                        return (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="bg-zinc-50 text-zinc-700 border border-zinc-200/60 p-2.5 flex items-center gap-2 text-xs font-normal"
                                            >
                                                <Icon className="w-4 h-4 text-zinc-500" />
                                                {amenity}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bidding Section */}
                    {property.accepts_bidding && (
                        <div className="sharp-card bg-zinc-950 p-6 text-white border border-transparent hover:border-zinc-700">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-zinc-900 text-white flex items-center justify-center border border-zinc-800">
                                    <Gavel className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white">Competitive Bidding</h3>
                                    <p className="text-xs text-zinc-400">Place your best offer to secure this property</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-zinc-900 p-4 border border-zinc-800">
                                    <p className="text-xs text-zinc-400">Starting Price</p>
                                    <p className="text-lg font-bold text-white">R{(property.monthly_rent ?? 0).toLocaleString()}/mo</p>
                                </div>
                                <div className="bg-zinc-900 p-4 border border-zinc-800">
                                    <p className="text-xs text-zinc-400">Current Highest</p>
                                    <p className="text-lg font-bold text-white">R{(highestBid ?? property.monthly_rent ?? 0).toLocaleString()}/mo</p>
                                </div>
                            </div>

                            {property.bidding_ends && (
                                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
                                    <Clock className="w-4 h-4" />
                                    <span>Bidding ends: {formatDateTime(property.bidding_ends)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Pricing Card */}
                    <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200 sticky top-24">
                        <div className="text-center mb-6">
                            <p className="text-xs text-zinc-500">Monthly Rent</p>
                            <p className="text-2xl font-bold text-zinc-900">R{(property.monthly_rent ?? 0).toLocaleString()}</p>
                            {property.deposit_amount && (
                                <p className="text-xs text-zinc-500 mt-1">
                                    Deposit: R{(property.deposit_amount ?? 0).toLocaleString()}
                                </p>
                            )}
                        </div>

                        {/* RentScore Requirement */}
                        {property.min_rentscore && (
                            <div className="bg-zinc-50 p-4 mb-6 border border-zinc-200/60">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-zinc-700">Min. RentScore Required</span>
                                    <span className="font-bold text-xs text-zinc-900">{property.min_rentscore}</span>
                                </div>
                                {rentScore && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-zinc-500">Your Score:</span>
                                        <span className={`font-semibold ${rentScore.score >= property.min_rentscore ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {rentScore.score}
                                        </span>
                                        {rentScore.score >= property.min_rentscore ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                        ) : (
                                            <span className="text-[10px] text-rose-700">(Not qualified)</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Flexible Payments */}
                        {property.flexible_payments && (
                            <div className="flex items-center gap-2 text-xs text-emerald-700 mb-6">
                                <CreditCard className="w-4 h-4" />
                                Flexible payment options available
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            {property.accepts_bidding ? (
                                <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                            <Gavel className="w-4 h-4 mr-2" />
                                            Place a Bid
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="border-zinc-200">
                                        <DialogHeader>
                                            <DialogTitle className="text-base font-bold text-zinc-900">Place Your Bid</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 mt-4">
                                            <div>
                                                <Label className="text-xs font-semibold text-zinc-700">Your Bid Amount (R/month)</Label>
                                                <Input
                                                    type="number"
                                                    placeholder={`Min: R${property.monthly_rent}`}
                                                    value={bidForm.bid_amount}
                                                    onChange={(e) => setBidForm({ ...bidForm, bid_amount: e.target.value })}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs font-semibold text-zinc-700">Lease Duration</Label>
                                                <Select
                                                    value={bidForm.proposed_lease_months}
                                                    onValueChange={(v) => setBidForm({ ...bidForm, proposed_lease_months: v })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="6">6 months</SelectItem>
                                                        <SelectItem value="12">12 months</SelectItem>
                                                        <SelectItem value="18">18 months</SelectItem>
                                                        <SelectItem value="24">24 months</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-xs font-semibold text-zinc-700">Desired Move-in Date</Label>
                                                <Input
                                                    type="date"
                                                    value={bidForm.move_in_date}
                                                    onChange={(e) => setBidForm({ ...bidForm, move_in_date: e.target.value })}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs font-semibold text-zinc-700">Message to Landlord (optional)</Label>
                                                <Textarea
                                                    placeholder="Introduce yourself..."
                                                    value={bidForm.message}
                                                    onChange={(e) => setBidForm({ ...bidForm, message: e.target.value })}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <Button
                                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                                                onClick={handleSubmitBid}
                                                disabled={createBidMutation.isPending}
                                            >
                                                {createBidMutation.isPending ? 'Submitting...' : 'Submit Bid'}
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                    Apply Now
                                </Button>
                            )}
                            <Button variant="outline" className="w-full border-zinc-200">
                                Schedule Tour
                            </Button>
                        </div>
                        {/* Available Date */}
                        {property.available_date && (
                            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center gap-2 text-xs text-zinc-500">
                                <Calendar className="w-4 h-4" />
                                Available from {formatDate(property.available_date)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
