import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabaseService } from '../services/supabaseService';
import { useAuth } from './AuthContext';

export interface AppNotification {
    id: string;
    type: 'friend_request' | 'message';
    title: string;
    description: string;
    link: string;
    read: boolean;
    created_at: string;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [initLoad, setInitLoad] = useState(true);
    const prevUnreadIdsRef = useRef<Set<string>>(new Set());

    const playNotificationSound = () => {
        try {
            // Simple "Crystal" notification sound
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed (user interaction needed first):', e));
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    };

    const refreshNotifications = async () => {
        if (!user) return;

        const newNotifications: AppNotification[] = [];

        // 1. Check pending friend requests
        const requests = await supabaseService.getPendingFriendRequests();
        requests.forEach(req => {
            newNotifications.push({
                id: `req-${req.id}`,
                type: 'friend_request',
                title: 'Solicitud de Amistad',
                description: `${req.profiles?.name || 'Alguien'} quiere ser tu amigo`,
                link: '/player/community',
                read: false,
                created_at: req.created_at
            });
        });

        // 2. Check unread messages
        const messages = await supabaseService.getUnreadMessages();
        const senders = new Set();
        messages.forEach(msg => {
            if (!senders.has(msg.sender_id)) {
                senders.add(msg.sender_id);
                newNotifications.push({
                    id: `msg-${msg.id}`,
                    type: 'message',
                    title: 'Nuevo Mensaje',
                    description: `Mensaje de ${msg.sender?.name || 'Usuario'}`,
                    link: `/player/community?chatWith=${msg.sender_id}&name=${encodeURIComponent(msg.sender?.name || 'Usuario')}&avatar=${encodeURIComponent(msg.sender?.avatar_url || '')}`,
                    read: false,
                    created_at: msg.created_at
                });
            }
        });

        // Sound Logic
        const currentUnreadIds = new Set(newNotifications.filter(n => !n.read).map(n => n.id));

        // Find if there are ANY new ids that were not in prevUnreadIds
        const hasNew = [...currentUnreadIds].some(id => !prevUnreadIdsRef.current.has(id));

        if (hasNew && !initLoad) {
            playNotificationSound();
        }

        if (initLoad) {
            setInitLoad(false);
        }

        // Update ref
        prevUnreadIdsRef.current = currentUnreadIds;

        setNotifications(newNotifications);
    };

    useEffect(() => {
        refreshNotifications();
        const interval = setInterval(refreshNotifications, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [user]);

    const markAsRead = (id: string) => {
        // For local state only, since friend requests are "read" by accepting/rejecting
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, refreshNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
