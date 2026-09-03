import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Users,
    Filter,
    Search,
    TrendingUp,
    CheckCircle2,
    Clock,
    XCircle,
    Download,
    SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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

    const isSysAdmin = user?.user_type === 'sysAdmin' || user?.user_type === 'admin';

    const { data: applications, isLoading } = useQuery({
        queryKey: ['applications', user?.email, isSysAdmin],
        queryFn: () => isSysAdmin ? appClient.entities.Application.list() : appClient.entities.Application.filter({ landlord_id: user?.email }),
        enabled: !!user?.email,
    });

    const { data: properties } = useQuery({
        queryKey: ['landlordProperties', user?.email, isSysAdmin],
        queryFn: () => isSysAdmin ? appClient.entities.Property.list() : appClient.entities.Property.filter({ landlord_id: user?.email }),
        enabled: !!user?.email,
    });

    const updateApplicationMutation = useMutation({
        mutationFn: ({ id, data }) => appClient.entities.Application.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            toast.success('Application updated successfully');
            setDetailsModalOpen(false);
        },
    });

    const handleViewDetails = (application) => {
        setSelectedApplication(application);
        setLandlordNotes(application.landlord_notes || '');
        setDetailsModalOpen(true);
    };

    const handleQuickAction = (applicationId, status) => {
        updateApplicationMutation.mutate({
            id: applicationId,
            data: { status }
        });
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
                monthly_rent: Number(selectedApplication.monthly_rent || 18500),
                deposit_amount: Number(selectedApplication.deposit_amount || 37000),
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'active'
            });

            // 3. Create initial rent payment record
            await appClient.entities.Payment.create({
                tenant_id: selectedApplication.tenant_id,
                landlord_id: selectedApplication.landlord_id || user?.email,
                amount: Number(selectedApplication.monthly_rent || 18500),
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
                        <TabsTrigger value="approved" className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Approved
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Rejected
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
