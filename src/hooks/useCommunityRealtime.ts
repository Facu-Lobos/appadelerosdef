import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import type { PlayerProfile } from '../types';

interface UseCommunityRealtimeProps {
    user: PlayerProfile | null;
    myMatchIds: string[];
    onFriendRequestReceived: () => void;
    onFriendRequestAccepted: () => void;
    onMatchApplicationReceived: () => void;
    onMatchApplicationUpdated: () => void;
    onMessageReceived: (senderName: string) => void;
}

export const useCommunityRealtime = ({
    user,
    myMatchIds,
    onFriendRequestReceived,
    onFriendRequestAccepted,
    onMatchApplicationReceived,
    onMatchApplicationUpdated,
    onMessageReceived
}: UseCommunityRealtimeProps) => {
    const { showToast } = useToast();

    useEffect(() => {
        if (!user) return;

        // Channel for user-specific events (friendships, messages, direct application updates)
        const userChannel = supabase.channel(`user-updates-${user.id}`)
            // 1. Friend Requests (Incoming)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'friendships',
                    filter: `receiver_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('New friend request:', payload);
                    showToast('¡Nueva solicitud de amistad!', 'info');
                    onFriendRequestReceived();
                }
            )
            // 2. Friend Requests (Accepted by others)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'friendships',
                    filter: `sender_id=eq.${user.id}`
                },
                (payload: any) => {
                    if (payload.new.status === 'accepted') {
                        showToast('¡Solicitud de amistad aceptada!', 'success');
                        onFriendRequestAccepted();
                    }
                }
            )
            // 3. Match Applications (My application status updated)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'match_applications',
                    filter: `player_id=eq.${user.id}`
                },
                (payload: any) => {
                    const status = payload.new.status;
                    if (status === 'accepted') {
                        showToast('¡Te han aceptado en un partido!', 'success');
                    } else if (status === 'rejected') {
                        showToast('Tu solicitud a un partido fue rechazada', 'error');
                    }
                    onMatchApplicationUpdated();
                }
            )
            // 4. Messages (Incoming)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${user.id}`
                },
                async (payload: any) => {
                    // Fetch sender name for nicer toast
                    const { data } = await supabase
                        .from('profiles')
                        .select('name')
                        .eq('id', payload.new.sender_id)
                        .single();

                    const senderName = data?.name || 'Alguien';
                    showToast(`Mensaje nuevo de ${senderName}`, 'info');
                    onMessageReceived(senderName);
                }
            )
            .subscribe();

        // Channel for My Matches (Someone applying to MY matches)
        // Since RLS might prevent listening to all rows, we might need a workaround or specific filters.
        // But for INSERTs, if RLS allows selecting the row, we might see it.
        // A common pattern if table-wide listen isn't allowed is to rely on client-side filter
        // OR listen to a channel per match (could be too many channels).
        // Let's try listening to INSERT on match_applications and filtering by match_id in client.

        const applicationsChannel = supabase.channel('applications-global')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_applications'
                },
                (payload: any) => {
                    // Check if the application is for one of MY matches
                    if (myMatchIds.includes(payload.new.match_id)) {
                        showToast('¡Alguien se postuló a tu partido!', 'info');
                        onMatchApplicationReceived();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(userChannel);
            supabase.removeChannel(applicationsChannel);
        };
    }, [user, myMatchIds]); // Re-subscribe if myMatchIds changes (e.g. I create a new match)
};
