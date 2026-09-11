import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PersonalDetailsStep({ data, onChange, onNext }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.full_name || !data.phone || !data.date_of_birth) return;
        onNext();
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6 text-zinc-900" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-1">Personal Details</h2>
                <p className="text-xs text-zinc-500">Let's start with your profile details</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <div>
                        <Label htmlFor="dob" className="text-xs font-semibold text-zinc-700">Date of Birth *</Label>
                        <Input
                            id="dob"
                            type="date"
                            value={data.date_of_birth}
                            onChange={(e) => onChange({ ...data, date_of_birth: e.target.value })}
                            required
                            className="mt-1"
                        />
                    </div>
                </div>

                <div className="bg-zinc-50 p-3.5 border border-zinc-200">
                    <p className="text-xs text-zinc-700">
                        <strong>📱 Why we need this:</strong> To verify your identity and send you payment reminders
                    </p>
                </div>

                <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white">
                    Continue
                </Button>
            </form>
        </div>
    );
}
