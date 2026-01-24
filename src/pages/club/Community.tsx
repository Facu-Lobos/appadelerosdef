import { useState, useEffect } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabaseService } from '../../services/supabaseService';
import type { PlayerProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import ChatWindow from '../../components/ChatWindow';

export default function ClubCommunity() {
    const [searchTerm, setSearchTerm] = useState('');
    const [players, setPlayers] = useState<PlayerProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<{ id: string, name: string, avatar?: string } | null>(null);
    const { user } = useAuth();

    const loadData = async () => {
        if (!user) return;

        // Load received requests
        const received = await supabaseService.getPendingFriendRequests();
        setPendingRequests(received);
    };

    const handleSearch = async () => {
        setLoading(true);
        const results = await supabaseService.searchPlayers(searchTerm);
        setPlayers(results);
        setLoading(false);
    };

    // Initial load
    useEffect(() => {
        handleSearch();
        loadData();
    }, [user]);

    // Check for query params (Notifications)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const chatWith = params.get('chatWith');
        const name = params.get('name');
        const avatar = params.get('avatar');

        if (chatWith) {
            setActiveChat({
                id: chatWith,
                name: name || 'Usuario',
                avatar: avatar || undefined
            });
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [window.location.search]);

    const handleRespond = async (requestId: string, status: 'accepted' | 'rejected') => {
        const success = await supabaseService.respondToFriendRequest(requestId, status);
        if (success) {
            setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
        }
    };

    const handleChat = (player: PlayerProfile) => {
        setActiveChat({
            id: player.id,
            name: player.name,
            avatar: player.avatar_url
        });
    };

    return (
        <div className="space-y-6 relative">
            <h1 className="text-2xl font-bold">Comunidad del Club</h1>

            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
                <div className="card p-6 border-l-4 border-primary">
                    <h2 className="text-lg font-bold mb-4">Solicitudes de Jugadores</h2>
                    <div className="space-y-3">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-surface border border-white/10 overflow-hidden">
                                        <img
                                            src={req.profiles?.avatar_url || "https://ui-avatars.com/api/?name=User&background=random"}
                                            alt={req.profiles?.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="font-medium">{req.profiles?.name || 'Usuario'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => handleRespond(req.id, 'accepted')}>Aceptar</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleRespond(req.id, 'rejected')}>Rechazar</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">Buscar Jugadores</h2>
                <div className="flex gap-2">
                    <Input
                        icon={Search}
                        placeholder="Nombre del jugador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? 'Buscando...' : 'Buscar'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                {players.map(player => (
                    <div key={player.id} className="card flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-surface border-2 border-white/10 overflow-hidden">
                                <img
                                    src={player.avatar_url || "https://ui-avatars.com/api/?name=User&background=random"}
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
                            <Button size="sm" variant="secondary" icon={MessageCircle} onClick={() => handleChat(player)}>Chat</Button>
                        </div>
                    </div>
                ))}
                {players.length === 0 && !loading && (
                    <div className="text-center text-gray-400 py-8">
                        No se encontraron jugadores.
                    </div>
                )}
            </div>

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
