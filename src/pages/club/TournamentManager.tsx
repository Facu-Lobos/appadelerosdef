import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trophy, Calendar, Users, ChevronRight } from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import type { Tournament, ClubProfile } from '../../types';
import { Button } from '../../components/ui/Button';
import { CreateTournamentModal } from '../../components/CreateTournamentModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const TournamentManager = () => {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [clubProfile, setClubProfile] = useState<ClubProfile | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await supabaseService.getCurrentUser();
            if (user?.role === 'club') {
                setClubProfile(user as ClubProfile);
                const data = await supabaseService.getTournaments(user.id);
                setTournaments(data);
            }
        } catch (error) {
            console.error('Error loading tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Torneos</h1>
                    <p className="text-gray-400">Gestiona tus competiciones y ligas</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} icon={Plus}>
                    Nuevo Torneo
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-400">Cargando torneos...</div>
            ) : tournaments.length === 0 ? (
                <div className="bg-surface border border-white/10 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No hay torneos creados</h3>
                    <p className="text-gray-400 mb-6">Crea tu primer torneo para empezar a gestionar competiciones.</p>
                    <Button onClick={() => setIsCreateModalOpen(true)} variant="secondary">
                        Crear Torneo
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournaments.map((tournament) => (
                        <div
                            key={tournament.id}
                            className="bg-surface border border-white/10 rounded-2xl p-6 hover:border-primary/50 transition-colors group cursor-pointer"
                            onClick={() => navigate(`/club/tournaments/${tournament.id}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Trophy size={24} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${tournament.status === 'open' ? 'bg-green-500/20 text-green-400' :
                                    tournament.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {tournament.status === 'open' ? 'Inscripción Abierta' :
                                        tournament.status === 'ongoing' ? 'En Curso' : 'Finalizado'}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2">{tournament.name}</h3>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Calendar size={16} />
                                    <span>{format(new Date(tournament.start_date), "d 'de' MMMM", { locale: es })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Users size={16} />
                                    <span>Categoría {tournament.category} • {tournament.max_teams} Equipos</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                <span className="text-sm text-gray-400">Gestionar</span>
                                <Button size="sm" variant="ghost" onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/club/tournaments/${tournament.id}`);
                                }}>
                                    <ChevronRight size={20} className="text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {clubProfile && (
                <CreateTournamentModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onTournamentCreated={loadData}
                    clubId={clubProfile.id}
                />
            )}
        </div>
    );
};

export default TournamentManager;
