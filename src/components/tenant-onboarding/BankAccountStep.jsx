import { motion } from 'framer-motion';
import { Landmark, CheckCircle2, Zap, Shield, TrendingUp } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';

export default function BankAccountStep({ data, onChange, onNext, onBack }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        onNext();
    };

    const benefits = [
        { icon: Zap, text: 'Never miss a payment - automatic deductions' },
        { icon: TrendingUp, text: '+75 RentScore boost for using debit order' },
        { icon: Shield, text: 'Secure and encrypted bank connection' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
        >
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                    <Landmark className="w-6 h-6 text-zinc-900" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-1">Bank Account (Optional)</h2>
                <p className="text-xs text-zinc-500">Set up automatic rent payments for peace of mind</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
                <div>
                    <Label htmlFor="bank">Bank Name</Label>
                    <Select
                        value={data.bank_name}
                        onValueChange={(v) => onChange({ ...data, bank_name: v })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select your bank" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="bank_of_america">Bank of America</SelectItem>
                            <SelectItem value="chase">Chase</SelectItem>
                            <SelectItem value="wells_fargo">Wells Fargo</SelectItem>
                            <SelectItem value="citibank">Citibank</SelectItem>
                            <SelectItem value="us_bank">US Bank</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {data.bank_name && (
                    <div>
                        <Label htmlFor="account">Account Number</Label>
                        <Input
                            id="account"
                            type="password"
                            value={data.account_number}
                            onChange={(e) => onChange({ ...data, account_number: e.target.value })}
                            placeholder="••••••••••"
                        />
                        <p className="text-xs text-slate-500 mt-1">Your account details are encrypted and secure</p>
                    </div>
                )}

                {data.bank_name && data.account_number && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-medium text-slate-900">Enable Automatic Debit Order</p>
                                <p className="text-sm text-slate-600">Rent will be deducted automatically on due date</p>
                            </div>
                            <Switch
                                checked={data.debit_order_enabled}
                                onCheckedChange={(checked) => onChange({ ...data, debit_order_enabled: checked })}
                            />
                        </div>
                        {data.debit_order_enabled && (
                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <p className="text-sm text-emerald-700 font-medium">+75 RentScore points!</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    <h3 className="font-bold text-zinc-900 text-xs">Benefits of Debit Order</h3>
                    {benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-100">
                            <div className="w-8 h-8 bg-white border border-zinc-200 flex items-center justify-center">
                                <benefit.icon className="w-4 h-4 text-zinc-900" />
                            </div>
                            <span className="text-xs text-zinc-700">{benefit.text}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-amber-50 p-3.5 border border-amber-200">
                    <p className="text-xs text-amber-900">
                        <strong>Note:</strong> You can skip this step and set it up later, but enabling debit order now gives you an instant RentScore boost.
                    </p>
                </div>

                <div className="flex gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onBack} className="flex-1 border-zinc-200">
                        Back
                    </Button>
                    <Button type="submit" className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white">
                        {data.debit_order_enabled ? 'Complete Setup' : 'Skip for Now'}
                    </Button>
                </div>
            </form>
        </motion.div>
    );
}
