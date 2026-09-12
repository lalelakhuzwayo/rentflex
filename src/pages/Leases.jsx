import React, { useState, useEffect, useRef } from 'react';
import { formatDate, formatDateRange, parseSafeDate } from '@/utils';
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
    Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function Leases() {
    const [user, setUser] = useState(null);
    const [filter, setFilter] = useState('all');
    const [selectedLease, setSelectedLease] = useState(null);
    const [signatureModal, setSignatureModal] = useState(false);

    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    const queryClient = useQueryClient();

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const { data: leases = [], isLoading } = useQuery({
        queryKey: ['leases', user?.email],
        queryFn: async () => {
            if (!user?.email) return [];
            const userEmail = user.email.toLowerCase().trim();
            const asTenant = await appClient.entities.Lease.filter({ tenant_id: userEmail });
            const asLandlord = await appClient.entities.Lease.filter({ landlord_id: userEmail });
            
            // If sysAdmin, list all leases
            let allLeases = [];
            if (user.user_type === 'sysAdmin') {
                allLeases = await appClient.entities.Lease.list();
            }

            const combined = [...asTenant, ...asLandlord, ...allLeases];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
        },
        enabled: !!user?.email,
    });

    const updateLeaseMutation = useMutation({
        mutationFn: (/** @type {{ id: string, data: any }} */ { id, data }) => appClient.entities.Lease.update(id, data),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['leases'] });
            queryClient.invalidateQueries({ queryKey: ['allLeases'] });
            if (updated.status === 'active') {
                toast.success('Lease agreement is now fully countersigned and ACTIVE!');
            } else if (updated.status === 'pending_landlord_signature') {
                toast.success('Lease signed! Landlord has been notified to countersign and finalize.');
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
        return user.email?.toLowerCase() === lease.tenant_id?.toLowerCase() || user.user_type === 'rentee' || user.user_type === 'tenant';
    };

    const isCurrentUserLandlord = (lease) => {
        if (!user || !lease) return false;
        return user.email?.toLowerCase() === lease.landlord_id?.toLowerCase() || user.user_type === 'landlord';
    };

    const handleSignLease = (roleToSign) => {
        if (!selectedLease) return;
        const canvas = canvasRef.current;
        const sigDataUrl = hasDrawn && canvas ? canvas.toDataURL() : `e-sign_${user?.full_name || user?.email}_${Date.now()}`;
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
            } else {
                updatedData.status = 'pending_landlord_signature';
            }
        } else if (isLandlordSigning) {
            updatedData.landlord_signature = sigDataUrl;
            updatedData.landlord_signed_at = now;
            if (selectedLease.tenant_signature) {
                updatedData.status = 'active';
                updatedData.signed = true;
            } else {
                updatedData.status = 'pending_tenant_signature';
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
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active & Executed
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

            {/* Filter Tabs (Mobile Grid + Desktop Inline Row) */}
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
                        const needsTenantSig = !lease.tenant_signature && userIsTenant;
                        const needsLandlordSig = !lease.landlord_signature && userIsLandlord;
                        const canSignNow = needsTenantSig || needsLandlordSig;

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
                                                Tenant: <strong className="text-zinc-800 font-mono">{lease.tenant_id}</strong>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5 text-zinc-700" />
                                                Landlord: <strong className="text-zinc-800 font-mono">{lease.landlord_id}</strong>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-zinc-900" />
                                                Start: {formatDate(lease.start_date)}
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
                                        ) : (
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
                            <div className="bg-zinc-50 border border-zinc-200 p-4 text-xs font-mono text-zinc-700 space-y-3 leading-relaxed max-h-56 overflow-y-auto">
                                <p className="font-bold text-center text-zinc-900 border-b border-zinc-200 pb-2">
                                    STANDARD RESIDENTIAL LEASE CONTRACT
                                </p>
                                <p><strong>Property:</strong> {selectedLease.property_title}</p>
                                <p><strong>Landlord / Owner:</strong> {selectedLease.landlord_id}</p>
                                <p><strong>Tenant / Lessee:</strong> {selectedLease.tenant_id}</p>
                                <p><strong>Monthly Rent:</strong> R{Number(selectedLease.monthly_rent || 0).toLocaleString()} (Due on the 1st of each month)</p>
                                <p><strong>Security Deposit:</strong> R{Number(selectedLease.deposit_amount || 0).toLocaleString()} (Direct Tenant-to-Landlord Security Deposit)</p>
                                <p><strong>Term Duration:</strong> {formatDateRange(selectedLease.start_date, selectedLease.end_date)}</p>
                                <p className="text-zinc-600 pt-2 border-t border-zinc-200 text-[11px]">
                                    <strong>Dual Execution Clause:</strong> This digital lease agreement is legally binding once signed by both Tenant and Landlord. It remains in full legal force until lapsed at contract expiry or terminated in accordance with the terms herein.
                                </p>
                            </div>

                            {/* Dual Signature Status Panel */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Tenant Signature Status */}
                                <div className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                            <UserCheck className="w-4 h-4 text-blue-600" />
                                            Tenant Signature
                                        </span>
                                        {selectedLease.tenant_signature ? (
                                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                                                ✓ Signed
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">
                                                Pending
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-zinc-500 font-mono truncate">{selectedLease.tenant_id}</p>
                                    {selectedLease.tenant_signature ? (
                                        <div className="bg-white p-2 border border-zinc-200 rounded text-center">
                                            {selectedLease.tenant_signature.startsWith('data:image') ? (
                                                <img src={selectedLease.tenant_signature} alt="Tenant Signature" className="h-12 mx-auto object-contain" />
                                            ) : (
                                                <p className="font-serif italic text-base text-zinc-800 py-1">
                                                    {selectedLease.tenant_id?.split('@')[0] || 'Tenant Signed'}
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
                                            Landlord Countersignature
                                        </span>
                                        {selectedLease.landlord_signature ? (
                                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                                                ✓ Countersigned
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">
                                                Pending
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-zinc-500 font-mono truncate">{selectedLease.landlord_id}</p>
                                    {selectedLease.landlord_signature ? (
                                        <div className="bg-white p-2 border border-zinc-200 rounded text-center">
                                            {selectedLease.landlord_signature.startsWith('data:image') ? (
                                                <img src={selectedLease.landlord_signature} alt="Landlord Signature" className="h-12 mx-auto object-contain" />
                                            ) : (
                                                <p className="font-serif italic text-base text-zinc-800 py-1">
                                                    {selectedLease.landlord_id?.split('@')[0] || 'Landlord Signed'}
                                                </p>
                                            )}
                                            <p className="text-[9px] text-zinc-400 mt-1">
                                                Countersigned: {formatDate(selectedLease.landlord_signed_at || selectedLease.updated_at)}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                            Awaiting countersignature from landlord.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Interactive Signature Pad (if current user still needs to sign) */}
                            {((isCurrentUserTenant(selectedLease) && !selectedLease.tenant_signature) ||
                              (isCurrentUserLandlord(selectedLease) && !selectedLease.landlord_signature) ||
                              (user?.user_type === 'sysAdmin' && (!selectedLease.tenant_signature || !selectedLease.landlord_signature))) && (
                                <div className="space-y-2 border-t border-zinc-200 pt-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                            <PenTool className="w-3.5 h-3.5 text-zinc-900" />
                                            Draw Your E-Signature Below:
                                        </label>
                                        <button
                                            onClick={clearCanvas}
                                            className="text-xs text-zinc-600 hover:text-zinc-900 font-semibold underline"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="border-2 border-dashed border-zinc-300 bg-white rounded-lg overflow-hidden">
                                        <canvas
                                            ref={canvasRef}
                                            width={550}
                                            height={110}
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            className="w-full h-28 cursor-crosshair"
                                        />
                                    </div>
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

                                {isCurrentUserLandlord(selectedLease) && !selectedLease.landlord_signature && (
                                    <Button
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                                        onClick={() => handleSignLease('landlord')}
                                        disabled={updateLeaseMutation.isPending}
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        {updateLeaseMutation.isPending ? 'Countersigning...' : 'Countersign & Finalize Lease'}
                                    </Button>
                                )}

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

