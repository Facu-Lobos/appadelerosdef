export type UserRole = 'player' | 'club';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    avatar_url?: string;
}

export interface PlayerProfile extends User {
    role: 'player';
    category: number; // 1-8
    location: string;
    gender?: 'Masculino' | 'Femenino';
    stats: {
        matches_played: number;
        matches_won: number;
        matches_lost: number;
    };
    friends: string[]; // user_ids
    availability?: string[]; // e.g. ['Mañanas', 'Fines de semana']
}

export interface ClubProfile extends User {
    role: 'club';
    location: string;
    courts_count: number;
    photos: string[];
    services: string[];
    description?: string;
    schedule?: ClubSchedule;
}

export interface ClubSchedule {
    opening_time: string; // HH:MM
    closing_time: string; // HH:MM
    slot_duration: number; // minutes, e.g., 60 or 90
    open_days: number[]; // 0-6, 0=Sunday
}

export interface Court {
    id: string;
    club_id: string;
    name: string;
    type: 'crystal' | 'wall';
    surface: 'synthetic' | 'cement';
    is_indoor: boolean;
    hourly_rate?: number;
}

export interface Booking {
    id: string;
    court_id: string;
    user_id: string;
    date: string; // ISO date string YYYY-MM-DD
    time: string; // HH:MM
    status: 'confirmed' | 'pending' | 'cancelled';
    price: number;
    payment_status?: 'paid' | 'unpaid';
    guest_name?: string;
    club_name?: string;
    court_name?: string;
}

export interface Tournament {
    id: string;
    club_id: string;
    club_name?: string;
    name: string;
    start_date: string;
    end_date: string;
    category: string; // Changed to string to support '6ta', '7ma' etc.
    gender?: 'Masculino' | 'Femenino' | 'Mixto';
    status: 'open' | 'ongoing' | 'finished';
    max_teams: number;
    created_at?: string;
}

export interface TournamentRegistration {
    id: string;
    tournament_id: string;
    team_name?: string;
    player1_id?: string;
    player2_id?: string;
    player1_name?: string; // For guests
    player2_name?: string; // For guests
    status: 'pending' | 'approved' | 'rejected';
    created_at?: string;
    // Advanced fields
    group_name?: string;
    stats?: {
        points: number;
        played: number;
        won: number;
        lost: number;
        sets_won: number;
        sets_lost: number;
        games_won: number;
        games_lost: number;
    };
    // Joined fields
    player1?: PlayerProfile;
    player2?: PlayerProfile;
}

export interface TournamentMatch {
    id: string;
    tournament_id: string;
    round: string; // 'group', 'quarter', 'semi', 'final'
    group_name?: string; // 'A', 'B' etc.
    stage?: string; // 'group', 'playoff'
    team1_id?: string; // Refers to TournamentRegistration id
    team2_id?: string;
    score?: string; // e.g. "6-4 6-2"
    sets_score?: { w: number; l: number }[]; // Detailed score
    winner_id?: string;
    court_id?: string;
    start_time?: string;
    // Joined fields
    team1?: TournamentRegistration;
    team2?: TournamentRegistration;
    court?: Court;
}

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    text?: string;
    created_at: string;
    timestamp?: string;
    read: boolean;
    sender?: {
        name: string;
        avatar_url?: string;
    };
}
