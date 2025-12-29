import { useState, useEffect } from 'react';
import { Search, UserPlus, MessageCircle, UserCheck, Loader2, Users, Calendar, MapPin, Plus, Trophy } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabaseService } from '../../services/supabaseService';
import { matchService } from '../../services/matchService';
import type { PlayerProfile, MatchRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import ChatWindow from '../../components/ChatWindow';

export default function PlayerCommunity() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'players' | 'matches'>('players');

    // --- Data States ---
    const [searchTerm, setSearchTerm] = useState('');
    const [players, setPlayers] = useState<PlayerProfile[]>([]);
    const [recommendedPlayers, setRecommendedPlayers] = useState<PlayerProfile[]>([]);
    const [dateFilter, setDateFilter] = useState('');
    const [matches, setMatches] = useState<MatchRequest[]>([]);
    const [loading, setLoading] = useState(false);

    // --- Social States ---
    const [sentRequests, setSentRequests] = useState<string[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<string[]>([]);
    const [activeChat, setActiveChat] = useState<{ id: string, name: string, avatar?: string } | null>(null);

    // --- Forms ---
    const [showCreateMatch, setShowCreateMatch] = useState(false);
    const [newMatch, setNewMatch] = useState({
        date: '',
        time: '',
        category: '6ta',
        location: '',
        description: '',
        players_needed: 1
    });

    const loadData = async () => {
        if (!user) return;

        // Load Friends & Requests
        const sent = await supabaseService.getSentFriendRequests();
        setSentRequests(sent);
        const received = await supabaseService.getPendingFriendRequests();
        setPendingRequests(received);
        const friendIds = await supabaseService.getFriends();
        setFriends(friendIds);

        // Load Matches
        const openMatches = await matchService.getOpenMatches();
        setMatches(openMatches);

        // Load Recommendations (Client-side trigger for now)
        const currentUserProfile = await supabaseService.getProfile(user.id) as PlayerProfile;
        if (currentUserProfile) {
            const similar = await matchService.getSimilarPlayers(currentUserProfile);
            setRecommendedPlayers(similar);
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        const results = await supabaseService.searchPlayers(searchTerm);
        const filtered = results.filter(p => p.id !== user?.id);
        setPlayers(filtered);
        setLoading(false);
    };

    const handleCreateMatch = async () => {
        if (!newMatch.date || !newMatch.location) {
            showToast('Completa fecha y ubicación', 'error');
            return;
        }
        if (!user) return;

        try {
            await matchService.createMatchRequest({
                player_id: user.id,
                date: newMatch.date,
                time: newMatch.time,
                category: newMatch.category,
                location: newMatch.location,
                description: newMatch.description,
                players_needed: newMatch.players_needed
            });
            showToast('Búsqueda publicada con éxito', 'success');
            setShowCreateMatch(false);
            // Refresh
            const openMatches = await matchService.getOpenMatches();
            setMatches(openMatches);
            // Reset form
            setNewMatch({ date: '', time: '', category: '6ta', location: '', description: '', players_needed: 1 });
        } catch (error) {
            console.error(error);
            showToast('Error al publicar', 'error');
        }
    };

    // Initial load
    useEffect(() => {
        handleSearch();
        loadData();
    }, [user]);

    // Handlers
    const handleAddFriend = async (userId: string) => {
        const success = await supabaseService.sendFriendRequest(userId);
        if (success) {
            setSentRequests([...sentRequests, userId]);
            showToast('Solicitud enviada', 'success');
        }
    };

    const handleRespond = async (requestId: string, status: 'accepted' | 'rejected') => {
        const success = await supabaseService.respondToFriendRequest(requestId, status);
        if (success) {
            setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
            showToast(`Solicitud ${status === 'accepted' ? 'aceptada' : 'rechazada'}`, 'success');
            if (status === 'accepted') loadData();
        }
    };

    return (
        <div className="space-y-6 relative pb-20">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Comunidad & Partidos
            </h1>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('players')}
                    className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'players' ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Users size={18} />
                        Jugadores
                    </div>
                    {activeTab === 'players' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                </button>
                <button
                    onClick={() => setActiveTab('matches')}
                    className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'matches' ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Trophy size={18} />
                        Buscador de Partidos
                    </div>
                    {activeTab === 'matches' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                </button>
            </div>

            {/* Notification Area (Requests) */}
            {pendingRequests.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                        <UserPlus size={16} /> Solicitudes Pendientes
                    </h3>
                    {pendingRequests.map(req => (
                        <div key={req.id} className="flex justify-between items-center bg-dark-secondary p-2 rounded-lg">
                            <span className="text-sm">{req.profiles?.name} quiere conectar</span>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleRespond(req.id, 'accepted')}>Aceptar</Button>
                                <Button size="sm" variant="ghost" onClick={() => handleRespond(req.id, 'rejected')}>X</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* PLAYERS TAB */}
            {activeTab === 'players' && (
                <div className="space-y-6">
                    {/* Search */}
                    <div className="card p-4 space-y-4">
                        <div className="flex gap-2">
                            <Input
                                icon={Search}
                                placeholder="Buscar por nombre, zona..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Button onClick={handleSearch} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : 'Buscar'}
                            </Button>
                        </div>
                    </div>

                    {/* Recommendations */}
                    {recommendedPlayers.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Sugeridos para ti ({user?.role === 'player' ? 'Mismo Nivel' : ''})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {recommendedPlayers.map(player => (
                                    <PlayerCard
                                        key={player.id}
                                        player={player}
                                        isFriend={friends.includes(player.id)}
                                        isSent={sentRequests.includes(player.id)}
                                        onAdd={() => handleAddFriend(player.id)}
                                        onChat={() => setActiveChat({ id: player.id, name: player.name, avatar: player.avatar_url })}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    <div className="grid gap-4">
                        {players.map(player => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                isFriend={friends.includes(player.id)}
                                isSent={sentRequests.includes(player.id)}
                                onAdd={() => handleAddFriend(player.id)}
                                onChat={() => setActiveChat({ id: player.id, name: player.name, avatar: player.avatar_url })}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* MATCHES TAB */}
            {activeTab === 'matches' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-gradient-to-r from-surface to-dark-secondary p-6 rounded-2xl border border-white/5">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">¿Te falta uno?</h2>
                            <p className="text-sm text-gray-400">Publica tu partido y encuentra compañero.</p>
                        </div>
                        <Button icon={Plus} onClick={() => setShowCreateMatch(true)}>
                            Publicar
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {matches.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No hay búsquedas activas. ¡Sé el primero!
                            </div>
                        ) : matches.map(match => (
                            <div key={match.id} className="card p-4 flex flex-col md:flex-row justify-between gap-4 md:items-center hover:border-primary/30 transition-colors">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                                            {match.player?.avatar_url && <img src={match.player.avatar_url} className="w-full h-full object-cover" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{match.player?.name || 'Jugador'}</p>
                                            <p className="text-xs text-primary font-medium">Busca {match.players_needed} jugador{match.players_needed > 1 ? 'es' : ''}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-sm text-gray-300">
                                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                            <Calendar size={14} className="text-gray-500" />
                                            {new Date(match.date).toLocaleDateString()} {match.time && `• ${match.time}hs`}
                                        </div>
                                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                            <Trophy size={14} className="text-gray-500" />
                                            Cat. {match.category}
                                        </div>
                                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                            <MapPin size={14} className="text-gray-500" />
                                            {match.location || 'Zona a definir'}
                                        </div>
                                    </div>
                                    {match.description && <p className="text-sm text-gray-400 italic">"{match.description}"</p>}
                                </div>

                                <Button
                                    size="sm"
                                    onClick={() => match.player && setActiveChat({ id: match.player.id, name: match.player.name })}
                                >
                                    Contactar
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Match Modal */}
            <Modal isOpen={showCreateMatch} onClose={() => setShowCreateMatch(false)} title="Publicar Búsqueda">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Fecha</label>
                            <Input type="date" value={newMatch.date} onChange={e => setNewMatch({ ...newMatch, date: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Hora (Opcional)</label>
                            <Input type="time" value={newMatch.time} onChange={e => setNewMatch({ ...newMatch, time: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Ubicación / Club</label>
                        <Input placeholder="Ej: Club Central / Zona Norte" value={newMatch.location} onChange={e => setNewMatch({ ...newMatch, location: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Categoría</label>
                            <select
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white"
                                value={newMatch.category}
                                onChange={e => setNewMatch({ ...newMatch, category: e.target.value })}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(c => <option key={c} value={`${c}ta`}>{c}ta</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Faltan</label>
                            <select
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white"
                                value={newMatch.players_needed}
                                onChange={e => setNewMatch({ ...newMatch, players_needed: Number(e.target.value) })}
                            >
                                <option value={1}>1 Jugador</option>
                                <option value={2}>2 Jugadores</option>
                                <option value={3}>3 Jugadores</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Nota adicional</label>
                        <Input placeholder="Ej: Nivel intermedio real, ya tenemos cancha" value={newMatch.description} onChange={e => setNewMatch({ ...newMatch, description: e.target.value })} />
                    </div>
                    <Button className="w-full mt-4" onClick={handleCreateMatch}>Publicar</Button>
                </div>
            </Modal>

            {/* Chat Window */}
            {activeChat && (
                <ChatWindow
                    otherUserId={activeChat.id}
                    otherUserName={activeChat.name}
                    otherUserAvatar={activeChat.avatar}
                    onClose={() => setActiveChat(null)}
                />
            )}
        </div>
    );
}

// Sub-component for Cleaner Code
function PlayerCard({ player, isFriend, isSent, onAdd, onChat }: { player: PlayerProfile, isFriend: boolean, isSent: boolean, onAdd: () => void, onChat: () => void }) {
    return (
        <div className="card flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface border-2 border-white/10 overflow-hidden shrink-0 aspect-square">
                    <img
                        src={player.avatar_url || "https://via.placeholder.com/150"}
                        alt={player.name}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div>
                    <h3 className="font-bold">{player.name}</h3>
                    <p className="text-sm text-gray-400">
                        {player.category ? `Categoría ${player.category}` : 'Sin categoría'} • {player.location || 'Sin ubicación'}
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={MessageCircle} onClick={onChat}>Chat</Button>
                {isFriend ? (
                    <div className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm font-medium flex items-center gap-2 border border-green-500/20">
                        <UserCheck size={16} />
                    </div>
                ) : isSent ? (
                    <Button size="sm" variant="outline" disabled>Enviada</Button>
                ) : (
                    <Button size="sm" variant="outline" icon={UserPlus} onClick={onAdd}>Agregar</Button>
                )}
            </div>
        </div>
    );
}
