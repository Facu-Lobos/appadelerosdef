import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { supabaseService } from '../services/supabaseService';
import type { PlayerProfile, Court } from '../types';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ManualBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    court: Court;
    date: Date;
    time: string;
    onBookingCreated: () => void;
}

export default function ManualBookingModal({ isOpen, onClose, court, date, time, onBookingCreated }: ManualBookingModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [players, setPlayers] = useState<PlayerProfile[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [bookingType, setBookingType] = useState<'registered' | 'guest'>('registered');
    const [guestName, setGuestName] = useState('');

    const handleSearch = async () => {
        if (!searchTerm) return;
        setSearching(true);
        const results = await supabaseService.searchPlayers(searchTerm);
        setPlayers(results);
        setSearching(false);
    };

    const handleBooking = async () => {
        if (bookingType === 'registered' && !selectedPlayer) return;
        if (bookingType === 'guest' && !guestName.trim()) return;

        setLoading(true);
        try {
            await supabaseService.createBooking({
                court_id: court.id,
                user_id: bookingType === 'registered' ? selectedPlayer!.id : '',
                guest_name: bookingType === 'guest' ? guestName : undefined,
                date: format(date, 'yyyy-MM-dd'),
                time: time
            });
            onBookingCreated();
            onClose();
        } catch (error: any) {
            console.error('Error creating booking:', JSON.stringify(error, null, 2));
            alert(`Error al crear la reserva: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Asignar Turno" size="md">
            <div className="space-y-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="text-sm text-gray-400 mb-1">Detalles del Turno</div>
                    <div className="font-bold text-lg text-primary">
                        {court.name} • {format(date, 'EEEE d', { locale: es })} • {time}
                    </div>
                </div>

                <div>
                    <div className="flex gap-4 mb-4 border-b border-white/10">
                        <button
                            className={`pb-2 text-sm font-medium transition-colors ${bookingType === 'registered' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setBookingType('registered')}
                        >
                            Jugador Registrado
                        </button>
                        <button
                            className={`pb-2 text-sm font-medium transition-colors ${bookingType === 'guest' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setBookingType('guest')}
                        >
                            Invitado / No Registrado
                        </button>
                    </div>

                    {bookingType === 'registered' ? (
                        <>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Buscar Jugador</label>
                            <div className="flex gap-2 mb-4">
                                <Input
                                    icon={Search}
                                    placeholder="Nombre, email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Button onClick={handleSearch} disabled={searching} variant="secondary">
                                    Buscar
                                </Button>
                            </div>

                            {players.length > 0 && !selectedPlayer && (
                                <div className="max-h-48 overflow-y-auto space-y-2 border border-white/10 rounded-xl p-2">
                                    {players.map(player => (
                                        <button
                                            key={player.id}
                                            onClick={() => setSelectedPlayer(player)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-surface overflow-hidden">
                                                <img src={player.avatar_url || "https://via.placeholder.com/150"} alt={player.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm">{player.name}</div>
                                                <div className="text-xs text-gray-400">{player.location}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedPlayer && (
                                <div className="bg-primary/10 border border-primary p-4 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-surface overflow-hidden border border-primary/30">
                                            <img src={selectedPlayer.avatar_url || "https://via.placeholder.com/150"} alt={selectedPlayer.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-primary">{selectedPlayer.name}</div>
                                            <div className="text-xs text-primary/70">Jugador Seleccionado</div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedPlayer(null)} className="text-xs text-red-400 hover:underline">
                                        Cambiar
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del Invitado</label>
                            <Input
                                placeholder="Ej: Juan Pérez"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-white/10">
                    <Button onClick={handleBooking} isLoading={loading} disabled={bookingType === 'registered' ? !selectedPlayer : !guestName.trim()}>
                        Confirmar Reserva
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
