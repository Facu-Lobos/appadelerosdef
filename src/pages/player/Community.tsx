import { useState, useEffect, useMemo } from 'react';
import { Search, UserPlus, MessageCircle, UserCheck, Loader2, Users, Calendar, MapPin, Plus, Trophy, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabaseService } from '../../services/supabaseService';
import { matchService } from '../../services/matchService';
import type { PlayerProfile, MatchRequest, MatchApplication } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import ChatWindow from '../../components/ChatWindow';
import { useCommunityRealtime } from '../../hooks/useCommunityRealtime';

import { useSearchParams } from 'react-router-dom';

export default function PlayerCommunity() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams(); // Deep linking support
    const [activeTab, setActiveTab] = useState<'players' | 'matches'>('players');

    // --- Data States ---
    const [searchTerm, setSearchTerm] = useState('');
    const [players, setPlayers] = useState<PlayerProfile[]>([]);
    const [myFriends, setMyFriends] = useState<PlayerProfile[]>([]);
    const [recommendedPlayers, setRecommendedPlayers] = useState<PlayerProfile[]>([]);
    const [matches, setMatches] = useState<(MatchRequest & { myApplication?: MatchApplication })[]>([]);
    const [loading, setLoading] = useState(false);

    // --- Social States ---
    const [sentRequests, setSentRequests] = useState<string[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<string[]>([]);
    const [activeChat, setActiveChat] = useState<{ id: string, name: string, avatar?: string } | null>(null);

    // --- Forms & Modals ---
    const [showCreateMatch, setShowCreateMatch] = useState(false);
    const [showManageMatch, setShowManageMatch] = useState<MatchRequest | null>(null);
    const [matchApplications, setMatchApplications] = useState<MatchApplication[]>([]);
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

        // Load Full Friend Profiles
        const friendsData = await supabaseService.getFriendsProfiles();
        setMyFriends(friendsData);

        await loadMatches();

        // Load Recommendations (Client-side trigger for now)
        const currentUserProfile = await supabaseService.getProfile(user.id) as PlayerProfile;
        if (currentUserProfile) {
            const similar = await matchService.getSimilarPlayers(currentUserProfile);
            // Filter out friends from recommendations
            setRecommendedPlayers(similar.filter(p => !friendIds.includes(p.id)));
        }
    };

    const loadMatches = async () => {
        if (!user) return;
        const openMatches = await matchService.getOpenMatches();

        const matchesWithStatus = openMatches.map((m: any) => {
            const myApp = m.applications?.find((a: any) => a.player_id === user.id);
            return { ...m, myApplication: myApp };
        });

        setMatches(matchesWithStatus);
    };

    // Calculate My Match Ids for Realtime Filter
    const myMatchIds = useMemo(() => {
        return matches.filter(m => m.player_id === user?.id).map(m => m.id);
    }, [matches, user]);

    // --- Realtime Integration ---
    useCommunityRealtime({
        user: user as PlayerProfile,
        myMatchIds,
        onFriendRequestReceived: async () => {
            // Reload pending requests
            const received = await supabaseService.getPendingFriendRequests();
            setPendingRequests(received);
        },
        onFriendRequestAccepted: async () => {
            // Reload friends list and refresh UI
            const friendIds = await supabaseService.getFriends();
            setFriends(friendIds);
            const sent = await supabaseService.getSentFriendRequests();
            setSentRequests(sent);
            loadData();
        },
        onMatchApplicationReceived: async () => {
            // If managing, refresh application list
            if (showManageMatch) {
                const apps = await matchService.getMatchApplications(showManageMatch.id);
                setMatchApplications(apps);
            }
            // Refresh main match list anyway (to update counters if visualized)
            loadMatches();
        },
        onMatchApplicationUpdated: () => {
            loadMatches(); // Refresh to see updated status
        },
        onMessageReceived: () => {
            // Optional: Update unread indicators if they existed
        }
    });

    const handleSearch = async () => {
        setLoading(true);
        const results = await supabaseService.searchPlayers(searchTerm);
        const filtered = results.filter(p => p.id !== user?.id);
        setPlayers(filtered);
        setLoading(false);
    };

    // --- Match Actions ---

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
            loadMatches();
            setNewMatch({ date: '', time: '', category: '6ta', location: '', description: '', players_needed: 1 });
        } catch (error) {
            console.error(error);
            showToast('Error al publicar', 'error');
        }
    };

    const handleApply = async (matchId: string) => {
        if (!user) return;
        try {
            await matchService.applyToMatch(matchId, user.id);
            showToast('Solicitud enviada', 'success');
            loadMatches();
        } catch (error) {
            console.error(error);
            showToast('Error al unirse', 'error');
        }
    };

    const handleManage = async (match: MatchRequest) => {
        setShowManageMatch(match);
        const apps = await matchService.getMatchApplications(match.id);
        setMatchApplications(apps);
    };

    const handleRespondApplication = async (appId: string, status: 'accepted' | 'rejected') => {
        if (!showManageMatch) return;
        try {
            await matchService.respondToApplication(appId, showManageMatch.id, status);
            showToast(`Solicitud ${status === 'accepted' ? 'aceptada' : 'rechazada'}`, 'success');

            // Refresh applications list
            const apps = await matchService.getMatchApplications(showManageMatch.id);
            setMatchApplications(apps);

            // Refresh matches (to update player count)
            loadMatches();

            if (status === 'accepted') {
                // Check local state or just refresh
            }
        } catch (error) {
            console.error(error);
            showToast('Error al responder', 'error');
        }
    };

    // Initial load & Deep Link Handling
    useEffect(() => {
        handleSearch();
        loadData();

        // Handle Deep Link for Chat
        const chatWithId = searchParams.get('chatWith');
        if (chatWithId && user) {
            // Fetch profile to open chat
            const fetchChatUser = async () => {
                const profile = await supabaseService.getProfile(chatWithId);
                if (profile) {
                    setActiveChat({
                        id: profile.id,
                        name: profile.name,
                        avatar: profile.avatar_url
                    });
                    // Clean URL
                    setSearchParams({});
                }
            };
            fetchChatUser();
        }
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

                    {/* My Friends Section */}
                    {myFriends.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Users size={16} /> Mis Amigos ({myFriends.length})
                            </h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {myFriends.map(friend => (
                                    <div key={friend.id} className="min-w-[150px] bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col items-center gap-2 relative group">
                                        <div className="w-16 h-16 rounded-full bg-surface border-2 border-white/10 overflow-hidden">
                                            <img src={friend.avatar_url || "https://ui-avatars.com/api/?name=User&background=random"} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-sm truncate w-full">{friend.name}</p>
                                            <p className="text-xs text-gray-500">Cat. {friend.category}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            icon={MessageCircle}
                                            className="w-full text-xs h-7 bg-transparent border border-white text-white hover:bg-white/10 hover:border-white"
                                            onClick={() => setActiveChat({ id: friend.id, name: friend.name, avatar: friend.avatar_url })}
                                        >
                                            Chat
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {recommendedPlayers.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Sugeridos para ti</h3>
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
                        ) : matches.map(match => {
                            const isCreator = match.player_id === user?.id;
                            const myStatus = match.myApplication?.status;

                            return (
                                <div key={match.id} className="card p-4 flex flex-col md:flex-row justify-between gap-4 md:items-center hover:border-primary/30 transition-colors">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                                                {match.player?.avatar_url && <img src={match.player.avatar_url} className="w-full h-full object-cover" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white flex items-center gap-2">
                                                    {match.player?.name || 'Jugador'}
                                                    {isCreator && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">TÚ</span>}
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    Busca <span className="text-primary font-bold">{match.players_needed}</span> jugador{match.players_needed > 1 ? 'es' : ''}
                                                </p>
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

                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => match.player && setActiveChat({ id: match.player.id, name: match.player.name })}
                                        >
                                            Chat
                                        </Button>

                                        {isCreator ? (
                                            <Button size="sm" onClick={() => handleManage(match)}>
                                                Administrar
                                            </Button>
                                        ) : (
                                            <>
                                                {myStatus === 'accepted' ? (
                                                    <Button size="sm" variant="outline" className="text-green-400 border-green-500/20 bg-green-500/10 cursor-default">
                                                        <CheckCircle size={16} className="mr-2" /> ¡Aceptado!
                                                    </Button>
                                                ) : myStatus === 'pending' ? (
                                                    <Button size="sm" variant="outline" disabled>
                                                        Pendiente...
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" onClick={() => handleApply(match.id)}>
                                                        Unirme
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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

            {/* Manage Match Modal */}
            <Modal isOpen={!!showManageMatch} onClose={() => setShowManageMatch(null)} title="Gestionar Postulantes">
                <div className="space-y-4">
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 mb-4">
                        <p className="text-sm text-gray-400">Jugadores faltantes:</p>
                        <p className="text-2xl font-bold text-primary">{showManageMatch?.players_needed}</p>
                    </div>

                    <h3 className="font-bold text-white">Solicitudes ({matchApplications.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {matchApplications.length === 0 && <p className="text-sm text-gray-500">Aún no hay solicitudes.</p>}

                        {matchApplications.map(app => (
                            <div key={app.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                                        <img src={app.player?.avatar_url || "https://ui-avatars.com/api/?name=User&background=random"} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{app.player?.name || 'Jugador'}</p>
                                        <p className="text-xs text-gray-400">Cat. {app.player?.category || '?'}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {app.status === 'pending' ? (
                                        <>
                                            <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleRespondApplication(app.id, 'accepted')}>Aceptar</Button>
                                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-red-400 hover:text-red-300" onClick={() => handleRespondApplication(app.id, 'rejected')}>Rechazar</Button>
                                        </>
                                    ) : (
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${app.status === 'accepted' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                            {app.status === 'accepted' ? 'Aceptado' : 'Rechazado'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
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
        <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3 overflow-hidden w-full">
                <div className="w-12 h-12 rounded-full bg-surface border-2 border-white/10 overflow-hidden shrink-0 aspect-square">
                    <img
                        src={player.avatar_url || "https://ui-avatars.com/api/?name=User&background=random"}
                        alt={player.name}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-bold truncate">{player.name}</h3>
                    <p className="text-sm text-gray-400 truncate">
                        {player.category ? `Cat. ${player.category}` : 'Sin cat.'} • {player.location || 'Sin ubicación'}
                    </p>
                </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button
                    size="sm"
                    icon={MessageCircle}
                    className="flex-1 sm:flex-none bg-transparent border border-white text-white hover:bg-white/10 hover:border-white justify-center"
                    onClick={onChat}
                >
                    Chat
                </Button>
                {isFriend ? (
                    <div className="flex-1 sm:flex-none px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-green-500/20">
                        <UserCheck size={16} /> <span className="sm:hidden">Amigos</span>
                    </div>
                ) : isSent ? (
                    <Button size="sm" variant="outline" className="flex-1 sm:flex-none justify-center" disabled>Enviada</Button>
                ) : (
                    <Button size="sm" variant="outline" icon={UserPlus} className="flex-1 sm:flex-none justify-center" onClick={onAdd}>Add</Button>
                )}
            </div>
        </div>
    );
}
