import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabaseService } from '../../services/supabaseService';
import { MatchShareModal } from '../../components/MatchShareModal';
import { Button } from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function MatchSharePage() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchMatch = async () => {
            if (!id) return;
            try {
                // Fetch match with related data
                const { data, error } = await supabaseService.getClient()
                    .from('tournament_matches')
                    .select(`
                        *,
                        tournaments:tournament_id (
                            name,
                            club_id,
                            clubs:club_id ( name )
                        ),
                        p1:player1_id ( name ),
                        p2:player2_id ( name ),
                        p3:player3_id ( name ),
                        p4:player4_id ( name )
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (data) {
                    setMatchData({
                        tournamentName: data.tournaments?.name || 'Torneo',
                        clubName: data.tournaments?.clubs?.name || 'Club',
                        category: data.category || 'Categoría Unica',
                        team1: {
                            name1: data.p1?.name || 'Jugador 1',
                            name2: data.p3?.name
                        },
                        team2: {
                            name1: data.p2?.name || 'Jugador 2',
                            name2: data.p4?.name
                        },
                        result: data.score
                    });

                    // If share param is present, open modal automatically
                    if (searchParams.get('share') === 'true') {
                        setShowModal(true);
                    }
                }
            } catch (err) {
                console.error('Error loading match', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMatch();
    }, [id, searchParams]);

    if (loading) return <div className="flex h-screen items-center justify-center">Cargando partido...</div>;
    if (!matchData) return <div className="flex h-screen items-center justify-center">Partido no encontrado</div>;

    return (
        <div className="container mx-auto p-4 space-y-4">
            <Button variant="ghost" onClick={() => navigate('/player/tournaments')}>
                <ArrowLeft className="mr-2" size={20} />
                Volver a Torneos
            </Button>

            <div className="bg-surface border border-white/10 rounded-xl p-6 text-center max-w-md mx-auto mt-10">
                <h1 className="text-2xl font-bold mb-2">Detalles del Partido</h1>
                <p className="text-gray-400 mb-8">{matchData.tournamentName}</p>

                <div className="text-3xl font-black text-primary mb-8">{matchData.result}</div>

                <Button onClick={() => setShowModal(true)}>
                    Compartir Resultado
                </Button>
            </div>

            <MatchShareModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                matchData={matchData}
            />
        </div>
    );
}
