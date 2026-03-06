
import React, { useMemo } from 'react';
import {
    Bell, Calendar, Clock, AlertTriangle,
    CheckCircle2, Wrench, ArrowRight, Phone,
    AlertCircle, Sparkles
} from 'lucide-react';
import { Project, TechnicalAssistance } from '../types';

interface Props {
    projects: Project[];
    assistances: TechnicalAssistance[];
    onClose: () => void;
}

const AlertCenter: React.FC<Props> = ({ projects, assistances, onClose }) => {
    const today = new Date().toISOString().split('T')[0];

    // Alerts Logic
    const alerts = useMemo(() => {
        const todayObj = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(todayObj.getDate() + 3);

        const assistanceToday = assistances.filter(a => a.scheduledDate === today && a.status !== 'Finalizado');
        const pendingReturns = assistances.filter(a => a.status === 'Retorno Pendente');

        const upcomingDeliveries = projects.filter(p => {
            if (!p.promisedDate || p.currentStatus === 'Finalizada') return false;
            const promised = new Date(p.promisedDate);
            return promised >= todayObj && promised <= threeDaysFromNow;
        });

        const overdueDeliveries = projects.filter(p => {
            if (!p.promisedDate || p.currentStatus === 'Finalizada') return false;
            const promised = new Date(p.promisedDate);
            return promised < todayObj;
        });

        return {
            assistanceToday,
            pendingReturns,
            upcomingDeliveries,
            overdueDeliveries,
            total: assistanceToday.length + pendingReturns.length + upcomingDeliveries.length + overdueDeliveries.length
        };
    }, [projects, assistances, today]);

    const handleWhatsAppSummary = () => {
        let msg = `*🚀 RESUMO DO DIA - HYPADO SYSTEM*\n\n`;
        msg += `*Data:* ${new Date().toLocaleDateString()}\n\n`;

        if (alerts.assistanceToday.length > 0) {
            msg += `*ðŸ› ï¸ ASSISTÊNCIAS HOJE (${alerts.assistanceToday.length}):*\n`;
            alerts.assistanceToday.forEach(a => {
                msg += `- ${a.clientName} (${a.workName}) ${a.scheduledTime ? `Ã s ${a.scheduledTime}` : ''}\n`;
            });
            msg += `\n`;
        }

        if (alerts.overdueDeliveries.length > 0) {
            msg += `*âš ï¸ ENTREGA ATRASADA (${alerts.overdueDeliveries.length}):*\n`;
            alerts.overdueDeliveries.forEach(p => {
                msg += `- ${p.workName} (Prometido: ${new Date(p.promisedDate!).toLocaleDateString()})\n`;
            });
            msg += `\n`;
        }

        if (alerts.upcomingDeliveries.length > 0) {
            msg += `*📅 PRÓXIMAS ENTREGAS (3 DIAS):*\n`;
            alerts.upcomingDeliveries.forEach(p => {
                msg += `- ${p.workName} (Data: ${new Date(p.promisedDate!).toLocaleDateString()})\n`;
            });
            msg += `\n`;
        }

        if (alerts.pendingReturns.length > 0) {
            msg += `*🔄 RETORNOS PENDENTES:* ${alerts.pendingReturns.length} chamados aguardando.\n`;
        }

        msg += `\n_Para mais detalhes, acesse o sistema: ${window.location.origin}_`;

        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-end p-0 md:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative bg-card w-full max-w-lg h-full md:h-auto md:max-h-[90vh] md:rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
                {/* Header */}
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 animate-pulse">
                            <Bell size={24} className="text-foreground" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Central de Alertas</h3>
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-2">{alerts.total} pendências identificadas</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-slate-800 rounded-full transition-all text-slate-400"
                        title="Fechar Alertas"
                    >
                        <ArrowRight size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar bg-muted/50/50">
                    {/* WhatsApp Action */}
                    <button
                        onClick={handleWhatsAppSummary}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-6 rounded-[32px] font-black uppercase italic tracking-widest shadow-xl shadow-emerald-200/50 transition-all active:scale-95 flex items-center justify-center gap-4 group"
                    >
                        <div className="w-10 h-10 bg-card/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-all">
                            <Phone size={24} />
                        </div>
                        <div className="text-left">
                            <span className="block text-xs opacity-70 leading-none mb-1">Backup Matinal</span>
                            Sincronizar via WhatsApp
                        </div>
                    </button>

                    {/* Overdue Deliveries - Critical */}
                    {alerts.overdueDeliveries.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <AlertCircle size={14} /> Entregas em Atraso
                            </h4>
                            <div className="space-y-2">
                                {alerts.overdueDeliveries.map(p => (
                                    <div key={p.id} className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between group">
                                        <div>
                                            <p className="font-black text-red-900 uppercase italic text-xs truncate max-w-[200px]">{p.workName}</p>
                                            <p className="text-[10px] font-bold text-red-400 mt-1 uppercase">Prometido em: {new Date(p.promisedDate!).toLocaleDateString()}</p>
                                        </div>
                                        <div className="px-3 py-1 bg-card rounded-lg text-red-600 font-black text-[10px] shadow-sm uppercase italic">Vencido</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Assisted Today */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Calendar size={14} /> Visitas Técnicas de Hoje
                        </h4>
                        {alerts.assistanceToday.length === 0 ? (
                            <p className="text-[10px] text-slate-300 font-bold uppercase italic p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">Nenhuma visita para hoje.</p>
                        ) : (
                            <div className="space-y-2">
                                {alerts.assistanceToday.map(a => (
                                    <div key={a.id} className="p-4 bg-card border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-amber-500 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg font-black text-[10px]">
                                                {a.scheduledTime || '--:--'}
                                            </div>
                                            <div>
                                                <p className="font-black text-foreground uppercase italic text-xs">{a.clientName}</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">{a.workName}</p>
                                            </div>
                                        </div>
                                        <Wrench size={16} className="text-slate-200 group-hover:text-amber-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Deliveries */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Clock size={14} /> Entregas em Breve (3 Dias)
                        </h4>
                        {alerts.upcomingDeliveries.length === 0 ? (
                            <p className="text-[10px] text-slate-300 font-bold uppercase italic p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">Sem entregas próximas.</p>
                        ) : (
                            <div className="space-y-2">
                                {alerts.upcomingDeliveries.map(p => (
                                    <div key={p.id} className="p-4 bg-card border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-blue-500 transition-all">
                                        <div>
                                            <p className="font-black text-foreground uppercase italic text-xs">{p.workName}</p>
                                            <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">Prometido: {new Date(p.promisedDate!).toLocaleDateString()}</p>
                                        </div>
                                        <CheckCircle2 size={16} className="text-slate-100 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Returns */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <AlertTriangle size={14} /> Retornos Pendentes
                        </h4>
                        {alerts.pendingReturns.length === 0 ? (
                            <p className="text-[10px] text-slate-300 font-bold uppercase italic p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">Tudo em dia!</p>
                        ) : (
                            <div className="space-y-2">
                                {alerts.pendingReturns.map(a => (
                                    <div key={a.id} className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between group">
                                        <div>
                                            <p className="font-black uppercase italic text-xs">{a.clientName}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">{a.workName}</p>
                                        </div>
                                        <div className="p-2 bg-slate-800 rounded-lg text-amber-500"><Wrench size={16} /></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer AI */}
                <div className="p-6 bg-muted/50 border-t border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Hypado AI Assistente</p>
                        <p className="text-[11px] font-bold text-muted-foreground leading-tight">Revise os alertas matinais para garantir o cumprimento dos prazos.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertCenter;
