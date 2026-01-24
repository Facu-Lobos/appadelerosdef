import { useState, useEffect } from 'react';
import { supabaseService } from '../../services/supabaseService';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import type { PlayerProfile } from '../../types';
import { Trophy, Activity, MapPin, Edit } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function PlayerProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        category: '',
        gender: '',
        avatar_url: '',
        availability: ''
    });

    const { refreshProfile, logout } = useAuth();
    const { isSoundEnabled, toggleSound } = useNotifications();

    useEffect(() => {
        const fetchProfile = async () => {
            const user = await supabaseService.getCurrentUser();
            if (user && user.role === 'player') {
                const player = user as PlayerProfile;
                setProfile(player);
                setFormData({
                    name: player.name,
                    location: player.location,
                    category: player.category.toString(),
                    gender: player.gender || '',
                    avatar_url: player.avatar_url || '',
                    availability: player.availability?.join(', ') || ''
                });
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        if (!profile) return;

        const updatedData = {
            ...profile,
            name: formData.name,
            location: formData.location,
            category: parseInt(formData.category) || 8,
            gender: formData.gender as 'Masculino' | 'Femenino',
            avatar_url: formData.avatar_url,
            availability: formData.availability.split(',').map(s => s.trim()).filter(Boolean)
        };

        const success = await supabaseService.updateProfile(updatedData);
        if (success) {
            setProfile(updatedData);
            setIsEditing(false);
            await refreshProfile();
        } else {
            alert('Error al actualizar el perfil');
        }
    };

    if (!profile) return <div>Cargando perfil...</div>;

    return (
        <div className="space-y-6" >
            {/* Header / Edit Mode */}
            < div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary/20 to-secondary/20 border border-white/5 p-6" >
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-32 h-32 rounded-full bg-surface border-4 border-background overflow-hidden shrink-0">
                        <img
                            src={formData.avatar_url || profile.avatar_url || "https://ui-avatars.com/api/?name=User&background=random"}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-4 w-full">
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Nombre</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-background/50 border border-white/10 rounded px-3 py-2"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Ubicación</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full bg-background/50 border border-white/10 rounded px-3 py-2"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Categoría (Nro)</label>
                                    <input
                                        type="number"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-background/50 border border-white/10 rounded px-3 py-2"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Género</label>
                                    <select
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full bg-background/50 border border-white/10 rounded px-3 py-2 text-white"
                                    >
                                        <option value="">Seleccionar</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Femenino</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Disponibilidad (sep. por comas)</label>
                                    <input
                                        type="text"
                                        value={formData.availability}
                                        onChange={e => setFormData({ ...formData, availability: e.target.value })}
                                        className="w-full bg-background/50 border border-white/10 rounded px-3 py-2"
                                        placeholder="Ej: Mañanas, Fines de semana"
                                    />
                                </div>
                                <div className="col-span-full space-y-2">
                                    <label className="text-sm text-gray-400">Foto de Perfil</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file && profile) {
                                                    const url = await supabaseService.uploadProfileImage(profile.id, file);
                                                    if (url) {
                                                        setFormData({ ...formData, avatar_url: url });
                                                    } else {
                                                        alert('Error al subir la imagen. Asegúrate de que el bucket "avatars" exista en Supabase.');
                                                    }
                                                }
                                            }}
                                            className="w-full bg-background/50 border border-white/10 rounded px-3 py-2 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                        />
                                    </div>
                                    {formData.avatar_url && (
                                        <p className="text-xs text-green-400">Imagen cargada correctamente</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h1 className="text-3xl font-bold">{profile.name}</h1>
                                    <div className="flex items-center justify-center md:justify-start text-gray-400 gap-2 mt-1">
                                        <MapPin size={16} />
                                        {profile.location}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold">
                                        Categoría {profile.category}ra
                                    </span>
                                    {profile.gender && (
                                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">
                                            {profile.gender}
                                        </span>
                                    )}
                                    {profile.availability?.map(avail => (
                                        <span key={avail} className="px-3 py-1 rounded-full bg-white/10 text-sm">
                                            {avail}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2 self-start">
                        {isEditing ? (
                            <>
                                <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
                                <Button onClick={handleSave}>Guardar</Button>
                            </>
                        ) : (
                            <Button variant="secondary" icon={Edit} onClick={() => setIsEditing(true)}>
                                Editar Perfil
                            </Button>
                        )}
                    </div>
                </div>
            </div >

            {/* Recent Activity (Mock) - Kept as requested, stats removed */}
            < div className="card p-6" >
                <h3 className="font-bold mb-4">Actividad Reciente</h3>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <div>
                                <div className="font-bold">Partido Amistoso</div>
                                <div className="text-sm text-gray-400">vs. Club El Muro</div>
                            </div>
                            <div className="text-green-400 font-bold">Victoria</div>
                        </div>
                    ))}
                </div>
            </div >

            {/* Settings Section */}
            <div className="card p-6 space-y-4">
                <h3 className="font-bold">Configuración</h3>

                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSoundEnabled ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        </div>
                        <div>
                            <div className="font-medium">Sonidos de la App</div>
                            <div className="text-xs text-gray-400">Efectos para mensajes y alertas</div>
                        </div>
                    </div>
                    <button
                        onClick={toggleSound}
                        className={`w-12 h-6 rounded-full transition-colors relative ${isSoundEnabled ? 'bg-primary' : 'bg-gray-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSoundEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <button
                        onClick={() => {
                            if (window.confirm('¿Seguro que quieres cerrar sesión?')) {
                                logout();
                            }
                        }}
                        className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Cerrar Sesión
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-2">Versión 1.2.0 (PWA)</p>
                </div>
            </div>
        </div >
    );
}
