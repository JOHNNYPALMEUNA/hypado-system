import React from 'react';
import {
    Building2, FolderOpen, ShieldCheck, CheckCircle2, X
} from 'lucide-react';
import { Project } from '../../types';

interface QualityTabProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    auditStatus: 'Pendente' | 'Aprovado' | 'Reprovado';
    setAuditStatus: (status: 'Pendente' | 'Aprovado' | 'Reprovado') => void;
    report: any;
    setReport: (report: any) => void;
    handleSubmitAudit: () => void;
}

const QualityTab: React.FC<QualityTabProps> = ({
    formData,
    setFormData,
    auditStatus,
    setAuditStatus,
    report,
    setReport,
    handleSubmitAudit
}) => {
    const auditGuidelines = [
        { id: 'alignment', label: 'Alinhamento e Prumo das Portas/Gavetas' },
        { id: 'cleaning', label: 'Limpeza Fina e Retirada de Resíduos' },
        { id: 'hardware', label: 'Regulagem de Ferragens e Amortecedores' },
        { id: 'silicone', label: 'Acabamento de Silicone e Vedação' },
        { id: 'client_approval', label: 'Explicação de Uso e Cuidados (Cliente)' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="bg-muted/50 p-6 rounded-2xl border border-border">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h4 className="text-lg font-black uppercase italic tracking-tight text-foreground">Checklist Final de Entrega</h4>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Auditoria Técnica e Acabamento</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Endereço da Obra</label>
                            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2.5">
                                <Building2 size={16} className="text-slate-400" />
                                <input
                                    type="text"
                                    className="bg-transparent w-full text-sm font-bold text-foreground outline-none placeholder:text-slate-300"
                                    placeholder="Endereço completo"
                                    value={formData.workAddress}
                                    onChange={e => setFormData({ ...formData, workAddress: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Link da Pasta (Nuvem)</label>
                            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2.5">
                                <FolderOpen size={16} className="text-blue-400" />
                                <input
                                    type="url"
                                    className="bg-transparent w-full text-sm font-bold text-foreground outline-none placeholder:text-slate-300"
                                    placeholder="Cole aqui o link do OneDrive/Google Drive..."
                                    value={(formData as any).cloudFolderLink || ''}
                                    onChange={e => setFormData({ ...formData, cloudFolderLink: e.target.value } as any)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Itens de Inspeção</h5>
                        {auditGuidelines.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-card border border-slate-100 rounded-2xl transition-all hover:border-border group">
                                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">{item.label}</span>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-full border-border text-emerald-500 focus:ring-emerald-500 transition-all cursor-pointer"
                                    checked={report[item.id as keyof typeof report] as boolean}
                                    onChange={e => setReport({ ...report, [item.id]: e.target.checked })}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Observações Técnicas</label>
                            <textarea
                                className="w-full h-32 p-4 bg-card border border-border rounded-2xl text-xs font-medium outline-none focus:border-slate-400 transition-all resize-none"
                                placeholder="Descreva detalhes da finalização, ajustes feitos ou pendências..."
                                value={report.observations}
                                onChange={e => setReport({ ...report, observations: e.target.value })}
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Resultado da Auditoria</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setAuditStatus('Aprovado')}
                                    className={`py-6 rounded-3xl border transition-all flex flex-col items-center gap-2 group ${auditStatus === 'Aprovado' ? 'bg-emerald-500 border-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'bg-card border-border text-slate-400 hover:border-emerald-300 hover:text-emerald-500'}`}
                                >
                                    <ShieldCheck size={24} className={auditStatus === 'Aprovado' ? 'text-white' : 'group-hover:animate-bounce'} />
                                    <span className="text-[10px] font-black uppercase">Obra Aprovada</span>
                                </button>
                                <button
                                    onClick={() => setAuditStatus('Reprovado')}
                                    className={`py-6 rounded-3xl border transition-all flex flex-col items-center gap-2 group ${auditStatus === 'Reprovado' ? 'bg-red-500 border-red-600 text-white shadow-xl shadow-red-500/20' : 'bg-card border-border text-slate-400 hover:border-red-300 hover:text-red-500'}`}
                                >
                                    <X size={24} className={auditStatus === 'Reprovado' ? 'text-white' : 'group-hover:animate-shake'} />
                                    <span className="text-[10px] font-black uppercase">Reprovar / Ajuste</span>
                                </button>
                            </div>

                            {auditStatus !== 'Pendente' && (
                                <button
                                    onClick={handleSubmitAudit}
                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 ${auditStatus === 'Aprovado' ? 'bg-slate-900 text-white hover:bg-emerald-600' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                >
                                    <CheckCircle2 size={16} /> Finalizar Processo de Auditoria
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QualityTab;
