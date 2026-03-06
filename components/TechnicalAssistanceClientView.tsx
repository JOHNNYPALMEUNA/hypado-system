
import React, { useMemo } from 'react';
import { Wrench, CheckCircle2, Clock, MapPin, AlertTriangle, Calendar, Phone, Camera, Link, Printer } from 'lucide-react';
import { TechnicalAssistance, Installer } from '../types';

interface Props {
    assistance: TechnicalAssistance;
    installers: Installer[];
}

const TechnicalAssistanceClientView: React.FC<Props> = ({ assistance, installers }) => {
    const technician = useMemo(() =>
        installers.find(i => i.id === assistance.technicianId),
        [assistance, installers]);

    const originalInstaller = useMemo(() =>
        installers.find(i => i.id === assistance.originalInstallerId),
        [assistance, installers]);

    const formatIsoDateNoTimezone = (dateStr: string) => {
        if (!dateStr) return '';
        // "2026-03-02" split and manually instantiated at noon to avoid timezone shift
        const cleanDateStr = dateStr.substring(0, 10);
        const parts = cleanDateStr.split('-');
        if (parts.length === 3) {
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0).toLocaleDateString();
        }
        return new Date(dateStr).toLocaleDateString();
    };

    const statusColors = {
        'Aberto': 'bg-amber-100 text-amber-700 border-amber-200',
        'Agendado': 'bg-blue-100 text-blue-700 border-blue-200',
        'Retorno Pendente': 'bg-red-100 text-red-700 border-red-200',
        'Finalizado': 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };

    return (
        <>
            <div className="min-h-screen bg-muted/50 p-4 md:p-8 font-sans print:hidden">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header Card */}
                    <div className="bg-card rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${statusColors[assistance.status]}`}>
                                {assistance.status}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-500 shadow-lg shrink-0">
                                <Wrench size={32} />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-[22px] md:text-2xl font-black text-foreground uppercase italic tracking-tighter leading-none">Relatório de Assistência</h1>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Protocolo: #{assistance.id}</p>
                            </div>
                            <button onClick={() => window.print()} className="w-12 h-12 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center text-amber-500 hover:bg-amber-100 hover:text-amber-600 transition-colors shadow-sm shrink-0" title="Imprimir Relatório ou Salvar PDF">
                                <Printer size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                                <p className="font-bold text-foreground uppercase italic">{assistance.clientName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Obra</p>
                                <p className="font-bold text-foreground uppercase italic">{assistance.workName}</p>
                            </div>
                        </div>

                        {assistance.originalInstallerId && (
                            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100 shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Responsável pela Obra Original</p>
                                    <p className="font-bold text-foreground uppercase italic">{originalInstaller?.name || 'Técnico não encontrado ou acesso bloqueado'}</p>
                                    {originalInstaller?.phone && (
                                        <p className="text-[10px] text-muted-foreground font-bold mt-1">Contato: {originalInstaller?.phone}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {assistance.technicianId && (
                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 shadow-sm border border-blue-100 shrink-0">
                                    <Wrench size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Técnico que Executou a Assistência</p>
                                    <p className="font-bold text-foreground uppercase italic">{technician?.name || 'Técnico não encontrado ou acesso bloqueado'}</p>
                                    {technician?.phone && (
                                        <p className="text-[10px] text-muted-foreground font-bold mt-1">Contato: {technician?.phone}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tracking Progress */}
                    <div className="bg-card rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                        <h2 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2 mb-8 border-b border-slate-50 pb-4">
                            <Clock className="text-amber-500" size={18} /> Acompanhamento
                        </h2>

                        <div className="space-y-8 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                            {/* Step 1: Solicitação */}
                            <div className="flex gap-6 relative">
                                <div className="w-12 h-12 bg-card rounded-2xl border-2 border-slate-100 flex items-center justify-center shrink-0 z-10">
                                    <AlertTriangle size={20} className="text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-black text-foreground uppercase italic leading-none">Solicitação Recebida</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase">{formatIsoDateNoTimezone(assistance.requestDate)}</p>
                                    <div className="mt-3 p-4 bg-muted/50 rounded-2xl border border-slate-100">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Problema Relatado:</p>
                                        <p className="text-sm text-foreground italic">"{assistance.reportedProblem}"</p>

                                        {(assistance.photoUrl || assistance.videoUrl) && (
                                            <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row gap-2">
                                                {assistance.photoUrl && (
                                                    <a href={assistance.photoUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-card hover:bg-muted border border-border text-muted-foreground font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-colors">
                                                        <Camera size={16} /> Ver Foto
                                                    </a>
                                                )}
                                                {assistance.videoUrl && (
                                                    <a href={assistance.videoUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-foreground font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-sm border border-transparent">
                                                        <Link size={16} /> Abrir Mídia/Vídeo
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Agendamento */}
                            {assistance.scheduledDate && (
                                <div className="flex gap-6 relative">
                                    <div className="w-12 h-12 bg-card rounded-2xl border-2 border-blue-100 flex items-center justify-center shrink-0 z-10 shadow-sm">
                                        <Calendar size={20} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-foreground uppercase italic leading-none">Visita Técnica Agendada</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase">
                                            {formatIsoDateNoTimezone(assistance.scheduledDate)} {assistance.scheduledTime ? `Ã s ${assistance.scheduledTime}` : ''}
                                        </p>
                                        {/* Technician block removed from here as it is now more prominent in the header */}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Conclusão */}
                            {assistance.status === 'Finalizado' && (
                                <div className="flex gap-6 relative animate-in zoom-in-95">
                                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-lg shadow-emerald-200">
                                        <CheckCircle2 size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-emerald-600 uppercase italic leading-none">Chamado Finalizado</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Garantia Ativa</p>

                                        {assistance.returnDate && (
                                            <p className="text-xs font-bold text-emerald-600 uppercase mt-2 mb-2 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                                                Retorno Realizado em: {formatIsoDateNoTimezone(assistance.returnDate)}
                                            </p>
                                        )}

                                        {assistance.finalObservations && (
                                            <div className="mt-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                                <p className="text-sm font-medium text-emerald-800 italic">"{assistance.finalObservations}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="text-center space-y-2 pb-12">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hypado System • Gestão de Marcenaria Premium</p>
                        <p className="text-[9px] text-slate-300 font-bold italic uppercase">Documento gerado eletronicamente em {new Date().toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* PRINTABLE COMPONENT */}
            <div id="printable-assistance-report" className="hidden print:block fixed inset-0 z-[9999] bg-card">
                <div className="print-header">
                    <div>
                        <div className="print-logo-box">
                            <Wrench size={40} />
                        </div>
                        <h1 className="text-3xl font-black">Hypado System</h1>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Gestão de Assistência e Garantia</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-black text-foreground italic uppercase">Relatório de Assistência</h2>
                        <p className="text-sm font-bold text-muted-foreground mt-2">ID: {assistance.id}</p>
                        <div className="print-status-tag">{assistance.status}</div>
                    </div>
                </div>

                <div className="print-info-grid">
                    <div className="print-info-item">
                        <span className="print-info-label">Cliente</span>
                        <span className="print-info-value">{assistance.clientName}</span>
                    </div>
                    <div className="print-info-item">
                        <span className="print-info-label">Obra</span>
                        <span className="print-info-value">{assistance.workName}</span>
                    </div>
                    <div className="print-info-item">
                        <span className="print-info-label">Solicitação</span>
                        <span className="print-info-value">{formatIsoDateNoTimezone(assistance.requestDate)}</span>
                    </div>
                </div>

                <div className="print-info-grid">
                    <div className="print-info-item">
                        <span className="print-info-label">Agendamento</span>
                        <span className="print-info-value">{assistance.scheduledDate ? formatIsoDateNoTimezone(assistance.scheduledDate) : 'Não agendado'}</span>
                    </div>
                    <div className="print-info-item">
                        <span className="print-info-label">Horário</span>
                        <span className="print-info-value">{assistance.scheduledTime || '--:--'}</span>
                    </div>
                    <div className="print-info-item">
                        <span className="print-info-label">Técnico Resp.</span>
                        <span className="print-info-value">{technician?.name || 'N/A'}</span>
                    </div>
                </div>

                <div className="print-divider" />

                <div className="print-section">
                    <h3 className="print-section-title">Problema Relatado</h3>
                    <div className="print-description-box">
                        <p className="print-description-text">{assistance.reportedProblem}</p>
                    </div>
                </div>

                {assistance.visitResult && (
                    <div className="print-section">
                        <h3 className="print-section-title">Relatório da Visita</h3>
                        <div className="print-description-box" style={{ borderLeftColor: '#10b981' }}>
                            <p className="print-description-text">{assistance.visitResult}</p>
                        </div>
                    </div>
                )}

                {assistance.pendingIssues && (
                    <div className="print-section">
                        <h3 className="print-section-title" style={{ color: '#ef4444' }}>Pendências / Retorno</h3>
                        <div className="print-description-box" style={{ borderLeftColor: '#ef4444', backgroundColor: '#fef2f2' }}>
                            <p className="print-description-text">{assistance.pendingIssues}</p>
                            {assistance.returnDate && (
                                <p className="mt-4 text-xs font-black uppercase text-red-600">Retorno Previsto: {formatIsoDateNoTimezone(assistance.returnDate)}</p>
                            )}
                        </div>
                    </div>
                )}

                {assistance.finalObservations && (
                    <div className="print-section">
                        <h3 className="print-section-title">Observações Finais</h3>
                        <div className="p-6 border-2 border-slate-100 rounded-2xl italic text-sm text-muted-foreground">
                            {assistance.finalObservations}
                        </div>
                    </div>
                )}

                {assistance.photoUrl && (
                    <div className="print-section">
                        <h3 className="print-section-title">Evidência Fotográfica</h3>
                        <div className="print-photo-container">
                            <img src={assistance.photoUrl} alt="Evidência" />
                        </div>
                    </div>
                )}

                <div className="print-footer">
                    Relatório gerado via Hypado System em {new Date().toLocaleString()} • Documento Oficial de Garantia
                </div>
            </div>
        </>
    );
};

export default TechnicalAssistanceClientView;
