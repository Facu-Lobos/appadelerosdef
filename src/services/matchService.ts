import { supabase } from './supabaseClient';
import type { MatchRequest, PlayerProfile } from '../types';

export const matchService = {
    // --- Match Requests ---

    async getOpenMatches() {
        // Fetch matches with status 'open', ordered by date
        const { data, error } = await supabase
            .from('match_requests')
            .select(`
                *,
                player:profiles!player_id(*),
                club:clubs(*)
            `)
            .eq('status', 'open')
            .gte('date', new Date().toISOString().split('T')[0]) // Only future or today
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching open matches:', error);
            return [];
        }

        return data as MatchRequest[];
    },

    async createMatchRequest(request: Omit<MatchRequest, 'id' | 'created_at' | 'status'>) {
        const { data, error } = await supabase
            .from('match_requests')
            .insert([{ ...request, status: 'open' }])
            .select()
            .single();

        if (error) throw error;
        return data as MatchRequest;
    },

    async deleteMatchRequest(requestId: string) {
        const { error } = await supabase
            .from('match_requests')
            .delete()
            .eq('id', requestId);

        if (error) throw error;
        return true;
    },

    // --- Recommendations ---

    async getSimilarPlayers(userProfile: PlayerProfile) {
        if (!userProfile) return [];

        // Simple algorithm: Same category AND (Same location OR generic match)
        // Adjust logic as needed based on actual data quality
        let query = supabase
            .from('profiles')
            .select('*')
            .eq('role', 'player')
            .neq('id', userProfile.id) // Exclude self
            .eq('category', userProfile.category);

        if (userProfile.location && userProfile.location !== 'Ubicación pendiente') {
            // Try to match location loosely if possible, or just exact match for now
            // Postgres 'ilike' would be better but let's stick to exact or partial if needed
            // For now, let's just prioritize category which is the most important factor
        }

        const { data, error } = await query.limit(5);

        if (error) {
            console.error('Error fetching similar players:', error);
            return [];
        }

        return data as PlayerProfile[];
    }
};
