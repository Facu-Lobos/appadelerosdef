import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { Button } from './ui/Button';
import { Share2, X, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import Logo from './Logo';

interface MatchFlyerModalProps {
    isOpen: boolean;
    onClose: () => void;
    matchData: {
        tournamentName: string;
        team1: { name1: string, name2?: string };
        team2: { name1: string, name2?: string };
    }
}

export function MatchFlyerModal({ isOpen, onClose, matchData }: MatchFlyerModalProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [avatars, setAvatars] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            loadAvatars();
        }
    }, [isOpen, matchData]);

    const getNormalizedUrl = (name: string) => {
        if (!name) return null;
        const normalized = name.trim().replace(/\s+/g, '_').toLowerCase();
        const { data } = supabase.storage.from('avatars').getPublicUrl(`guest_${normalized}`);
        return data.publicUrl;
    };

    const loadAvatars = async () => {
        const newAvatars: Record<string, string> = {};
        
        const names = [
            matchData.team1.name1,
            matchData.team1.name2,
            matchData.team2.name1,
            matchData.team2.name2
        ].filter(Boolean) as string[];

        for (const name of names) {
            const url = getNormalizedUrl(name);
            if (url) {
                try {
                    const res = await fetch(url, { method: 'HEAD' });
                    if (res.ok) {
                        newAvatars[name] = url;
                    }
                } catch (e) {
                }
            }
        }
        setAvatars(newAvatars);
    };

    if (!isOpen) return null;

    const handleShare = async () => {
        if (ref.current === null) return;
        setLoading(true);
        try {
            const dataUrl = await toPng(ref.current, { cacheBust: true, backgroundColor: '#0f172a', quality: 1.0, pixelRatio: 2 });
            download(dataUrl, 'flyer-partido.png');

            if (navigator.share) {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], 'flyer-partido.png', { type: 'image/png' });
                await navigator.share({
                    title: 'Próximo Partido',
                    text: `¡Gran partido en la Liga de la Paternidad! 🔥`,
                    files: [file]
                });
            }
        } catch (err) {
            console.error('Error generating image', err);
        } finally {
            setLoading(false);
        }
    };

    const renderPlayer = (name?: string) => {
        if (!name) return null;
        const avatar = avatars[name];

        return (
            <div className="flex flex-col items-center gap-4 transform transition-transform hover:scale-105">
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-[6px] border-primary bg-slate-900 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                    {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                        <User size={64} className="text-gray-500" />
                    )}
                </div>
                <span className="font-extrabold text-white text-xl md:text-2xl tracking-wide text-center leading-tight drop-shadow-xl" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    {name.toUpperCase()}
                </span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-3xl max-w-2xl w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] my-8 relative">
                <div className="absolute top-4 right-4 z-50">
                    <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-gray-300 hover:text-white hover:bg-black/80 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-0">
                    {/* Contenedor del Flyer */}
                    <div 
                        ref={ref} 
                        className="bg-gradient-to-br from-[#0f172a] via-[#020617] to-black p-10 md:p-14 relative overflow-hidden"
                    >
                        {/* Decoraciones de fondo con colores de la app (primario = green-500) */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>
                        
                        {/* Grilla sutil de fondo */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                        <div className="relative z-10 flex flex-col items-center h-full justify-between gap-12">
                            
                            {/* Header */}
                            <div className="w-full flex flex-col items-center gap-4">
                                <div className="scale-125 mb-2 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                                    <Logo />
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 text-center uppercase tracking-[0.2em] drop-shadow-2xl" style={{ fontFamily: 'system-ui, sans-serif' }}>
                                    LIGA DE LA PATERNIDAD
                                </h2>
                            </div>

                            <div className="w-full flex flex-col gap-10 md:gap-14 items-center mt-4">
                                {/* Equipo 1 */}
                                <div className="flex gap-8 md:gap-16 justify-center items-center w-full">
                                    {renderPlayer(matchData.team1.name1)}
                                    {matchData.team1.name2 && renderPlayer(matchData.team1.name2)}
                                </div>

                                {/* VS Glowing */}
                                <div className="relative flex items-center justify-center w-full py-4">
                                    <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                                    <div className="relative z-10 bg-slate-900 px-6 py-2 rounded-xl border-2 border-primary/30 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                                        <span className="text-4xl md:text-5xl font-black italic text-primary tracking-widest drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">VS</span>
                                    </div>
                                </div>

                                {/* Equipo 2 */}
                                <div className="flex gap-8 md:gap-16 justify-center items-center w-full">
                                    {renderPlayer(matchData.team2.name1)}
                                    {matchData.team2.name2 && renderPlayer(matchData.team2.name2)}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-12 pt-6 w-full text-center">
                                <div className="inline-block px-8 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <p className="text-lg md:text-xl font-bold text-primary tracking-[0.3em] font-mono">
                                        APPADELEROS.VERCEL.APP
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Footer Modal Actions */}
                <div className="p-6 bg-slate-900 border-t border-white/10">
                    <Button onClick={handleShare} disabled={loading} className="w-full h-14 text-lg flex justify-center items-center gap-3 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                        {loading ? (
                            'Generando Flyer de Alta Calidad...'
                        ) : (
                            <>
                                <Share2 size={24} />
                                Compartir Flyer
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
