import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Users,
    Search,
    TrendingUp,
    CheckCircle2,
    Clock,
    XCircle,
    Download,
    SlidersHorizontal,
    Calendar,
    Gavel,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import ApplicationCard from '@/components/screening/ApplicationCard';
import ApplicationDetailsModal from '@/components/screening/ApplicationDetailsModal';
import StatsCard from '@/components/dashboard/StatsCard';

export default function ApplicationScreening() {
    const [user, setUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProperty, setSelectedProperty] = useState('all');
    const [minRentScore, setMinRentScore] = useState('0');
    const [sortBy, setSortBy] = useState('date_desc');
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [landlordNotes, setLandlordNotes] = useState('');
    const queryClient = useQueryClient();

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const isSysAdmin = user?.user_type === 'sysAdmin';
    const isTenant = user?.user_type === 'tenant';

    const { data: applications, isLoading } = useQuery({
        queryKey: ['applications', user?.email, user?.id, user?.user_type],
        queryFn: async () => {
            if (!user) return [];
            if (isSysAdmin) {
                return await appClient.entities.Application.list();
            }
            if (isTenant) {
                const byEmail = await appClient.entities.Application.filter({ tenant_id: user.email });
                const byId = user.id ? await appClient.entities.Application.filter({ tenant_id: user.id }) : [];
                const merged = [...byEmail, ...byId];
                return Array.from(new Map(merged.map(item => [item.id, item])).values());
            }
            const byEmail = await appClient.entities.Application.filter({ landlord_id: user.email });
            const byId = user.id ? await appClient.entities.Application.filter({ landlord_id: user.id }) : [];
            const merged = [...byEmail, ...byId];
            return Array.from(new Map(merged.map(item => [item.id, item])).values());
        },
        enabled: !!user?.email || !!user?.id,
    });

    const { data: properties } = useQuery({
        queryKey: ['landlordProperties', user?.email, user?.id, isSysAdmin],
        queryFn: async () => {
            if (!user) return [];
            if (isSysAdmin) return await appClient.entities.Property.list();
            const byEmail = await appClient.entities.Property.filter({ landlord_id: user.email });
            const byId = user.id ? await appClient.entities.Property.filter({ landlord_id: user.id }) : [];
            const merged = [...byEmail, ...byId];
            return Array.from(new Map(merged.map(item => [item.id, item])).values());
        },
        enabled: !!user?.email || !!user?.id,
    });

    // Tour Schedules Query
    const { data: tourSchedules = [] } = useQuery({
        queryKey: ['tourSchedules', user?.email, user?.id, isSysAdmin, isTenant],
        queryFn: async () => {
            if (!user) return [];
            try {
                const allTours = await appClient.entities.TourSchedule.list();
                if (!allTours || !Array.isArray(allTours)) return [];
                if (isSysAdmin) return allTours;
                if (isTenant) {
                    return allTours.filter(t => t.tenant_id === user.email || t.tenant_id === user.id);
                }
                return allTours.filter(t => t.landlord_id === user.email || t.landlord_id === user.id);
            } catch (err) {
                console.warn('Tour schedules query warning:', err);
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    // Property Bids Query
    const { data: bids = [] } = useQuery({
        queryKey: ['propertyBids', user?.email, user?.id, isSysAdmin, isTenant],
        queryFn: async () => {
            if (!user) return [];
            try {
                const allBids = await appClient.entities.Bid.list();
                if (!allBids || !Array.isArray(allBids)) return [];
                if (isSysAdmin) return allBids;
                if (isTenant) {
                    return allBids.filter(b => b.tenant_id === user.email || b.tenant_id === user.id || b.bidder_id === user.email);
                }
                const propIds = properties?.map(p => p.id) || [];
                return allBids.filter(b => propIds.includes(b.property_id));
            } catch (err) {
                console.warn('Property bids query warning:', err);
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    const updateApplicationMutation = useMutation({
        mutationFn: (/** @type {{ id: string, data: any }} */ { id, data }) => appClient.entities.Application.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            toast.success('Application updated successfully');
            setDetailsModalOpen(false);
        },
    });

    const updateTourMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const updated = await appClient.entities.TourSchedule.update(id, data);
            if (data.status === 'confirmed') {
                await appClient.entities.Message.create({
                    conversation_id: `${updated.tenant_id}_${updated.landlord_id}`,
                    sender_id: user?.email || 'user',
                    receiver_id: isTenant ? updated.landlord_id : updated.tenant_id,
                    content: `✅ Tour Schedule Confirmed! Viewing agreed for ${updated.requested_date} at ${updated.requested_time}.`
                }).catch(() => {});
            } else if (data.status === 'reschedule_requested') {
                await appClient.entities.Message.create({
                    conversation_id: `${updated.tenant_id}_${updated.landlord_id}`,
                    sender_id: user?.email || 'user',
                    receiver_id: isTenant ? updated.landlord_id : updated.tenant_id,
                    content: `🔄 Reschedule Proposed: Proposed viewing date ${data.reschedule_date} at ${data.reschedule_time}.`
                }).catch(() => {});
            } else if (data.status === 'declined') {
                await appClient.entities.Message.create({
                    conversation_id: `${updated.tenant_id}_${updated.landlord_id}`,
                    sender_id: user?.email || 'user',
                    receiver_id: isTenant ? updated.landlord_id : updated.tenant_id,
                    content: `❌ Tour Request Declined.`
                }).catch(() => {});
            }
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tourSchedules'] });
            toast.success('Tour schedule updated!');
        },
        onError: () => toast.error('Failed to update tour schedule')
    });

    const updateBidMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const updated = await appClient.entities.Bid.update(id, data);
            if (data.status === 'accepted') {
                await appClient.entities.Message.create({
                    conversation_id: `${updated.tenant_id}_${updated.landlord_id || user?.email}`,
                    sender_id: user?.email || 'landlord',
                    receiver_id: updated.tenant_id,
                    content: `🎉 Congratulations! Your bid of R${updated.proposed_rent?.toLocaleString()} for property listing has been ACCEPTED!`
                }).catch(() => {});
            } else if (data.status === 'countered') {
                await appClient.entities.Message.create({
                    conversation_id: `${updated.tenant_id}_${updated.landlord_id || user?.email}`,
                    sender_id: user?.email || 'landlord',
                    receiver_id: updated.tenant_id,
                    content: `💬 Counter Bid Offered: Landlord proposed R${data.proposed_rent?.toLocaleString()}/month.`
                }).catch(() => {});
            }
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['propertyBids'] });
            toast.success('Bid status updated!');
        },
        onError: () => toast.error('Failed to update bid')
    });

    const handleViewDetails = (application) => {
        setSelectedApplication(application);
        setLandlordNotes(application.landlord_notes || '');
        setDetailsModalOpen(true);
    };

    const handleQuickAction = async (applicationId, status) => {
        updateApplicationMutation.mutate({
            id: applicationId,
            data: { status }
        });

        if (status === 'approved') {
            const appToApprove = applications?.find(a => a.id === applicationId);
            if (appToApprove) {
                try {
                    await appClient.entities.Lease.create({
                        property_id: appToApprove.property_id,
                        property_title: appToApprove.property_title || 'Leased Property',
                        landlord_id: appToApprove.landlord_id || user?.email,
                        tenant_id: appToApprove.tenant_id,
                        monthly_rent: Number(appToApprove.monthly_rent || 0),
                        deposit_amount: Number(appToApprove.deposit_amount || 0),
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        status: 'active'
                    });
                    toast.success('🎉 Application approved & Active Lease automatically generated!');
                } catch (e) {
                    console.error('Lease generation error:', e);
                }
            }
        }
    };

    const handleApprove = async () => {
        if (!selectedApplication) return;
        
        // 1. Update application status
        updateApplicationMutation.mutate({
            id: selectedApplication.id,
            data: {
                status: 'approved',
                landlord_notes: landlordNotes
            }
        });

        // 2. Automatically generate active Lease contract in database
        try {
            await appClient.entities.Lease.create({
                property_id: selectedApplication.property_id,
                property_title: selectedApplication.property_title || 'Leased Property',
                landlord_id: selectedApplication.landlord_id || user?.email,
                tenant_id: selectedApplication.tenant_id,
                monthly_rent: Number(selectedApplication.monthly_rent || 0),
                deposit_amount: Number(selectedApplication.deposit_amount || 0),
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'active'
            });

            // 3. Create initial rent payment record
            await appClient.entities.Payment.create({
                tenant_id: selectedApplication.tenant_id,
                landlord_id: selectedApplication.landlord_id || user?.email,
                amount: Number(selectedApplication.monthly_rent || 0),
                due_date: new Date().toISOString().split('T')[0],
                status: 'pending',
                type: 'rent'
            });

            toast.success('🎉 Application approved & Active Lease automatically generated!');
        } catch (e) {
            console.error('Lease generation error:', e);
        }
    };

    const handleReject = () => {
        if (!selectedApplication) return;
        updateApplicationMutation.mutate({
            id: selectedApplication.id,
            data: {
                status: 'rejected',
                landlord_notes: landlordNotes
            }
        });
    };

    // Filter and sort applications
    const filteredApplications = applications?.filter(app => {
        const matchesSearch = !searchTerm ||
            app.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.tenant_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.property_title?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesProperty = selectedProperty === 'all' || app.property_id === selectedProperty;

        const matchesRentScore = !minRentScore || minRentScore === '0' ||
            (app.rentscore >= parseInt(minRentScore));

        return matchesSearch && matchesProperty && matchesRentScore;
    }) || [];

    const sortedApplications = [...filteredApplications].sort((a, b) => {
        switch (sortBy) {
            case 'date_desc':
                return new Date(b.created_date) - new Date(a.created_date);
            case 'date_asc':
                return new Date(a.created_date) - new Date(b.created_date);
            case 'rentscore_desc':
                return (b.rentscore || 0) - (a.rentscore || 0);
            case 'rentscore_asc':
                return (a.rentscore || 0) - (b.rentscore || 0);
            case 'income_desc':
                return (b.monthly_income || 0) - (a.monthly_income || 0);
            default:
                return 0;
        }
    });

    const pendingApplications = sortedApplications.filter(a => a.status === 'pending');
    const underReviewApplications = sortedApplications.filter(a => a.status === 'under_review');
    const approvedApplications = sortedApplications.filter(a => a.status === 'approved');
    const rejectedApplications = sortedApplications.filter(a => a.status === 'rejected');

    const avgRentScore = applications?.length > 0
        ? Math.round(applications.reduce((sum, app) => sum + (app.rentscore || 0), 0) / applications.length)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Application Screening</h1>
                <p className="text-slate-500 mt-1">Review and approve tenant applications</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatsCard
                    title="Pending Review"
                    value={pendingApplications.length}
                    subtitle="Awaiting decision"
                    icon={Clock}
                    color="amber"
                />
                <StatsCard
                    title="Under Review"
                    value={underReviewApplications.length}
                    subtitle="In screening"
                    icon={Users}
                    color="indigo"
                />
                <StatsCard
                    title="Approved"
                    value={approvedApplications.length}
                    subtitle="Ready to lease"
                    icon={CheckCircle2}
                    color="emerald"
                />
                <StatsCard
                    title="Avg RentScore"
                    value={avgRentScore}
                    subtitle="Of all applicants"
                    icon={TrendingUp}
                    color="indigo"
                />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 hover:border-slate-300/80 transition-all duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="lg:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search applicants..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {/* Property Filter */}
                    <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Properties" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Properties</SelectItem>
                            {properties?.map(property => (
                                <SelectItem key={property.id} value={property.id}>
                                    {property.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* RentScore Filter */}
                    <Select value={minRentScore} onValueChange={setMinRentScore}>
                        <SelectTrigger>
                            <SelectValue placeholder="Min RentScore" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">All Scores</SelectItem>
                            <SelectItem value="550">550+</SelectItem>
                            <SelectItem value="650">650+</SelectItem>
                            <SelectItem value="750">750+</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date_desc">Newest First</SelectItem>
                            <SelectItem value="date_asc">Oldest First</SelectItem>
                            <SelectItem value="rentscore_desc">Highest RentScore</SelectItem>
                            <SelectItem value="rentscore_asc">Lowest RentScore</SelectItem>
                            <SelectItem value="income_desc">Highest Income</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pending">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-transparent p-0 border-none gap-2">
                        <TabsTrigger value="pending" className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Pending
                            {pendingApplications.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                                    {pendingApplications.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="review" className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" />
                            Under Review
                            {underReviewApplications.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                    {underReviewApplications.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="tours" className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Tour Schedules
                            {tourSchedules.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-emerald-700 text-white text-xs rounded-full font-bold">
                                    {tourSchedules.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="bids" className="flex items-center gap-2">
                            <Gavel className="w-4 h-4" />
                            Property Bids
                            {bids.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-zinc-900 text-white text-xs rounded-full font-bold">
                                    {bids.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>

                <TabsContent value="pending" className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-64 rounded-2xl" />
                            ))}
                        </div>
                    ) : pendingApplications.length > 0 ? (
                        pendingApplications.map((app, idx) => (
                            <ApplicationCard
                                key={app.id}
                                application={app}
                                index={idx}
                                onView={handleViewDetails}
                                onQuickAction={handleQuickAction}
                            />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900 mb-1">No pending applications</h3>
                            <p className="text-slate-500">New applications will appear here</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="review" className="space-y-4">
                    {underReviewApplications.length > 0 ? (
                        underReviewApplications.map((app, idx) => (
                            <ApplicationCard
                                key={app.id}
                                application={app}
                                index={idx}
                                onView={handleViewDetails}
                                onQuickAction={handleQuickAction}
                            />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                            <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900 mb-1">No applications under review</h3>
                            <p className="text-slate-500">Move applications here for detailed screening</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="approved" className="space-y-4">
                    {approvedApplications.length > 0 ? (
                        approvedApplications.map((app, idx) => (
                            <ApplicationCard
                                key={app.id}
                                application={app}
                                index={idx}
                                onView={handleViewDetails}
                                onQuickAction={handleQuickAction}
                            />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                            <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900 mb-1">No approved applications</h3>
                            <p className="text-slate-500">Approved applications will appear here</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="rejected" className="space-y-4">
                    {rejectedApplications.length > 0 ? (
                        rejectedApplications.map((app, idx) => (
                            <ApplicationCard
                                key={app.id}
                                application={app}
                                index={idx}
                                onView={handleViewDetails}
                                onQuickAction={handleQuickAction}
                            />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                            <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900 mb-1">No rejected applications</h3>
                            <p className="text-slate-500">Rejected applications will appear here</p>
                        </div>
                    )}
                </TabsContent>

                {/* Tour Viewing Schedules Content */}
                <TabsContent value="tours" className="space-y-4">
                    {tourSchedules.length > 0 ? (
                        tourSchedules.map((tour) => (
                            <div key={tour.id} className="bg-white rounded-xl p-5 border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Badge className={`capitalize text-xs font-semibold ${
                                            tour.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                                            tour.status === 'reschedule_requested' ? 'bg-amber-100 text-amber-800' :
                                            tour.status === 'declined' ? 'bg-rose-100 text-rose-800' :
                                            'bg-zinc-100 text-zinc-800'
                                        }`}>
                                            Status: {tour.status}
                                        </Badge>
                                        <span className="text-xs font-medium text-zinc-500">Viewer: {tour.tenant_name || tour.tenant_id}</span>
                                    </div>
                                    <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-zinc-700" />
                                        Requested: {tour.requested_date} at {tour.requested_time}
                                    </h3>
                                    {tour.status === 'reschedule_requested' && (
                                        <p className="text-xs text-amber-700 font-semibold mt-1">
                                            Proposed Reschedule: {tour.reschedule_date} at {tour.reschedule_time} (by {tour.rescheduled_by})
                                        </p>
                                    )}
                                    {tour.notes && <p className="text-xs text-zinc-600 mt-1 italic">"{tour.notes}"</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                                        onClick={() => updateTourMutation.mutate({ id: tour.id, data: { status: 'confirmed' } })}
                                        disabled={tour.status === 'confirmed' || updateTourMutation.isPending}
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        Confirm
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-zinc-200 text-xs font-semibold"
                                        onClick={() => {
                                            const newDate = prompt('Enter proposed reschedule date (YYYY-MM-DD):', tour.requested_date);
                                            const newTime = prompt('Enter proposed reschedule time slot:', '11:00 AM');
                                            if (newDate && newTime) {
                                                updateTourMutation.mutate({
                                                    id: tour.id,
                                                    data: {
                                                        status: 'reschedule_requested',
                                                        reschedule_date: newDate,
                                                        reschedule_time: newTime,
                                                        rescheduled_by: user?.email || 'user'
                                                    }
                                                });
                                            }
                                        }}
                                        disabled={updateTourMutation.isPending}
                                    >
                                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                        Reschedule
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                                        onClick={() => updateTourMutation.mutate({ id: tour.id, data: { status: 'declined' } })}
                                        disabled={tour.status === 'declined' || updateTourMutation.isPending}
                                    >
                                        Decline
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900 mb-1">No tour viewing requests</h3>
                            <p className="text-slate-500">Requested property viewings will appear here</p>
                        </div>
                    )}
                </TabsContent>

                {/* Property Bids Content */}
                <TabsContent value="bids" className="space-y-4">
                    {bids.length > 0 ? (
                        bids.map((bid) => (
                            <div key={bid.id} className="bg-white rounded-xl p-5 border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Badge className={`capitalize text-xs font-semibold ${
                                            bid.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                                            bid.status === 'countered' ? 'bg-amber-100 text-amber-800' :
                                            bid.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                                            'bg-zinc-900 text-white'
                                        }`}>
                                            Bid: {bid.status}
                                        </Badge>
                                        <span className="text-xs font-medium text-zinc-500">Bidder: {bid.tenant_name || bid.tenant_id}</span>
                                    </div>
                                    <h3 className="font-bold text-base text-zinc-900">
                                        Proposed Rent: R{Number(bid.proposed_rent || bid.bid_amount || 0).toLocaleString()}/month
                                    </h3>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Move-in Date: {bid.move_in_date || 'Flexible'} • Lease Duration: {bid.lease_duration_months || 12} months
                                    </p>
                                    {bid.message && <p className="text-xs text-zinc-600 mt-1.5 italic">"{bid.message}"</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold"
                                        onClick={() => updateBidMutation.mutate({ id: bid.id, data: { status: 'accepted' } })}
                                        disabled={bid.status === 'accepted' || updateBidMutation.isPending}
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        Accept Bid
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-zinc-200 text-xs font-semibold"
                                        onClick={() => {
                                            const counterVal = prompt('Enter counter proposed rent amount (R):', String(bid.proposed_rent || 0));
                                            if (counterVal && !isNaN(parseFloat(counterVal))) {
                                                updateBidMutation.mutate({
                                                    id: bid.id,
                                                    data: {
                                                        status: 'countered',
                                                        proposed_rent: parseFloat(counterVal)
                                                    }
                                                });
                                            }
                                        }}
                                        disabled={updateBidMutation.isPending}
                                    >
                                        Counter
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                                        onClick={() => updateBidMutation.mutate({ id: bid.id, data: { status: 'rejected' } })}
                                        disabled={bid.status === 'rejected' || updateBidMutation.isPending}
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                            <Gavel className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900 mb-1">No property bids</h3>
                            <p className="text-slate-500">Competitive bids from prospective tenants will appear here</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Details Modal */}
            <ApplicationDetailsModal
                application={selectedApplication}
                open={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                notes={landlordNotes}
                onNotesChange={setLandlordNotes}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        </div>
    );
}
