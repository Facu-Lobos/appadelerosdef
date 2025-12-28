import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trophy, Calendar, Users, ChevronLeft, Check, X, RefreshCw, Trash2, Clock, MapPin, Loader2, Share2 } from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import type { Tournament } from '../../types';
import { Button } from '../../components/ui/Button';
import { MatchScoreModal } from '../../components/MatchScoreModal';
import { MatchScheduleModal } from '../../components/MatchScheduleModal';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TournamentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'registrations' | 'groups' | 'playoffs'>('registrations');

    // Data State
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);

    // Manual Registration State
    const [manualPlayer1, setManualPlayer1] = useState('');
    const [manualPlayer2, setManualPlayer2] = useState('');

    // Match Score Modal State
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

    // Match Schedule Modal State
    const [selectedMatchForSchedule, setSelectedMatchForSchedule] = useState<any>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    useEffect(() => {
        if (id) {
            loadTournamentData(id);
        }
    }, [id]);

    const loadTournamentData = async (tournamentId: string) => {
        try {
            setLoading(true);
            const user = await supabaseService.getCurrentUser();
            if (!user) return;

            const tournaments = await supabaseService.getTournaments(user.id);
            const found = tournaments.find(t => t.id === tournamentId);

            if (found) {
                setTournament(found);
                await loadRegistrations(tournamentId);
            } else {
                console.error('Tournament not found');
                navigate('/club/tournaments');
            }
        } catch (error) {
            console.error('Error loading tournament:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRegistrations = async (tournamentId: string) => {
        try {
            const data = await supabaseService.getTournamentRegistrations(tournamentId);
            setRegistrations(data);

            const matchData = await supabaseService.getTournamentMatches(tournamentId);
            setMatches(matchData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleGenerateFixture = async () => {
        if (!tournament) return;
        if (registrations.length < 3) {
            alert('Se necesitan al menos 3 equipos para generar la fase de grupos.');
            return;
        }

        try {
            setIsGenerating(true);
            await supabaseService.generateGroupStage(tournament.id);
            showToast('Fase de grupos generada correctamente!', 'success');
            loadRegistrations(tournament.id);
            setActiveTab('groups');
        } catch (error: any) {
            console.error('Error generating fixture:', error);
            showToast('Error al generar fixture: ' + error.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleResetFixture = async () => {
        if (!tournament) return;
        if (!confirm('¿Estás seguro de que quieres reiniciar la fase de grupos? Se borrarán todos los partidos y resultados.')) return;

        try {
            await supabaseService.resetGroupStage(tournament.id);
            showToast('Fase de grupos reiniciada.', 'info');
            loadRegistrations(tournament.id);
        } catch (error: any) {
            console.error('Error resetting fixture:', error);
            showToast('Error al reiniciar fixture: ' + error.message, 'error');
        }
    };

    const handleManualRegistration = async () => {
        if (!tournament || !manualPlayer1 || !manualPlayer2) return;

        const generatedTeamName = `${manualPlayer1} & ${manualPlayer2}`;

        try {
            await supabaseService.registerTeam({
                tournament_id: tournament.id,
                team_name: generatedTeamName,
                player1_name: manualPlayer1,
                player2_name: manualPlayer2,
                status: 'approved'
            });
            showToast('Equipo inscrito correctamente', 'success');
            setManualPlayer1('');
            setManualPlayer2('');
            loadRegistrations(tournament.id);
        } catch (error) {
            console.error('Error registering team:', error);
            showToast('Error al inscribir equipo', 'error');
        }
    };

    const handleStatusUpdate = async (registrationId: string, status: 'approved' | 'rejected') => {
        if (!tournament) return;
        try {
            await supabaseService.updateRegistrationStatus(registrationId, status);
            showToast(`Equipo ${status === 'approved' ? 'aprobado' : 'rechazado'}`, 'success');
            loadRegistrations(tournament.id);
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Error al actualizar estado', 'error');
        }
    };

    const handleEditScore = (match: any) => {
        setSelectedMatch(match);
        setIsScoreModalOpen(true);
    };

    const handleScheduleMatch = (match: any) => {
        setSelectedMatchForSchedule(match);
        setIsScheduleModalOpen(true);
    };

    const handleScoreUpdated = () => {
        if (tournament) {
            loadRegistrations(tournament.id);
        }
    };

    const handleScheduleUpdated = () => {
        if (tournament) {
            loadRegistrations(tournament.id);
        }
    };

    const handleFinishTournament = async () => {
        if (!tournament) return;
        if (!confirm('¿Estás seguro de que quieres finalizar el torneo? Se calcularán los puntos para el ranking y no se podrán hacer más cambios.')) return;

        try {
            await supabaseService.calculateTournamentPoints(tournament.id);
            showToast('Torneo finalizado y puntos calculados correctamente.', 'success');
            loadTournamentData(tournament.id);
        } catch (error: any) {
            console.error('Error finishing tournament:', error);
            showToast('Error al finalizar torneo: ' + error.message, 'error');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-400">Cargando torneo...</div>;
    }

    if (!tournament) {
        return <div className="p-8 text-center text-gray-400">Torneo no encontrado</div>;
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/club/tournaments')}>
                        <ChevronLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                            <span className="flex items-center gap-1"><Calendar size={14} /> {format(new Date(tournament.start_date), "d 'de' MMMM", { locale: es })}</span>
                            <span className="flex items-center gap-1"><Users size={14} /> {tournament.category} • {tournament.max_teams} Equipos</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tournament.status === 'open' ? 'bg-green-500/20 text-green-400' :
                                tournament.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-gray-500/20 text-gray-400'
                                }`}>
                                {tournament.status === 'open' ? 'Inscripción Abierta' :
                                    tournament.status === 'ongoing' ? 'En Curso' : 'Finalizado'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            const url = `${window.location.origin}/player/tournaments/${tournament.id}`;
                            navigator.clipboard.writeText(url);
                            showToast('Enlace copiado al portapapeles', 'success');
                        }}
                    >
                        <Share2 size={18} className="mr-2" />
                        Compartir
                    </Button>
                    {tournament.status === 'ongoing' && (
                        <Button
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                            onClick={handleFinishTournament}
                        >
                            <Trophy size={18} className="mr-2" />
                            Finalizar Torneo
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-white/10 mb-8">
                <button
                    className={`pb-4 px-2 text-lg font-medium transition-colors ${activeTab === 'registrations' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setActiveTab('registrations')}
                >
                    Inscripciones
                </button>
                <button
                    className={`pb-4 px-2 text-lg font-medium transition-colors ${activeTab === 'groups' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => {
                        setActiveTab('groups');
                        loadRegistrations(tournament.id);
                    }}
                >
                    Fase de Grupos
                </button>
                <button
                    className={`pb-4 px-2 text-lg font-medium transition-colors ${activeTab === 'playoffs' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setActiveTab('playoffs')}
                >
                    Llave Final
                </button>
            </div>

            {/* Content */}
            <div className="bg-surface border border-white/10 rounded-2xl p-6 min-h-[600px]">
                {activeTab === 'registrations' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Manual Registration Form */}
                        <div className="lg:col-span-1 space-y-4 bg-white/5 p-6 rounded-xl h-fit">
                            <h3 className="font-bold text-primary flex items-center gap-2 text-lg">
                                <Plus size={20} />
                                Inscripción Manual
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">Jugador 1</label>
                                    <input
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                        value={manualPlayer1}
                                        onChange={(e) => setManualPlayer1(e.target.value)}
                                        placeholder="Nombre completo"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">Jugador 2</label>
                                    <input
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                        value={manualPlayer2}
                                        onChange={(e) => setManualPlayer2(e.target.value)}
                                        placeholder="Nombre completo"
                                    />
                                </div>
                            </div>
                            <Button onClick={handleManualRegistration} className="w-full mt-4">
                                Inscribir Equipo
                            </Button>
                        </div>

                        {/* Registered Teams List */}
                        <div className="lg:col-span-2">
                            <h3 className="font-bold text-white mb-6 flex items-center justify-between text-lg">
                                Equipos Inscritos
                                <span className="text-sm font-normal text-gray-400 bg-white/10 px-3 py-1 rounded-full">
                                    {registrations.length} / {tournament.max_teams}
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                                {registrations.length === 0 ? (
                                    <p className="text-gray-500 italic col-span-2 text-center py-8">No hay equipos inscritos aún.</p>
                                ) : (
                                    registrations.map((reg) => (
                                        <div key={reg.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center hover:bg-white/10 transition-colors">
                                            <div>
                                                <div className="font-bold text-white mb-1">{reg.team_name}</div>
                                                <div className="text-sm text-gray-400 flex gap-2">
                                                    <span>{reg.player1?.name || reg.player1_name || 'Jugador 1'}</span>
                                                    <span className="text-gray-600">&</span>
                                                    <span>{reg.player2?.name || reg.player2_name || 'Jugador 2'}</span>
                                                </div>
                                                <div className={`text-xs mt-2 uppercase tracking-wider font-bold ${reg.status === 'approved' ? 'text-green-400' : 'text-yellow-400'
                                                    }`}>
                                                    {reg.status === 'approved' ? 'Confirmado' : 'Pendiente'}
                                                </div>
                                            </div>
                                            {reg.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                                        onClick={() => handleStatusUpdate(reg.id, 'approved')}
                                                    >
                                                        <Check size={18} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                        onClick={() => handleStatusUpdate(reg.id, 'rejected')}
                                                    >
                                                        <X size={18} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {tournament.status === 'open' ? (
                                registrations.length >= 3 ? (
                                    <div className="mt-8 pt-8 border-t border-white/10">
                                        <Button onClick={handleGenerateFixture} className="w-full py-6 text-lg" variant="primary" disabled={isGenerating}>
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Generando...
                                                </>
                                            ) : (
                                                'Generar Fase de Grupos'
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="mt-8 pt-8 border-t border-white/10 text-center">
                                        <p className="text-gray-500 italic mb-4">
                                            Se necesitan al menos 3 equipos para generar la fase de grupos.
                                        </p>
                                        <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden max-w-md mx-auto">
                                            <div
                                                className="bg-primary h-full transition-all duration-500"
                                                style={{ width: `${(registrations.length / 3) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="mt-8 pt-8 border-t border-white/10 text-center">
                                    <div className="bg-green-500/10 text-green-400 p-4 rounded-xl mb-4 flex items-center justify-center gap-3 inline-flex">
                                        <Check size={20} />
                                        <span className="font-bold">Fase de Grupos Generada</span>
                                    </div>
                                    <div className="flex gap-4 justify-center">
                                        <Button
                                            onClick={() => {
                                                setActiveTab('groups');
                                                loadRegistrations(tournament.id);
                                            }}
                                            variant="secondary"
                                        >
                                            Ver Fase de Grupos
                                        </Button>
                                        <Button
                                            onClick={handleResetFixture}
                                            className="bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                            variant="ghost"
                                        >
                                            Reiniciar
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'groups' && (
                    <div className="space-y-8">
                        {registrations.filter(r => r.group_name).length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <p className="text-xl mb-4">No se encontraron grupos generados.</p>
                                <div className="flex gap-4 justify-center">
                                    <Button
                                        variant="ghost"
                                        onClick={() => tournament && loadRegistrations(tournament.id)}
                                    >
                                        <RefreshCw size={20} className="mr-2" />
                                        Refrescar Datos
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleGenerateFixture}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Generar Fase de Grupos
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-end mb-6 gap-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 cursor-pointer"
                                        onClick={async () => {
                                            if (!tournament) return;
                                            if (!confirm('¿Simular resultados aleatorios para todos los partidos de grupo? Esto sobrescribirá los resultados existentes.')) return;
                                            try {
                                                setIsGenerating(true);
                                                await supabaseService.simulateGroupStageResults(tournament.id);
                                                showToast('Resultados simulados correctamente.', 'success');
                                                loadRegistrations(tournament.id);
                                            } catch (error: any) {
                                                console.error('Error simulating results:', error);
                                                showToast('Error: ' + error.message, 'error');
                                            } finally {
                                                setIsGenerating(false);
                                            }
                                        }}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}
                                        Simular Resultados (Test)
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 cursor-pointer"
                                        onClick={handleResetFixture}
                                    >
                                        <Trash2 size={16} className="mr-2" />
                                        Reiniciar Fase de Grupos
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {Array.from(new Set(registrations.map(r => r.group_name).filter(Boolean))).sort().map(groupName => {
                                        const groupTeams = registrations.filter(r => r.group_name === groupName);
                                        if (groupTeams.length === 0) return null;

                                        // Sort by points, then sets won, then games won
                                        const sortedTeams = [...groupTeams].sort((a, b) => {
                                            const statsA = a.stats || { points: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };
                                            const statsB = b.stats || { points: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };

                                            // 1. Points
                                            if (statsB.points !== statsA.points) return statsB.points - statsA.points;

                                            // 2. Set Difference
                                            const setDiffA = (statsA.sets_won || 0) - (statsA.sets_lost || 0);
                                            const setDiffB = (statsB.sets_won || 0) - (statsB.sets_lost || 0);
                                            if (setDiffB !== setDiffA) return setDiffB - setDiffA;

                                            // 3. Game Difference
                                            const gameDiffA = (statsA.games_won || 0) - (statsA.games_lost || 0);
                                            const gameDiffB = (statsB.games_won || 0) - (statsB.games_lost || 0);
                                            return gameDiffB - gameDiffA;
                                        });

                                        const groupMatches = matches.filter(m => m.group_name === groupName);

                                        return (
                                            <div key={groupName} className="bg-white/5 rounded-xl p-6 border border-white/10">
                                                <h3 className="text-xl font-bold text-primary mb-6">Grupo {groupName}</h3>

                                                {/* Standings Table */}
                                                <div className="overflow-x-auto mb-8">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-gray-400 uppercase bg-black/20">
                                                            <tr>
                                                                <th className="px-4 py-3 rounded-l-lg">Equipo</th>
                                                                <th className="px-2 py-3 text-center">PTS</th>
                                                                <th className="px-2 py-3 text-center">PJ</th>
                                                                <th className="px-2 py-3 text-center">PG</th>
                                                                <th className="px-2 py-3 text-center">PP</th>
                                                                <th className="px-2 py-3 text-center">DS</th>
                                                                <th className="px-2 py-3 text-center rounded-r-lg">DG</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {sortedTeams.map((team, idx) => {
                                                                const setsDiff = (team.stats?.sets_won || 0) - (team.stats?.sets_lost || 0);
                                                                const gamesDiff = (team.stats?.games_won || 0) - (team.stats?.games_lost || 0);

                                                                return (
                                                                    <tr key={team.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                                                        <td className="px-4 py-3 font-medium flex items-center gap-3">
                                                                            <span className="text-gray-500 w-4 font-mono">{idx + 1}</span>
                                                                            {team.team_name}
                                                                        </td>
                                                                        <td className="px-2 py-3 text-center font-bold text-white">{team.stats?.points || 0}</td>
                                                                        <td className="px-2 py-3 text-center text-gray-400">{team.stats?.played || 0}</td>
                                                                        <td className="px-2 py-3 text-center text-green-400">{team.stats?.won || 0}</td>
                                                                        <td className="px-2 py-3 text-center text-red-400">{team.stats?.lost || 0}</td>
                                                                        <td className={`px-2 py-3 text-center ${setsDiff > 0 ? 'text-green-400' : setsDiff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                                                            {setsDiff > 0 ? `+${setsDiff}` : setsDiff}
                                                                        </td>
                                                                        <td className={`px-2 py-3 text-center ${gamesDiff > 0 ? 'text-green-400' : gamesDiff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                                                            {gamesDiff > 0 ? `+${gamesDiff}` : gamesDiff}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Matches List */}
                                                <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Partidos</h4>
                                                <div className="grid gap-3">
                                                    {groupMatches.map(match => (
                                                        <div key={match.id} className="bg-black/20 p-4 rounded-lg flex flex-col gap-3 hover:bg-black/30 transition-colors">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1 text-right text-sm font-medium text-gray-300">{match.team1?.team_name}</div>
                                                                <div className="px-6 flex flex-col items-center gap-2">
                                                                    <div className="bg-white/10 px-3 py-1 rounded text-sm font-mono font-bold text-white min-w-[60px] text-center">
                                                                        {match.score || 'vs'}
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 text-left text-sm font-medium text-gray-300">{match.team2?.team_name}</div>
                                                            </div>

                                                            {/* Schedule Info & Actions */}
                                                            <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                                                                <div className="text-xs text-gray-500 flex items-center gap-3">
                                                                    {match.court && (
                                                                        <span className="flex items-center gap-1">
                                                                            <MapPin size={12} /> {match.court.name}
                                                                        </span>
                                                                    )}
                                                                    {match.start_time && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Clock size={12} /> {format(new Date(match.start_time), "d MMM HH:mm", { locale: es })}
                                                                        </span>
                                                                    )}
                                                                    {!match.court && !match.start_time && (
                                                                        <span className="italic opacity-50">Sin programar</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer flex items-center gap-1"
                                                                        onClick={() => handleScheduleMatch(match)}
                                                                    >
                                                                        <Calendar size={12} /> Programar
                                                                    </button>
                                                                    <button
                                                                        className="text-xs text-primary hover:text-primary/80 hover:underline cursor-pointer"
                                                                        onClick={() => handleEditScore(match)}
                                                                    >
                                                                        Editar Resultado
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'playoffs' && (
                    <div className="space-y-8">
                        {matches.filter(m => m.stage === 'playoff').length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <Trophy className="mx-auto h-16 w-16 mb-6 opacity-50" />
                                <p className="text-xl mb-8">La Llave Final se generará al finalizar la fase de grupos.</p>
                                <Button
                                    onClick={async () => {
                                        if (!tournament) return;
                                        try {
                                            await supabaseService.generatePlayoffs(tournament.id);
                                            alert('Llave Final generada correctamente!');
                                            loadRegistrations(tournament.id);
                                        } catch (error: any) {
                                            console.error('Error generating playoffs:', error);
                                            alert('Error: ' + error.message);
                                        }
                                    }}
                                    className="cursor-pointer text-lg px-8 py-3"
                                >
                                    Generar Llave Final
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 cursor-pointer"
                                        onClick={async () => {
                                            if (!tournament) return;
                                            if (!confirm('¿Simular resultados para la Llave Final?')) return;
                                            try {
                                                setIsGenerating(true);
                                                await supabaseService.simulatePlayoffResults(tournament.id);
                                                showToast('Resultados simulados correctamente.', 'success');
                                                loadRegistrations(tournament.id);
                                            } catch (error: any) {
                                                console.error('Error simulating results:', error);
                                                showToast('Error: ' + error.message, 'error');
                                            } finally {
                                                setIsGenerating(false);
                                            }
                                        }}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}
                                        Simular Resultados (Test)
                                    </Button>
                                </div>

                                {/* World Cup Style Bracket - Compact Version */}
                                <div className="flex flex-row gap-4 overflow-x-auto pb-4 pt-4 min-h-[500px] px-2">
                                    {['round_16', 'quarter', 'semi', 'final'].map((roundName, _) => {
                                        const roundMatches = matches.filter(m => m.round === roundName).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                                        if (roundMatches.length === 0) return null;

                                        const roundTitle = roundName === 'round_16' ? 'Octavos' :
                                            roundName === 'quarter' ? 'Cuartos' :
                                                roundName === 'semi' ? 'Semis' : 'Final';

                                        const isFinal = roundName === 'final';

                                        // Dynamic spacing for tree structure
                                        const justifyClass = 'justify-around';

                                        return (
                                            <div key={roundName} className={`flex flex-col ${justifyClass} min-w-[240px] flex-1`}>
                                                <h3 className={`text-sm font-bold mb-4 text-center flex items-center justify-center gap-2 ${isFinal ? 'text-yellow-500' : 'text-primary'}`}>
                                                    {isFinal && <Trophy size={16} />} {roundTitle}
                                                </h3>
                                                <div className="flex flex-col justify-around h-full gap-4">
                                                    {roundMatches.map(match => (
                                                        <div key={match.id} className={`${isFinal ? 'bg-gradient-to-b from-yellow-500/10 to-transparent border-yellow-500/30' : 'bg-white/5 border-white/10'} border rounded-lg p-2 relative overflow-hidden shadow-sm hover:border-white/20 transition-colors`}>
                                                            {!isFinal && <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>}

                                                            {/* Header with Schedule Info */}
                                                            <div className="flex justify-between items-start mb-1.5">
                                                                <div className="flex flex-col">
                                                                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isFinal ? 'text-yellow-500/70' : 'text-gray-500'}`}>
                                                                        {match.group_name ? `P. ${match.group_name}` : 'Match'}
                                                                    </span>
                                                                    {(match.court || match.start_time) && (
                                                                        <div className="flex items-center gap-1 text-[9px] text-blue-400 mt-0.5">
                                                                            <Clock size={8} />
                                                                            <span>
                                                                                {match.start_time ? format(new Date(match.start_time), "dd/MM HH:mm", { locale: es }) : ''}
                                                                                {match.court && match.start_time ? ' - ' : ''}
                                                                                {match.court?.name}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {match.winner_id && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isFinal ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>FIN</span>}
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                {/* Team 1 */}
                                                                <div className={`flex justify-between items-center p-1.5 rounded ${match.winner_id === match.team1_id ? (isFinal ? 'bg-yellow-500/20 text-yellow-400 font-bold' : 'bg-green-500/10 text-green-400 font-bold') : 'bg-black/20'}`}>
                                                                    <span className={`text-xs truncate max-w-[140px] ${!match.team1_id ? 'text-gray-600 italic' : ''}`}>
                                                                        {match.team1?.team_name || (match.score === 'BYE' ? 'BYE' : 'TBD')}
                                                                    </span>
                                                                    {match.sets_score && <span className="text-xs font-mono font-bold">
                                                                        {match.sets_score.map((s: any) => match.winner_id === match.team1_id ? s.w : s.l).join('-')}
                                                                    </span>}
                                                                </div>

                                                                {/* Team 2 */}
                                                                <div className={`flex justify-between items-center p-1.5 rounded ${match.winner_id === match.team2_id ? (isFinal ? 'bg-yellow-500/20 text-yellow-400 font-bold' : 'bg-green-500/10 text-green-400 font-bold') : 'bg-black/20'}`}>
                                                                    <span className={`text-xs truncate max-w-[140px] ${!match.team2_id ? 'text-gray-600 italic' : ''}`}>
                                                                        {match.team2?.team_name || (match.score === 'BYE' ? 'BYE' : 'TBD')}
                                                                    </span>
                                                                    {match.sets_score && <span className="text-xs font-mono font-bold">
                                                                        {match.sets_score.map((s: any) => match.winner_id === match.team2_id ? s.w : s.l).join('-')}
                                                                    </span>}
                                                                </div>
                                                            </div>

                                                            {match.score !== 'BYE' && (
                                                                <div className={`mt-2 flex items-center justify-between gap-2`}>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleScheduleMatch(match)}
                                                                        className="text-[10px] h-5 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                                        title="Programar Partido"
                                                                    >
                                                                        <Calendar size={12} />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant={match.winner_id ? "ghost" : (isFinal ? "primary" : "ghost")}
                                                                        onClick={() => handleEditScore(match)}
                                                                        disabled={!match.team1_id || !match.team2_id}
                                                                        className={`${isFinal && !match.winner_id ? "bg-yellow-500 hover:bg-yellow-600 text-black font-bold" : "text-[10px] h-5 px-2"} cursor-pointer`}
                                                                    >
                                                                        {match.score ? 'Editar' : (isFinal ? 'Definir' : 'Cargar')}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <MatchScoreModal
                isOpen={isScoreModalOpen}
                onClose={() => setIsScoreModalOpen(false)}
                match={selectedMatch}
                onScoreUpdated={handleScoreUpdated}
            />

            {
                tournament && (
                    <MatchScheduleModal
                        isOpen={isScheduleModalOpen}
                        onClose={() => setIsScheduleModalOpen(false)}
                        match={selectedMatchForSchedule}
                        onScheduleUpdated={handleScheduleUpdated}
                        clubId={tournament.club_id}
                    />
                )
            }
        </div >
    );
};

export default TournamentDetail;
