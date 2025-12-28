import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabaseService } from '../../services/supabaseService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Save, Plus, Trash2, Clock, MapPin, Edit2, Camera, Upload } from 'lucide-react';
import type { ClubProfile, Court, ClubSchedule } from '../../types';
import { CourtPriceEditor } from '../../components/club/CourtPriceEditor';

export default function ClubProfilePage() {
    const { user, refreshProfile } = useAuth();
    const [profile, setProfile] = useState<ClubProfile | null>(null);
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [schedule, setSchedule] = useState<ClubSchedule>({
        opening_time: '09:00',
        closing_time: '23:00',
        slot_duration: 60,
        open_days: [1, 2, 3, 4, 5, 6, 0]
    });
    const [services, setServices] = useState<string[]>([]);

    // New Court State
    const [showAddCourt, setShowAddCourt] = useState(false);
    const [newCourt, setNewCourt] = useState<Partial<Court>>({
        name: '',
        type: 'crystal',
        surface: 'synthetic',
        is_indoor: false,
        hourly_rate: 0
    });

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);

        // 1. Load Profile
        const profileData = await supabaseService.getProfile(user.id) as ClubProfile;
        if (profileData) {
            setProfile(profileData);
            setName(profileData.name || '');
            setLocation(profileData.location || '');
            setDescription(profileData.description || '');
            setAvatarUrl(profileData.avatar_url || null);
            if (profileData.schedule) {
                setSchedule(profileData.schedule);
            }
            if (profileData.services) {
                setServices(profileData.services);
            }
        }

        // 2. Load Courts
        const courtsData = await supabaseService.getClubCourts(user.id);
        setCourts(courtsData);

        setLoading(false);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const handleSaveProfile = async () => {
        if (!user || !profile) return;
        setSaving(true);

        let finalAvatarUrl = avatarUrl;

        if (selectedFile) {
            const uploadedUrl = await supabaseService.uploadProfileImage(user.id, selectedFile);
            if (uploadedUrl) {
                finalAvatarUrl = uploadedUrl;
            } else {
                alert('Error al subir la imagen. Se guardará el resto del perfil.');
            }
        }

        const updatedProfile: Partial<ClubProfile> = {
            id: user.id,
            name,
            location,
            description,
            schedule,
            services,
            avatar_url: finalAvatarUrl || undefined
        };

        const success = await supabaseService.updateClubProfile(updatedProfile);
        if (success) {
            alert('Perfil actualizado correctamente');
            // Update local state to reflect saved changes
            setAvatarUrl(finalAvatarUrl);
            setSelectedFile(null);
            setPreviewUrl(null);
            // Refresh global auth state to update sidebar
            await refreshProfile();
        } else {
            alert('Error al actualizar perfil');
        }
        setSaving(false);
    };

    const handleAddCourt = async () => {
        if (!user || !newCourt.name) return;

        const courtToAdd: Omit<Court, 'id'> = {
            club_id: user.id,
            name: newCourt.name,
            type: newCourt.type as 'crystal' | 'wall',
            surface: newCourt.surface as 'synthetic' | 'cement',
            is_indoor: newCourt.is_indoor || false,
            hourly_rate: newCourt.hourly_rate || 0
        };

        const success = await supabaseService.addCourt(courtToAdd);
        if (success) {
            setShowAddCourt(false);
            setNewCourt({ name: '', type: 'crystal', surface: 'synthetic', is_indoor: false, hourly_rate: 0 });
            loadData(); // Refresh list
        } else {
            alert('Error al agregar cancha');
        }
    };

    const handleDeleteCourt = async (courtId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta cancha?')) return;
        const success = await supabaseService.deleteCourt(courtId);
        if (success) {
            loadData();
        }
    };

    const handleUpdateCourtPrice = async (courtId: string, price: number) => {
        try {
            await supabaseService.updateCourt(courtId, { hourly_rate: price });
            // Optimistic update or reload
            setCourts(courts.map(c => c.id === courtId ? { ...c, hourly_rate: price } : c));
        } catch (error) {
            console.error('Error updating price:', error);
            alert('Error al actualizar el precio');
        }
    };

    const toggleDay = (day: number) => {
        const currentDays = schedule.open_days;
        if (currentDays.includes(day)) {
            setSchedule({ ...schedule, open_days: currentDays.filter(d => d !== day) });
        } else {
            setSchedule({ ...schedule, open_days: [...currentDays, day].sort() });
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando perfil...</div>;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Perfil del Club
                </h1>
                <Button icon={Save} onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>

            {/* Basic Info */}
            <div className="card p-6 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Edit2 size={20} className="text-primary" />
                    Información General
                </h2>

                {/* Profile Picture Upload */}
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-surface flex items-center justify-center">
                            {previewUrl || avatarUrl ? (
                                <img
                                    src={previewUrl || avatarUrl || ''}
                                    alt="Club Logo"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Camera size={32} className="text-gray-400" />
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                            <Upload size={20} className="text-white" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium text-lg">Logo del Club</h3>
                        <p className="text-sm text-gray-400">Sube una imagen representativa de tu club. Se recomienda formato cuadrado.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Cambiar Foto
                        </Button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Nombre del Club</label>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Ubicación</label>
                        <Input icon={MapPin} value={location} onChange={e => setLocation(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm text-gray-400 mb-1">Descripción</label>
                        <textarea
                            className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none min-h-[100px]"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Describe tu club..."
                        />
                    </div>
                </div>

                {/* Services */}
                <div className="pt-4 border-t border-white/10">
                    <label className="block text-sm text-gray-400 mb-3">Servicios Disponibles</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['Estacionamiento', 'Vestuarios', 'Bar', 'WiFi', 'Kiosco', 'Parrilla', 'Alquiler Palas'].map(service => (
                            <label key={service} className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${services.includes(service)
                                        ? 'bg-primary border-primary'
                                        : 'border-white/20 group-hover:border-white/40'
                                    }`}>
                                    {services.includes(service) && <div className="w-2 h-2 bg-black rounded-full" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={services.includes(service)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setServices([...services, service]);
                                        } else {
                                            setServices(services.filter(s => s !== service));
                                        }
                                    }}
                                />
                                <span className={`text-sm ${services.includes(service) ? 'text-white' : 'text-gray-400'}`}>
                                    {service}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Schedule */}
            <div className="card p-6 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Clock size={20} className="text-primary" />
                    Horarios y Turnos
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Apertura</label>
                        <Input type="time" value={schedule.opening_time} onChange={e => setSchedule({ ...schedule, opening_time: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Cierre</label>
                        <Input type="time" value={schedule.closing_time} onChange={e => setSchedule({ ...schedule, closing_time: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Duración Turno (min)</label>
                        <select
                            className="w-full bg-surface border border-white/10 rounded-xl p-3 text-gray-300 focus:bg-white focus:text-black focus:border-primary focus:outline-none transition-colors"
                            value={schedule.slot_duration}
                            onChange={e => setSchedule({ ...schedule, slot_duration: Number(e.target.value) })}
                        >
                            <option value={60} className="text-black bg-white">60 minutos</option>
                            <option value={90} className="text-black bg-white">90 minutos</option>
                            <option value={120} className="text-black bg-white">120 minutos</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-2">Días Abierto</label>
                    <div className="flex gap-2 flex-wrap">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
                            <button
                                key={day}
                                onClick={() => toggleDay(index)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${schedule.open_days.includes(index)
                                    ? 'bg-primary text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Courts */}
            <div className="card p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <MapPin size={20} className="text-primary" />
                        Canchas ({courts.length})
                    </h2>
                    <Button size="sm" icon={Plus} onClick={() => setShowAddCourt(true)}>Nueva Cancha</Button>
                </div>

                {showAddCourt && (
                    <div className="bg-white/5 p-4 rounded-xl space-y-4 border border-primary/30">
                        <h3 className="font-bold">Agregar Cancha</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Input
                                placeholder="Nombre (ej: Cancha 1)"
                                value={newCourt.name}
                                onChange={e => setNewCourt({ ...newCourt, name: e.target.value })}
                            />
                            <select
                                className="bg-surface border border-white/10 rounded-xl p-3 text-gray-300 focus:bg-white focus:text-black focus:border-primary focus:outline-none transition-colors"
                                value={newCourt.type}
                                onChange={e => setNewCourt({ ...newCourt, type: e.target.value as any })}
                            >
                                <option value="crystal" className="text-black bg-white">Cristal</option>
                                <option value="wall" className="text-black bg-white">Pared</option>
                            </select>
                            <select
                                className="bg-surface border border-white/10 rounded-xl p-3 text-gray-300 focus:bg-white focus:text-black focus:border-primary focus:outline-none transition-colors"
                                value={newCourt.surface}
                                onChange={e => setNewCourt({ ...newCourt, surface: e.target.value as any })}
                            >
                                <option value="synthetic" className="text-black bg-white">Césped Sintético</option>
                                <option value="cement" className="text-black bg-white">Cemento</option>
                            </select>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="indoor"
                                    checked={newCourt.is_indoor}
                                    onChange={e => setNewCourt({ ...newCourt, is_indoor: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary"
                                />
                                <label htmlFor="indoor">Techada (Indoor)</label>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Precio por Turno</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={newCourt.hourly_rate}
                                    onChange={e => setNewCourt({ ...newCourt, hourly_rate: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setShowAddCourt(false)}>Cancelar</Button>
                            <Button size="sm" onClick={handleAddCourt}>Guardar Cancha</Button>
                        </div>
                    </div>
                )}

                <div className="grid gap-3">
                    {courts.map(court => (
                        <div key={court.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-colors">
                            <div>
                                <h3 className="font-bold text-lg">{court.name}</h3>
                                <div className="flex gap-2 text-sm text-gray-400 mt-1">
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{court.type === 'crystal' ? 'Cristal' : 'Pared'}</span>
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{court.surface === 'synthetic' ? 'Sintético' : 'Cemento'}</span>
                                    {court.is_indoor && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">Indoor</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <CourtPriceEditor
                                    courtId={court.id}
                                    initialPrice={court.hourly_rate || 0}
                                    onSave={handleUpdateCourtPrice}
                                />
                                <Button variant="outline" size="sm" icon={Trash2} className="text-red-400 hover:text-red-500 hover:bg-red-500/10 border-red-500/20" onClick={() => handleDeleteCourt(court.id)}>
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    ))}
                    {courts.length === 0 && !showAddCourt && (
                        <p className="text-center text-gray-500 py-4">No has agregado canchas todavía.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
