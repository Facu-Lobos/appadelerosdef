import React, { useState } from 'react';
import { X, Calendar, Users, Trophy } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface CreateTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTournamentCreated: () => void;
    clubId: string;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({ isOpen, onClose, onTournamentCreated, clubId }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        category: '6ta',
        gender: 'Masculino',
        max_teams: 8
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting tournament form...', formData);
        setLoading(true);

        try {
            await supabaseService.createTournament({
                ...formData,
                gender: formData.gender as 'Masculino' | 'Femenino' | 'Mixto',
                club_id: clubId
            });
            onTournamentCreated();
            onClose();
        } catch (error: any) {
            console.error('Error creating tournament:', JSON.stringify(error, null, 2));
            alert(`Error al crear el torneo: ${error.message || 'Error desconocido'}`);
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
                    <Trophy className="text-primary" />
                    Nuevo Torneo
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Torneo</label>
                        <Input
                            placeholder="Ej: Torneo Verano 2024"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Categoría</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [&>option]:bg-gray-900 [&>option]:text-white"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="1ra">1ra Categoría</option>
                                <option value="2da">2da Categoría</option>
                                <option value="3ra">3ra Categoría</option>
                                <option value="4ta">4ta Categoría</option>
                                <option value="5ta">5ta Categoría</option>
                                <option value="6ta">6ta Categoría</option>
                                <option value="7ma">7ma Categoría</option>
                                <option value="8va">8va Categoría</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Género</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [&>option]:bg-gray-900 [&>option]:text-white"
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option value="Masculino">Masculino</option>
                                <option value="Femenino">Femenino</option>
                                <option value="Mixto">Mixto</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Equipos Máx.</label>
                        <select
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [&>option]:bg-gray-900 [&>option]:text-white"
                            value={formData.max_teams}
                            onChange={(e) => setFormData({ ...formData, max_teams: parseInt(e.target.value) })}
                        >
                            <option value={4}>4 Equipos</option>
                            <option value={8}>8 Equipos</option>
                            <option value={16}>16 Equipos</option>
                            <option value={32}>32 Equipos</option>
                        </select>
                    </div>

                    <div className="pt-4">
                        <Button type="submit" isLoading={loading} className="w-full">
                            Crear Torneo
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
