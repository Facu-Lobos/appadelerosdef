import type { User, PlayerProfile, ClubProfile, Court, Booking } from '../types';

// Mock Data
const MOCK_PLAYERS: PlayerProfile[] = [
    {
        id: 'p1',
        email: 'player@demo.com',
        role: 'player',
        name: 'Juan Pérez',
        category: 4,
        location: 'Buenos Aires',
        stats: { matches_played: 10, matches_won: 6, matches_lost: 4 },
        friends: ['p2'],
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juan'
    },
    {
        id: 'p2',
        email: 'maria@demo.com',
        role: 'player',
        name: 'María García',
        category: 5,
        location: 'Córdoba',
        stats: { matches_played: 15, matches_won: 10, matches_lost: 5 },
        friends: ['p1'],
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria'
    }
];

const MOCK_CLUBS: ClubProfile[] = [
    {
        id: 'c1',
        email: 'club@demo.com',
        role: 'club',
        name: 'Padel Center BA',
        location: 'Buenos Aires',
        courts_count: 4,
        photos: ['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80'],
        services: ['Bar', 'Parking', 'Shop'],
        description: 'El mejor club de la ciudad.'
    }
];

const MOCK_COURTS: Court[] = [
    { id: 'ct1', club_id: 'c1', name: 'Cancha 1', type: 'crystal', surface: 'synthetic', is_indoor: true },
    { id: 'ct2', club_id: 'c1', name: 'Cancha 2', type: 'crystal', surface: 'synthetic', is_indoor: true },
    { id: 'ct3', club_id: 'c1', name: 'Cancha 3', type: 'wall', surface: 'cement', is_indoor: false },
];

const MOCK_BOOKINGS: Booking[] = [];
// const MOCK_TOURNAMENTS: Tournament[] = [];

class SupabaseMockService {
    private currentUser: User | null = null;

    // Auth
    async signIn(email: string, role: 'player' | 'club'): Promise<{ user: User | null, error: string | null }> {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

        if (role === 'player') {
            const user = MOCK_PLAYERS.find(p => p.email === email);
            if (user) {
                this.currentUser = user;
                return { user, error: null };
            }
        } else {
            const user = MOCK_CLUBS.find(c => c.email === email);
            if (user) {
                this.currentUser = user;
                return { user, error: null };
            }
        }

        // Auto-register for demo purposes if not found
        const newUser = role === 'player'
            ? { ...MOCK_PLAYERS[0], id: Math.random().toString(), email, name: email.split('@')[0] }
            : { ...MOCK_CLUBS[0], id: Math.random().toString(), email, name: email.split('@')[0] };

        this.currentUser = newUser;
        return { user: newUser, error: null };
    }

    async signOut(): Promise<void> {
        this.currentUser = null;
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    // Data Access
    async getClubs(): Promise<ClubProfile[]> {
        return MOCK_CLUBS;
    }

    async getCourts(clubId: string): Promise<Court[]> {
        return MOCK_COURTS.filter(c => c.club_id === clubId);
    }

    async createBooking(booking: Omit<Booking, 'id'>): Promise<Booking> {
        const newBooking = { ...booking, id: Math.random().toString() };
        MOCK_BOOKINGS.push(newBooking);
        return newBooking;
    }

    async getBookings(userId: string): Promise<Booking[]> {
        return MOCK_BOOKINGS.filter(b => b.user_id === userId);
    }
}

export const supabase = new SupabaseMockService();
