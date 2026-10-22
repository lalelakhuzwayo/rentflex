import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldCheck, DollarSign, Award, XCircle } from 'lucide-react';
import { cancelOrTerminateLease } from '@/utils/leaseInteractionEngine';
import { toast } from 'sonner';

export default function CancelLeaseDialog({
    isOpen,
    onClose,
    lease,
    currentUser,
    onSuccess
}) {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);

    if (!lease) return null;

    const myEmail = currentUser?.email?.toLowerCase().trim();
    const myId = currentUser?.id ? String(currentUser.id) : null;
    const isTenant = (myEmail && lease.tenant_id?.toLowerCase() === myEmail) || (myId && lease.tenant_id === myId);
    const isLandlord = (myEmail && lease.landlord_id?.toLowerCase() === myEmail) || (myId && lease.landlord_id === myId);
    const isSysAdmin = currentUser?.user_type === 'sysAdmin';

    const cancelledBy = isTenant ? 'tenant' : isLandlord ? 'landlord' : 'mutual';

    // Penalty calculations
    const financialPenalty = isTenant
        ? Number(lease.cancellation_fee || lease.monthly_rent || 0)
        : 0;
    const scorePenalty = isTenant
        ? Number(lease.cancellation_score_penalty || 35)
        : 0;

    const handleConfirmCancel = async () => {
        if (!reason.trim()) {
            toast.error('Please specify a reason for cancellation.');
            return;
        }

        if (isTenant && !acknowledged) {
            toast.error('Please acknowledge the cancellation penalty terms.');
            return;
        }

        setIsSubmitting(true);
        try {
            await cancelOrTerminateLease({
                lease,
                cancelledBy,
                reason,
                financialPenaltyAmount: financialPenalty,
                scorePenaltyPoints: scorePenalty,
                currentUser
            });

            toast.success(
                isTenant
                    ? `Lease cancelled. Penalty invoice of R${financialPenalty.toLocaleString()} generated and score updated.`
                    : 'Lease agreement terminated successfully.'
            );
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(`Cancellation failed: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg rounded-none border border-zinc-200/90 shadow-3d-modal bg-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-black text-zinc-950 uppercase tracking-tight">
                        <XCircle className="w-5 h-5 text-rose-600" />
                        {isTenant ? 'Cancel Lease Agreement' : 'Terminate Lease Agreement'}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-600 font-medium">
                        {lease.property_title || 'Rental Unit'} • Term: {lease.start_date} to {lease.end_date}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-2">
                    {/* Role & Penalty Summary Banner */}
                    {isTenant ? (
                        <div className="bg-rose-50 border border-rose-200 rounded-none p-4 space-y-3 shadow-[3px_3px_0px_0px_rgba(159,18,57,1)]">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-rose-950 flex items-center gap-1.5 uppercase">
                                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                                    Tenant-Initiated Early Cancellation
                                </span>
                                <Badge className="bg-rose-600 text-white text-[10px] font-bold">Breach Policy</Badge>
                            </div>
                            <p className="text-xs text-rose-900 leading-relaxed font-medium">
                                Under the Rental Housing Act and your signed lease terms, terminating an active tenancy early incurs financial and RentScore penalties:
                            </p>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="bg-white p-2.5 rounded-none border border-rose-200 shadow-[2px_2px_0px_0px_rgba(159,18,57,1)]">
                                    <span className="text-[10px] text-zinc-600 font-bold uppercase block">Cancellation Fee</span>
                                    <span className="text-base font-black text-rose-700">R{financialPenalty.toLocaleString()}</span>
                                    <span className="text-[9px] text-zinc-500 block mt-0.5">Penalty bill generated</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-none border border-rose-200 shadow-[2px_2px_0px_0px_rgba(159,18,57,1)]">
                                    <span className="text-[10px] text-zinc-600 font-bold uppercase block">RentScore Impact</span>
                                    <span className="text-base font-black text-rose-700">-{scorePenalty} Points</span>
                                    <span className="text-[9px] text-zinc-500 block mt-0.5">Applied immediately</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-zinc-50 border border-zinc-200/90 rounded-none p-4 space-y-2 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-zinc-950 flex items-center gap-1.5 uppercase">
                                    <ShieldCheck className="w-4 h-4 text-zinc-950" />
                                    Landlord-Initiated Termination
                                </span>
                                <Badge className="bg-zinc-950 text-white text-[10px] font-bold">Tenant Protected</Badge>
                            </div>
                            <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                                As a landlord or manager terminating this agreement, the tenant's RentScore remains protected without score penalties. Full security deposit must be refunded or accounted for in accordance with the Rental Housing Act.
                            </p>
                        </div>
                    )}

                    {/* Reason for Cancellation */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-950 uppercase tracking-wider">
                            Reason for Cancellation / Notice Notes <span className="text-rose-600">*</span>
                        </Label>
                        <Textarea
                            rows={3}
                            placeholder={isTenant ? "e.g. Relocating due to job change, personal emergency..." : "e.g. Owner moving into unit, property renovations..."}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="text-xs"
                        />
                    </div>

                    {/* Acknowledgment for Tenant */}
                    {isTenant && (
                        <label className="flex items-start gap-2.5 p-3 rounded-none bg-zinc-50 border border-zinc-200/90 shadow-xs cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acknowledged}
                                onChange={(e) => setAcknowledged(e.target.checked)}
                                className="mt-0.5 rounded-none border border-zinc-200/90 text-zinc-950 focus:ring-0"
                            />
                            <span className="text-[11px] text-zinc-800 leading-normal font-medium">
                                I understand that cancelling this lease early incurs an early termination penalty fee of <strong>R{financialPenalty.toLocaleString()}</strong> and deducts <strong>{scorePenalty} points</strong> from my RentScore.
                            </span>
                        </label>
                    )}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-end">
                    <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                        Keep Lease Active
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleConfirmCancel}
                        disabled={isSubmitting || (isTenant && !acknowledged)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    >
                        {isSubmitting ? 'Cancelling...' : isTenant ? 'Confirm Cancellation' : 'Terminate Agreement'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
