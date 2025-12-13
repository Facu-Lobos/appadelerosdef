import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
}

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', text: '¡Hola! Soy tu asistente de pádel. ¿Buscas compañero o cancha para hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            if (!API_KEY) {
                throw new Error("API Key no configurada. Por favor agrega VITE_GEMINI_API_KEY en tu archivo .env");
            }

            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const prompt = `Eres un experto entrenador y asistente de pádel llamado "PadelAI". 
            Tu objetivo es ayudar a jugadores de todos los niveles con consejos tácticos, reglas del juego, 
            recomendaciones de equipamiento y dudas sobre la app "APPadeleros".
            
            Usuario: ${userMsg.text}
            
            Responde de manera concisa, amigable y motivadora. Usa emojis relacionados con deportes si es apropiado.`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: text };
            setMessages(prev => [...prev, botMsg]);
        } catch (error: any) {
            console.error("Error generating content:", error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: error.message || "Lo siento, tuve un problema al procesar tu consulta. Intenta nuevamente."
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-20 right-4 md:bottom-8 md:right-8 p-4 rounded-full shadow-2xl transition-all hover:scale-110 z-40 ${isOpen ? 'scale-0 opacity-0' : 'bg-gradient-to-r from-primary to-secondary scale-100 opacity-100'
                    }`}
            >
                <Bot className="text-background w-8 h-8" />
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-20 right-4 md:bottom-8 md:right-8 w-full max-w-sm bg-surface rounded-2xl shadow-2xl border border-white/10 flex flex-col transition-all duration-300 z-50 overflow-hidden ${isOpen ? 'opacity-100 translate-y-0 h-[500px]' : 'opacity-0 translate-y-10 h-0 pointer-events-none'
                }`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-secondary p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-background font-bold">
                        <Sparkles size={20} />
                        <span>Asistente IA</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-background/80 hover:text-background">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                ? 'bg-primary text-background font-medium rounded-tr-none'
                                : 'bg-surface border border-white/10 rounded-tl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-surface border border-white/10 p-3 rounded-2xl rounded-tl-none flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-white/10 bg-surface flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Escribe tu consulta..."
                        className="bg-background"
                    />
                    <Button size="sm" onClick={handleSend} disabled={!input.trim() || isTyping}>
                        <Send size={18} />
                    </Button>
                </div>
            </div>
        </>
    );
}
