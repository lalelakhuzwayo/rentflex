import React, { useState, useEffect } from 'react';
import { subscribeOfflineStatus, processOfflineSync } from '@/lib/offlineSync';
import { WifiOff, RefreshCw, CheckCircle, CloudUpload, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function OfflineSyncBanner() {
    const [status, setStatus] = useState({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        queueLength: 0,
        isSyncing: false
    });

    useEffect(() => {
        const unsubscribe = subscribeOfflineStatus(setStatus);
        return unsubscribe;
    }, []);

    if (status.isOnline && status.queueLength === 0 && !status.isSyncing) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className={`w-full py-2 px-4 text-xs flex items-center justify-between border-b transition-colors z-50 ${
                    !status.isOnline
                        ? 'bg-amber-500 text-zinc-950 border-amber-600 font-medium'
                        : status.isSyncing
                            ? 'bg-zinc-900 text-white border-zinc-800'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}
            >
                <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
                    <div className="flex items-center gap-2">
                        {!status.isOnline ? (
                            <>
                                <WifiOff className="w-4 h-4 text-zinc-950 animate-pulse shrink-0" />
                                <span>
                                    <strong>Offline Mode:</strong> Working offline. {status.queueLength > 0 ? `${status.queueLength} change(s) saved locally.` : 'All actions queued locally.'}
                                </span>
                            </>
                        ) : status.isSyncing ? (
                            <>
                                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                                <span>
                                    <strong>Syncing:</strong> Uploading {status.queueLength} offline update(s) to PostgreSQL database...
                                </span>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>
                                    <strong>Connected:</strong> {status.queueLength} pending update(s) ready to synchronize.
                                </span>
                            </>
                        )}
                    </div>

                    {status.isOnline && status.queueLength > 0 && !status.isSyncing && (
                        <Button
                            size="sm"
                            onClick={() => processOfflineSync()}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] h-6 px-2.5 rounded-none font-semibold shrink-0"
                        >
                            <CloudUpload className="w-3.5 h-3.5 mr-1" />
                            Sync Now
                        </Button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
