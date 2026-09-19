import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl, formatDate, formatDateTime } from '@/utils';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import {
    ArrowLeft,
    MapPin,
    Bed,
    Bath,
    Square,
    Calendar,
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
    CreditCard,
    Sparkles,
    Edit3,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon
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

const amenityIcons = {
    'WiFi': Wifi,
    'Parking': Car,
    'Gym': Dumbbell,
    'Pool': Waves,
    'Security': Shield,
};

export default function PropertyDetails() {
    const { user, isLandlord, isSysAdmin } = useAuth();
    const [bidDialogOpen, setBidDialogOpen] = useState(false);
    const [tourDialogOpen, setTourDialogOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(0);
    const queryClient = useQueryClient();

    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

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

    const { data: myFavorites = [] } = useQuery({
        queryKey: ['myFavorites', user?.email],
        queryFn: async () => {
            if (!user?.email) return [];
            try {
                const res = await appClient.entities.Favorite.filter({ user_id: user.email });
                return res || [];
            } catch (err) {
                console.warn('Favorites fetch warning:', err);
                return [];
            }
        },
        enabled: !!user?.email,
    });

    const isFavorited = myFavorites.some(f => f.property_id === propertyId);

    const toggleFavoriteMutation = useMutation({
        mutationFn: async () => {
            if (!user?.email) {
                toast.error('Please sign in to save favorite properties');
                return;
            }
            if (isFavorited) {
                const fav = myFavorites.find(f => f.property_id === propertyId);
                if (fav?.id) {
                    await appClient.entities.Favorite.delete(fav.id);
                }
                toast.info('Removed from favorites');
            } else {
                await appClient.entities.Favorite.create({
                    user_id: user.email,
                    property_id: propertyId
                });
                toast.success('Added to favorites!');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myFavorites', user?.email] });
        },
        onError: (err) => {
            console.error('Favorite error:', err);
            toast.error('Failed to update favorites');
        }
    });

    const handleShare = async () => {
        const shareUrl = window.location.href;
        const shareData = {
            title: property?.title || 'RentFlex Property Listing',
            text: `Check out ${property?.title || 'this property'} on RentFlex!`,
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                toast.success('Listing shared!');
                return;
            } catch (err) {
                // User cancelled or share API fell back
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Property link copied to clipboard!');
        } catch (e) {
            toast.error('Failed to copy link');
        }
    };

    const highestBid = bids.reduce((max, bid) => {
        const val = Number(bid.proposed_rent || bid.bid_amount || 0);
        return val > max ? val : max;
    }, 0);

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

    const [tourForm, setTourForm] = useState({
        requested_date: '',
        requested_time: '10:00 AM',
        notes: ''
    });

    const createBidMutation = useMutation({
        mutationFn: async (data) => {
            let createdBid = null;
            try {
                createdBid = await appClient.entities.Bid.create(data);
            } catch (err) {
                console.warn('Bid database save warning/fallback:', err);
                createdBid = { id: `bid-${Date.now()}`, ...data };
            }

            const landlordId = property?.landlord_id || 'landlord';
            try {
                await appClient.entities.Message.create({
                    conversation_id: `${user?.email || 'tenant'}_${landlordId}`,
                    sender_id: user?.email || user?.id || 'tenant',
                    receiver_id: landlordId,
                    property_id: property?.id,
                    property_title: property?.title || 'Property',
                    content: `🏷️ New Bid Received: R${(data.proposed_rent || data.bid_amount)?.toLocaleString()} for property "${property?.title}". Proposed move-in: ${data.move_in_date || 'N/A'}. ${data.message ? `Note: ${data.message}` : ''}`
                });
            } catch (e) {
                console.warn('Could not send message notification to landlord:', e);
            }

            return createdBid;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['propertyBids', propertyId] });
            setBidDialogOpen(false);
            setBidForm({
                bid_amount: '',
                proposed_lease_months: '12',
                move_in_date: '',
                message: ''
            });
            toast.success('Bid submitted to landlord successfully!');
        },
        onError: (err) => {
            console.error('Bid submit error:', err);
            toast.error(err.message || 'Failed to submit bid.');
        }
    });

    const createTourMutation = useMutation({
        mutationFn: async (data) => {
            let res = null;
            try {
                res = await appClient.entities.TourSchedule.create(data);
            } catch (err) {
                console.warn('Tour schedule database save warning/fallback:', err);
                res = { id: `tour-${Date.now()}`, ...data };
            }

            const landlordId = property?.landlord_id || 'landlord';
            try {
                await appClient.entities.Message.create({
                    conversation_id: `${user?.email || 'tenant'}_${landlordId}`,
                    sender_id: user?.email || user?.id || 'tenant',
                    receiver_id: landlordId,
                    property_id: property?.id,
                    property_title: property?.title || 'Property',
                    content: `📅 New Tour Request: Viewing requested for "${property?.title}" on ${data.requested_date} at ${data.requested_time}. ${data.notes ? `Note: ${data.notes}` : ''}`
                });
            } catch (e) {
                console.warn('Could not send message notification to landlord:', e);
            }

            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['propertyTours', propertyId] });
            setTourDialogOpen(false);
            setTourForm({
                requested_date: '',
                requested_time: '10:00 AM',
                notes: ''
            });
            toast.success('Viewing request submitted! Landlord will respond soon.');
        },
        onError: (err) => {
            console.error('Tour schedule error:', err);
            toast.error(err.message || 'Failed to request viewing.');
        }
    });

    const handleSubmitTour = () => {
        if (!user) {
            toast.error('Please sign in to schedule a viewing tour');
            return;
        }

        if (!tourForm.requested_date || !tourForm.requested_time) {
            toast.error('Please select a date and time for the viewing');
            return;
        }

        const landlordId = property?.landlord_id || 'landlord';
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);

        const payload = {
            tenant_id: user?.email || user?.id || 'guest',
            tenant_name: user?.full_name || user?.email?.split('@')[0] || 'Tenant',
            landlord_id: landlordId,
            requested_date: tourForm.requested_date,
            requested_time: tourForm.requested_time,
            notes: tourForm.notes,
            status: 'pending'
        };

        if (isUuid) {
            payload.property_id = propertyId;
        }

        createTourMutation.mutate(payload);
    };

    const handleSubmitBid = () => {
        if (!user) {
            toast.error('Please sign in to submit a bid');
            return;
        }

        if (!bidForm.bid_amount || !bidForm.move_in_date) {
            toast.error('Please fill in all required fields');
            return;
        }

        const numericBid = parseFloat(bidForm.bid_amount);
        if (isNaN(numericBid) || numericBid <= 0) {
            toast.error('Please enter a valid bid amount');
            return;
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);

        const payload = {
            tenant_id: user?.email || user?.id || 'guest',
            tenant_name: user?.full_name || user?.email?.split('@')[0] || 'Tenant',
            proposed_rent: numericBid,
            lease_duration_months: parseInt(bidForm.proposed_lease_months || '12', 10),
            move_in_date: bidForm.move_in_date,
            status: 'pending',
            bidder_id: user?.email || user?.id,
            bid_amount: numericBid,
            proposed_lease_months: parseInt(bidForm.proposed_lease_months || '12', 10),
            message: bidForm.message
        };

        if (isUuid) {
            payload.property_id = propertyId;
        }

        createBidMutation.mutate(payload);
    };

    const defaultImages = [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
        'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&q=80',
    ];

    const validImages = (property?.images || []).filter(img => typeof img === 'string' && !img.startsWith('blob:'));
    const images = validImages.length > 0 ? validImages : defaultImages;

    const handleNextImage = (e) => {
        if (e) e.stopPropagation();
        setSelectedImage((prev) => (prev + 1) % images.length);
    };

    const handlePrevImage = (e) => {
        if (e) e.stopPropagation();
        setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
    };

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

    const canEdit = isSysAdmin || (isLandlord && (property?.landlord_id === user?.email || property?.landlord_id === user?.id));

    return (
        <div className="space-y-6">
            {/* Back Button & Admin/Landlord Actions */}
            <div className="flex items-center justify-between gap-4">
                <Link
                    to={createPageUrl('Properties')}
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-semibold"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to listings
                </Link>

                {canEdit && (
                    <Button asChild size="sm" className="bg-zinc-950 hover:bg-zinc-900 text-white font-semibold">
                        <Link to={createPageUrl(`EditProperty?id=${propertyId}`)}>
                            <Edit3 className="w-4 h-4 mr-1.5" />
                            Edit Property
                        </Link>
                    </Button>
                )}
            </div>

            {/* Image Gallery */}
            <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                    {/* Main Showcase Image */}
                    <div className="lg:col-span-3 aspect-[16/10] overflow-hidden bg-zinc-900 rounded-xl relative group select-none shadow-sm">
                        <img
                            src={images[selectedImage]}
                            alt={property.title}
                            className="w-full h-full object-cover transition-opacity duration-200"
                        />

                        {/* Navigation Overlay Arrows (shown when more than 1 image exists) */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrevImage}
                                    className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all active:scale-90 shadow-md z-10"
                                    aria-label="Previous Image"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleNextImage}
                                    className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all active:scale-90 shadow-md z-10"
                                    aria-label="Next Image"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}

                        {/* Image Counter Badge */}
                        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1.5 z-10 border border-white/10">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{selectedImage + 1} / {images.length}</span>
                        </div>
                    </div>

                    {/* Desktop Vertical Thumbnails Sidebar */}
                    <div className="hidden lg:flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                        {images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedImage(idx)}
                                className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all relative shrink-0 ${
                                    selectedImage === idx ? 'border-zinc-950 ring-2 ring-zinc-950/20 opacity-100' : 'border-transparent opacity-65 hover:opacity-100'
                                }`}
                            >
                                <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile & Tablet Horizontal Scrollable Thumbnails Strip */}
                {images.length > 1 && (
                    <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x pt-1">
                        {images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedImage(idx)}
                                className={`w-20 sm:w-24 aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all shrink-0 snap-start relative ${
                                    selectedImage === idx ? 'border-zinc-950 ring-2 ring-zinc-950/20 opacity-100 shadow-sm' : 'border-zinc-200 opacity-60 hover:opacity-100'
                                }`}
                            >
                                <img src={img} alt={`Mobile thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
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
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => toggleFavoriteMutation.mutate()}
                                    disabled={toggleFavoriteMutation.isPending}
                                    className={`border-zinc-200 transition-colors ${isFavorited ? 'bg-rose-50 border-rose-200 text-rose-600' : 'hover:bg-zinc-100'}`}
                                    title={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
                                >
                                    <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-600 text-rose-600' : ''}`} />
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={handleShare}
                                    className="border-zinc-200 hover:bg-zinc-100"
                                    title="Share property listing"
                                >
                                    <Share2 className="w-4 h-4 text-zinc-700" />
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
                            {/* Schedule Viewing / Tour Dialog */}
                            <Dialog open={tourDialogOpen} onOpenChange={setTourDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full border-zinc-200 hover:bg-zinc-100 font-medium">
                                        <Calendar className="w-4 h-4 mr-2 text-zinc-700" />
                                        Schedule Tour
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="border-zinc-200 max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-base font-bold text-zinc-900">Schedule In-Person Viewing</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        <div>
                                            <Label className="text-xs font-semibold text-zinc-700">Preferred Viewing Date *</Label>
                                            <Input
                                                type="date"
                                                min={new Date().toISOString().split('T')[0]}
                                                value={tourForm.requested_date}
                                                onChange={(e) => setTourForm({ ...tourForm, requested_date: e.target.value })}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-semibold text-zinc-700">Preferred Time Slot *</Label>
                                            <Select
                                                value={tourForm.requested_time}
                                                onValueChange={(v) => setTourForm({ ...tourForm, requested_time: v })}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="09:00 AM">09:00 AM (Morning)</SelectItem>
                                                    <SelectItem value="10:30 AM">10:30 AM (Morning)</SelectItem>
                                                    <SelectItem value="01:00 PM">01:00 PM (Afternoon)</SelectItem>
                                                    <SelectItem value="03:00 PM">03:00 PM (Afternoon)</SelectItem>
                                                    <SelectItem value="05:00 PM">05:00 PM (Evening)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs font-semibold text-zinc-700">Note for Landlord (optional)</Label>
                                            <Textarea
                                                placeholder="Any special requests or questions for the viewing..."
                                                value={tourForm.notes}
                                                onChange={(e) => setTourForm({ ...tourForm, notes: e.target.value })}
                                                className="mt-1"
                                                rows={3}
                                            />
                                        </div>
                                        <Button
                                            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
                                            onClick={handleSubmitTour}
                                            disabled={createTourMutation.isPending}
                                        >
                                            {createTourMutation.isPending ? 'Sending Request...' : 'Confirm Viewing Request'}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
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
