import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar, Users, Search, MapPin } from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import type { Tournament, PlayerProfile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function PlayerTournaments() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [partnerEmail, setPartnerEmail] = useState('');
    const [partner, setPartner] = useState<PlayerProfile | null>(null);
    const [searchingPartner, setSearchingPartner] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState<{ [key: string]: string }>({}); // tournamentId -> status

    useEffect(() => {
        loadTournaments();
    }, []);

    const loadTournaments = async () => {
        try {
            const data = await supabaseService.getTournaments();
            setTournaments(data);
        } catch (error) {
            console.error('Error loading tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchPartner = async () => {
        if (!partnerEmail) return;
        setSearchingPartner(true);
        try {
            const players = await supabaseService.searchPlayers(partnerEmail);
            // Exact match for email (simulated by checking name/location in searchPlayers, but ideally by email)
            // Since searchPlayers searches by name/location, let's assume the user searches by name for now or we improve search
            // For now, let's just take the first result if any
            if (players.length > 0) {
                setPartner(players[0]);
            } else {
                alert('Jugador no encontrado');
                setPartner(null);
            }
        } catch (error) {
            console.error('Error searching partner:', error);
        } finally {
            setSearchingPartner(false);
        }
    };

    const handleRegister = async () => {
        if (!selectedTournament || !user || !partner) return;

        try {
            const teamName = `${user.name} & ${partner.name}`;
            await supabaseService.registerTeam({
                tournament_id: selectedTournament.id,
                team_name: teamName,
                player1_id: user.id,
                player2_id: partner.id,
                status: 'pending'
            });

            setRegistrationStatus(prev => ({ ...prev, [selectedTournament.id]: 'sent' }));
            showToast('Solicitud de inscripción enviada correctamente', 'success');
            setShowRegisterModal(false);
            setPartnerEmail('');
            setPartner(null);
        } catch (error) {
            console.error('Error registering team:', error);
            showToast('Error al enviar la solicitud', 'error');
        }
    };

    const openRegisterModal = (tournament: Tournament) => {
        setSelectedTournament(tournament);
        setShowRegisterModal(true);
    };

    if (loading) return <div className="p-8 text-center">Cargando torneos...</div>;

    return (
        <div className="space-y-6 pb-20">
            <header>
                <h1 className="text-2xl font-bold mb-2">Torneos Disponibles</h1>
                <p className="text-gray-400">Inscríbete en los próximos campeonatos</p>
            </header>

            <div className="grid gap-4">
                {tournaments.length === 0 ? (
                    <div className="text-center py-10 bg-surface rounded-2xl border border-white/5">
                        <Trophy className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                        <p className="text-gray-400">No hay torneos abiertos en este momento</p>
                    </div>
                ) : (
                    tournaments.map((tournament) => (
                        <div key={tournament.id} className="bg-surface border border-white/10 rounded-2xl p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-xs text-primary font-bold uppercase mb-1 flex items-center gap-1">
                                        <MapPin size={10} />
                                        {tournament.club_name || 'Club'}
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">{tournament.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Calendar size={14} />
                                        <span>
                                            {format(new Date(tournament.start_date), "d MMM", { locale: es })} - {format(new Date(tournament.end_date), "d MMM", { locale: es })}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {tournament.category}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Users size={16} />
                                    <span>Cupo: {tournament.max_teams} parejas</span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => openRegisterModal(tournament)}
                                    disabled={registrationStatus[tournament.id] === 'sent'}
                                >
                                    {registrationStatus[tournament.id] === 'sent' ? 'Enviado' : 'Inscribirse'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => navigate(`/player/tournaments/${tournament.id}`)}
                                >
                                    Ver Resultados
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Registration Modal */}
            {showRegisterModal && selectedTournament && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">Inscripción al Torneo</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Estás por inscribirte a <span className="text-white font-bold">{selectedTournament.name}</span>.
                            Necesitas seleccionar a tu compañero.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Buscar Compañero (Nombre)</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ej: Juan Perez"
                                        value={partnerEmail}
                                        onChange={(e) => setPartnerEmail(e.target.value)}
                                    />
                                    <Button onClick={handleSearchPartner} isLoading={searchingPartner} variant="secondary">
                                        <Search size={18} />
                                    </Button>
                                </div>
                            </div>

                            {partner && (
                                <div className="bg-white/5 p-3 rounded-xl flex items-center gap-3 border border-primary/30">
                                    <div className="h-10 w-10 rounded-full bg-gray-700 overflow-hidden">
                                        {partner.avatar_url ? (
                                            <img src={partner.avatar_url} alt={partner.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-white font-bold">
                                                {partner.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{partner.name}</p>
                                        <p className="text-xs text-gray-400">{partner.category} • {partner.location}</p>
                                    </div>
                                    <div className="ml-auto text-primary">
                                        <Users size={18} />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowRegisterModal(false);
                                        setPartner(null);
                                        setPartnerEmail('');
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1"
                                    disabled={!partner}
                                    onClick={handleRegister}
                                >
                                    Confirmar Inscripción
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
