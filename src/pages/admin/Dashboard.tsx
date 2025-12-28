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

const ADMIN_EMAIL = 'facundo.lobos90@gmail.com';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [clubs, setClubs] = useState<ClubProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

    // Create Club Form
    const [newClubEmail, setNewClubEmail] = useState('');
    const [newClubPassword, setNewClubPassword] = useState('');
    const [newClubName, setNewClubName] = useState('');
    const [newClubLocation, setNewClubLocation] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

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
        } catch (error) {
            console.error('Error fetching clubs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCommission = async (clubId: string, rate: number) => {
        try {
            // Update profile in DB
            // We need a method in supabaseService to update ANY profile, currently updateProfile updates current user.
            // But since we are admin (conceptually), we might need RLS bypass or just rely on RLS allowing update if we are the user?
            // Wait, RLS usually prevents updating other users.
            // If RLS is strict, we can't update other users' profiles from the client unless we are that user.
            // However, for this MVP, maybe RLS is open or we can use a workaround?
            // If RLS blocks it, we can't do it without a backend function.
            // Let's try updating via supabase directly.

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
                // We also need to ensure the profile is created with the correct data
                // The trigger on auth.users usually handles profile creation.
                // But we passed metadata, so it should be fine if the trigger uses raw_user_meta_data.

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
                    className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'list' ? 'bg-primary text-black font-bold' : 'bg-white/5 hover:bg-white/10'}`}
                >
                    <div className="flex items-center gap-2">
                        <Users size={18} />
                        Lista de Clubes
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'create' ? 'bg-primary text-black font-bold' : 'bg-white/5 hover:bg-white/10'}`}
                >
                    <div className="flex items-center gap-2">
                        <Plus size={18} />
                        Crear Nuevo Club
                    </div>
                </button>
            </div>

            {activeTab === 'list' ? (
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-black/20 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="p-4">Club</th>
                                <th className="p-4">Ubicación</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Comisión App</th>
                                <th className="p-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {clubs.map(club => (
                                <tr key={club.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-bold">{club.name}</td>
                                    <td className="p-4 text-gray-400">{club.location}</td>
                                    <td className="p-4 text-gray-400 text-sm">{club.email}</td>
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
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                const input = document.getElementById(`commission-${club.id}`) as HTMLInputElement;
                                                const percentage = parseFloat(input.value);
                                                handleUpdateCommission(club.id, percentage / 100);
                                            }}
                                            icon={Save}
                                        >
                                            Guardar
                                        </Button>
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
        </div>
    );
}
