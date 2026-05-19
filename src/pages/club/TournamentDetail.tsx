import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShareTournamentModal } from '../../components/club/ShareTournamentModal';
import { EditRegistrationModal } from '../../components/club/EditRegistrationModal';
import { EditTournamentModal } from '../../components/club/EditTournamentModal';
import { Plus, Trophy, Calendar, Users, ChevronLeft, Check, RefreshCw, Trash2, Clock, MapPin, Loader2, Share2, Download, Edit2 } from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import type { Tournament } from '../../types';
import { Button } from '../../components/ui/Button';
import { MatchScoreModal } from '../../components/MatchScoreModal';
import { MatchScheduleModal } from '../../components/MatchScheduleModal';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import type { ClubProfile } from '../../types';

const TournamentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'registrations' | 'groups' | 'playoffs'>('registrations');
    const [profile, setProfile] = useState<ClubProfile | null>(null);
    const [isEditTournamentModalOpen, setIsEditTournamentModalOpen] = useState(false);

    // Data State
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);

    // Manual Registration State
    const [manualPlayer1, setManualPlayer1] = useState('');
    const [manualPlayer2, setManualPlayer2] = useState('');

    // Edit Registration State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState<any>(null);

    // Match Score Modal State
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

    // Match Schedule Modal State
    const [selectedMatchForSchedule, setSelectedMatchForSchedule] = useState<any>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    // Manual Playoff State
    const [showManualPlayoffForm, setShowManualPlayoffForm] = useState(false);
    const [manualPlayoffRound, setManualPlayoffRound] = useState('quarter');
    const [manualPlayoffTeam1, setManualPlayoffTeam1] = useState('');
    const [manualPlayoffTeam2, setManualPlayoffTeam2] = useState('');

    // Manual Group Match State
    const [showManualGroupForm, setShowManualGroupForm] = useState(false);
    const [manualGroupTeam1, setManualGroupTeam1] = useState('');
    const [manualGroupTeam1Partner, setManualGroupTeam1Partner] = useState('');
    const [manualGroupTeam2, setManualGroupTeam2] = useState('');
    const [manualGroupTeam2Partner, setManualGroupTeam2Partner] = useState('');
    const [manualGroupSelect, setManualGroupSelect] = useState('A');

    // Dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info' | 'success';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const closeConfirmDialog = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

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
                const profileData = await supabaseService.getProfile(user.id);
                if (profileData) setProfile(profileData as ClubProfile);
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

    const handleGenerateManualFixture = async () => {
        if (!tournament) return;
        if (registrations.length < 3) {
            alert('Se necesitan al menos 3 equipos para generar la fase de grupos.');
            return;
        }

        try {
            setIsGenerating(true);
            await supabaseService.generateManualGroupStage(tournament.id);
            showToast('Fase de grupos manual generada correctamente!', 'success');
            loadRegistrations(tournament.id);
            setActiveTab('groups');
        } catch (error: any) {
            console.error('Error generating manual fixture:', error);
            showToast('Error al generar fixture manual: ' + error.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleResetFixture = async () => {
        if (!tournament) return;
        setConfirmDialog({
            isOpen: true,
            title: 'Reiniciar Fase de Grupos',
            message: '¿Estás seguro de que quieres reiniciar la fase de grupos? Se borrarán todos los partidos y resultados.',
            type: 'warning',
            onConfirm: async () => {
                closeConfirmDialog();
                try {
                    await supabaseService.resetGroupStage(tournament.id);
                    showToast('Fase de grupos reiniciada.', 'info');
                    loadRegistrations(tournament.id);
                } catch (error: any) {
                    console.error('Error resetting fixture:', error);
                    showToast('Error al reiniciar fixture: ' + error.message, 'error');
                }
            }
        });
    };

    const handleGenerateLigaPaternidadDate = async () => {
        if (!tournament) return;
        if (registrations.length < 4) {
            alert('Se necesitan al menos 4 jugadores para sortear una fecha (1 partido).');
            return;
        }

        try {
            setIsGenerating(true);
            await supabaseService.generateLigaPaternidadDate(tournament.id);
            showToast('Fecha sorteada correctamente!', 'success');
            loadTournamentData(tournament.id); // Reload to get updated current_round
            setActiveTab('groups');
        } catch (error: any) {
            console.error('Error generating date:', error);
            showToast('Error al sortear fecha: ' + error.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddManualPlayoffMatch = async () => {
        if (!tournament) return;
        if (!manualPlayoffRound) {
            showToast('Selecciona una ronda', 'error');
            return;
        }
        
        try {
            setIsGenerating(true);
            await supabaseService.createTournamentMatch({
                tournament_id: tournament.id,
                stage: 'playoff',
                round: manualPlayoffRound,
                team1_id: manualPlayoffTeam1 || undefined,
                team2_id: manualPlayoffTeam2 || undefined,
                start_time: new Date().toISOString()
            });
            showToast('Partido añadido a la llave final', 'success');
            setManualPlayoffTeam1('');
            setManualPlayoffTeam2('');
            loadRegistrations(tournament.id);
        } catch (error: any) {
             showToast('Error al añadir partido: ' + error.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddManualGroupMatch = async () => {
        if (!tournament) return;
        if (!manualGroupSelect) {
            showToast('Selecciona un grupo o fecha', 'error');
            return;
        }

        // For Liga Paternidad, we might want match_date to be parsed from manualGroupSelect (e.g. "Fecha 1" -> 1)
        let matchDateStr = manualGroupSelect.replace(/\D/g, '');
        let matchDateNum = matchDateStr ? parseInt(matchDateStr) : undefined;
        
        try {
            setIsGenerating(true);
            await supabaseService.createTournamentMatch({
                tournament_id: tournament.id,
                stage: 'group',
                round: tournament.format === 'liga_paternidad' ? `fecha_${matchDateNum || 1}` : 'group',
                group_name: manualGroupSelect,
                team1_id: manualGroupTeam1 || undefined,
                team1_partner_id: manualGroupTeam1Partner || undefined,
                team2_id: manualGroupTeam2 || undefined,
                team2_partner_id: manualGroupTeam2Partner || undefined,
                match_date: tournament.format === 'liga_paternidad' ? (matchDateNum || 1) : undefined,
                start_time: new Date().toISOString()
            });

            // Update current_round if needed
            if (tournament.format === 'liga_paternidad' && matchDateNum && matchDateNum > (tournament.current_round || 0)) {
                await supabaseService.updateTournamentCurrentRound(tournament.id, matchDateNum);
            }

            showToast('Partido añadido', 'success');
            setManualGroupTeam1('');
            setManualGroupTeam1Partner('');
            setManualGroupTeam2('');
            setManualGroupTeam2Partner('');
            loadRegistrations(tournament.id);
            loadTournamentData(tournament.id);
        } catch (error: any) {
             showToast('Error al añadir partido: ' + error.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClearPlayoffs = () => {
        if (!tournament) return;
        setConfirmDialog({
            isOpen: true,
            title: 'Limpiar Llave Final',
            message: '¿Estás seguro? Se borrarán TODOS los partidos de la llave final actual.',
            type: 'danger',
            onConfirm: async () => {
                closeConfirmDialog();
                try {
                    await supabaseService.clearPlayoffs(tournament.id);
                    showToast('Llave final borrada', 'info');
                    loadRegistrations(tournament.id);
                } catch (e: any) {
                    showToast('Error: ' + e.message, 'error');
                }
            }
        });
    };

    const handleManualRegistration = async () => {
        if (!tournament || !manualPlayer1) return;
        if (tournament.format !== 'liga_paternidad' && !manualPlayer2) return;

        const generatedTeamName = tournament.format === 'liga_paternidad' ? manualPlayer1 : `${manualPlayer1} & ${manualPlayer2}`;

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

    const handleDeleteRegistration = async (registrationId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Eliminar Equipo',
            message: '¿Estás seguro de eliminar este equipo del torneo?',
            type: 'danger',
            onConfirm: async () => {
                closeConfirmDialog();
                try {
                    const success = await supabaseService.deleteTournamentRegistration(registrationId);
                    if (success) {
                        showToast('Equipo eliminado correctamente', 'success');
                        loadRegistrations(tournament!.id);
                    } else {
                        showToast('Error al eliminar equipo', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting registration:', error);
                    showToast('Error al eliminar equipo', 'error');
                }
            }
        });
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
        setConfirmDialog({
            isOpen: true,
            title: tournament.status === 'finished' ? 'Recalcular Puntos' : 'Finalizar Torneo',
            message: tournament.status === 'finished' 
                ? '¿Estás seguro de que quieres volver a calcular y asignar los puntos del torneo? Esto sobrescribirá los puntos asignados anteriormente.'
                : '¿Estás seguro de que quieres finalizar el torneo? Se calcularán los puntos para el ranking y no se podrán hacer más cambios.',
            type: 'warning',
            onConfirm: async () => {
                closeConfirmDialog();
                try {
                    await supabaseService.calculateTournamentPoints(tournament.id);
                    showToast(tournament.status === 'finished' ? 'Puntos recalculados correctamente.' : 'Torneo finalizado y puntos calculados correctamente.', 'success');
                    loadTournamentData(tournament.id);
                } catch (error: any) {
                    console.error('Error finishing tournament:', error);
                    showToast(`Error al ${tournament.status === 'finished' ? 'recalcular puntos' : 'finalizar torneo'}: ` + error.message, 'error');
                }
            }
        });
    };

    const handleDeleteTournament = () => {
        if (!tournament) return;
        setConfirmDialog({
            isOpen: true,
            title: 'Eliminar Torneo',
            message: '¿Estás seguro de que quieres eliminar este torneo de forma permanente? Se perderán todas las inscripciones y los resultados de los partidos.',
            type: 'warning', // using warning to preserve existing type styles
            onConfirm: async () => {
                closeConfirmDialog();
                try {
                    await supabaseService.deleteTournament(tournament.id);
                    showToast('Torneo eliminado correctamente.', 'success');
                    navigate('/club/tournaments');
                } catch (error: any) {
                    console.error('Error deleting tournament:', error);
                    showToast('Error al eliminar torneo: ' + error.message, 'error');
                }
            }
        });
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-8 w-full overflow-hidden">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Button variant="ghost" onClick={() => navigate('/club/tournaments')}>
                        <ChevronLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                            <span className="flex items-center gap-1"><Calendar size={14} /> {format(new Date(tournament.start_date), "d 'de' MMMM", { locale: es })}</span>
                            <span className="flex items-center gap-1"><Users size={14} /> {tournament.format === 'largo_12' ? 'Torneo Largo' : tournament.format === 'americano' ? 'Americano' : tournament.format === 'liga_paternidad' ? 'Liga Paternidad' : 'Torneo'} • {tournament.category} {tournament.format !== 'liga_paternidad' && `• ${tournament.max_teams} Equipos`}</span>
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

                <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            const url = `${window.location.origin}/public/torneo/${tournament.id}`;
                            navigator.clipboard.writeText(url);
                            showToast('Enlace copiado al portapapeles', 'success');
                        }}
                    >
                        <Share2 size={18} className="mr-2" />
                        Link
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setIsShareModalOpen(true)}
                    >
                        <Share2 size={18} className="mr-2" />
                        Flyer
                    </Button>
                    {(tournament.status === 'ongoing' || tournament.status === 'finished') && (
                        <Button
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                            onClick={handleFinishTournament}
                        >
                            <Trophy size={18} className="mr-2" />
                            {tournament.status === 'finished' ? 'Recalcular Puntos' : 'Finalizar Torneo'}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                        onClick={() => setIsEditTournamentModalOpen(true)}
                        title="Editar Fechas"
                    >
                        <Edit2 size={18} />
                    </Button>
                    <Button
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        onClick={handleDeleteTournament}
                        title="Eliminar Torneo"
                    >
                        <Trash2 size={18} />
                    </Button>
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
                    {tournament.format === 'americano' ? 'Posiciones Generales' : tournament.format === 'liga_paternidad' ? 'Posiciones Individuales' : 'Fase de Grupos'}
                </button>
                {tournament.format !== 'americano' && tournament.format !== 'liga_paternidad' && (
                    <button
                        className={`pb-4 px-2 text-lg font-medium transition-colors ${activeTab === 'playoffs' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setActiveTab('playoffs')}
                    >
                        Llave Final
                    </button>
                )}
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
                                    <label className="text-sm text-gray-400 block mb-1">{tournament.format === 'liga_paternidad' ? 'Jugador' : 'Jugador 1'}</label>
                                    <input
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                        value={manualPlayer1}
                                        onChange={(e) => setManualPlayer1(e.target.value)}
                                        placeholder="Nombre completo"
                                    />
                                </div>
                                {tournament.format !== 'liga_paternidad' && (
                                    <div>
                                        <label className="text-sm text-gray-400 block mb-1">Jugador 2</label>
                                        <input
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                            value={manualPlayer2}
                                            onChange={(e) => setManualPlayer2(e.target.value)}
                                            placeholder="Nombre completo"
                                        />
                                    </div>
                                )}
                            </div>
                            <Button onClick={handleManualRegistration} className="w-full mt-4">
                                {tournament.format === 'liga_paternidad' ? 'Inscribir Jugador' : 'Inscribir Equipo'}
                            </Button>
                        </div>

                        {/* Registered Teams List */}
                        <div className="lg:col-span-2">
                            <h3 className="font-bold text-white mb-6 flex items-center justify-between text-lg">
                                {tournament.format === 'liga_paternidad' ? 'Jugadores Inscritos' : 'Equipos Inscritos'}
                                <span className="text-sm font-normal text-gray-400 bg-white/10 px-3 py-1 rounded-full">
                                    {registrations.length} {tournament.format !== 'liga_paternidad' ? `/ ${tournament.max_teams}` : ''}
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                                {registrations.length === 0 ? (
                                    <p className="text-gray-500 italic col-span-2 text-center py-8">No hay equipos inscritos aún.</p>
                                ) : (
                                    registrations.map((reg) => (
                                        <div key={reg.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center hover:bg-white/10 transition-colors">
                                            <div>
                                                <div className="font-bold text-white mb-1">
                                                    {tournament.format === 'liga_paternidad' ? (reg.player1?.name || reg.player1_name || reg.team_name || 'Jugador') : reg.team_name}
                                                </div>
                                                {tournament.format !== 'liga_paternidad' && (
                                                    <div className="text-sm text-gray-400 flex gap-2">
                                                        <span>{reg.player1?.name || reg.player1_name || 'Jugador 1'}</span>
                                                        <span className="text-gray-600">/</span>
                                                        <span>{reg.player2?.name || reg.player2_name || 'Jugador 2'}</span>
                                                    </div>
                                                )}
                                                <div className={`text-xs mt-2 uppercase tracking-wider font-bold ${reg.status === 'approved' ? 'text-green-400' : 'text-yellow-400'
                                                    }`}>
                                                    {reg.status === 'approved' ? 'Confirmado' : 'Pendiente'}
                                                </div>
                                                {reg.status === 'approved' && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <label className="text-xs text-gray-400 uppercase tracking-wider">Zona/Grupo:</label>
                                                        <input 
                                                            className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white max-w-[60px] focus:outline-none focus:border-primary transition-colors"
                                                            defaultValue={reg.group_name || ''}
                                                            onBlur={async (e) => {
                                                                const newGroup = e.target.value.trim().toUpperCase();
                                                                if (newGroup !== (reg.group_name || '')) {
                                                                    try {
                                                                        await supabaseService.updateRegistrationGroup(reg.id, newGroup || 'A'); // Default to A if cleared
                                                                        showToast('Zona actualizada', 'success');
                                                                        loadRegistrations(tournament!.id);
                                                                    } catch (err) {
                                                                        showToast('Error al actualizar zona', 'error');
                                                                    }
                                                                }
                                                            }}
                                                            placeholder="A, B..."
                                                        />
                                                    </div>
                                                )}
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
                                                        onClick={() => handleDeleteRegistration(reg.id)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </Button>
                                                </div>
                                            )}
                                            {reg.status === 'approved' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-gray-500 hover:text-primary hover:bg-primary/10"
                                                        onClick={() => {
                                                            setSelectedRegistration(reg);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        <Edit2 size={18} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-gray-500 hover:text-red-400 hover:bg-red-400/10"
                                                        onClick={() => handleDeleteRegistration(reg.id)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {tournament.status === 'open' || tournament.format === 'liga_paternidad' ? (
                                registrations.length >= (tournament.format === 'liga_paternidad' ? 4 : 3) ? (
                                    <div className="mt-8 pt-8 border-t border-white/10 space-y-3">
                                        <Button 
                                            onClick={tournament.format === 'liga_paternidad' ? handleGenerateLigaPaternidadDate : handleGenerateFixture} 
                                            className="w-full py-4 text-lg" 
                                            variant="primary" 
                                            disabled={isGenerating || (tournament.format === 'liga_paternidad' && (tournament.current_round || 0) >= (tournament.total_dates || 1))}
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Generando...
                                                </>
                                            ) : (
                                                tournament.format === 'liga_paternidad' 
                                                    ? `Sortear Siguiente Partido`
                                                    : tournament.format === 'americano' ? 'Generar Fixture (Automático)' : 'Generar Fase de Grupos (Automático)'
                                            )}
                                        </Button>
                                        {tournament.format !== 'liga_paternidad' && (
                                            <Button onClick={handleGenerateManualFixture} className="w-full py-4 text-lg" variant="secondary" disabled={isGenerating}>
                                                {isGenerating ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Generando...
                                                    </>
                                                ) : (
                                                    'Generar Fixture (Zonas Manuales)'
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-8 pt-8 border-t border-white/10 text-center">
                                        <p className="text-gray-500 italic mb-4">
                                            Se necesitan al menos {tournament.format === 'liga_paternidad' ? '4 jugadores' : '3 equipos'} para generar {tournament.format === 'liga_paternidad' ? 'la primera fecha' : 'la fase de grupos'}.
                                        </p>
                                        <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden max-w-md mx-auto">
                                            <div
                                                className="bg-primary h-full transition-all duration-500"
                                                style={{ width: `${(registrations.length / (tournament.format === 'liga_paternidad' ? 4 : 3)) * 100}%` }}
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
                                            {tournament.format === 'americano' ? 'Ver Fixture' : tournament.format === 'liga_paternidad' ? 'Ver Posiciones' : 'Ver Fase de Grupos'}
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
                                <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5 mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Gestión de Partidos</h3>
                                        <p className="text-sm text-gray-400">Puedes generar los partidos automáticamente o agregarlos manualmente.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-end">
                                        {tournament.format === 'liga_paternidad' && (
                                            <Button
                                                variant="primary"
                                                onClick={handleGenerateLigaPaternidadDate}
                                                disabled={isGenerating}
                                            >
                                                {isGenerating ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                                                Sortear Siguiente Partido
                                            </Button>
                                        )}
                                        <Button
                                            variant="secondary"
                                            onClick={() => setShowManualGroupForm(!showManualGroupForm)}
                                        >
                                            {showManualGroupForm ? 'Cerrar Plantilla' : 'Añadir Partido Manual'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 cursor-pointer"
                                            onClick={async () => {
                                                if (!tournament) return;
                                                setConfirmDialog({
                                                    isOpen: true,
                                                    title: 'Simular Resultados',
                                                    message: '¿Simular resultados aleatorios para todos los partidos de grupo? Esto sobrescribirá los resultados existentes.',
                                                    type: 'warning',
                                                    onConfirm: async () => {
                                                        closeConfirmDialog();
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
                                                    }
                                                });
                                            }}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}
                                            Simular Resultados
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 cursor-pointer"
                                            onClick={handleResetFixture}
                                        >
                                            <Trash2 size={16} className="mr-2" />
                                            Reiniciar Fase
                                        </Button>
                                    </div>
                                </div>

                                {showManualGroupForm && (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                                        <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                                            <Plus size={18} /> Crear Nuevo Partido en Grupo
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                            <div>
                                                <label className="text-sm text-gray-400 block mb-1">Grupo / Zona</label>
                                                <input
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                                    value={manualGroupSelect}
                                                    onChange={(e) => setManualGroupSelect(e.target.value.toUpperCase())}
                                                    placeholder={tournament.format === 'liga_paternidad' ? "Ej. Fecha 1" : "A, B, C..."}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-gray-400 block mb-1">{tournament.format === 'liga_paternidad' ? 'Jugador 1' : 'Equipo 1'}</label>
                                                <select
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                                    value={manualGroupTeam1}
                                                    onChange={(e) => setManualGroupTeam1(e.target.value)}
                                                >
                                                    <option value="">-- Seleccionar --</option>
                                                    {registrations.filter(r => r.status === 'approved').map(team => (
                                                        <option key={team.id} value={team.id}>{team.team_name} ({team.group_name || 'Sin Z.'})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {tournament.format === 'liga_paternidad' && (
                                                <div>
                                                    <label className="text-sm text-gray-400 block mb-1">Jugador 2</label>
                                                    <select
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                                        value={manualGroupTeam1Partner}
                                                        onChange={(e) => setManualGroupTeam1Partner(e.target.value)}
                                                    >
                                                        <option value="">-- Seleccionar --</option>
                                                        {registrations.filter(r => r.status === 'approved' && r.id !== manualGroupTeam1).map(team => (
                                                            <option key={team.id} value={team.id}>{team.team_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-sm text-gray-400 block mb-1">{tournament.format === 'liga_paternidad' ? 'Jugador 3' : 'Equipo 2'}</label>
                                                <select
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                                    value={manualGroupTeam2}
                                                    onChange={(e) => setManualGroupTeam2(e.target.value)}
                                                >
                                                    <option value="">-- Seleccionar --</option>
                                                    {registrations.filter(r => r.status === 'approved' && r.id !== manualGroupTeam1 && r.id !== manualGroupTeam1Partner).map(team => (
                                                        <option key={team.id} value={team.id}>{team.team_name} ({team.group_name || 'Sin Z.'})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {tournament.format === 'liga_paternidad' && (
                                                <div>
                                                    <label className="text-sm text-gray-400 block mb-1">Jugador 4</label>
                                                    <select
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                                        value={manualGroupTeam2Partner}
                                                        onChange={(e) => setManualGroupTeam2Partner(e.target.value)}
                                                    >
                                                        <option value="">-- Seleccionar --</option>
                                                        {registrations.filter(r => r.status === 'approved' && r.id !== manualGroupTeam1 && r.id !== manualGroupTeam1Partner && r.id !== manualGroupTeam2).map(team => (
                                                            <option key={team.id} value={team.id}>{team.team_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className={tournament.format === 'liga_paternidad' ? "md:col-span-5" : ""}>
                                                <Button
                                                    className="w-full"
                                                    onClick={handleAddManualGroupMatch}
                                                    disabled={isGenerating}
                                                >
                                                    {isGenerating ? <Loader2 size={18} className="animate-spin mr-2" /> : <Check size={18} className="mr-2" />}
                                                    Guardar Partido
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                            <div key={groupName} className="bg-white/5 rounded-xl p-3 sm:p-6 border border-white/10">
                                                <h3 className="text-lg sm:text-xl font-bold text-primary mb-4 sm:mb-6">Grupo {groupName}</h3>

                                                {/* Standings Table */}
                                                <div className="overflow-x-auto mb-6 sm:mb-8 -mx-1 sm:mx-0">
                                                    <table className="w-full text-xs sm:text-sm text-left">
                                                        <thead className="text-[10px] sm:text-xs text-gray-400 uppercase bg-black/20">
                                                            <tr>
                                                                <th className="px-2 sm:px-4 py-2 sm:py-3 rounded-l-lg">Equipo</th>
                                                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center">PTS</th>
                                                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center">PJ</th>
                                                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center">PG</th>
                                                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center">PP</th>
                                                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center">DS</th>
                                                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center rounded-r-lg">DG</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {sortedTeams.map((team, idx) => {
                                                                const setsDiff = (team.stats?.sets_won || 0) - (team.stats?.sets_lost || 0);
                                                                const gamesDiff = (team.stats?.games_won || 0) - (team.stats?.games_lost || 0);

                                                                return (
                                                                    <tr key={team.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                                                        <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium flex items-center gap-1 sm:gap-3 group">
                                                                            <span className="text-gray-500 w-3 sm:w-4 font-mono text-[10px] sm:text-xs shrink-0">{idx + 1}</span>
                                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                                <span className="flex items-center gap-2">
                                                                                    <span className="truncate max-w-[90px] sm:max-w-[200px]" title={team.team_name}>{team.team_name}</span>
                                                                                    <button 
                                                                                        onClick={() => {
                                                                                            setSelectedRegistration(team);
                                                                                            setIsEditModalOpen(true);
                                                                                        }}
                                                                                        className="text-gray-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                                                        title="Editar equipo"
                                                                                    >
                                                                                        <Edit2 size={14} />
                                                                                    </button>
                                                                                </span>
                                                                                <span className="text-[10px] sm:text-xs text-gray-500 font-normal mt-0.5 flex gap-1 truncate max-w-[100px] sm:max-w-none" title={`${team.player1?.name || team.player1_name || 'Jugador 1'} / ${team.player2?.name || team.player2_name || 'Jugador 2'}`}>
                                                                                    {team.player1?.name || team.player1_name || 'Jugador 1'} <span className="text-gray-600">/</span> {team.player2?.name || team.player2_name || 'Jugador 2'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-1 sm:px-2 py-2 sm:py-3 text-center font-bold text-white">{team.stats?.points || 0}</td>
                                                                        <td className="px-1 sm:px-2 py-2 sm:py-3 text-center text-gray-400">{team.stats?.played || 0}</td>
                                                                        <td className="px-1 sm:px-2 py-2 sm:py-3 text-center text-green-400">{team.stats?.won || 0}</td>
                                                                        <td className="px-1 sm:px-2 py-2 sm:py-3 text-center text-red-400">{team.stats?.lost || 0}</td>
                                                                        <td className={`px-1 sm:px-2 py-2 sm:py-3 text-center ${setsDiff > 0 ? 'text-green-400' : setsDiff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                                                            {setsDiff > 0 ? `+${setsDiff}` : setsDiff}
                                                                        </td>
                                                                        <td className={`px-1 sm:px-2 py-2 sm:py-3 text-center ${gamesDiff > 0 ? 'text-green-400' : gamesDiff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
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
                                                        <div key={match.id} className="bg-black/20 p-3 sm:p-4 rounded-lg flex flex-col gap-3 hover:bg-black/30 transition-colors w-full overflow-hidden">
                                                            <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
                                                                <div className="flex-1 min-w-0 text-right text-[11px] sm:text-sm font-medium text-gray-300 break-words">
                                                                    {tournament.format === 'liga_paternidad' && match.team1_partner
                                                                        ? `${match.team1?.team_name?.split(' ')[0] || '?'}/${match.team1_partner?.team_name?.split(' ')[0] || '?'}`
                                                                        : match.team1?.team_name}
                                                                </div>
                                                                <div className="px-1 sm:px-4 flex flex-col items-center shrink-0">
                                                                    <div className="bg-white/10 px-2 sm:px-3 py-1 rounded text-[11px] sm:text-sm font-mono font-bold text-white text-center max-w-[80px] sm:max-w-none break-words">
                                                                        {match.score ? match.score.replace(/,\s*/g, ' ') : 'vs'}
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0 text-left text-[11px] sm:text-sm font-medium text-gray-300 break-words">
                                                                    {tournament.format === 'liga_paternidad' && match.team2_partner
                                                                        ? `${match.team2?.team_name?.split(' ')[0] || '?'}/${match.team2_partner?.team_name?.split(' ')[0] || '?'}`
                                                                        : match.team2?.team_name}
                                                                </div>
                                                            </div>

                                                            {/* Schedule Info & Actions */}
                                                            <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                                                                <div className="text-xs text-gray-500 flex items-center gap-3">
                                                                    {match.court_id ? (
                                                                        <>
                                                                            <span className="flex items-center gap-1">
                                                                                <MapPin size={12} /> {match.court?.name}
                                                                            </span>
                                                                            <span className="flex items-center gap-1">
                                                                                <Clock size={12} /> {format(new Date(match.start_time), "d MMM HH:mm", { locale: es })}
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="italic opacity-50 flex items-center gap-1"><Clock size={12} /> Por definir</span>
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
                        {/* MANUAL PLAYOFF CONTROLS */}
                        <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
                            <div>
                                <h3 className="text-lg font-bold text-white">Gestión de Llave Final</h3>
                                <p className="text-sm text-gray-400">Puedes generar la llave automáticamente o armarla partido por partido de forma manual.</p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-end">
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowManualPlayoffForm(!showManualPlayoffForm)}
                                >
                                    {showManualPlayoffForm ? 'Cerrar Plantilla Manual' : 'Añadir Partido Manual'}
                                </Button>
                                {matches.filter(m => m.stage === 'playoff').length > 0 && (
                                    <Button
                                        variant="ghost"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 cursor-pointer"
                                        onClick={handleClearPlayoffs}
                                    >
                                        <Trash2 size={16} className="mr-2" />
                                        Limpiar Llave
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* MANUAL MATCH FORM */}
                        {showManualPlayoffForm && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                                    <Plus size={18} /> Crear Nuevo Partido
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div>
                                        <label className="text-sm text-gray-400 block mb-1">Ronda</label>
                                        <select
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                            value={manualPlayoffRound}
                                            onChange={(e) => setManualPlayoffRound(e.target.value)}
                                        >
                                            <option value="round_16">Octavos de Final</option>
                                            <option value="quarter">Cuartos de Final</option>
                                            <option value="semi">Semifinal</option>
                                            <option value="final">Final</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 block mb-1">Equipo 1</label>
                                        <select
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                            value={manualPlayoffTeam1}
                                            onChange={(e) => setManualPlayoffTeam1(e.target.value)}
                                        >
                                            <option value="">-- Por definir / TBD --</option>
                                            {registrations.filter(r => r.status === 'approved').map(team => (
                                                <option key={team.id} value={team.id}>{team.team_name} ({team.group_name || 'Sin Z.'})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="text-center font-bold text-gray-500 pb-3 md:hidden">VS</div>
                                    <div>
                                        <label className="text-sm text-gray-400 block mb-1">Equipo 2</label>
                                        <select
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                            value={manualPlayoffTeam2}
                                            onChange={(e) => setManualPlayoffTeam2(e.target.value)}
                                        >
                                            <option value="">-- Por definir / TBD --</option>
                                            {registrations.filter(r => r.status === 'approved').map(team => (
                                                <option key={team.id} value={team.id}>{team.team_name} ({team.group_name || 'Sin Z.'})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Button
                                            className="w-full"
                                            onClick={handleAddManualPlayoffMatch}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? <Loader2 size={18} className="animate-spin mr-2" /> : <Check size={18} className="mr-2" />}
                                            Guardar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {matches.filter(m => m.stage === 'playoff').length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <Trophy className="mx-auto h-16 w-16 mb-6 opacity-50" />
                                {tournament?.format === 'flexible' ? (
                                    <>
                                        <p className="text-xl mb-6">Generar nueva Llave Final en Blanco</p>
                                        <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                                            <select
                                                id="startingRoundSelect"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                                            >
                                                <option value="round_16">Arranca en Octavos de Final (16 equipos)</option>
                                                <option value="quarter">Arranca en Cuartos de Final (8 equipos)</option>
                                                <option value="semi">Arranca en Semifinal (4 equipos)</option>
                                                <option value="final">Arranca en Final (2 equipos)</option>
                                            </select>
                                            <Button
                                                onClick={async () => {
                                                    const selectEl = document.getElementById('startingRoundSelect') as HTMLSelectElement;
                                                    if (!selectEl || !tournament) return;
                                                    try {
                                                        setIsGenerating(true);
                                                        await supabaseService.generateEmptyBracket(tournament.id, selectEl.value as any);
                                                        alert('Llave en blanco generada correctamente.');
                                                        loadRegistrations(tournament.id);
                                                    } catch (error: any) {
                                                        console.error('Error generating empty bracket:', error);
                                                        alert('Error: ' + error.message);
                                                    } finally {
                                                        setIsGenerating(false);
                                                    }
                                                }}
                                                className="cursor-pointer text-lg px-8 py-3 w-full"
                                                disabled={isGenerating}
                                            >
                                                {isGenerating ? <Loader2 className="animate-spin" /> : 'Generar Llave en Blanco'}
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xl mb-8">La Llave Final se generará al finalizar la fase de grupos.</p>
                                        <Button
                                            onClick={async () => {
                                                if (!tournament) return;
                                                try {
                                                    setIsGenerating(true);
                                                    await supabaseService.generatePlayoffs(tournament.id);
                                                    alert('Llave Final generada correctamente!');
                                                    loadRegistrations(tournament.id);
                                                } catch (error: any) {
                                                    console.error('Error generating playoffs:', error);
                                                    alert('Error: ' + error.message);
                                                } finally {
                                                    setIsGenerating(false);
                                                }
                                            }}
                                            className="cursor-pointer text-lg px-8 py-3"
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : null}
                                            Generar Llave Final
                                        </Button>
                                    </>
                                )}
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
                                            setConfirmDialog({
                                                isOpen: true,
                                                title: 'Simular Llave Final',
                                                message: '¿Simular resultados para la Llave Final?',
                                                type: 'info',
                                                onConfirm: async () => {
                                                    closeConfirmDialog();
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
                                                }
                                            });
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
                                                                    {match.court ? (
                                                                        <div className="flex items-center gap-1 text-[9px] text-blue-400 mt-0.5">
                                                                            <Clock size={8} />
                                                                            <span>
                                                                                {match.start_time ? format(new Date(match.start_time), "dd/MM HH:mm", { locale: es }) : ''}
                                                                                {match.court && match.start_time ? ' - ' : ''}
                                                                                {match.court.name}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1 text-[9px] text-gray-500 mt-0.5 italic">
                                                                            <Clock size={8} />
                                                                            <span>Por definir</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {match.winner_id && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isFinal ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>FIN</span>}
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                {/* Team 1 */}
                                                                <div className={`flex justify-between items-center p-1.5 rounded ${match.winner_id === match.team1_id ? (isFinal ? 'bg-yellow-500/20 text-yellow-400 font-bold' : 'bg-green-500/10 text-green-400 font-bold') : 'bg-black/20'}`}>
                                                                    {tournament?.format === 'flexible' && !match.winner_id ? (
                                                                        <select
                                                                            className={`text-[10px] bg-transparent border border-white/5 rounded px-1 min-w-[100px] focus:outline-none focus:border-primary truncate max-w-[140px] cursor-pointer ${!match.team1_id ? 'text-gray-500 italic' : 'text-white'}`}
                                                                            value={match.team1_id || ''}
                                                                            onChange={async (e) => {
                                                                                const val = e.target.value;
                                                                                try {
                                                                                    await supabaseService.updateMatchTeamAssignment(match.id, 1, val || null);
                                                                                    loadRegistrations(tournament!.id);
                                                                                } catch (error: any) {
                                                                                    alert('Error: ' + error.message);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">-- TBD --</option>
                                                                            {registrations.filter(r => r.status === 'approved').map(team => (
                                                                                <option key={team.id} value={team.id}>{team.team_name} ({team.group_name || '-'})</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <span className={`text-xs truncate max-w-[140px] ${!match.team1_id ? 'text-gray-600 italic' : ''}`}>
                                                                            {match.team1?.team_name || (match.score === 'BYE' ? 'BYE' : 'TBD')}
                                                                        </span>
                                                                    )}
                                                                    {(match.sets_score || (match.score && match.score !== 'BYE' && !match.score.includes('TBD'))) && (
                                                                        <span className="text-xs font-mono font-bold">
                                                                            {match.sets_score
                                                                                ? match.sets_score.map((s: any) => match.winner_id === match.team1_id ? s.w : s.l).join('-')
                                                                                : match.score?.split(',').map((s: string) => s.trim().split('-')[0]).join('-')
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Team 2 */}
                                                                <div className={`flex justify-between items-center p-1.5 rounded ${match.winner_id === match.team2_id ? (isFinal ? 'bg-yellow-500/20 text-yellow-400 font-bold' : 'bg-green-500/10 text-green-400 font-bold') : 'bg-black/20'}`}>
                                                                    {tournament?.format === 'flexible' && !match.winner_id ? (
                                                                        <select
                                                                            className={`text-[10px] bg-transparent border border-white/5 rounded px-1 min-w-[100px] focus:outline-none focus:border-primary truncate max-w-[140px] cursor-pointer ${!match.team2_id ? 'text-gray-500 italic' : 'text-white'}`}
                                                                            value={match.team2_id || ''}
                                                                            onChange={async (e) => {
                                                                                const val = e.target.value;
                                                                                try {
                                                                                    await supabaseService.updateMatchTeamAssignment(match.id, 2, val || null);
                                                                                    loadRegistrations(tournament!.id);
                                                                                } catch (error: any) {
                                                                                    alert('Error: ' + error.message);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">-- TBD --</option>
                                                                            {registrations.filter(r => r.status === 'approved').map(team => (
                                                                                <option key={team.id} value={team.id}>{team.team_name} ({team.group_name || '-'})</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <span className={`text-xs truncate max-w-[140px] ${!match.team2_id ? 'text-gray-600 italic' : ''}`}>
                                                                            {match.team2?.team_name || (match.score === 'BYE' ? 'BYE' : 'TBD')}
                                                                        </span>
                                                                    )}
                                                                    {(match.sets_score || (match.score && match.score !== 'BYE' && !match.score.includes('TBD'))) && (
                                                                        <span className="text-xs font-mono font-bold">
                                                                            {match.sets_score
                                                                                ? match.sets_score.map((s: any) => match.winner_id === match.team2_id ? s.w : s.l).join('-')
                                                                                : match.score?.split(',').map((s: string) => s.trim().split('-')[1]).join('-')
                                                                            }
                                                                        </span>
                                                                    )}
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

            {tournament && user && (
                <ShareTournamentModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    tournament={tournament}
                    clubName={profile?.name || user.name}
                    clubLogoUrl={profile?.avatar_url || user.avatar_url}
                    clubCoverUrl={profile?.photos?.[0]}
                />
            )}

            <ConfirmModal
                {...confirmDialog}
                onClose={closeConfirmDialog}
            />

            <EditRegistrationModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedRegistration(null);
                }}
                registration={selectedRegistration}
                onRegistrationUpdated={() => loadRegistrations(tournament!.id)}
            />

            {tournament && isEditTournamentModalOpen && (
                <EditTournamentModal
                    isOpen={isEditTournamentModalOpen}
                    onClose={() => setIsEditTournamentModalOpen(false)}
                    onUpdated={() => loadTournamentData(tournament.id)}
                    tournament={tournament}
                />
            )}
        </div >
    );
};

export default TournamentDetail;
