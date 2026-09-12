import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShieldCheck, Upload, FileText, CheckCircle2, AlertTriangle, Info, Lock } from 'lucide-react';
import { validateSouthAfricanID, validateTaxNumber, runAutomatedContractorVerification } from '@/utils/contractorVerificationEngine';

export default function ContractorOnboarding() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'verification'

    const [uploadingFiles, setUploadingFiles] = useState({
        id_doc: false,
        trade_cert: false,
        proof_address: false
    });

    const [formData, setFormData] = useState({
        company_name: '',
        description: '',
        services: [],
        years_experience: '',
        license_number: '',
        phone: '',
        service_areas: '',
        id_number: '',
        tax_number: '',
        id_document_url: '',
        trade_certificate_url: '',
        proof_of_address_url: ''
    });

    useEffect(() => {
        appClient.auth.me().then(setUser);
    }, []);

    // Load existing contractor profile if returning to update verification
    const { data: existingProfile } = useQuery({
        queryKey: ['my-contractor-profile', user?.id || user?.email],
        queryFn: () => appClient.entities.Contractor.filter({ user_id: user?.id || user?.email }).then(r => r[0]),
        enabled: !!user
    });

    useEffect(() => {
        if (existingProfile) {
            setFormData(prev => ({
                ...prev,
                company_name: existingProfile.company_name || existingProfile.business_name || '',
                description: existingProfile.description || '',
                services: Array.isArray(existingProfile.services) ? existingProfile.services : [],
                years_experience: existingProfile.years_experience || '',
                license_number: existingProfile.license_number || '',
                phone: existingProfile.phone || '',
                service_areas: Array.isArray(existingProfile.service_areas) ? existingProfile.service_areas.join(', ') : (existingProfile.service_areas || ''),
                id_number: existingProfile.id_number || '',
                tax_number: existingProfile.tax_number || '',
                id_document_url: existingProfile.id_document_url || '',
                trade_certificate_url: existingProfile.trade_certificate_url || '',
                proof_of_address_url: existingProfile.proof_of_address_url || ''
            }));
        }
    }, [existingProfile]);

    const serviceOptions = [
        'plumbing', 'electrical', 'hvac', 'painting',
        'carpentry', 'cleaning', 'landscaping', 'roofing', 'general'
    ];

    const idValidation = validateSouthAfricanID(formData.id_number);
    const taxValid = !formData.tax_number || validateTaxNumber(formData.tax_number);

    const handleFileUpload = async (e, fieldName, stateKey) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFiles(prev => ({ ...prev, [stateKey]: true }));
        try {
            const res = await appClient.integrations.Core.UploadFile({ file });
            if (res?.file_url) {
                setFormData(prev => ({ ...prev, [fieldName]: res.file_url }));
                toast.success('Document uploaded successfully to secured storage');
            } else {
                toast.error('Failed to obtain uploaded file URL');
            }
        } catch (err) {
            console.error('File upload error:', err);
            toast.error('Document upload failed. Please try again.');
        } finally {
            setUploadingFiles(prev => ({ ...prev, [stateKey]: false }));
        }
    };

    const createProfileMutation = useMutation({
        mutationFn: async (data) => {
            const userId = user?.id || user?.email;
            if (!userId) throw new Error('User session not found');

            const serviceAreasList = typeof data.service_areas === 'string' 
                ? data.service_areas.split(',').map(s => s.trim()).filter(Boolean)
                : (data.service_areas || []);

            const mainTradeCategory = (Array.isArray(data.services) && data.services.length > 0)
                ? data.services[0]
                : 'general';

            // Run automated verification calculation
            const verification = runAutomatedContractorVerification(data);

            const payload = {
                user_id: userId,
                business_name: data.company_name?.trim() || 'Contractor',
                company_name: data.company_name?.trim() || 'Contractor',
                trade_category: mainTradeCategory,
                services: data.services || [],
                description: data.description?.trim() || '',
                years_experience: parseFloat(data.years_experience) || 1,
                phone: data.phone?.trim() || '',
                license_number: data.license_number?.trim() || null,
                service_areas: serviceAreasList,
                rating: existingProfile?.rating || 5.0,
                subscription_status: 'pro',
                // Verification fields
                id_number: data.id_number?.trim() || null,
                tax_number: data.tax_number?.trim() || null,
                id_document_url: data.id_document_url || null,
                trade_certificate_url: data.trade_certificate_url || null,
                proof_of_address_url: data.proof_of_address_url || null,
                verification_status: verification.status,
                verified: verification.verified,
                id_verified: verification.idVerified,
                trade_verified: verification.tradeVerified,
                verification_score: verification.score,
                verified_at: verification.verifiedAt
            };

            const existingProfiles = await appClient.entities.Contractor.filter({ user_id: userId });
            if (existingProfiles && existingProfiles.length > 0) {
                await appClient.entities.Contractor.update(existingProfiles[0].id, payload);
            } else {
                await appClient.entities.Contractor.create(payload);
            }

            await appClient.auth.updateMe({ user_type: 'contractor' });
            return verification;
        },
        onSuccess: (verification) => {
            queryClient.invalidateQueries({ queryKey: ['my-contractor-profile'] });
            if (verification.verified) {
                toast.success(`🎉 Profile & Automated Verification Passed! Score: ${verification.score}/100`);
            } else {
                toast.info(`Profile saved! Verification score: ${verification.score}/100. Status: ${verification.status.toUpperCase()}`);
            }
            navigate(createPageUrl('ContractorDashboard'));
        },
        onError: (err) => {
            console.error('Contractor profile setup error:', err);
            toast.error(err.message || 'Failed to save contractor profile.');
        }
    });

    const toggleService = (service) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.includes(service)
                ? prev.services.filter(s => s !== service)
                : [...prev.services, service]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.services.length === 0) {
            toast.error('Please select at least one trade service');
            return;
        }
        createProfileMutation.mutate(formData);
    };

    return (
        <div className="max-w-3xl mx-auto pb-12">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-zinc-900">Contractor Verification & Profile</h1>
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold">100% Free</Badge>
                </div>
                <p className="text-sm text-zinc-600">
                    Set up your profile and submit your documents for instant automated identity & trade verification.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-zinc-200 mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === 'profile'
                            ? 'border-zinc-900 text-zinc-900'
                            : 'border-transparent text-zinc-500 hover:text-zinc-700'
                    }`}
                >
                    1. Business Profile
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('verification')}
                    className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'verification'
                            ? 'border-zinc-900 text-zinc-900'
                            : 'border-transparent text-zinc-500 hover:text-zinc-700'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    2. Security & Verification
                    {formData.id_number && idValidation.valid && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1" />
                    )}
                </button>
            </div>

            <Card className="p-8 sharp-card bg-white">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* TAB 1: BUSINESS PROFILE */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div>
                                <Label className="text-zinc-800 font-semibold mb-1 block">Company / Business Name *</Label>
                                <Input
                                    placeholder="e.g. Apex Plumbing Solutions Pty Ltd"
                                    value={formData.company_name}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <Label className="text-zinc-800 font-semibold mb-1 block">Business Overview & Specialties</Label>
                                <Textarea
                                    placeholder="Describe your business experience, core services, and team background..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                />
                            </div>

                            <div>
                                <Label className="text-zinc-800 font-semibold mb-3 block">Trade Services Offered *</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {serviceOptions.map(service => (
                                        <div 
                                            key={service} 
                                            onClick={() => toggleService(service)}
                                            className={`flex items-center gap-2 p-3 border sharp-card cursor-pointer transition-all ${
                                                formData.services.includes(service)
                                                    ? 'border-zinc-900 bg-zinc-50 font-medium text-zinc-900'
                                                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={formData.services.includes(service)}
                                                onCheckedChange={() => toggleService(service)}
                                            />
                                            <span className="text-sm capitalize">{service}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-zinc-800 font-semibold mb-1 block">Years of Experience *</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="5"
                                        value={formData.years_experience}
                                        onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-800 font-semibold mb-1 block">Direct Contact Phone *</Label>
                                    <Input
                                        type="tel"
                                        placeholder="+27 82 123 4567"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-zinc-800 font-semibold mb-1 block">Service Areas (comma separated) *</Label>
                                <Input
                                    placeholder="Cape Town Central, Bellville, Sea Point, Claremont"
                                    value={formData.service_areas}
                                    onChange={(e) => setFormData({ ...formData, service_areas: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button
                                    type="button"
                                    onClick={() => setActiveTab('verification')}
                                    className="bg-zinc-900 hover:bg-zinc-800 text-white"
                                >
                                    Proceed to Verification &rarr;
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: AUTOMATED VERIFICATION */}
                    {activeTab === 'verification' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-emerald-900">
                                    <p className="font-bold text-emerald-950 text-sm mb-0.5">Automated Identity & Verification Protocol</p>
                                    <p>
                                        Submitting your SA ID and verified trade documentation instantly runs our automated scoring engine. Verified contractors display a Verified Badge to Landlords and rank higher for bid approvals.
                                    </p>
                                </div>
                            </div>

                            {/* SA ID Verification */}
                            <div className="space-y-2">
                                <Label className="text-zinc-800 font-semibold block">South African 13-Digit ID / Passport Number</Label>
                                <div className="relative">
                                    <Input
                                        placeholder="e.g. 9201015029088"
                                        value={formData.id_number}
                                        onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                                        className={
                                            formData.id_number
                                                ? idValidation.valid
                                                    ? 'border-emerald-500 focus-visible:ring-emerald-500 pr-10'
                                                    : 'border-amber-500 focus-visible:ring-amber-500 pr-10'
                                                : ''
                                        }
                                    />
                                    {formData.id_number && (
                                        <div className="absolute right-3 top-2.5">
                                            {idValidation.valid ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            ) : (
                                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                            )}
                                        </div>
                                    )}
                                </div>
                                {formData.id_number && (
                                    <p className={`text-xs ${idValidation.valid ? 'text-emerald-600 font-medium' : 'text-amber-600'}`}>
                                        {idValidation.valid
                                            ? `✓ Valid SA ID (${idValidation.citizenship}, DOB: ${idValidation.dateOfBirth})`
                                            : `⚠️ ${idValidation.reason}`}
                                    </p>
                                )}
                            </div>

                            {/* Tax & License Numbers */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-zinc-800 font-semibold mb-1 block">SARS Tax Reference Number</Label>
                                    <Input
                                        placeholder="e.g. 9012345678"
                                        value={formData.tax_number}
                                        onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                                    />
                                    {formData.tax_number && !taxValid && (
                                        <p className="text-xs text-amber-600 mt-1">Format: 10 numeric digits</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-zinc-800 font-semibold mb-1 block">Trade License / Registration Number</Label>
                                    <Input
                                        placeholder="e.g. PIRB-12903 / ECBSA-992"
                                        value={formData.license_number}
                                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                                    />
                                </div>
                            </div>

                            <hr className="my-6 border-zinc-200" />

                            {/* Document Uploads */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-zinc-600" />
                                    Secured Verification Documents
                                </h3>

                                {/* Document 1: ID Doc */}
                                <div className="p-4 border sharp-card bg-zinc-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-8 h-8 text-zinc-500 shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm text-zinc-900">ID / Passport Document</p>
                                            <p className="text-xs text-zinc-500">Government issued ID or Passport (PDF, PNG, JPG)</p>
                                            {formData.id_document_url && (
                                                <Badge className="mt-1 bg-emerald-500/20 text-emerald-800 border-emerald-500/30 text-[10px]">
                                                    Uploaded & Verified
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 hover:border-zinc-900 text-xs font-semibold text-zinc-900 sharp-card transition-all shrink-0">
                                        <Upload className="w-4 h-4" />
                                        {uploadingFiles.id_doc ? 'Uploading...' : formData.id_document_url ? 'Replace Document' : 'Upload ID'}
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => handleFileUpload(e, 'id_document_url', 'id_doc')}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                {/* Document 2: Trade Certificate */}
                                <div className="p-4 border sharp-card bg-zinc-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-8 h-8 text-zinc-500 shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm text-zinc-900">Trade License / Qualification Certificate</p>
                                            <p className="text-xs text-zinc-500">Artisan certificate, PIRB, ECB or Industry License</p>
                                            {formData.trade_certificate_url && (
                                                <Badge className="mt-1 bg-emerald-500/20 text-emerald-800 border-emerald-500/30 text-[10px]">
                                                    Uploaded & Verified
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 hover:border-zinc-900 text-xs font-semibold text-zinc-900 sharp-card transition-all shrink-0">
                                        <Upload className="w-4 h-4" />
                                        {uploadingFiles.trade_cert ? 'Uploading...' : formData.trade_certificate_url ? 'Replace Document' : 'Upload Certificate'}
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => handleFileUpload(e, 'trade_certificate_url', 'trade_cert')}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                {/* Document 3: Proof of Address */}
                                <div className="p-4 border sharp-card bg-zinc-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-8 h-8 text-zinc-500 shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm text-zinc-900">Proof of Business Address</p>
                                            <p className="text-xs text-zinc-500">Utility bill or bank statement (&lt; 3 months old)</p>
                                            {formData.proof_of_address_url && (
                                                <Badge className="mt-1 bg-emerald-500/20 text-emerald-800 border-emerald-500/30 text-[10px]">
                                                    Uploaded & Verified
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 hover:border-zinc-900 text-xs font-semibold text-zinc-900 sharp-card transition-all shrink-0">
                                        <Upload className="w-4 h-4" />
                                        {uploadingFiles.proof_address ? 'Uploading...' : formData.proof_of_address_url ? 'Replace Document' : 'Upload Proof'}
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => handleFileUpload(e, 'proof_of_address_url', 'proof_address')}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-between gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setActiveTab('profile')}
                                >
                                    &larr; Back to Profile
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createProfileMutation.isPending}
                                    className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-8"
                                >
                                    {createProfileMutation.isPending ? 'Verifying & Saving...' : 'Submit & Complete Verification'}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </Card>
        </div>
    );
}
