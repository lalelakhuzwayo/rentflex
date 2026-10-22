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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Repeat, Calendar, Award, Sparkles, TrendingUp } from 'lucide-react';
import { renewLeaseAgreement } from '@/utils/leaseInteractionEngine';
import { calculateLeaseEndDate } from '@/utils/leaseManager';
import { formatDate } from '@/utils';
import { toast } from 'sonner';

export default function RenewLeaseDialog({
    isOpen,
    onClose,
    lease,
    currentUser,
    onSuccess
}) {
    const [extensionMonths, setExtensionMonths] = useState('12');
    const [monthlyRent, setMonthlyRent] = useState(String(lease?.monthly_rent || ''));
    const [renewalNotes, setRenewalNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!lease) return null;

    const currentEndDate = lease.end_date || new Date().toISOString().split('T')[0];
    const newEndDate = calculateLeaseEndDate(currentEndDate, parseInt(extensionMonths || 12, 10));

    const handleRenew = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await renewLeaseAgreement({
                lease,
                extensionMonths: parseInt(extensionMonths, 10),
                newMonthlyRent: parseFloat(monthlyRent || lease.monthly_rent || 0),
                renewalNotes,
                currentUser
            });

            toast.success(`🎉 Lease renewed for ${extensionMonths} months until ${formatDate(newEndDate)}! RentScore bonus awarded.`);
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(`Renewal failed: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg rounded-none border border-zinc-200/90 shadow-3d-modal bg-white p-6">
                <DialogHeader className="border-b-2 border-zinc-950 pb-3">
                    <DialogTitle className="flex items-center gap-2 text-base font-black uppercase tracking-wider text-zinc-950">
                        <Repeat className="w-5 h-5 text-zinc-950" />
                        Renew Lease Agreement
                    </DialogTitle>
                    <DialogDescription className="text-xs font-semibold text-zinc-600">
                        {lease.property_title || 'Rental Unit'} • Current End Date: {formatDate(lease.end_date)}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleRenew} className="space-y-4 my-3">
                    {/* Renewal Bonus Callout */}
                    <div className="bg-zinc-950 text-white rounded-none p-4 border border-zinc-200/90 shadow-card space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                RentScore Continuity Incentive
                            </span>
                            <span className="px-2 py-0.5 bg-amber-400 text-zinc-950 border-2 border-amber-300 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                                +25 Points
                            </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                            Renewing this tenancy rewards the tenant with a <strong className="text-amber-400 font-black">+25 RentScore point bonus</strong> for uninterrupted, verified tenancy compliance.
                        </p>
                    </div>

                    {/* Extension Term & Projected End Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-black uppercase tracking-wider text-zinc-950">Extension Term</Label>
                            <Select
                                value={extensionMonths}
                                onValueChange={(val) => setExtensionMonths(val)}
                            >
                                <SelectTrigger className="mt-1 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="6">6 Months</SelectItem>
                                    <SelectItem value="12">12 Months (1 Year)</SelectItem>
                                    <SelectItem value="24">24 Months (2 Years)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs font-black uppercase tracking-wider text-zinc-950">New End Date</Label>
                            <div className="h-10 px-3 mt-1 rounded-none border border-zinc-200/90 bg-zinc-50 flex items-center gap-2 text-xs font-bold text-zinc-950 shadow-xs">
                                <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                                {formatDate(newEndDate)}
                            </div>
                        </div>
                    </div>

                    {/* Adjusted Monthly Rent */}
                    <div>
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-black uppercase tracking-wider text-zinc-950">Monthly Rent for Renewal Period</Label>
                            <button
                                type="button"
                                className="text-[11px] font-black uppercase tracking-wider text-zinc-700 hover:text-zinc-950 underline underline-offset-2"
                                onClick={() => {
                                    const curr = Number(lease.monthly_rent || 0);
                                    const escalated = Math.round(curr * 1.05);
                                    setMonthlyRent(String(escalated));
                                }}
                            >
                                +5% Escalation
                            </button>
                        </div>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-black">R</span>
                            <Input
                                type="number"
                                min="1"
                                className="pl-7 text-xs font-bold"
                                value={monthlyRent}
                                onChange={(e) => setMonthlyRent(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Renewal Notes */}
                    <div>
                        <Label className="text-xs font-black uppercase tracking-wider text-zinc-950">Renewal Notes / Terms Addendum</Label>
                        <Textarea
                            rows={2}
                            placeholder="e.g. Renewed under existing terms with 5% annual CPI adjustment."
                            value={renewalNotes}
                            onChange={(e) => setRenewalNotes(e.target.value)}
                            className="mt-1 text-xs"
                        />
                    </div>

                    <DialogFooter className="flex gap-2 sm:justify-end pt-3 border-t-2 border-zinc-950">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isSubmitting}
                            className="bg-zinc-950 hover:bg-zinc-900 text-white font-black uppercase tracking-wider"
                        >
                            {isSubmitting ? 'Renewing...' : `Confirm Renewal (+${extensionMonths} Months)`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
