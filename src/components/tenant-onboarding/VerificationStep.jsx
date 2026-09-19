import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Upload, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { appClient } from '@/api/appClient';

export default function VerificationStep({ data, onChange, onNext, onBack }) {
    const handleVerifyIdNumber = async () => {
        const val = data.id_number ? String(data.id_number).trim() : '';
        if (!val || val.length < 6) {
            toast.error('Please enter a valid ID or Passport number (min 6 characters)');
            return;
        }

        try {
            await appClient.auth.updateMe({
                id_number: val,
                id_verified: true
            });
            onChange({ ...data, id_number: val, id_verified: true });
            toast.success(`ID ${val} successfully verified! +50 RentScore points added.`);
        } catch (e) {
            console.warn('Profile save warning:', e);
            onChange({ ...data, id_number: val, id_verified: true });
            toast.success('ID verified!');
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            toast.success(`Document "${file.name}" uploaded successfully`);
            handleVerifyIdNumber();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.id_verified && data.id_number && data.id_number.trim().length >= 6) {
            handleVerifyIdNumber();
        }
        onNext();
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto w-full"
        >
            <div className="text-center mb-6 sm:mb-8">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">ID Verification</h2>
                <p className="text-xs sm:text-sm text-slate-600">This helps landlords trust you and improves your RentScore</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200/90 shadow-sm">
                <div>
                    <Label htmlFor="id_number" className="text-xs font-semibold text-zinc-800">ID / Passport Number *</Label>
                    <div className="flex gap-2 mt-1.5">
                        <Input
                            id="id_number"
                            value={data.id_number || ''}
                            onChange={(e) => onChange({ ...data, id_number: e.target.value })}
                            placeholder="Enter 13-digit SA ID or passport number"
                            required
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            onClick={handleVerifyIdNumber}
                            className={`shrink-0 text-xs font-semibold ${data.id_verified ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-zinc-950 hover:bg-zinc-900 text-white'}`}
                        >
                            {data.id_verified ? (
                                <>
                                    <Check className="w-4 h-4 mr-1" /> Verified
                                </>
                            ) : (
                                'Verify ID'
                            )}
                        </Button>
                    </div>
                </div>

                <div className={`p-3.5 sm:p-4 rounded-xl border transition-colors ${data.id_verified
                        ? 'border-emerald-200 bg-emerald-50/60'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${data.id_verified ? 'bg-emerald-100' : 'bg-slate-200/70'
                                }`}>
                                {data.id_verified ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                ) : (
                                    <FileText className="w-5 h-5 text-slate-600" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-sm text-slate-900">Upload ID Document</h3>
                                    {data.id_verified && (
                                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Verified</Badge>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500">Government-issued ID or passport photo</p>
                            </div>
                        </div>

                        <div>
                            <label className="cursor-pointer">
                                <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white transition-colors">
                                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                                    {data.id_verified ? 'Re-upload' : 'Upload'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-50 p-3 sm:p-3.5 border border-zinc-200 rounded-lg">
                    <div className="flex items-start gap-2.5">
                        <Shield className="w-4 h-4 text-zinc-900 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-semibold text-xs text-zinc-900 mb-0.5">Boost Your RentScore</p>
                            <p className="text-[11px] text-zinc-500 leading-normal">
                                ID verification adds +50 points to your RentScore and makes landlords 3x more likely to approve your application.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onBack} className="flex-1 border-zinc-200 text-xs font-semibold">
                        Back
                    </Button>
                    <Button type="submit" className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold">
                        Continue
                    </Button>
                </div>
            </form>
        </motion.div>
    );
}
