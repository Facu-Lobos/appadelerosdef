import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { X, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/Button';

interface ShareScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    clubName: string;
    clubLogoUrl?: string;
    date: Date;
    schedule: {
        time: string;
        available: boolean;
        courtName: string;
    }[];
}

export function ShareScheduleModal({ isOpen, onClose, clubName, clubLogoUrl, date, schedule }: ShareScheduleModalProps) {
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
            download(dataUrl, `turnos-${format(date, 'yyyy-MM-dd')}.png`);
        } catch (err) {
            console.error('Error generating image', err);
            alert('Error al generar la imagen. Por favor intenta de nuevo.');
        } finally {
            setGenerating(false);
        }
    };

    // Filter only available slots
    const availableSlots = schedule.filter(s => s.available);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header Actions */}
                <div className="flex justify-between items-center p-4 border-b border-white/5 shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Share2 size={20} className="text-primary" />
                        Compartir Turnos
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
                            <div className="relative z-10 flex flex-col h-full items-center text-center">
                                {/* Club Logo & Name */}
                                <div className="mb-4 flex flex-col items-center gap-3">
                                    {clubLogoUrl && (
                                        <img
                                            src={clubLogoUrl}
                                            alt={clubName}
                                            className="w-24 h-24 rounded-full object-cover border-4 border-white/10 shadow-lg bg-white/5"
                                            crossOrigin="anonymous"
                                        />
                                    )}
                                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary uppercase tracking-wider leading-tight">
                                        {clubName}
                                    </h2>
                                </div>

                                {/* Date */}
                                <div className="mb-6 bg-white/5 px-4 py-1 rounded-full border border-white/10">
                                    <p className="text-sm font-medium text-white/90 capitalize">
                                        {format(date, 'EEEE d MMMM', { locale: es })}
                                    </p>
                                </div>

                                <div className="w-full flex-1 flex flex-col items-center justify-center">
                                    <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wide border-b border-white/10 pb-2 w-full">
                                        Turnos Disponibles
                                    </h3>

                                    {availableSlots.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-3 w-full">
                                            {availableSlots.map((slot, index) => (
                                                <div key={index} className="bg-white/10 border border-white/5 rounded-lg p-2 text-center">
                                                    <span className="text-xl font-bold text-primary block">{slot.time}</span>
                                                    <span className="text-[10px] text-white/60 uppercase tracking-wider">{slot.courtName}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-white/60">No hay turnos disponibles</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer CTA */}
                                <div className="mt-8 w-full pt-4 border-t border-white/10">
                                    <div className="bg-primary/20 border border-primary/30 rounded-lg p-3">
                                        <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Reservá ahora en</p>
                                        <p className="text-white font-bold text-sm">appadelerosdef.vercel.app</p>
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
                                Descargar Imagen
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
