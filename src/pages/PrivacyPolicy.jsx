import React from 'react';
import { motion } from 'framer-motion';
import { 
    Lock, 
    FileText, 
    Scale, 
    AlertTriangle, 
    UserCheck, 
    Database, 
    Download,
    Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function PrivacyPolicy() {
    const handleDownloadPolicy = () => {
        const text = `RENTFLEX STATUTORY POPIA & DATA RETENTION POLICY (ACT NO. 4 OF 2013)\nLast Revision: September 1, 2026\nInformation Officer: privacy@rentflex.co.za\nJurisdiction: Republic of South Africa\nFull Document Available at: https://rentflex.co.za/PrivacyPolicy`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RentFlex-POPIA-Legal-Policy-2026.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Policy document summary downloaded');
    };

    const lawfulConditions = [
        {
            num: 1,
            title: 'Accountability (Section 8)',
            description: 'RentFlex ensures full compliance with all conditions for lawful processing of personal information across all system layers and operational processes.'
        },
        {
            num: 2,
            title: 'Processing Limitation (Sections 9-12)',
            description: 'Personal data is processed lawfully, in a reasonable manner that does not infringe on privacy, and strictly with explicit data subject consent or legitimate contractual necessity.'
        },
        {
            num: 3,
            title: 'Purpose Specification (Sections 13-14)',
            description: 'Information is collected for defined, explicit, and lawful purposes relating to rental facilitation, credit vetting, lease enforcement, and escrow management.'
        },
        {
            num: 4,
            title: 'Further Processing Limitation (Section 15)',
            description: 'Secondary processing is strictly compatible with the original purpose of collection and is never sold or rented to unauthorized third-party advertisers.'
        },
        {
            num: 5,
            title: 'Information Quality (Section 16)',
            description: 'RentFlex takes reasonably practicable steps to ensure that personal data is complete, accurate, not misleading, and kept up to date.'
        },
        {
            num: 6,
            title: 'Openness (Sections 17-18)',
            description: 'Transparent documentation is maintained, and data subjects are notified when their information is collected, detailing purpose, recipients, and rights.'
        },
        {
            num: 7,
            title: 'Security Safeguards (Sections 19-22)',
            description: 'Integrity and confidentiality are secured through technical measures including AES-256 encryption at rest, TLS 1.3 in transit, and PostgreSQL Row-Level Security.'
        },
        {
            num: 8,
            title: 'Data Subject Participation (Sections 23-25)',
            description: 'Users maintain direct statutory rights to access, confirm, correct, update, or request the deletion of their personal information at any time.'
        }
    ];

    const retentionSchedule = [
        {
            category: 'Financial & Escrow Records',
            retention: '5 Years from Date of Transaction',
            statute: 'Tax Administration Act (s29) & Companies Act (s24)',
            basis: 'Statutory compliance for rental receipts, invoice tracking, deposit interest statements, and auditing.'
        },
        {
            category: 'Lease Agreements & Inspections',
            retention: '3 Years post-termination',
            statute: 'Prescription Act (Act 68 of 1969) s11 & Rental Housing Act',
            basis: 'Defense and resolution of contractual claims, lease covenants, or inspection damages.'
        },
        {
            category: 'Tenant Screening & Vetting Data',
            retention: '6 Months (Unsuccessful) / Active Lease Term',
            statute: 'National Credit Act (NCA) Regulations & POPIA s14',
            basis: 'Credit vetting scores and bank affordability checks purged after application conclusion.'
        },
        {
            category: 'Security & Access Audit Logs',
            retention: '2 Years Rolling',
            statute: 'Electronic Communications and Transactions Act (ECTA)',
            basis: 'Platform integrity monitoring, fraud prevention, and regulatory cybersecurity auditability.'
        },
        {
            category: 'Biometric & Identity Verification',
            retention: 'Term of Active Account + 90 Days',
            statute: 'POPIA Section 26 (Special Personal Information)',
            basis: 'Identity fraud prevention and immediate cryptographic anonymization upon account closure.'
        }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-16">
            {/* Header Banner */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-zinc-950 text-white p-6 sm:p-8 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            Legal, Privacy & Data Governance Framework
                        </h1>
                        <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
                            Comprehensive disclosure of how RentFlex collects, processes, secures, retains, and protects personal and financial data in accordance with statutory South African privacy legislation.
                        </p>
                    </div>

                    <Button 
                        onClick={handleDownloadPolicy}
                        className="bg-white text-zinc-950 hover:bg-zinc-100 font-semibold text-xs shrink-0 h-10 px-4"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download Summary
                    </Button>
                </div>

                {/* Key Legal Metadata Bar */}
                <div className="mt-6 pt-6 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-zinc-300">
                    <div>
                        <span className="text-zinc-500 block text-[11px]">Responsible Party</span>
                        <strong className="text-zinc-200">RentFlex (Pty) Ltd</strong>
                    </div>
                    <div>
                        <span className="text-zinc-500 block text-[11px]">Registration Number</span>
                        <strong className="text-zinc-200">2024/789123/07</strong>
                    </div>
                    <div>
                        <span className="text-zinc-500 block text-[11px]">Information Officer</span>
                        <strong className="text-zinc-200">privacy@rentflex.co.za</strong>
                    </div>
                    <div>
                        <span className="text-zinc-500 block text-[11px]">Last Regulatory Audit</span>
                        <strong className="text-emerald-400">September 2026 (Active)</strong>
                    </div>
                </div>
            </motion.div>

            {/* Navigation Tabs for Legal Sections */}
            <Tabs defaultValue="popia" className="space-y-6">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-zinc-100 rounded-xl">
                    <TabsTrigger value="popia" className="py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        8 POPIA Conditions
                    </TabsTrigger>
                    <TabsTrigger value="retention" className="py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Retention Schedule
                    </TabsTrigger>
                    <TabsTrigger value="security" className="py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Security Safeguards
                    </TabsTrigger>
                    <TabsTrigger value="rights" className="py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Your Statutory Rights
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: 8 POPIA Conditions */}
                <TabsContent value="popia" className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-zinc-900">
                                    8 Conditions for Lawful Processing of Personal Information
                                </h2>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Prescribed by Chapter 3 of the Protection of Personal Information Act, 2013 (Act No. 4 of 2013).
                                </p>
                            </div>
                            <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200 w-fit">
                                Statutory Mandate
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {lawfulConditions.map((cond) => (
                                <div key={cond.num} className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/60 hover:bg-zinc-50 transition-colors">
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                            {cond.num}
                                        </span>
                                        <h3 className="font-bold text-sm text-zinc-900">{cond.title}</h3>
                                    </div>
                                    <p className="text-xs text-zinc-600 leading-relaxed pl-8">
                                        {cond.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* Tab 2: Retention Schedule */}
                <TabsContent value="retention" className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-zinc-900">
                                    Statutory Data Retention & Destruction Schedule (Section 14)
                                </h2>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Strict schedules determining how long records are stored, archived, and cryptographically destroyed.
                                </p>
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
                                Automated Purging Active
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            {retentionSchedule.map((item, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 transition-all">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                        <h3 className="font-bold text-sm text-zinc-900">{item.category}</h3>
                                        <Badge className="bg-zinc-900 text-white text-xs w-fit">
                                            {item.retention}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-zinc-600 mb-2">{item.basis}</p>
                                    <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 pt-2 border-t border-zinc-200/60">
                                        <Scale className="w-3.5 h-3.5 text-zinc-400" />
                                        <strong>Statutory Reference:</strong> {item.statute}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* Tab 3: Security Safeguards */}
                <TabsContent value="security" className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-zinc-900">
                                    Security Measures & Technical Safeguards (Section 19)
                                </h2>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Industry-standard cryptographic safeguards protecting personal data against loss, damage, or unauthorized access.
                                </p>
                            </div>
                            <Badge className="bg-zinc-900 text-white w-fit">
                                Bank-Grade Architecture
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/80 space-y-2">
                                <div className="p-2 w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                                    <Database className="w-4 h-4" />
                                </div>
                                <h4 className="font-bold text-sm text-zinc-900">PostgreSQL Multi-Tenant RLS</h4>
                                <p className="text-xs text-zinc-600 leading-relaxed">
                                    Row-Level Security guarantees strict data isolation. Landlords cannot view unassigned tenant details or other portfolios.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/80 space-y-2">
                                <div className="p-2 w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <h4 className="font-bold text-sm text-zinc-900">End-to-End Cryptography</h4>
                                <p className="text-xs text-zinc-600 leading-relaxed">
                                    All data in transit is enforced via TLS 1.3. Persistent database storage and file assets are encrypted using AES-256 GCM.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/80 space-y-2">
                                <div className="p-2 w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                                    <UserCheck className="w-4 h-4" />
                                </div>
                                <h4 className="font-bold text-sm text-zinc-900">Federated OAuth & PKCE</h4>
                                <p className="text-xs text-zinc-600 leading-relaxed">
                                    Enterprise federated sign-in support for Google, Facebook, Apple iOS, and Windows Azure AD with short-lived session tokens.
                                </p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Tab 4: Your Statutory Rights */}
                <TabsContent value="rights" className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-zinc-900">
                                    Data Subject Rights & Access Procedure (Sections 23-25)
                                </h2>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Exercising your legal rights under POPIA and the Promotion of Access to Information Act (PAIA).
                                </p>
                            </div>
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 w-fit">
                                30-Day Response Standard
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-start gap-3">
                                <Eye className="w-5 h-5 text-zinc-800 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-zinc-900">Right to Confirm and Access (Section 23)</h4>
                                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                                        You have the right to request confirmation of whether RentFlex holds personal data about you, and receive a copy of your full data profile free of charge.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-start gap-3">
                                <FileText className="w-5 h-5 text-zinc-800 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-zinc-900">Right to Correction or Deletion (Section 24)</h4>
                                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                                        You may request the correction of inaccurate, misleading, or outdated personal data, or the deletion of data that RentFlex is no longer authorized to retain under Section 14.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-zinc-900">Lodging Complaints with the Information Regulator</h4>
                                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                                        If you believe your personal information has been processed in violation of POPIA, you may lodge a complaint with the South African Information Regulator:
                                    </p>
                                    <div className="mt-2 p-3 bg-white rounded-lg border border-zinc-200 text-[11px] text-zinc-700 font-mono space-y-0.5">
                                        <p><strong>The Information Regulator (South Africa)</strong></p>
                                        <p>JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001</p>
                                        <p>Email: POPIAComplaints@inforegulator.org.za / enquiries@inforegulator.org.za</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
