import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { Button } from './ui/Button';
import { Share2, Download, X } from 'lucide-react';
import { PadelRacket } from './PadelIcons';

interface MatchShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    matchData: {
        tournamentName: string;
        clubName: string;
        category: string;
        team1: { name1: string, name2?: string, sets: number[] };
        team2: { name1: string, name2?: string, sets: number[] };
        result: string;
    }
}

export function MatchShareModal({ isOpen, onClose, matchData }: MatchShareModalProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleShare = async () => {
        if (ref.current === null) {
            return;
        }

        setLoading(true);
        try {
            const dataUrl = await toPng(ref.current, { cacheBust: true, backgroundColor: '#0f172a' });
            download(dataUrl, 'match-result.png');

            // Native Share if available (mobile)
            if (navigator.share) {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], 'match-result.png', { type: 'image/png' });
                await navigator.share({
                    title: 'Resultado del Partido',
                    text: `¡Gran partido en ${matchData.tournamentName}! 🎾`,
                    files: [file]
                });
            }
        } catch (err) {
            console.error('Error generating image', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white z-10"
                >
                    <X size={20} />
                </button>

                <div className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                            ¡Resultado Final!
                        </h2>
                        <p className="text-sm text-gray-400">Comparte tu victoria en redes</p>
                    </div>

                    {/* Image Area to Capture */}
                    <div
                        ref={ref}
                        className="bg-gradient-to-br from-[#1a1b2e] to-[#0f172a] p-6 rounded-xl border border-white/20 shadow-2xl relative overflow-hidden"
                    >
                        {/* Watermark / Decoration */}
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <PadelRacket size={200} />
                        </div>

                        <div className="relative z-10 space-y-6">
                            {/* Header */}
                            <div className="text-center border-b border-white/10 pb-4">
                                <h3 className="text-lg font-bold text-white tracking-wider uppercase">{matchData.tournamentName}</h3>
                                <div className="text-primary text-xs font-bold">{matchData.clubName}</div>
                                <div className="text-gray-400 text-[10px] mt-1 uppercase tracking-widest">{matchData.category}</div>
                            </div>

                            {/* Score Board */}
                            <div className="flex items-center justify-between">
                                {/* Team 1 */}
                                <div className="flex-1 text-center">
                                    <div className="font-bold text-white text-sm md:text-base">{matchData.team1.name1}</div>
                                    {matchData.team1.name2 && <div className="font-bold text-white text-sm md:text-base">{matchData.team1.name2}</div>}
                                </div>

                                {/* VS / Sets */}
                                <div className="flex flex-col items-center px-4">
                                    <div className="text-xs text-gray-500 font-bold mb-2">VS</div>
                                    <div className="flex gap-2">
                                        {/* Parse result string usually "6-4 6-4"? Or assume sets passed? Using result string for simplicity if parsing complex */}
                                        <div className="text-2xl font-black text-primary tracking-widest">{matchData.result}</div>
                                    </div>
                                </div>

                                {/* Team 2 */}
                                <div className="flex-1 text-center">
                                    <div className="font-bold text-white text-sm md:text-base">{matchData.team2.name1}</div>
                                    {matchData.team2.name2 && <div className="font-bold text-white text-sm md:text-base">{matchData.team2.name2}</div>}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="text-center pt-4 border-t border-white/10">
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Powered by Baryonic Ride
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <Button
                        onClick={handleShare}
                        isLoading={loading}
                        className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/80 hover:to-purple-500/80 text-white font-bold h-12"
                        icon={navigator.share ? Share2 : Download}
                    >
                        {navigator.share ? 'Compartir Imagen' : 'Descargar Imagen'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
