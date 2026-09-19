import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
    Search,
    SlidersHorizontal,
    Building2,
    Home,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Plus,
    ShieldCheck,
    Filter,
    Layers
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import PropertyCard from '@/components/properties/PropertyCard';

export default function Properties() {
    const { user, role, isLandlord, isSysAdmin } = useAuth();

    const [viewTab, setViewTab] = useState('marketplace');
    const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);

    useEffect(() => {
        if (!hasUserSelectedTab) {
            if (isLandlord) setViewTab('my_properties');
            else if (isSysAdmin) setViewTab('all_system');
            else setViewTab('marketplace');
        }
    }, [isLandlord, isSysAdmin, hasUserSelectedTab]);

    const [searchTerm, setSearchTerm] = useState('');
    const [propertyType, setPropertyType] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priceRange, setPriceRange] = useState([0, 50000]);
    const [bedrooms, setBedrooms] = useState('any');
    const [showBiddingOnly, setShowBiddingOnly] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const landlordIdentifier = user?.email || user?.id;

    // Fetch all properties cleanly from database with offline cache support
    const { data: allProperties = [], isLoading } = useQuery({
        queryKey: ['properties-list-all'],
        queryFn: async () => {
            try {
                const list = await appClient.entities.Property.list();
                return list || [];
            } catch (err) {
                console.error('Properties fetch error:', err);
                return [];
            }
        },
    });

    const sampleFeaturedProperties = [
        {
            id: 'sample-1',
            title: 'Modern Executive Apartment',
            address: '12 Mandela Drive',
            city: 'Emalahleni',
            state: 'Mpumalanga',
            zip_code: '1035',
            property_type: 'apartment',
            bedrooms: 2,
            bathrooms: 1,
            sqft: 850,
            monthly_rent: 7500,
            deposit_amount: 7500,
            min_rentscore: 550,
            status: 'available',
            accepts_bidding: true,
            landlord_id: 'landlord',
            amenities: ['Parking', 'WiFi', 'Pool', 'Security'],
            images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80']
        },
        {
            id: 'sample-2',
            title: 'Luxury Family Residence',
            address: '45 Sandton Drive',
            city: 'Johannesburg',
            state: 'Gauteng',
            zip_code: '2196',
            property_type: 'house',
            bedrooms: 3,
            bathrooms: 2,
            sqft: 1400,
            monthly_rent: 14500,
            deposit_amount: 14500,
            min_rentscore: 650,
            status: 'available',
            accepts_bidding: false,
            landlord_id: 'landlord',
            amenities: ['Garden', 'Security', 'Parking', 'Pool'],
            images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80']
        }
    ];

    // Determine target properties to display based on viewTab & landlord matching
    const targetProperties = React.useMemo(() => {
        const rawList = allProperties.length > 0 ? allProperties : sampleFeaturedProperties;

        if (isLandlord && viewTab === 'my_properties') {
            const myProps = rawList.filter(p => {
                if (!p.landlord_id || p.landlord_id === 'landlord') return true;
                if (user?.email && (p.landlord_id === user.email || p.owner_email === user.email || String(p.landlord_id).toLowerCase() === String(user.email).toLowerCase())) return true;
                if (user?.id && (p.landlord_id === user.id || p.owner_id === user.id)) return true;
                return false;
            });
            return myProps.length > 0 ? myProps : rawList;
        }

        if (isSysAdmin || viewTab === 'all_system') {
            return rawList;
        }

        // Marketplace view: filter out unlisted
        const activeOnly = rawList.filter(p => !p.status || String(p.status).toLowerCase() !== 'unlisted');
        return activeOnly.length > 0 ? activeOnly : rawList;
    }, [allProperties, isLandlord, isSysAdmin, viewTab, user]);

    const displayPropertiesList = targetProperties || [];

    const filteredProperties = displayPropertiesList.filter(property => {
        const matchesSearch = !searchTerm ||
            property.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            property.city?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = propertyType === 'all' || property.property_type === propertyType;

        const matchesStatus = statusFilter === 'all' || 
            (property.status && String(property.status).toLowerCase() === String(statusFilter).toLowerCase());

        const rent = Number(property.monthly_rent || 0);
        const matchesPrice = rent >= priceRange[0] && (priceRange[1] >= 50000 || rent <= priceRange[1]);

        const matchesBedrooms = bedrooms === 'any' ||
            (bedrooms === '4+' ? property.bedrooms >= 4 : property.bedrooms === parseInt(bedrooms));

        const matchesBidding = !showBiddingOnly || property.accepts_bidding;

        return matchesSearch && matchesType && matchesStatus && matchesPrice && matchesBedrooms && matchesBidding;
    }) || [];

    // Reset pagination when search/filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, propertyType, statusFilter, priceRange, bedrooms, showBiddingOnly, viewTab]);

    const totalPages = Math.max(1, Math.ceil(filteredProperties.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProperties = filteredProperties.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage) => {
        const page = Math.max(1, Math.min(newPage, totalPages));
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const activeFiltersCount = [
        propertyType !== 'all',
        statusFilter !== 'all',
        bedrooms !== 'any',
        priceRange[0] > 0 || priceRange[1] < 50000,
        showBiddingOnly
    ].filter(Boolean).length;

    const clearFilters = () => {
        setPropertyType('all');
        setStatusFilter('all');
        setBedrooms('any');
        setPriceRange([0, 50000]);
        setShowBiddingOnly(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                        {isLandlord && viewTab === 'my_properties'
                            ? 'My Managed Properties'
                            : isSysAdmin
                                ? 'System Properties Directory'
                                : 'Explore Rental Properties'}
                    </h1>
                    <p className="text-zinc-500 text-xs mt-0.5">
                        {isLandlord && viewTab === 'my_properties'
                            ? 'Manage your rental portfolio, tenant listings, and property statuses'
                            : isSysAdmin
                                ? 'Full administrative access to all properties across the platform'
                                : 'Browse available listings and submit competitive bids'}
                    </p>
                </div>

                {/* Add Property Button for Landlords & Admins */}
                {(isLandlord || isSysAdmin) && (
                    <Button asChild className="bg-zinc-950 hover:bg-zinc-900 text-white font-semibold shadow-sm">
                        <Link to={createPageUrl('AddProperty')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Property
                        </Link>
                    </Button>
                )}
            </div>

            {/* View Selection Tabs for Landlords & Admins */}
            {(isLandlord || isSysAdmin) && (
                <div className="flex border-b border-zinc-200">
                    {isLandlord && (
                        <button
                            type="button"
                            onClick={() => {
                                setViewTab('my_properties');
                                setHasUserSelectedTab(true);
                            }}
                            className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                                viewTab === 'my_properties'
                                    ? 'border-zinc-950 text-zinc-950'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                            }`}
                        >
                            <Building2 className="w-4 h-4 text-zinc-900" />
                            My Managed Properties
                            <Badge className="bg-zinc-900 text-white text-[10px] ml-1">
                                {isLandlord && viewTab === 'my_properties' ? targetProperties.length : 'Mine'}
                            </Badge>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setViewTab(isSysAdmin ? 'all_system' : 'marketplace');
                            setHasUserSelectedTab(true);
                        }}
                        className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                            viewTab !== 'my_properties'
                                ? 'border-zinc-950 text-zinc-950'
                                : 'border-transparent text-zinc-500 hover:text-zinc-800'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        {isSysAdmin ? 'All System Properties' : 'Marketplace Listings'}
                    </button>
                </div>
            )}

            {/* Search & Filters */}
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-zinc-200/80 hover:border-zinc-300 transition-colors duration-150">
                <div className="flex flex-col sm:flex-row gap-2.5">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input
                            placeholder="Search by location, suburb, or address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 bg-zinc-50/80 text-sm border-zinc-200/80 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-900"
                        />
                    </div>

                    {/* Quick Filters */}
                    <div className="flex gap-2">
                        {(isLandlord || isSysAdmin) && (
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-28 h-10 text-xs rounded-lg border-zinc-200/80">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="rented">Rented</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        <Select value={propertyType} onValueChange={setPropertyType}>
                            <SelectTrigger className="w-32 h-10 text-xs rounded-lg border-zinc-200/80">
                                <Building2 className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="apartment">Apartment</SelectItem>
                                <SelectItem value="house">House</SelectItem>
                                <SelectItem value="condo">Condo</SelectItem>
                                <SelectItem value="townhouse">Townhouse</SelectItem>
                                <SelectItem value="studio">Studio</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={bedrooms} onValueChange={setBedrooms}>
                            <SelectTrigger className="w-24 h-10 text-xs rounded-lg border-zinc-200/80">
                                <SelectValue placeholder="Beds" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="any">Any Beds</SelectItem>
                                <SelectItem value="1">1 Bed</SelectItem>
                                <SelectItem value="2">2 Beds</SelectItem>
                                <SelectItem value="3">3 Beds</SelectItem>
                                <SelectItem value="4+">4+ Beds</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* More Filters Sheet */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="h-10 text-xs rounded-lg border-zinc-200/80 relative">
                                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                                    Filters
                                    {activeFiltersCount > 0 && (
                                        <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-zinc-900 text-white rounded-full">
                                            {activeFiltersCount}
                                        </Badge>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle className="text-base font-bold text-zinc-900">Filter Properties</SheetTitle>
                                </SheetHeader>
                                <div className="mt-6 space-y-6">
                                    {/* Price Range */}
                                    <div>
                                        <label className="text-sm font-medium text-zinc-700 mb-3 block">
                                            Price Range: R{(priceRange?.[0] ?? 0).toLocaleString()} - R{(priceRange?.[1] ?? 50000).toLocaleString()}
                                        </label>
                                        <Slider
                                            value={priceRange}
                                            onValueChange={setPriceRange}
                                            min={0}
                                            max={50000}
                                            step={500}
                                            className="mt-2"
                                        />
                                    </div>

                                    {/* Bidding Only */}
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-zinc-700">
                                            Show bidding properties only
                                        </label>
                                        <button
                                            onClick={() => setShowBiddingOnly(!showBiddingOnly)}
                                            className={`w-11 h-6 rounded-full transition-colors ${showBiddingOnly ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${showBiddingOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>

                                    {/* Clear Filters */}
                                    <Button variant="outline" className="w-full" onClick={clearFilters}>
                                        Clear All Filters
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                {/* Active Filter Tags */}
                {activeFiltersCount > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-zinc-100">
                        {propertyType !== 'all' && (
                            <Badge variant="secondary" className="bg-zinc-100 text-zinc-700">
                                {propertyType}
                                <button onClick={() => setPropertyType('all')} className="ml-1">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                        {statusFilter !== 'all' && (
                            <Badge variant="secondary" className="bg-zinc-100 text-zinc-700">
                                {statusFilter}
                                <button onClick={() => setStatusFilter('all')} className="ml-1">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                        {bedrooms !== 'any' && (
                            <Badge variant="secondary" className="bg-zinc-100 text-zinc-700">
                                {bedrooms} beds
                                <button onClick={() => setBedrooms('any')} className="ml-1">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                        {(priceRange[0] > 0 || priceRange[1] < 50000) && (
                            <Badge variant="secondary" className="bg-zinc-100 text-zinc-700">
                                R{priceRange[0]} - R{priceRange[1]}
                                <button onClick={() => setPriceRange([0, 50000])} className="ml-1">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                        {showBiddingOnly && (
                            <Badge variant="secondary" className="bg-zinc-900 text-white">
                                Bidding only
                                <button onClick={() => setShowBiddingOnly(false)} className="ml-1">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                        <button
                            onClick={clearFilters}
                            className="text-sm text-zinc-500 hover:text-zinc-700"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Results Count & Range */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-slate-600">
                <p>
                    Showing <span className="font-semibold text-slate-900">{filteredProperties.length > 0 ? startIndex + 1 : 0}</span> to{' '}
                    <span className="font-semibold text-slate-900">{Math.min(startIndex + itemsPerPage, filteredProperties.length)}</span> of{' '}
                    <span className="font-semibold text-slate-900">{filteredProperties.length}</span> properties found
                </p>
                {totalPages > 1 && (
                    <p className="text-zinc-500 font-medium">
                        Page <span className="text-zinc-900 font-bold">{currentPage}</span> of {totalPages}
                    </p>
                )}
            </div>

            {/* Properties Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-80 rounded-2xl" />
                    ))}
                </div>
            ) : paginatedProperties.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedProperties.map((property, idx) => (
                            <PropertyCard key={property.id} property={property} index={idx} />
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-zinc-200">
                            <div className="text-xs text-zinc-500">
                                Showing page {currentPage} of {totalPages}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(1)}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 p-0 border-zinc-200"
                                    title="First Page"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="h-8 px-2.5 text-xs border-zinc-200 flex items-center gap-1"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    <span className="hidden xs:inline">Previous</span>
                                </Button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                                        .map((page, idx, arr) => {
                                            const prev = arr[idx - 1];
                                            return (
                                                <React.Fragment key={page}>
                                                    {prev && page - prev > 1 && (
                                                        <span className="text-xs text-zinc-400 px-1">...</span>
                                                    )}
                                                    <Button
                                                        variant={currentPage === page ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => handlePageChange(page)}
                                                        className={`h-8 w-8 p-0 text-xs font-semibold ${
                                                            currentPage === page
                                                                ? 'bg-zinc-950 text-white hover:bg-zinc-900 border-zinc-950'
                                                                : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                                                        }`}
                                                    >
                                                        {page}
                                                    </Button>
                                                </React.Fragment>
                                            );
                                        })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="h-8 px-2.5 text-xs border-zinc-200 flex items-center gap-1"
                                >
                                    <span className="hidden xs:inline">Next</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8 p-0 border-zinc-200"
                                    title="Last Page"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-white rounded-xl border border-zinc-200 p-8"
                >
                    <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                        <Home className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">No properties found</h3>
                    <p className="text-zinc-500 text-xs mb-6">
                        {isLandlord && viewTab === 'my_properties'
                            ? "You haven't listed any properties under your landlord account yet."
                            : 'Try adjusting your filters or search criteria.'}
                    </p>
                    <div className="flex justify-center gap-3">
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                            Clear Filters
                        </Button>
                        {isLandlord && (
                            <Button asChild size="sm" className="bg-zinc-950 hover:bg-zinc-900 text-white">
                                <Link to={createPageUrl('AddProperty')}>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Your First Property
                                </Link>
                            </Button>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
