import { motion } from 'framer-motion';
import { Briefcase, DollarSign, CheckCircle2 } from 'lucide-react';
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

export default function EmploymentStep({ data, onChange, onNext, onBack }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.employment_status || !data.monthly_income) return;
        onNext();
    };

    const handleVerifyIncome = () => {
        onChange({ ...data, income_verified: true });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
        >
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-6 h-6 text-zinc-900" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-1">Employment & Income</h2>
                <p className="text-xs text-zinc-500">Help landlords understand your financial profile</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
                <div>
                    <Label>Employment Status *</Label>
                    <Select
                        value={data.employment_status}
                        onValueChange={(v) => onChange({ ...data, employment_status: v })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select your status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="employed">Employed</SelectItem>
                            <SelectItem value="self_employed">Self-Employed</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                            <SelectItem value="unemployed">Unemployed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {(data.employment_status === 'employed' || data.employment_status === 'self_employed') && (
                    <div>
                        <Label htmlFor="employer">
                            {data.employment_status === 'employed' ? 'Employer Name' : 'Business Name'}
                        </Label>
                        <Input
                            id="employer"
                            value={data.employer_name}
                            onChange={(e) => onChange({ ...data, employer_name: e.target.value })}
                            placeholder={data.employment_status === 'employed' ? 'e.g., Google Inc.' : 'e.g., My Business LLC'}
                        />
                    </div>
                )}

                <div>
                    <Label htmlFor="income">Monthly Income (Net) *</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R</span>
                        <Input
                            id="income"
                            type="number"
                            value={data.monthly_income}
                            onChange={(e) => onChange({ ...data, monthly_income: e.target.value })}
                            placeholder="5000"
                            className="pl-8"
                            required
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Your take-home pay after taxes</p>
                </div>

                {data.monthly_income && !data.income_verified && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <DollarSign className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-amber-900 mb-1">Verify Your Income</p>
                                    <p className="text-sm text-amber-700">
                                        Upload bank statements or pay slips to verify your income and boost your RentScore by +100 points.
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                onClick={handleVerifyIncome}
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 shrink-0"
                            >
                                Verify
                            </Button>
                        </div>
                    </div>
                )}

                {data.income_verified && (
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <div>
                                <p className="font-medium text-emerald-900">Income Verified!</p>
                                <p className="text-sm text-emerald-700">+100 points added to your RentScore</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-zinc-50 p-3.5 border border-zinc-200">
                    <p className="text-xs text-zinc-700">
                        <strong>💡 Tip:</strong> Landlords typically look for income that's at least 3x the monthly rent.
                        Verifying your income significantly improves your chances.
                    </p>
                </div>

                <div className="flex gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onBack} className="flex-1 border-zinc-200">
                        Back
                    </Button>
                    <Button type="submit" className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white">
                        Continue
                    </Button>
                </div>
            </form>
        </motion.div>
    );
}
