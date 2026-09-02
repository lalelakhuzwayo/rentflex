import { motion } from 'framer-motion';
import { Building2, MapPin, DollarSign, Home } from 'lucide-react';
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

export default function PropertyStep({ data, onChange, onNext, onBack }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.property_title || !data.property_address || !data.monthly_rent) return;
        onNext();
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
                    <Building2 className="w-6 h-6 text-zinc-900" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-1">Add Your First Property</h2>
                <p className="text-xs text-zinc-500">You can add more properties later from your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
                <div>
                    <Label htmlFor="title">Property Title *</Label>
                    <Input
                        id="title"
                        value={data.property_title}
                        onChange={(e) => onChange({ ...data, property_title: e.target.value })}
                        placeholder="e.g., Modern 2BR Downtown Apartment"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                        id="address"
                        value={data.property_address}
                        onChange={(e) => onChange({ ...data, property_address: e.target.value })}
                        placeholder="123 Main Street, Apt 4B"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="city">City *</Label>
                        <Input
                            id="city"
                            value={data.property_city}
                            onChange={(e) => onChange({ ...data, property_city: e.target.value })}
                            placeholder="San Francisco"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                            id="state"
                            value={data.property_state}
                            onChange={(e) => onChange({ ...data, property_state: e.target.value })}
                            placeholder="CA"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="zip">ZIP Code *</Label>
                        <Input
                            id="zip"
                            value={data.property_zip}
                            onChange={(e) => onChange({ ...data, property_zip: e.target.value })}
                            placeholder="94102"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="type">Property Type *</Label>
                        <Select
                            value={data.property_type}
                            onValueChange={(v) => onChange({ ...data, property_type: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="apartment">Apartment</SelectItem>
                                <SelectItem value="house">House</SelectItem>
                                <SelectItem value="condo">Condo</SelectItem>
                                <SelectItem value="townhouse">Townhouse</SelectItem>
                                <SelectItem value="studio">Studio</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Input
                            id="bedrooms"
                            type="number"
                            value={data.bedrooms}
                            onChange={(e) => onChange({ ...data, bedrooms: e.target.value })}
                            placeholder="2"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="rent">Monthly Rent ($) *</Label>
                        <Input
                            id="rent"
                            type="number"
                            value={data.monthly_rent}
                            onChange={(e) => onChange({ ...data, monthly_rent: e.target.value })}
                            placeholder="3500"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="deposit">Security Deposit ($)</Label>
                        <Input
                            id="deposit"
                            type="number"
                            value={data.deposit_amount}
                            onChange={(e) => onChange({ ...data, deposit_amount: e.target.value })}
                            placeholder="7000"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                        id="description"
                        value={data.property_description}
                        onChange={(e) => onChange({ ...data, property_description: e.target.value })}
                        placeholder="Describe your property..."
                        rows={3}
                    />
                </div>

                <div className="bg-zinc-50 p-3.5 border border-zinc-200">
                    <p className="text-xs text-zinc-700">
                        <strong>💡 Tip:</strong> Properties with detailed descriptions and photos get 3x more quality applications!
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
