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
