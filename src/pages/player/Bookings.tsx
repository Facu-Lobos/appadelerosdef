import { useState, useEffect } from 'react';
import { supabaseService } from '../../services/supabaseService';
import type { Booking } from '../../types';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PlayerBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            const user = await supabaseService.getCurrentUser();
            if (user) {
                const data = await supabaseService.getBookings(user.id);
                setBookings(data);
            }
            setLoading(false);
        };
        fetchBookings();
    }, []);

    if (loading) return <div>Cargando reservas...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Mis Reservas</h1>

            {bookings.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-2xl border border-white/5">
                    <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-300">No tienes reservas activas</h3>
                    <p className="text-gray-500">¡Busca un club y reserva tu próximo partido!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {bookings.map(booking => (
                        <div key={booking.id} className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="bg-primary/10 p-3 rounded-xl text-primary">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Reserva de Cancha</h3>
                                    <div className="flex items-center text-gray-400 text-sm mt-1">
                                        <Clock size={16} className="mr-1" />
                                        <span className="capitalize">
                                            {format(new Date(booking.date + 'T00:00:00'), 'EEEE d MMMM', { locale: es })} - {booking.time}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-gray-400 text-sm mt-1">
                                        <MapPin size={16} className="mr-1" />
                                        {booking.club_name || 'Club desconocido'}
                                        {booking.court_name && (
                                            <span className="ml-2 text-xs bg-white/10 px-2 py-0.5 rounded text-gray-300">
                                                {booking.court_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {booking.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-400">Precio</div>
                                    <div className="font-bold text-primary">${booking.price}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
