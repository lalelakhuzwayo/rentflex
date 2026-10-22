import React, { useState, useEffect } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Sliders, Clock, AlertCircle, ShieldAlert, CreditCard } from 'lucide-react';
import { customizeLeaseArrangements } from '@/utils/leaseInteractionEngine';
import { toast } from 'sonner';

export default function EditLeaseTermsDialog({
    isOpen,
    onClose,
    lease,
    currentUser,
    onSuccess
}) {
    const [form, setForm] = useState({
        monthly_rent: '',
        deposit_amount: '',
        payment_frequency: 'monthly',
        payment_due_day: '1',
        payment_cutoff_day: '5',
        payment_cutoff_time: '23:59',
        grace_period_days: '3',
        late_penalty_fee: '250',
        cancellation_fee: '',
        cancellation_score_penalty: '35'
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (lease) {
            setForm({
                monthly_rent: String(lease.monthly_rent || ''),
                deposit_amount: String(lease.deposit_amount || ''),
                payment_frequency: lease.payment_frequency || 'monthly',
                payment_due_day: String(lease.payment_due_day || 1),
                payment_cutoff_day: String(lease.payment_cutoff_day || 5),
                payment_cutoff_time: lease.payment_cutoff_time || '23:59',
                grace_period_days: String(lease.grace_period_days || 3),
                late_penalty_fee: String(lease.late_penalty_fee || 250),
                cancellation_fee: String(lease.cancellation_fee || lease.monthly_rent || ''),
                cancellation_score_penalty: String(lease.cancellation_score_penalty || 35)
            });
        }
    }, [lease]);

    if (!lease) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await customizeLeaseArrangements({
                leaseId: lease.id,
                termsPayload: form,
                currentUser
            });

            toast.success('Lease payment arrangements & cutoff terms updated successfully!');
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(`Failed to update lease terms: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-none border border-zinc-200/90 shadow-3d-modal bg-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-black text-zinc-950 uppercase tracking-tight">
                        <Sliders className="w-5 h-5 text-zinc-950" />
                        Customise Lease Arrangements & Cut-Offs
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-600 font-medium">
                        Adjust payment schedules, cutoff rules for the RentScore engine, and penalty policies for {lease.property_title}.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-5 my-2">
                    {/* Rent & Deposit Amounts */}
                    <div className="bg-zinc-50 border border-zinc-200/90 rounded-none p-4 space-y-3 shadow-sm">
                        <span className="text-xs font-black text-zinc-950 flex items-center gap-1.5 uppercase">
                            <CreditCard className="w-4 h-4 text-zinc-950" />
                            Financial Terms (ZAR)
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-zinc-600 font-medium">Monthly Rent</Label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-2.5 text-xs text-zinc-400 font-semibold">R</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="pl-7 text-xs font-semibold"
                                        value={form.monthly_rent}
                                        onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-600 font-medium">Security Deposit</Label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-2.5 text-xs text-zinc-400 font-semibold">R</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="pl-7 text-xs font-semibold"
                                        value={form.deposit_amount}
                                        onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Arrangements & Frequency */}
                    <div className="bg-zinc-50 border border-zinc-200/90 rounded-none p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-zinc-950 flex items-center gap-1.5 uppercase">
                                <Clock className="w-4 h-4 text-zinc-950" />
                                Payment Schedule & Cut-Off Windows
                            </span>
                            <Badge className="bg-zinc-950 text-white text-[10px] font-bold">Score Engine Linked</Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-zinc-700 font-bold uppercase">Payment Frequency</Label>
                                <Select
                                    value={form.payment_frequency}
                                    onValueChange={(val) => setForm({ ...form, payment_frequency: val })}
                                >
                                    <SelectTrigger className="mt-1 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly (Full Amount)</SelectItem>
                                        <SelectItem value="bi_weekly">Bi-Weekly Split (FlexPay 50/50)</SelectItem>
                                        <SelectItem value="weekly">Weekly Installments</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs text-zinc-700 font-bold uppercase">Due Day of Month</Label>
                                <Select
                                    value={form.payment_due_day}
                                    onValueChange={(val) => setForm({ ...form, payment_due_day: val })}
                                >
                                    <SelectTrigger className="mt-1 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1st of the month</SelectItem>
                                        <SelectItem value="5">5th of the month</SelectItem>
                                        <SelectItem value="15">15th of the month</SelectItem>
                                        <SelectItem value="25">25th of the month</SelectItem>
                                        <SelectItem value="28">28th of the month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div>
                                <Label className="text-xs text-zinc-700 font-bold uppercase">Cut-off Day</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="31"
                                    className="mt-1 text-xs font-semibold"
                                    value={form.payment_cutoff_day}
                                    onChange={(e) => setForm({ ...form, payment_cutoff_day: e.target.value })}
                                />
                                <span className="text-[10px] text-zinc-500 mt-0.5 block">e.g. 5th of month</span>
                            </div>

                            <div>
                                <Label className="text-xs text-zinc-700 font-bold uppercase">Cut-off Time</Label>
                                <Input
                                    type="time"
                                    className="mt-1 text-xs font-semibold"
                                    value={form.payment_cutoff_time}
                                    onChange={(e) => setForm({ ...form, payment_cutoff_time: e.target.value })}
                                />
                                <span className="text-[10px] text-zinc-500 mt-0.5 block">SAST standard</span>
                            </div>

                            <div>
                                <Label className="text-xs text-zinc-700 font-bold uppercase">Grace Period (Days)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="14"
                                    className="mt-1 text-xs font-semibold"
                                    value={form.grace_period_days}
                                    onChange={(e) => setForm({ ...form, grace_period_days: e.target.value })}
                                />
                                <span className="text-[10px] text-zinc-500 mt-0.5 block">Days before late penalty</span>
                            </div>
                        </div>

                        <div className="text-[11px] text-zinc-700 bg-white p-3 rounded-none border border-zinc-200/90 shadow-xs">
                            <strong>Score Engine Impact:</strong> Tenant payments received before the cut-off day (+ grace days) are recorded as on-time (+15 RentScore pts). Late payments incur a financial penalty and score reduction (-15 pts).
                        </div>
                    </div>

                    {/* Penalties Policy */}
                    <div className="bg-zinc-50 border border-zinc-200/90 rounded-none p-4 space-y-3 shadow-sm">
                        <span className="text-xs font-black text-zinc-950 flex items-center gap-1.5 uppercase">
                            <ShieldAlert className="w-4 h-4 text-zinc-950" />
                            Penalty Policies
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs text-zinc-600 font-medium">Late Payment Fee</Label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-2.5 text-xs text-zinc-400 font-semibold">R</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="pl-7 text-xs font-semibold"
                                        value={form.late_penalty_fee}
                                        onChange={(e) => setForm({ ...form, late_penalty_fee: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-zinc-600 font-medium">Early Cancel Fee</Label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-2.5 text-xs text-zinc-400 font-semibold">R</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="pl-7 text-xs font-semibold"
                                        value={form.cancellation_fee}
                                        onChange={(e) => setForm({ ...form, cancellation_fee: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-zinc-600 font-medium">Cancel Score Penalty</Label>
                                <Select
                                    value={form.cancellation_score_penalty}
                                    onValueChange={(val) => setForm({ ...form, cancellation_score_penalty: val })}
                                >
                                    <SelectTrigger className="mt-1 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="20">Lenient (-20 pts)</SelectItem>
                                        <SelectItem value="35">Standard (-35 pts)</SelectItem>
                                        <SelectItem value="50">Strict (-50 pts)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isSaving} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold">
                            {isSaving ? 'Saving...' : 'Save Arrangements'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
