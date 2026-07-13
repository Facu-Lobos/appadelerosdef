import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { Button } from './ui/Button';
import { Share2, X, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import AppLogo from './AppLogo';

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

    const getLatestAvatarUrl = async (name: string) => {
        if (!name) return null;
        const normalized = name.trim().replace(/\s+/g, '_').toLowerCase();
        
        const { data, error } = await supabase.storage.from('avatars').list('', {
            search: `guest_${normalized}`
        });

        if (data && data.length > 0) {
            data.sort((a, b) => b.name.localeCompare(a.name));
            const latestFile = data[0].name;
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(latestFile);
            return urlData.publicUrl;
        }
        
        return null;
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
            const url = await getLatestAvatarUrl(name);
            if (url) {
                newAvatars[name] = url;
            }
        }
        setAvatars(newAvatars);
    };

    if (!isOpen) return null;

    const handleShare = async () => {
        if (ref.current === null) return;
        setLoading(true);
        try {
            const dataUrl = await toPng(ref.current, { cacheBust: true, quality: 1.0, pixelRatio: 2 });
            download(dataUrl, 'flyer-partido.png');

            if (navigator.share) {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], 'flyer-partido.png', { type: 'image/png' });
                await navigator.share({
                    title: 'Próximo Partido',
                    text: `¡Gran partido en la Liga de la Paternidad! 🎾`,
                    files: [file]
                });
            }
        } catch (err) {
            console.error('Error generating image', err);
        } finally {
            setLoading(false);
        }
    };

    const renderPlayerVertical = (name?: string, isDarkText?: boolean) => {
        if (!name) return null;
        const avatar = avatars[name];
        
        // Tratar de separar nombre y apellido
        const parts = name.trim().split(' ');
        let firstName = parts[0];
        let lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

        return (
            <div className="flex flex-col items-center mb-6 w-full z-10 px-2">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-[4px] border-yellow-400 bg-slate-800 shadow-xl mb-3 relative flex items-center justify-center shrink-0">
                    {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover object-top" crossOrigin="anonymous" />
                    ) : (
                        <User size={48} className="text-gray-500" />
                    )}
                </div>
                <span className={`font-black text-[20px] sm:text-[22px] leading-[1.1] text-center uppercase ${isDarkText ? 'text-[#0a192f]' : 'text-white'} drop-shadow-md tracking-wide`} style={{ fontFamily: 'system-ui, sans-serif' }}>
                    {lastName || firstName}<br/>
                    {lastName ? firstName : ''}
                </span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <div className="flex flex-col items-center justify-center my-4 w-full">
                
                {/* Controles superiores */}
                <div className="w-full flex justify-end mb-4 max-w-[420px]">
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
                        <X size={28} />
                    </button>
                </div>

                {/* Contenedor del Flyer (Tamaño Fijo para asegurar proporción tipo Story de Instagram) */}
                <div 
                    ref={ref} 
                    className="relative overflow-hidden flex flex-col font-sans bg-slate-900 shadow-2xl rounded-sm"
                    style={{ width: '420px', height: '746px' }} // Proporción 9:16 approx
                >
                    {/* Fondo de Cancha (Falso gradiente oscuro con textura si no hay imagen) */}
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-black"></div>
                    {/* Imagen de fondo simulando la cancha */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                    
                    {/* Header */}
                    <div className="relative z-10 w-full pt-8 pb-3 flex flex-col items-center shrink-0">
                        <h2 className="text-[26px] font-black text-primary uppercase tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'system-ui, sans-serif' }}>
                            LIGA DE LA PATERNIDAD
                        </h2>
                        <h3 className="text-3xl font-black text-yellow-400 uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-1">
                            VILLA GESELL
                        </h3>
                        <h4 className="text-[20px] italic font-black text-yellow-400/90 uppercase tracking-wider mt-2 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                            PARTIDO DE LA FECHA
                        </h4>
                    </div>

                    {/* Columnas de Equipos */}
                    <div className="relative z-10 flex-1 flex w-full px-5 mt-2 mb-0 overflow-hidden">
                        {/* Column 1 (Azul Oscuro) */}
                        <div className="flex-1 bg-[#0a192f] rounded-tl-[40px] rounded-bl-[40px] border-r-2 border-slate-800 flex flex-col items-center pt-5 relative overflow-hidden shadow-2xl">
                            
                            <div className="mt-8"></div>
                            {renderPlayerVertical(matchData.team1.name1, false)}
                            {matchData.team1.name2 && renderPlayerVertical(matchData.team1.name2, false)}
                        </div>

                        {/* Column 2 (Primary / Verde-Cyan) */}
                        <div className="flex-1 bg-primary rounded-tr-[40px] rounded-br-[40px] flex flex-col items-center pt-5 relative overflow-hidden shadow-2xl">
                            
                            <div className="mt-8"></div>
                            {renderPlayerVertical(matchData.team2.name1, true)}
                            {matchData.team2.name2 && renderPlayerVertical(matchData.team2.name2, true)}
                        </div>

                        {/* VS Center Badge */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] z-30">
                            <span 
                                className="text-[70px] font-black italic text-yellow-400 drop-shadow-[0_6px_6px_rgba(0,0,0,0.6)]" 
                                style={{ WebkitTextStroke: '2px #0a192f' }}
                            >
                                VS
                            </span>
                        </div>
                    </div>

                    {/* Footer Superior (Cyan) */}
                    <div className="relative z-20 w-full bg-primary pt-7 pb-2 flex flex-col items-center mt-5 shrink-0">
                        {/* Logo flotante */}
                        <div className="absolute -top-7 bg-[#0a192f] rounded-full p-2 border-[4px] border-primary flex items-center justify-center shadow-lg">
                            <div className="scale-75">
                                <AppLogo variant='small' />
                            </div>
                        </div>
                        <h3 className="text-[#0a192f] text-[24px] font-black uppercase tracking-tight">
                            ¡NO TE PIERDAS ESTE DUELO!
                        </h3>
                    </div>

                    {/* Footer Inferior (Azul Oscuro) */}
                    <div className="relative z-10 w-full bg-[#0a192f] pt-3 pb-5 flex flex-col items-center text-center shrink-0">
                        <p className="text-yellow-400 font-bold text-[20px]">Sitio Oficial y Reservas:</p>
                        <p className="text-white font-black text-[28px] tracking-tight mt-1">appadeleros.vercel.app</p>
                    </div>
                </div>
                
                {/* Botón de Compartir (Fuera del Flyer generado) */}
                <div className="w-full max-w-[420px] mt-6">
                    <Button 
                        onClick={handleShare} 
                        disabled={loading} 
                        className="w-full h-16 text-xl rounded-2xl flex justify-center items-center gap-3 bg-primary hover:bg-primary/90 text-[#0a192f] font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                    >
                        {loading ? (
                            'Generando Flyer...'
                        ) : (
                            <>
                                <Share2 size={26} />
                                DESCARGAR Y COMPARTIR
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
