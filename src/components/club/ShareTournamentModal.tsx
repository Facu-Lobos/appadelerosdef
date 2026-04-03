import { useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { X, Download, Share2, Trophy, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/Button';
import { AppLogo } from '../AppLogo';
import type { Tournament } from '../../types';

interface ShareTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    clubName: string;
    clubLogoUrl?: string;
    clubCoverUrl?: string;
}

export function ShareTournamentModal({ isOpen, onClose, tournament, clubName, clubLogoUrl, clubCoverUrl }: ShareTournamentModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);

    if (!isOpen) return null;

    const generateBlob = async (): Promise<Blob | null> => {
        if (cardRef.current === null) return null;
        setGenerating(true);
        try {
            return await toBlob(cardRef.current, { 
                cacheBust: true, 
                pixelRatio: 2,
                backgroundColor: '#0f172a',
                // Evita que html-to-image crashee al intentar leer reglas CSS de OneSignal u otros scripts externos (CORS error)
                fontEmbedCSS: ''
            });
        } catch (err) {
            console.error('Error generating image', err);
            alert('Error al generar la imagen. Por favor intenta de nuevo.');
            return null;
        } finally {
            setGenerating(false);
        }
    };

    const handleShare = async () => {
        const blob = await generateBlob();
        if (!blob) return;
        
        const filename = `torneo-${tournament.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
        try {
            const file = new File([blob], filename, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: tournament.name,
                    files: [file]
                });
            } else {
                // Fallback si no soporta share o falla silencioso
                triggerDownload(blob, filename);
            }
        } catch (shareError) {
            console.log('Native share failed or user cancelled', shareError);
        }
    };

    const handleDownload = async () => {
        const blob = await generateBlob();
        if (!blob) return;
        
        const filename = `torneo-${tournament.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
        triggerDownload(blob, filename);
    };

    const triggerDownload = async (blob: Blob, filename: string) => {
        // Fallback robusto usando File System Access API para forzar 'Guardar Como' nativo sin intermediarios
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'PNG Image',
                        accept: { 'image/png': ['.png'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err: any) {
                // Si el usuario cancela (AbortError), no hacemos fallback
                if (err.name === 'AbortError') return;
                console.error('File Picker falló, usando fallback tradicional:', err);
            }
        }

        // Fallback básico para navegadores sin showSaveFilePicker
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header Actions */}
                <div className="flex justify-between items-center p-4 border-b border-white/5 shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Share2 size={20} className="text-primary" />
                        Compartir Torneo
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center gap-6 overflow-y-auto custom-scrollbar">
                    {/* Preview Area */}
                    <div className="w-full bg-black/50 p-4 rounded-xl border border-white/5 overflow-hidden">
                        <p className="text-xs text-center text-gray-400 mb-2">Vista Previa</p>

                        {/* The Shareable Card - This is what gets converted to image */}
                        <div
                            ref={cardRef}
                            className="bg-background p-6 rounded-xl border border-white/10 shadow-2xl relative overflow-hidden"
                            style={{ width: '100%' }}
                        >
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                            {/* Card Content */}
                            <div className="relative z-10 flex flex-col h-full w-full">
                                {/* Header: Banner with Cover + Name + Date */}
                                <div className="relative h-48 -mx-6 -mt-6 mb-6 overflow-hidden border-b border-white/10 shrink-0 bg-surface">
                                    {(clubCoverUrl || clubLogoUrl) ? (
                                        <img
                                            src={`${clubCoverUrl || clubLogoUrl}?v=${Date.now()}`}
                                            alt={clubName}
                                            className="w-full h-full object-cover"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary to-secondary opacity-50" />
                                    )}
                                    <div className="absolute inset-0 bg-black/20" />

                                    <div className="absolute inset-0 flex flex-col justify-end p-5">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-tight text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate w-full">
                                            {clubName}
                                        </h2>
                                        <div className="mt-1">
                                            <span className="bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-semibold capitalize shadow-sm border border-white/20 inline-block">
                                                {format(new Date(tournament.start_date + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
                                                {tournament.end_date && tournament.end_date !== tournament.start_date && (
                                                    <> al {format(new Date(tournament.end_date + 'T12:00:00'), "d 'de' MMMM", { locale: es })}</>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tournament Info */}
                                <div className="text-center mb-6">
                                    <div className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 inline-block">
                                        {tournament.format === 'league' ? 'Liga de Pádel' :
                                         tournament.format === 'americano' ? 'Torneo Americano' : 'Torneo de Pádel'}
                                    </div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-wide leading-tight px-2">
                                        {tournament.name}
                                    </h2>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                                    <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center flex flex-col items-center justify-center">
                                        <Calendar size={16} className="mb-1 text-primary" />
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Fecha</p>
                                        <p className="text-[13px] font-bold text-white leading-tight">
                                            {format(new Date(tournament.start_date + 'T12:00:00'), 'd MMM', { locale: es })}
                                            {tournament.end_date && tournament.end_date !== tournament.start_date && (
                                                <> - {format(new Date(tournament.end_date + 'T12:00:00'), 'd MMM', { locale: es })}</>
                                            )}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center flex flex-col items-center justify-center">
                                        <Users size={16} className="mb-1 text-primary" />
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Categoría</p>
                                        <p className="text-sm font-bold text-white">{tournament.category}</p>
                                    </div>
                                    {tournament.status === 'open' ? (
                                        <div className="bg-white/5 rounded-lg p-3 border border-white/10 col-span-2 text-center flex flex-col items-center justify-center">
                                            <Trophy size={16} className="mb-1 text-yellow-500" />
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Inscripción</p>
                                            <p className="text-sm font-bold text-white">ABIERTA</p>
                                        </div>
                                    ) : (
                                        <div className="col-span-2 text-center flex flex-col items-center justify-center">
                                            <AppLogo variant="small" />
                                        </div>
                                    )}
                                </div>

                                {/* Footer CTA */}
                                <div className="mt-auto w-full pt-4 border-t border-white/10">
                                    <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 text-center">
                                        <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Inscribite en</p>
                                        <p className="text-white font-bold text-sm">APPadeleros.vercel.app</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-center text-gray-400 max-w-xs">
                        Descarga esta imagen para compartirla en tus historias de Instagram, estados de WhatsApp y grupos.
                    </p>

                    <div className="flex gap-3 w-full">
                        <Button
                            onClick={handleShare}
                            disabled={generating}
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-base"
                        >
                            {generating ? (
                                <>Cargando...</>
                            ) : (
                                <>
                                    <Share2 size={20} />
                                    Compartir
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={handleDownload}
                            disabled={generating}
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-base bg-dark-secondary hover:bg-dark-tertiary text-white"
                        >
                            {generating ? (
                                <>Cargando...</>
                            ) : (
                                <>
                                    <Download size={20} />
                                    Descargar
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
