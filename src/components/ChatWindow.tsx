import { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { supabaseService } from '../services/supabaseService';
import { useAuth } from '../context/AuthContext';
import type { Message } from '../types';

interface ChatWindowProps {
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar?: string;
    onClose: () => void;
}

export default function ChatWindow({ otherUserId, otherUserName, otherUserAvatar, onClose }: ChatWindowProps) {
    const { user } = useAuth();
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypedTimeRef = useRef<number>(0);
    const channelRef = useRef<any>(null);

    // Restore missing state
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const getChannelId = () => {
        if (!user) return null;
        const ids = [user.id, otherUserId].sort();
        return `chat:${ids[0]}-${ids[1]}`;
    };

    useEffect(() => {
        if (!user) return;

        const channelId = getChannelId();
        if (!channelId) return;

        const channel = supabaseService.getClient().channel(channelId);

        channel
            .on('broadcast', { event: 'typing' }, (payload) => {
                // Ignore our own typing events (broadcast sends to everyone including sender by default in some setups, but usually excludes sender.
                // However, safe to check payload or just rely on the fact that we are listening.)
                // Actually, let's verify payload if we send sender_id, but for simple signal:
                if (payload.payload?.sender_id === otherUserId) {
                    setIsTyping(true);

                    // Clear existing timeout
                    if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                    }

                    // Set new timeout to hide indicator
                    typingTimeoutRef.current = setTimeout(() => {
                        setIsTyping(false);
                    }, 3000);
                }
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            // Cleanup
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            channel.unsubscribe();
        };
    }, [user, otherUserId]);

    const fetchMessages = async () => {
        const msgs = await supabaseService.getMessages(otherUserId);
        setMessages(msgs);
        setLoading(false);
    };

    useEffect(() => {
        fetchMessages();
        // Poll for new messages every 5 seconds for now (simple real-time)
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [otherUserId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]); // Scroll when typing indicator appears too

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);

        // Throttle typing events (max 1 per 2 seconds)
        const now = Date.now();
        if (now - lastTypedTimeRef.current > 2000 && channelRef.current && user) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { sender_id: user.id }
            });
            lastTypedTimeRef.current = now;
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        const success = await supabaseService.sendMessage(otherUserId, newMessage);
        if (success) {
            setNewMessage('');
            fetchMessages(); // Refresh immediately
        }
    };

    return (
        <div className="fixed bottom-20 right-4 md:bottom-0 md:right-4 w-80 md:w-96 h-[400px] md:h-[500px] bg-dark-secondary border border-white/20 rounded-xl md:rounded-b-none md:rounded-t-xl shadow-2xl flex flex-col z-50">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface border border-white/10 overflow-hidden">
                        <img
                            src={otherUserAvatar || "https://via.placeholder.com/150"}
                            alt={otherUserName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <span className="font-bold">{otherUserName}</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="text-center text-gray-500 mt-10">Cargando mensajes...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                        <p>No hay mensajes aún.</p>
                        <p className="text-sm">¡Saluda a {otherUserName}!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl ${isMe
                                        ? 'bg-primary text-white rounded-br-none'
                                        : 'bg-white/10 text-gray-200 rounded-bl-none'
                                        }`}
                                >
                                    <p>{msg.content || msg.text}</p>
                                    <span className="text-[10px] opacity-50 block text-right mt-1">
                                        {(() => {
                                            const dateVal = msg.created_at || msg.timestamp;
                                            if (!dateVal) return '';
                                            const date = new Date(dateVal);
                                            return isNaN(date.getTime())
                                                ? ''
                                                : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        })()}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 text-gray-400 p-2 rounded-xl rounded-bl-none text-xs flex items-center gap-1">
                            <span className="animate-bounce">.</span>
                            <span className="animate-bounce delay-100">.</span>
                            <span className="animate-bounce delay-200">.</span>
                            <span className="ml-1">escribiendo</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 flex gap-2 bg-surface">
                <Input
                    value={newMessage}
                    onChange={handleInput}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1"
                />
                <Button
                    icon={Send}
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    size="sm"
                >
                </Button>
            </div>
        </div>
    );
}
