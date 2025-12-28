import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { X, Download, Share2, Trophy, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/Button';
import type { Tournament } from '../../types';

interface ShareTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    clubName: string;
    clubLogoUrl?: string;
}

export function ShareTournamentModal({ isOpen, onClose, tournament, clubName, clubLogoUrl }: ShareTournamentModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);

    if (!isOpen) return null;

    const handleDownload = async () => {
        if (cardRef.current === null) {
            return;
        }

        setGenerating(true);

        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
            download(dataUrl, `torneo-${tournament.name.replace(/\s+/g, '-').toLowerCase()}.png`);
        } catch (err) {
            console.error('Error generating image', err);
            alert('Error al generar la imagen. Por favor intenta de nuevo.');
        } finally {
            setGenerating(false);
        }
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
                            className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl border border-white/10 shadow-2xl relative overflow-hidden"
                            style={{ width: '100%' }}
                        >
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                            {/* Card Content */}
                            <div className="relative z-10 flex flex-col h-full w-full items-center text-center">
                                {/* Badge */}
                                <div className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                                    Torneo de Pádel
                                </div>

                                {/* Tournament Name */}
                                <h2 className="text-2xl font-black text-white uppercase tracking-wide leading-tight mb-2">
                                    {tournament.name}
                                </h2>

                                {/* Club Info */}
                                <div className="flex items-center gap-2 mb-6">
                                    {clubLogoUrl && (
                                        <img
                                            src={clubLogoUrl}
                                            alt={clubName}
                                            className="w-6 h-6 rounded-full object-cover border border-white/20"
                                            crossOrigin="anonymous"
                                        />
                                    )}
                                    <span className="text-white/80 font-medium text-sm">en {clubName}</span>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                        <Calendar size={16} className="mx-auto mb-1 text-primary" />
                                        <p className="text-xs text-gray-400">Fecha</p>
                                        <p className="text-sm font-bold text-white">{format(new Date(tournament.start_date), 'd MMM', { locale: es })}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                        <Users size={16} className="mx-auto mb-1 text-primary" />
                                        <p className="text-xs text-gray-400">Categoría</p>
                                        <p className="text-sm font-bold text-white">{tournament.category}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 border border-white/10 col-span-2">
                                        <Trophy size={16} className="mx-auto mb-1 text-yellow-500" />
                                        <p className="text-xs text-gray-400">Estado</p>
                                        <p className="text-sm font-bold text-white">
                                            {tournament.status === 'open' ? 'Inscripción Abierta' :
                                                tournament.status === 'ongoing' ? 'En Curso - Ver Resultados' : 'Finalizado'}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer CTA */}
                                <div className="w-full pt-4 border-t border-white/10">
                                    <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-white/10 rounded-lg p-3">
                                        <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Inscribite / Ver Resultados en</p>
                                        <p className="text-white font-bold text-sm tracking-wide">appadelerosdef.vercel.app</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-center text-gray-400 max-w-xs">
                        Descarga esta imagen para compartirla en tus historias de Instagram, estados de WhatsApp y grupos.
                    </p>

                    <Button
                        onClick={handleDownload}
                        disabled={generating}
                        className="w-full flex items-center justify-center gap-2 py-3 text-base"
                    >
                        {generating ? (
                            <>Generando...</>
                        ) : (
                            <>
                                <Download size={20} />
                                Descargar Flyer
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
