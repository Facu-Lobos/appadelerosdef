import OneSignal from 'react-onesignal';

// NOTE: You must replace this with your actual OneSignal App ID
const ONESIGNAL_APP_ID = '0da5084a-b752-4a3e-ad30-cab1adc1d22a';

export const OneSignalService = {
    initialized: false, // Flag to track initialization

    async init(userId: string) {
        console.log('OneSignal Init Start. Origin:', window.location.origin, 'AppID:', ONESIGNAL_APP_ID);

        // Suppress annoying logs
        OneSignal.Debug.setLogLevel('error');

        if (this.initialized) {
            // Already initialized, just ensure login if needed
            if (userId) {
                try {
                    await OneSignal.login(userId);
                } catch (e) {
                    // Ignore login errors if already logged in or network blip
                }
            }
            return;
        }

        // Optional: If you want to strictly prevent running on other domains
        // const isProd = window.location.hostname === 'appadeleros.vercel.app';
        // const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        // if (!isProd && !isLocal) { ... }

        try {
            await OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                allowLocalhostAsSecureOrigin: true, // For development
                serviceWorkerParam: { scope: '/' },
                serviceWorkerPath: 'OneSignalSDKWorker.js', // Match the actual file in public/
                notifyButton: {
                    enable: true,
                    prenotify: true,
                    showCredit: false,
                    text: {
                        'tip.state.unsubscribed': 'Suscribirse a notificaciones',
                        'tip.state.subscribed': 'Estás suscrito a notificaciones',
                        'tip.state.blocked': 'Has bloqueado las notificaciones',
                        'message.action.subscribed': '¡Gracias por suscribirte!',
                        'message.action.resubscribed': 'Suscribirse de nuevo',
                        'dialog.main.title': 'Gestionar notificaciones',
                        'dialog.main.button.subscribe': 'SUSCRIBIRSE',
                        'dialog.main.button.unsubscribe': 'DESUSCRIBIRSE',
                    }
                },
            });

            // Login user (Map to Supabase ID)
            if (userId) {
                await OneSignal.login(userId);
            }

            console.log('OneSignal Initialized');
            this.initialized = true;

            // Handle Notification Clicks
            OneSignal.Notifications.addEventListener('click', (event) => {
                console.log('Notification clicked:', event);
                const url = event.notification.launchURL || event.result.url; // url is often in result

                if (url) {
                    // Start from root if it's a relative path appening to domain
                    // But usually OneSignal sends full URL. 
                    // If we want SPA navigation (without reload), we might need to use window.history or a router instance.
                    // For simplicity, letting the browser handle the URL via default behavior is usually fine,
                    // BUT if the user says it doesn't open the message, maybe the URL is constructed wrong in SQL.
                    // Let's rely on browser default for now but log it.
                    // Actually, if we want to force it inside the app we can do:
                    if (url.includes(window.location.origin)) {
                        const path = url.replace(window.location.origin, '');
                        window.location.href = path; // Force navigation
                    }
                }
            });
        } catch (error: any) {
            // Check if error is related to domain restriction and valid configuration
            if (error?.message?.includes('Can only be used on')) {
                console.warn('OneSignal Warning: Domain restriction prevented initialization. This is expected in development environments using Main App ID.', error.message);
            } else {
                console.error('OneSignal Initialization Error:', error);
            }
        }
    },

    async logout() {
        try {
            await OneSignal.logout();
        } catch (error) {
            console.error('OneSignal Logout Error:', error);
        }
    }
};
