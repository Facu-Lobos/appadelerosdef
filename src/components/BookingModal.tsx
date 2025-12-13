import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { supabaseService } from '../services/supabaseService';
import type { Court, ClubProfile } from '../types';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    club: ClubProfile;
}

export default function BookingModal({ isOpen, onClose, club }: BookingModalProps) {
    const [courts, setCourts] = useState<Court[]>([]);
    const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && club) {
            const fetchCourts = async () => {
                const data = await supabaseService.getCourts(club.id);
                setCourts(data);
                if (data.length > 0) setSelectedCourt(data[0].id);
            };
            fetchCourts();
        }
    }, [isOpen, club]);

    const handleBooking = async () => {
        if (!selectedCourt || !selectedTime) return;

        setLoading(true);
        const user = await supabaseService.getCurrentUser();
        if (!user) return;

        await supabaseService.createBooking({
            court_id: selectedCourt,
            user_id: user.id,
            date: format(selectedDate, 'yyyy-MM-dd'),
            time: selectedTime,
            price: 12000 // Mock price
        });

        setLoading(false);
        onClose();
        // In a real app, we would trigger a refresh or toast here
    };

    const [takenSlots, setTakenSlots] = useState<string[]>([]);

    useEffect(() => {
        if (selectedCourt && selectedDate) {
            const fetchAvailability = async () => {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const taken = await supabaseService.getBookingsForCourt(selectedCourt, dateStr);
                setTakenSlots(taken);
            };
            fetchAvailability();
        }
    }, [selectedCourt, selectedDate]);

    // Generate time slots (mock)
    const timeSlots = Array.from({ length: 14 }, (_, i) => {
        const hour = 9 + i; // 9 AM to 10 PM
        return `${hour.toString().padStart(2, '0')}:00`;
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reservar en ${club.name}`} size="lg">
            <div className="space-y-6">
                {/* Date Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Fecha</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const date = addDays(new Date(), i);
                            const dayIndex = date.getDay();
                            const isOpenDay = club.schedule?.open_days.includes(dayIndex) ?? true;
                            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

                            return (
                                <button
                                    key={i}
                                    onClick={() => isOpenDay && setSelectedDate(date)}
                                    disabled={!isOpenDay}
                                    className={`flex-shrink-0 p-3 rounded-xl border transition-all ${isSelected
                                        ? 'bg-primary text-background border-primary font-bold'
                                        : isOpenDay
                                            ? 'bg-surface border-white/10 hover:border-white/30'
                                            : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="text-xs uppercase">{format(date, 'EEE', { locale: es })}</div>
                                    <div className="text-lg">{format(date, 'd')}</div>
                                    {!isOpenDay && <div className="text-[10px] text-red-400 mt-1">Cerrado</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Court Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Cancha</label>
                    <div className="grid grid-cols-2 gap-3">
                        {courts.map(court => (
                            <button
                                key={court.id}
                                onClick={() => setSelectedCourt(court.id)}
                                className={`p-3 rounded-xl border text-left transition-all ${selectedCourt === court.id
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-surface border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <div className="font-bold">{court.name}</div>
                                <div className="text-xs opacity-70 capitalize">{court.type} - {court.surface}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Selection with High-Fidelity Courts */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-4">Horarios Disponibles</label>

                    {club.schedule?.open_days.includes(selectedDate.getDay()) ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {timeSlots.map(time => {
                                const isTaken = takenSlots.includes(time);
                                const isSelected = selectedTime === time;

                                return (
                                    <div
                                        key={time}
                                        onClick={() => !isTaken && setSelectedTime(time)}
                                        className={`relative h-32 rounded-lg transition-all duration-300 ${isTaken ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:scale-[1.02]'
                                            } ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                                    >
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

                                        {/* Overlay Content */}
                                        <div className={`absolute inset-0 flex flex-col items-center justify-center z-30 transition-all duration-300 ${isSelected ? 'bg-black/40 backdrop-blur-[1px]' : 'bg-black/20 hover:bg-black/40'
                                            }`}>
                                            <span className="text-white font-bold text-lg drop-shadow-md">{time}</span>
                                            {isTaken ? (
                                                <span className="text-xs font-bold text-red-400 bg-black/50 px-2 py-0.5 rounded mt-1">OCUPADO</span>
                                            ) : (
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded mt-1 transition-all ${isSelected ? 'bg-primary text-white' : 'text-white/80'
                                                    }`}>
                                                    {isSelected ? 'SELECCIONADO' : 'DISPONIBLE'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-xl border border-white/10 text-center">
                            <div className="text-4xl mb-4">😴</div>
                            <h3 className="text-xl font-bold text-white mb-2">El club está cerrado</h3>
                            <p className="text-gray-400">Selecciona otra fecha para ver los horarios disponibles.</p>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end items-center">
                    <Button onClick={handleBooking} isLoading={loading} disabled={!selectedTime || !selectedCourt}>
                        Confirmar Reserva
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
