import { formatDate } from '@/utils';
import {
    User,
    DollarSign,
    Home,
    AlertCircle,
    CheckCircle2,
    Users,
    PawPrint,
    Shield,
    Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RentScoreGauge from '@/components/dashboard/RentScoreGauge';

export default function ApplicationDetailsModal({
    application,
    open,
    onClose,
    notes,
    onNotesChange,
    onApprove,
    onReject
}) {
    if (!application) return null;

    const getRentScoreColor = (score) => {
        if (score >= 750) return 'text-emerald-600';
        if (score >= 650) return 'text-green-600';
        if (score >= 550) return 'text-amber-600';
        return 'text-red-600';
    };

    const incomeToRentRatio = application.monthly_income / (application.monthly_rent || 1);
    const isIncomeAdequate = incomeToRentRatio >= 3;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Application Details</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="overview" className="mt-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="rentscore">RentScore</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="screening">Screening</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6 mt-6">
                        {/* Applicant Info */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Applicant Information
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-sm text-slate-500 mb-1">Full Name</p>
                                    <p className="font-medium text-slate-900">{application.tenant_name}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-sm text-slate-500 mb-1">Email</p>
                                    <p className="font-medium text-slate-900">{application.tenant_email}</p>
                                </div>
                                {application.tenant_phone && (
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <p className="text-sm text-slate-500 mb-1">Phone</p>
                                        <p className="font-medium text-slate-900">{application.tenant_phone}</p>
                                    </div>
                                )}
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-sm text-slate-500 mb-1">Move-in Date</p>
                                    <p className="font-medium text-slate-900">
                                        {application.move_in_date ? formatDate(application.move_in_date, 'MMMM d, yyyy') : 'Flexible'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Financial Info */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Financial Information
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-sm text-slate-500 mb-1">Monthly Income</p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        ${application.monthly_income?.toLocaleString()}
                                    </p>
                                    {application.income_verified && (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-2">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Verified
                                        </Badge>
                                    )}
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-sm text-slate-500 mb-1">Income to Rent Ratio</p>
                                    <p className={`text-2xl font-bold ${isIncomeAdequate ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {incomeToRentRatio.toFixed(1)}x
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">Recommended: 3x minimum</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-sm text-slate-500 mb-1">Employment Status</p>
                                    <p className="font-medium text-slate-900 capitalize">
                                        {application.employment_status || 'Not provided'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-sm text-slate-500 mb-1">Lease Term</p>
                                    <p className="font-medium text-slate-900">
                                        {application.lease_term_months} months
                                    </p>
                                </div>
                            </div>
                        </div>

                        {!isIncomeAdequate && (
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-amber-900 mb-1">Income Warning</p>
                                        <p className="text-sm text-amber-700">
                                            The applicant's income is below the recommended 3x monthly rent threshold.
                                            This may indicate higher payment risk.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Message */}
                        {application.message_to_landlord && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-3">Message from Applicant</h3>
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <p className="text-slate-700">{application.message_to_landlord}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </TabsContent>

                    {/* RentScore Tab */}
                    <TabsContent value="rentscore" className="space-y-6 mt-6">
                        <div className="flex justify-center">
                            <RentScoreGauge score={application.rentscore || 650} size="large" />
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6">
                            <h3 className="font-semibold text-slate-900 mb-4">What is RentScore?</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                RentScore is a verified rental reputation score (300-850) that helps landlords
                                identify reliable tenants. It's based on payment history, lease completions,
                                verification, and landlord reviews.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">Score Range</p>
                                    <p className="font-semibold text-slate-900">300 - 850</p>
                                </div>
                                <div className="bg-white rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">This Applicant</p>
                                    <p className={`font-semibold ${getRentScoreColor(application.rentscore)}`}>
                                        {application.rentscore || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-semibold text-slate-900">Score Interpretation</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                                    <span className="text-emerald-700">750+ Excellent</span>
                                    <span className="text-xs text-emerald-600">Top-tier tenant</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <span className="text-green-700">650-749 Good</span>
                                    <span className="text-xs text-green-600">Reliable tenant</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                                    <span className="text-amber-700">550-649 Fair</span>
                                    <span className="text-xs text-amber-600">Moderate risk</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                    <span className="text-red-700">Below 550 Poor</span>
                                    <span className="text-xs text-red-600">Higher risk</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Details Tab */}
                    <TabsContent value="details" className="space-y-6 mt-6">
                        {/* Current Residence */}
                        {application.current_residence && (
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <Home className="w-5 h-5" />
                                    Current Residence
                                </h3>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-slate-700">{application.current_residence}</p>
                                </div>
                            </div>
                        )}

                        {/* Reason for Moving */}
                        {application.reason_for_moving && (
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3">Reason for Moving</h3>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-slate-700">{application.reason_for_moving}</p>
                                </div>
                            </div>
                        )}

                        {/* Additional Info */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-3">Additional Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {application.additional_occupants > 0 && (
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                                            <Users className="w-4 h-4" />
                                            <span className="text-sm">Additional Occupants</span>
                                        </div>
                                        <p className="font-medium text-slate-900">{application.additional_occupants}</p>
                                    </div>
                                )}

                                <div className="bg-slate-50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                        <PawPrint className="w-4 h-4" />
                                        <span className="text-sm">Pets</span>
                                    </div>
                                    <p className="font-medium text-slate-900">{application.pets ? 'Yes' : 'No'}</p>
                                    {application.pets && application.pet_details && (
                                        <p className="text-xs text-slate-600 mt-1">{application.pet_details}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        {application.emergency_contact_name && (
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3">Emergency Contact</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <p className="text-sm text-slate-500 mb-1">Name</p>
                                        <p className="font-medium text-slate-900">{application.emergency_contact_name}</p>
                                    </div>
                                    {application.emergency_contact_phone && (
                                        <div className="bg-slate-50 rounded-lg p-4">
                                            <p className="text-sm text-slate-500 mb-1">Phone</p>
                                            <p className="font-medium text-slate-900">{application.emergency_contact_phone}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* References */}
                        {application.references?.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3">References</h3>
                                <div className="space-y-2">
                                    {application.references.map((ref, idx) => (
                                        <div key={idx} className="bg-slate-50 rounded-lg p-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium text-slate-900">{ref.name}</p>
                                                    <p className="text-sm text-slate-600 capitalize">{ref.relationship}</p>
                                                </div>
                                                <p className="text-sm text-slate-600">{ref.phone}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* Screening Tab */}
                    <TabsContent value="screening" className="space-y-6 mt-6">
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4">Verification Status</h3>
                            <div className="space-y-3">
                                <div className={`p-4 rounded-xl border-2 ${application.income_verified ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <DollarSign className={`w-5 h-5 ${application.income_verified ? 'text-emerald-600' : 'text-slate-400'}`} />
                                            <div>
                                                <p className="font-medium text-slate-900">Income Verification</p>
                                                <p className="text-sm text-slate-600">Bank statements or pay stubs</p>
                                            </div>
                                        </div>
                                        {application.income_verified ? (
                                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                        ) : (
                                            <Clock className="w-6 h-6 text-slate-400" />
                                        )}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl border-2 ${application.background_check_status === 'passed' ? 'border-emerald-200 bg-emerald-50' :
                                        application.background_check_status === 'in_progress' ? 'border-amber-200 bg-amber-50' :
                                            application.background_check_status === 'failed' ? 'border-red-200 bg-red-50' :
                                                'border-slate-200 bg-slate-50'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Shield className={`w-5 h-5 ${application.background_check_status === 'passed' ? 'text-emerald-600' :
                                                    application.background_check_status === 'in_progress' ? 'text-amber-600' :
                                                        application.background_check_status === 'failed' ? 'text-red-600' :
                                                            'text-slate-400'
                                                }`} />
                                            <div>
                                                <p className="font-medium text-slate-900">Background Check</p>
                                                <p className="text-sm text-slate-600 capitalize">
                                                    {application.background_check_status === 'not_started' ? 'Not Started' :
                                                        application.background_check_status === 'in_progress' ? 'In Progress' :
                                                            application.background_check_status}
                                                </p>
                                            </div>
                                        </div>
                                        {application.background_check_status === 'passed' && (
                                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                        )}
                                        {application.background_check_status === 'in_progress' && (
                                            <Clock className="w-6 h-6 text-amber-600" />
                                        )}
                                        {application.background_check_status === 'failed' && (
                                            <AlertCircle className="w-6 h-6 text-red-600" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {application.background_check_status === 'not_started' && (
                            <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                <Shield className="w-4 h-4 mr-2" />
                                Run Background Check ($29.99)
                            </Button>
                        )}

                        <Separator />

                        <div>
                            <Label htmlFor="notes" className="mb-2 block">Your Notes</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => onNotesChange(e.target.value)}
                                placeholder="Add private notes about this application..."
                                rows={4}
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Actions */}
                {application.status === 'pending' && (
                    <div className="flex gap-3 pt-6 border-t border-slate-200">
                        <Button
                            onClick={onReject}
                            variant="outline"
                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                            Reject Application
                        </Button>
                        <Button
                            onClick={onApprove}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve Application
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
