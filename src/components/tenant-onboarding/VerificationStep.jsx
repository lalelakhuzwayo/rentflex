import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Upload, FileText, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function VerificationStep({ data, onChange, onNext, onBack }) {
    const handleVerify = () => {
        // Simulate ID verification
        onChange({ ...data, id_verified: true });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onNext();
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">ID Verification</h2>
                <p className="text-slate-600">This helps landlords trust you and improves your RentScore</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm">
                <div>
                    <Label htmlFor="id_number">ID / Passport Number *</Label>
                    <Input
                        id="id_number"
                        value={data.id_number}
                        onChange={(e) => onChange({ ...data, id_number: e.target.value })}
                        placeholder="Enter your ID or passport number"
                        required
                    />
                </div>

                <div className={`p-6 rounded-xl border-2 transition-colors ${data.id_verified
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${data.id_verified ? 'bg-emerald-100' : 'bg-slate-100'
                                }`}>
                                {data.id_verified ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                ) : (
                                    <FileText className="w-6 h-6 text-slate-500" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-slate-900">Upload ID Document</h3>
                                    {data.id_verified && (
                                        <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600">Government-issued ID or passport photo</p>
                            </div>
                        </div>
                        {!data.id_verified && (
                            <Button
                                type="button"
                                onClick={handleVerify}
                                size="sm"
                                className="bg-zinc-900 hover:bg-zinc-800 text-white"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload
                            </Button>
                        )}
                    </div>
                </div>

                <div className="bg-zinc-50 p-3.5 border border-zinc-200">
                    <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 text-zinc-900 mt-0.5" />
                        <div>
                            <p className="font-semibold text-xs text-zinc-900 mb-0.5">Boost Your RentScore</p>
                            <p className="text-[11px] text-zinc-500">
                                ID verification adds +50 points to your RentScore and makes landlords 3x more likely to approve your application.
                            </p>
                        </div>
                    </div>
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
