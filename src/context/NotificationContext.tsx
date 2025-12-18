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
    metadata?: any;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    refreshNotifications: () => Promise<void>;
    isSoundEnabled: boolean;
    toggleSound: () => void;
    playSound: (type: 'message' | 'success' | 'alert') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [initLoad, setInitLoad] = useState(true);
    const prevUnreadIdsRef = useRef<Set<string>>(new Set());
    const lastDismissedRef = useRef<Map<string, string>>(new Map());

    // Sound Settings
    const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
        return localStorage.getItem('app_sound_enabled') !== 'false';
    });

    // Dismissed Requests (Local Persistence)
    const [dismissedRequests, setDismissedRequests] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('dismissed_requests');
            return new Set(saved ? JSON.parse(saved) : []);
        } catch {
            return new Set();
        }
    });

    const toggleSound = () => {
        setIsSoundEnabled(prev => {
            const newValue = !prev;
            localStorage.setItem('app_sound_enabled', String(newValue));
            return newValue;
        });
    };

    const playSound = (type: 'message' | 'success' | 'alert' = 'message') => {
        if (!isSoundEnabled) return;
        try {
            const sounds = {
                message: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3", // Crystal
                success: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3", // Success chime
                alert: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
            };
            const audio = new Audio(sounds[type]);
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed:', e));
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
            const notifId = `req-${req.id}`;
            // Skip if locally dismissed
            if (!dismissedRequests.has(notifId)) {
                newNotifications.push({
                    id: notifId,
                    type: 'friend_request',
                    title: 'Solicitud de Amistad',
                    description: `${req.profiles?.name || 'Alguien'} quiere ser tu amigo`,
                    link: '/player/community',
                    read: false,
                    created_at: req.created_at,
                    metadata: { requestId: req.id }
                });
            }
        });

        // 2. Check unread messages
        const messages = await supabaseService.getUnreadMessages();
        const senders = new Set();
        messages.forEach(msg => {
            // Skip if sender already processed
            if (senders.has(msg.sender_id)) return;

            // Check if dismissed locally (temporal persistence)
            const dismissedTimeStr = lastDismissedRef.current.get(msg.sender_id);
            if (dismissedTimeStr) {
                const dismissedTime = new Date(dismissedTimeStr);
                const msgTime = new Date(msg.created_at);
                // If message is older or equal to dismissal time, ignore it
                if (msgTime.getTime() <= dismissedTime.getTime()) {
                    senders.add(msg.sender_id); // Mark sender as processed to skip older messages too
                    return;
                }
            }

            // It's new!
            senders.add(msg.sender_id);
            newNotifications.push({
                id: `msg-${msg.id}`,
                type: 'message',
                title: 'Nuevo Mensaje',
                description: `Mensaje de ${msg.sender?.name || 'Usuario'}`,
                link: `/player/community?chatWith=${msg.sender_id}&name=${encodeURIComponent(msg.sender?.name || 'Usuario')}&avatar=${encodeURIComponent(msg.sender?.avatar_url || '')}`,
                read: false,
                created_at: msg.created_at,
                metadata: { senderId: msg.sender_id }
            });
        });

        // Sound Logic
        const currentUnreadIds = new Set(newNotifications.filter(n => !n.read).map(n => n.id));
        const hasNew = [...currentUnreadIds].some(id => !prevUnreadIdsRef.current.has(id));

        if (hasNew && !initLoad) {
            // Determine sound type
            const hasNewMsg = newNotifications.some(n => n.type === 'message' && !prevUnreadIdsRef.current.has(n.id));
            playSound(hasNewMsg ? 'message' : 'alert');
        }

        if (initLoad) {
            setInitLoad(false);
        }

        prevUnreadIdsRef.current = currentUnreadIds;
        setNotifications(newNotifications);
    };

    useEffect(() => {
        refreshNotifications();
        const interval = setInterval(refreshNotifications, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [user, dismissedRequests]); // Re-run if dismissed list changes

    const markAsRead = async (id: string) => {
        const notification = notifications.find(n => n.id === id);
        if (!notification) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

        if (notification.type === 'message' && notification.metadata?.senderId) {
            // Track dismissal time to prevent reappearance during race conditions
            lastDismissedRef.current.set(notification.metadata.senderId, notification.created_at);

            // Mark in DB
            await supabaseService.markMessagesAsRead(notification.metadata.senderId);
        } else if (notification.type === 'friend_request') {
            // Mark locally as dismissed
            const newDismissed = new Set(dismissedRequests);
            newDismissed.add(id);
            setDismissedRequests(newDismissed);
            localStorage.setItem('dismissed_requests', JSON.stringify([...newDismissed]));
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            refreshNotifications,
            isSoundEnabled,
            toggleSound,
            playSound
        }}>
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
