import { createContext, useContext, useState, useEffect } from 'react';
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
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
