import React, { useState } from 'react';
import { usePWAInstall } from '@/lib/usePWAInstall';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';

export default function MobileInstallBanner() {
    const { isInstallable, isInstalled, isIOS, isMobile, promptInstall } = usePWAInstall();
    const [dismissed, setDismissed] = useState(() => {
        return sessionStorage.getItem('rentflex_pwa_banner_dismissed') === 'true';
    });
    const [showIOSModal, setShowIOSModal] = useState(false);

    // If app is already installed in standalone mode, or user dismissed for this session, don't show
    if (isInstalled || dismissed) {
        return null;
    }

    // Only show on mobile devices or if install prompt is ready
    if (!isMobile && !isInstallable) {
        return null;
    }

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('rentflex_pwa_banner_dismissed', 'true');
    };

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSModal(true);
        } else if (isInstallable) {
            await promptInstall();
        } else {
            // Android Chrome fallback instructions
            setShowIOSModal(true);
        }
    };

    return (
        <>
            <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
                <div className="bg-zinc-950 text-white p-3.5 rounded-2xl shadow-2xl border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <img
                            src="/android-chrome-192x192.png"
                            alt="RentFlex"
                            className="w-10 h-10 rounded-xl object-cover border border-zinc-800 shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                <span>RentFlex Mobile</span>
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider">
                                    Official
                                </span>
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">
                                Install app for instant push & offline access
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                            size="sm"
                            onClick={handleInstallClick}
                            className="h-8 px-3 text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 rounded-lg flex items-center gap-1.5 shadow-xs"
                        >
                            <Download className="w-3.5 h-3.5 text-zinc-950" />
                            <span>Download</span>
                        </Button>
                        <button
                            onClick={handleDismiss}
                            aria-label="Dismiss banner"
                            className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* iOS & Mobile Safari / Chrome Installation Modal */}
            <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
                <DialogContent className="max-w-sm rounded-2xl bg-white p-6">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center mb-3">
                            <Smartphone className="w-6 h-6 text-white" />
                        </div>
                        <DialogTitle className="text-center text-lg font-bold text-zinc-900">
                            Install RentFlex on Your Phone
                        </DialogTitle>
                        <DialogDescription className="text-center text-xs text-zinc-500 pt-1">
                            Download RentFlex to your home screen for high-speed offline access and real-time push notifications.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5 pt-3">
                        <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                            <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                                1
                            </div>
                            <div className="text-xs text-zinc-700 leading-relaxed">
                                {isIOS ? (
                                    <>
                                        Tap the <strong className="text-zinc-950">Share icon</strong>{' '}
                                        <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> at the bottom of Safari.
                                    </>
                                ) : (
                                    <>
                                        Tap the browser menu <strong className="text-zinc-950">(three dots ⋮)</strong> at the top right.
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                            <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                                2
                            </div>
                            <div className="text-xs text-zinc-700 leading-relaxed">
                                {isIOS ? (
                                    <>
                                        Scroll down and select <strong className="text-zinc-950">'Add to Home Screen'</strong>{' '}
                                        <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-zinc-800" />.
                                    </>
                                ) : (
                                    <>
                                        Select <strong className="text-zinc-950">'Install App'</strong> or{' '}
                                        <strong className="text-zinc-950">'Add to Home Screen'</strong>.
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                                3
                            </div>
                            <div className="text-xs text-zinc-700 leading-relaxed">
                                Tap <strong className="text-zinc-950">'Add'</strong> or <strong className="text-zinc-950">'Install'</strong>. The RentFlex icon will appear on your home screen!
                            </div>
                        </div>

                        <Button
                            onClick={() => setShowIOSModal(false)}
                            className="w-full bg-zinc-900 text-white rounded-xl h-10 text-xs font-semibold mt-2"
                        >
                            Got It
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
