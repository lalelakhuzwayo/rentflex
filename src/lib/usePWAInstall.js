import { useState, useEffect } from 'react';

/**
 * Hook to manage PWA installability, mobile download prompts, and standalone state.
 */
export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Detect if already installed (standalone mode)
        const checkStandalone = () => {
            const isStandaloneMode =
                window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true ||
                document.referrer.includes('android-app://');
            setIsInstalled(isStandaloneMode);
        };

        checkStandalone();

        // Detect mobile user agent
        const ua = window.navigator.userAgent;
        const mobileCheck = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        setIsMobile(mobileCheck);

        // Detect iOS specifically for manual "Add to Home Screen" instructions
        const iosCheck = /iPhone|iPad|iPod/i.test(ua) && !window.MSStream;
        setIsIOS(iosCheck);

        // Capture Android / Chrome 'beforeinstallprompt'
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        // Capture 'appinstalled' event
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferredPrompt) {
            return { outcome: 'unavailable' };
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstalled(true);
            setIsInstallable(false);
        }
        setDeferredPrompt(null);
        return { outcome };
    };

    return {
        isInstallable,
        isInstalled,
        isIOS,
        isMobile,
        promptInstall,
    };
}
export default usePWAInstall;
