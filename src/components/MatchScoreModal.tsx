import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from './ui/Button';
import { supabaseService } from '../services/supabaseService';

interface MatchScoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: any;
    onScoreUpdated: () => void;
}

export const MatchScoreModal: React.FC<MatchScoreModalProps> = ({ isOpen, onClose, match, onScoreUpdated }) => {
    const [sets, setSets] = useState<{ w: number, l: number }[]>([
        { w: 0, l: 0 },
        { w: 0, l: 0 },
        { w: 0, l: 0 }
    ]);
    const [loading, setLoading] = useState(false);

    if (!isOpen || !match) return null;

    const handleSetChange = (index: number, field: 'w' | 'l', value: string) => {
        const newSets = [...sets];
        newSets[index][field] = parseInt(value) || 0;
        setSets(newSets);
    };

    const calculateWinner = () => {
        let team1Sets = 0;
        let team2Sets = 0;

        sets.forEach(set => {
            if (set.w > set.l) team1Sets++;
            if (set.l > set.w) team2Sets++;
        });

        if (team1Sets > team2Sets) return match.team1_id;
        if (team2Sets > team1Sets) return match.team2_id;
        return null;
    };

    const handleSave = async () => {
        const winnerId = calculateWinner();
        if (!winnerId) {
            alert('Debe haber un ganador claro (diferencia de sets).');
            return;
        }

        setLoading(true);
        try {
            // Format score string (e.g., "6-4, 6-3")
            const scoreString = sets
                .filter(s => s.w > 0 || s.l > 0)
                .map(s => `${s.w}-${s.l}`)
                .join(', ');

            // Normalize sets score relative to winner
            // If Team 1 is winner, sets are already {w: t1, l: t2} -> {w: winner, l: loser}
            // If Team 2 is winner, sets are {w: t1, l: t2} -> we need to swap to {w: t2, l: t1}
            const normalizedSets = winnerId === match.team1_id
                ? sets
                : sets.map(s => ({ w: s.l, l: s.w }));

            await supabaseService.updateMatchScore(
                match.id,
                scoreString,
                normalizedSets,
                winnerId
            );

            onScoreUpdated();
            onClose();
        } catch (error) {
            console.error('Error updating score:', error);
            alert('Error al guardar el resultado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold mb-1">Actualizar Resultado</h2>
                <p className="text-sm text-gray-400 mb-6">
                    {match.team1?.team_name} vs {match.team2?.team_name}
                </p>

                <div className="space-y-4 mb-8">
                    <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-400 mb-2">
                        <div>Set 1</div>
                        <div>Set 2</div>
                        <div>Set 3</div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-24 text-right text-sm font-bold truncate">
                            {match.team1?.team_name}
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            {sets.map((set, idx) => (
                                <input
                                    key={`t1-s${idx}`}
                                    type="number"
                                    min="0"
                                    max="7"
                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-center focus:border-primary focus:outline-none"
                                    value={set.w}
                                    onChange={(e) => handleSetChange(idx, 'w', e.target.value)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-24 text-right text-sm font-bold truncate">
                            {match.team2?.team_name}
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            {sets.map((set, idx) => (
                                <input
                                    key={`t2-s${idx}`}
                                    type="number"
                                    min="0"
                                    max="7"
                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-center focus:border-primary focus:outline-none"
                                    value={set.l}
                                    onChange={(e) => handleSetChange(idx, 'l', e.target.value)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading} icon={Save}>
                        {loading ? 'Guardando...' : 'Guardar Resultado'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
