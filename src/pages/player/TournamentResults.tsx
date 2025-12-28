import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Calendar, Users, ChevronLeft, MapPin, Clock } from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import type { Tournament } from '../../types';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TournamentResults = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'groups' | 'playoffs'>('groups');

    // Data State
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);

    useEffect(() => {
        if (id) {
            loadTournamentData(id);
        }
    }, [id]);

    const loadTournamentData = async (tournamentId: string) => {
        try {
            setLoading(true);
            // Use getTournaments without user filter to get public tournament info
            // However, getTournaments usually returns all active tournaments or club specific.
            // Let's assume we can fetch by ID or filter from all.
            // Since we don't have a direct getTournamentById, we'll fetch all and find.
            // Optimization: Add getTournamentById to service later if needed.
            const tournaments = await supabaseService.getTournaments();
            const found = tournaments.find(t => t.id === tournamentId);

            if (found) {
                setTournament(found);
                await loadRegistrations(tournamentId);
            } else {
                console.error('Tournament not found');
                navigate('/player/tournaments');
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
                    <Button variant="ghost" onClick={() => navigate('/player/tournaments')}>
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
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-white/10 mb-8">
                <button
                    className={`pb-4 px-2 text-lg font-medium transition-colors ${activeTab === 'groups' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setActiveTab('groups')}
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
                {activeTab === 'groups' && (
                    <div className="space-y-8">
                        {registrations.filter(r => r.group_name).length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <p className="text-xl mb-4">La fase de grupos aún no ha comenzado.</p>
                            </div>
                        ) : (
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

                                                        {/* Schedule Info */}
                                                        <div className="flex items-center justify-center border-t border-white/5 pt-2 mt-1">
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
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'playoffs' && (
                    <div className="space-y-8">
                        {matches.filter(m => m.stage === 'playoff').length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <Trophy className="mx-auto h-16 w-16 mb-6 opacity-50" />
                                <p className="text-xl mb-8">La Llave Final aún no ha sido generada.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
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
        </div >
    );
};

export default TournamentResults;
