import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, User, Loader2, Mic } from 'lucide-react';
import { Project, Client, Installer } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Props {
    projects: Project[];
    clients: Client[];
    installers: Installer[];
    isListening?: boolean;
    isProcessingVoice?: boolean;
    startVoiceCommand?: () => void;
}

const HypadoAIChat: React.FC<Props> = ({
    projects, clients, installers,
    isListening, isProcessingVoice, startVoiceCommand
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
        { role: 'assistant', text: 'Olá! Sou a IA do Hypado. Posso analisar seus dados, resumir obras ou dar dicas de gestão. O que você quer saber?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            // Prepare Context
            const context = JSON.stringify({
                projects: projects.map(p => ({
                    id: p.id,
                    nome_obra: p.workName,
                    cliente: p.clientName,
                    status: p.currentStatus,
                    valor: p.value,
                    prazo: p.promisedDate,
                    ambientes: p.environmentsDetails.map(e => ({
                        nome: e.name,
                        pecas: e.memorial.partsCount || 0
                    }))
                })),
                clients: clients.map(c => ({ nome: c.name, telefone: c.phone })),
                installers: installers.map(i => ({ nome: i.name, status: i.status }))
            });

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `
        Você é um assistente útil e inteligente dentro do sistema de gestão de marcenaria "Hypado".
        
        Você tem acesso aos seguintes dados do sistema em JSON:
        ${context}

        Responda Ã  pergunta do usuário com base nesses dados.
        Seja conciso, profissional e use formatação Markdown simples se necessário.
        Se a pergunta for genérica (ex: "Dê uma dica"), dê dicas sobre marcenaria e gestão.
        
        Usuário: ${userMsg}
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            setMessages(prev => [...prev, { role: 'assistant', text }]);
        } catch (error: any) {
            console.error("Erro no Chat IA:", error);
            let errorMsg = 'Desculpe, tive um problema ao processar sua solicitação.';
            if (error.message?.includes('429')) errorMsg += ' (Limite de cota excedido. Tente novamente em alguns instantes.)';
            else if (error.message?.includes('API key')) errorMsg += ' (Chave de API inválida ou ausente.)';
            else errorMsg += ` (Erro: ${error.message || 'Desconhecido'})`;

            setMessages(prev => [...prev, { role: 'assistant', text: errorMsg }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none ${isOpen ? 'pointer-events-auto' : ''}`}>

            {/* CHAT WINDOW */}
            <div
                className={`bg-card w-[350px] md:w-[400px] h-[500px] rounded-[32px] shadow-2xl border border-border overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right mb-4 pointer-events-auto ${isOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0 translate-y-10 invisible'}`}
            >
                {/* Header */}
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                            <Sparkles size={20} className="text-white animate-pulse" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">Hypado AI</h4>
                            <p className="text-[10px] text-indigo-200 uppercase tracking-widest">Assistente Virtual</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                        title="Fechar"
                        aria-label="Fechar Chat"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Messages Types/List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/50 custom-scrollbar">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                                    : 'bg-card border border-border text-foreground rounded-bl-none shadow-sm'
                                    }`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="flex items-center gap-1.5 mb-2 text-[10px] font-black uppercase text-indigo-500 tracking-wider">
                                        <Bot size={12} /> Hypado AI
                                    </div>
                                )}
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-card border border-border p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-indigo-500" />
                                <span className="text-xs text-slate-400 italic">Analisando dados...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-4 bg-card border-t border-slate-100 flex gap-2">
                    {startVoiceCommand && (
                        <button
                            type="button"
                            onClick={startVoiceCommand}
                            disabled={isListening || isProcessingVoice}
                            className={`p-3 rounded-full transition-all duration-300 shadow-lg ${isListening ? 'bg-indigo-600 text-white animate-pulse' : 'bg-muted text-slate-400 hover:text-indigo-600 hover:bg-slate-200'}`}
                            title="Comando de Voz"
                            aria-label="Ativar Comando de Voz"
                        >
                            {isProcessingVoice ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} className={isListening ? 'animate-bounce' : ''} />}
                        </button>
                    )}
                    <input
                        type="text"
                        className="flex-1 bg-muted rounded-full px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                        placeholder="Pergunte sobre suas obras..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                        title="Enviar"
                        aria-label="Enviar Mensagem"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>

            {/* TOGGLE BUTTON */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 pointer-events-auto hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-200 text-muted-foreground rotate-90' : 'bg-indigo-600 text-white rotate-0'}`}
            >
                {isOpen ? <X size={28} /> : <MessageSquare size={28} fill="currentColor" />}
            </button>

        </div>
    );
};

export default HypadoAIChat;
