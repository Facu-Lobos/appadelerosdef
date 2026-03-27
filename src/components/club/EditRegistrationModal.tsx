import React, { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabaseService } from '../../services/supabaseService';
import type { TournamentRegistration } from '../../types';

interface EditRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    registration: TournamentRegistration | null;
    onRegistrationUpdated: () => void;
}

export const EditRegistrationModal: React.FC<EditRegistrationModalProps> = ({
    isOpen,
    onClose,
    registration,
    onRegistrationUpdated
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        team_name: '',
        player1_name: '',
        player2_name: ''
    });

    useEffect(() => {
        if (registration) {
            setFormData({
                team_name: registration.team_name || '',
                player1_name: registration.player1?.name || registration.player1_name || '',
                player2_name: registration.player2?.name || registration.player2_name || ''
            });
        }
    }, [registration]);

    if (!isOpen || !registration) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await supabaseService.updateTournamentRegistration(registration.id, {
                team_name: formData.team_name,
                player1_name: formData.player1_name,
                player2_name: formData.player2_name
            });
            onRegistrationUpdated();
            onClose();
        } catch (error: any) {
            console.error('Error updating registration:', error);
            alert('Error al actualizar la inscripción');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Edit2 className="text-primary" />
                    Editar Equipo
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Equipo</label>
                        <Input
                            placeholder="Ej: Los Campeones"
                            value={formData.team_name}
                            onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Jugador 1</label>
                        <Input
                            placeholder="Ej: Juan Pérez"
                            value={formData.player1_name}
                            onChange={(e) => setFormData({ ...formData, player1_name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Jugador 2</label>
                        <Input
                            placeholder="Ej: Carlos Gómez"
                            value={formData.player2_name}
                            onChange={(e) => setFormData({ ...formData, player2_name: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                            Cancelar
                        </Button>
                        <Button type="submit" isLoading={loading} className="flex-1">
                            Guardar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
