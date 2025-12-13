import type { User, ClubProfile, PlayerProfile, Court, Booking, Tournament, TournamentRegistration, TournamentMatch } from '../types';
import { supabase } from './supabaseClient';

export const supabaseService = {
    // Auth
    async signIn(role: 'player' | 'club') {
        console.log('Role:', role);
        return supabase.auth;
    },

    async signOut() {
        return supabase.auth.signOut();
    },

    // Helper to get profile directly
    async getProfile(userId: string) {
        console.log('supabaseService: getProfile called for', userId);
        try {
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timed out')), 15000)
            );

            const { data, error } = await Promise.race([
                profilePromise,
                timeoutPromise
            ]) as any;

            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            }

            // Inject default stats if missing
            const user = data as any;
            if (user.role === 'player' && !user.stats) {
                user.stats = {
                    matches_played: 0,
                    matches_won: 0,
                    matches_lost: 0
                };
                user.category = user.category || '6ta';
                user.location = user.location || 'Ubicación pendiente';
            }

            return user as User;
        } catch (error) {
            console.error('supabaseService: getProfile error', error);
            return null;
        }
    },

    async getCurrentUser() {
        console.log('supabaseService: getCurrentUser called');
        try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Session check timed out')), 15000)
            );

            const { data: { session }, error: sessionError } = await Promise.race([
                sessionPromise,
                timeoutPromise
            ]) as any;

            if (sessionError) throw sessionError;
            if (!session?.user) return null;

            return await this.getProfile(session.user.id);
        } catch (error) {
            console.error('supabaseService: getCurrentUser error', error);
            return null;
        }
    },

    async updateProfile(profile: Partial<User> & { category?: number | string, availability?: string[] }) {
        const { error } = await supabase
            .from('profiles')
            .update({
                name: profile.name,
                location: (profile as any).location,
                category: profile.category,
                avatar_url: profile.avatar_url,
            })
            .eq('id', profile.id);

        if (error) {
            console.error('Error updating profile:', error);
            return false;
        }
        return true;
    },

    async uploadProfileImage(userId: string, file: File) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        }
    },

    async searchPlayers(query: string) {
        let queryBuilder = supabase
            .from('profiles')
            .select('*')
            .eq('role', 'player');

        if (query) {
            queryBuilder = queryBuilder.or(`name.ilike.%${query}%,location.ilike.%${query}%,category.ilike.%${query}%`);
        }

        const { data, error } = await queryBuilder;

        if (error) {
            console.error('Error searching players:', error);
            return [];
        }
        return data as PlayerProfile[];
    },

    // Social Features
    async sendFriendRequest(receiverId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('friendships')
            .insert([{ requester_id: user.id, receiver_id: receiverId }]);

        if (error) {
            console.error('Error sending friend request:', error);
            return false;
        }
        return true;
    },

    async getFriendStatus(otherUserId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 'none';

        const { data, error } = await supabase
            .from('friendships')
            .select('status, requester_id')
            .or(`and(requester_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
            .single();

        if (error || !data) return 'none';
        return data.status; // 'pending', 'accepted', 'rejected'
    },

    async getPendingFriendRequests() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('friendships')
            .select('*, profiles:requester_id(name, avatar_url)')
            .eq('receiver_id', user.id)
            .eq('status', 'pending');

        if (error) {
            console.error('Error fetching pending requests:', error);
            return [];
        }
        return data;
    },

    async getUnreadMessages() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Fetch messages where receiver is current user and read is false
        // We also want to group by sender to not spam notifications
        const { data, error } = await supabase
            .from('messages')
            .select('*, sender:sender_id(name, avatar_url)')
            .eq('receiver_id', user.id)
            .eq('read', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching unread messages:', error);
            return [];
        }
        return data;
    },

    async getSentFriendRequests() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('friendships')
            .select('receiver_id')
            .eq('requester_id', user.id)
            .eq('status', 'pending');

        if (error) return [];
        return data.map(r => r.receiver_id);
    },

    async getFriends() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('friendships')
            .select('requester_id, receiver_id')
            .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .eq('status', 'accepted');

        if (error) {
            console.error('Error fetching friends:', error);
            return [];
        }

        // Extract friend IDs
        const friendIds = data.map((f: any) =>
            f.requester_id === user.id ? f.receiver_id : f.requester_id
        );

        return friendIds;
    },

    async respondToFriendRequest(requestId: string, status: 'accepted' | 'rejected') {
        const { error } = await supabase
            .from('friendships')
            .update({ status })
            .eq('id', requestId);

        if (error) {
            console.error('Error responding to friend request:', error);
            return false;
        }
        return true;
    },

    async getMessages(otherUserId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
        return data;
    },

    async sendMessage(receiverId: string, content: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('messages')
            .insert([{ sender_id: user.id, receiver_id: receiverId, content }]);

        if (error) {
            console.error('Error sending message:', error);
            return false;
        }
        return true;
    },

    // Data Fetching
    async getClubs() {
        const { data, error } = await supabase
            .from('clubs')
            .select('*, profiles(avatar_url, schedule)');

        if (error) throw error;

        return data.map((club: any) => ({
            ...club,
            role: 'club',
            avatar_url: club.profiles?.avatar_url,
            schedule: club.profiles?.schedule || club.schedule,
            photos: club.photos || ['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2940&auto=format&fit=crop'], // Default photo
            services: club.services || ['Estacionamiento', 'Vestuarios', 'Bar'] // Default services
        })) as ClubProfile[];
    },

    async getCourts(clubId: string) {
        const { data, error } = await supabase
            .from('courts')
            .select('*')
            .eq('club_id', clubId);

        if (error) throw error;
        return data as Court[];
    },

    async createBooking(booking: Omit<Booking, 'id' | 'status' | 'price'> & { price?: number }) {
        const bookingData: any = {
            court_id: booking.court_id,
            start_time: new Date(`${booking.date}T${booking.time.padStart(5, '0')}:00`).toISOString(),
            end_time: new Date(`${booking.date}T${(parseInt(booking.time) + 1).toString().padStart(2, '0')}:00:00`).toISOString(),
            status: 'confirmed',
            payment_status: 'unpaid'
        };

        // If price is not provided, fetch it from the court
        if (booking.price) {
            bookingData.price = booking.price;
        } else {
            const { data: court } = await supabase
                .from('courts')
                .select('hourly_rate')
                .eq('id', booking.court_id)
                .single();
            bookingData.price = court?.hourly_rate || 0;
        }

        if (booking.user_id) {
            bookingData.player_id = booking.user_id;
        }
        if (booking.guest_name) {
            bookingData.guest_name = booking.guest_name;
        }

        const { data, error } = await supabase
            .from('bookings')
            .insert([bookingData])
            .select()
            .single();

        if (error) throw error;

        // Map back to Booking interface
        const startTime = new Date(data.start_time);
        return {
            id: data.id,
            court_id: data.court_id,
            user_id: data.player_id,
            date: startTime.toISOString().split('T')[0],
            time: startTime.toTimeString().slice(0, 5),
            status: data.status,
            price: data.price,
            payment_status: data.payment_status,
            guest_name: data.guest_name
        } as Booking;
    },

    async getBookings(userId: string) {
        const { data, error } = await supabase
            .from('bookings')
            .select('*, courts(name, club_id, clubs(name, location))')
            .eq('player_id', userId)
            .order('start_time', { ascending: true });

        if (error) throw error;

        return data.map((b: any) => {
            const startTime = new Date(b.start_time);
            return {
                id: b.id,
                court_id: b.court_id,
                user_id: b.player_id,
                date: startTime.toISOString().split('T')[0],
                time: startTime.toTimeString().slice(0, 5),
                status: b.status,
                price: b.price,
                payment_status: b.payment_status,
                club_name: b.courts?.clubs?.name
            };
        }) as Booking[];
    },

    async getBookingsForCourt(courtId: string, date: string) {
        // Fetch bookings for the requested date +/- 1 day to handle timezone shifts
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        const { data, error } = await supabase
            .from('bookings')
            .select('start_time')
            .eq('court_id', courtId)
            .gte('start_time', startDate.toISOString())
            .lte('start_time', endDate.toISOString());

        if (error) {
            console.error('Error fetching court bookings:', error);
            return [];
        }

        // Filter client-side for the exact local date requested
        return data
            .filter((b: any) => {
                const bookingDate = new Date(b.start_time);
                // Compare YYYY-MM-DD in local time
                const bookingDateStr = bookingDate.getFullYear() + '-' +
                    String(bookingDate.getMonth() + 1).padStart(2, '0') + '-' +
                    String(bookingDate.getDate()).padStart(2, '0');
                return bookingDateStr === date;
            })
            .map((b: any) => {
                const dateObj = new Date(b.start_time);
                return dateObj.toTimeString().slice(0, 5); // Returns HH:MM
            });
    },

    async getClubBookings(clubId: string, date: string) {
        // Fetch bookings for the requested date +/- 1 day to handle timezone shifts
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select('*, courts!inner(club_id), profiles:player_id(name)')
            .eq('courts.club_id', clubId)
            .gte('start_time', startDate.toISOString())
            .lte('start_time', endDate.toISOString());

        if (bookingError) {
            console.error('Error fetching club bookings:', bookingError);
            return [];
        }

        return bookings
            .filter((b: any) => {
                const bookingDate = new Date(b.start_time);
                // Compare YYYY-MM-DD in local time
                const bookingDateStr = bookingDate.getFullYear() + '-' +
                    String(bookingDate.getMonth() + 1).padStart(2, '0') + '-' +
                    String(bookingDate.getDate()).padStart(2, '0');
                return bookingDateStr === date;
            })
            .map((b: any) => ({
                court_id: b.court_id,
                start_time: b.start_time,
                player_name: b.profiles?.name || b.guest_name || 'Reservado',
                id: b.id,
                price: b.price,
                payment_status: b.payment_status
            }));
    },

    async getClubAvailability(clubId: string, date: string) {
        // Fetch bookings for the requested date +/- 1 day to handle timezone shifts
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        const { data, error } = await supabase
            .from('bookings')
            .select('court_id, start_time, courts!inner(club_id)')
            .eq('courts.club_id', clubId)
            .gte('start_time', startDate.toISOString())
            .lte('start_time', endDate.toISOString());

        if (error) {
            console.error('Error fetching club availability:', error);
            return [];
        }

        return data
            .filter((b: any) => {
                const bookingDate = new Date(b.start_time);
                // Compare YYYY-MM-DD in local time
                const bookingDateStr = bookingDate.getFullYear() + '-' +
                    String(bookingDate.getMonth() + 1).padStart(2, '0') + '-' +
                    String(bookingDate.getDate()).padStart(2, '0');
                return bookingDateStr === date;
            })
            .map((b: any) => ({
                court_id: b.court_id,
                time: new Date(b.start_time).toTimeString().slice(0, 5)
            }));
    },

    async markBookingAsPaid(bookingId: string) {
        const { error } = await supabase
            .from('bookings')
            .update({ payment_status: 'paid' })
            .eq('id', bookingId);

        if (error) {
            console.error('Error marking booking as paid:', error);
            return false;
        }
        return true;
    },

    async getClubBookingsRange(clubId: string, startDate: string, endDate: string) {
        const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select('*, courts!inner(club_id), profiles:player_id(name)')
            .eq('courts.club_id', clubId)
            .gte('start_time', startDate)
            .lte('start_time', endDate);

        if (bookingError) {
            console.error('Error fetching club bookings range:', bookingError);
            return [];
        }

        return bookings.map((b: any) => ({
            id: b.id,
            court_id: b.court_id,
            start_time: b.start_time,
            price: b.price,
            payment_status: b.payment_status,
            status: b.status,
            player_name: b.profiles?.name,
            guest_name: b.guest_name
        }));
    },

    async updateCourt(courtId: string, updates: Partial<Court>) {
        const { error } = await supabase
            .from('courts')
            .update(updates)
            .eq('id', courtId);

        if (error) throw error;
    },

    // Club Management
    async updateClubProfile(profile: Partial<ClubProfile>) {
        const { error } = await supabase
            .from('profiles')
            .update({
                name: profile.name,
                location: profile.location,
                description: profile.description,
                schedule: profile.schedule,
                avatar_url: profile.avatar_url
            })
            .eq('id', profile.id);

        if (error) {
            console.error('Error updating club profile:', error);
            return false;
        }
        return true;
    },

    async getClubCourts(clubId: string) {
        const { data, error } = await supabase
            .from('courts')
            .select('*')
            .eq('club_id', clubId);

        if (error) {
            console.error('Error fetching club courts:', error);
            return [];
        }
        return data as Court[];
    },

    async addCourt(court: Omit<Court, 'id'>) {
        const { error } = await supabase
            .from('courts')
            .insert([court]);

        if (error) {
            console.error('Error adding court:', error);
            return false;
        }
        return true;
    },



    async deleteCourt(courtId: string) {
        const { error } = await supabase
            .from('courts')
            .delete()
            .eq('id', courtId);

        if (error) {
            console.error('Error deleting court:', error);
            return false;
        }
        return true;
    },

    // Tournament Methods
    async createTournament(tournament: Omit<Tournament, 'id' | 'created_at' | 'status'>) {
        const { data, error } = await supabase
            .from('tournaments')
            .insert([{ ...tournament, status: 'open' }])
            .select()
            .single();

        if (error) throw error;
        return data as Tournament;
    },

    async getTournaments(clubId?: string) {
        let query = supabase
            .from('tournaments')
            .select('*')
            .order('start_date', { ascending: true });

        if (clubId) {
            query = query.eq('club_id', clubId);
        }

        const { data: tournaments, error } = await query;
        if (error) throw error;

        // Manually fetch club names to avoid foreign key issues
        if (tournaments.length > 0) {
            const clubIds = [...new Set(tournaments.map((t: any) => t.club_id))];
            const { data: clubs } = await supabase
                .from('clubs')
                .select('id, name')
                .in('id', clubIds);

            const clubMap = new Map(clubs?.map((c: any) => [c.id, c.name]) || []);

            return tournaments.map((t: any) => ({
                ...t,
                club_name: clubMap.get(t.club_id)
            })) as Tournament[];
        }

        return tournaments as Tournament[];
    },

    async registerTeam(registration: Omit<TournamentRegistration, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('tournament_registrations')
            .insert([registration])
            .select()
            .single();

        if (error) throw error;
        return data as TournamentRegistration;
    },

    async getTournamentRegistrations(tournamentId: string) {
        const { data, error } = await supabase
            .from('tournament_registrations')
            .select('*, player1:profiles!player1_id(name, avatar_url), player2:profiles!player2_id(name, avatar_url)')
            .eq('tournament_id', tournamentId);

        if (error) throw error;
        return data as TournamentRegistration[];
    },

    async createTournamentMatch(match: Omit<TournamentMatch, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('tournament_matches')
            .insert([match])
            .select()
            .single();

        if (error) throw error;
        return data as TournamentMatch;
    },

    async getTournamentMatches(tournamentId: string) {
        const { data, error } = await supabase
            .from('tournament_matches')
            .select(`
                *,
                team1:tournament_registrations!team1_id(team_name, player1_name, player2_name, player1:profiles!player1_id(name), player2:profiles!player2_id(name)),
                team2:tournament_registrations!team2_id(team_name, player1_name, player2_name, player1:profiles!player1_id(name), player2:profiles!player2_id(name)),
                court:courts!court_id(name)
            `)
            .eq('tournament_id', tournamentId)
            .order('start_time', { ascending: true });

        if (error) throw error;
        return data as TournamentMatch[];
    },

    async updateMatchSchedule(matchId: string, schedule: { court_id: string; start_time: string }) {
        const { error } = await supabase
            .from('tournament_matches')
            .update(schedule)
            .eq('id', matchId);

        if (error) throw error;
    },

    async updateMatchScore(matchId: string, score: string, setsScore: { w: number, l: number }[], winnerId: string) {
        // 1. Update Match
        const { data: match, error: matchError } = await supabase
            .from('tournament_matches')
            .update({ score, sets_score: setsScore, winner_id: winnerId }) // Removed status column as it doesn't exist
            .eq('id', matchId)
            .select()
            .single();

        if (matchError) throw matchError;

        // 2. Recalculate Stats for the Group
        // Fetch all matches in this group
        const { data: groupMatches, error: groupError } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', match.tournament_id)
            .eq('group_name', match.group_name)
            .not('winner_id', 'is', null); // Only completed matches

        if (groupError) throw groupError;

        // Fetch all teams in this group
        const { data: teams, error: teamsError } = await supabase
            .from('tournament_registrations')
            .select('*')
            .eq('tournament_id', match.tournament_id)
            .eq('group_name', match.group_name);

        if (teamsError) throw teamsError;

        // Calculate Stats
        const statsMap: { [key: string]: any } = {};
        teams.forEach(team => {
            statsMap[team.id] = { points: 0, played: 0, won: 0, lost: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };
        });

        groupMatches.forEach(m => {
            const team1 = m.team1_id;
            const team2 = m.team2_id;
            const winner = m.winner_id;
            const loser = winner === team1 ? team2 : team1;

            if (statsMap[team1]) statsMap[team1].played++;
            if (statsMap[team2]) statsMap[team2].played++;

            if (statsMap[winner]) {
                statsMap[winner].won++;
                statsMap[winner].points += 3; // 3 points for win
            }
            if (statsMap[loser]) {
                statsMap[loser].lost++;
                // 0 points for loss
            }

            // Sets and Games
            if (m.sets_score && Array.isArray(m.sets_score)) {
                m.sets_score.forEach((set: { w: number, l: number }) => {
                    // Winner gets 'w' games, Loser gets 'l' games
                    // Winner gets 'w' games, Loser gets 'l' games
                    if (statsMap[winner]) {
                        statsMap[winner].games_won += set.w;
                        statsMap[winner].games_lost += set.l;
                    }
                    if (statsMap[loser]) {
                        statsMap[loser].games_won += set.l;
                        statsMap[loser].games_lost += set.w;
                    }

                    // Determine set winner
                    if (set.w > set.l) {
                        if (statsMap[winner]) statsMap[winner].sets_won += 1;
                        if (statsMap[loser]) statsMap[loser].sets_lost += 1;
                    } else {
                        if (statsMap[winner]) statsMap[winner].sets_lost += 1;
                        if (statsMap[loser]) statsMap[loser].sets_won += 1;
                    }
                });
            }
        });

        // 3. Update Teams (Only for group stage)
        if (match.stage === 'group') {
            for (const teamId in statsMap) {
                await supabase
                    .from('tournament_registrations')
                    .update({ stats: statsMap[teamId] })
                    .eq('id', teamId);
            }
        } else if (match.stage === 'playoff' && winnerId) {
            // Advance winner in playoffs
            await this.advancePlayoffWinner(match, winnerId);
        }

        return true;
    },

    async updateRegistrationStatus(registrationId: string, status: 'approved' | 'rejected') {
        const { error } = await supabase
            .from('tournament_registrations')
            .update({ status })
            .eq('id', registrationId);

        if (error) throw error;
        return true;
    },

    async generateGroupStage(tournamentId: string, teamsPerGroup: number = 4) {
        // 1. Get approved registrations
        const { data: registrations, error: regError } = await supabase
            .from('tournament_registrations')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('status', 'approved');

        if (regError) throw regError;
        if (!registrations || registrations.length < 3) {
            throw new Error('Se necesitan al menos 3 equipos para generar grupos.');
        }

        // 1.5 Clean up previous generation (if any)
        // Delete existing matches
        const { error: deleteMatchError } = await supabase
            .from('tournament_matches')
            .delete()
            .eq('tournament_id', tournamentId);

        if (deleteMatchError) throw deleteMatchError;

        // Reset existing groups and stats
        const { error: resetError } = await supabase
            .from('tournament_registrations')
            .update({ group_name: null, stats: null })
            .eq('tournament_id', tournamentId);

        if (resetError) throw resetError;

        // 2. Shuffle and Assign Groups
        const shuffled = [...registrations].sort(() => Math.random() - 0.5);
        const groups: { [key: string]: typeof registrations } = {};
        const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

        let currentGroupIndex = 0;
        const updates = [];

        // Distribute teams
        for (let i = 0; i < shuffled.length; i++) {
            const groupName = groupNames[currentGroupIndex];
            if (!groups[groupName]) groups[groupName] = [];

            groups[groupName].push(shuffled[i]);

            // Update team with group name and init stats
            updates.push({
                id: shuffled[i].id,
                group_name: groupName,
                stats: { points: 0, played: 0, won: 0, lost: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 }
            });

            // Move to next group if full
            if (groups[groupName].length >= teamsPerGroup) {
                currentGroupIndex++;
            }
        }

        // Batch update registrations
        for (const update of updates) {
            await supabase
                .from('tournament_registrations')
                .update({ group_name: update.group_name, stats: update.stats })
                .eq('id', update.id);
        }

        // 3. Generate Matches (Round Robin)
        const matches = [];
        for (const groupName in groups) {
            const teams = groups[groupName];
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    matches.push({
                        tournament_id: tournamentId,
                        round: 'group',
                        stage: 'group',
                        group_name: groupName,
                        team1_id: teams[i].id,
                        team2_id: teams[j].id,
                        start_time: new Date().toISOString() // Placeholder
                    });
                }
            }
        }

        const { error: matchError } = await supabase
            .from('tournament_matches')
            .insert(matches);

        if (matchError) throw matchError;

        // 4. Update tournament status
        await supabase
            .from('tournaments')
            .update({ status: 'ongoing' })
            .eq('id', tournamentId);

        return true;
    },

    async calculateTournamentPoints(tournamentId: string) {
        // 1. Get tournament details
        const { data: tournament, error: tError } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', tournamentId)
            .single();

        if (tError) throw tError;

        // 2. Get all registrations (teams)
        const { data: registrations, error: rError } = await supabase
            .from('tournament_registrations')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('status', 'approved');

        if (rError) throw rError;

        // 3. Get all matches
        const { data: matches, error: mError } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', tournamentId);

        if (mError) throw mError;

        // 4. Determine player progress
        const playerPoints: { [key: string]: number } = {};

        // Helper to add points
        const addPoints = (playerId: string, points: number) => {
            if (!playerPoints[playerId]) playerPoints[playerId] = 0;
            // Keep the highest points (in case logic overlaps, though here we'll assign based on max stage reached)
            if (points > playerPoints[playerId]) playerPoints[playerId] = points;
        };

        // Default: 25 points for participation (Group Stage)
        registrations.forEach((reg: any) => {
            if (reg.player1_id) addPoints(reg.player1_id, 25);
            if (reg.player2_id) addPoints(reg.player2_id, 25);
        });

        // Analyze matches to upgrade points
        // We need to find who reached which round.
        // Round of 16 losers -> 50 pts (implied they reached R16)
        // Quarter losers -> 75 pts
        // Semi losers -> 100 pts
        // Final loser -> 150 pts
        // Final winner -> 200 pts

        // Filter valid matches (not group)
        const playoffMatches = matches.filter((m: any) => m.stage === 'playoff' && m.winner_id);

        playoffMatches.forEach((match: any) => {
            const winnerId = match.winner_id;
            const loserId = match.team1_id === winnerId ? match.team2_id : match.team1_id;

            const winnerTeam = registrations.find((r: any) => r.id === winnerId);
            const loserTeam = registrations.find((r: any) => r.id === loserId);

            if (!winnerTeam || !loserTeam) return;

            // Points for the LOSER of this round (they reached this stage but didn't advance)
            let loserPoints = 0;
            if (match.round === 'round_16') loserPoints = 50;
            else if (match.round === 'quarter') loserPoints = 75;
            else if (match.round === 'semi') loserPoints = 100;
            else if (match.round === 'final') loserPoints = 150;

            if (loserTeam.player1_id) addPoints(loserTeam.player1_id, loserPoints);
            if (loserTeam.player2_id) addPoints(loserTeam.player2_id, loserPoints);

            // Points for the WINNER (at least this much, will be overwritten if they win next round)
            // If it's the FINAL, winner gets 200.
            if (match.round === 'final') {
                if (winnerTeam.player1_id) addPoints(winnerTeam.player1_id, 200);
                if (winnerTeam.player2_id) addPoints(winnerTeam.player2_id, 200);
            } else {
                // For other rounds, winner is guaranteed at least the points of the NEXT round loser
                // But we can just leave it as base 25 and let the next match update it, 
                // OR assign the "winner of this round" points.
                // Actually, simpler:
                // R16 Winner -> Guaranteed 75 (reached QF)
                // QF Winner -> Guaranteed 100 (reached SF)
                // SF Winner -> Guaranteed 150 (reached Final)
                let winnerGuaranteed = 0;
                if (match.round === 'round_16') winnerGuaranteed = 75;
                else if (match.round === 'quarter') winnerGuaranteed = 100;
                else if (match.round === 'semi') winnerGuaranteed = 150;

                if (winnerTeam.player1_id) addPoints(winnerTeam.player1_id, winnerGuaranteed);
                if (winnerTeam.player2_id) addPoints(winnerTeam.player2_id, winnerGuaranteed);
            }
        });

        // 5. Save to DB
        const pointsEntries = Object.entries(playerPoints).map(([playerId, points]) => ({
            tournament_id: tournamentId,
            player_id: playerId,
            points: points,
            category: tournament.category,
            gender: tournament.gender // Save gender to ranking points
        }));

        // Delete existing points for this tournament to avoid duplicates/conflicts
        await supabase.from('ranking_points').delete().eq('tournament_id', tournamentId);

        const { error: insertError } = await supabase
            .from('ranking_points')
            .insert(pointsEntries);

        if (insertError) throw insertError;

        // 6. Mark tournament as finished
        await supabase
            .from('tournaments')
            .update({ status: 'finished' })
            .eq('id', tournamentId);

        return true;
    },

    async getClubRankings(clubId: string, category?: string, gender?: string) {
        // 1. Get tournaments for this club
        const { data: tournaments } = await supabase
            .from('tournaments')
            .select('id')
            .eq('club_id', clubId);

        if (!tournaments || tournaments.length === 0) return [];

        const tournamentIds = tournaments.map(t => t.id);

        // 2. Get points for these tournaments
        let query = supabase
            .from('ranking_points')
            .select('player_id, points, category, gender, profiles:player_id(name, avatar_url)')
            .in('tournament_id', tournamentIds);

        if (category) {
            query = query.eq('category', category);
        }

        if (gender) {
            query = query.eq('gender', gender);
        }

        const { data: pointsData, error } = await query;

        if (error) throw error;

        // 3. Aggregate points per player
        const rankingMap: { [key: string]: any } = {};

        pointsData.forEach((entry: any) => {
            const playerId = entry.player_id;
            if (!rankingMap[playerId]) {
                rankingMap[playerId] = {
                    id: playerId,
                    name: entry.profiles?.name || 'Jugador',
                    avatar_url: entry.profiles?.avatar_url,
                    points: 0,
                    category: entry.category,
                    matches: 0, // We could fetch this separately if needed
                    winRate: 'N/A'
                };
            }
            rankingMap[playerId].points += entry.points;
        });

        return Object.values(rankingMap).sort((a: any, b: any) => b.points - a.points);
    },

    async resetClubRankings(clubId: string, category?: string, gender?: string) {
        // 1. Get club tournaments
        const { data: tournaments } = await supabase
            .from('tournaments')
            .select('id')
            .eq('club_id', clubId);

        if (!tournaments || tournaments.length === 0) return;

        const tournamentIds = tournaments.map(t => t.id);

        // 2. Delete ranking points
        let query = supabase
            .from('ranking_points')
            .delete()
            .in('tournament_id', tournamentIds);

        if (category) {
            query = query.eq('category', category);
        }

        if (gender) {
            query = query.eq('gender', gender);
        }

        const { error } = await query;
        if (error) throw error;
    },

    async resetGroupStage(tournamentId: string) {
        // 1. Delete matches
        const { error: deleteMatchError } = await supabase
            .from('tournament_matches')
            .delete()
            .eq('tournament_id', tournamentId);

        if (deleteMatchError) throw deleteMatchError;

        // 2. Reset registrations
        const { error: resetError } = await supabase
            .from('tournament_registrations')
            .update({ group_name: null, stats: null })
            .eq('tournament_id', tournamentId);

        if (resetError) throw resetError;

        // 3. Update tournament status back to open if needed, or keep ongoing?
        // Usually if we reset groups we might want to go back to 'open' to allow more registrations,
        // or stay 'ongoing' if we just want to re-generate. 
        // Let's keep it simple and just reset data.

        return true;
    },

    async generatePlayoffs(tournamentId: string) {
        // 1. Get all registrations with stats
        const { data: registrations, error: regError } = await supabase
            .from('tournament_registrations')
            .select('*')
            .eq('tournament_id', tournamentId)
            .not('group_name', 'is', null);

        if (regError) throw regError;

        // 2. Group by group_name to determine qualifiers
        const groups: { [key: string]: typeof registrations } = {};
        registrations.forEach(reg => {
            if (!groups[reg.group_name!]) groups[reg.group_name!] = [];
            groups[reg.group_name!].push(reg);
        });

        let allQualifiers: typeof registrations = [];

        // Qualification Logic:
        // Group size >= 4: Top 3 qualify
        // Group size < 4: Top 2 qualify
        for (const groupName in groups) {
            const groupTeams = groups[groupName];
            const sorted = groupTeams.sort((a, b) => {
                const statsA = a.stats || { points: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };
                const statsB = b.stats || { points: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };

                if (statsB.points !== statsA.points) return statsB.points - statsA.points;

                const setDiffA = (statsA.sets_won || 0) - (statsA.sets_lost || 0);
                const setDiffB = (statsB.sets_won || 0) - (statsB.sets_lost || 0);
                if (setDiffB !== setDiffA) return setDiffB - setDiffA;

                const gameDiffA = (statsA.games_won || 0) - (statsA.games_lost || 0);
                const gameDiffB = (statsB.games_won || 0) - (statsB.games_lost || 0);
                return gameDiffB - gameDiffA;
            });

            const qualifyCount = groupTeams.length >= 4 ? 3 : 2;
            allQualifiers.push(...sorted.slice(0, qualifyCount));
        }

        if (allQualifiers.length < 2) {
            throw new Error('No hay suficientes equipos clasificados para generar playoffs (mínimo 2).');
        }

        // 3. Global Ranking of Qualifiers
        allQualifiers.sort((a, b) => {
            const statsA = a.stats || { points: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };
            const statsB = b.stats || { points: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };

            if (statsB.points !== statsA.points) return statsB.points - statsA.points;

            const setDiffA = (statsA.sets_won || 0) - (statsA.sets_lost || 0);
            const setDiffB = (statsB.sets_won || 0) - (statsB.sets_lost || 0);
            if (setDiffB !== setDiffA) return setDiffB - setDiffA;

            const gameDiffA = (statsA.games_won || 0) - (statsA.games_lost || 0);
            const gameDiffB = (statsB.games_won || 0) - (statsB.games_lost || 0);
            return gameDiffB - gameDiffA;
        });

        // 4. Determine Bracket Size (Next Power of 2)
        const totalQualifiers = allQualifiers.length;
        let bracketSize = 2;
        while (bracketSize < totalQualifiers) {
            bracketSize *= 2;
        }

        // 5. Generate Seeding Order
        // Helper to generate standard bracket seeding (1 vs 8, 4 vs 5, etc.)
        const getSeedingOrder = (size: number): number[] => {
            if (size === 2) return [1, 2];
            const prev = getSeedingOrder(size / 2);
            const next: number[] = [];
            for (const p of prev) {
                next.push(p);
                next.push(size - p + 1);
            }
            return next;
        };

        const seeds = getSeedingOrder(bracketSize);
        const matches = [];
        const timestamp = new Date().getTime(); // Use timestamp for ordering

        // 6. Generate First Round Matches
        // We generate matches for the full bracketSize.
        // If a seed > totalQualifiers, it's a BYE.

        const firstRoundName = bracketSize === 16 ? 'round_16' :
            bracketSize === 8 ? 'quarter' :
                bracketSize === 4 ? 'semi' : 'final';

        const firstRoundMatches = [];
        for (let i = 0; i < bracketSize / 2; i++) {
            const seed1 = seeds[i * 2];
            const seed2 = seeds[i * 2 + 1];

            const team1 = allQualifiers[seed1 - 1];
            const team2 = allQualifiers[seed2 - 1]; // Might be undefined if seed > totalQualifiers (Bye)

            const match: any = {
                tournament_id: tournamentId,
                round: firstRoundName,
                stage: 'playoff',
                start_time: new Date(timestamp + i * 1000).toISOString(), // Increment time to preserve order
                group_name: `M${i + 1}` // Store match number in group_name for linking
            };

            if (team1) match.team1_id = team1.id;
            if (team2) match.team2_id = team2.id;

            if (team1 && !team2) {
                // BYE for Team 1
                match.winner_id = team1.id;
                match.score = 'BYE';
                match.sets_score = [];
            } else if (!team1 && team2) {
                // BYE for Team 2 (Shouldn't happen with standard seeding if sorted correctly)
                match.winner_id = team2.id;
                match.score = 'BYE';
                match.sets_score = [];
            }

            firstRoundMatches.push(match);
            matches.push(match);
        }

        // 7. Generate Subsequent Rounds (Placeholders)
        let currentSize = bracketSize / 2;
        let roundIndex = 1;
        while (currentSize >= 2) { // Stop after Final (size 2 -> 1 match)
            const roundName = currentSize === 8 ? 'quarter' :
                currentSize === 4 ? 'semi' : 'final';

            for (let i = 0; i < currentSize / 2; i++) {
                matches.push({
                    tournament_id: tournamentId,
                    round: roundName,
                    stage: 'playoff',
                    start_time: new Date(timestamp + (10000 * roundIndex) + (i * 1000)).toISOString(),
                    group_name: `M${i + 1}`
                });
            }
            currentSize /= 2;
            roundIndex++;
        }

        // 8. Save Matches
        const { data: savedMatches, error: insertError } = await supabase
            .from('tournament_matches')
            .insert(matches)
            .select();

        if (insertError) throw insertError;

        // 9. Process Byes (Advance winners)
        // We need to call advancePlayoffWinner for matches that are already 'completed' (Byes)
        const byeMatches = savedMatches.filter(m => m.score === 'BYE' && m.winner_id);
        for (const match of byeMatches) {
            await this.advancePlayoffWinner(match, match.winner_id);
        }

        return true;
    },

    async advancePlayoffWinner(match: TournamentMatch, winnerId: string) {
        if (match.stage !== 'playoff') return;

        // Determine next round
        let nextRound = '';
        if (match.round === 'round_16') nextRound = 'quarter';
        else if (match.round === 'quarter') nextRound = 'semi';
        else if (match.round === 'semi') nextRound = 'final';
        else return; // Final winner is tournament winner

        // Find all matches in current round to determine our index
        const { data: currentRoundMatches, error: currError } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', match.tournament_id)
            .eq('round', match.round)
            .eq('stage', 'playoff')
            .order('start_time', { ascending: true }); // Order by start_time which we hacked to be sequential

        if (currError || !currentRoundMatches) return;

        const myIndex = currentRoundMatches.findIndex(m => m.id === match.id);
        if (myIndex === -1) return;

        // Target match index in next round is floor(myIndex / 2)
        const targetIndex = Math.floor(myIndex / 2);
        const isTeam1 = myIndex % 2 === 0; // Even index -> Team 1, Odd index -> Team 2

        // Find target match
        const { data: nextRoundMatches, error: nextError } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', match.tournament_id)
            .eq('round', nextRound)
            .eq('stage', 'playoff')
            .order('start_time', { ascending: true });

        if (nextError || !nextRoundMatches) return;

        const targetMatch = nextRoundMatches[targetIndex];

        if (targetMatch) {
            const updateData: any = {};
            if (isTeam1) updateData.team1_id = winnerId;
            else updateData.team2_id = winnerId;

            await supabase
                .from('tournament_matches')
                .update(updateData)
                .eq('id', targetMatch.id);
        }
    },



    async simulateGroupStageResults(tournamentId: string) {
        // 1. Get all group matches
        const { data: matches, error } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('stage', 'group');

        if (error) throw error;

        // 2. Iterate and update with random scores
        for (const match of matches) {
            // Random winner
            const winnerId = Math.random() > 0.5 ? match.team1_id : match.team2_id;

            // Random score (2-0 or 2-1)
            const sets = [];
            if (Math.random() > 0.3) {
                // 2-0
                sets.push({ w: 6, l: Math.floor(Math.random() * 5) });
                sets.push({ w: 6, l: Math.floor(Math.random() * 5) });
            } else {
                // 2-1
                sets.push({ w: 6, l: Math.floor(Math.random() * 5) });
                sets.push({ w: Math.floor(Math.random() * 5), l: 6 });
                sets.push({ w: 6, l: Math.floor(Math.random() * 5) });
            }

            const scoreString = sets.map(s => {
                if (winnerId === match.team1_id) {
                    return `${s.w}-${s.l}`;
                } else {
                    return `${s.l}-${s.w}`;
                }
            }).join(', ');

            // We need to pass sets relative to winner/loser as expected by updateMatchScore logic (which we fixed in frontend but service expects winner/loser)
            // Actually, updateMatchScore expects setsScore where 'w' is games for winner and 'l' is games for loser.
            // My generation above does exactly that (w is always 6 or winning number).

            await this.updateMatchScore(match.id, scoreString, sets, winnerId);
        }

        return true;
    },

    async simulatePlayoffResults(tournamentId: string) {
        // Simulate round by round to ensure progression
        const rounds = ['round_16', 'quarter', 'semi', 'final'];

        for (const round of rounds) {
            // Get matches for this round that are ready (have both teams) but not finished
            const { data: matches, error } = await supabase
                .from('tournament_matches')
                .select('*')
                .eq('tournament_id', tournamentId)
                .eq('stage', 'playoff')
                .eq('round', round)
                .is('winner_id', null)
                .not('team1_id', 'is', null)
                .not('team2_id', 'is', null);

            if (error) throw error;

            if (matches && matches.length > 0) {
                for (const match of matches) {
                    // Random winner
                    const winnerId = Math.random() > 0.5 ? match.team1_id : match.team2_id;

                    // Random score
                    const sets = [];
                    if (Math.random() > 0.3) {
                        sets.push({ w: 6, l: Math.floor(Math.random() * 5) });
                        sets.push({ w: 6, l: Math.floor(Math.random() * 5) });
                    } else {
                        sets.push({ w: 6, l: Math.floor(Math.random() * 5) });
                        sets.push({ w: Math.floor(Math.random() * 5), l: 6 });
                        sets.push({ w: 6, l: Math.floor(Math.random() * 5) });
                    }
                    const scoreString = sets.map(s => {
                        if (winnerId === match.team1_id) {
                            return `${s.w}-${s.l}`;
                        } else {
                            return `${s.l}-${s.w}`;
                        }
                    }).join(', ');

                    await this.updateMatchScore(match.id, scoreString, sets, winnerId);

                    // Wait a bit to ensure DB updates trigger (if any triggers exist) or just to be safe
                    // But importantly, we must manually advance the winner because updateMatchScore calls advancePlayoffWinner internally?
                    // Let's check updateMatchScore.
                    // It calls advancePlayoffWinner. So we are good.
                }
            }
        }
        return true;
    }
};
