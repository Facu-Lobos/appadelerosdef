import React, { useState } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Tournament } from '../../types';

interface EditTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    tournament: Tournament;
}

export const EditTournamentModal: React.FC<EditTournamentModalProps> = ({ isOpen, onClose, onUpdated, tournament }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        start_date: tournament.start_date,
        end_date: tournament.end_date,
        total_dates: tournament.total_dates || 1
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await supabaseService.updateTournament(tournament.id, {
                start_date: formData.start_date,
                end_date: formData.end_date,
                ...(tournament.format === 'liga_paternidad' && { total_dates: Number(formData.total_dates) })
            });
            onUpdated();
            onClose();
        } catch (error: any) {
            console.error('Error updating tournament:', error);
            alert(`Error al actualizar el torneo: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <CalendarIcon className="text-primary" />
                    Editar Configuracion
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Fecha Inicio</label>
                        <Input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Fecha Fin</label>
                        <Input
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            required
                        />
                    </div>
                    {tournament.format === 'liga_paternidad' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Cantidad de Fechas (Partidos)</label>
                            <Input
                                type="number"
                                min="1"
                                value={formData.total_dates}
                                onChange={(e) => setFormData({ ...formData, total_dates: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                    )}

                    <div className="pt-4">
                        <Button type="submit" isLoading={loading} className="w-full">
                            Guardar Cambios
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
