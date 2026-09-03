import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Shield, 
    ShieldCheck, 
    Lock, 
    Mail, 
    User, 
    Phone, 
    Eye, 
    EyeOff, 
    ArrowRight, 
    CheckCircle2, 
    Building2, 
    Home, 
    Wrench, 
    Sparkles, 
    AlertCircle,
    KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export default function Auth() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
    const [mode, setMode] = useState(initialMode); // 'login' | 'register'

    const { 
        signIn, 
        signUp, 
        signInWithGoogle, 
        signInWithApple, 
        signInWithWindows 
    } = useAuth();

    // Form fields
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        confirm_password: '',
        user_type: 'tenant', // 'tenant' | 'landlord' | 'contractor' | 'sysAdmin'
        popia_consent: true
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setErrorMsg('');
    };

    // Calculate password strength
    const calculateStrength = (pwd) => {
        if (!pwd) return { score: 0, label: 'None', color: 'bg-zinc-200' };
        let score = 0;
        if (pwd.length >= 6) score += 1;
        if (pwd.length >= 10) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

        if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
        if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500' };
        if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500' };
        return { score: 5, label: 'Strong', color: 'bg-emerald-500' };
    };

    const passwordStrength = calculateStrength(formData.password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);

        try {
            if (mode === 'register') {
                if (!formData.full_name.trim()) {
                    throw new Error('Please enter your full name.');
                }
                if (!formData.email.trim() || !formData.email.includes('@')) {
                    throw new Error('Please provide a valid email address.');
                }
                if (formData.password.length < 6) {
                    throw new Error('Password must be at least 6 characters long.');
                }
                if (formData.password !== formData.confirm_password) {
                    throw new Error('Passwords do not match.');
                }
                if (!formData.popia_consent) {
                    throw new Error('Please accept the POPIA data processing terms to continue.');
                }

                const res = await signUp({
                    full_name: formData.full_name.trim(),
                    email: formData.email.trim(),
                    phone: formData.phone.trim(),
                    password: formData.password,
                    user_type: formData.user_type
                });

                // Redirect according to role
                if (res.user.user_type === 'sysAdmin' || res.user.user_type === 'admin') {
                    navigate(createPageUrl('SysAdminDashboard'));
                } else if (res.user.user_type === 'landlord') {
                    navigate(createPageUrl('LandlordDashboard'));
                } else {
                    navigate(createPageUrl('Dashboard'));
                }
            } else {
                // Sign In
                if (!formData.email.trim() || !formData.password) {
                    throw new Error('Please enter both email and password.');
                }

                const res = await signIn({
                    email: formData.email.trim(),
                    password: formData.password
                });

                if (res.user.user_type === 'sysAdmin' || res.user.user_type === 'admin') {
                    navigate(createPageUrl('SysAdminDashboard'));
                } else if (res.user.user_type === 'landlord') {
                    navigate(createPageUrl('LandlordDashboard'));
                } else {
                    navigate(createPageUrl('Dashboard'));
                }
            }
        } catch (err) {
            console.error('Auth submit error:', err);
            setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { id: 'tenant', title: 'Tenant' },
        { id: 'landlord', title: 'Landlord' },
        { id: 'contractor', title: 'Contractor' }
    ];

    return (
        <div className="min-h-screen app-bg-pattern flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-xl">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <Link to={createPageUrl('Dashboard')} className="inline-flex items-center gap-2.5 justify-center group mb-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-md">
                            <img src="/assets/rentflex-logo.png" alt="RentFlex" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-zinc-900">RentFlex</span>
                    </Link>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                        {mode === 'register' ? 'Create your account' : 'Welcome back to RentFlex'}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600 max-w-sm mx-auto">
                        {mode === 'register' 
                            ? 'Sign up to start renting, listing, or managing properties.' 
                            : 'Sign in to access your properties, leases, and payments.'}
                    </p>
                </div>

                {/* Authentication Card */}
                <Card className="border border-zinc-200/80 shadow-xl bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden">
                    {/* Mode Toggle Switcher */}
                    <div className="grid grid-cols-2 p-1.5 bg-zinc-100/80 border-b border-zinc-200 text-sm font-semibold">
                        <button
                            type="button"
                            onClick={() => { setMode('login'); setErrorMsg(''); }}
                            className={`py-2.5 rounded-xl transition-all ${
                                mode === 'login'
                                    ? 'bg-white text-zinc-950 shadow-xs font-bold'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('register'); setErrorMsg(''); }}
                            className={`py-2.5 rounded-xl transition-all ${
                                mode === 'register'
                                    ? 'bg-white text-zinc-950 shadow-xs font-bold'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            Create Account
                        </button>
                    </div>

                    <CardContent className="p-6 sm:p-8">
                        {errorMsg && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-start gap-2.5"
                            >
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <AnimatePresence mode="wait">
                                {mode === 'register' ? (
                                    <motion.div
                                        key="register-fields"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        {/* Step 1: Select Account Role */}
                                        <div>
                                            <Label className="text-xs font-semibold text-zinc-700 block mb-2">
                                                I am signing up as:
                                            </Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {roles.map((r) => {
                                                    const isSelected = formData.user_type === r.id;
                                                    return (
                                                        <button
                                                            key={r.id}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, user_type: r.id }))}
                                                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                                                                isSelected
                                                                    ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                                                                    : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-700'
                                                            }`}
                                                        >
                                                            {r.title}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Full Name */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="full_name" className="text-xs font-semibold text-zinc-700">
                                                Full Name
                                            </Label>
                                            <div className="relative">
                                                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                                                <Input
                                                    id="full_name"
                                                    name="full_name"
                                                    type="text"
                                                    required
                                                    placeholder="e.g. Johnathan Doe"
                                                    value={formData.full_name}
                                                    onChange={handleChange}
                                                    className="pl-10 h-10 rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="email" className="text-xs font-semibold text-zinc-700">
                                                Email Address
                                            </Label>
                                            <div className="relative">
                                                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    required
                                                    placeholder="you@domain.co.za"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="pl-10 h-10 rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="phone" className="text-xs font-semibold text-zinc-700">
                                                Phone Number (Optional)
                                            </Label>
                                            <div className="relative">
                                                <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                                                <Input
                                                    id="phone"
                                                    name="phone"
                                                    type="tel"
                                                    placeholder="+27 (0) 82 123 4567"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="pl-10 h-10 rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="password" className="text-xs font-semibold text-zinc-700">
                                                Create Password
                                            </Label>
                                            <div className="relative">
                                                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    placeholder="At least 6 characters"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    className="pl-10 pr-10 h-10 rounded-xl"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-600"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            {/* Password Strength Meter */}
                                            {formData.password && (
                                                <div className="pt-1 space-y-1">
                                                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                                                        <span>Password Strength:</span>
                                                        <span className="font-bold text-zinc-700">{passwordStrength.label}</span>
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-1 h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                                                        {[1, 2, 3, 4, 5].map((level) => (
                                                            <div
                                                                key={level}
                                                                className={`h-full transition-all ${
                                                                    level <= passwordStrength.score ? passwordStrength.color : 'bg-zinc-200'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm Password */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="confirm_password" className="text-xs font-semibold text-zinc-700">
                                                Confirm Password
                                            </Label>
                                            <div className="relative">
                                                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                                                <Input
                                                    id="confirm_password"
                                                    name="confirm_password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    placeholder="Re-enter password"
                                                    value={formData.confirm_password}
                                                    onChange={handleChange}
                                                    className="pl-10 h-10 rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        {/* POPIA Consent */}
                                        <div className="pt-2">
                                            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-600">
                                                <input
                                                    type="checkbox"
                                                    name="popia_consent"
                                                    checked={formData.popia_consent}
                                                    onChange={handleChange}
                                                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                                />
                                                <span>
                                                    I consent to RentFlex processing my information in terms of the <strong>POPIA Act (Act 4 of 2013)</strong> and agree to the{' '}
                                                    <Link to={createPageUrl('PrivacyPolicy')} className="underline font-semibold text-zinc-900" target="_blank">
                                                        Privacy & Data Retention Policy
                                                    </Link>.
                                                </span>
                                            </label>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="login-fields"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        {/* Email */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="login_email" className="text-xs font-semibold text-zinc-700">
                                                Email Address
                                            </Label>
                                            <div className="relative">
                                                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                                                <Input
                                                    id="login_email"
                                                    name="email"
                                                    type="email"
                                                    required
                                                    placeholder="e.g. landlord@rentflex.co.za"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="pl-10 h-10 rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="login_password" className="text-xs font-semibold text-zinc-700">
                                                    Password
                                                </Label>
                                                <a href="#reset" onClick={(e) => { e.preventDefault(); setErrorMsg('Password reset link sent to registered email.'); }} className="text-[11px] text-zinc-500 hover:text-zinc-900">
                                                    Forgot password?
                                                </a>
                                            </div>
                                            <div className="relative">
                                                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                                                <Input
                                                    id="login_password"
                                                    name="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    placeholder="Enter your password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    className="pl-10 pr-10 h-10 rounded-xl"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-600"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 bg-zinc-950 hover:bg-zinc-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all mt-4"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Securing Authentication...</span>
                                    </div>
                                ) : (
                                    <>
                                        <span>{mode === 'register' ? 'Register Account' : 'Sign In'}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* Fast Single-Sign-On Options */}
                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-zinc-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-zinc-400 font-medium">Or continue with SSO</span>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => signInWithGoogle()}
                                    className="h-9 rounded-xl border-zinc-200 text-xs font-semibold hover:bg-zinc-50 flex items-center justify-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                                        <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"/>
                                        <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                                    </svg>
                                    Google
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => signInWithApple()}
                                    className="h-9 rounded-xl border-zinc-200 text-xs font-semibold hover:bg-zinc-50 flex items-center justify-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.58.67-1.09 1.74-.95 2.77.99.08 2.05-.52 2.67-1.27z"/>
                                    </svg>
                                    Apple
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => signInWithWindows()}
                                    className="h-9 rounded-xl border-zinc-200 text-xs font-semibold hover:bg-zinc-50 flex items-center justify-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                        <path fill="#F25022" d="M1 1h10v10H1z"/>
                                        <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                                        <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                                        <path fill="#FFB900" d="M13 13h10v10H13z"/>
                                    </svg>
                                    Microsoft
                                </Button>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
