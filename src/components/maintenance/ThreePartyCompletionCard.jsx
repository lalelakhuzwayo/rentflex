import React, { useState } from 'react';
import { appClient } from '@/api/appClient';
import { formatDate } from '@/utils';
import { CheckCircle2, Clock, UserCheck, Wrench, ShieldCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

/**
 * Three-Party Confirmation Card for Maintenance Requests and Jobs
 * 
 * Verifies repair completion across:
 * 1. Contractor (Execution)
 * 2. Tenant (Occupant Acceptance)
 * 3. Landlord (Inspection & Approval)
 */
export default function ThreePartyCompletionCard({
    item,
    itemType = 'maintenance', // 'maintenance' | 'job'
    currentUser,
    userRole,
    onUpdated
}) {
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!item) return null;

    const userEmail = currentUser?.email?.toLowerCase();
    const userId = currentUser?.id;

    const isTenant = userRole === 'tenant' || userRole === 'rentee' || 
        (item.tenant_id && (item.tenant_id.toLowerCase() === userEmail || item.tenant_id === userId));

    const isLandlord = userRole === 'landlord' || 
        (item.landlord_id && (item.landlord_id.toLowerCase() === userEmail || item.landlord_id === userId)) ||
        (item.posted_by_id && (item.posted_by_id.toLowerCase() === userEmail || item.posted_by_id === userId));

    const isContractor = userRole === 'contractor' || 
        (item.contractor_id && (item.contractor_id.toLowerCase() === userEmail || item.contractor_id === userId));

    const isSysAdmin = userRole === 'sysAdmin';

    // Step status
    const contractorDone = Boolean(item.contractor_completed);
    const tenantDone = Boolean(item.tenant_completed);
    const landlordDone = Boolean(item.landlord_completed);

    const completedCount = [contractorDone, tenantDone, landlordDone].filter(Boolean).length;
    const isFullyComplete = completedCount === 3;

    // Check if the current user has a pending confirmation step
    let canConfirmRole = null;
    if ((isContractor || isSysAdmin) && !contractorDone) {
        canConfirmRole = 'contractor';
    } else if ((isTenant || isSysAdmin) && !tenantDone) {
        canConfirmRole = 'tenant';
    } else if ((isLandlord || isSysAdmin) && !landlordDone) {
        canConfirmRole = 'landlord';
    }

    const handleConfirm = async () => {
        if (!canConfirmRole) return;
        setIsSubmitting(true);

        const now = new Date().toISOString();
        const patch = {};

        if (canConfirmRole === 'contractor' || (isSysAdmin && !contractorDone)) {
            patch.contractor_completed = true;
            patch.contractor_completed_at = now;
            if (notes.trim()) patch.contractor_notes = notes.trim();
        } else if (canConfirmRole === 'tenant' || (isSysAdmin && !tenantDone)) {
            patch.tenant_completed = true;
            patch.tenant_completed_at = now;
            if (notes.trim()) patch.tenant_notes = notes.trim();
        } else if (canConfirmRole === 'landlord' || (isSysAdmin && !landlordDone)) {
            patch.landlord_completed = true;
            patch.landlord_completed_at = now;
            if (notes.trim()) patch.landlord_notes = notes.trim();
        }

        // Calculate if this action finishes all 3
        const willBeContractorDone = contractorDone || patch.contractor_completed;
        const willBeTenantDone = tenantDone || patch.tenant_completed;
        const willBeLandlordDone = landlordDone || patch.landlord_completed;

        if (willBeContractorDone && willBeTenantDone && willBeLandlordDone) {
            patch.status = itemType === 'maintenance' ? 'resolved' : 'completed';
        } else {
            // Keep active state while signoffs are pending
            if (item.status === 'open' || item.status === 'submitted') {
                patch.status = 'in_progress';
            }
        }

        try {
            if (itemType === 'maintenance') {
                await appClient.entities.MaintenanceRequest.update(item.id, patch);
                // Sync to linked job if present
                if (item.job_id) {
                    await appClient.entities.Job.update(item.job_id, patch).catch(() => {});
                }
            } else {
                await appClient.entities.Job.update(item.id, patch);
                // Sync to linked maintenance request if present
                if (item.maintenance_request_id) {
                    await appClient.entities.MaintenanceRequest.update(item.maintenance_request_id, patch).catch(() => {});
                }
            }

            toast.success(`🎉 ${canConfirmRole.toUpperCase()} sign-off recorded! (${completedCount + 1}/3 confirmed)`);
            setConfirmModalOpen(false);
            setNotes('');
            onUpdated?.();
        } catch (err) {
            console.error('Confirmation error:', err);
            toast.error(err.message || 'Failed to submit confirmation');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-zinc-50 border border-zinc-200/90 rounded-none p-4 space-y-3 shadow-sm">
            {/* Header with counter */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-zinc-950 uppercase tracking-wider">
                        3-Party Completion Verification
                    </span>
                </div>
                <Badge
                    className={`${
                        isFullyComplete
                            ? 'bg-emerald-600 text-white font-bold'
                            : completedCount > 0
                                ? 'bg-amber-400 text-zinc-950 font-bold'
                                : 'bg-zinc-200 text-zinc-800'
                    } text-[11px]`}
                >
                    {isFullyComplete ? '✓ Fully Verified (3/3)' : `${completedCount}/3 Confirmed`}
                </Badge>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Contractor Step */}
                <div className={`p-2.5 rounded-none border-2 text-xs shadow-xs ${
                    contractorDone 
                        ? 'bg-emerald-50 border-emerald-950 text-emerald-950' 
                        : 'bg-white border-zinc-950 text-zinc-700'
                }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                        {contractorDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        ) : (
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>1. Contractor Work</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-medium mt-1">
                        {contractorDone 
                            ? `Completed: ${item.contractor_completed_at ? formatDate(item.contractor_completed_at) : 'Done'}` 
                            : 'Awaiting repair completion'}
                    </p>
                    {item.contractor_notes && (
                        <p className="text-[10px] italic text-zinc-800 mt-0.5 line-clamp-1">"{item.contractor_notes}"</p>
                    )}
                </div>

                {/* 2. Tenant Step */}
                <div className={`p-2.5 rounded-none border-2 text-xs shadow-xs ${
                    tenantDone 
                        ? 'bg-emerald-50 border-emerald-950 text-emerald-950' 
                        : 'bg-white border-zinc-950 text-zinc-700'
                }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                        {tenantDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        ) : (
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>2. Tenant Tested</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-medium mt-1">
                        {tenantDone 
                            ? `Confirmed: ${item.tenant_completed_at ? formatDate(item.tenant_completed_at) : 'Done'}` 
                            : 'Awaiting occupant testing'}
                    </p>
                    {item.tenant_notes && (
                        <p className="text-[10px] italic text-zinc-800 mt-0.5 line-clamp-1">"{item.tenant_notes}"</p>
                    )}
                </div>

                {/* 3. Landlord Step */}
                <div className={`p-2.5 rounded-none border-2 text-xs shadow-xs ${
                    landlordDone 
                        ? 'bg-emerald-50 border-emerald-950 text-emerald-950' 
                        : 'bg-white border-zinc-950 text-zinc-700'
                }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                        {landlordDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        ) : (
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>3. Landlord Approval</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-medium mt-1">
                        {landlordDone 
                            ? `Approved: ${item.landlord_completed_at ? formatDate(item.landlord_completed_at) : 'Done'}` 
                            : 'Awaiting landlord signoff'}
                    </p>
                    {item.landlord_notes && (
                        <p className="text-[10px] italic text-zinc-800 mt-0.5 line-clamp-1">"{item.landlord_notes}"</p>
                    )}
                </div>
            </div>

            {/* Action button if active user has pending role step */}
            {canConfirmRole && !isFullyComplete && (
                <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-amber-700 font-medium">
                        👉 Action required: Confirm this task as {canConfirmRole}.
                    </span>
                    <Button
                        size="sm"
                        onClick={() => setConfirmModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs px-3 shadow-xs"
                    >
                        Sign Off as {canConfirmRole.charAt(0).toUpperCase() + canConfirmRole.slice(1)}
                    </Button>
                </div>
            )}

            {/* Confirmation Dialog */}
            <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            Sign Off on Repair ({canConfirmRole?.toUpperCase()})
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 pt-2">
                        <p className="text-xs text-zinc-600 leading-relaxed">
                            {canConfirmRole === 'contractor'
                                ? 'Confirm that you have completed all requested maintenance work according to building and trade standards.'
                                : canConfirmRole === 'tenant'
                                    ? 'Confirm that the contractor has resolved the maintenance issue in your rental home and everything is working properly.'
                                    : 'Confirm that you have reviewed the contractor work and approve the completed maintenance order.'}
                        </p>

                        <div>
                            <Label className="text-xs font-semibold text-zinc-700 block mb-1">
                                Optional Notes / Comments
                            </Label>
                            <Textarea
                                placeholder="Add any details, notes or observations..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button variant="outline" size="sm" onClick={() => setConfirmModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Recording...' : 'Confirm Completion'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
