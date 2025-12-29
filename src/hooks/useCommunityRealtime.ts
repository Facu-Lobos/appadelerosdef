import { useEffect, useRef } from 'react';
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

    // Refs to keep latest values without triggering effect re-run
    const myMatchIdsRef = useRef(myMatchIds);
    const callbacksRef = useRef({
        onFriendRequestReceived,
        onFriendRequestAccepted,
        onMatchApplicationReceived,
        onMatchApplicationUpdated,
        onMessageReceived
    });

    useEffect(() => {
        myMatchIdsRef.current = myMatchIds;
        callbacksRef.current = {
            onFriendRequestReceived,
            onFriendRequestAccepted,
            onMatchApplicationReceived,
            onMatchApplicationUpdated,
            onMessageReceived
        };
    }, [myMatchIds, onFriendRequestReceived, onFriendRequestAccepted, onMatchApplicationReceived, onMatchApplicationUpdated, onMessageReceived]);

    useEffect(() => {
        if (!user) return;

        console.log('Setting up Realtime subscriptions for user:', user.id);

        const channel = supabase.channel(`community-global-${user.id}`)
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
                    console.log('Realtime: Friend Request', payload);
                    showToast('¡Nueva solicitud de amistad!', 'info');
                    callbacksRef.current.onFriendRequestReceived();
                }
            )
            // 2. Friend Requests (Accepted)
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
                        console.log('Realtime: Friend Accepted', payload);
                        showToast('¡Solicitud de amistad aceptada!', 'success');
                        callbacksRef.current.onFriendRequestAccepted();
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
                    console.log('Realtime: Application Update', payload);
                    const status = payload.new.status;
                    if (status === 'accepted') {
                        showToast('¡Te han aceptado en un partido!', 'success');
                    } else if (status === 'rejected') {
                        showToast('Tu solicitud a un partido fue rechazada', 'error');
                    }
                    callbacksRef.current.onMatchApplicationUpdated();
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
                    console.log('Realtime: New Message', payload);

                    const { data } = await supabase
                        .from('profiles')
                        .select('name')
                        .eq('id', payload.new.sender_id)
                        .single();

                    const senderName = data?.name || 'Alguien';
                    // Only show toast if message is NOT read (which it should be by default)
                    // In a perfect world we check payload.new.read === false
                    showToast(`Mensaje nuevo de ${senderName}`, 'info');
                    callbacksRef.current.onMessageReceived(senderName);
                }
            )
            // 5. Match Applications (Incoming to My Matches)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_applications'
                },
                (payload: any) => {
                    // Check if match_id is mine using the REF (always up to date)
                    if (myMatchIdsRef.current.includes(payload.new.match_id)) {
                        console.log('Realtime: Application Received for match', payload.new.match_id);
                        showToast('¡Alguien se postuló a tu partido!', 'info');
                        callbacksRef.current.onMatchApplicationReceived();
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Subscription status for ${user.id}:`, status);
            });

        return () => {
            console.log('Cleaning up subscriptions');
            supabase.removeChannel(channel);
        };
    }, [user?.id]); // Only re-subscribe if user changes.
};
