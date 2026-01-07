import { useEffect, useState } from 'react';
import { Download, X, Share as ShareIcon, SquarePlus } from 'lucide-react';
import { Button } from './ui/Button';

export const InstallPWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed (standalone mode)
        const checkStandalone = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;
            setIsStandalone(isStandalone);
            return isStandalone;
        };

        if (checkStandalone()) return;

        // IOS Detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        if (isIosDevice) {
            // Show banner immediately on iOS if not standalone
            setShowBanner(true);
        }

        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Debug Check
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                console.log('SW Registered:', registration);
            }).catch(err => {
                console.error('SW Registration failing:', err);
            });
        }

        // Force show banner after 3 seconds if not installed, to ensure visibility
        const timer = setTimeout(() => {
            if (!checkStandalone()) {
                setShowBanner(true);
            }
        }, 3000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            clearTimeout(timer);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            if (isIOS) {
                alert('Sigue las instrucciones en pantalla');
            } else {
                alert('La instalación automática no está disponible. Intenta desde el menú de tu navegador -> "Instalar App".');
            }
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
        setShowBanner(false);
    };

    if (!showBanner || isStandalone) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:w-96">
            <div className="bg-surface border border-white/10 rounded-xl p-4 shadow-xl flex flex-col gap-4 backdrop-blur-md">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg text-primary">
                            <Download size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Instalar APPadeleros</h3>
                            <p className="text-xs text-gray-400">Acceso rápido y notificaciones</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowBanner(false)}
                        className="p-1 hover:bg-white/5 rounded-full text-gray-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {isIOS ? (
                    <div className="text-xs text-gray-300 bg-white/5 p-3 rounded-lg space-y-2">
                        <p className="font-semibold">Para instalar en iPhone:</p>
                        <div className="flex items-center gap-2">
                            <ShareIcon size={16} /> <span>1. Toca <b>Compartir</b></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <SquarePlus size={16} /> <span>2. Elige <b>Agregar a Inicio</b></span>
                        </div>
                    </div>
                ) : (
                    <Button size="sm" className="w-full" onClick={handleInstallClick}>
                        Instalar ahora
                    </Button>
                )}
            </div>
        </div>
    );
};
