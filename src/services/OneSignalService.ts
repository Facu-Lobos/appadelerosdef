import OneSignal from 'react-onesignal';

// NOTE: You must replace this with your actual OneSignal App ID
const ONESIGNAL_APP_ID = '0da5084a-b752-4a3e-ad30-cab1adc1d22a';

export const OneSignalService = {
    initialized: false, // Flag to track initialization

    async init(userId: string) {
        if (this.initialized) {
            console.log('OneSignal already initialized');
            // Still try to login if userId is provided, as it might be a re-login/page refresh context
            if (userId) {
                try {
                    await OneSignal.login(userId);
                } catch (e) { console.error(e); }
            }
            return;
        }

        try {
            await OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                allowLocalhostAsSecureOrigin: true, // For development
                serviceWorkerParam: { scope: '/' },
                serviceWorkerPath: 'sw.js',
                notifyButton: {
                    enable: true,
                    prenotify: true,
                    showCredit: false,
                    text: {
                        'tip.state.unsubscribed': 'Suscribirse a notificaciones',
                        'tip.state.subscribed': 'Estás suscrito a notificaciones',
                        'tip.state.blocked': 'Has bloqueado las notificaciones',
                        'message.action.subscribed': '¡Gracias por suscribirte!',
                        'message.action.resubscribe': 'Suscribirse de nuevo',
                        'message.action.unsubscribe': 'Desuscribirse',
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
                const data = event.notification.additionalData as any;
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
        } catch (error) {
            console.error('OneSignal Initialization Error:', error);
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
