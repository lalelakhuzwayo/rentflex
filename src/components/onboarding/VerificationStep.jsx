import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Upload, FileText, Building2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function VerificationStep({ data, onChange, onNext, onBack }) {
    const verificationItems = [
        {
            id: 'identity',
            title: 'Identity Verification',
            description: 'Upload a government-issued ID',
            icon: FileText,
            required: true,
            verified: data.identity_verified
        },
        {
            id: 'business',
            title: 'Business Verification',
            description: 'Verify your business (if applicable)',
            icon: Building2,
            required: false,
            verified: data.business_verified
        }
    ];

    const handleVerify = (id) => {
        // In real app, this would open file upload or verification flow
        onChange({ ...data, [`${id}_verified`]: true });
    };

    const canProceed = data.identity_verified;

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
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify Your Identity</h2>
                <p className="text-slate-600">This helps build trust with potential tenants</p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm space-y-6">
                {verificationItems.map((item) => (
                    <div
                        key={item.id}
                        className={`p-6 rounded-xl border-2 transition-colors ${item.verified
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-slate-200'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${item.verified ? 'bg-emerald-100' : 'bg-slate-100'
                                    }`}>
                                    {item.verified ? (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                    ) : (
                                        <item.icon className="w-6 h-6 text-slate-500" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                                        {item.required && (
                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                Required
                                            </Badge>
                                        )}
                                        {item.verified && (
                                            <Badge className="bg-emerald-100 text-emerald-700">
                                                Verified
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600">{item.description}</p>
                                </div>
                            </div>
                            {!item.verified && (
                                <Button
                                    onClick={() => handleVerify(item.id)}
                                    size="sm"
                                    className="bg-zinc-900 hover:bg-zinc-800 text-white"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Verify
                                </Button>
                            )}
                        </div>
                    </div>
                ))}

                <div className="bg-zinc-50 p-3.5 border border-zinc-200">
                    <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-zinc-900 mt-0.5" />
                        <div>
                            <p className="font-semibold text-xs text-zinc-900 mb-0.5">Quick Verification</p>
                            <p className="text-[11px] text-zinc-500">
                                Most verifications are completed within 24 hours. You can continue setting up your account while we review.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-3">
                    <Button variant="outline" onClick={onBack} className="flex-1 border-zinc-200">
                        Back
                    </Button>
                    <Button
                        onClick={onNext}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
                        disabled={!canProceed}
                    >
                        Continue
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
