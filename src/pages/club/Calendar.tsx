import { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Share2 } from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import type { Court, ClubProfile } from '../../types';
import ManualBookingModal from '../../components/ManualBookingModal';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ShareScheduleModal } from '../../components/club/ShareScheduleModal';
import { MobileCalendar } from '../../components/club/MobileCalendar';

export default function ClubCalendar() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [courts, setCourts] = useState<Court[]>([]);
    const [schedule, setSchedule] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [manualBooking, setManualBooking] = useState<{ court: Court, time: string } | null>(null);
    const [paymentConfirmation, setPaymentConfirmation] = useState<{ bookingId: string, price: number, playerName: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ClubProfile | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            loadClubData();
        }
    }, [user]);

    useEffect(() => {
        if (user && courts.length > 0) {
            loadBookings();

            // Realtime subscription
            const channel = supabase
                .channel('bookings-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
                    console.log('Booking change received!', payload);
                    // Add a small delay to ensure data is propagated
                    setTimeout(() => {
                        loadBookings();
                    }, 500);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [currentDate, user, courts]);

    const loadClubData = async () => {
        if (!user) return;
        const [profileData, courtsData] = await Promise.all([
            supabaseService.getProfile(user.id),
            supabaseService.getClubCourts(user.id)
        ]);

        if (profileData) {
            setProfile(profileData as ClubProfile);
            if ((profileData as ClubProfile).schedule) {
                setSchedule((profileData as ClubProfile).schedule);
            }
        }
        setCourts(courtsData);
        setLoading(false);
    };

    const loadBookings = async () => {
        if (!user) return;
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const bookingsData = await supabaseService.getClubBookings(user.id, dateStr);
        setBookings(bookingsData);
    };

    const nextDay = () => setCurrentDate(addDays(currentDate, 1));
    const prevDay = () => setCurrentDate(addDays(currentDate, -1));

    // Generate time slots based on schedule
    const timeSlots = useMemo(() => {
        const slots = [];
        if (schedule) {
            const startHour = parseInt(schedule.opening_time.split(':')[0]);
            const endHour = parseInt(schedule.closing_time.split(':')[0]);
            const duration = schedule.slot_duration || 60;

            let current = startHour * 60; // minutes from midnight
            const end = endHour * 60;

            while (current < end) {
                const h = Math.floor(current / 60);
                const m = current % 60;
                const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                slots.push(timeString);
                current += duration;
            }
        } else {
            // Fallback
            for (let i = 9; i < 23; i++) slots.push(`${i}:00`);
        }
        return slots;
    }, [schedule]);

    const isSlotBooked = (courtId: string, time: string) => {
        return bookings.find(b => {
            const bookingTime = new Date(b.start_time).toTimeString().slice(0, 5);
            return b.court_id === courtId && bookingTime === time;
        });
    };

    const availableSlotsForSharing = useMemo(() => {
        const available: { time: string; available: boolean; courtName: string; }[] = [];
        timeSlots.forEach(time => {
            courts.forEach(court => {
                const booked = isSlotBooked(court.id, time);
                if (!booked) {
                    available.push({
                        time,
                        available: true,
                        courtName: court.name
                    });
                }
            });
        });
        // Sort by time
        return available.sort((a, b) => a.time.localeCompare(b.time));
    }, [timeSlots, courts, bookings]);

    if (loading) return <div className="p-8 text-center">Cargando calendario...</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Calendario de Reservas
                </h1>
                <div className="flex items-center gap-4">
                    <Button
                        variant="primary"
                        size="sm"
                        className="hidden md:flex items-center gap-2 shadow-lg shadow-primary/25 z-50 relative"
                        onClick={() => setIsShareModalOpen(true)}
                    >
                        <Share2 size={16} />
                        Compartir
                    </Button>
                    <div className="flex items-center gap-4 bg-surface p-2 rounded-xl border border-white/5 shadow-lg relative z-40">
                        <button onClick={prevDay} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <div className="flex items-center gap-2 font-bold min-w-[140px] md:min-w-[200px] justify-center capitalize text-sm md:text-lg">
                            <CalendarIcon size={20} className="text-gray-400 hidden sm:block" />
                            <span className="md:hidden">{format(currentDate, 'EEE d MMM', { locale: es })}</span>
                            <span className="hidden md:inline">{format(currentDate, 'EEEE d MMMM', { locale: es })}</span>
                        </div>
                        <button onClick={nextDay} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-primary">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                    {/* Mobile Share Button */}
                    <Button
                        variant="secondary"
                        className="md:hidden text-white shadow-lg z-50 relative p-2"
                        onClick={() => setIsShareModalOpen(true)}
                    >
                        <Share2 size={24} />
                    </Button>
                </div>
            </div>

            {/* Desktop Grid View */}
            <div className="hidden md:block card overflow-hidden overflow-x-auto border border-white/10 shadow-2xl bg-[#0F172A]">
                <div className="min-w-[800px]">
                    {/* Header */}
                    <div className="grid border-b border-white/10 bg-surface/95 backdrop-blur-sm sticky top-0 z-20"
                        style={{ gridTemplateColumns: `80px repeat(${courts.length}, 1fr)` }}>
                        <div className="p-4 font-bold text-gray-400 text-center flex items-center justify-center border-r border-white/10 sticky left-0 z-30 bg-[#0F172A] shadow-[4px_0_24px_-2px_rgba(0,0,0,0.5)]">
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
                    {/* Grid */}
                    <div className="divide-y divide-white/5">
                        {timeSlots.map(time => (
                            <div key={time} className="grid h-32 transition-colors hover:bg-white/[0.02]"
                                style={{ gridTemplateColumns: `80px repeat(${courts.length}, 1fr)` }}>
                                <div className="sticky left-0 z-20 p-2 text-center text-gray-400 font-medium border-r border-white/10 flex items-center justify-center text-sm bg-[#0F172A] shadow-[4px_0_24px_-2px_rgba(0,0,0,0.5)]">
                                    {time}
                                </div>
                                {courts.map((court) => {
                                    const booking = isSlotBooked(court.id, time);
                                    return (
                                        <div key={`${court.id}-${time}`} className="border-r border-white/10 last:border-r-0 p-2 relative group">
                                            {booking ? (
                                                <div className={`w-full h-full border rounded-lg p-2 cursor-pointer transition-all flex flex-col justify-center items-center shadow-lg group/booked relative overflow-hidden ${booking.payment_status === 'paid'
                                                    ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                                    : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                                    }`}>
                                                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 group-hover/booked:scale-110 transition-transform ${booking.payment_status === 'paid' ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                        {booking.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                                                    </div>
                                                    <div className="text-xs text-white/80 truncate font-medium mb-1">{booking.player_name || 'Reservado'}</div>
                                                    <div className="text-xs text-white/60 font-mono">${booking.price}</div>

                                                    {booking.payment_status !== 'paid' && (
                                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/booked:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm z-10">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPaymentConfirmation({
                                                                        bookingId: booking.id,
                                                                        price: booking.price,
                                                                        playerName: booking.player_name || booking.guest_name || 'Sin nombre'
                                                                    });
                                                                }}
                                                                className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-full shadow-lg transform hover:scale-105 transition-all cursor-pointer relative z-20"
                                                            >
                                                                Cobrar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-full h-full relative cursor-pointer group-hover:scale-[1.02] transition-all duration-300 p-1">
                                                    {/* High-Fidelity Padel Court Design - Horizontal Orientation */}
                                                    <div className="w-full h-full bg-[#2563EB] rounded relative overflow-hidden shadow-lg border border-white/10">
                                                        {/* Turf Texture Gradient */}
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 to-transparent"></div>

                                                        {/* Court Lines Container - Inset to simulate play area */}
                                                        <div className="absolute inset-[4px] border border-white/60">
                                                            {/* Center Net - Vertical */}
                                                            <div className="absolute left-1/2 top-[-4px] bottom-[-4px] w-[2px] bg-gray-300 z-20 shadow-sm flex flex-col items-center justify-center -translate-x-1/2">
                                                                <div className="h-full w-[1px] bg-black/20"></div>
                                                            </div>
                                                            {/* Net Shadow */}
                                                            <div className="absolute left-1/2 top-0 bottom-0 w-2 bg-black/10 -translate-x-1/2 blur-[2px]"></div>

                                                            {/* Service Lines (Vertical, approx 30% from ends) */}
                                                            <div className="absolute left-[30%] top-0 bottom-0 w-[1px] bg-white/60"></div>
                                                            <div className="absolute right-[30%] top-0 bottom-0 w-[1px] bg-white/60"></div>

                                                            {/* Center Service Line (Horizontal, from Net to Service Lines) */}
                                                            {/* Left Side */}
                                                            <div className="absolute left-[30%] right-[50%] top-1/2 h-[1px] bg-white/60 -translate-y-1/2"></div>
                                                            {/* Right Side */}
                                                            <div className="absolute left-[50%] right-[30%] top-1/2 h-[1px] bg-white/60 -translate-y-1/2"></div>

                                                            {/* Service Box T-Marks (Small details at service lines) */}
                                                            <div className="absolute left-[30%] top-1/2 w-1 h-[1px] bg-white/60 -translate-x-1/2 -translate-y-1/2"></div>
                                                            <div className="absolute right-[30%] top-1/2 w-1 h-[1px] bg-white/60 -translate-x-1/2 -translate-y-1/2"></div>
                                                        </div>

                                                        {/* Glass Walls (Back & Corners) - 3D Effect for Horizontal View */}
                                                        <div className="absolute inset-0 border-[3px] border-white/10 rounded pointer-events-none"></div>
                                                        <div className="absolute top-0 bottom-0 left-0 w-[10%] bg-gradient-to-r from-white/10 to-transparent pointer-events-none"></div>
                                                        <div className="absolute top-0 bottom-0 right-0 w-[10%] bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>

                                                        {/* Entrance/Exit Gaps (Net level, top and bottom) */}
                                                        <div className="absolute left-1/2 top-0 h-[4px] w-3 bg-[#0F172A] -translate-x-1/2"></div>
                                                        <div className="absolute left-1/2 bottom-0 h-[4px] w-3 bg-[#0F172A] -translate-x-1/2"></div>
                                                    </div>

                                                    {/* Hover Action Overlay */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center backdrop-blur-[2px] rounded-lg z-30">
                                                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex flex-col items-center gap-1">
                                                            <span className="text-white/80 font-medium text-sm">{time}</span>
                                                            <span className="font-bold text-white text-sm tracking-wide">DISPONIBLE</span>
                                                            <button
                                                                onClick={() => setManualBooking({ court, time })}
                                                                className="text-[10px] text-primary-foreground bg-primary px-3 py-1 rounded-full font-medium shadow-lg hover:bg-primary/90 transition-colors"
                                                            >
                                                                + Asignar Turno
                                                            </button>
                                                        </div>
                                                    </div>
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

            {/* Mobile Calendar View (Agenda/List Style) */}
            <MobileCalendar
                date={currentDate}
                timeSlots={timeSlots}
                courts={courts}
                bookings={bookings}
                onSlotClick={(court, time) => setManualBooking({ court, time })}
                onPaymentClick={(booking) => {
                    setPaymentConfirmation({
                        bookingId: booking.id,
                        price: booking.price,
                        playerName: booking.player_name || booking.guest_name || 'Sin nombre'
                    });
                }}
            />

            {/* Manual Booking Modal */}
            {manualBooking && (
                <ManualBookingModal
                    isOpen={!!manualBooking}
                    onClose={() => setManualBooking(null)}
                    court={manualBooking.court}
                    date={currentDate}
                    time={manualBooking.time}
                    onBookingCreated={() => {
                        loadBookings();
                        setManualBooking(null);
                    }}
                />
            )}

            {/* Payment Confirmation Modal */}
            <Modal
                isOpen={!!paymentConfirmation}
                onClose={() => setPaymentConfirmation(null)}
                title="Confirmar Pago"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <div className="text-sm text-gray-400 mb-1">Jugador</div>
                        <div className="font-bold text-white mb-3">{paymentConfirmation?.playerName}</div>

                        <div className="text-sm text-gray-400 mb-1">Monto a cobrar</div>
                        <div className="text-2xl font-bold text-green-400">${paymentConfirmation?.price}</div>
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setPaymentConfirmation(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!paymentConfirmation) return;
                                const success = await supabaseService.markBookingAsPaid(paymentConfirmation.bookingId);
                                if (success) {
                                    loadBookings();
                                    setPaymentConfirmation(null);
                                } else {
                                    alert('Error al registrar el pago. Revisa los permisos de la base de datos.');
                                }
                            }}
                            className="bg-green-500 hover:bg-green-600 border-green-500"
                        >
                            Confirmar Cobro
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Share Schedule Modal */}
            <ShareScheduleModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                clubName={profile?.name || 'Mi Club'}
                clubLogoUrl={profile?.avatar_url}
                date={currentDate}
                schedule={availableSlotsForSharing}
            />
        </div>
    );
}
