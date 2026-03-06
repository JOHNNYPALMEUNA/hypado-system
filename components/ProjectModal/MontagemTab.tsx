import React from 'react';
import { Layers, Plus, X, Sparkles, MapPin } from 'lucide-react';
import { MemorialDescritivo } from '../../types';

interface MontagemTabProps {
    formData: any;
    updateMemorial: (envName: string, field: keyof MemorialDescritivo, val: any) => void;
}

const MontagemTab: React.FC<MontagemTabProps> = ({ formData, updateMemorial }) => {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-amber-100 text-amber-600 rounded-3xl shadow-inner">
                    <Layers size={32} />
                </div>
                <div>
                    <h4 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">Mapa de Montagem Digital</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Vincule os IDs das etiquetas Ã s posições dos módulos</p>
                </div>
            </div>

            {formData.selectedEnvironments.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-[48px] border-2 border-dashed border-border">
                    <MapPin size={48} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase italic text-sm">Selecione ao menos um ambiente na aba Geral primeiro.</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {formData.selectedEnvironments.map((envName: string) => (
                        <div key={envName} className="bg-card rounded-[48px] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="bg-slate-900 p-8 flex justify-between items-center">
                                <h5 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                                    <Sparkles size={20} className="text-amber-500" /> {envName}
                                </h5>
                                <div className="px-4 py-1.5 bg-card/10 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                                    {((formData.environmentsDetails?.[envName] as any)?.modules || []).length} Módulos
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                {((formData.environmentsDetails?.[envName] as any)?.modules || []).map((mod: any, idx: number) => (
                                    <div key={mod.id} className="p-6 bg-muted/50 rounded-[32px] border border-border/50">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Módulo / Item</p>
                                                <h6 className="text-lg font-black text-foreground uppercase italic leading-none">{mod.name}</h6>
                                                {mod.description && <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase">{mod.description}</p>}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                    const parts = mod.parts || [];
                                                    parts.push({
                                                        id: `part-${Date.now()}`,
                                                        uniqueId: '',
                                                        partName: 'Peça ' + (parts.length + 1),
                                                        brandColor: 'Padronizado',
                                                        thickness: '15mm',
                                                        width: 0,
                                                        depth: 0
                                                    });
                                                    current[idx].parts = parts;
                                                    updateMemorial(envName, 'modules' as any, current);
                                                }}
                                                className="bg-card hover:bg-slate-900 border-2 border-border hover:border-slate-900 p-3 rounded-2xl text-foreground hover:text-white transition-all shadow-sm flex items-center gap-2 group"
                                                title="Adicionar Identificação de Peça"
                                            >
                                                <Plus size={16} className="text-amber-500 group-hover:scale-125 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Add Peça / ID</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {(mod.parts || []).map((part: any, pIdx: number) => (
                                                <div key={part.id} className="bg-card p-4 rounded-2xl border-2 border-transparent hover:border-amber-400 transition-all flex flex-col gap-3 shadow-sm group/part relative">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-16">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase italic block mb-1">ID Único</label>
                                                            <input
                                                                placeholder="ex: 338"
                                                                className="w-full text-xs font-black text-center bg-muted/50 border-2 border-slate-100 rounded-xl p-2 outline-none focus:border-amber-500 focus:bg-card transition-all"
                                                                value={part.uniqueId || ''}
                                                                onChange={(e) => {
                                                                    const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                    current[idx].parts[pIdx].uniqueId = e.target.value;
                                                                    updateMemorial(envName, 'modules' as any, current);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase italic block mb-1">Descrição</label>
                                                            <input
                                                                placeholder="Nome da peça"
                                                                className="w-full text-[10px] font-bold bg-transparent border-b-2 border-transparent focus:border-border outline-none"
                                                                value={part.partName}
                                                                onChange={(e) => {
                                                                    const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                    current[idx].parts[pIdx].partName = e.target.value;
                                                                    updateMemorial(envName, 'modules' as any, current);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 border-t border-slate-50 pt-3">
                                                        <div className="flex-1">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase italic block">Larg (mm)</label>
                                                            <input
                                                                type="number"
                                                                placeholder="Larg"
                                                                title="Largura da peça em mm"
                                                                className="w-full text-[11px] font-black bg-muted/50 rounded-lg p-1.5 outline-none focus:bg-card text-muted-foreground"
                                                                value={part.width || ''}
                                                                onChange={(e) => {
                                                                    const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                    current[idx].parts[pIdx].width = parseFloat(e.target.value);
                                                                    updateMemorial(envName, 'modules' as any, current);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase italic block">Prof (mm)</label>
                                                            <input
                                                                type="number"
                                                                placeholder="Prof"
                                                                title="Profundidade da peça em mm"
                                                                className="w-full text-[11px] font-black bg-muted/50 rounded-lg p-1.5 outline-none focus:bg-card text-muted-foreground"
                                                                value={part.depth || ''}
                                                                onChange={(e) => {
                                                                    const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                    current[idx].parts[pIdx].depth = parseFloat(e.target.value);
                                                                    updateMemorial(envName, 'modules' as any, current);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                            current[idx].parts.splice(pIdx, 1);
                                                            updateMemorial(envName, 'modules' as any, current);
                                                        }}
                                                        className="absolute -top-2 -right-2 p-1.5 bg-card border border-border text-slate-300 hover:text-red-500 hover:border-red-500 rounded-full opacity-0 group-hover/part:opacity-100 transition-all shadow-sm"
                                                        title="Excluir Peça"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!mod.parts || mod.parts.length === 0) && (
                                                <div className="col-span-full py-6 text-center text-slate-400 text-[10px] font-bold uppercase italic border-2 border-dashed border-border rounded-2xl">
                                                    Nenhuma peça identificada neste módulo.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(!((formData.environmentsDetails?.[envName] as any)?.modules) || (formData.environmentsDetails?.[envName] as any)?.modules.length === 0) && (
                                    <div className="text-center py-12 text-slate-400 italic text-xs">
                                        Nenhum módulo cadastrado para este ambiente.
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MontagemTab;
