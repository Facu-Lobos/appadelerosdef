import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { supabaseService } from '../../services/supabaseService';
import type { ClubProfile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { createClient } from '@supabase/supabase-js';
import { Users, Plus, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';

const ADMIN_EMAIL = 'facundo.lobos90@gmail.com';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [clubs, setClubs] = useState<ClubProfile[]>([]);
    const [clubStats, setClubStats] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

    // Create Club Form
    const [newClubEmail, setNewClubEmail] = useState('');
    const [newClubPassword, setNewClubPassword] = useState('');
    const [newClubName, setNewClubName] = useState('');
    const [newClubLocation, setNewClubLocation] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; clubId: string; clubName: string } | null>(null);

    useEffect(() => {
        if (user?.email !== ADMIN_EMAIL) {
            navigate('/');
            return;
        }
        fetchClubs();
    }, [user, navigate]);

    const fetchClubs = async () => {
        setLoading(true);
        try {
            const data = await supabaseService.getClubs();
            setClubs(data);

            // Fetch stats for each club
            const statsMap: Record<string, any> = {};
            for (const club of data) {
                // 1. Get Courts for pricing
                const courts = await supabaseService.getClubCourts(club.id);
                const prices = courts.map(c => c.hourly_rate || 0).filter(p => p > 0);
                const minPrice = prices.length ? Math.min(...prices) : 0;
                const maxPrice = prices.length ? Math.max(...prices) : 0;
                const priceDisplay = minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`;

                // 2. Get Bookings for commission (Paid bookings since last payment)
                let query = supabase
                    .from('bookings')
                    .select('price, payment_status, start_time, courts!inner(club_id)')
                    .eq('courts.club_id', club.id)
                    .eq('payment_status', 'paid');

                if (club.last_payment_date) {
                    query = query.gt('start_time', club.last_payment_date);
                }

                const { data: bookings } = await query;

                const totalIncome = bookings?.reduce((sum, b) => sum + (b.price || 0), 0) || 0;
                const commissionRate = club.commission_rate || 0.05;
                const totalCommission = Math.round(totalIncome * commissionRate);

                statsMap[club.id] = {
                    priceDisplay,
                    totalCommission,
                    totalIncome
                };
            }
            setClubStats(statsMap);

        } catch (error) {
            console.error('Error fetching clubs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCommission = async (clubId: string, rate: number) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ commission_rate: rate })
                .eq('id', clubId);

            if (error) throw error;

            alert('Comisión actualizada');
            fetchClubs();
        } catch (error: any) {
            alert('Error al actualizar: ' + error.message);
        }
    };

    const handleResetCommission = async () => {
        if (!confirmModal) return;

        try {
            // 1. Update DB - Set last_payment_date to NOW
            // 1. Update DB - Set last_payment_date to NOW
            // We use select() to verify the update actually happened via RLS
            const { data, error } = await supabase
                .from('profiles')
                .update({ last_payment_date: new Date().toISOString() })
                .eq('id', confirmModal.clubId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                alert('⚠️ ALERTA DE DEBUG: No se actualizó ninguna fila. \nPosible causa: RLS (Permisos) o ID incorrecto.\nIntenta volver a correr el script de permisos.');
                return;
            } else {
                // alert('DEBUG: Actualización exitosa en BD. Filas: ' + data.length);
            }

            // 2. Optimistic Update - Set commission to 0 immediately in UI
            setClubStats(prev => ({
                ...prev,
                [confirmModal.clubId]: {
                    ...prev[confirmModal.clubId],
                    totalCommission: 0
                }
            }));

            setConfirmModal(null);

            // 3. Background Re-fetch (Optional, to ensure consistency)
            setTimeout(() => {
                fetchClubs();
            }, 1000);

        } catch (e: any) {
            console.error('Error reseting commission:', e);
            alert('Error al reiniciar comisión: ' + e.message);
        }
    };

    const handleCreateClub = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);

        try {
            // Use a temporary client to avoid logging out the admin
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false, // Don't persist session
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            const { data, error } = await tempSupabase.auth.signUp({
                email: newClubEmail,
                password: newClubPassword,
                options: {
                    data: {
                        role: 'club',
                        name: newClubName,
                        location: newClubLocation,
                        commission_rate: 0.05 // Default 5%
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                alert('Club creado exitosamente');
                setNewClubEmail('');
                setNewClubPassword('');
                setNewClubName('');
                setNewClubLocation('');
                setActiveTab('list');
                fetchClubs();
            }
        } catch (error: any) {
            alert('Error al crear club: ' + error.message);
        } finally {
            setCreateLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Cargando panel...</div>;

    // Check email again just in case, though the link is hidden for others
    if (user?.email !== ADMIN_EMAIL) {
        return <div className="p-8 text-center text-white">Acceso denegado</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    Panel de Administración
                </h1>
            </div>

            <div className="flex gap-4 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${activeTab === 'list' ? 'bg-primary text-black font-bold' : 'bg-white/5 hover:bg-white/10'}`}
                >
                    <div className="flex items-center gap-2">
                        <Users size={18} />
                        Lista de Clubes
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${activeTab === 'create' ? 'bg-primary text-black font-bold' : 'bg-white/5 hover:bg-white/10'}`}
                >
                    <div className="flex items-center gap-2">
                        <Plus size={18} />
                        Crear Nuevo Club
                    </div>
                </button>
            </div>

            {activeTab === 'list' ? (
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/20 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="p-4">Club</th>
                                <th className="p-4">Ubicación</th>
                                <th className="p-4">Precio Cancha</th>
                                <th className="p-4">Comisión Acumulada</th>
                                <th className="p-4">Comisión %</th>
                                <th className="p-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {clubs.map(club => (
                                <tr key={club.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-bold">{club.name}</td>
                                    <td className="p-4 text-gray-400">{club.location}</td>
                                    <td className="p-4 text-gray-300">
                                        {clubStats[club.id]?.priceDisplay || '-'}
                                    </td>
                                    <td className="p-4 text-green-400 font-bold">
                                        ${clubStats[club.id]?.totalCommission || 0}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">%</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                defaultValue={(club.commission_rate || 0.05) * 100}
                                                className="bg-black/20 border border-white/10 rounded px-2 py-1 w-16 text-center"
                                                id={`commission-${club.id}`}
                                            />
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    const input = document.getElementById(`commission-${club.id}`) as HTMLInputElement;
                                                    const percentage = parseFloat(input.value);
                                                    handleUpdateCommission(club.id, percentage / 100);
                                                }}
                                                icon={Save}
                                                className="mr-2"
                                            >
                                                Guardar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => setConfirmModal({ isOpen: true, clubId: club.id, clubName: club.name })}
                                            >
                                                Reiniciar
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="max-w-md mx-auto bg-white/5 p-8 rounded-xl border border-white/10">
                    <h2 className="text-xl font-bold mb-6">Registrar Nuevo Club</h2>
                    <form onSubmit={handleCreateClub} className="space-y-4">
                        <Input
                            label="Nombre del Club"
                            value={newClubName}
                            onChange={(e) => setNewClubName(e.target.value)}
                            required
                        />
                        <Input
                            label="Ubicación"
                            value={newClubLocation}
                            onChange={(e) => setNewClubLocation(e.target.value)}
                            required
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={newClubEmail}
                            onChange={(e) => setNewClubEmail(e.target.value)}
                            required
                        />
                        <Input
                            label="Contraseña"
                            type="password"
                            value={newClubPassword}
                            onChange={(e) => setNewClubPassword(e.target.value)}
                            required
                        />
                        <Button
                            type="submit"
                            className="w-full mt-4"
                            isLoading={createLoading}
                        >
                            Crear Club
                        </Button>
                    </form>
                </div>
            )}

            <Modal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                title="Confirmar Reinicio"
            >
                <div className="space-y-4">
                    <p>
                        ¿Estás seguro que deseas reiniciar la comisión de <strong>{confirmModal?.clubName}</strong>?
                    </p>
                    <p className="text-sm text-gray-400">
                        Esto marcará todas las reservas actuales como "pagadas" a efectos de comisión y reiniciará el contador a $0.
                    </p>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setConfirmModal(null)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleResetCommission}>
                            Confirmar Reinicio
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
