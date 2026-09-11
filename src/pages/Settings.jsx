import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useMutation } from '@tanstack/react-query';
import {
    CreditCard,
    BellRing,
    Shield,
    Key,
    LogOut,
    ChevronRight,
    CheckCircle2,
    Repeat,
    Landmark,
    Smartphone,
    Download,
    AlertTriangle,
    Volume2,
    Send,
    Share2,
    PlusSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { pushNotifications } from '@/lib/pushNotifications';
import { usePWAInstall } from '@/lib/usePWAInstall';

export default function Settings() {
    const [user, setUser] = useState(null);
    const [form, setForm] = useState({
        full_name: '',
        phone: '',
        user_type: 'landlord',
    });

    const [notifications, setNotifications] = useState({
        push_enabled: false,
        payment_reminders: true,
        lease_updates: true,
        maintenance_updates: true,
        marketing: false,
        sound_enabled: true
    });

    const [pushPermission, setPushPermission] = useState('default');
    const [isSubscribingPush, setIsSubscribingPush] = useState(false);
    const [isTestingPush, setIsTestingPush] = useState(false);
    const [showIOSModal, setShowIOSModal] = useState(false);

    const { isInstallable, isInstalled, isIOS, isMobile, promptInstall } = usePWAInstall();

    useEffect(() => {
        // 1. Load user profile
        appClient.auth.me().then(u => {
            setUser(u);
            const role = u.user_type === 'rentee' ? 'tenant' : (u.user_type || 'tenant');
            setForm({
                full_name: u.full_name || '',
                phone: u.phone || '',
                user_type: role,
            });

            // 2. Load stored notification preferences
            const loaded = pushNotifications.loadPreferences(u);
            setNotifications(loaded);
        }).catch(() => { });

        // 3. Detect current browser notification permission
        const perm = pushNotifications.getPermission();
        setPushPermission(perm);
    }, []);

    const updateMutation = useMutation({
        mutationFn: async (/** @type {any} */ data) => {
            // Save profile details and notification preferences
            await appClient.auth.updateMe({
                full_name: data.full_name,
                phone: data.phone,
                user_type: data.user_type,
                notification_preferences: data.notifications
            });
            await pushNotifications.savePreferences(data.notifications);
            return true;
        },
        onSuccess: () => {
            toast.success('Settings & preferences saved successfully!');
            setTimeout(() => window.location.reload(), 600);
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to save settings');
        }
    });

    const handleSave = () => {
        updateMutation.mutate({ ...form, notifications });
    };

    const handleLogout = () => {
        appClient.auth.logout();
    };

    // Toggle Master Push Notifications
    const handlePushToggle = async (enabled) => {
        if (enabled) {
            setIsSubscribingPush(true);
            try {
                toast.info('Requesting browser push notification permission...');
                const sub = await pushNotifications.subscribe();
                const newPerm = pushNotifications.getPermission();
                setPushPermission(newPerm);

                const updated = { ...notifications, push_enabled: true };
                setNotifications(updated);
                await pushNotifications.savePreferences(updated);

                toast.success('Push notifications enabled for this device!');
            } catch (err) {
                console.error('Push activation error:', err);
                const currentPerm = pushNotifications.getPermission();
                setPushPermission(currentPerm);
                toast.error(err.message || 'Could not enable push notifications.');
            } finally {
                setIsSubscribingPush(false);
            }
        } else {
            try {
                await pushNotifications.unsubscribe();
                const updated = { ...notifications, push_enabled: false };
                setNotifications(updated);
                await pushNotifications.savePreferences(updated);
                toast.info('Push notifications disabled on this device.');
            } catch (err) {
                toast.error('Failed to unsubscribe from push notifications.');
            }
        }
    };

    // Send Live Test Push Notification
    const handleSendTestPush = async () => {
        setIsTestingPush(true);
        try {
            toast.info('Dispatching live test push alert...');
            await pushNotifications.sendTestNotification({
                title: 'RentFlex Alert: Instant Push Verification',
                body: 'Your device is connected! Real-time notifications for rent, leases, and maintenance are live.',
                url: '/Settings'
            });
            toast.success('Push notification sent! Check your screen or notification drawer.');
        } catch (err) {
            toast.error(err.message || 'Failed to trigger test notification. Check browser permissions.');
        } finally {
            setIsTestingPush(false);
        }
    };

    // Handle Mobile Download
    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSModal(true);
        } else if (isInstallable) {
            await promptInstall();
        } else {
            setShowIOSModal(true);
        }
    };

    const settingsSections = [
        {
            title: 'Payment Methods',
            description: 'Manage your payment methods and bank accounts',
            icon: CreditCard,
            items: [
                { label: 'Add Bank Account', icon: Landmark },
                { label: 'Add Debit/Credit Card', icon: CreditCard },
            ]
        },
        {
            title: 'Auto-Pay Settings',
            description: 'Configure automatic monthly rent deduction',
            icon: Repeat,
            items: [
                { label: 'Set Up Auto-Pay', icon: Repeat },
            ]
        },
        {
            title: 'Security & Access',
            description: 'Keep your RentFlex credentials secured',
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
                <p className="text-slate-500 mt-1">Manage your account preferences, notifications, and mobile app</p>
            </div>

            {/* Account Role Badge */}
            <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-zinc-900">Account Type & Persona</h2>
                        <p className="text-xs text-zinc-500">Your active account permissions and platform scope</p>
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

            {/* Mobile App & PWA Download Card */}
            <div className="sharp-card bg-white p-6 border border-zinc-200/90 hover:border-zinc-900 transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 shadow-xs">
                            <Smartphone className="w-6 h-6 text-zinc-900" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-zinc-900">RentFlex Mobile App</h2>
                                {isInstalled ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Installed
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-full">
                                        PWA Ready
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                                {isInstalled
                                    ? 'You are running the official RentFlex mobile app in standalone mode.'
                                    : 'Download RentFlex to your home screen for high-speed offline access, fullscreen mode, and native gestures.'}
                            </p>
                        </div>
                    </div>

                    {!isInstalled && (
                        <Button
                            onClick={handleInstallClick}
                            className="bg-zinc-900 text-white hover:bg-zinc-800 shrink-0 text-xs font-bold h-9 px-4 rounded-xl shadow-xs flex items-center gap-2"
                        >
                            <Download className="w-4 h-4 text-white" />
                            <span>Download App</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Profile Section */}
            <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200">
                <h2 className="text-base font-bold text-zinc-900 mb-5">Profile Information</h2>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="name" className="text-xs font-semibold text-zinc-700">Full Name / Username</Label>
                        <Input
                            id="name"
                            value={form.full_name}
                            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                            className="mt-1 h-10 border-zinc-200 focus-visible:ring-zinc-900 text-xs"
                        />
                    </div>

                    <div>
                        <Label htmlFor="email" className="text-xs font-semibold text-zinc-700">Email Address</Label>
                        <Input
                            id="email"
                            value={user?.email || ''}
                            disabled
                            className="mt-1 h-10 bg-zinc-50 border-zinc-200 text-xs"
                        />
                        <p className="text-[11px] text-zinc-400 mt-1">Email is managed by Supabase Secured Auth</p>
                    </div>

                    <div>
                        <Label htmlFor="phone" className="text-xs font-semibold text-zinc-700">Phone Number</Label>
                        <Input
                            id="phone"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="+27 82 000 0000"
                            className="mt-1 h-10 border-zinc-200 focus-visible:ring-zinc-900 text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Production Push Notifications Section */}
            <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-zinc-100 flex items-center justify-center rounded-lg">
                            <BellRing className="w-4 h-4 text-zinc-900" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-zinc-900">Push Notifications & Alerts</h2>
                            <p className="text-xs text-zinc-500">Configure Web Push alerts and live delivery to this device</p>
                        </div>
                    </div>
                </div>

                {/* Blocked Notification Guidance Alert */}
                {pushPermission === 'denied' && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <strong className="block font-semibold">Browser Notifications Blocked</strong>
                            <span className="text-[11px] text-amber-800 mt-0.5 block">
                                Your browser has blocked notifications for this site. To re-enable, tap the lock/tune icon in your browser URL address bar and change Notifications to "Allow".
                            </span>
                        </div>
                    </div>
                )}

                {/* Master Push Switch */}
                <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/80 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="font-semibold text-xs text-zinc-900 flex items-center gap-1.5">
                            <span>Enable Push Notifications (This Device)</span>
                            <span className="text-[10px] bg-zinc-900 text-white px-1.5 py-0.2 rounded font-mono font-medium">
                                Web Push
                            </span>
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                            Receive real-time notifications even when the RentFlex tab or app is in the background
                        </p>
                    </div>
                    <Switch
                        checked={notifications.push_enabled && pushPermission === 'granted'}
                        disabled={isSubscribingPush || pushPermission === 'denied'}
                        onCheckedChange={handlePushToggle}
                    />
                </div>

                {/* Test Push Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div>
                        <p className="text-xs font-semibold text-zinc-900">Instant Push Verification</p>
                        <p className="text-[11px] text-zinc-500">Send an immediate test push to verify sound, icon, and delivery</p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSendTestPush}
                        disabled={isTestingPush}
                        className="h-8 px-3 text-xs font-semibold rounded-lg border-zinc-200 hover:bg-zinc-50 flex items-center gap-1.5 shadow-2xs"
                    >
                        <Send className={`w-3.5 h-3.5 text-zinc-700 ${isTestingPush ? 'animate-bounce' : ''}`} />
                        <span>{isTestingPush ? 'Dispatching...' : 'Send Test Notification'}</span>
                    </Button>
                </div>

                <Separator />

                {/* Granular Categories */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Alert Categories</h3>

                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="font-medium text-xs text-zinc-900">Rent & Escrow Payment Alerts</p>
                            <p className="text-[11px] text-zinc-500">Alerts 3 days before rent is due, payment confirmations, and BNPL reminders</p>
                        </div>
                        <Switch
                            checked={notifications.payment_reminders}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, payment_reminders: checked })}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="font-medium text-xs text-zinc-900">Digital Lease & Counter-Signatures</p>
                            <p className="text-[11px] text-zinc-500">Real-time alerts when leases are drafted, signed by tenant/landlord, or expiring</p>
                        </div>
                        <Switch
                            checked={notifications.lease_updates}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, lease_updates: checked })}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="font-medium text-xs text-zinc-900">Maintenance & Contractor Work</p>
                            <p className="text-[11px] text-zinc-500">Ticket updates, contractor job assignments, and work completion verification</p>
                        </div>
                        <Switch
                            checked={notifications.maintenance_updates}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, maintenance_updates: checked })}
                        />
                    </div>



                    <Separator />

                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="font-medium text-xs text-zinc-900 flex items-center gap-1.5">
                                <Volume2 className="w-3.5 h-3.5 text-zinc-600" />
                                <span>Haptic Vibration & Alert Sound</span>
                            </p>
                            <p className="text-[11px] text-zinc-500">Play tone and haptic vibration for incoming push alerts</p>
                        </div>
                        <Switch
                            checked={notifications.sound_enabled}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, sound_enabled: checked })}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="font-medium text-xs text-zinc-900">Rental Market Insights & Tips</p>
                            <p className="text-[11px] text-zinc-500">Monthly proptech advisories and South African rental benchmark updates</p>
                        </div>
                        <Switch
                            checked={notifications.marketing}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                        />
                    </div>
                </div>
            </div>

            {/* Other Settings Sections */}
            {settingsSections.map((section) => (
                <div
                    key={section.title}
                    className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-zinc-100 flex items-center justify-center rounded-lg">
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
                                className="w-full flex items-center justify-between p-2.5 hover:bg-zinc-50 transition-colors rounded-lg text-left"
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

            {/* Save & Sign Out Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                    className="bg-zinc-900 hover:bg-zinc-800 text-white h-10 px-6 text-xs font-semibold rounded-xl shadow-xs"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                >
                    {updateMutation.isPending ? 'Saving Preferences...' : 'Save All Preferences'}
                </Button>
                <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-zinc-200 h-10 px-4 text-xs font-semibold rounded-xl"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </div>

            {/* iOS Installation Instructions Modal */}
            <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
                <DialogContent className="max-w-sm rounded-2xl bg-white p-6">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center mb-3">
                            <Smartphone className="w-6 h-6 text-white" />
                        </div>
                        <DialogTitle className="text-center text-lg font-bold text-zinc-900">
                            Download RentFlex to Your Device
                        </DialogTitle>
                        <DialogDescription className="text-center text-xs text-zinc-500 pt-1">
                            Install RentFlex as a native mobile application for instant offline access and push notifications.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5 pt-3">
                        <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                            <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                                1
                            </div>
                            <div className="text-xs text-zinc-700 leading-relaxed">
                                {isIOS ? (
                                    <>
                                        Tap the <strong className="text-zinc-950">Share button</strong>{' '}
                                        <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> at the bottom of Safari.
                                    </>
                                ) : (
                                    <>
                                        Tap the browser options <strong className="text-zinc-950">(three dots ⋮)</strong>.
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                            <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                                2
                            </div>
                            <div className="text-xs text-zinc-700 leading-relaxed">
                                Scroll down and tap <strong className="text-zinc-950">'Add to Home Screen'</strong>{' '}
                                <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-zinc-800" /> or <strong className="text-zinc-950">'Install App'</strong>.
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                                3
                            </div>
                            <div className="text-xs text-zinc-700 leading-relaxed">
                                Tap <strong className="text-zinc-950">'Add'</strong>. RentFlex will now appear on your phone home screen like a native app!
                            </div>
                        </div>

                        <Button
                            onClick={() => setShowIOSModal(false)}
                            className="w-full bg-zinc-900 text-white rounded-xl h-10 text-xs font-semibold mt-2"
                        >
                            Got It
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
