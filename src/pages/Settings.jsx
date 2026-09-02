import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    User,
    Mail,
    Phone,
    CreditCard,
    Bell,
    Shield,
    Key,
    LogOut,
    ChevronRight,
    CheckCircle2,
    Repeat,
    Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function Settings() {
    const [user, setUser] = useState(null);
    const [form, setForm] = useState({
        full_name: '',
        phone: '',
        user_type: 'landlord',
    });

    const [notifications, setNotifications] = useState({
        payment_reminders: true,
        lease_updates: true,
        maintenance_updates: true,
        marketing: false,
    });

    useEffect(() => {
        appClient.auth.me().then(u => {
            setUser(u);
            const role = u.user_type === 'admin' ? 'sysAdmin' : (u.user_type === 'rentee' ? 'tenant' : (u.user_type || 'tenant'));
            setForm({
                full_name: u.full_name || '',
                phone: u.phone || '',
                user_type: role,
            });
        }).catch(() => { });
    }, []);

    const updateMutation = useMutation({
        mutationFn: (data) => appClient.auth.updateMe(data),
        onSuccess: () => {
            toast.success('Settings saved successfully!');
            setTimeout(() => window.location.reload(), 600);
        },
    });

    const handleSave = () => {
        updateMutation.mutate({ ...form, notifications });
    };

    const handleLogout = () => {
        appClient.auth.logout();
    };

    const settingsSections = [
        {
            title: 'Payment Methods',
            description: 'Manage your payment methods',
            icon: CreditCard,
            items: [
                { label: 'Add Bank Account', icon: Landmark },
                { label: 'Add Debit/Credit Card', icon: CreditCard },
            ]
        },
        {
            title: 'Auto-Pay Settings',
            description: 'Configure automatic payments',
            icon: Repeat,
            items: [
                { label: 'Set Up Auto-Pay', icon: Repeat },
            ]
        },
        {
            title: 'Security',
            description: 'Keep your account secure',
            icon: Shield,
            items: [
                { label: 'Change Password', icon: Key },
                { label: 'Two-Factor Authentication', icon: Shield },
            ]
        },
    ];

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500 mt-1">Manage your account preferences and role</p>
            </div>

            {/* Account Role Badge */}
            <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-zinc-900">Account Type & Persona</h2>
                        <p className="text-xs text-zinc-500">Your active account permissions</p>
                    </div>
                    <Badge className={`capitalize text-xs font-semibold px-2.5 py-1 ${
                        form.user_type === 'sysAdmin' ? 'bg-purple-900 text-white' :
                        form.user_type === 'landlord' ? 'bg-zinc-900 text-white' :
                        'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}>
                        Active: {form.user_type}
                    </Badge>
                </div>
            </div>

            {/* Profile Section */}
            <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
                <h2 className="text-base font-bold text-zinc-900 mb-5">Profile Information</h2>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="name" className="text-xs font-semibold text-zinc-700">Full Name</Label>
                        <Input
                            id="name"
                            value={form.full_name}
                            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                            className="mt-1 h-10 border-zinc-200 focus-visible:ring-zinc-900"
                        />
                    </div>

                    <div>
                        <Label htmlFor="email" className="text-xs font-semibold text-zinc-700">Email Address</Label>
                        <Input
                            id="email"
                            value={user?.email || ''}
                            disabled
                            className="mt-1 h-10 bg-zinc-50 border-zinc-200"
                        />
                        <p className="text-[11px] text-zinc-400 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                        <Label htmlFor="phone" className="text-xs font-semibold text-zinc-700">Phone Number</Label>
                        <Input
                            id="phone"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="+27 82 000 0000"
                            className="mt-1 h-10 border-zinc-200 focus-visible:ring-zinc-900"
                        />
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 bg-zinc-100 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-zinc-900" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-zinc-900">Notifications</h2>
                        <p className="text-xs text-zinc-500">Choose what you want to be notified about</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-medium text-xs text-zinc-900">Payment Reminders</p>
                            <p className="text-[11px] text-zinc-500">Get notified before payments are due</p>
                        </div>
                        <Switch
                            checked={notifications.payment_reminders}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, payment_reminders: checked })}
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-medium text-xs text-zinc-900">Lease Updates</p>
                            <p className="text-[11px] text-zinc-500">Important updates about your leases</p>
                        </div>
                        <Switch
                            checked={notifications.lease_updates}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, lease_updates: checked })}
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-medium text-xs text-zinc-900">Maintenance Updates</p>
                            <p className="text-[11px] text-zinc-500">Status updates on your requests</p>
                        </div>
                        <Switch
                            checked={notifications.maintenance_updates}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, maintenance_updates: checked })}
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-medium text-xs text-zinc-900">Marketing & Tips</p>
                            <p className="text-[11px] text-zinc-500">Rental tips and platform updates</p>
                        </div>
                        <Switch
                            checked={notifications.marketing}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                        />
                    </div>
                </div>
            </div>

            {/* Other Settings */}
            {settingsSections.map((section) => (
                <div
                    key={section.title}
                    className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-zinc-100 flex items-center justify-center">
                            <section.icon className="w-4 h-4 text-zinc-900" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-zinc-900">{section.title}</h2>
                            <p className="text-xs text-zinc-500">{section.description}</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        {section.items.map((item, i) => (
                            <button
                                key={i}
                                className="w-full flex items-center justify-between p-2.5 hover:bg-zinc-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className="w-4 h-4 text-zinc-500" />
                                    <span className="font-medium text-xs text-zinc-800">{item.label}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            {/* Save Button */}
            <div className="flex gap-3">
                <Button
                    className="bg-zinc-900 hover:bg-zinc-800 text-white"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={handleLogout} className="text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-zinc-200">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
