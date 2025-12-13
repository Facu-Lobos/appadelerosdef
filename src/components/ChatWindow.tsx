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
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
    }, [messages]);

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
                                    <p>{msg.text}</p>
                                    <span className="text-[10px] opacity-50 block text-right mt-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 flex gap-2 bg-surface">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
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
