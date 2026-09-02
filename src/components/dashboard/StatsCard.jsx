import { motion } from 'framer-motion';

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendUp, color = 'zinc', delay = 0 }) {
    const colors = {
        zinc: 'text-zinc-900 bg-zinc-100/80',
        indigo: 'text-zinc-900 bg-zinc-100/80',
        emerald: 'text-emerald-700 bg-emerald-50',
        amber: 'text-amber-700 bg-amber-50',
        rose: 'text-rose-700 bg-rose-50',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
            className="bg-white rounded-xl p-5 border border-zinc-200/80 hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider truncate">{title}</p>
                    <p className="text-2xl xs:text-3xl font-bold text-zinc-900 tracking-tight">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
                    )}
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                            <span>{trendUp ? '↑' : '↓'} {trend}%</span>
                            <span className="text-zinc-400 font-normal hidden xs:inline">vs last month</span>
                        </div>
                    )}
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color] || colors.zinc}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </motion.div>
    );
}
