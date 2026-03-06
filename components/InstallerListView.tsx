
import React, { useState } from 'react';
import { Installer, Project, TeamRole } from '../types';
import {
  Plus, Search, User, Phone, Edit2, Trash2, Star, Camera,
  Trophy, TrendingUp, Hammer, X, Save, Ban, CheckCircle2,
  HardHat, Info, Mail, Users, Truck, Paintbrush, Scissors, LayoutDashboard, ShieldCheck
} from 'lucide-react';


interface Props {
  installers: Installer[];
  setInstallers: React.Dispatch<React.SetStateAction<Installer[]>>;
  projects: Project[];
}

const ROLES: TeamRole[] = ['Montador', 'Ajudante', 'Marceneiro', 'Freteiro', 'Projetista', 'Gerente', 'Vendedora'];

const ROLE_ICONS: Record<TeamRole, any> = {
  'Montador': HardHat,
  'Ajudante': Users,
  'Marceneiro': Scissors,
  'Freteiro': Truck,
  'Projetista': LayoutDashboard,
  'Gerente': ShieldCheck,
  'Vendedora': TrendingUp
};

import { useData } from '../contexts/DataContext';

// ... imports

const InstallerListView: React.FC<Props> = ({ projects }) => {
  const { installers, addInstaller, updateInstaller, deleteInstaller } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'Todos' | TeamRole>('Todos');
  const [editingInstaller, setEditingInstaller] = useState<Installer | null>(null);

  const [formData, setFormData] = useState({
    name: '', cpf: '', phone: '', specialty: '', observations: '', status: 'Ativo' as any, role: 'Montador' as TeamRole, defaultDailyRate: '', avatar: ''
  });

  const openModal = (inst?: Installer) => {
    if (inst) {
      setEditingInstaller(inst);
      setFormData({
        name: inst.name || '',
        cpf: inst.cpf || '',
        phone: inst.phone || '',
        specialty: inst.specialty || '',
        observations: inst.observations || '',
        status: inst.status || 'Ativo',
        role: inst.role || 'Montador',
        defaultDailyRate: (inst.defaultDailyRate || '').toString(),
        avatar: inst.avatar || ''
      });
    } else {
      setEditingInstaller(null);
      setFormData({ name: '', cpf: '', phone: '', specialty: '', observations: '', status: 'Ativo', role: 'Montador', defaultDailyRate: '', avatar: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    // Explicitly destructure to remove fields that don't exist in DB
    const { defaultDailyRate, ...cleanFormData } = formData;
    const dataToSave = cleanFormData;

    if (editingInstaller) {
      await updateInstaller({ ...editingInstaller, ...cleanFormData });
    } else {
      const newInst: Installer = {
        id: `i-${Date.now()}`,
        ...dataToSave,
        installationsCount: 0,
        averageRating: 0,
        totalBonus: 0
      };
      await addInstaller(newInst);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!editingInstaller) return;
    if (confirm(`Excluir profissional ${editingInstaller.name}?`)) {
      const pwd = prompt('Digite a senha de administrador:');
      if (pwd !== 'adm123') {
        alert('Senha incorreta!');
        return;
      }
      await deleteInstaller(editingInstaller.id);
      setIsModalOpen(false);
    }
  };

  const filtered = (installers || []).filter(i => {
    const matchesSearch = (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (i.phone || '').includes(searchTerm);
    const matchesRole = filterRole === 'Todos' || i.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl md:text-3xl font-black text-foreground tracking-tighter uppercase italic leading-tight">Gestão de Equipe & Capital Humano</h3>
          <p className="text-muted-foreground font-bold text-[10px] md:text-sm uppercase italic tracking-widest mt-1">Controle de Montadores, Marceneiros e Ajudantes</p>
        </div>
        <button onClick={() => openModal()} className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary hover:text-primary-foreground transition-all shadow-xl active:scale-95 group">
          <Plus size={20} className="group-hover:rotate-90 transition-transform" /> Cadastrar Profissional
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-3 md:p-4 rounded-[24px] md:rounded-[32px] border border-border shadow-sm">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou contato..."
            className="w-full pl-12 pr-4 py-3 bg-muted/50 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-primary/30 focus:bg-card transition-all text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-muted p-1 rounded-2xl overflow-x-auto w-full md:w-auto no-scrollbar">
          <button onClick={() => setFilterRole('Todos')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${filterRole === 'Todos' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-muted-foreground'}`}>Todos</button>
          {ROLES.map(role => (
            <button key={role} onClick={() => setFilterRole(role)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${filterRole === role ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-muted-foreground'}`}>{role}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filtered.map(inst => {
          const Icon = ROLE_ICONS[inst.role] || User;

          // Dynamic Stats Calculation
          const instProjects = projects.filter(p =>
            p.installerId === inst.id ||
            (p.environmentsDetails || []).some(env => env.assignedInstallerId === inst.id)
          );
          const installationsCount = instProjects.length;

          const totalEarnings = projects.reduce((acc, p) => {
            const envSum = (p.environmentsDetails || [])
              .filter(env => env.assignedInstallerId === inst.id && env.mdoStatus === 'Aceito')
              .reduce((sum, env) => sum + (env.authorizedMdoValue || 0), 0);
            return acc + envSum;
          }, 0);

          return (
            <div key={inst.id} className="bg-card rounded-[24px] md:rounded-[40px] border border-border shadow-sm p-6 md:p-8 hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all group relative overflow-hidden flex flex-col h-full border-b-4 border-b-transparent hover:border-b-primary">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {inst.avatar ? (
                      <img src={inst.avatar} alt={inst.name} className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-[24px] object-cover border-2 border-slate-100 group-hover:border-primary transition-all" />
                    ) : (
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-muted rounded-2xl md:rounded-[24px] flex items-center justify-center text-xl md:text-2xl font-black text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <Icon size={24} />
                      </div>
                    )}
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${inst.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                      {inst.status === 'Ativo' ? <CheckCircle2 size={8} className="text-white" /> : <Ban size={8} className="text-white" />}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg md:text-xl font-black text-foreground uppercase italic tracking-tighter leading-none truncate">{inst.name}</h4>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1 italic leading-none">{inst.role}</p>
                  </div>
                </div>
                <button onClick={() => openModal(inst)} aria-label={`Editar perfil de ${inst.name}`} title="Editar Perfil" className="p-3 text-slate-300 hover:text-primary transition-all hover:bg-primary/5 rounded-xl">
                  <Edit2 size={20} />
                </button>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground uppercase italic bg-muted/50 p-2 rounded-xl border border-slate-100">
                  <Phone size={14} className="text-primary" /> {inst.phone || 'Sem contato'}
                </div>
                {inst.defaultDailyRate && (
                  <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase italic tracking-widest bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                    <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px]">R$</span> {inst.defaultDailyRate.toLocaleString()} <span className="text-[8px] text-emerald-400">/ DIA</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                <div className="bg-muted/50 p-3 rounded-2xl text-center group-hover:bg-card group-hover:shadow-inner transition-all border border-transparent group-hover:border-slate-100">
                  <p className="text-lg md:text-2xl font-black text-foreground leading-none">{installationsCount}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Obras</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-2xl text-center group-hover:bg-card group-hover:shadow-inner transition-all border border-transparent group-hover:border-slate-100">
                  <p className="text-lg md:text-2xl font-black text-emerald-600 leading-none">R$ {totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Ganhos</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-0 z-50 bg-card w-full h-[100dvh] md:relative md:w-full md:max-w-lg md:h-[90vh] md:rounded-[40px] shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            {/* Header / Content / Footer separation for Installer Modal */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-card z-10 pb-2">
                <div>
                  <h4 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-foreground">{editingInstaller ? 'Atualizar Perfil' : 'Novo Profissional'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão de Capital Humano</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Fechar modal"
                  title="Fechar"
                  className="p-3 bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500 rounded-xl transition-all active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <label className="relative group cursor-pointer">
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-muted/50 border-4 border-dashed border-border flex items-center justify-center overflow-hidden group-hover:border-primary group-hover:bg-card transition-all shadow-inner">
                        {formData.avatar ? (
                          <img src={formData.avatar} alt="Foto do profissional" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <User size={32} className="text-slate-300 group-hover:text-primary transition-colors" />
                            <span className="text-[8px] font-black text-slate-400 group-hover:text-primary transition-colors uppercase">Upload</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 md:p-3 rounded-2xl shadow-xl flex items-center justify-center group-hover:scale-110 transition-all border-4 border-white">
                        <Camera size={16} />
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData(p => ({ ...p, avatar: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Foto de Perfil Especialista</p>
                      <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">JPG, PNG ou WEBP até 2MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nome Completo do Profissional</label>
                      <div className="relative group">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          placeholder="Ex: João da Silva"
                          className="w-full pl-12 pr-5 py-4 bg-muted/50 rounded-2xl font-bold border-2 border-transparent focus:border-primary focus:bg-card outline-none transition-all shadow-inner"
                          value={formData.name}
                          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Função Principal</label>
                      <select
                        aria-label="Função Principal"
                        className="w-full px-5 py-4 bg-muted/50 rounded-2xl font-bold border-2 border-transparent focus:border-primary focus:bg-card outline-none transition-all shadow-inner appearance-none cursor-pointer"
                        value={formData.role}
                        onChange={e => setFormData(p => ({ ...p, role: e.target.value as TeamRole }))}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Documento CPF</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        className="w-full px-5 py-4 bg-muted/50 rounded-2xl font-bold border-2 border-transparent focus:border-primary focus:bg-card outline-none transition-all shadow-inner"
                        value={formData.cpf}
                        onChange={e => setFormData(p => ({ ...p, cpf: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">WhatsApp / Celular</label>
                      <div className="relative group">
                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          placeholder="(00) 00000-0000"
                          className="w-full pl-12 pr-5 py-4 bg-muted/50 rounded-2xl font-bold border-2 border-transparent focus:border-primary focus:bg-card outline-none transition-all shadow-inner"
                          value={formData.phone}
                          onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Status Atual</label>
                      <div className="flex bg-muted/50 p-1 rounded-2xl shadow-inner">
                        {['Ativo', 'Inativo'].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, status: s as any }))}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.status === s ? 'bg-card text-foreground shadow-sm' : 'text-slate-400 hover:text-muted-foreground'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </div>
            {/* Fixed Footer for Installer Modal */}
            <div className="p-4 bg-muted/50 border-t border-slate-100 flex flex-col gap-3 shrink-0">
              <button onClick={handleSubmit} type="button" className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all shadow-xl active:scale-[0.98]">
                {editingInstaller ? 'Salvar Alterações' : 'Confirmar Cadastro'}
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-muted rounded-2xl transition-all border border-transparent hover:border-border">
                  Fechar
                </button>
                {editingInstaller && (
                  <button type="button" onClick={handleDelete} className="flex-1 py-3 text-red-500 font-bold uppercase tracking-widest text-[10px] hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-2">
                    <Trash2 size={14} /> Remover
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallerListView;
