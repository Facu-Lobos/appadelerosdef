import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { supabaseService } from '../../services/supabaseService';
import type { ClubProfile, Court } from '../../types';
import { Button } from '../../components/ui/Button';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Trophy, MapPin, ArrowLeft, Medal, Clock } from 'lucide-react';
import { CourtVisual } from '../../components/ui/CourtVisual';

export default function ClubDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [club, setClub] = useState<ClubProfile | null>(null);
    const [activeTab, setActiveTab] = useState<'booking' | 'ranking'>('booking');
    const [loading, setLoading] = useState(true);

    // Booking State
    const [courts, setCourts] = useState<Court[]>([]);
    const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availability, setAvailability] = useState<{ court_id: string, time: string }[]>([]);
    const [bookingLoading, setBookingLoading] = useState(false);

    // Ranking State
    const [rankings, setRankings] = useState<any[]>([]);
    const [category, setCategory] = useState('6ta');
    const [gender, setGender] = useState('Masculino');
    const [rankingLoading, setRankingLoading] = useState(false);

    useEffect(() => {
        if (id) {
            fetchClubDetails();
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === 'ranking' && id) {
            fetchRankings();
        }
    }, [activeTab, id, category, gender]);

    useEffect(() => {
        if (id && selectedDate) {
            fetchAvailability();
        }
    }, [id, selectedDate]);

    const fetchClubDetails = async () => {
        try {
            setLoading(true);
            const clubs = await supabaseService.getClubs();
            const foundClub = clubs.find(c => c.id === id);

            if (foundClub) {
                setClub(foundClub);
                const courtsData = await supabaseService.getCourts(foundClub.id);
                setCourts(courtsData);
            }
        } catch (error) {
            console.error('Error loading club:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailability = async () => {
        if (!id) return;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const taken = await supabaseService.getClubAvailability(id, dateStr);
        setAvailability(taken);
        // Reset selection if the selected slot is now taken or date changed
        setSelectedCourt(null);
        setSelectedTime(null);
    };

    const fetchRankings = async () => {
        if (!id) return;
        setRankingLoading(true);
        try {
            const data = await supabaseService.getClubRankings(id, category, gender);
            setRankings(data);
        } catch (error) {
            console.error('Error loading rankings:', error);
        } finally {
            setRankingLoading(false);
        }
    };

    const handleBooking = async () => {
        if (!selectedCourt || !selectedTime || !club) return;

        setBookingLoading(true);
        const user = await supabaseService.getCurrentUser();
        if (!user) return;

        await supabaseService.createBooking({
            court_id: selectedCourt,
            user_id: user.id,
            date: format(selectedDate, 'yyyy-MM-dd'),
            time: selectedTime
        });

        setBookingLoading(false);
        alert('Reserva confirmada con éxito');
        navigate('/player/bookings');
    };

    // Generate time slots based on club schedule
    const timeSlots = (() => {
        if (!club?.schedule) {
            return Array.from({ length: 14 }, (_, i) => {
                const hour = 9 + i;
                return `${hour.toString().padStart(2, '0')}:00`;
            });
        }

        const schedule = club.schedule as any;
        const openStr = schedule.opening_time || schedule.open_hour || '09:00';
        const closeStr = schedule.closing_time || schedule.close_hour || '23:00';
        const duration = parseInt(schedule.slot_duration || '60');

        const [openH, openM] = openStr.split(':').map(Number);
        const [closeH, closeM] = closeStr.split(':').map(Number);

        let currentMinutes = openH * 60 + (openM || 0);
        const closeMinutes = closeH * 60 + (closeM || 0);

        const slots = [];

        while (currentMinutes + duration <= closeMinutes) {
            const h = Math.floor(currentMinutes / 60);
            const m = currentMinutes % 60;
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            currentMinutes += duration;
        }

        return slots;
    })();

    const isSlotTaken = (courtId: string, time: string) => {
        return availability.some(a => a.court_id === courtId && a.time === time);
    };

    if (loading) return <div>Cargando club...</div>;
    if (!club) return <div>Club no encontrado</div>;

    return (
        <div className="space-y-6 pb-20 w-full max-w-[100vw] overflow-x-hidden">
            {/* Header */}
            <div className="relative h-48 rounded-2xl overflow-hidden">
                <img
                    src={club.avatar_url || club.photos[0] || "https://via.placeholder.com/800x400"}
                    alt={club.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-4 left-4 text-white hover:bg-white/20"
                        onClick={() => navigate('/player')}
                    >
                        <ArrowLeft size={20} className="mr-2" /> Volver
                    </Button>
                    <h1 className="text-3xl font-bold text-white">{club.name}</h1>
                    <div className="flex items-center text-gray-300 mt-2">
                        <MapPin size={16} className="mr-2" />
                        {club.location}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('booking')}
                    className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'booking' ? 'text-primary' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Calendar size={18} />
                        Reservar Cancha
                    </div>
                    {activeTab === 'booking' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('ranking')}
                    className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'ranking' ? 'text-primary' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Trophy size={18} />
                        Ranking del Club
                    </div>
                    {activeTab === 'ranking' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
            </div>

            {/* Content */}
            {activeTab === 'booking' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Date Selection */}
                    <div>
                        <h3 className="text-lg font-bold mb-4">Selecciona una fecha</h3>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {Array.from({ length: 14 }).map((_, i) => {
                                const date = addDays(new Date(), i);
                                const dayIndex = date.getDay();
                                const isOpenDay = club.schedule?.open_days.includes(dayIndex) ?? true;
                                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

                                return (
                                    <button
                                        key={i}
                                        onClick={() => isOpenDay && setSelectedDate(date)}
                                        disabled={!isOpenDay}
                                        className={`flex-shrink-0 p-4 rounded-xl border transition-all min-w-[80px] ${isSelected
                                            ? 'bg-primary text-background border-primary font-bold scale-105'
                                            : isOpenDay
                                                ? 'bg-surface border-white/10 hover:border-white/30 hover:bg-white/5'
                                                : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className="text-xs uppercase mb-1">{format(date, 'EEE', { locale: es })}</div>
                                        <div className="text-2xl">{format(date, 'd')}</div>
                                        {!isOpenDay && <div className="text-[10px] text-red-400 mt-1">Cerrado</div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Schedule Grid */}
                    {club.schedule?.open_days.includes(selectedDate.getDay()) ? (
                        <>
                            {/* Desktop Grid */}
                            <div className="hidden md:block card overflow-hidden overflow-x-auto border border-white/10 shadow-2xl bg-[#0F172A]">
                                <div className="min-w-[800px]">
                                    {/* Header */}
                                    <div className="grid border-b border-white/10 bg-surface/50 backdrop-blur-sm sticky top-0 z-10"
                                        style={{ gridTemplateColumns: `80px repeat(${courts.length}, 1fr)` }}>
                                        <div className="p-4 font-bold text-gray-400 text-center flex items-center justify-center border-r border-white/10">
                                            <Clock size={20} />
                                        </div>
                                        {courts.map(court => (
                                            <div key={court.id} className="p-4 font-bold text-center border-r border-white/10 last:border-r-0">
                                                <div className="text-primary text-lg">{court.name}</div>
                                                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">
                                                    {court.type === 'crystal' ? 'Cristal' : 'Muro'} • {court.surface === 'synthetic' ? 'Sintético' : 'Cemento'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Desktop Grid Content */}
                                    <div className="divide-y divide-white/5">
                                        {timeSlots.map(time => (
                                            <div key={time} className="grid h-32 transition-colors hover:bg-white/[0.02]"
                                                style={{ gridTemplateColumns: `80px repeat(${courts.length}, 1fr)` }}>
                                                <div className="sticky left-0 z-20 p-2 text-center text-gray-400 font-medium border-r border-white/10 flex items-center justify-center text-sm bg-[#0F172A] shadow-[4px_0_24px_-2px_rgba(0,0,0,0.5)]">
                                                    {time}
                                                </div>
                                                {courts.map((court) => {
                                                    const isTaken = isSlotTaken(court.id, time);
                                                    const isSelected = selectedCourt === court.id && selectedTime === time;

                                                    return (
                                                        <div key={`${court.id}-${time}`} className="border-r border-white/10 last:border-r-0 p-2 relative group">
                                                            {isTaken ? (
                                                                <div className="w-full h-full bg-white/5 border border-white/5 rounded-lg flex items-center justify-center cursor-not-allowed">
                                                                    <span className="text-xs font-bold text-gray-500 uppercase">Ocupado</span>
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    onClick={() => {
                                                                        setSelectedCourt(court.id);
                                                                        setSelectedTime(time);
                                                                    }}
                                                                    className={`w-full h-full relative cursor-pointer transition-all duration-300 p-1 ${isSelected ? 'scale-[0.98]' : 'hover:scale-[1.02]'}`}
                                                                >
                                                                    <CourtVisual className={isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}>
                                                                        {/* Hover/Selection Overlay */}
                                                                        <div className={`absolute inset-0 flex flex-col items-center justify-center z-30 transition-all duration-300 ${isSelected ? 'bg-black/40 backdrop-blur-[1px]' : 'bg-black/20 opacity-0 group-hover:opacity-100 hover:bg-black/40'
                                                                            }`}>
                                                                            <span className="text-white font-bold text-lg drop-shadow-md">{time}</span>
                                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded mt-1 transition-all ${isSelected ? 'bg-primary text-white' : 'text-white/80'
                                                                                }`}>
                                                                                {isSelected ? 'SELECCIONADO' : 'DISPONIBLE'}
                                                                            </span>
                                                                        </div>
                                                                    </CourtVisual>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile List View - Compact */}
                            <div className="md:hidden space-y-3 max-w-[96%] mx-auto">
                                {timeSlots.map(time => {
                                    const availableCourts = courts.filter(c => !isSlotTaken(c.id, time));
                                    const hasAvailability = availableCourts.length > 0;
                                    const isExpanded = selectedTime === time;

                                    return (
                                        <div key={time} className={`bg-surface border ${hasAvailability ? 'border-white/10' : 'border-white/5 opacity-50'} rounded-lg overflow-hidden`}>
                                            <div className="px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="font-bold text-base text-white font-mono">{time}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {hasAvailability ? `${availableCourts.length} libres` : 'Completo'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* List of courts for this time - Accordion style if we wanted, but currently always shown if available? No, logically it was mapped below. */}
                                            {/* Current logic shows court list ALWAYS if hasAvailability. Let's keep it but make it tighter. */}
                                            {hasAvailability && (
                                                <div className="border-t border-white/5 divide-y divide-white/5">
                                                    {availableCourts.map(court => {
                                                        const isSelected = selectedCourt === court.id && selectedTime === time;

                                                        return (
                                                            <button
                                                                key={court.id}
                                                                onClick={() => {
                                                                    setSelectedCourt(court.id);
                                                                    setSelectedTime(time);
                                                                }}
                                                                className={`w-full text-left px-4 py-2 transition-colors flex items-center justify-between ${isSelected ? 'bg-primary/20' : 'active:bg-white/5'}`}
                                                            >
                                                                <div>
                                                                    <div className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-white'}`}>{court.name}</div>
                                                                    <div className="text-[10px] text-gray-400 capitalize">{court.surface} • {court.type}</div>
                                                                </div>
                                                                {isSelected ? (
                                                                    <Button
                                                                        size="sm"
                                                                        className="px-4 py-1 h-8 animate-pulse text-xs font-bold shadow-lg shadow-primary/25"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            if (!club) return;
                                                                            setBookingLoading(true);
                                                                            const user = await supabaseService.getCurrentUser();
                                                                            if (!user) { setBookingLoading(false); return; }

                                                                            await supabaseService.createBooking({
                                                                                court_id: court.id,
                                                                                user_id: user.id,
                                                                                date: format(selectedDate, 'yyyy-MM-dd'),
                                                                                time: time
                                                                            });

                                                                            setBookingLoading(false);
                                                                            showToast('Reservado con éxito', 'success');
                                                                            navigate('/player/bookings');
                                                                        }}
                                                                    >
                                                                        Reservar
                                                                    </Button>
                                                                ) : (
                                                                    <div className="text-primary text-xs font-medium">
                                                                        ${court.hourly_rate || 2000}
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                            <div className="text-4xl mb-4">😴</div>
                            <h3 className="text-xl font-bold text-white mb-2">El club está cerrado</h3>
                            <p className="text-gray-400">Selecciona otra fecha para ver los horarios disponibles.</p>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-lg border-t border-white/10 md:relative md:bg-transparent md:border-0 md:p-0">
                        <div className="max-w-7xl mx-auto flex items-center justify-between md:justify-end gap-4">
                            <Button
                                onClick={handleBooking}
                                isLoading={bookingLoading}
                                disabled={!selectedTime || !selectedCourt}
                                className="w-full md:w-auto px-8"
                            >
                                Confirmar Reserva
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Ranking Filters */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface p-4 rounded-xl border border-white/10">
                        <div className="flex gap-2">
                            {['Masculino', 'Femenino', 'Mixto'].map(g => (
                                <button
                                    key={g}
                                    onClick={() => setGender(g)}
                                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${gender === g ? 'bg-blue-500 text-white font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                        <div className="h-px w-full md:w-px md:h-6 bg-white/10"></div>
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
                            {['8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`px-3 py-1 rounded-lg text-sm transition-colors whitespace-nowrap ${category === cat ? 'bg-primary text-background font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ranking Table */}
                    <div className="bg-surface border border-white/10 rounded-xl overflow-x-auto min-h-[400px] max-w-[96%] mx-auto">
                        {rankingLoading ? (
                            <div className="flex items-center justify-center h-64 text-gray-400">
                                <div className="animate-spin mr-2 h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                                Cargando ranking...
                            </div>
                        ) : rankings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Trophy className="h-12 w-12 mb-4 opacity-20" />
                                <p>No hay jugadores con puntos en esta categoría aún.</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-black/20 text-left text-gray-400 text-sm">
                                        <th className="p-4">Pos</th>
                                        <th className="p-4">Jugador</th>
                                        <th className="p-4 text-center">Puntos</th>
                                        <th className="p-4 text-center">Categoría</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {rankings.map((player, index) => (
                                        <tr key={player.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 font-bold">
                                                    <span className={`text-lg w-8 text-center ${index < 3 ? 'text-white' : 'text-gray-500'}`}>
                                                        {index + 1}
                                                    </span>
                                                    {index === 0 && <Trophy className="text-yellow-400" size={20} />}
                                                    {index === 1 && <Medal className="text-gray-300" size={20} />}
                                                    {index === 2 && <Medal className="text-orange-400" size={20} />}
                                                </div>
                                            </td>
                                            <td className="p-4 font-medium flex items-center gap-3">
                                                {player.avatar_url ? (
                                                    <img
                                                        src={player.avatar_url}
                                                        alt={player.name}
                                                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                                        {player.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                {player.name}
                                            </td>
                                            <td className="p-4 text-center font-bold text-primary text-lg">{player.points}</td>
                                            <td className="p-4 text-center text-gray-400">{player.category}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
