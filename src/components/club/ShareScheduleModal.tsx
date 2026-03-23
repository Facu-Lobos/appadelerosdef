import { useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { X, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/Button';

interface ShareScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    clubName: string;
    clubLogoUrl?: string;
    clubCoverUrl?: string;
    date: Date;
    schedule: {
        time: string;
        available: boolean;
        courtName: string;
    }[];
}

export function ShareScheduleModal({ isOpen, onClose, clubName, clubLogoUrl, clubCoverUrl, date, schedule }: ShareScheduleModalProps) {
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
                backgroundColor: '#1e293b',
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
        
        const filename = `turnos-${format(date, 'yyyy-MM-dd')}.png`;
        try {
            const file = new File([blob], filename, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Turnos ${clubName}`,
                    files: [file]
                });
            } else {
                triggerDownload(blob, filename);
            }
        } catch (shareError) {
            console.log('Native share failed or user cancelled, falling back to download', shareError);
        }
    };

    const handleDownload = async () => {
        const blob = await generateBlob();
        if (!blob) return;
        
        const filename = `turnos-${format(date, 'yyyy-MM-dd')}.png`;
        triggerDownload(blob, filename);
    };

    const triggerDownload = async (blob: Blob, filename: string) => {
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
                if (err.name === 'AbortError') return;
                console.error('File Picker falló, usando fallback tradicional:', err);
            }
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    };

    // Filter only available slots and filter past slots if today
    const availableSlots = schedule.filter(s => {
        if (!s.available) return false;

        // Filter past times if it's today
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) {
            const [h, m] = s.time.split(':').map(Number);
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            if (h < currentHour || (h === currentHour && m <= currentMinute)) {
                return false;
            }
        }
        return true;
    });

    // Group slots by court
    const slotsByCourt = availableSlots.reduce((acc, slot) => {
        if (!acc[slot.courtName]) acc[slot.courtName] = [];
        acc[slot.courtName].push(slot.time);
        return acc;
    }, {} as Record<string, string[]>);

    const courtNames = Object.keys(slotsByCourt).sort();

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
                            <div className="relative z-10 flex flex-col h-full w-full">
                                {/* Header: Logo + Name + Date */}
                                {/* Header: Banner with Cover + Name + Date */}
                                <div className="relative h-32 -mx-6 -mt-6 mb-6 overflow-hidden border-b border-white/10 shrink-0 bg-surface">
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
                                    <div className="absolute inset-0 bg-black/20" /> {/* Leve oscurecimiento general para que el texto siga siendo legible si la foto es muy blanca, pero sin gradientes notorios */}
                                    
                                    <div className="absolute inset-0 flex flex-col justify-end p-5">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-tight text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate w-full">
                                            {clubName}
                                        </h2>
                                        <div className="mt-1">
                                            <span className="bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-semibold capitalize shadow-sm border border-white/20 inline-block">
                                                {format(date, "EEEE d 'de' MMMM", { locale: es })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full flex-1">
                                    <h3 className="text-sm font-bold text-white/90 mb-3 uppercase tracking-wide border-b border-white/10 pb-1 text-left">
                                        Turnos Disponibles
                                    </h3>

                                    {courtNames.length > 0 ? (
                                        <div className="flex gap-2 w-full items-start">
                                            {courtNames.map((courtName) => (
                                                <div key={courtName} className="flex-1 min-w-0 bg-white/5 rounded-lg border border-white/5 p-2 flex flex-col gap-2">
                                                    <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider text-center border-b border-white/5 pb-1 truncate w-full" title={courtName}>
                                                        {courtName}
                                                    </div>
                                                    <div className={`grid gap-1.5 w-full ${courtNames.length === 1 ? 'grid-cols-3 sm:grid-cols-4' : courtNames.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                        {slotsByCourt[courtName].map((time, idx) => (
                                                            <div key={idx} className="bg-primary/10 border border-primary/20 rounded text-center py-0.5 w-full">
                                                                <span className="text-sm font-bold text-primary block">{time}</span>
                                                            </div>
                                                        ))}
                                                    </div>
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
                                    <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 text-center">
                                        <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Reservá ahora en</p>
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
