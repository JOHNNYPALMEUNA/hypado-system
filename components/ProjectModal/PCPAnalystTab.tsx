import React, { useState, useMemo } from 'react';
import {
    Brain, Sparkles, Clock, TrendingUp, AlertCircle, 
    CheckCircle2, Loader2, Gauge, Calendar, Zap, Timer
} from 'lucide-react';
import { analyzePCP } from '../../geminiService';
import { formatDate } from '../../utils';
import { useData } from '../../contexts/DataContext';

interface PCPAnalystTabProps {
    project: any;
}

// Simple markdown-to-HTML renderer for AI output
function renderMarkdown(text: string): React.ReactNode {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
        if (line.startsWith('## ')) {
            elements.push(
                <h3 key={idx} className="text-base font-black uppercase text-foreground mt-6 mb-2 flex items-center gap-2">
                    {line.replace('## ', '')}
                </h3>
            );
        } else if (line.startsWith('# ')) {
            elements.push(
                <h2 key={idx} className="text-lg font-black uppercase text-foreground mt-4 mb-2">
                    {line.replace('# ', '')}
                </h2>
            );
        } else if (line.startsWith('**') && line.endsWith('**')) {
            elements.push(
                <p key={idx} className="font-black text-foreground text-sm mb-1">
                    {line.replace(/\*\*/g, '')}
                </p>
            );
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            const content = line.replace(/^[-*] /, '').replace(/\*\*(.*?)\*\*/g, '$1');
            elements.push(
                <div key={idx} className="flex items-start gap-2 mb-1.5 ml-2">
                    <span className="text-primary mt-1 shrink-0">•</span>
                    <span className="text-sm text-foreground/80 leading-relaxed">{content}</span>
                </div>
            );
        } else if (line.trim() !== '') {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            const formatted = parts.map((part, i) =>
                i % 2 === 1 ? <strong key={i} className="font-black text-foreground">{part}</strong> : part
            );
            elements.push(
                <p key={idx} className="text-sm text-foreground/80 mb-2 leading-relaxed">{formatted}</p>
            );
        } else {
            elements.push(<div key={idx} className="h-2" />);
        }
    });

    return <>{elements}</>;
}

const PCPAnalystTab: React.FC<PCPAnalystTabProps> = ({ project }) => {
    const { timelineEvents } = useData();
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    // 1. Calculate Core Timing Metrics
    const metrics = useMemo(() => {
        const history = project.history || [];
        const registrationDate = project.registrationDate || project.contractDate || (history[0]?.timestamp);
        
        if (!registrationDate) return null;

        const start = new Date(registrationDate).getTime();
        const now = new Date().getTime();
        const totalDays = ((now - start) / (1000 * 3600 * 24)).toFixed(1);

        // Stages Analysis
        const stages = [];
        const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        for (let i = 0; i < sortedHistory.length - 1; i++) {
            const current = sortedHistory[i];
            const next = sortedHistory[i+1];
            const diff = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();
            const days = (diff / (1000 * 3600 * 24)).toFixed(1);
            
            stages.push({
                name: current.status,
                days: Number(days),
                isWarning: Number(days) > 5
            });
        }

        // Add current stage
        if (sortedHistory.length > 0) {
            const last = sortedHistory[sortedHistory.length - 1];
            const diff = now - new Date(last.timestamp).getTime();
            stages.push({
                name: last.status,
                days: Number((diff / (1000 * 3600 * 24)).toFixed(1)),
                isCurrent: true
            });
        }

        return {
            totalDays,
            stages,
            registrationDate
        };
    }, [project]);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setHasAnalyzed(false);
        try {
            const result = await analyzePCP(project, timelineEvents);
            setAnalysis(result);
            setHasAnalyzed(true);
        } catch (err: any) {
            console.error("Erro na análise PCP:", err);
            setAnalysis(`❌ **Falha no Diagnóstico.**\n\nNão foi possível processar o fluxo desta obra no momento.`);
            setHasAnalyzed(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (!metrics) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                </div>
                <div className="relative z-10 flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-emerald-500/30 border border-emerald-400/30 rounded-2xl flex items-center justify-center">
                        <Gauge size={24} className="text-emerald-300" />
                    </div>
                    <div>
                        <h4 className="text-xl font-black uppercase italic tracking-tight">Analista de Tempo IA</h4>
                        <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest">PCP Inteligente · Monitoramento de Fluxo</p>
                    </div>
                </div>
                <p className="relative z-10 text-slate-400 text-xs mt-4 max-w-lg leading-relaxed">
                    A IA analisa o histórico de transições, identifica o tempo de permanência em cada etapa e detecta gargalos operacionais nesta OS.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-lg">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 flex items-center gap-1"><Calendar size={10} /> Registrada em</span>
                    <span className="text-lg font-black">{new Date(metrics.registrationDate!).toLocaleDateString('pt-BR')}</span>
                </div>

                <div className="bg-card p-5 rounded-3xl border border-border">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 flex items-center gap-1"><Timer size={10} /> Lead Time Total</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black italic text-primary">{metrics.totalDays}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Dias</span>
                    </div>
                </div>

                <div className="bg-card p-5 rounded-3xl border border-border">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 flex items-center gap-1"><Zap size={10} /> Etapa Atual</span>
                    <span className="text-sm font-black uppercase text-foreground truncate block">{project.currentStatus}</span>
                </div>

                <div className="bg-card p-5 rounded-3xl border border-border">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 flex items-center gap-1"><TrendingUp size={10} /> Eficiência</span>
                    <span className="text-sm font-black text-emerald-600 block">DENTRO DO PRAZO</span>
                </div>
            </div>

            {/* Visual Timeline Stream */}
            <div className="bg-card p-8 rounded-[48px] border border-border shadow-sm">
                <h5 className="text-xs font-black uppercase text-foreground flex items-center gap-2 mb-8">
                    <Clock size={16} className="text-slate-400" /> Fluxo de Processamento
                </h5>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    {metrics.stages.map((stage, i) => (
                        <React.Fragment key={i}>
                            <div className={`flex-1 w-full p-4 rounded-3xl border-2 transition-all ${stage.isCurrent ? 'bg-indigo-50 border-indigo-200' : 'bg-muted/30 border-transparent'} ${stage.isWarning ? 'border-red-200 bg-red-50/30' : ''}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${stage.isCurrent ? 'text-indigo-600' : 'text-slate-500'}`}>{stage.name}</span>
                                    {stage.isWarning && <AlertCircle size={12} className="text-red-500" />}
                                </div>
                                <div className="flex items-baseline gap-0.5">
                                    <span className={`text-xl font-black italic ${stage.isCurrent ? 'text-indigo-700' : 'text-foreground'}`}>{stage.days}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">d</span>
                                </div>
                            </div>
                            {i < metrics.stages.length - 1 && (
                                <div className="hidden md:block text-slate-200">
                                    <zap size={16} />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* AI Analysis Area */}
            <div className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-950 to-slate-900 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Sparkles size={20} className="text-emerald-400" />
                        <div>
                            <p className="text-white font-black text-sm uppercase italic tracking-tight">Diagnóstico de PCP</p>
                            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">IA Analyst · Otimização de Oficina</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95"
                    >
                        {isLoading ? (
                            <><Loader2 size={14} className="animate-spin" /> Analisando...</>
                        ) : (
                            <><Brain size={14} /> {hasAnalyzed ? 'Reanalisar Fluxo' : 'Analisar com IA'}</>
                        )}
                    </button>
                </div>

                <div className="p-8 min-h-[200px]">
                    {!hasAnalyzed && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mb-4 border border-emerald-100">
                                <Brain size={32} className="text-emerald-300" />
                            </div>
                            <p className="text-sm font-black text-slate-400 uppercase italic tracking-wider mb-1">Aguardando análise de fluxo</p>
                            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                                Clique no botão acima para que a IA analise todos os tempos desta obra e identifique possíveis melhorias no processo.
                            </p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mb-4 border border-emerald-100 animate-pulse">
                                <Loader2 size={32} className="text-emerald-400 animate-spin" />
                            </div>
                            <p className="text-sm font-black text-slate-400 uppercase italic tracking-wider">Consultando Analista PCP...</p>
                            <p className="text-xs text-slate-400 mt-2">Correlacionando datas, transições e gargalos</p>
                        </div>
                    )}

                    {hasAnalyzed && !isLoading && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
                                <CheckCircle2 size={16} className="text-emerald-500" />
                                <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">Análise de Eficiência Pronta</span>
                            </div>
                            <div className="prose-sm max-w-none">
                                {renderMarkdown(analysis)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PCPAnalystTab;
