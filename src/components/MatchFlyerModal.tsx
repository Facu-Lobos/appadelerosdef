import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { Button } from './ui/Button';
import { Share2, Download, X, User } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';

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

        // Check if images exist by trying to load them
        for (const name of names) {
            const url = getNormalizedUrl(name);
            if (url) {
                try {
                    // Try fetching to see if it exists (avoids showing broken image icon)
                    const res = await fetch(url, { method: 'HEAD' });
                    if (res.ok) {
                        newAvatars[name] = url;
                    }
                } catch (e) {
                    // Ignore errors, it just means no avatar
                }
            }
        }
        setAvatars(newAvatars);
    };

    if (!isOpen) return null;

    const handleShare = async () => {
        if (ref.current === null) {
            return;
        }

        setLoading(true);
        try {
            const dataUrl = await toPng(ref.current, { cacheBust: true, backgroundColor: '#0f172a' });
            download(dataUrl, 'partido-flyer.png');

            if (navigator.share) {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], 'partido-flyer.png', { type: 'image/png' });
                await navigator.share({
                    title: 'Próximo Partido',
                    text: `¡Gran partido en ${matchData.tournamentName}! 🔥`,
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
            <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/50 bg-black/40 flex items-center justify-center shadow-xl shadow-primary/20">
                    {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                        <User size={40} className="text-gray-400" />
                    )}
                </div>
                <span className="font-bold text-white text-lg text-center leading-tight drop-shadow-md">
                    {name}
                </span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl shadow-primary/20">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="font-bold text-white">Compartir Sorteo</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Contenedor del Flyer */}
                    <div 
                        ref={ref} 
                        className="bg-gradient-to-br from-slate-900 via-slate-800 to-black p-8 rounded-xl relative overflow-hidden"
                    >
                        {/* Decoraciones de fondo */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-300 text-center uppercase tracking-widest mb-8 drop-shadow-lg">
                                {matchData.tournamentName}
                            </h2>

                            <div className="w-full flex flex-col gap-8 items-center">
                                {/* Equipo 1 */}
                                <div className="flex gap-6 justify-center items-center">
                                    {renderPlayer(matchData.team1.name1)}
                                    {matchData.team1.name2 && renderPlayer(matchData.team1.name2)}
                                </div>

                                {/* VS */}
                                <div className="text-3xl font-black text-white/20 italic tracking-widest my-2">
                                    VS
                                </div>

                                {/* Equipo 2 */}
                                <div className="flex gap-6 justify-center items-center">
                                    {renderPlayer(matchData.team2.name1)}
                                    {matchData.team2.name2 && renderPlayer(matchData.team2.name2)}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-10 pt-4 border-t border-white/10 w-full text-center">
                                <p className="text-sm font-semibold text-primary/80 tracking-widest">
                                    APP.APADELEROS.COM
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-4">
                        <Button onClick={handleShare} disabled={loading} className="w-full flex justify-center gap-2">
                            {loading ? (
                                'Generando...'
                            ) : (
                                <>
                                    <Share2 size={20} />
                                    Compartir Flyer
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
