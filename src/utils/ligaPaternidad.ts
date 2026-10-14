// Fase final de la Liga de la Paternidad.
// Puestos 1-4 van directo a semis, 5-12 juegan cuartos, 13+ quedan eliminados.
// En cada ronda las parejas se sortean (o se arman a mano) entre los jugadores de esa ronda.

export type LigaPlayoffRound = 'quarter' | 'semi' | 'final';

export const LIGA_PLAYOFF_ROUNDS: LigaPlayoffRound[] = ['quarter', 'semi', 'final'];

export const LIGA_DIRECT_SEMI_COUNT = 4;
export const LIGA_QUARTER_LAST_POSITION = 12;

// Jugadores que participan en cada ronda (siempre partidos 2v2)
export const LIGA_ROUND_PLAYER_COUNT: Record<LigaPlayoffRound, number> = {
    quarter: 8,
    semi: 8,
    final: 4,
};

export const getPlayerName = (reg: any): string =>
    reg?.player1?.name || reg?.player1_name || reg?.team_name || 'Jugador';

export const compareStandings = (a: any, b: any) => {
    const statsA = a.stats || { points: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };
    const statsB = b.stats || { points: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };

    if ((statsB.points || 0) !== (statsA.points || 0)) return (statsB.points || 0) - (statsA.points || 0);

    const setDiffA = (statsA.sets_won || 0) - (statsA.sets_lost || 0);
    const setDiffB = (statsB.sets_won || 0) - (statsB.sets_lost || 0);
    if (setDiffB !== setDiffA) return setDiffB - setDiffA;

    const gameDiffA = (statsA.games_won || 0) - (statsA.games_lost || 0);
    const gameDiffB = (statsB.games_won || 0) - (statsB.games_lost || 0);
    return gameDiffB - gameDiffA;
};

export const getMatchPlayerIds = (m: any): string[] =>
    [m.team1_id, m.team1_partner_id, m.team2_id, m.team2_partner_id].filter(Boolean);

export const getMatchWinnerIds = (m: any): string[] => {
    if (!m.winner_id) return [];
    if (m.winner_id === m.team1_id) return [m.team1_id, m.team1_partner_id].filter(Boolean);
    if (m.winner_id === m.team2_id) return [m.team2_id, m.team2_partner_id].filter(Boolean);
    return [];
};

export const getLigaRoundMatches = (matches: any[], round: LigaPlayoffRound) =>
    matches
        .filter(m => m.stage === 'playoff' && m.round === round)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

export const getLigaPlayoffPools = (registrations: any[], matches: any[]) => {
    const standings = registrations.filter(r => r.status === 'approved').sort(compareStandings);
    const byId = (id: string) => registrations.find(r => r.id === id) || null;

    const directSemi = standings.slice(0, LIGA_DIRECT_SEMI_COUNT);
    const quarterPlayers = standings.slice(LIGA_DIRECT_SEMI_COUNT, LIGA_QUARTER_LAST_POSITION);
    const eliminated = standings.slice(LIGA_QUARTER_LAST_POSITION);

    const quarterMatches = getLigaRoundMatches(matches, 'quarter');
    const semiMatches = getLigaRoundMatches(matches, 'semi');
    const finalMatches = getLigaRoundMatches(matches, 'final');

    const quarterWinners = quarterMatches.flatMap(getMatchWinnerIds).map(byId).filter(Boolean);
    const semiWinners = semiMatches.flatMap(getMatchWinnerIds).map(byId).filter(Boolean);
    const champions = finalMatches.flatMap(getMatchWinnerIds).map(byId).filter(Boolean);

    return {
        standings,
        directSemi,
        quarterPlayers,
        eliminated,
        quarterWinners,
        // 4 directos + ganadores de cuartos
        semiPlayers: [...directSemi, ...quarterWinners],
        finalPlayers: semiWinners,
        champions,
        matchesByRound: { quarter: quarterMatches, semi: semiMatches, final: finalMatches } as Record<LigaPlayoffRound, any[]>,
        positionOf: (id: string) => standings.findIndex(r => r.id === id) + 1,
    };
};

// Fisher-Yates
export const shuffle = <T,>(items: T[]): T[] => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};
