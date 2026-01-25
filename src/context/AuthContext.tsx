import { createContext, useContext, useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient'; // Direct access for auth listener
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    login: (role: 'player' | 'club') => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            // 0. QUICK LOAD: Try to recover state from localStorage immediately
            const cachedProfile = localStorage.getItem('cached_profile');
            if (cachedProfile) {
                try {
                    const parsed = JSON.parse(cachedProfile);
                    if (mounted) {
                        setUser(parsed);
                        // If we have cache, we don't need to block UI, but we keep isLoading true 
                        // for a tiny bit just to let supabase check session verify validity 
                        // OR we set isLoading false immediately for "Instant Load" feel.
                        // Let's optimize for speed: if cache exists, show it.
                    }
                } catch (e) {
                    console.error('Error parsing cached profile', e);
                }
            }

            try {
                // 1. CheckSupabase session
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    // We have a session, assume valid for now if we have cache
                    if (mounted && cachedProfile) setIsLoading(false);

                    // 2. Fetch fresh profile in background (or foreground if no cache)
                    if (mounted) {
                        const profile = await supabaseService.getProfile(session.user.id);
                        if (profile) {
                            setUser(profile);
                            localStorage.setItem('cached_profile', JSON.stringify(profile));

                            // Init OneSignal
                            import('../services/OneSignalService').then(({ OneSignalService }) => {
                                OneSignalService.init(session.user.id);
                            });
                        }
                    }
                } else {
                    // No session effectively
                    if (mounted) {
                        setUser(null);
                        localStorage.removeItem('cached_profile');
                    }
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        initializeAuth();

        // 4. Set up listener for subsequent changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('AuthProvider: auth change event', event);

            if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    setIsLoading(false);
                }
                return;
            }

            // For other events (SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED), sync user state
            if (session?.user) {
                // If we don't have a user, OR the user changed, OR it's just a refresh commit
                if (mounted && (!user || user.id !== session.user.id)) {
                    const profile = await supabaseService.getProfile(session.user.id);
                    if (profile) {
                        setUser(profile);
                        localStorage.setItem('cached_profile', JSON.stringify(profile));
                        // Init OneSignal with the user ID to enable push notifications
                        import('../services/OneSignalService').then(({ OneSignalService }) => {
                            OneSignalService.init(session.user.id);
                        });
                    }
                }
            }
            // CRITICAL CHANGE: We DO NOT automatically clear user if session is missing 
            // in other events, to prevent network blips from logging out the user.
            // We strictly rely on 'SIGNED_OUT' or explicit failures.
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (role: 'player' | 'club') => {
        // For now, we'll just trigger a sign in with a hardcoded demo user if needed, 
        // or rely on the UI to provide a proper login form.
        // Since the current UI is just a button, let's simulate a login by signing in anonymously or with a test account?
        // Actually, to make it "Real", we should probably redirect to a proper login or use a popup.
        // Let's use a simple email/password for a demo user if the user clicks the button, 
        // OR just tell the user they need to sign up.

        // EDIT: To keep it simple and working with the existing "Login" page which just has buttons:
        // We will create a dummy user in the background if it doesn't exist, or sign in with a test account.
        // But that's hard without credentials.

        // Better approach: The Login page should probably be updated to have Email/Password inputs.
        // But for this step, let's just update the Context to support the *mechanism*.
        // The `login` function here might be deprecated in favor of direct `supabase.auth.signIn...` calls in the UI.
        // But to keep the interface, let's just throw an error or log that we need real credentials.

        console.log('Login requested for role:', role);
        // In a real app, we'd redirect to an auth flow.
        // For this demo, let's try to sign in with a hardcoded demo account if available, or just alert.
        alert('Para usar la integración real, por favor implementa un formulario de login o usa las credenciales de prueba en el código.');
    };

    const logout = async () => {
        await supabaseService.signOut();
        localStorage.removeItem('cached_profile'); // Clear cache
        setUser(null);
    };

    const refreshProfile = async () => {
        if (user) {
            const updatedProfile = await supabaseService.getProfile(user.id);
            if (updatedProfile) {
                setUser(updatedProfile);
                localStorage.setItem('cached_profile', JSON.stringify(updatedProfile));
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
