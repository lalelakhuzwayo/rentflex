import { motion } from 'framer-motion';

export default function RentScoreGauge({ score = 0, size = 'large' }) {
    const hasScore = score && score >= 300;
    const percentage = hasScore ? ((score - 300) / (850 - 300)) * 100 : 0;
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = hasScore ? circumference - (percentage / 100) * circumference * 0.75 : circumference;

    const getScoreColor = (score) => {
        if (!score || score < 300) return { stroke: '#94a3b8', text: 'Unrated', bg: 'bg-slate-50' };
        if (score >= 750) return { stroke: '#10b981', text: 'Excellent', bg: 'bg-emerald-50' };
        if (score >= 650) return { stroke: '#22c55e', text: 'Good', bg: 'bg-green-50' };
        if (score >= 550) return { stroke: '#f59e0b', text: 'Fair', bg: 'bg-amber-50' };
        if (score >= 450) return { stroke: '#f97316', text: 'Poor', bg: 'bg-orange-50' };
        return { stroke: '#ef4444', text: 'Very Poor', bg: 'bg-red-50' };
    };

    const scoreInfo = getScoreColor(score);
    const dimensions = size === 'large' ? 'w-48 h-48' : 'w-32 h-32';
    const textSize = size === 'large' ? 'text-4xl' : 'text-2xl';
    const labelSize = size === 'large' ? 'text-sm' : 'text-xs';

    return (
        <div className="flex flex-col items-center">
            <div className={`relative ${dimensions}`}>
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background arc */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
                    />
                    {/* Score arc */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={scoreInfo.stroke}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        className={`${textSize} font-bold text-slate-900`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        {hasScore ? score : '—'}
                    </motion.span>
                    <span className={`${labelSize} font-medium mt-1`} style={{ color: scoreInfo.stroke }}>
                        {scoreInfo.text}
                    </span>
                </div>
            </div>
            <div className="flex justify-between w-full px-4 mt-2">
                <span className="text-xs text-slate-400">300</span>
                <span className="text-xs text-slate-400">850</span>
            </div>
        </div>
    );
}
