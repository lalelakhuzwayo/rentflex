import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getProfileCompletionStatus } from '@/utils/profileUtils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    UserCheck,
    ChevronDown,
    ChevronUp,
    Sparkles,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function ProfileCompletionTracker({ user }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    const completion = getProfileCompletionStatus(user);

    // If profile is 100% complete or card is dismissed by user, hide it
    if (completion.isComplete || isDismissed) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 text-white p-5 sm:p-6 shadow-xl border border-zinc-800"
        >
            {/* Background Glow Accents */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10 text-emerald-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base sm:text-lg text-white">Profile Completion</h3>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    {completion.percentage}% Complete
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-300 mt-0.5">
                                Complete your profile to unlock instant 1-click lease applications and boost your RentScore.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <Button
                            asChild
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-md shadow-emerald-950/40 text-xs sm:text-sm px-4"
                        >
                            <Link to={createPageUrl('TenantOnboarding')}>
                                Complete Profile <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-zinc-400 hover:text-white hover:bg-white/10 px-2 h-9"
                            title={isExpanded ? "Show Less" : "Show Required Items"}
                        >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsDismissed(true)}
                            className="text-zinc-400 hover:text-white hover:bg-white/10 px-2 h-9"
                            title="Dismiss Banner"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-zinc-400">
                        <span>{completion.completedCount} of {completion.totalCount} sections completed</span>
                        <span className="text-emerald-400 font-bold">{completion.percentage}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden p-0.5 backdrop-blur-sm border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${completion.percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500"
                        />
                    </div>
                </div>

                {/* Collapsible Missing Checklist */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs"
                        >
                            {completion.items.map((item) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                                        item.completed
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                            : 'bg-white/5 border-white/10 text-zinc-300'
                                    }`}
                                >
                                    {item.completed ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                                    )}
                                    <span className="font-medium truncate">{item.label}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
