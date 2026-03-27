import type { User, ClubProfile, PlayerProfile, Court, Booking, Tournament, TournamentRegistration, TournamentMatch } from '../types';
import { supabase } from './supabaseClient';

export const supabaseService = {
    getClient() {
        return supabase;
    },
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
            // Add a quicker return if no session to avoid hanging
            if (!session || !session.user) return null;

            return await this.getProfile(session.user.id);
        } catch (error) {
            console.error('supabaseService: getCurrentUser error', error);
            // Don't return null immediately if it's just a timeout, maybe try to recover? 
            // For now, consistent with existing logic.
            return null;
        }
    },

    // New Helper: Remove Friend
    async removeFriend(friendId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Delete from friendships where (requester=me AND receiver=them) OR (requester=them AND receiver=me)
        const { error } = await supabase
            .from('friendships')
            .delete()
            .or(`and(requester_id.eq.${user.id},receiver_id.eq.${friendId}),and(requester_id.eq.${friendId},receiver_id.eq.${user.id})`);

        if (error) {
            console.error('Error removing friend:', error);
            return false;
        }
        return true;
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
            // Check for duplicate key error (code 23505)
            if (error.code === '23505') {
                console.log('Friend request already exists or you are already friends.');
                return true; // Treat as success or handle gracefully
            }
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

    async markMessagesAsRead(senderId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('messages')
            .update({ read: true })
            .eq('receiver_id', user.id)
            .eq('sender_id', senderId)
            .eq('read', false);

        if (error) {
            console.error('Error marking messages as read:', error);
        }
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

    async getFriendsProfiles() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const friendIds = await this.getFriends();

        if (friendIds.length === 0) return [];

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('id', friendIds);

        if (error) {
            console.error('Error fetching friends profiles:', error);
            return [];
        }

        return data as PlayerProfile[];
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
        // Fetch profiles and clubs separately to avoid ambiguous embedding errors (PGRST201)
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'club');

        if (profilesError) throw profilesError;

        // Fetch auxiliary data from 'clubs' table
        const clubIds = profiles.map(p => p.id);
        const { data: clubsData, error: clubsError } = await supabase
            .from('clubs')
            .select('*')
            .in('id', clubIds);

        if (clubsError) {
            console.warn('Error fetching extra club details:', clubsError);
            // Continue with just profile data
        }

        const clubsMap = new Map(clubsData?.map(c => [c.id, c]) || []);

        return profiles.map((profile: any) => {
            const clubMoreInfo = clubsMap.get(profile.id) || {};

            return {
                ...profile,
                ...clubMoreInfo, // Merge club specific data (photos, etc)
                id: profile.id, // Ensure ID is preserved from profile
                role: 'club',
                location: profile.location || clubMoreInfo?.location || 'Ubicación pendiente',
                avatar_url: profile.avatar_url,
                schedule: profile.schedule || clubMoreInfo?.schedule,
                photos: clubMoreInfo?.photos || ['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2940&auto=format&fit=crop'],
                services: profile.services || clubMoreInfo?.services || ['Estacionamiento', 'Vestuarios', 'Bar'],
                last_payment_date: profile.last_payment_date,
                commission_rate: profile.commission_rate
            };
        }) as ClubProfile[];
    },

    async getFavoriteClubs() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Fetch favorite IDs first
        const { data: favorites, error } = await supabase
            .from('favorite_clubs')
            .select('club_id')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching favorites:', error);
            return [];
        }

        if (!favorites || favorites.length === 0) return [];

        const favoriteClubIds = favorites.map(f => f.club_id);

        // Then fetch the actual club profiles using the IDs
        // Reuse getClubs logic or similar query but filtered by IDs
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', favoriteClubIds);

        if (profilesError) {
            console.error('Error fetching favorite profiles:', profilesError);
            return [];
        }

        // Also fetch club details
        const { data: clubsData } = await supabase
            .from('clubs')
            .select('*')
            .in('id', favoriteClubIds);

        const clubsMap = new Map(clubsData?.map(c => [c.id, c]) || []);

        return profiles.map((item: any) => {
            const clubMore = clubsMap.get(item.id) || {};
            return {
                id: item.id,
                name: item.name,
                location: item.location || clubMore.location || '',
                description: item.description || clubMore.description || '',
                phone: item.phone || '',
                courts: [],
                schedule: item.schedule || clubMore.schedule || {},
                photos: clubMore.photos || ['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2940&auto=format&fit=crop'],
                services: item.services || clubMore.services || [],
                avatar_url: item.avatar_url
            };
        }) as ClubProfile[];
    },

    async toggleFavoriteClub(clubId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check if exists
        const { data } = await supabase
            .from('favorite_clubs')
            .select('user_id')
            .eq('user_id', user.id)
            .eq('club_id', clubId)
            .maybeSingle();

        if (data) {
            // Remove
            const { error } = await supabase.from('favorite_clubs').delete().eq('user_id', user.id).eq('club_id', clubId);
            if (error) throw error;
            return false;
        } else {
            // Add
            const { error } = await supabase.from('favorite_clubs').insert([{ user_id: user.id, club_id: clubId }]);
            if (error) throw error;
            return true;
        }
    },

    async getCourts(clubId: string) {
        const { data, error } = await supabase
            .from('courts')
            .select('*')
            .eq('club_id', clubId);

        if (error) throw error;
        return data as Court[];
    },

    async createBooking(booking: Omit<Booking, 'id' | 'status' | 'price'> & { price?: number, duration?: number }) {
        const durationMinutes = booking.duration || 60;
        const calculatedStartTime = new Date(`${booking.date}T${booking.time}:00`);
        const endTime = new Date(calculatedStartTime.getTime() + durationMinutes * 60000);

        const bookingData: any = {
            court_id: booking.court_id,
            start_time: calculatedStartTime.toISOString(),
            end_time: endTime.toISOString(),
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
            // ...
        } as Booking;
    },

    async createRecurringBookings(
        bookingTemplate: Omit<Booking, 'id' | 'status' | 'price'> & { price?: number, duration?: number },
        endDateStr: string // 'YYYY-MM-DD'
    ) {
        let price = bookingTemplate.price || 0;
        if (!bookingTemplate.price) {
            const { data: court } = await supabase
                .from('courts')
                .select('hourly_rate')
                .eq('id', bookingTemplate.court_id)
                .single();
            price = court?.hourly_rate || 0;
        }

        const durationMinutes = bookingTemplate.duration || 60;

        // Parse dates safely in local time
        const [sy, sm, sd] = bookingTemplate.date.split('-').map(Number);
        const [ey, em, ed] = endDateStr.split('-').map(Number);
        const startDate = new Date(sy, sm - 1, sd);
        const endDateObj = new Date(ey, em - 1, ed, 23, 59, 59);

        let currentDate = new Date(startDate);
        const bookingDates: string[] = [];

        // Loop purely over dates to avoid time changes (DST issues)
        while (currentDate <= endDateObj) {
            const y = currentDate.getFullYear();
            const m = String(currentDate.getMonth() + 1).padStart(2, '0');
            const d = String(currentDate.getDate()).padStart(2, '0');
            bookingDates.push(`${y}-${m}-${d}`);
            currentDate.setDate(currentDate.getDate() + 7);
        }

        if (bookingDates.length === 0) return [];

        // Generate UUID for the series
        const seriesId = crypto.randomUUID();
        const bookingsToInsert = [];

        for (const bDateStr of bookingDates) {
            const calculatedStartTime = new Date(`${bDateStr}T${bookingTemplate.time}:00`);
            const endTime = new Date(calculatedStartTime.getTime() + durationMinutes * 60000);

            const bookingData: any = {
                court_id: bookingTemplate.court_id,
                start_time: calculatedStartTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'confirmed',
                payment_status: 'unpaid',
                price: price,
                recurring_series_id: seriesId
            };

            if (bookingTemplate.user_id) bookingData.player_id = bookingTemplate.user_id;
            if (bookingTemplate.guest_name) bookingData.guest_name = bookingTemplate.guest_name;

            bookingsToInsert.push(bookingData);
        }

        // Insert all at once
        const { data, error } = await supabase
            .from('bookings')
            .insert(bookingsToInsert)
            .select();

        if (error) throw error;
        return data;
    },

    async getBookings(userId: string) {
        const { data, error } = await supabase
            .from('bookings')
            .select('*, courts(name, club_id, clubs(name, location))')
            .eq('player_id', userId)
            .eq('player_id', userId)
            .order('created_at', { ascending: false });

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
                club_name: b.courts?.clubs?.name,
                court_name: b.courts?.name
            };
        }) as Booking[];
    },

    async getBookingsForCourt(courtId: string, date: string) {
        // Fetch bookings for the requested date +/- 1 day to handle timezone shifts
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 2);

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
        endDate.setDate(endDate.getDate() + 2);

        const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select('*, courts!inner(club_id), profiles:player_id(name)')
            .eq('courts.club_id', clubId)
            .gte('start_time', startDate.toISOString())
            .lte('start_time', endDate.toISOString())
            .neq('status', 'cancelled');

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
                payment_status: b.payment_status,
                recurring_series_id: b.recurring_series_id
            }));
    },

    async getClubAvailability(clubId: string, date: string) {
        // Fetch bookings for the requested date +/- 1 day to handle timezone shifts
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 2);

        // First get court IDs to avoid inner join RLS issues
        const { data: courts } = await supabase
            .from('courts')
            .select('id')
            .eq('club_id', clubId);

        const courtIds = courts?.map(c => c.id) || [];

        if (courtIds.length === 0) return [];

        const { data, error } = await supabase
            .from('bookings')
            .select('court_id, start_time')
            .in('court_id', courtIds)
            .gte('start_time', startDate.toISOString())
            .lte('start_time', endDate.toISOString())
            .neq('status', 'cancelled');

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

    async cancelBooking(bookingId: string) {
        // Option 2: Soft Delete / Status Update (Better for history)
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId);

        if (error) {
            console.error('Error cancelling booking:', error);
            return false;
        }
        return true;
    },

    async cancelRecurringBookings(seriesId: string, fromDateStr: string) {
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('recurring_series_id', seriesId)
            .gte('start_time', fromDateStr);

        if (error) {
            console.error('Error cancelling recurring bookings:', error);
            return false;
        }
        return true;
    },

    async deleteTournamentRegistration(registrationId: string) {
        const { error } = await supabase
            .from('tournament_registrations')
            .delete()
            .eq('id', registrationId);

        if (error) {
            console.error('Error deleting registration:', error);
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

    async deleteTournament(tournamentId: string) {
        // First delete matches (though supabase cascade might handle it if set up, doing it manually is safer)
        const { error: matchError } = await supabase
            .from('tournament_matches')
            .delete()
            .eq('tournament_id', tournamentId);
        
        if (matchError) {
            console.error('Error deleting matches:', matchError);
        }

        // Delete registrations
        const { error: regsError } = await supabase
            .from('tournament_registrations')
            .delete()
            .eq('tournament_id', tournamentId);
        
        if (regsError) {
            console.error('Error deleting registrations:', regsError);
        }

        // Finally delete the tournament
        const { error } = await supabase
            .from('tournaments')
            .delete()
            .eq('id', tournamentId);

        if (error) {
            console.error('Error deleting tournament:', error);
            throw error;
        }

        return true;
    },

    async getTournaments(clubId?: string) {
        let query = supabase
            .from('tournaments')
            .select('*')
            .order('start_date', { ascending: false });

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
            .update({ score, winner_id: winnerId }) // Removed sets_score as it causes 400 error (column missing)
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
            // Fallback: Parse score string if sets_score is missing
            let sets = m.sets_score;
            if (!sets && m.score && m.score !== 'BYE') {
                // Parse "6-4, 6-2" assuming "Team1-Team2" format
                try {
                    sets = m.score.split(',').map((s: string) => {
                        const [s1, s2] = s.trim().split('-').map(Number);
                        // We need to map this to { w, l } relative to the WINNER of the match?
                        // The logic below expects {w, l} where w=games for winner, l=games for loser.
                        // But calculate logic uses set.w and set.l directly.
                        // The logic below: if (set.w > set.l) -> winner gets set win.

                        // If m.score is "Team1-Team2", then s1 is Team1Games, s2 is Team2Games.
                        // We need to determine who is winner of this specific set to assign w/l correctly?
                        // actually the logic below:
                        // if (statsMap[winner]) statsMap[winner].games_won += set.w
                        // This implies set.w MUST be the games won by the Match Winner? 
                        // NO. The logic below (lines 929+) says:
                        // winner gets `set.w`, loser gets `set.l`.
                        // So `sets` MUST be [{w: gamesOfMatchWinner, l: gamesOfMatchLoser}].

                        // So we need to parse s1, s2, check who is match winner, and assign accordingly.
                        const team1Points = s1;
                        const team2Points = s2;

                        if (winner === team1) {
                            return { w: team1Points, l: team2Points };
                        } else {
                            return { w: team2Points, l: team1Points };
                        }
                    });
                } catch (e) { console.error("Error parsing score", e); }
            }

            if (sets && Array.isArray(sets)) {
                sets.forEach((set: { w: number, l: number }) => {
                    // Winner gets 'w' games, Loser gets 'l' games
                    if (statsMap[winner]) {
                        statsMap[winner].games_won += set.w;
                        statsMap[winner].games_lost += set.l;
                    }
                    if (statsMap[loser]) {
                        statsMap[loser].games_won += set.l;
                        statsMap[loser].games_lost += set.w;
                    }

                    // Determine set winner based on games
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

    async updateRegistrationGroup(registrationId: string, groupName: string) {
        const { error } = await supabase
            .from('tournament_registrations')
            .update({ group_name: groupName })
            .eq('id', registrationId);

        if (error) throw error;
        return true;
    },

    async updateTournamentRegistration(registrationId: string, updates: Partial<TournamentRegistration>) {
        const { error } = await supabase
            .from('tournament_registrations')
            .update(updates)
            .eq('id', registrationId);

        if (error) {
            console.error('Error updating registration:', error);
            throw error;
        }
        return true;
    },

    async generateManualGroupStage(tournamentId: string) {
        // 1. Check tournament exists
        const { error: tError } = await supabase
            .from('tournaments')
            .select('id')
            .eq('id', tournamentId)
            .single();

        if (tError) throw tError;

        // 2. Get approved registrations
        const { data: registrations, error: regError } = await supabase
            .from('tournament_registrations')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('status', 'approved');

        if (regError) throw regError;
        if (!registrations || registrations.length < 3) {
            throw new Error('Se necesitan al menos 3 equipos para generar la competencia.');
        }

        // Clean up previous generation (if any)
        const { error: deleteMatchError } = await supabase
            .from('tournament_matches')
            .delete()
            .eq('tournament_id', tournamentId);
        
        if (deleteMatchError) throw deleteMatchError;

        // Init stats, keep existing group_name but default to 'A' if empty
        const updates = [];
        const groups: { [key: string]: any[] } = {};

        for (const reg of registrations) {
            const gName = reg.group_name || 'A';
            if (!groups[gName]) groups[gName] = [];
            groups[gName].push(reg);

            updates.push({
                id: reg.id,
                group_name: gName,
                stats: { points: 0, played: 0, won: 0, lost: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 }
            });
        }

        // Batch update registrations stats
        for (const update of updates) {
            await supabase
                .from('tournament_registrations')
                .update({ group_name: update.group_name, stats: update.stats })
                .eq('id', update.id);
        }

        // Generate matches
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
                        start_time: new Date().toISOString()
                    });
                }
            }
        }

        if (matches.length > 0) {
            const { error: matchError } = await supabase
                .from('tournament_matches')
                .insert(matches);
            
            if (matchError) throw matchError;
        }

        // Update tournament status
        await supabase
            .from('tournaments')
            .update({ status: 'ongoing' })
            .eq('id', tournamentId);

        return true;
    },

    async generateGroupStage(tournamentId: string) {
        // 1. Get tournament details
        const { data: tournament, error: tError } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', tournamentId)
            .single();

        if (tError) throw tError;

        // 2. Get approved registrations
        const { data: registrations, error: regError } = await supabase
            .from('tournament_registrations')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('status', 'approved');

        if (regError) throw regError;
        if (!registrations || registrations.length < 3) {
            throw new Error('Se necesitan al menos 3 equipos para generar la competencia.');
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

        // 3. Shuffle and Assign Groups
        const shuffled = [...registrations].sort(() => Math.random() - 0.5);
        const groups: { [key: string]: typeof registrations } = {};
        const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

        let numZones = 1;
        if (tournament.format === 'league') {
            numZones = tournament.zones_count || 1;
        } else if (tournament.format === 'americano') {
            numZones = 1;
        } else if (tournament.format === 'largo_12') {
            numZones = 4;
        } else {
            // Default knockout format (usually 4 teams per group)
            numZones = Math.max(1, Math.ceil(registrations.length / 4));
        }

        // Initialize zones
        for (let i = 0; i < numZones; i++) {
            groups[groupNames[i]] = [];
        }

        const updates = [];

        // Distribute teams evenly (round-robin assignment to groups)
        for (let i = 0; i < shuffled.length; i++) {
            const zoneIndex = i % numZones;
            const groupName = groupNames[zoneIndex];
            
            groups[groupName].push(shuffled[i]);

            // Update team with group name and init stats
            updates.push({
                id: shuffled[i].id,
                group_name: groupName,
                stats: { points: 0, played: 0, won: 0, lost: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 }
            });
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

        if (tournament.format === 'americano') {
            const sortedTeams = [...registrations].sort((a, b) => {
                const pointsDiff = (b.stats?.points || 0) - (a.stats?.points || 0);
                if (pointsDiff !== 0) return pointsDiff;
                const setsDiff = ((b.stats?.sets_won || 0) - (b.stats?.sets_lost || 0)) - ((a.stats?.sets_won || 0) - (a.stats?.sets_lost || 0));
                if (setsDiff !== 0) return setsDiff;
                return ((b.stats?.games_won || 0) - (b.stats?.games_lost || 0)) - ((a.stats?.games_won || 0) - (a.stats?.games_lost || 0));
            });

            sortedTeams.forEach((team, index) => {
                let pts = 25;
                if (index === 0) pts = 200;
                else if (index === 1) pts = 150;
                else if (index === 2) pts = 100;
                
                if (team.player1_id) addPoints(team.player1_id, pts);
                if (team.player2_id) addPoints(team.player2_id, pts);
            });
        } else {
            // Default: 25 points for participation (Group Stage)
            registrations.forEach((reg: any) => {
                if (reg.player1_id) addPoints(reg.player1_id, 25);
                if (reg.player2_id) addPoints(reg.player2_id, 25);
            });

            // Analyze matches to upgrade points
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

                // Points for the WINNER
                if (match.round === 'final') {
                    if (winnerTeam.player1_id) addPoints(winnerTeam.player1_id, 200);
                    if (winnerTeam.player2_id) addPoints(winnerTeam.player2_id, 200);
                } else {
                    let winnerGuaranteed = 0;
                    if (match.round === 'round_16') winnerGuaranteed = 75;
                    else if (match.round === 'quarter') winnerGuaranteed = 100;
                    else if (match.round === 'semi') winnerGuaranteed = 150;

                    if (winnerTeam.player1_id) addPoints(winnerTeam.player1_id, winnerGuaranteed);
                    if (winnerTeam.player2_id) addPoints(winnerTeam.player2_id, winnerGuaranteed);
                }
            });
        }

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

    async clearPlayoffs(tournamentId: string) {
        const { error } = await supabase
            .from('tournament_matches')
            .delete()
            .eq('tournament_id', tournamentId)
            .eq('stage', 'playoff');

        if (error) throw error;
        return true;
    },

    async generatePlayoffs(tournamentId: string) {
        // 0. Get tournament details
        const { data: tournament, error: tError } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', tournamentId)
            .single();

        if (tError) throw tError;

        if (tournament.format === 'americano') {
            throw new Error('El formato Americano no tiene fase de playoffs.');
        }

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
        const zoneQualifiers: { [key: string]: typeof registrations } = {};

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

            let qualifyCount = groupTeams.length >= 4 ? 3 : 2;
            if (tournament.format === 'league' && tournament.teams_advancing_per_zone) {
                qualifyCount = tournament.teams_advancing_per_zone;
            } else if (tournament.format === 'largo_12') {
                qualifyCount = 2;
            }

            // Ensure we don't try to qualify more teams than exist in the group
            qualifyCount = Math.min(qualifyCount, groupTeams.length);

            const qualifiers = sorted.slice(0, qualifyCount);
            allQualifiers.push(...qualifiers);
            zoneQualifiers[groupName] = qualifiers;
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

        // 5. Generate Seeding Order & First Round Matches
        const matches: any[] = [];
        const firstRoundMatches: any[] = [];
        const timestamp = new Date().getTime(); // Use timestamp for ordering

        if (tournament.format === 'largo_12' && zoneQualifiers['A'] && zoneQualifiers['B'] && zoneQualifiers['C'] && zoneQualifiers['D']) {
            bracketSize = 8;
            
            // Fixed crossing: 1A vs 2D, 1B vs 2C, 1C vs 2B, 1D vs 2A
            const predefinedMatches = [
                { t1: zoneQualifiers['A'][0], t2: zoneQualifiers['D'][1] },
                { t1: zoneQualifiers['B'][0], t2: zoneQualifiers['C'][1] },
                { t1: zoneQualifiers['C'][0], t2: zoneQualifiers['B'][1] },
                { t1: zoneQualifiers['D'][0], t2: zoneQualifiers['A'][1] }
            ];

            for (let i = 0; i < 4; i++) {
                const team1 = predefinedMatches[i].t1;
                const team2 = predefinedMatches[i].t2;

                const match: any = {
                    tournament_id: tournamentId,
                    round: 'quarter',
                    stage: 'playoff',
                    start_time: new Date(timestamp + i * 1000).toISOString(),
                    group_name: `M${i + 1}`
                };

                if (team1) match.team1_id = team1.id;
                if (team2) match.team2_id = team2.id;

                if (team1 && !team2) {
                    match.winner_id = team1.id;
                    match.score = 'BYE';
                    match.sets_score = [];
                } else if (!team1 && team2) {
                    match.winner_id = team2.id;
                    match.score = 'BYE';
                    match.sets_score = [];
                }

                firstRoundMatches.push(match);
                matches.push(match);
            }
        } else {
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

            // 6. Generate First Round Matches
            const firstRoundName = bracketSize === 16 ? 'round_16' :
                bracketSize === 8 ? 'quarter' :
                    bracketSize === 4 ? 'semi' : 'final';

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

            // Anti-Same-Group Logic for First Round
            for (let i = 0; i < firstRoundMatches.length; i++) {
                const m1 = firstRoundMatches[i];
                
                const t1 = allQualifiers.find(q => q.id === m1.team1_id);
                const t2 = allQualifiers.find(q => q.id === m1.team2_id);
                
                if (t1 && t2 && t1.group_name === t2.group_name) {
                    // Find a swap partner
                    for (let j = 0; j < firstRoundMatches.length; j++) {
                        if (i === j) continue;
                        const m2 = firstRoundMatches[j];
                        
                        const m2_t1 = allQualifiers.find(q => q.id === m2.team1_id);
                        const m2_t2 = allQualifiers.find(q => q.id === m2.team2_id);
                        
                        const new_m1_t2_group = m2_t2?.group_name;
                        const new_m2_t2_group = t2?.group_name;
                        
                        if (t1.group_name !== new_m1_t2_group && (!m2_t1 || m2_t1.group_name !== new_m2_t2_group)) {
                            // SWAP team2_id
                            const tempTeam2Id = m1.team2_id;
                            m1.team2_id = m2.team2_id;
                            m2.team2_id = tempTeam2Id;
                            
                            // Fix byes if needed
                            if (!m1.team2_id) {
                                m1.winner_id = m1.team1_id;
                                m1.score = 'BYE';
                                m1.sets_score = [];
                            } else {
                                m1.winner_id = null;
                                m1.score = null;
                                m1.sets_score = null;
                            }
                            
                            if (!m2.team2_id && m2.team1_id) {
                                m2.winner_id = m2.team1_id;
                                m2.score = 'BYE';
                                m2.sets_score = [];
                            } else {
                                m2.winner_id = null;
                                m2.score = null;
                                m2.sets_score = null;
                            }
                            
                            break; // Conflict resolved
                        }
                    }
                }
            }
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
    },

    async deleteClub(clubId: string) {
        const { error } = await supabase.rpc('delete_user_by_admin', { user_id: clubId });
        if (error) {
            console.error('Error deleting club:', error);
            return false;
        }
        return true;
    }
};
