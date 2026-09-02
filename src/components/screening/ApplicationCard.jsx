import { motion } from 'framer-motion';
import { formatDate, formatDateTime } from '@/utils';
import {
    User,
    TrendingUp,
    Calendar,
    DollarSign,
    Briefcase,
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    AlertCircle,
    Shield,
    Phone,
    Mail,
    Home
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function ApplicationCard({ application, index = 0, onView, onQuickAction }) {
    const statusConfig = {
        pending: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
        under_review: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Eye },
        approved: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
        rejected: { color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
        withdrawn: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: XCircle },
    };

    const config = statusConfig[application.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    const getRentScoreColor = (score) => {
        if (score >= 750) return 'text-emerald-600';
        if (score >= 650) return 'text-green-600';
        if (score >= 550) return 'text-amber-600';
        return 'text-red-600';
    };

    const rentScoreColor = getRentScoreColor(application.rentscore || 0);

    const incomeToRentRatio = application.monthly_income / (application.monthly_rent || 1);
    const isIncomeAdequate = incomeToRentRatio >= 3;

    const screeningScore = application.screening_score || 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 transition-all duration-200"
        >
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-zinc-900" />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 text-base">{application.tenant_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                            <Mail className="w-3.5 h-3.5" />
                            {application.tenant_email}
                        </div>
                        {application.tenant_phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                <Phone className="w-3.5 h-3.5" />
                                {application.tenant_phone}
                            </div>
                        )}
                    </div>
                </div>
                <Badge className={`${config.color} border`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {application.status.replace('_', ' ')}
                </Badge>
            </div>

            {/* Property Info */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <Home className="w-4 h-4" />
                    <span className="font-medium text-slate-900">{application.property_title}</span>
                </div>
                <p className="text-sm text-slate-500">{application.property_address}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500">RentScore</span>
                    </div>
                    <p className={`text-lg font-bold ${rentScoreColor}`}>
                        {application.rentscore || 'N/A'}
                    </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500">Income</span>
                    </div>
                    <p className={`text-lg font-bold ${isIncomeAdequate ? 'text-emerald-600' : 'text-red-600'}`}>
                        ${(application.monthly_income || 0).toLocaleString()}
                    </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500">Employment</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 capitalize">
                        {application.employment_status || 'N/A'}
                    </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500">Move In</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">
                        {application.move_in_date ? formatDate(application.move_in_date, 'MMM d') : 'Flexible'}
                    </p>
                </div>
            </div>

            {/* Screening Score */}
            {screeningScore > 0 && (
                <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-600 font-medium">Screening Score</span>
                        <span className={`font-bold ${screeningScore >= 80 ? 'text-emerald-600' :
                                screeningScore >= 60 ? 'text-amber-600' :
                                    'text-red-600'
                            }`}>
                            {screeningScore}/100
                        </span>
                    </div>
                    <Progress value={screeningScore} className="h-2" />
                </div>
            )}

            {/* Verification Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
                {application.income_verified && (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Income Verified
                    </Badge>
                )}
                {application.background_check_status === 'passed' && (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        <Shield className="w-3 h-3 mr-1" />
                        Background Check Passed
                    </Badge>
                )}
                {application.background_check_status === 'in_progress' && (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="w-3 h-3 mr-1" />
                        Background Check Pending
                    </Badge>
                )}
                {application.pets && (
                    <Badge variant="outline" className="text-slate-600">
                        Has Pets
                    </Badge>
                )}
                {application.additional_occupants > 0 && (
                    <Badge variant="outline" className="text-slate-600">
                        +{application.additional_occupants} Occupant{application.additional_occupants > 1 ? 's' : ''}
                    </Badge>
                )}
            </div>

            {/* Income Ratio Warning */}
            {!isIncomeAdequate && application.monthly_income && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 mb-4">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-amber-900">Income below recommended</p>
                            <p className="text-amber-700 text-xs">
                                Monthly income is {incomeToRentRatio.toFixed(1)}x rent (recommended: 3x)
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-slate-100">
                <Button
                    onClick={() => onView(application)}
                    variant="outline"
                    className="flex-1"
                >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                </Button>
                {application.status === 'pending' && (
                    <>
                        <Button
                            onClick={() => onQuickAction(application.id, 'approved')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                        </Button>
                        <Button
                            onClick={() => onQuickAction(application.id, 'rejected')}
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <XCircle className="w-4 h-4" />
                        </Button>
                    </>
                )}
            </div>

            {/* Application Time */}
            <p className="text-xs text-slate-400 mt-3">
                Applied {formatDateTime(application.created_date)}
            </p>
        </motion.div>
    );
}
