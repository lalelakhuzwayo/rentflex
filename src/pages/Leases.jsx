import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatDate, formatDateRange, parseSafeDate, createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    FileText,
    Calendar,
    Clock,
    CheckCircle2,
    PenTool,
    Printer,
    Check,
    Shield,
    XCircle,
    UserCheck,
    Building2,
    Home,
    Download,
    Wrench,
    Type
} from 'lucide-react';
import { syncAndScoreTenant } from '@/utils/rentScoreEngine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function Leases() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [filter, setFilter] = useState('all');
    const [selectedLease, setSelectedLease] = useState(null);
    const [signatureModal, setSignatureModal] = useState(false);
    const [sigMode, setSigMode] = useState('draw'); // 'draw' or 'type'
    const [typedName, setTypedName] = useState('');

    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    const queryClient = useQueryClient();

    useEffect(() => {
        appClient.auth.me().then(u => {
            setUser(u);
            if (u?.full_name) {
                setTypedName(u.full_name);
            }
        }).catch(() => { });
    }, []);

    const { data: leases = [], isLoading } = useQuery({
        queryKey: ['leases', user?.email, user?.id],
        queryFn: async () => {
            if (!user) return [];
            const myEmail = user.email?.toLowerCase().trim();
            const myId = user.id ? String(user.id) : null;
            const isSysAdmin = user.user_type === 'sysAdmin';

            try {
                const allLeases = await appClient.entities.Lease.list();
                if (!Array.isArray(allLeases)) return [];
                if (isSysAdmin) return allLeases;

                return allLeases.filter(l => {
                    const tId = l.tenant_id ? String(l.tenant_id).toLowerCase().trim() : '';
                    const lId = l.landlord_id ? String(l.landlord_id).toLowerCase().trim() : '';
                    return (
                        (myEmail && (tId === myEmail || lId === myEmail)) ||
                        (myId && (tId === myId || lId === myId))
                    );
                });
            } catch (err) {
                console.error('Failed to load leases:', err);
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    const updateLeaseMutation = useMutation({
        mutationFn: (/** @type {{ id: string, data: any }} */ { id, data }) => appClient.entities.Lease.update(id, data),
        onSuccess: async (updated) => {
            queryClient.invalidateQueries({ queryKey: ['leases'] });
            queryClient.invalidateQueries({ queryKey: ['allLeases'] });
            queryClient.invalidateQueries({ queryKey: ['conversations-leases'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });

            const myEmail = user?.email || user?.id || 'user';

            if (updated.status === 'active') {
                toast.success('🎉 Lease agreement is now fully countersigned and ACTIVE!');

                // Notify tenant in message thread
                const targetTenant = updated.tenant_id;
                if (targetTenant) {
                    await appClient.entities.Message.create({
                        conversation_id: `lease_${updated.id}`,
                        sender_id: myEmail,
                        receiver_id: targetTenant,
                        content: `🎉 Lease Agreement In Effect! Landlord has countersigned your lease for "${updated.property_title || 'Rental Unit'}". You are officially verified for move-in on ${updated.start_date}. A signed copy is stored in your Leases portal.`
                    }).catch(() => {});
                }

                // Update property occupancy / off-market status
                if (updated.property_id) {
                    try {
                        const prop = await appClient.entities.Property.get(updated.property_id);
                        if (prop) {
                            if (prop.rental_type === 'room') {
                                const currentVacant = prop.available_rooms !== undefined ? prop.available_rooms : (prop.total_rooms || prop.bedrooms || 1);
                                const newVacant = Math.max(0, currentVacant - 1);
                                await appClient.entities.Property.update(prop.id, {
                                    available_rooms: newVacant,
                                    status: newVacant <= 0 ? 'rented' : 'available'
                                });
                            } else {
                                // Entire unit occupied: automatically taken off the market
                                await appClient.entities.Property.update(prop.id, {
                                    status: 'rented'
                                });
                            }
                            queryClient.invalidateQueries({ queryKey: ['properties'] });
                            queryClient.invalidateQueries({ queryKey: ['properties-list-all'] });
                            queryClient.invalidateQueries({ queryKey: ['properties-list'] });
                        }
                    } catch (e) {
                        console.warn('Property status update notice:', e);
                    }
                }

                // Update tenant's RentScore for active verified tenancy
                if (updated.tenant_id) {
                    syncAndScoreTenant(updated.tenant_id).catch(() => {});
                }
            } else if (updated.status === 'pending_landlord_signature') {
                toast.success('✍️ Lease signed! Sent to landlord for countersignature.');

                // Notify landlord in message thread
                const targetLandlord = updated.landlord_id;
                if (targetLandlord) {
                    await appClient.entities.Message.create({
                        conversation_id: `lease_${updated.id}`,
                        sender_id: myEmail,
                        receiver_id: targetLandlord,
                        content: `✍️ Tenant Signed E-Lease! ${updated.tenant_name || user?.full_name || 'Tenant'} has signed the lease agreement for "${updated.property_title || 'Rental Unit'}". Please review and countersign to put the lease into effect.`
                    }).catch(() => {});
                }
            } else if (updated.status === 'terminated') {
                toast.info('Lease agreement marked as terminated.');
                if (updated.property_id) {
                    try {
                        const prop = await appClient.entities.Property.get(updated.property_id);
                        if (prop) {
                            if (prop.rental_type === 'room') {
                                const currentVacant = prop.available_rooms !== undefined ? prop.available_rooms : 0;
                                const newVacant = currentVacant + 1;
                                await appClient.entities.Property.update(prop.id, {
                                    available_rooms: newVacant,
                                    status: 'available'
                                });
                            } else {
                                await appClient.entities.Property.update(prop.id, {
                                    status: 'available'
                                });
                            }
                            queryClient.invalidateQueries({ queryKey: ['properties'] });
                            queryClient.invalidateQueries({ queryKey: ['properties-list'] });
                        }
                    } catch (_) {}
                }
            } else {
                toast.success('Lease agreement updated successfully!');
            }
            setSignatureModal(false);
            setSelectedLease(null);
            clearCanvas();
        },
        onError: (err) => {
            toast.error(`Failed to update lease: ${err.message}`);
        }
    });

    // Mouse canvas drawing handlers
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    // Touch events for mobile/tablet drawing
    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        if (!touch) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const handleTouchMove = (e) => {
        if (!isDrawing) return;
        const touch = e.touches[0];
        if (!touch) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        ctx.stroke();
        e.preventDefault();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const isCurrentUserTenant = (lease) => {
        if (!user || !lease) return false;
        if (user.user_type === 'sysAdmin') return true;
        const myEmail = user.email?.toLowerCase().trim();
        const myId = user.id ? String(user.id) : null;
        const tId = lease.tenant_id ? String(lease.tenant_id).toLowerCase().trim() : '';
        return (myEmail && tId === myEmail) || (myId && tId === myId);
    };

    const isCurrentUserLandlord = (lease) => {
        if (!user || !lease) return false;
        if (user.user_type === 'sysAdmin') return true;
        const myEmail = user.email?.toLowerCase().trim();
        const myId = user.id ? String(user.id) : null;
        const lId = lease.landlord_id ? String(lease.landlord_id).toLowerCase().trim() : '';
        return (myEmail && lId === myEmail) || (myId && lId === myId);
    };

    const handleSignLease = (roleToSign) => {
        if (!selectedLease) return;
        const canvas = canvasRef.current;
        let sigDataUrl = '';

        if (sigMode === 'draw' && hasDrawn && canvas) {
            sigDataUrl = canvas.toDataURL();
        } else if (sigMode === 'type' && typedName.trim()) {
            sigDataUrl = `e-sign:${typedName.trim()}:${Date.now()}`;
        } else {
            sigDataUrl = `e-sign:${user?.full_name || user?.email || 'Authorized'}:${Date.now()}`;
        }

        const now = new Date().toISOString();
        const isTenantSigning = roleToSign === 'tenant';
        const isLandlordSigning = roleToSign === 'landlord';

        const updatedData = {};

        if (isTenantSigning) {
            updatedData.tenant_signature = sigDataUrl;
            updatedData.tenant_signed_at = now;
            if (selectedLease.landlord_signature) {
                updatedData.status = 'active';
                updatedData.signed = true;
                updatedData.occupancy_status = 'active';
            } else {
                updatedData.status = 'pending_landlord_signature';
                updatedData.signed = false;
            }
        } else if (isLandlordSigning) {
            updatedData.landlord_signature = sigDataUrl;
            updatedData.landlord_signed_at = now;
            if (selectedLease.tenant_signature) {
                updatedData.status = 'active';
                updatedData.signed = true;
                updatedData.occupancy_status = 'active';
            } else {
                updatedData.status = 'pending_tenant_signature';
                updatedData.signed = false;
            }
        }

        updateLeaseMutation.mutate({
            id: selectedLease.id,
            data: updatedData
        });
    };

    const handleTerminateLease = (leaseId) => {
        if (!window.confirm('Are you sure you want to terminate this lease agreement?')) return;
        updateLeaseMutation.mutate({
            id: leaseId,
            data: {
                status: 'terminated',
                updated_at: new Date().toISOString()
            }
        });
    };

    const filteredLeases = leases?.filter(lease => {
        if (filter === 'all') return true;
        if (filter === 'active') return lease.status === 'active';
        if (filter === 'pending') {
            return lease.status === 'pending' || 
                   lease.status === 'pending_landlord_signature' || 
                   lease.status === 'pending_tenant_signature' ||
                   (!lease.tenant_signature || !lease.landlord_signature);
        }
        if (filter === 'ended') {
            return lease.status === 'ended' || lease.status === 'terminated' || lease.status === 'lapsed' || lease.status === 'cancelled';
        }
        return lease.status === filter;
    }) || [];

    const getLeaseProgress = (startDate, endDate) => {
        const start = parseSafeDate(startDate);
        const end = parseSafeDate(endDate);
        if (!start || !end) return 0;
        const total = end.getTime() - start.getTime();
        if (total <= 0) return 0;
        const current = Date.now() - start.getTime();
        return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
    };

    const getStatusBadge = (lease) => {
        if (lease.status === 'active') {
            return (
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 flex items-center gap-1 font-semibold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active & In Effect
                </Badge>
            );
        }
        if (lease.status === 'pending_landlord_signature') {
            return (
                <Badge className="bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1 font-semibold text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Awaiting Landlord Countersignature
                </Badge>
            );
        }
        if (lease.status === 'pending_tenant_signature' || lease.status === 'pending') {
            return (
                <Badge className="bg-blue-50 text-blue-800 border-blue-300 flex items-center gap-1 font-semibold text-xs">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Awaiting Tenant Signature
                </Badge>
            );
        }
        if (lease.status === 'terminated' || lease.status === 'cancelled') {
            return (
                <Badge className="bg-rose-50 text-rose-800 border-rose-300 flex items-center gap-1 font-semibold text-xs">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" /> Terminated
                </Badge>
            );
        }
        return (
            <Badge className="bg-zinc-100 text-zinc-800 border-zinc-300 capitalize text-xs">
                {lease.status || 'Draft'}
            </Badge>
        );
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Lease Agreements</h1>
                    <p className="text-slate-500 mt-1">Digital contracts, dual-party signatures, and legally binding lease tracking</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-2 sm:inline-flex sm:items-center gap-2 w-full sm:w-auto">
                {[
                    { key: 'all', label: 'All Leases' },
                    { key: 'active', label: 'Active' },
                    { key: 'pending', label: 'Pending Signature' },
                    { key: 'ended', label: 'Ended / Terminated' }
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        data-active={filter === tab.key}
                        className="filter-pill-btn w-full sm:w-auto justify-center text-center py-2 px-3.5"
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Leases List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
                </div>
            ) : filteredLeases.length > 0 ? (
                <div className="space-y-4">
                    {filteredLeases.map((lease, idx) => {
                        const progress = getLeaseProgress(lease.start_date, lease.end_date);
                        const userIsTenant = isCurrentUserTenant(lease);
                        const userIsLandlord = isCurrentUserLandlord(lease);

                        // Strict workflow rules:
                        // 1. Tenant signs first
                        // 2. Landlord countersigns second
                        // 3. Lease becomes active
                        const needsTenantSig = userIsTenant && !lease.tenant_signature;
                        const needsLandlordSig = userIsLandlord && Boolean(lease.tenant_signature) && !lease.landlord_signature;
                        const canSignNow = needsTenantSig || needsLandlordSig;

                        const isBothSigned = lease.status === 'active' || (Boolean(lease.tenant_signature) && Boolean(lease.landlord_signature));
                        const startDate = parseSafeDate(lease.start_date);
                        const now = new Date();
                        const isMoveInPassed = Boolean(startDate && startDate <= now);
                        const isOccupying = isBothSigned && isMoveInPassed;
                        const diffDays = (startDate && isMoveInPassed) ? Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                        const monthsOccupied = Math.floor(diffDays / 30);
                        const rentScoreBonus = Math.max(10, monthsOccupied * 5 + 10); // +10 base active bonus +5/month

                        return (
                            <motion.div
                                key={lease.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05, duration: 0.3 }}
                                className="sharp-card bg-white p-6 border border-zinc-200/90 hover:border-zinc-900 transition-all duration-200 space-y-4"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <h3 className="text-base font-bold text-zinc-900">{lease.property_title || 'Residential Property'}</h3>
                                            {getStatusBadge(lease)}
                                            {isOccupying && (
                                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs">
                                                    <Home className="w-3 h-3" /> Actively Occupying ({monthsOccupied} mo • +{rentScoreBonus} pts RentScore)
                                                </Badge>
                                            )}
                                            {isBothSigned && !isMoveInPassed && (
                                                <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs">
                                                    <Clock className="w-3 h-3" /> Upcoming Move-In ({formatDate(lease.start_date)})
                                                </Badge>
                                            )}
                                            {lease.tenant_signature && (
                                                <Badge className="bg-zinc-100 text-zinc-800 text-[10px] border-zinc-300">
                                                    ✓ Tenant Signed
                                                </Badge>
                                            )}
                                            {lease.landlord_signature && (
                                                <Badge className="bg-zinc-100 text-zinc-800 text-[10px] border-zinc-300">
                                                    ✓ Landlord Signed
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                                            <span className="flex items-center gap-1">
                                                <Home className="w-3.5 h-3.5 text-zinc-700" />
                                                Tenant: <strong className="text-zinc-800">{lease.tenant_name || lease.tenant_id}</strong>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5 text-zinc-700" />
                                                Landlord: <strong className="text-zinc-800">{lease.landlord_name || lease.landlord_id}</strong>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-zinc-900" />
                                                Move-in: {formatDate(lease.start_date)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                End: {formatDate(lease.end_date)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="text-right mr-2">
                                            <span className="text-[11px] text-zinc-400 font-medium block">Monthly Rent</span>
                                            <span className="text-xl font-bold text-zinc-900">R{Number(lease.monthly_rent || 0).toLocaleString()}</span>
                                        </div>

                                        {isBothSigned && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-zinc-200 text-zinc-800 hover:bg-zinc-50 font-medium flex items-center shadow-xs"
                                                    onClick={() => {
                                                        setSelectedLease(lease);
                                                        setSignatureModal(true);
                                                    }}
                                                >
                                                    <Download className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
                                                    Signed E-Lease Copy
                                                </Button>

                                                {userIsTenant && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold flex items-center shadow-xs"
                                                        onClick={() => navigate(createPageUrl('Maintenance'))}
                                                    >
                                                        <Wrench className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                                        Request Maintenance
                                                    </Button>
                                                )}
                                            </>
                                        )}

                                        {canSignNow ? (
                                            <Button
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold animate-pulse shadow-sm"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedLease(lease);
                                                    setSignatureModal(true);
                                                }}
                                            >
                                                <PenTool className="w-4 h-4 mr-2" />
                                                {needsTenantSig ? 'Sign as Tenant' : 'Countersign as Landlord'}
                                            </Button>
                                        ) : !isBothSigned && (
                                            <Button
                                                className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedLease(lease);
                                                    setSignatureModal(true);
                                                }}
                                            >
                                                <FileText className="w-4 h-4 mr-2" />
                                                View Digital Contract
                                            </Button>
                                        )}

                                        {(userIsLandlord || user?.user_type === 'sysAdmin') && lease.status === 'active' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                                                onClick={() => handleTerminateLease(lease.id)}
                                            >
                                                Terminate
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-1 pt-2 border-t border-zinc-100">
                                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                                        <span>Lease Term Completion</span>
                                        <span>{progress}% Completed</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 sharp-card bg-white border border-zinc-200">
                    <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <h3 className="font-bold text-sm text-zinc-900 mb-1">No lease agreements found</h3>
                    <p className="text-xs text-zinc-500">Active and pending lease agreements will appear here</p>
                </div>
            )}

            {/* Digital Lease & Dual-Signature Modal */}
            <Dialog open={signatureModal} onOpenChange={setSignatureModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between text-lg font-bold">
                            <span>Digital Residential Lease Agreement</span>
                            <Badge className="bg-zinc-950 text-white font-mono text-xs">
                                POPIA & Housing Act Compliant
                            </Badge>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Property: {selectedLease?.property_title} • Status: <span className="font-semibold text-zinc-900 capitalize">{selectedLease?.status}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLease && (
                        <div className="space-y-6 my-3">
                            {/* Legal Agreement Terms Box */}
                            <div className="bg-zinc-50 border border-zinc-200 p-4 text-xs font-mono text-zinc-700 space-y-3 leading-relaxed max-h-56 overflow-y-auto rounded-lg">
                                <p className="font-bold text-center text-zinc-900 border-b border-zinc-200 pb-2">
                                    STANDARD RESIDENTIAL LEASE CONTRACT
                                </p>
                                <p><strong>Property:</strong> {selectedLease.property_title} {selectedLease.property_address ? `(${selectedLease.property_address})` : ''}</p>
                                <p><strong>Landlord / Lessor:</strong> {selectedLease.landlord_name || selectedLease.landlord_id} ({selectedLease.landlord_id})</p>
                                <p><strong>Tenant / Lessee:</strong> {selectedLease.tenant_name || selectedLease.tenant_id} ({selectedLease.tenant_id})</p>
                                <p><strong>Monthly Rent:</strong> R{Number(selectedLease.monthly_rent || 0).toLocaleString()} (Due on the 1st of each calendar month)</p>
                                <p><strong>Security Deposit:</strong> R{Number(selectedLease.deposit_amount || 0).toLocaleString()} (Protected security deposit)</p>
                                <p><strong>Term Duration:</strong> {formatDateRange(selectedLease.start_date, selectedLease.end_date)}</p>
                                <p className="text-zinc-600 pt-2 border-t border-zinc-200 text-[11px]">
                                    <strong>Dual Execution Clause:</strong> In accordance with the South African Rental Housing Act (RHA), this agreement is entered into electronically. The tenant signs first, following which the landlord countersigns to put the contract into full legal effect. Verified duration spent occupying this property directly impacts the tenant's RentScore.
                                </p>
                            </div>

                            {/* Dual Signature Status Panel */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Tenant Signature Status */}
                                <div className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                            <UserCheck className="w-4 h-4 text-blue-600" />
                                            1. Tenant Signature
                                        </span>
                                        {selectedLease.tenant_signature ? (
                                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                                                ✓ Signed
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">
                                                Awaiting Tenant
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-zinc-500 font-mono truncate">{selectedLease.tenant_name || selectedLease.tenant_id}</p>
                                    {selectedLease.tenant_signature ? (
                                        <div className="bg-white p-2 border border-zinc-200 rounded text-center">
                                            {selectedLease.tenant_signature.startsWith('data:image') ? (
                                                <img src={selectedLease.tenant_signature} alt="Tenant Signature" className="h-12 mx-auto object-contain" />
                                            ) : (
                                                <p className="font-serif italic text-base text-zinc-800 py-1">
                                                    {selectedLease.tenant_signature.replace(/^e-sign:/, '').split(':')[0]}
                                                </p>
                                            )}
                                            <p className="text-[9px] text-zinc-400 mt-1">
                                                Signed: {formatDate(selectedLease.tenant_signed_at || selectedLease.created_at)}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                            Awaiting digital signature from tenant.
                                        </p>
                                    )}
                                </div>

                                {/* Landlord Countersignature Status */}
                                <div className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                            <Building2 className="w-4 h-4 text-emerald-600" />
                                            2. Landlord Countersignature
                                        </span>
                                        {selectedLease.landlord_signature ? (
                                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                                                ✓ Countersigned
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">
                                                {selectedLease.tenant_signature ? 'Ready to Countersign' : 'Pending Tenant'}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-zinc-500 font-mono truncate">{selectedLease.landlord_name || selectedLease.landlord_id}</p>
                                    {selectedLease.landlord_signature ? (
                                        <div className="bg-white p-2 border border-zinc-200 rounded text-center">
                                            {selectedLease.landlord_signature.startsWith('data:image') ? (
                                                <img src={selectedLease.landlord_signature} alt="Landlord Signature" className="h-12 mx-auto object-contain" />
                                            ) : (
                                                <p className="font-serif italic text-base text-zinc-800 py-1">
                                                    {selectedLease.landlord_signature.replace(/^e-sign:/, '').split(':')[0]}
                                                </p>
                                            )}
                                            <p className="text-[9px] text-zinc-400 mt-1">
                                                Countersigned: {formatDate(selectedLease.landlord_signed_at || selectedLease.updated_at)}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                            {selectedLease.tenant_signature 
                                                ? 'Tenant has signed! Awaiting countersignature from landlord.'
                                                : 'Will be available once tenant completes first signature.'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Interactive Signature Input (if current user still needs to sign) */}
                            {((isCurrentUserTenant(selectedLease) && !selectedLease.tenant_signature) ||
                              (isCurrentUserLandlord(selectedLease) && Boolean(selectedLease.tenant_signature) && !selectedLease.landlord_signature) ||
                              (user?.user_type === 'sysAdmin' && (!selectedLease.tenant_signature || !selectedLease.landlord_signature))) && (
                                <div className="space-y-3 border-t border-zinc-200 pt-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                            <PenTool className="w-3.5 h-3.5 text-zinc-900" />
                                            {isCurrentUserTenant(selectedLease) && !selectedLease.tenant_signature
                                                ? 'Sign as Tenant:'
                                                : 'Countersign as Landlord:'}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSigMode('draw')}
                                                className={`px-2 py-0.5 text-xs font-semibold rounded ${sigMode === 'draw' ? 'bg-zinc-900 text-white' : 'text-zinc-600 bg-zinc-100'}`}
                                            >
                                                Draw
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSigMode('type')}
                                                className={`px-2 py-0.5 text-xs font-semibold rounded ${sigMode === 'type' ? 'bg-zinc-900 text-white' : 'text-zinc-600 bg-zinc-100'}`}
                                            >
                                                Type Name
                                            </button>
                                            {sigMode === 'draw' && (
                                                <button
                                                    type="button"
                                                    onClick={clearCanvas}
                                                    className="text-xs text-zinc-500 hover:text-zinc-900 underline ml-2"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {sigMode === 'draw' ? (
                                        <div className="border-2 border-dashed border-zinc-300 bg-white rounded-lg overflow-hidden touch-none">
                                            <canvas
                                                ref={canvasRef}
                                                width={550}
                                                height={110}
                                                onMouseDown={startDrawing}
                                                onMouseMove={draw}
                                                onMouseUp={stopDrawing}
                                                onMouseLeave={stopDrawing}
                                                onTouchStart={handleTouchStart}
                                                onTouchMove={handleTouchMove}
                                                onTouchEnd={stopDrawing}
                                                className="w-full h-28 cursor-crosshair"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="Type your full legal name..."
                                                value={typedName}
                                                onChange={(e) => setTypedName(e.target.value)}
                                                className="font-serif italic text-lg"
                                            />
                                            <p className="text-[11px] text-zinc-500">
                                                Your typed name will be recorded as your legally binding electronic signature under the South African ECT Act & RHA.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-zinc-200">
                                <Button
                                    variant="outline"
                                    onClick={() => window.print()}
                                    className="border-zinc-300"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print / PDF
                                </Button>

                                {/* 1. Tenant Signs First */}
                                {isCurrentUserTenant(selectedLease) && !selectedLease.tenant_signature && (
                                    <Button
                                        className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold"
                                        onClick={() => handleSignLease('tenant')}
                                        disabled={updateLeaseMutation.isPending}
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        {updateLeaseMutation.isPending ? 'Signing...' : 'Sign Lease as Tenant'}
                                    </Button>
                                )}

                                {/* 2. Landlord Countersigns Once Tenant Has Signed */}
                                {isCurrentUserLandlord(selectedLease) && Boolean(selectedLease.tenant_signature) && !selectedLease.landlord_signature && (
                                    <Button
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                                        onClick={() => handleSignLease('landlord')}
                                        disabled={updateLeaseMutation.isPending}
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        {updateLeaseMutation.isPending ? 'Countersigning...' : 'Countersign & Finalize Lease'}
                                    </Button>
                                )}

                                {/* Landlord Viewing Waiting for Tenant */}
                                {isCurrentUserLandlord(selectedLease) && !selectedLease.tenant_signature && (
                                    <Button
                                        disabled
                                        className="bg-zinc-300 text-zinc-600 font-medium cursor-not-allowed"
                                    >
                                        <Clock className="w-4 h-4 mr-2" />
                                        Awaiting Tenant Signature First
                                    </Button>
                                )}

                                {/* Admin Override Countersign */}
                                {user?.user_type === 'sysAdmin' && !selectedLease.landlord_signature && !isCurrentUserLandlord(selectedLease) && (
                                    <Button
                                        className="bg-purple-900 hover:bg-purple-800 text-white font-bold"
                                        onClick={() => handleSignLease('landlord')}
                                        disabled={updateLeaseMutation.isPending}
                                    >
                                        <Shield className="w-4 h-4 mr-2" />
                                        Admin Countersign on Landlord Behalf
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
