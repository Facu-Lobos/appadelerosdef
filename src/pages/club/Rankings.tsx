import { useState, useEffect } from 'react';
import { Trophy, Medal, RefreshCw, Trash2 } from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';

export default function ClubRankings() {
    const [category, setCategory] = useState('6ta');
    const [gender, setGender] = useState('Masculino');
    const [rankings, setRankings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadRankings();
    }, [category, gender]);

    const loadRankings = async () => {
        try {
            setLoading(true);
            const user = await supabaseService.getCurrentUser();
            if (!user) return;

            const data = await supabaseService.getClubRankings(user.id, category, gender);
            setRankings(data);
        } catch (error) {
            console.error('Error loading rankings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResetRanking = async () => {
        if (!window.confirm(`¿Estás seguro de que quieres reiniciar el ranking de la categoría ${category} (${gender})? Esta acción borrará todos los puntos acumulados.`)) {
            return;
        }

        try {
            setLoading(true);
            const user = await supabaseService.getCurrentUser();
            if (!user) return;

            await supabaseService.resetClubRankings(user.id, category, gender);
            await loadRankings();
        } catch (error) {
            console.error('Error resetting ranking:', error);
            alert('Error al reiniciar el ranking');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 w-full max-w-[100vw] overflow-x-hidden pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 md:px-0">
                <h1 className="text-2xl font-bold">Ranking del Club</h1>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto overflow-hidden">
                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                        <button
                            onClick={handleResetRanking}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                            title="Reiniciar Ranking"
                        >
                            <Trash2 size={20} />
                        </button>
                        <div className="flex gap-2 bg-surface/50 p-1 rounded-lg border border-white/5 overflow-x-auto max-w-full custom-scrollbar">
                            {['Masculino', 'Femenino', 'Mixto'].map(g => (
                                <button
                                    key={g}
                                    onClick={() => setGender(g)}
                                    className={`px-3 py-1 rounded-lg text-xs md:text-sm transition-colors whitespace-nowrap ${gender === g ? 'bg-blue-500 text-white font-bold' : 'text-gray-400 hover:bg-white/10'}`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-full h-px bg-white/10 md:w-px md:h-6 md:bg-white/10 mx-2 hidden md:block"></div>

                    <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar max-w-full">
                        {['8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors whitespace-nowrap ${category === cat ? 'bg-primary text-background font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-white/10 rounded-xl overflow-x-auto min-h-[400px] mx-4 md:mx-0">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                        <RefreshCw className="animate-spin mr-2" /> Cargando ranking...
                    </div>
                ) : rankings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Trophy className="h-12 w-12 mb-4 opacity-20" />
                        <p>No hay jugadores con puntos en esta categoría aún.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-black/20 text-left text-gray-400 text-sm">
                                <th className="p-4">Pos</th>
                                <th className="p-4">Jugador</th>
                                <th className="p-4 text-center">Puntos</th>
                                <th className="p-4 text-center">Categoría</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {rankings.map((player, index) => (
                                <tr key={player.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 font-bold">
                                            <span className={`text-lg w-8 text-center ${index < 3 ? 'text-white' : 'text-gray-500'}`}>
                                                {index + 1}
                                            </span>
                                            {index === 0 && <Trophy className="text-yellow-400" size={20} />}
                                            {index === 1 && <Medal className="text-gray-300" size={20} />}
                                            {index === 2 && <Medal className="text-orange-400" size={20} />}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium flex items-center gap-3">
                                        {player.avatar_url ? (
                                            <img
                                                src={player.avatar_url}
                                                alt={player.name}
                                                className="w-8 h-8 rounded-full object-cover border border-white/10"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                                {player.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        {player.name}
                                    </td>
                                    <td className="p-4 text-center font-bold text-primary text-lg">{player.points}</td>
                                    <td className="p-4 text-center text-gray-400">{player.category}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
