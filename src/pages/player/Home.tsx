import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Filter, UserPlus, MessageCircle, Heart } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabaseService } from '../../services/supabaseService';
import type { ClubProfile } from '../../types';
import { PadelRacket } from '../../components/PadelIcons';


export default function PlayerHome() {
    const navigate = useNavigate();

    const [clubs, setClubs] = useState<ClubProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);

    const fetchFavorites = async () => {
        const favs = await supabaseService.getFavoriteClubs();
        setFavorites(favs.map(f => f.id));
    };

    useEffect(() => {
        const fetchClubs = async () => {
            setLoading(true);
            const [data, favs] = await Promise.all([
                supabaseService.getClubs(),
                supabaseService.getFavoriteClubs()
            ]);
            setClubs(data);
            setFavorites(favs.map(f => f.id));
            setLoading(false);
        };
        fetchClubs();
    }, []);

    const toggleFavorite = async (e: React.MouseEvent, clubId: string) => {
        e.stopPropagation();
        // Optimistic update
        const isFav = favorites.includes(clubId);
        if (isFav) {
            setFavorites(prev => prev.filter(id => id !== clubId));
        } else {
            setFavorites(prev => [...prev, clubId]);
        }

        try {
            await supabaseService.toggleFavoriteClub(clubId);
            // Refresh real state in background? No need if optimistic works
        } catch (error) {
            // Revert
            console.error(error);
            if (isFav) setFavorites(prev => [...prev, clubId]);
            else setFavorites(prev => prev.filter(id => id !== clubId));
        }
    };

    const filteredClubs = clubs.filter(club =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const favoriteClubsList = clubs.filter(c => favorites.includes(c.id));

    return (
        <div className="space-y-8">
            {/* Hero / Search Section */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-surface to-background border border-white/5 p-4 md:p-6">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <PadelRacket size={150} className="w-24 h-24 md:w-[150px] md:h-[150px]" />
                </div>

                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-xl md:text-3xl font-bold mb-2">
                        Encuentra tu próxima cancha
                    </h1>
                    <p className="text-gray-400 mb-4 text-xs md:text-base">
                        Busca clubes por nombre, ciudad o zona y reserva al instante.
                    </p>

                    <div className="flex flex-col md:flex-row gap-2">
                        <Input
                            icon={Search}
                            placeholder="Buscar club..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-background/50 backdrop-blur-sm h-10 text-sm"
                        />
                        <Button variant="secondary" icon={Filter} className="w-full md:w-auto h-10 text-sm">
                            Filtros
                        </Button>
                    </div>
                </div>
            </div>

            {/* Favorites Section */}
            {favoriteClubsList.length > 0 && !searchTerm && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Heart className="text-red-500 fill-red-500" size={20} />
                        Tus Clubes Favoritos
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favoriteClubsList.map(club => (
                            <div key={club.id} className="card group hover:border-primary/50 transition-colors cursor-pointer relative"
                                onClick={() => navigate(`/player/club/${club.id}`)}>
                                {/* Reuse Card Design or Simplified? Reusing for consistency */}
                                <div className="h-40 -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-xl relative">
                                    <img
                                        src={club.avatar_url || club.photos[0]}
                                        alt={club.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button
                                            onClick={(e) => toggleFavorite(e, club.id)}
                                            className="bg-black/50 p-2 rounded-full hover:bg-black/70 backdrop-blur-sm transition-all hover:scale-110"
                                        >
                                            <Heart size={18} className="text-red-500 fill-red-500" />
                                        </button>
                                    </div>
                                    <div className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded-full ${(club.schedule?.open_days.includes(new Date().getDay()) ?? true) ? 'bg-green-500' : 'bg-red-500'
                                        }`}>
                                        {(club.schedule?.open_days.includes(new Date().getDay()) ?? true) ? 'Abierto' : 'Cerrado'}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-1">{club.name}</h3>
                                <div className="flex items-center text-gray-400 text-sm mb-3">
                                    <MapPin size={16} className="mr-1" />
                                    {club.location}
                                </div>
                                <Button className="w-full">Reservar</Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Clubs Grid */}
            <div>
                <h2 className="text-lg font-bold mb-4">Todos los Clubes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-8">
                    {loading ? (
                        <p className="text-gray-400">Cargando clubes...</p>
                    ) : filteredClubs.length > 0 ? (
                        filteredClubs.map(club => {
                            const today = new Date().getDay();
                            const isOpen = club.schedule?.open_days.includes(today) ?? true;
                            const isFav = favorites.includes(club.id);

                            return (
                                <div key={club.id} className="card group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/player/club/${club.id}`)}>
                                    <div className="h-40 -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-xl relative">
                                        <img
                                            src={club.avatar_url || club.photos[0]}
                                            alt={club.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-2 right-2 flex gap-2 z-10">
                                            <button
                                                onClick={(e) => toggleFavorite(e, club.id)}
                                                className="bg-black/50 p-2 rounded-full hover:bg-black/70 backdrop-blur-sm transition-all hover:scale-110"
                                            >
                                                <Heart size={18} className={isFav ? "text-red-500 fill-red-500" : "text-white"} />
                                            </button>
                                        </div>
                                        <div className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'
                                            }`}>
                                            {isOpen ? 'Abierto' : 'Cerrado'}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold mb-1">{club.name}</h3>

                                    <div className="flex items-center text-gray-400 text-sm mb-3">
                                        <MapPin size={16} className="mr-1" />
                                        {club.location}
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {club.services.slice(0, 3).map(service => (
                                            <span key={service} className="text-xs bg-white/5 px-2 py-1 rounded-md text-gray-300">
                                                {service}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button className="col-span-2" onClick={() => {
                                            navigate(`/player/club/${club.id}`);
                                        }}>
                                            Ver Disponibilidad
                                        </Button>
                                        <Button size="sm" icon={MessageCircle} className="bg-white text-black hover:bg-gray-200" onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/player/community?chatWith=${club.id}&name=${encodeURIComponent(club.name)}&avatar=${encodeURIComponent(club.avatar_url || '')}`);
                                        }}>
                                            Chat
                                        </Button>
                                        <Button variant="outline" size="sm" icon={UserPlus} onClick={async (e) => {
                                            e.stopPropagation();
                                            const success = await supabaseService.sendFriendRequest(club.id);
                                            if (success) {
                                                alert('Solicitud enviada');
                                            } else {
                                                alert('No se pudo enviar la solicitud. Verifique si ya existe o intente nuevamente.');
                                            }
                                        }}>
                                            Conectar
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            No se encontraron clubes con ese criterio.
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

