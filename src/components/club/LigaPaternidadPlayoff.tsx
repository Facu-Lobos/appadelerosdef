import { useState, type ReactNode } from 'react';
import { Trophy, Shuffle, Plus, Calendar, Trash2, Check, X, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/Button';
import {
    getLigaPlayoffPools,
    getMatchPlayerIds,
    getPlayerName,
    LIGA_ROUND_PLAYER_COUNT,
    type LigaPlayoffRound,
} from '../../utils/ligaPaternidad';

interface LigaPaternidadPlayoffProps {
    registrations: any[];
    matches: any[];
    editable?: boolean;
    isBusy?: boolean;
    onDraw?: (round: LigaPlayoffRound, playerIds: string[]) => void;
    onAddManual?: (round: LigaPlayoffRound, pair1: [string, string], pair2: [string, string]) => Promise<boolean>;
    onDeleteMatch?: (match: any) => void;
    onEditScore?: (match: any) => void;
    onSchedule?: (match: any) => void;
    onFlyer?: (match: any) => void;
}

const ROUND_LABEL: Record<LigaPlayoffRound, string> = {
    quarter: 'Cuartos',
    semi: 'Semis',
    final: 'Final',
};

const pairLabel = (a: any, b: any) => `${getPlayerName(a)} / ${getPlayerName(b)}`;

export const LigaPaternidadPlayoff = ({
    registrations,
    matches,
    editable = false,
    isBusy = false,
    onDraw,
    onAddManual,
    onDeleteMatch,
    onEditScore,
    onSchedule,
    onFlyer,
}: LigaPaternidadPlayoffProps) => {
    const pools = getLigaPlayoffPools(registrations, matches);

    const playerStatus = (id: string, round: LigaPlayoffRound): 'winner' | 'loser' | 'pending' | 'unassigned' => {
        const match = pools.matchesByRound[round].find(m => getMatchPlayerIds(m).includes(id));
        if (!match) return 'unassigned';
        if (!match.winner_id) return 'pending';
        const team1 = [match.team1_id, match.team1_partner_id];
        const wonAsTeam1 = match.winner_id === match.team1_id;
        return team1.includes(id) === wonAsTeam1 ? 'winner' : 'loser';
    };

    const padSlots = (players: any[], size: number) =>
        [...players, ...Array(Math.max(0, size - players.length)).fill(null)].slice(0, size);

    return (
        <div className="space-y-4">
            {/* Celular: un bloque por ronda, uno debajo del otro. Escritorio: 6 columnas en fila. */}
            <div className="flex flex-col gap-4 lg:flex-row lg:gap-2">
                <RoundGroup>
                <PlayersColumn
                    title="Cuartos"
                    subtitle="Puestos 5° a 12°"
                    slots={padSlots(pools.quarterPlayers, 8)}
                    emptyLabel="Sin jugador"
                    positionOf={pools.positionOf}
                    statusOf={id => playerStatus(id, 'quarter')}
                />
                <MatchesColumn
                    round="quarter"
                    pool={pools.quarterPlayers}
                    matches={pools.matchesByRound.quarter}
                    editable={editable}
                    isBusy={isBusy}
                    onDraw={onDraw}
                    onAddManual={onAddManual}
                    onDeleteMatch={onDeleteMatch}
                    onEditScore={onEditScore}
                    onSchedule={onSchedule}
                    onFlyer={onFlyer}
                />
                </RoundGroup>
                <RoundGroup>
                <PlayersColumn
                    title="Semis"
                    subtitle="Puestos 1° a 4° + ganadores de cuartos"
                    slots={padSlots(pools.semiPlayers, 8)}
                    emptyLabel="Ganador de cuartos"
                    positionOf={pools.positionOf}
                    statusOf={id => playerStatus(id, 'semi')}
                />
                <MatchesColumn
                    round="semi"
                    pool={pools.semiPlayers}
                    matches={pools.matchesByRound.semi}
                    editable={editable}
                    isBusy={isBusy}
                    onDraw={onDraw}
                    onAddManual={onAddManual}
                    onDeleteMatch={onDeleteMatch}
                    onEditScore={onEditScore}
                    onSchedule={onSchedule}
                    onFlyer={onFlyer}
                />
                </RoundGroup>
                <RoundGroup>
                <PlayersColumn
                    title="Final"
                    subtitle="Ganadores de semis"
                    slots={padSlots(pools.finalPlayers, 4)}
                    emptyLabel="Ganador de semis"
                    positionOf={pools.positionOf}
                    statusOf={id => playerStatus(id, 'final')}
                />
                <MatchesColumn
                    round="final"
                    pool={pools.finalPlayers}
                    matches={pools.matchesByRound.final}
                    editable={editable}
                    isBusy={isBusy}
                    onDraw={onDraw}
                    onAddManual={onAddManual}
                    onDeleteMatch={onDeleteMatch}
                    onEditScore={onEditScore}
                    onSchedule={onSchedule}
                    onFlyer={onFlyer}
                    champions={pools.champions}
                />
                </RoundGroup>
            </div>

            {pools.eliminated.length > 0 && (
                <div className="bg-black/20 border border-white/5 rounded-xl p-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Eliminados en zona (13° en adelante)
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                        {pools.eliminated.map(reg => (
                            <span key={reg.id} className="text-[11px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                                {pools.positionOf(reg.id)}° {getPlayerName(reg)}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// En celular es una tarjeta por ronda; en escritorio desaparece y sus columnas quedan en la fila principal
const RoundGroup = ({ children }: { children: ReactNode }) => (
    <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3 lg:contents">
        {children}
    </div>
);

interface PlayersColumnProps {
    title: string;
    subtitle: string;
    slots: (any | null)[];
    emptyLabel: string;
    positionOf: (id: string) => number;
    statusOf: (id: string) => 'winner' | 'loser' | 'pending' | 'unassigned';
}

const PlayersColumn = ({ title, subtitle, slots, emptyLabel, positionOf, statusOf }: PlayersColumnProps) => (
    <div className="flex flex-col w-full lg:flex-1 lg:min-w-0">
        <div className="mb-2 lg:text-center">
            <h3 className="text-xs font-bold text-gray-300">{title} · Jugadores</h3>
            <p className="text-[10px] text-gray-500">{subtitle}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-1 bg-black/20 rounded-lg p-1.5 border border-white/5 lg:flex-1 lg:content-start">
            {slots.map((reg, idx) => {
                if (!reg) {
                    return (
                        <div key={`empty-${idx}`} className="text-[10px] italic text-gray-600 border border-dashed border-white/10 rounded px-1.5 py-1 truncate">
                            {emptyLabel}
                        </div>
                    );
                }
                const status = statusOf(reg.id);
                return (
                    <div
                        key={reg.id}
                        className={`flex items-center gap-1.5 text-[11px] rounded px-1.5 py-1 min-w-0 ${
                            status === 'winner' ? 'bg-green-500/10 text-green-400 font-bold' :
                            status === 'loser' ? 'bg-white/5 text-gray-600 line-through' :
                            'bg-white/5 text-gray-200'
                        }`}
                    >
                        <span className="font-mono text-[9px] text-gray-500 w-4 shrink-0">{positionOf(reg.id)}°</span>
                        <span className="truncate" title={getPlayerName(reg)}>{getPlayerName(reg)}</span>
                    </div>
                );
            })}
        </div>
    </div>
);

interface MatchesColumnProps {
    round: LigaPlayoffRound;
    pool: any[];
    matches: any[];
    editable: boolean;
    isBusy: boolean;
    onDraw?: LigaPaternidadPlayoffProps['onDraw'];
    onAddManual?: LigaPaternidadPlayoffProps['onAddManual'];
    onDeleteMatch?: (match: any) => void;
    onEditScore?: (match: any) => void;
    onSchedule?: (match: any) => void;
    onFlyer?: (match: any) => void;
    champions?: any[];
}

const MatchesColumn = ({
    round,
    pool,
    matches,
    editable,
    isBusy,
    onDraw,
    onAddManual,
    onDeleteMatch,
    onEditScore,
    onSchedule,
    onFlyer,
    champions = [],
}: MatchesColumnProps) => {
    const [showManual, setShowManual] = useState(false);
    const [picks, setPicks] = useState<string[]>(['', '', '', '']);

    const required = LIGA_ROUND_PLAYER_COUNT[round];
    const totalMatches = required / 4;
    const poolComplete = pool.length === required;
    const isFinal = round === 'final';

    const assignedIds = matches.flatMap(getMatchPlayerIds);
    const available = pool.filter(p => !assignedIds.includes(p.id));
    const canAddManual = matches.length < totalMatches && available.length >= 4;

    const savePicks = async () => {
        if (!onAddManual) return;
        const ok = await onAddManual(round, [picks[0], picks[1]], [picks[2], picks[3]]);
        if (ok) {
            setPicks(['', '', '', '']);
            setShowManual(false);
        }
    };

    const emptySlots = Math.max(0, totalMatches - matches.length);

    return (
        <div className="flex flex-col w-full lg:flex-[1.3] lg:min-w-0">
            <div className="mb-2 lg:text-center">
                <h3 className={`text-xs font-bold flex items-center lg:justify-center gap-1 ${isFinal ? 'text-yellow-500' : 'text-primary'}`}>
                    {isFinal && <Trophy size={12} />} {ROUND_LABEL[round]} · Cruces
                </h3>
                <p className="text-[10px] text-gray-500">
                    {totalMatches === 1 ? '1 partido' : `${totalMatches} partidos`} · parejas sorteadas
                </p>
            </div>

            {editable && (
                <div className="flex gap-1.5 mb-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 text-[11px] px-2 py-1 rounded-lg"
                        disabled={!poolComplete || isBusy}
                        onClick={() => onDraw?.(round, pool.map(p => p.id))}
                        title={poolComplete ? 'Sortear parejas y cruces' : `Faltan jugadores (${pool.length}/${required})`}
                    >
                        <Shuffle size={14} className="mr-1" /> Sortear
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 text-[11px] px-2 py-1 rounded-lg border border-white/10"
                        disabled={!canAddManual || isBusy}
                        onClick={() => setShowManual(!showManual)}
                    >
                        {showManual ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />} Manual
                    </Button>
                </div>
            )}

            {editable && showManual && canAddManual && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 mb-2 space-y-1.5">
                    {[0, 1, 2, 3].map(slot => (
                        <div key={slot}>
                            {slot === 2 && <div className="text-center text-[10px] font-bold text-gray-500 my-1">VS</div>}
                            <select
                                className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
                                value={picks[slot]}
                                onChange={e => setPicks(prev => prev.map((p, i) => (i === slot ? e.target.value : p)))}
                            >
                                <option value="">{slot < 2 ? `Pareja A · Jugador ${slot + 1}` : `Pareja B · Jugador ${slot - 1}`}</option>
                                {available
                                    .filter(p => p.id === picks[slot] || !picks.includes(p.id))
                                    .map(p => (
                                        <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                                    ))}
                            </select>
                        </div>
                    ))}
                    <Button
                        size="sm"
                        className="w-full text-xs"
                        disabled={picks.some(p => !p) || isBusy}
                        onClick={savePicks}
                    >
                        <Check size={14} className="mr-1" /> Guardar partido
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col lg:justify-around gap-2 lg:flex-1">
                {matches.map(match => (
                    <MatchCard
                        key={match.id}
                        match={match}
                        isFinal={isFinal}
                        editable={editable}
                        onDeleteMatch={onDeleteMatch}
                        onEditScore={onEditScore}
                        onSchedule={onSchedule}
                        onFlyer={onFlyer}
                    />
                ))}
                {Array.from({ length: emptySlots }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="border border-dashed border-white/10 rounded-lg p-2.5 text-center text-[11px] italic text-gray-600">
                        Partido {matches.length + idx + 1} · sin armar
                    </div>
                ))}
                {isFinal && champions.length > 0 && (
                    <div className="bg-gradient-to-b from-yellow-500/20 to-transparent border border-yellow-500/40 rounded-lg p-2 text-center sm:col-span-2">
                        <Trophy className="mx-auto text-yellow-400 mb-1" size={16} />
                        <div className="text-[10px] uppercase tracking-wider text-yellow-500/80 font-bold">Campeones</div>
                        <div className="text-sm font-bold text-yellow-300">{champions.map(getPlayerName).join(' / ')}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface MatchCardProps {
    match: any;
    isFinal: boolean;
    editable: boolean;
    onDeleteMatch?: (match: any) => void;
    onEditScore?: (match: any) => void;
    onSchedule?: (match: any) => void;
    onFlyer?: (match: any) => void;
}

const MatchCard = ({ match, isFinal, editable, onDeleteMatch, onEditScore, onSchedule, onFlyer }: MatchCardProps) => {
    const team1Won = match.winner_id && match.winner_id === match.team1_id;
    const team2Won = match.winner_id && match.winner_id === match.team2_id;
    const sets: string[] = match.score ? match.score.split(',').map((s: string) => s.trim()) : [];
    const winnerClass = isFinal ? 'bg-yellow-500/20 text-yellow-400 font-bold' : 'bg-green-500/10 text-green-400 font-bold';

    return (
        <div className={`${isFinal ? 'bg-gradient-to-b from-yellow-500/10 to-transparent border-yellow-500/30' : 'bg-white/5 border-white/10'} border rounded-lg p-1.5`}>
            <div className="flex justify-between items-start mb-1">
                <div className="flex flex-col">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isFinal ? 'text-yellow-500/70' : 'text-gray-500'}`}>
                        {match.group_name ? `P. ${match.group_name}` : 'Partido'}
                    </span>
                    {match.court ? (
                        <span className="flex items-center gap-1 text-[9px] text-blue-400 mt-0.5">
                            <MapPin size={8} />
                            {match.start_time ? format(new Date(match.start_time), 'dd/MM HH:mm', { locale: es }) : ''} - {match.court.name}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[9px] text-gray-500 italic mt-0.5">
                            <Clock size={8} /> Por definir
                        </span>
                    )}
                </div>
                {match.winner_id && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isFinal ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>FIN</span>
                )}
            </div>

            <div className="space-y-1">
                <div className={`flex justify-between items-center gap-2 px-1.5 py-1 rounded text-[11px] ${team1Won ? winnerClass : 'bg-black/20'}`}>
                    <span className="break-words">{pairLabel(match.team1, match.team1_partner)}</span>
                    {sets.length > 0 && <span className="font-mono font-bold shrink-0">{sets.map(s => s.split('-')[0]).join(' ')}</span>}
                </div>
                <div className={`flex justify-between items-center gap-2 px-1.5 py-1 rounded text-[11px] ${team2Won ? winnerClass : 'bg-black/20'}`}>
                    <span className="break-words">{pairLabel(match.team2, match.team2_partner)}</span>
                    {sets.length > 0 && <span className="font-mono font-bold shrink-0">{sets.map(s => s.split('-')[1]).join(' ')}</span>}
                </div>
            </div>

            {editable && (
                <div className="mt-1.5 flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                        <button className="text-blue-400 hover:text-blue-300 p-1" title="Programar" onClick={() => onSchedule?.(match)}>
                            <Calendar size={12} />
                        </button>
                        <button className="text-green-400 hover:text-green-300 text-[10px] px-1" title="Flyer" onClick={() => onFlyer?.(match)}>
                            Flyer
                        </button>
                        <button className="text-red-400 hover:text-red-300 p-1" title="Eliminar partido" onClick={() => onDeleteMatch?.(match)}>
                            <Trash2 size={12} />
                        </button>
                    </div>
                    <Button
                        size="sm"
                        variant={!match.winner_id && isFinal ? 'primary' : 'ghost'}
                        className={`text-[10px] h-6 px-2 ${!match.winner_id && isFinal ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}`}
                        onClick={() => onEditScore?.(match)}
                    >
                        {match.score ? 'Editar' : 'Cargar'}
                    </Button>
                </div>
            )}
        </div>
    );
};
