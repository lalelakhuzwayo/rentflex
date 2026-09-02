import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    ArrowLeftRight,
    CheckCircle2,
    AlertTriangle,
    DollarSign,
    FileText,
    Home,
    ChefHat,
    Bath,
    BedDouble,
    Shield,
    XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const ROOMS = [
    { key: 'living_room', label: 'Living Room', icon: Home },
    { key: 'kitchen', label: 'Kitchen', icon: ChefHat },
    { key: 'bathroom', label: 'Bathroom', icon: Bath },
    { key: 'bedrooms', label: 'Bedrooms', icon: BedDouble },
];

const DAMAGE_TYPES = [
    { value: 'none', label: 'No Damage', cost: 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { value: 'minor', label: 'Minor Wear & Tear', cost: 0, color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 'moderate', label: 'Moderate Damage', cost: 150, color: 'text-amber-600', bg: 'bg-amber-50' },
    { value: 'severe', label: 'Severe Damage', cost: 500, color: 'text-red-600', bg: 'bg-red-50' },
];

export default function MoveOutDeposit() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [selectedLease, setSelectedLease] = useState(null);
    const [damageAssessment, setDamageAssessment] = useState({});
    const [customDeductions, setCustomDeductions] = useState([]);

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const { data: leases } = useQuery({
        queryKey: ['completed-leases'],
        queryFn: () => appClient.entities.Lease.filter({
            status: 'expired',
            tenant_id: user?.email
        }),
        enabled: !!user,
        initialData: [],
    });

    const { data: inspections = [] } = useQuery({
        queryKey: ['inspections', selectedLease?.id],
        queryFn: () => appClient.entities.Inspection.filter({ lease_id: selectedLease?.id }),
        enabled: !!selectedLease,
        initialData: [],
    });

    const moveInInspection = inspections.find(i => i.inspection_type === 'move_in');
    const moveOutInspection = inspections.find(i => i.inspection_type === 'move_out');

    const createDisputeMutation = useMutation({
        mutationFn: (data) => appClient.entities.DepositDispute.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['disputes']);
            toast.success('Dispute submitted successfully');
            navigate(createPageUrl('Disputes'));
        },
    });

    const updateLeaseMutation = useMutation({
        mutationFn: ({ id, data }) => appClient.entities.Lease.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['completed-leases']);
            toast.success('Deposit approved');
        },
    });

    const handleDamageChange = (roomKey, damageType) => {
        setDamageAssessment(prev => ({
            ...prev,
            [roomKey]: damageType
        }));
    };

    const calculateDeductions = () => {
        let total = 0;

        // Room damages
        Object.entries(damageAssessment).forEach(([room, damageType]) => {
            const damage = DAMAGE_TYPES.find(d => d.value === damageType);
            if (damage) total += damage.cost;
        });

        // Custom deductions
        customDeductions.forEach(d => {
            total += parseFloat(d.amount) || 0;
        });

        return total;
    };

    const totalDeductions = calculateDeductions();
    const depositAmount = selectedLease?.deposit_amount || 0;
    const refundAmount = Math.max(0, depositAmount - totalDeductions);

    const handleApprove = () => {
        updateLeaseMutation.mutate({
            id: selectedLease.id,
            data: {
                deposit_status: 'returned',
            }
        });
    };

    const handleDispute = () => {
        createDisputeMutation.mutate({
            lease_id: selectedLease.id,
            tenant_id: user?.email,
            landlord_id: selectedLease.landlord_id,
            property_title: selectedLease.property_title,
            deposit_amount: depositAmount,
            disputed_amount: totalDeductions,
            reason: 'Tenant disputes the damage assessment and deductions',
            tenant_evidence: [],
            status: 'open',
        });
    };

    const addCustomDeduction = () => {
        setCustomDeductions([...customDeductions, { description: '', amount: 0 }]);
    };

    const updateCustomDeduction = (idx, field, value) => {
        const updated = [...customDeductions];
        updated[idx][field] = value;
        setCustomDeductions(updated);
    };

    const removeCustomDeduction = (idx) => {
        setCustomDeductions(customDeductions.filter((_, i) => i !== idx));
    };

    if (!selectedLease) {
        return (
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 mb-6">Move-Out & Deposit</h1>

                {leases.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
                        <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">No Completed Leases</h3>
                        <p className="text-slate-600">You don't have any completed leases yet.</p>
                    </div>
                ) : (
                    <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900">
                        <h3 className="font-bold text-sm text-zinc-900 mb-4">Select a Lease</h3>
                        <div className="space-y-3">
                            {leases.map(lease => (
                                <button
                                    key={lease.id}
                                    onClick={() => setSelectedLease(lease)}
                                    className="w-full text-left p-4 border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-zinc-900 text-sm">{lease.property_title}</p>
                                            <p className="text-xs text-zinc-500">{lease.property_address}</p>
                                            <p className="text-xs text-zinc-700 mt-1 font-medium">
                                                Deposit: R{lease.deposit_amount?.toLocaleString()}
                                            </p>
                                        </div>
                                        <Badge variant="outline">Ended</Badge>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-1">Move-Out & Deposit Review</h1>
                    <p className="text-slate-600">{selectedLease.property_title}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedLease(null)}>
                    Change Lease
                </Button>
            </div>

            {/* Deposit Summary */}
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Original Deposit</p>
                            <p className="text-2xl font-bold text-slate-900">R{(depositAmount || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Total Deductions</p>
                            <p className="text-2xl font-bold text-red-600">-R{(totalDeductions || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl p-6 border border-emerald-300 bg-emerald-50/90 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-emerald-700">Refund Amount</p>
                            <p className="text-2xl font-bold text-emerald-900">R{(refundAmount || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Room Comparisons */}
            <div className="space-y-6 mb-6">
                {ROOMS.map(room => {
                    const moveInRoom = moveInInspection?.checklist?.[room.key];
                    const moveOutRoom = moveOutInspection?.checklist?.[room.key];
                    const selectedDamage = damageAssessment[room.key];

                    return (
                        <div
                            key={room.key}
                            className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center">
                                    <room.icon className="w-6 h-6 text-zinc-900" />
                                </div>
                                <h2 className="text-lg font-bold text-zinc-900">{room.label}</h2>
                            </div>

                            {/* Photo Comparison */}
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-xs text-zinc-900">Move-In</h3>
                                        <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200">
                                            {moveInRoom?.condition || 'N/A'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {moveInRoom?.photos?.slice(0, 4).map((photo, idx) => (
                                            <img
                                                key={idx}
                                                src={photo}
                                                alt={`Move-in ${idx + 1}`}
                                                className="w-full aspect-square object-cover"
                                            />
                                        )) || (
                                                <div className="col-span-2 bg-zinc-100 aspect-square flex items-center justify-center text-xs text-zinc-400">
                                                    No photos
                                                </div>
                                            )}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-xs text-zinc-900">Move-Out</h3>
                                        <Badge className="bg-zinc-900 text-white">
                                            {moveOutRoom?.condition || 'N/A'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {moveOutRoom?.photos?.slice(0, 4).map((photo, idx) => (
                                            <img
                                                key={idx}
                                                src={photo}
                                                alt={`Move-out ${idx + 1}`}
                                                className="w-full aspect-square object-cover rounded-lg"
                                            />
                                        )) || (
                                                <div className="col-span-2 bg-slate-100 aspect-square rounded-lg flex items-center justify-center text-slate-400">
                                                    No photos
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>

                            {/* Damage Assessment */}
                            <div>
                                <Label className="mb-2 block">Damage Classification</Label>
                                <Select
                                    value={selectedDamage}
                                    onValueChange={(v) => handleDamageChange(room.key, v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select damage level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAMAGE_TYPES.map(damage => (
                                            <SelectItem key={damage.value} value={damage.value}>
                                                {damage.label} {damage.cost > 0 && `(+R${damage.cost})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {moveInRoom?.notes && (
                                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                                    <p className="text-sm text-slate-600">
                                        <strong>Move-in notes:</strong> {moveInRoom.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Custom Deductions */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">Additional Deductions</h3>
                    <Button variant="outline" size="sm" onClick={addCustomDeduction}>
                        Add Item
                    </Button>
                </div>

                {customDeductions.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No additional deductions</p>
                ) : (
                    <div className="space-y-3">
                        {customDeductions.map((item, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                                <Input
                                    placeholder="Description (e.g., Cleaning fee)"
                                    value={item.description}
                                    onChange={(e) => updateCustomDeduction(idx, 'description', e.target.value)}
                                    className="flex-1"
                                />
                                <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={item.amount}
                                    onChange={(e) => updateCustomDeduction(idx, 'amount', e.target.value)}
                                    className="w-32"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeCustomDeduction(idx)}
                                >
                                    <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Review & Approve</h3>
                <div className="flex gap-3">
                    <Button
                        onClick={handleApprove}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={updateLeaseMutation.isPending}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve Deposit Return (R{refundAmount.toLocaleString()})
                    </Button>
                    <Button
                        onClick={handleDispute}
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        disabled={createDisputeMutation.isPending}
                    >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Dispute Deductions
                    </Button>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                    By approving, you agree that the deposit assessment is fair and accurate
                </p>
            </div>
        </div>
    );
}
