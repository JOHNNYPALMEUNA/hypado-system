import React from 'react';
import {
    Clock, CheckCircle2, Factory, Truck, Users, Activity
} from 'lucide-react';
import { formatDate } from '../../utils';

interface TimelineTabProps {
    history: Array<{ status: string, timestamp: string }>;
}

const ProjectTimelineTab: React.FC<TimelineTabProps> = ({ history }) => {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Venda': return <Users size={14} />;
            case 'Projeto': return <Activity size={14} />;
            case 'Produção': return <Factory size={14} />;
            case 'Logística': return <Truck size={14} />;
            case 'Instalação': return <Clock size={14} />;
            case 'Finalizada': return <CheckCircle2 size={14} />;
            default: return <Clock size={14} />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
            <div className="bg-card p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <h5 className="text-sm font-black uppercase text-foreground mb-8 flex items-center gap-2">
                    <Clock size={18} className="text-primary" /> Histórico de Processamento (PCP)
                </h5>

                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {history.length > 0 ? (
                        history.map((event, idx) => (
                            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                {/* Icon Circle */}
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                    {getStatusIcon(event.status)}
                                </div>
                                {/* Content Card */}
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-3xl border border-slate-100 bg-muted/50/50">
                                    <div className="flex items-center justify-between space-x-2 mb-1">
                                        <span className="font-bold text-foreground text-sm">{event.status}</span>
                                        <time className="text-[10px] font-medium text-slate-400">{formatDate(event.timestamp)}</time>
                                    </div>
                                    <div className="text-muted-foreground text-[10px] font-medium italic">
                                        {idx === 0 ? 'Início do projeto no sistema.' : `Transição automática para a fase de ${event.status}.`}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-sm text-slate-400 italic">Nenhum histórico disponível para esta obra.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectTimelineTab;
