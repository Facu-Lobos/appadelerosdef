
import { supabase } from '../services/supabaseClient';
import { supabaseService } from '../services/supabaseService';
import { addDays, format } from 'date-fns';

export const seeder = {
    // Helper to create fake players
    async seedPlayers(count: number = 5) {
        const createdIds: string[] = [];
        console.log(`Attempting to seed ${count} players...`);

        for (let i = 0; i < count; i++) {
            const email = `player_demo_${Date.now()}_${i}@example.com`;
            const password = 'password123';
            const name = `Jugador Demo ${i + 1}`;

            try {
                // 1. Sign Up
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name,
                            role: 'player'
                        }
                    }
                });

                if (error) {
                    console.error(`Error creating player ${i}:`, error.message);
                    continue;
                }

                if (data.user) {
                    createdIds.push(data.user.id);
                    console.log(`Created player: ${email} (${data.user.id})`);

                    // FORCE LOGOUT to allow creating next user provided we are not hitting rate limits
                    // Wait a bit to ensure session is cleared?
                    await supabase.auth.signOut();
                }
            } catch (e) {
                console.error(e);
            }
        }
        return createdIds;
    },

    // NEW: Function to register players to a tournament
    // NEW: Function to register players to a tournament
    async seedTournamentRegistrations(clubId: string) {
        // 1. Get the Open Tournament
        const { data: tournaments } = await supabase
            .from('tournaments')
            .select('id')
            .eq('club_id', clubId)
            .eq('name', 'Torneo Apertura 2026')
            .single();

        if (!tournaments) {
            console.error("Tournament not found. Seed tournaments first.");
            return;
        }

        const tournamentId = tournaments.id;

        // 2. Get Players (assuming we created them with "player_demo" email)
        const { data: players } = await supabase
            .from('profiles')
            .select('id, name')
            .ilike('email', 'player_demo_%');

        if (!players || players.length < 32) {
            console.log(`Found only ${players?.length} players. Need 32 for full roster. Please run Seed Players first with enough count.`);
            // return; // Don't return, register what we have
        }

        console.log(`Registering ${Math.floor(players.length / 2)} teams...`);

        // 3. Create Pairs
        for (let i = 0; i < players.length; i += 2) {
            if (i + 1 >= players.length) break; // Need a pair

            const p1 = players[i];
            const p2 = players[i + 1];
            const teamName = `Team ${p1.name.split(' ').pop()} & ${p2.name.split(' ').pop()}`;

            // Check if already registered
            const { data: existing } = await supabase
                .from('tournament_registrations')
                .select('id')
                .eq('tournament_id', tournamentId)
                .or(`player1_id.eq.${p1.id},player2_id.eq.${p2.id}`);

            if (existing && existing.length > 0) continue;

            const { error } = await supabase
                .from('tournament_registrations')
                .insert([{
                    tournament_id: tournamentId,
                    player1_id: p1.id,
                    player2_id: p2.id,
                    team_name: teamName,
                    status: 'approved' // Auto approve for demo
                }]);

            if (error) console.error('Error registering team:', error);
            else console.log(`Registered team: ${teamName}`);
        }
    },

    async seedTournaments(clubId: string) {
        console.log('Seeding tournaments for club:', clubId);

        // 1. Create Open Tournament
        const openTournament = {
            club_id: clubId,
            name: 'Torneo Apertura 2026',
            start_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
            end_date: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
            category: '6ta',
            max_teams: 16,
            status: 'open' as const
        };

        try {
            await supabaseService.createTournament(openTournament);
            console.log('Created Open Tournament');
        } catch (e) {
            console.error('Error creating tournament:', e);
        }

        // 2. Create Ongoing Tournament (Simulated)
        const ongoingTournament = {
            club_id: clubId,
            name: 'Liga de Verano',
            start_date: format(new Date(), 'yyyy-MM-dd'),
            end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
            category: 'Libre',
            max_teams: 8,
            status: 'ongoing' as const
        };

        try {
            await supabaseService.createTournament(ongoingTournament);
            console.log('Created Ongoing Tournament');
        } catch (e) {
            console.error('Error creating ongoing tournament:', e);
        }
    },



    async seedBookings(clubId: string) {
        console.log('Seeding bookings for club:', clubId);

        // Get courts first
        const courts = await supabaseService.getClubCourts(clubId);
        if (!courts || courts.length === 0) {
            console.error('No courts found for this club. Create courts first.');
            return;
        }

        // Create bookings for the next 3 days
        const today = new Date();

        // We can't really create bookings "as other players" if RLS forbids it.
        // However, we can create bookings with "guest_name".
        // Or we can try to insert them directly if the table allows it?
        // Let's assume we use "guest_name" for visual fullness on the calendar.

        const guestNames = ['Juan Perez', 'Maria Garcia', 'Carlos Lopez', 'Ana Martinez', 'Lucas Goncalves'];

        for (let i = 0; i < 3; i++) {
            const targetDate = addDays(today, i);
            const dateStr = format(targetDate, 'yyyy-MM-dd');

            // Fill 40% of slots per court
            for (const court of courts) {
                for (let hour = 16; hour < 23; hour++) {
                    if (Math.random() > 0.6) { // 40% chance
                        const guest = guestNames[Math.floor(Math.random() * guestNames.length)];

                        // Construct booking object compatible with createBooking
                        // Construct booking object directly in insert


                        try {
                            const { error } = await supabase.from('bookings').insert([{
                                court_id: court.id,
                                start_time: new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:00:00`).toISOString(),
                                end_time: new Date(`${dateStr}T${(hour + 1).toString().padStart(2, '0')}:00:00`).toISOString(),
                                status: 'confirmed',
                                guest_name: guest,
                                payment_status: Math.random() > 0.5 ? 'paid' : 'unpaid'
                                // Not setting player_id
                            }]);

                            if (error) console.error('Error inserting booking:', error);
                            else console.log(`Booked ${court.name} at ${hour}:00 for ${guest}`);

                        } catch (e) {
                            console.error('Error seeding booking:', e);
                        }
                    }
                }
            }
        }
    }
};
