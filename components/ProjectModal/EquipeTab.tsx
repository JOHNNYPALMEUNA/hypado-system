import React from 'react';
import {
    Users, User, Phone, Mail, Award, MapPin, Briefcase
} from 'lucide-react';
import { Installer } from '../../types';

interface EquipeTabProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    installers: Installer[];
}

const EquipeTab: React.FC<EquipeTabProps> = ({
    formData,
    setFormData,
    installers
}) => {
    const selectedInstaller = installers.find(i => i.id === formData.installerId);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            {/* 1. Technical Team (Designer & Installer) */}
            <div className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <h5 className="text-sm font-black uppercase text-foreground mb-6 flex items-center gap-2">
                    <Briefcase size={18} className="text-primary" /> Atribuição de Equipe Técnica
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Designer Selection */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Projetista / Arquiteto Responsável</label>
                            <select
                                title="Selecionar Projetista"
                                className="w-full h-14 px-6 bg-muted/50 border border-border rounded-3xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                value={formData.architectId || ''}
                                onChange={e => setFormData({ ...formData, architectId: e.target.value })}
                            >
                                <option value="">A definir / Sem Projetista</option>
                                {installers.filter(i => i.role === 'Projetista' || i.role === 'Arquiteto').map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                            </select>
                        </div>

                        {installers.find(i => String(i.id) === String(formData.architectId)) && (
                            <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-center gap-4 animate-in zoom-in-95 duration-300">
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black text-indigo-600 overflow-hidden">
                                    {installers.find(i => String(i.id) === String(formData.architectId))?.avatar 
                                        ? <img src={installers.find(i => String(i.id) === String(formData.architectId))?.avatar} alt="Avatar" className="w-full h-full object-cover" /> 
                                        : installers.find(i => String(i.id) === String(formData.architectId))?.name.slice(0, 1)}
                                </div>
                                <div>
                                    <h6 className="text-sm font-black text-slate-900">{installers.find(i => String(i.id) === String(formData.architectId))?.name}</h6>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Responsável pelo Projeto</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Installer Selection */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Montador Responsável (Líder)</label>
                            <select
                                title="Selecionar Montador"
                                className="w-full h-14 px-6 bg-muted/50 border border-border rounded-3xl text-sm font-bold focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                                value={formData.installerId || ''}
                                onChange={e => setFormData({ ...formData, installerId: e.target.value })}
                            >
                                <option value="">A definir / Equipe Interna</option>
                                {installers.filter(i => i.role === 'Montador' || i.role === 'Marceneiro').map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.name} ({inst.city})</option>
                                ))}
                            </select>
                        </div>

                        {installers.find(i => String(i.id) === String(formData.installerId)) && (
                            <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-100 flex items-center gap-4 animate-in zoom-in-95 duration-300">
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black text-amber-600 overflow-hidden">
                                    {installers.find(i => String(i.id) === String(formData.installerId))?.avatar 
                                        ? <img src={installers.find(i => String(i.id) === String(formData.installerId))?.avatar} alt="Avatar" className="w-full h-full object-cover" /> 
                                        : installers.find(i => String(i.id) === String(formData.installerId))?.name.slice(0, 1)}
                                </div>
                                <div>
                                    <h6 className="text-sm font-black text-slate-900">{installers.find(i => String(i.id) === String(formData.installerId))?.name}</h6>
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Responsável pela Instalação</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Team Roles Placeholder */}
            <div className="bg-muted/50 p-10 rounded-[48px] border border-border/50 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-card shadow-sm flex items-center justify-center mb-4">
                    <Users size={28} className="text-slate-300" />
                </div>
                <h6 className="text-xs font-black uppercase text-slate-400 tracking-widest">Gestão de Equipe Estendida</h6>
                <p className="text-[10px] text-slate-400 font-medium max-w-md mt-4 leading-relaxed">
                    Em breve você poderá atribuir múltiplos auxiliares, projetistas e conferentes a esta obra, cada um com acesso personalizado ao dossiê.
                </p>
            </div>
        </div>
    );
};

export default EquipeTab;
