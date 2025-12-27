import { useState, useEffect } from 'react';
import { supabaseService } from '../../services/supabaseService';
import type { ClubProfile, Court } from '../../types';
import { Users, Calendar, DollarSign, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, subMonths, getHours } from 'date-fns';
import { utils, writeFile } from 'xlsx';

export default function ClubDashboard() {
    const [club, setClub] = useState<ClubProfile | null>(null);
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCourts: 0,
        reservationsToday: 0,
        incomeToday: 0,
        occupancy: 0
    });
    const [dailyIncomeData, setDailyIncomeData] = useState<number[]>([]);
    const [monthlyIncomeData, setMonthlyIncomeData] = useState<number[]>([]);
    const [hourlyOccupancy, setHourlyOccupancy] = useState<{ time: string, val: number }[]>([]);
    const [courtStatus, setCourtStatus] = useState({ available: 0, occupied: 0 });

    const fetchData = async () => {
        setLoading(true);
        const user = await supabaseService.getCurrentUser();
        if (user && user.role === 'club') {
            const clubProfile = user as ClubProfile;
            setClub(clubProfile);

            // Fetch Courts
            const courtsData = await supabaseService.getClubCourts(clubProfile.id);
            setCourts(courtsData);
            const totalCourtsCount = courtsData.length || 4;

            // 1. Fetch Bookings for this month
            const now = new Date();
            const monthEnd = endOfMonth(now);

            // Fetch 6 months of data for monthly chart
            const sixMonthsAgo = subMonths(now, 5);
            const startOfSixMonths = startOfMonth(sixMonthsAgo);

            const bookings = await supabaseService.getClubBookingsRange(
                clubProfile.id,
                startOfSixMonths.toISOString(),
                monthEnd.toISOString()
            );

            // 2. Calculate Stats
            const today = format(now, 'yyyy-MM-dd');
            const todayBookings = bookings.filter((b: any) => b.start_time.startsWith(today));

            const incomeToday = todayBookings.reduce((sum: number, b: any) => sum + (b.payment_status === 'paid' ? b.price : 0), 0);

            // Occupancy Today
            // Assuming open 14 hours (e.g. 8am to 10pm) * courts
            const totalSlotsToday = totalCourtsCount * 14;
            const occupancy = Math.round((todayBookings.length / totalSlotsToday) * 100) || 0;

            setStats({
                totalCourts: totalCourtsCount,
                reservationsToday: todayBookings.length,
                incomeToday,
                occupancy
            });

            // 3. Daily Income (This Week)
            const weekStart = startOfWeek(now, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
            const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

            const dailyData = daysOfWeek.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return bookings
                    .filter((b: any) => b.start_time.startsWith(dateStr) && b.payment_status === 'paid')
                    .reduce((sum: number, b: any) => sum + b.price, 0);
            });
            setDailyIncomeData(dailyData);

            // 4. Monthly Income (Last 6 Months)
            const months = [];
            for (let i = 5; i >= 0; i--) {
                months.push(subMonths(now, i));
            }

            const monthlyData = months.map(month => {
                const monthStr = format(month, 'yyyy-MM');
                return bookings
                    .filter((b: any) => b.start_time.startsWith(monthStr) && b.payment_status === 'paid')
                    .reduce((sum: number, b: any) => sum + b.price, 0);
            });
            setMonthlyIncomeData(monthlyData);

            // 5. Hourly Occupancy (Average for current month)
            const hoursMap: { [key: number]: number } = {};
            const currentMonthBookings = bookings.filter((b: any) => b.start_time.startsWith(format(now, 'yyyy-MM')));

            currentMonthBookings.forEach((b: any) => {
                const hour = getHours(new Date(b.start_time));
                hoursMap[hour] = (hoursMap[hour] || 0) + 1;
            });

            const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

            const hourlyData = Object.entries(hoursMap).map(([hour, count]) => ({
                time: `${hour}:00`,
                val: Math.min(100, Math.round((count / (totalDaysInMonth * totalCourtsCount)) * 100))
            })).sort((a, b) => parseInt(a.time) - parseInt(b.time));

            // Filter for reasonable hours (e.g. 17:00 - 23:00 for display) or show top 5
            const peakHours = hourlyData.filter(h => parseInt(h.time) >= 17).slice(0, 5);
            setHourlyOccupancy(peakHours.length > 0 ? peakHours : hourlyData.slice(0, 5));

            // 6. Court Status (Right Now)
            const currentHour = now.getHours();
            const activeBookings = todayBookings.filter((b: any) => {
                const h = getHours(new Date(b.start_time));
                return h === currentHour;
            });

            setCourtStatus({
                available: totalCourtsCount - activeBookings.length,
                occupied: activeBookings.length
            });

        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const exportToExcel = async () => {
        if (!club) return;

        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const monthName = format(now, 'yyyy-MM');

        try {
            const bookings = await supabaseService.getClubBookingsRange(club.id, monthStart.toISOString(), monthEnd.toISOString());

            // Sort by date
            bookings.sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

            // 1. Prepare Details Sheet
            const detailsData = bookings.map((b: any) => {
                const court = courts.find(c => c.id === b.court_id);
                const courtName = court ? `${court.name} (${court.type === 'crystal' ? 'Cristal' : 'Pared'})` : `Cancha ${b.court_id}`;

                return {
                    'Fecha': format(new Date(b.start_time), 'dd/MM/yyyy'),
                    'Hora': format(new Date(b.start_time), 'HH:mm'),
                    'Cancha': courtName,
                    'Jugador': b.player_name || b.guest_name || 'Sin nombre',
                    'Precio': b.price,
                    'Estado Pago': b.payment_status === 'paid' ? 'Pagado' : 'Pendiente',
                    'Estado Reserva': b.status === 'confirmed' ? 'Confirmada' : 'Cancelada'
                };
            });

            // 2. Prepare Daily Summary Sheet
            const summaryMap: Record<string, { count: number, income: number }> = {};

            // Initialize all days of month
            const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
            daysInMonth.forEach(day => {
                summaryMap[format(day, 'dd/MM/yyyy')] = { count: 0, income: 0 };
            });

            bookings.forEach((b: any) => {
                if (b.payment_status === 'paid') {
                    const dayKey = format(new Date(b.start_time), 'dd/MM/yyyy');
                    if (summaryMap[dayKey]) {
                        summaryMap[dayKey].count += 1;
                        summaryMap[dayKey].income += b.price;
                    }
                }
            });

            const summaryData = Object.entries(summaryMap).map(([date, data]) => ({
                'Fecha': date,
                'Reservas Pagadas': data.count,
                'Ingresos': data.income
            }));

            // Add Total Row to Summary
            const totalIncome = summaryData.reduce((sum, item) => sum + item.Ingresos, 0);
            const totalBookings = summaryData.reduce((sum, item) => sum + item['Reservas Pagadas'], 0);
            summaryData.push({
                'Fecha': 'TOTAL MENSUAL',
                'Reservas Pagadas': totalBookings,
                'Ingresos': totalIncome
            });

            // Create Workbook
            const wb = utils.book_new();

            // Add Details Sheet
            const wsDetails = utils.json_to_sheet(detailsData);
            // Auto-width columns (approximate)
            const wscols = [
                { wch: 12 }, // Fecha
                { wch: 8 },  // Hora
                { wch: 25 }, // Cancha
                { wch: 25 }, // Jugador
                { wch: 10 }, // Precio
                { wch: 15 }, // Estado Pago
                { wch: 15 }  // Estado Reserva
            ];
            wsDetails['!cols'] = wscols;
            utils.book_append_sheet(wb, wsDetails, "Detalle Reservas");

            // Add Summary Sheet
            const wsSummary = utils.json_to_sheet(summaryData);
            const wscolsSummary = [
                { wch: 15 }, // Fecha
                { wch: 15 }, // Reservas
                { wch: 15 }  // Ingresos
            ];
            wsSummary['!cols'] = wscolsSummary;
            utils.book_append_sheet(wb, wsSummary, "Resumen Diario");

            // Download
            writeFile(wb, `Reporte_Mensual_${club.name.replace(/\s+/g, '_')}_${monthName}.xlsx`);

        } catch (error) {
            console.error('Error exporting excel:', error);
            alert('Error al generar el reporte. Intenta nuevamente.');
        }
    };

    if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    if (!club) return <div>No se encontró información del club.</div>;

    const maxDaily = Math.max(...dailyIncomeData, 1);
    const maxMonthly = Math.max(...monthlyIncomeData, 1);

    const statCards = [
        { label: 'Canchas Totales', value: stats.totalCourts, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Reservas Hoy', value: stats.reservationsToday, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Ingresos Hoy', value: `$${stats.incomeToday}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10' },
        { label: 'Ocupación', value: `${stats.occupancy}%`, icon: TrendingUp, color: 'text-secondary', bg: 'bg-secondary/10' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400">Bienvenido de nuevo, {club.name}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button onClick={fetchData} variant="outline" className="gap-2 justify-center w-full sm:w-auto">
                        <RefreshCw size={16} />
                        Actualizar
                    </Button>
                    <Button onClick={exportToExcel} variant="outline" className="gap-2 justify-center w-full sm:w-auto">
                        <Download size={16} />
                        Exportar Mes
                    </Button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {statCards.map((stat, i) => (
                    <div key={i} className="bg-surface rounded-xl p-4 md:p-6 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                        <div className="text-sm text-gray-400">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts Section - Hidden on mobile */}
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Daily Income Chart */}
                <div className="bg-surface rounded-xl p-4 md:p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Ingresos Semanales</h3>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-2">
                        {dailyIncomeData.map((value, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="w-full relative flex items-end justify-center h-full">
                                    <div
                                        className="w-full bg-primary/20 rounded-t-sm group-hover:bg-primary/40 transition-all relative"
                                        style={{ height: `${(value / maxDaily) * 100}%` }}
                                    >
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity z-10">
                                            ${value}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500">{['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monthly Income Chart */}
                <div className="bg-surface rounded-xl p-4 md:p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Ingresos Mensuales</h3>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-4">
                        {monthlyIncomeData.map((value, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="w-full relative flex items-end justify-center h-full">
                                    <div
                                        className="w-full bg-blue-500/20 rounded-t-sm group-hover:bg-blue-500/40 transition-all relative"
                                        style={{ height: `${(value / maxMonthly) * 100}%` }}
                                    >
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity z-10">
                                            ${value}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500">{['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Chart Placeholder */}
            <div className="md:hidden bg-surface rounded-xl p-4 border border-white/5 text-center">
                <p className="text-gray-400 text-sm">Los gráficos detallados están disponibles en la versión de escritorio.</p>
            </div>

            {/* Occupancy & Court Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-surface rounded-xl p-6 border border-white/5 hidden md:block">
                    <h3 className="text-lg font-bold text-white mb-6">Ocupación por Hora (Promedio Mes)</h3>
                    <div className="space-y-4">
                        {hourlyOccupancy.map((item, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className="text-sm text-gray-400 w-12">{item.time}</span>
                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
                                        style={{ width: `${item.val}%` }}
                                    />
                                </div>
                                <span className="text-sm font-medium text-white w-8">{item.val}%</span>
                            </div>
                        ))}
                        {hourlyOccupancy.length === 0 && <div className="text-gray-500 text-sm">No hay datos suficientes aún.</div>}
                    </div>
                </div>

                <div className="bg-surface rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-6">Estado de Canchas (Ahora)</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-sm text-gray-300">Disponibles</span>
                            </div>
                            <span className="font-bold text-white">{courtStatus.available}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="text-sm text-gray-300">Ocupadas</span>
                            </div>
                            <span className="font-bold text-white">{courtStatus.occupied}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
