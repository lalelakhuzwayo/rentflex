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
    RefreshCw,
    FileText
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
import { getViewedItemIds, markItemsAsViewed } from '@/utils/realtimeNotificationManager';
import { initiateLeaseFromAcceptedBid } from '@/utils/leaseManager';

const isValidUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);


export default function ApplicationScreening() {
    const [user, setUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProperty, setSelectedProperty] = useState('all');
    const [minRentScore, setMinRentScore] = useState('0');
    const [sortBy, setSortBy] = useState('date_desc');
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [landlordNotes, setLandlordNotes] = useState('');
    const [viewedVersion, setViewedVersion] = useState(0);
    const queryClient = useQueryClient();

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    useEffect(() => {
        const handleItemsViewed = () => {
            setViewedVersion(v => v + 1);
        };
        window.addEventListener('rentflex:items-viewed', handleItemsViewed);
        return () => window.removeEventListener('rentflex:items-viewed', handleItemsViewed);
    }, []);

    const isSysAdmin = user?.user_type === 'sysAdmin';
    const isTenant = user?.user_type === 'tenant';

    const { data: applications = [], isLoading } = useQuery({
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

    const { data: properties = [] } = useQuery({
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

    // Helper to check if tour date/time has passed
    const isTourPassed = (t) => {
        if (!t?.requested_date) return false;
        try {
            const timeStr = t.requested_time ? t.requested_time.replace(/(AM|PM)/i, ' $1') : '23:59';
            const dt = new Date(`${t.requested_date} ${timeStr}`);
            return !isNaN(dt.getTime()) && dt < new Date();
        } catch (_) {
            return false;
        }
    };

    // Tour Schedules Query
    const { data: tourSchedules = [] } = useQuery({
        queryKey: ['tourSchedules', user?.email, user?.id, isSysAdmin, isTenant, properties?.length || 0],
        queryFn: async () => {
            if (!user) return [];
            try {
                const allTours = await appClient.entities.TourSchedule.list();
                if (!allTours || !Array.isArray(allTours)) return [];
                if (isSysAdmin) return allTours;
                const myEmail = user.email?.toLowerCase().trim();
                const myId = user.id;
                const propIds = properties?.map(p => String(p.id)) || [];

                if (isTenant) {
                    return allTours.filter(t => 
                        (t.tenant_id && (t.tenant_id.toLowerCase() === myEmail || t.tenant_id === myId))
                    );
                }
                return allTours.filter(t => 
                    (t.landlord_id && (t.landlord_id.toLowerCase() === myEmail || t.landlord_id === myId)) ||
                    (t.property_id && propIds.includes(String(t.property_id)))
                );
            } catch (err) {
                console.warn('Tour schedules query warning:', err);
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    // Property Bids Query
    const { data: bids = [] } = useQuery({
        queryKey: ['propertyBids', user?.email, user?.id, isSysAdmin, isTenant, properties?.length || 0],
        queryFn: async () => {
            if (!user) return [];
            try {
                const allBids = await appClient.entities.Bid.list();
                if (!allBids || !Array.isArray(allBids)) return [];
                if (isSysAdmin) return allBids;
                const myEmail = user.email?.toLowerCase().trim();
                const myId = user.id;
                const propIds = properties?.map(p => String(p.id)) || [];

                if (isTenant) {
                    return allBids.filter(b => 
                        (b.tenant_id && (b.tenant_id.toLowerCase() === myEmail || b.tenant_id === myId)) ||
                        (b.bidder_id && (b.bidder_id.toLowerCase() === myEmail || b.bidder_id === myId))
                    );
                }
                return allBids.filter(b => 
                    (b.landlord_id && (b.landlord_id.toLowerCase() === myEmail || b.landlord_id === myId)) ||
                    (b.property_id && propIds.includes(String(b.property_id)))
                );
            } catch (err) {
                console.warn('Property bids query warning:', err);
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    const updateApplicationMutation = useMutation({
        mutationFn: async (/** @type {{ id: string, data: any }} */ { id, data }) => {
            const updated = await appClient.entities.Application.update(id, data);
            const msgContent = data.status === 'approved'
                ? `🎉 Application Approved! Your application for "${updated.property_title || 'rental property'}" has been APPROVED!`
                : data.status === 'rejected'
                    ? `❌ Application Declined: Your application for "${updated.property_title || 'rental property'}" was not approved.`
                    : data.status === 'under_review'
                        ? `📋 Application Under Review for "${updated.property_title || 'rental property'}".`
                        : null;

            if (msgContent) {
                const targetTenant = updated.tenant_id || updated.applicant_email;
                await appClient.entities.Message.create({
                    conversation_id: `app_${updated.id}`,
                    sender_id: user?.email || user?.id || 'landlord',
                    receiver_id: targetTenant || 'tenant',
                    content: msgContent
                }).catch(() => {});

                if (targetTenant && (updated.landlord_id || user?.email)) {
                    await appClient.entities.Message.create({
                        conversation_id: `${targetTenant}_${updated.landlord_id || user?.email}`,
                        sender_id: user?.email || user?.id || 'landlord',
                        receiver_id: targetTenant,
                        content: msgContent
                    }).catch(() => {});
                }
            }
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
            toast.success('Application updated successfully');
            setDetailsModalOpen(false);
        },
    });

    const updateTourMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const updated = await appClient.entities.TourSchedule.update(id, data);
            const msgContent = data.status === 'confirmed'
                ? `✅ Tour Schedule Confirmed! Viewing agreed for ${updated.requested_date} at ${updated.requested_time}.`
                : data.status === 'completed'
                    ? `🏆 Viewing Completed! Landlord marked the tour on ${updated.requested_date} as completed.`
                    : data.status === 'reschedule_requested'
                        ? `🔄 Reschedule Proposed: Proposed viewing date ${data.reschedule_date || updated.requested_date} at ${data.reschedule_time || updated.requested_time}.`
                        : data.status === 'declined'
                            ? `❌ Tour Request Declined.`
                            : null;

            if (msgContent) {
                const targetReceiver = isTenant ? updated.landlord_id : updated.tenant_id;
                await appClient.entities.Message.create({
                    conversation_id: `tour_${updated.id}`,
                    sender_id: user?.email || 'user',
                    receiver_id: targetReceiver || 'user',
                    content: msgContent
                }).catch(() => {});

                if (updated.tenant_id && updated.landlord_id) {
                    await appClient.entities.Message.create({
                        conversation_id: `${updated.tenant_id}_${updated.landlord_id}`,
                        sender_id: user?.email || 'user',
                        receiver_id: targetReceiver || 'user',
                        content: msgContent
                    }).catch(() => {});
                }
            }
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tourSchedules'] });
            queryClient.invalidateQueries({ queryKey: ['messages-tours'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
            toast.success('Tour schedule updated!');
        },
        onError: () => toast.error('Failed to update tour schedule')
    });

    // Create E-Lease from Bid Mutation
    const createLeaseFromBidMutation = useMutation({
        mutationFn: async (bid) => {
            const res = await initiateLeaseFromAcceptedBid({
                bid,
                landlordUser: user,
                queryClient
            });
            return res.lease;
        },
        onSuccess: () => {
            toast.success('🎉 Bid Accepted & E-Lease Initiated! Property is now reserved & off the market.');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to generate digital e-lease');
        }
    });

    const updateBidMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            if (data.status === 'accepted') {
                const targetBid = bids.find(b => String(b.id) === String(id)) || { id, ...data };
                const res = await initiateLeaseFromAcceptedBid({
                    bid: { ...targetBid, ...data },
                    landlordUser: user,
                    queryClient
                });
                return res.bid;
            }

            const updated = await appClient.entities.Bid.update(id, data);
            const msgContent = data.status === 'countered'
                ? `💬 Counter Bid Offered: Landlord proposed R${data.proposed_rent?.toLocaleString()}/month.`
                : data.status === 'rejected'
                    ? `❌ Property Bid Declined for "${updated.property_title || 'listing'}".`
                    : null;

            if (msgContent) {
                const targetTenant = updated.tenant_id || updated.bidder_id;
                await appClient.entities.Message.create({
                    conversation_id: `bid_${updated.id}`,
                    sender_id: user?.email || 'landlord',
                    receiver_id: targetTenant || 'tenant',
                    content: msgContent
                }).catch(() => {});

                if (targetTenant && (updated.landlord_id || user?.email)) {
                    await appClient.entities.Message.create({
                        conversation_id: `${targetTenant}_${updated.landlord_id || user?.email}`,
                        sender_id: user?.email || 'landlord',
                        receiver_id: targetTenant,
                        content: msgContent
                    }).catch(() => {});
                }
            }
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['propertyBids'] });
            queryClient.invalidateQueries({ queryKey: ['messages-bids'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
            queryClient.invalidateQueries({ queryKey: ['leases'] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            toast.success('Bid status updated!');
        },
        onError: () => toast.error('Failed to update bid')
    });


    const viewedSet = React.useMemo(() => {
        return getViewedItemIds(user?.email || user?.id);
    }, [user, viewedVersion]);

    const unviewedTours = React.useMemo(() => {
        return tourSchedules.filter(t => 
            (t.status === 'pending' || t.status === 'reschedule_requested') &&
            !viewedSet.has(`tour_${t.id}`) &&
            !viewedSet.has(String(t.id))
        );
    }, [tourSchedules, viewedSet]);

    const unviewedBids = React.useMemo(() => {
        return bids.filter(b => 
            b.status === 'pending' &&
            !viewedSet.has(`bid_${b.id}`) &&
            !viewedSet.has(String(b.id))
        );
    }, [bids, viewedSet]);

    const handleTabChange = (val) => {
        if (val === 'tours' && tourSchedules.length > 0) {
            const ids = tourSchedules.flatMap(t => [t.id, `tour_${t.id}`]);
            markItemsAsViewed(user?.email || user?.id, ids);
        } else if (val === 'bids' && bids.length > 0) {
            const ids = bids.flatMap(b => [b.id, `bid_${b.id}`]);
            markItemsAsViewed(user?.email || user?.id, ids);
        }
    };

    const handleViewDetails = (application) => {
        setSelectedApplication(application);
        setLandlordNotes(application.landlord_notes || '');
        setDetailsModalOpen(true);
        if (user && application?.id) {
            markItemsAsViewed(user.email || user.id, [application.id, `app_${application.id}`]);
        }
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
                        property_id: isValidUuid(appToApprove.property_id) ? appToApprove.property_id : null,
                        property_title: appToApprove.property_title || 'Leased Property',
                        landlord_id: appToApprove.landlord_id || user?.email,
                        landlord_name: user?.full_name || 'Landlord',
                        tenant_id: appToApprove.tenant_id,
                        tenant_name: appToApprove.tenant_name || 'Tenant',
                        monthly_rent: Number(appToApprove.monthly_rent || 0),
                        deposit_amount: Number(appToApprove.deposit_amount || 0),
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        status: 'pending_tenant_signature',
                        signed: false,
                        tenant_signature: null,
                        tenant_signed_at: null,
                        landlord_signature: null,
                        landlord_signed_at: null
                    });

                    // Send instant message to tenant
                    await appClient.entities.Message.create({
                        conversation_id: `app_${appToApprove.id}`,
                        sender_id: user?.email || user?.id || 'landlord',
                        receiver_id: appToApprove.tenant_id,
                        content: `📄 Application Approved! Your digital e-lease for "${appToApprove.property_title || 'Property'}" has been prepared and sent for your signature. The signing process has begun — please review and sign in your Leases portal.`
                    }).catch(() => {});

                    toast.success('🎉 Application approved & Digital E-Lease sent to tenant for signature!');
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

        // 2. Automatically generate digital E-Lease contract in database for signing
        try {
            await appClient.entities.Lease.create({
                property_id: isValidUuid(selectedApplication.property_id) ? selectedApplication.property_id : null,
                property_title: selectedApplication.property_title || 'Leased Property',
                landlord_id: selectedApplication.landlord_id || user?.email,
                landlord_name: user?.full_name || 'Landlord',
                tenant_id: selectedApplication.tenant_id,
                tenant_name: selectedApplication.tenant_name || 'Tenant',
                monthly_rent: Number(selectedApplication.monthly_rent || 0),
                deposit_amount: Number(selectedApplication.deposit_amount || 0),
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'pending_tenant_signature',
                signed: false,
                tenant_signature: null,
                tenant_signed_at: null,
                landlord_signature: null,
                landlord_signed_at: null
            });

            // 3. Send instant message to tenant
            await appClient.entities.Message.create({
                conversation_id: `app_${selectedApplication.id}`,
                sender_id: user?.email || user?.id || 'landlord',
                receiver_id: selectedApplication.tenant_id,
                content: `📄 Application Approved! Your digital e-lease for "${selectedApplication.property_title || 'Property'}" has been prepared and sent for your signature. The signing process has begun — please review and sign in your Leases portal.`
            }).catch(() => {});

            toast.success('🎉 Application approved & Digital E-Lease issued for tenant signature!');
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
            <Tabs defaultValue="pending" onValueChange={handleTabChange}>
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-transparent p-0 border-none gap-2 flex-wrap">
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
                        <TabsTrigger value="approved" className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Approved
                            {approvedApplications.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded-full font-bold">
                                    {approvedApplications.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="tours" className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Tour Schedules
                            {unviewedTours.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-emerald-700 text-white text-xs rounded-full font-bold">
                                    {unviewedTours.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="bids" className="flex items-center gap-2">
                            <Gavel className="w-4 h-4" />
                            Property Bids
                            {unviewedBids.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-zinc-900 text-white text-xs rounded-full font-bold">
                                    {unviewedBids.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Declined
                            {rejectedApplications.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-rose-600 text-white text-xs rounded-full font-bold">
                                    {rejectedApplications.length}
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
                                    {tour.status === 'pending' && (
                                        <Button
                                            size="sm"
                                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                                            onClick={() => updateTourMutation.mutate({ id: tour.id, data: { status: 'confirmed' } })}
                                            disabled={updateTourMutation.isPending}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                            Confirm
                                        </Button>
                                    )}
                                    {(tour.status === 'confirmed' || (isTourPassed(tour) && tour.status !== 'completed' && tour.status !== 'declined')) && (
                                        <Button
                                            size="sm"
                                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                                            onClick={() => updateTourMutation.mutate({ id: tour.id, data: { status: 'completed' } })}
                                            disabled={tour.status === 'completed' || updateTourMutation.isPending}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                            Mark as Complete
                                        </Button>
                                    )}
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
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    {bid.status === 'pending' && (
                                        <Button
                                            size="sm"
                                            className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold"
                                            onClick={() => updateBidMutation.mutate({ id: bid.id, data: { status: 'accepted' } })}
                                            disabled={updateBidMutation.isPending}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                            Accept Bid
                                        </Button>
                                    )}
                                    {(bid.status === 'accepted' || bid.status === 'pending') && (
                                        <Button
                                            size="sm"
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center"
                                            onClick={() => createLeaseFromBidMutation.mutate(bid)}
                                            disabled={createLeaseFromBidMutation.isPending}
                                        >
                                            <FileText className="w-3.5 h-3.5 mr-1" />
                                            Send Digital E-Lease
                                        </Button>
                                    )}
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
