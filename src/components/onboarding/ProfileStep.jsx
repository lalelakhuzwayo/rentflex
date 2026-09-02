import { motion } from 'framer-motion';
import { Building2, User, Briefcase, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function ProfileStep({ data, onChange, onNext, onBack }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.full_name || !data.phone) return;
        onNext();
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6 text-zinc-900" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-1">Set Up Your Profile</h2>
                <p className="text-xs text-zinc-500">Tell us a bit about yourself and your portfolio</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
                <div>
                    <Label className="text-xs font-semibold text-zinc-700">I am a...</Label>
                    <RadioGroup
                        value={data.landlord_type}
                        onValueChange={(v) => onChange({ ...data, landlord_type: v })}
                        className="grid grid-cols-2 gap-3 mt-2"
                    >
                        <label className={`flex items-center gap-3 p-3.5 border cursor-pointer transition-colors ${data.landlord_type === 'individual' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
                            }`}>
                            <RadioGroupItem value="individual" id="individual" />
                            <div>
                                <p className="font-semibold text-xs text-zinc-900">Individual</p>
                                <p className="text-[11px] text-zinc-500">Managing my own properties</p>
                            </div>
                        </label>
                        <label className={`flex items-center gap-3 p-3.5 border cursor-pointer transition-colors ${data.landlord_type === 'company' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
                            }`}>
                            <RadioGroupItem value="company" id="company" />
                            <div>
                                <p className="font-semibold text-xs text-zinc-900">Company</p>
                                <p className="text-[11px] text-zinc-500">Property management business</p>
                            </div>
                        </label>
                    </RadioGroup>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <Label htmlFor="name" className="text-xs font-semibold text-zinc-700">Full Name *</Label>
                        <Input
                            id="name"
                            value={data.full_name}
                            onChange={(e) => onChange({ ...data, full_name: e.target.value })}
                            placeholder="John Smith"
                            required
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="phone" className="text-xs font-semibold text-zinc-700">Phone Number *</Label>
                        <Input
                            id="phone"
                            value={data.phone}
                            onChange={(e) => onChange({ ...data, phone: e.target.value })}
                            placeholder="+27 82 000 0000"
                            required
                            className="mt-1"
                        />
                    </div>
                </div>

                {data.landlord_type === 'company' && (
                    <div>
                        <Label htmlFor="company" className="text-xs font-semibold text-zinc-700">Company Name</Label>
                        <Input
                            id="company"
                            value={data.company_name}
                            onChange={(e) => onChange({ ...data, company_name: e.target.value })}
                            placeholder="Cape Properties Management"
                            className="mt-1"
                        />
                    </div>
                )}

                <div className="flex gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onBack} className="flex-1 border-zinc-200">
                        Back
                    </Button>
                    <Button type="submit" className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white">
                        Continue
                    </Button>
                </div>
            </form>
        </div>
    );
}
