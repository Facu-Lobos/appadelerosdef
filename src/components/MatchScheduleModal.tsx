import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { supabaseService } from '../services/supabaseService';
import type { Court } from '../types';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface MatchScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: any;
    onScheduleUpdated: () => void;
    clubId: string;
}

export const MatchScheduleModal: React.FC<MatchScheduleModalProps> = ({
    isOpen,
    onClose,
    match,
    onScheduleUpdated,
    clubId
}) => {
    const [courts, setCourts] = useState<Court[]>([]);
    const [selectedCourtId, setSelectedCourtId] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && clubId) {
            loadCourts();
            if (match) {
                setSelectedCourtId(match.court_id || '');
                if (match.start_time) {
                    const d = new Date(match.start_time);
                    setDate(d.toISOString().split('T')[0]);
                    setTime(d.toTimeString().slice(0, 5));
                } else {
                    setDate('');
                    setTime('');
                }
            }
        }
    }, [isOpen, clubId, match]);

    const loadCourts = async () => {
        try {
            const data = await supabaseService.getCourts(clubId);
            setCourts(data);
        } catch (error) {
            console.error('Error loading courts:', error);
        }
    };

    const handleSave = async () => {
        if (!selectedCourtId || !date || !time) {
            alert('Por favor completa todos los campos');
            return;
        }

        setLoading(true);
        try {
            const startTime = new Date(`${date}T${time}`).toISOString();

            await supabaseService.updateMatchSchedule(match.id, {
                court_id: selectedCourtId,
                start_time: startTime
            });

            onScheduleUpdated();
            onClose();
        } catch (error) {
            console.error('Error updating schedule:', error);
            alert('Error al guardar la programación');
        } finally {
            setLoading(false);
        }
    };

    if (!match) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Programar Partido">
            <div className="space-y-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                    <div className="text-sm text-gray-400 mb-2">Partido</div>
                    <div className="flex items-center justify-center gap-4 font-bold text-lg text-white">
                        <span className="truncate max-w-[120px]">{match.team1?.team_name || 'TBD'}</span>
                        <span className="text-primary">vs</span>
                        <span className="truncate max-w-[120px]">{match.team2?.team_name || 'TBD'}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1 flex items-center gap-2">
                            <MapPin size={16} /> Cancha
                        </label>
                        <select
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                            value={selectedCourtId}
                            onChange={(e) => setSelectedCourtId(e.target.value)}
                        >
                            <option value="">Seleccionar cancha...</option>
                            {courts.map(court => (
                                <option key={court.id} value={court.id} className="bg-gray-900 text-white">
                                    {court.name} ({court.surface})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1 flex items-center gap-2">
                                <Calendar size={16} /> Fecha
                            </label>
                            <input
                                type="date"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1 flex items-center gap-2">
                                <Clock size={16} /> Hora
                            </label>
                            <input
                                type="time"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Programación'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
