import React, { useState, useEffect } from 'react';
import { authActions } from '@/api/authActions';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw, Activity } from 'lucide-react';

export default function DatabaseHealthCard({ isCompact = false }) {
    const [health, setHealth] = useState({
        ok: true,
        status: 'Checking...',
        region: 'Central EU (Frankfurt)',
        latencyMs: null
    });
    const [isTesting, setIsTesting] = useState(false);
    const [lastTested, setLastTested] = useState(null);

    const runHealthCheck = async () => {
        setIsTesting(true);
        try {
            const res = await authActions.checkDatabaseHealth();
            setHealth(res);
            setLastTested(new Date().toLocaleTimeString());
        } catch (e) {
            setHealth({
                ok: false,
                status: 'Error',
                region: 'Central EU (Frankfurt)',
                latencyMs: 0,
                error: e.message
            });
        } finally {
            setIsTesting(false);
        }
    };

    useEffect(() => {
        if (import.meta.env.DEV) {
            runHealthCheck();
        }
    }, []);

    // Only display database health and connection tester in development; remove in production
    if (!import.meta.env.DEV) {
        return null;
    }

    return (
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 space-y-2.5 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-zinc-900">
                    <Database className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Database Connection</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${health.ok ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${health.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {health.ok ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-white p-2 rounded-lg border border-zinc-200/60">
                    <span className="text-zinc-500 block text-[10px]">Region</span>
                    <span className="font-semibold text-zinc-800 truncate block" title="Central EU (Frankfurt)">
                        Frankfurt (EU-1)
                    </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-zinc-200/60">
                    <span className="text-zinc-500 block text-[10px]">Latency</span>
                    <span className="font-semibold text-zinc-800 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-600" />
                        {health.latencyMs !== null ? `${health.latencyMs} ms` : '—'}
                    </span>
                </div>
            </div>

            {/* Action */}
            <div className="pt-1 flex items-center justify-between">
                <span className="text-[10px] text-zinc-600">
                    {lastTested ? `Tested at ${lastTested}` : 'Idle'}
                </span>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={runHealthCheck}
                    disabled={isTesting}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border-zinc-200 hover:bg-white flex items-center gap-1.5 shadow-2xs"
                >
                    <RefreshCw className={`w-3 h-3 text-zinc-600 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                </Button>
            </div>
        </div>
    );
}
