import React, { useMemo } from 'react';
import {
    Clock, CheckCircle2, Factory, Truck, Users, Activity, AlertCircle, FileText, CheckCircle, Target, MessageSquare, Construction, Power, Package, Wrench, Sparkles
} from 'lucide-react';
import { formatDate } from '../../utils';
import { useData } from '../../contexts/DataContext';
import { ProductionStatus } from '../../types';

interface TimelineTabProps {
    projectId: string;
    history: Array<{ status: ProductionStatus, timestamp: string }>;
}

const ProjectTimelineTab: React.FC<TimelineTabProps> = ({ projectId, history }) => {
    const { timelineEvents, dailyLogs } = useData();

    const unifiedTimeline = useMemo(() => {
        // Safe check for data sources
        const safeHistory = history || [];
        const safeTimelineEvents = timelineEvents || [];
        const safeDailyLogs = dailyLogs || [];

        // 1. History from project object (Status Changes)
        const historyEvents = safeHistory.map(h => ({
            type: 'status_change',
            title: h.status,
            description: `Transição para a fase de ${h.status}.`,
            timestamp: h.timestamp,
            status: h.status,
            severity: 'info'
        }));

        // 2. Timeline Events from DB (System logs)
        const sysEvents = safeTimelineEvents
            .filter(e => e && String(e.relatedId) === String(projectId) && e.relatedType === 'PROJECT')
            .map(e => ({
                type: 'system',
                title: e.eventType === 'STATUS_CHANGE' ? `Status: ${e.newValue}` : e.eventType,
                description: e.oldValue ? `Alterado de ${e.oldValue} para ${e.newValue}` : `Evento do sistema registrado.`,
                timestamp: e.createdAt,
                status: (e.newValue as ProductionStatus) || 'Projeto',
                severity: 'info'
            }));

        // 3. Daily Logs (Occurrences / Bottlenecks)
        const occurrences = safeDailyLogs
            .filter(l => l && String(l.projectId) === String(projectId))
            .map(l => ({
                type: 'occurrence',
                title: l.category,
                description: l.description,
                timestamp: l.createdAt || l.date,
                status: 'Ocorrência' as any,
                severity: l.category === 'Registro Diário' ? 'info' : 'warning',
                author: l.author
            }));

        // Combine and Sort
        const combined = [...historyEvents, ...sysEvents, ...occurrences]
            .filter(ev => ev.timestamp) 
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Newest first for better UX

        // Remove duplicates
        const unique = combined.filter((ev, idx, self) => 
            idx === self.findIndex((t) => (
                t.timestamp === ev.timestamp && t.title === ev.title
            ))
        );

        return unique;
    }, [projectId, history, timelineEvents, dailyLogs]);

    const getEventIcon = (ev: any) => {
        if (ev.type === 'occurrence') {
            return ev.severity === 'warning' ? <AlertCircle size={14} className="text-amber-500" /> : <MessageSquare size={14} className="text-blue-500" />;
        }

        switch (ev.status) {
            case 'Venda': return <Users size={14} />;
            case 'Projeto': return <Activity size={14} />;
            case 'Produção': return <Factory size={14} />;
            case 'Corte': return <Target size={14} />;
            case 'Logística': return <Truck size={14} />;
            case 'Instalação': return <Clock size={14} />;
            case 'Finalizada': return <CheckCircle2 size={14} />;
            default: return <Clock size={14} />;
        }
    };

    const bottlenecks = unifiedTimeline.filter(ev => ev.type === 'occurrence' && ev.severity === 'warning');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
            {/* Bottleneck Summary */}
            {bottlenecks.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-[32px] flex items-start gap-4 shadow-sm italic">
                    <div className="bg-amber-500/20 p-3 rounded-2xl text-amber-600">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h4 className="text-amber-900 font-black uppercase text-xs tracking-widest mb-1">Análise de Gargalos (PCP)</h4>
                        <p className="text-amber-800/80 text-xs font-medium">
                            Identificamos {bottlenecks.length} ocorrência(s) que podem estar impactando o cronograma desta obra. 
                            Verifique os detalhes abaixo para otimizar o fluxo de produção.
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-card p-6 md:p-10 rounded-[48px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Construction size={120} />
                </div>

                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h5 className="text-sm font-black uppercase text-foreground mb-1 flex items-center gap-2">
                            <Clock size={18} className="text-primary" /> Histórico Evolutivo
                        </h5>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Linha do Tempo de Processamento PCP</p>
                    </div>
                    {projectId && (
                         <div className="text-[10px] font-black uppercase bg-muted px-4 py-2 rounded-full border border-border/50 text-slate-500">
                            ID: {projectId.split('-')[1] || projectId.substring(0,8)}
                         </div>
                    )}
                </div>

                <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {unifiedTimeline.length > 0 ? (
                        unifiedTimeline.map((ev, idx) => (
                            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                {/* Icon Circle */}
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all group-hover:scale-110 ${
                                    ev.type === 'occurrence' && ev.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 
                                    ev.type === 'occurrence' ? 'bg-blue-100 text-blue-600' :
                                    ev.status === 'Finalizada' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'
                                }`}>
                                    {getEventIcon(ev)}
                                </div>
                                
                                {/* Content Card */}
                                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-[32px] border transition-all duration-300 group-hover:shadow-md ${
                                    ev.type === 'occurrence' && ev.severity === 'warning' ? 'bg-amber-50/50 border-amber-100' : 
                                    ev.type === 'occurrence' ? 'bg-blue-50/30 border-blue-100' :
                                    ev.status === 'Finalizada' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-card border-slate-100'
                                }`}>
                                    <div className="flex items-center justify-between space-x-2 mb-2">
                                        <div className="flex flex-col">
                                            <span className={`font-black uppercase text-[10px] tracking-widest ${
                                                ev.type === 'occurrence' && ev.severity === 'warning' ? 'text-amber-600' : 
                                                ev.type === 'occurrence' ? 'text-blue-600' :
                                                ev.status === 'Finalizada' ? 'text-emerald-600' : 'text-primary'
                                            }`}>
                                                {ev.type === 'occurrence' ? 'Ocorrência' : 'Status'}
                                            </span>
                                            <span className="font-bold text-foreground text-sm leading-tight">{ev.title}</span>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <time className="text-[10px] font-black text-slate-400">{formatDate(ev.timestamp)}</time>
                                            <span className="text-[9px] font-medium text-slate-300 italic">{new Date(ev.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </div>
                                    <div className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                                        {ev.description}
                                    </div>
                                    {ev.author && (
                                        <div className="mt-3 pt-3 border-t border-slate-100/50 flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">{ev.author.substring(0,2).toUpperCase()}</div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Registrado por: {ev.author}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-[40px] border-2 border-dashed border-border/50">
                            <Clock size={48} className="mx-auto text-slate-300 mb-4 opacity-20" />
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">Nenhum histórico rastreado</p>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Optimization Tip */}
            <div className="bg-slate-900 text-white p-8 rounded-[40px] flex items-center gap-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/40 transition-all duration-700"></div>
                <div className="bg-primary/20 p-4 rounded-3xl text-primary">
                    <Sparkles size={28} />
                </div>
                <div>
                    <h4 className="text-sm font-black uppercase italic tracking-tighter mb-1">Dica de Otimização IA</h4>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-xl">
                        Acompanhe o tempo entre transições de status para identificar onde sua produção está acumulando atrasos. 
                        Peças com status "Reprovado" na auditoria geram assistência técnica automática para correção imediata.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProjectTimelineTab;
