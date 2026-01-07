import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/Button';

export const InstallPWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Debug Check: If SW is not active, prompt might not fire.
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                console.log('SW Registered:', registration);
            }).catch(err => {
                console.error('SW Registration failing:', err);
            });
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:w-96">
            <div className="bg-surface border border-white/10 rounded-xl p-4 shadow-xl flex items-center justify-between gap-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                        <Download size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Instalar App</h3>
                        <p className="text-xs text-gray-400">Acceso rápido y mejor rendimiento</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowBanner(false)}
                        className="p-2 hover:bg-white/5 rounded-full text-gray-400"
                    >
                        <X size={20} />
                    </button>
                    <Button size="sm" onClick={handleInstallClick}>
                        Instalar
                    </Button>
                </div>
            </div>
        </div>
    );
};
