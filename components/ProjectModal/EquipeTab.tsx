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
            {/* 1. Installer Selection */}
            <div className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <h5 className="text-sm font-black uppercase text-foreground mb-6 flex items-center gap-2">
                    <Briefcase size={18} className="text-primary" /> Atribuição de Equipe (Instalação)
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Selecione o Montador Responsável</label>
                        <select
                            className="w-full h-14 px-6 bg-muted/50 border border-border rounded-3xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            value={formData.installerId}
                            onChange={e => setFormData({ ...formData, installerId: e.target.value })}
                        >
                            <option value="">A definir / Equipe Interna</option>
                            {installers.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name} ({inst.city})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 italic px-2 font-medium">Ao selecionar um montador, ele terá acesso Ã s informações da obra pelo link da proposta.</p>
                    </div>

                    {selectedInstaller && (
                        <div className="p-8 bg-primary/5 rounded-[32px] border border-primary/10 flex items-center gap-6 animate-in zoom-in-95 duration-300">
                            <div className="w-24 h-24 rounded-full bg-card border-4 border-white shadow-xl flex items-center justify-center text-3xl font-black text-primary overflow-hidden">
                                {selectedInstaller.avatar ? <img src={selectedInstaller.avatar} alt="Avatar" className="w-full h-full object-cover" /> : selectedInstaller.name.slice(0, 1)}
                            </div>
                            <div className="space-y-1">
                                <h6 className="text-xl font-black text-foreground tracking-tighter">{selectedInstaller.name}</h6>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                                        <Phone size={12} className="text-primary" /> {selectedInstaller.phone}
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                                        <MapPin size={12} className="text-primary" /> {selectedInstaller.city}
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold mt-1">
                                        <Award size={12} /> Nível: {selectedInstaller.rating >= 4.8 ? 'Diamante' : 'Ouro'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
