import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { Link } from 'react-router-dom';
import { createPageUrl, formatDate } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Briefcase, DollarSign, MapPin, Calendar, Timer } from 'lucide-react';
import { differenceInHours, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function Jobs() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        appClient.auth.me().then(setUser);
    }, []);

    const { data: myJobs = [] } = useQuery({
        queryKey: ['my-jobs'],
        queryFn: () => appClient.entities.Job.filter({ posted_by_id: user?.id }),
        enabled: !!user
    });

    const { data: allJobs = [] } = useQuery({
        queryKey: ['all-jobs'],
        queryFn: () => appClient.entities.Job.filter({ status: 'open' })
    });

    const urgencyColors = {
        low: 'bg-slate-100 text-slate-700',
        medium: 'bg-blue-100 text-blue-700',
        high: 'bg-orange-100 text-orange-700',
        emergency: 'bg-red-100 text-red-700'
    };

    const statusColors = {
        open: 'bg-green-100 text-green-700',
        in_progress: 'bg-blue-100 text-blue-700',
        completed: 'bg-slate-100 text-slate-700',
        cancelled: 'bg-red-100 text-red-700'
    };

    const JobCard = ({ job, index = 0, showBids = false }) => {
        const { data: bids = [] } = useQuery({
            queryKey: ['job-bids', job.id],
            queryFn: () => appClient.entities.ContractorBid.filter({ job_id: job.id }),
            enabled: showBids
        });

        const getBidCountdown = () => {
            if (!job.bidding_deadline) return null;
            const deadline = new Date(job.bidding_deadline);
            const now = new Date();
            const hoursLeft = differenceInHours(deadline, now);
            const daysLeft = differenceInDays(deadline, now);

            if (hoursLeft < 0) return 'Closed';
            if (hoursLeft < 24) return `${hoursLeft}h left`;
            return `${daysLeft}d left`;
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
            >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">{job.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                <MapPin className="w-4 h-4" />
                                <span>{job.property_address}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Badge className={urgencyColors[job.urgency]}>
                                {job.urgency}
                            </Badge>
                            <Badge className={statusColors[job.status]}>
                                {job.status}
                            </Badge>
                        </div>
                    </div>

                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">{job.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                        <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            <span className="capitalize">{job.category}</span>
                        </div>
                        {job.budget_min > 0 && (
                            <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                <span>R{(job.budget_min ?? 0).toLocaleString()} - R{(job.budget_max ?? 0).toLocaleString()}</span>
                            </div>
                        )}
                        {job.preferred_start_date && (
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(job.preferred_start_date)}</span>
                            </div>
                        )}
                        {job.bidding_deadline && (
                            <div className="flex items-center gap-1">
                                <Timer className="w-4 h-4 text-orange-500" />
                                <span className="font-medium text-orange-600">{getBidCountdown()}</span>
                            </div>
                        )}
                    </div>

                    {showBids && bids.length > 0 && (
                        <div className="bg-zinc-50 p-3 mb-4 border border-zinc-200">
                            <p className="text-xs font-bold text-zinc-900 mb-1">
                                {bids.length} Bid{bids.length !== 1 ? 's' : ''} Received
                            </p>
                            <div className="text-xs text-zinc-600">
                                Lowest: R{(Math.min(...bids.map(b => b.bid_amount || 0)) ?? 0).toLocaleString()}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild className="flex-1 border-zinc-200">
                            <Link to={createPageUrl(`JobDetails?id=${job.id}`)}>
                                {showBids ? 'Compare Bids' : 'Place Bid'}
                            </Link>
                        </Button>
                    </div>
                </Card>
            </motion.div>
        );
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 mb-1">Service Jobs</h1>
                    <p className="text-xs text-zinc-500">Post jobs and receive bids from contractors</p>
                </div>
                <Button asChild className="bg-zinc-900 hover:bg-zinc-800 text-white">
                    <Link to={createPageUrl('PostJob')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Post Job
                    </Link>
                </Button>
            </div>

            <Tabs defaultValue="my-jobs" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="my-jobs">My Jobs</TabsTrigger>
                    <TabsTrigger value="all-jobs">Browse Jobs</TabsTrigger>
                </TabsList>

                <TabsContent value="my-jobs" className="space-y-4">
                    {myJobs.length === 0 ? (
                        <Card className="p-12 text-center">
                            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No jobs posted yet</h3>
                            <p className="text-slate-600 mb-4">Start by posting your first service job</p>
                            <Button asChild>
                                <Link to={createPageUrl('PostJob')}>Post Job</Link>
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {myJobs.map((job, idx) => (
                                <JobCard key={job.id} job={job} index={idx} showBids={true} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="all-jobs" className="space-y-4">
                    {allJobs.length === 0 ? (
                        <Card className="p-12 text-center">
                            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No open jobs</h3>
                            <p className="text-slate-600">Check back later for new opportunities</p>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {allJobs.map((job, idx) => (
                                <JobCard key={job.id} job={job} index={idx} />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
