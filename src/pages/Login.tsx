import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, ArrowLeft } from 'lucide-react';

import Logo from '../components/Logo';
import { PadelBallIcon, PadelRacketIcon } from '../components/icons';

export default function Login() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'landing' | 'login' | 'signup'>('landing');
    const [role, setRole] = useState<'player' | 'club'>('player');

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (user) {
            if (user.role === 'club') {
                navigate('/club');
            } else {
                navigate('/player');
            }
        }
    }, [user, navigate]);

    const handleAuth = async (e: React.FormEvent) => {
        // ... (existing implementation)
        e.preventDefault();
        setLoading(true);
        try {
            if (view === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { role, name: email.split('@')[0] }
                    }
                });
                if (error) throw error;
                alert('Registro exitoso! Por favor verifica tu email (si está habilitado) o inicia sesión.');
                setView('login'); // Switch to login after signup
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
                // AuthContext listener will handle the redirect via the useEffect above
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const textStyle = {
        fontFamily: "'Poppins', sans-serif",
        color: '#000000',
        fontWeight: '900',
        WebkitTextStroke: '0.75px #ffffff',
        textStroke: '0.75px #ffffff'
    };

    if (view === 'landing') {
        return (
            <div className="relative flex w-full min-h-[100dvh] flex-col bg-dark-primary justify-between overflow-x-hidden">
                <div>
                    <div className="@container">
                        <div className="@[480px]:px-4 @[480px]:py-3">
                            <div
                                className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden @[480px]:rounded-lg min-h-80"
                                style={{ backgroundImage: 'url("/login-bg.png")' }}
                            ></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center text-[35px] font-black tracking-wider leading-tight px-4 text-center pb-3 pt-5 scale-125 origin-center my-4">
                        {/* Static 'A', highest z-index */}
                        <span style={{ ...textStyle, position: 'relative', zIndex: 11, top: '0px' }}>A</span>

                        {/* Animated P, tucked behind A */}
                        <div className="letter-container" style={{ marginLeft: '-8px' }}>
                            <span className="animate-slide-in" style={{ ...textStyle, animationDelay: '0.1s', transform: 'translateY(-7px)', position: 'relative', zIndex: 10 }}>
                                P
                            </span>
                        </div>

                        {/* Racket Icon, tucked behind P */}
                        <div className="letter-container" style={{ marginLeft: '-19px' }}>
                            <div className="animate-slide-in" style={{ animationDelay: '0.2s', position: 'relative', zIndex: 9 }}>
                                <PadelRacketIcon className="h-16 w-12 translate-y-[-3px]" />
                            </div>
                        </div>


                        {/* "adeler", each letter tucked behind the previous element */}
                        {"adeler".split('').map((char, index) => {
                            // The first letter 'a' tucks behind the wide racket, the rest tuck behind the previous letter.
                            const charMarginLeft = index === 0 ? '-20px' : '-8px';
                            return (
                                <div key={index} className="letter-container" style={{ marginLeft: charMarginLeft }}>
                                    <span className="animate-slide-in" style={{ ...textStyle, animationDelay: `${0.3 + index * 0.05}s`, position: 'relative', zIndex: 8 - index }}>
                                        {char}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Ball Icon, tucked behind 'r' */}
                        <div className="letter-container" style={{ marginLeft: '-8px' }}>
                            <div className="animate-slide-in" style={{ animationDelay: '0.9s', position: 'relative', zIndex: 2 }}>
                                <PadelBallIcon className="h-6 w-6" />
                            </div>
                        </div>

                        {/* 's', tucked behind the ball */}
                        <div className="letter-container" style={{ marginLeft: '-8px' }}>
                            <span className="animate-slide-in" style={{ ...textStyle, animationDelay: '1.0s', position: 'relative', zIndex: 1 }}>s</span>
                        </div>
                    </div>
                    <p className="text-light-secondary text-base font-normal leading-normal pb-3 pt-1 px-4 text-center">Gestiona tus reservas, partidos y torneos con facilidad.</p>
                    <div className="flex justify-center">
                        <div className="flex flex-1 gap-3 max-w-[480px] flex-col items-stretch px-4 py-3">
                            <button
                                onClick={() => { setRole('player'); setView('login'); }}
                                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-dark-primary text-base font-bold leading-normal tracking-[0.015em] w-full hover:bg-primary-hover transition-colors"
                            >
                                <span className="truncate">Iniciar Sesión como Jugador</span>
                            </button>
                            <button
                                onClick={() => { setRole('club'); setView('login'); }}
                                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-dark-secondary text-light-primary text-base font-bold leading-normal tracking-[0.015em] w-full hover:bg-dark-tertiary transition-colors"
                            >
                                <span className="truncate">Iniciar Sesión como Club</span>
                            </button>
                            <button
                                onClick={() => { setRole('player'); setView('signup'); }}
                                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-accent text-dark-primary text-base font-bold leading-normal tracking-[0.015em] w-full hover:opacity-90 transition-colors"
                            >
                                <span className="truncate">Registrarse como Jugador</span>
                            </button>
                            <button
                                onClick={() => { setRole('club'); setView('signup'); }}
                                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-accent text-dark-primary text-base font-bold leading-normal tracking-[0.015em] w-full hover:opacity-90 transition-colors"
                            >
                                <span className="truncate">Registrarse como Club</span>
                            </button>
                        </div>
                    </div>
                    <div className="px-4 pt-6 pb-4 text-center">
                        <div className="flex justify-center items-center gap-4">
                            <Logo className="h-7 w-28" />
                        </div>
                    </div>
                </div>
                <div>
                    <p className="text-light-secondary text-sm font-normal leading-normal pb-3 pt-1 px-4 text-center">Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.</p>
                    <div className="h-5"></div>
                </div>
            </div>
        );
    }

    // Login/Signup Form View
    return (
        <div className="min-h-[100dvh] flex items-center justify-center text-white relative overflow-hidden">
            {/* Full Screen Background */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform scale-105"
                    style={{
                        backgroundImage: `url("${role === 'club' ? '/admin-login-bg.png' : '/login-bg.png'}")`
                    }}
                >
                    {/* Gradient Overlay for legibility */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
                </div>
            </div>

            {/* Centered Form Container */}
            <div className="w-full max-w-md p-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <button
                    onClick={() => setView('landing')}
                    className="absolute -top-12 left-0 text-white/80 hover:text-white flex items-center gap-2 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Volver al inicio
                </button>

                <div className="bg-surface/80 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
                    <div className="text-center mb-8">
                        <Logo className="h-10 w-40 mx-auto mb-6" />
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {view === 'login' ? 'Bienvenido' : 'Crear Cuenta'}
                        </h2>
                        <p className="text-gray-300">
                            {role === 'player' ? 'Portal de Jugadores' : 'Gestión de Clubes'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        <Input
                            label="Correo Electrónico"
                            type="email"
                            icon={Mail}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="tu@email.com"
                            className="bg-black/30 border-white/10 focus:border-primary/50"
                        />

                        <Input
                            label="Contraseña"
                            type="password"
                            icon={Lock}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="bg-black/30 border-white/10 focus:border-primary/50"
                        />

                        <Button
                            type="submit"
                            isLoading={loading}
                            className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 mt-2"
                            variant="primary"
                        >
                            {view === 'login' ? 'Ingresar' : 'Registrarse'}
                        </Button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-white/10">
                        <button
                            onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                            className="text-primary hover:text-primary-hover font-medium transition-colors hover:underline"
                        >
                            {view === 'login'
                                ? '¿No tienes cuenta? Regístrate gratis'
                                : '¿Ya tienes cuenta? Inicia sesión aquí'}
                        </button>
                    </div>
                </div>

                <p className="text-center text-white/60 text-sm mt-8 drop-shadow-md">
                    &copy; {new Date().getFullYear()} APPadeleros. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
