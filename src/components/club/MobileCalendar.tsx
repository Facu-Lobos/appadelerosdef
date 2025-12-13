import { useState } from 'react';
import type { Court } from '../../types';
import { Button } from '../ui/Button';
import { ChevronDown, Check, Clock } from 'lucide-react';

interface MobileCalendarProps {
    date: Date;
    timeSlots: string[];
    courts: Court[];
    bookings: any[];
    onSlotClick: (court: Court, time: string) => void;
    onPaymentClick: (booking: any) => void;
}

export function MobileCalendar({ timeSlots, courts, bookings, onSlotClick, onPaymentClick }: MobileCalendarProps) {
    // State to toggle open time slots
    const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

    const isSlotBooked = (courtId: string, time: string) => {
        return bookings.find(b => {
            const bookingTime = new Date(b.start_time).toTimeString().slice(0, 5);
            return b.court_id === courtId && bookingTime === time;
        });
    };

    const toggleSlot = (time: string) => {
        if (expandedSlot === time) {
            setExpandedSlot(null);
        } else {
            setExpandedSlot(time);
        }
    };

    return (
        <div className="space-y-4 pb-24 md:hidden">
            {timeSlots.map(time => {
                // Calculate availability for this slot
                const availableCourts = courts.filter(c => !isSlotBooked(c.id, time));
                const availableCount = availableCourts.length;
                const isFullyBooked = availableCount === 0;

                const isOpen = expandedSlot === time;

                return (
                    <div key={time} className={`bg-surface border ${isOpen ? 'border-primary/50' : 'border-white/5'} rounded-xl overflow-hidden transition-all duration-300`}>
                        {/* Slot Header (Tap to expand) */}
                        <div
                            onClick={() => toggleSlot(time)}
                            className="p-4 flex items-center justify-between active:bg-white/5 cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                                    <Clock size={14} />
                                    {time}
                                </div>
                                <div className="text-sm">
                                    {isFullyBooked ? (
                                        <span className="text-red-400 font-medium">Completo</span>
                                    ) : (
                                        <span className="text-gray-400">
                                            <strong className="text-white">{availableCount}</strong> disponibles
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                                <ChevronDown size={20} />
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {isOpen && (
                            <div className="border-t border-white/5 bg-black/20 p-3 space-y-3">
                                {courts.map(court => {
                                    const booking = isSlotBooked(court.id, time);

                                    if (booking) {
                                        return (
                                            <div key={court.id} className="bg-surface border border-white/5 rounded-lg p-3 relative overflow-hidden">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${booking.payment_status === 'paid' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <div className="flex justify-between items-start pl-3">
                                                    <div>
                                                        <div className="text-xs text-gray-400 uppercase mb-1">{court.name}</div>
                                                        <div className="font-bold text-white text-sm">{booking.player_name || 'Reservado'}</div>
                                                        <div className="text-xs text-green-400 font-mono mt-1">${booking.price}</div>
                                                    </div>
                                                    {booking.payment_status === 'paid' ? (
                                                        <div className="bg-green-500/10 text-green-500 p-1.5 rounded-full">
                                                            <Check size={16} />
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            className="h-8 text-xs bg-green-600 hover:bg-green-700"
                                                            onClick={() => onPaymentClick(booking)}
                                                        >
                                                            Cobrar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Available Slot
                                    return (
                                        <button
                                            key={court.id}
                                            onClick={() => onSlotClick(court, time)}
                                            className="w-full bg-white/5 active:bg-primary/20 border border-white/5 rounded-lg p-3 text-left transition-all relative overflow-hidden"
                                        >
                                            <div className="flex justify-between items-center relative z-10">
                                                <div>
                                                    <div className="text-sm font-bold text-white mb-0.5">{court.name}</div>
                                                    <div className="text-xs text-gray-500 uppercase">{court.surface} • {court.type}</div>
                                                </div>
                                                <div className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded shadow-sm">
                                                    Reservar
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
