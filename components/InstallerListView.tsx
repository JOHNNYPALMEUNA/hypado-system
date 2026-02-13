
import React, { useState } from 'react';
import { Installer, Project, TeamRole } from '../types';
import {
  Plus, Search, User, Phone, Edit2, Trash2, Star,
  Trophy, TrendingUp, Hammer, X, Save, Ban, CheckCircle2,
  HardHat, Info, Mail, Users, Truck, Paintbrush, Scissors, LayoutDashboard
} from 'lucide-react';

interface Props {
  installers: Installer[];
  setInstallers: React.Dispatch<React.SetStateAction<Installer[]>>;
  projects: Project[];
}

const ROLES: TeamRole[] = ['Montador', 'Ajudante', 'Marceneiro', 'Freteiro', 'Projetista'];

const ROLE_ICONS: Record<TeamRole, any> = {
  'Montador': HardHat,
  'Ajudante': Users,
  'Marceneiro': Scissors,
  'Freteiro': Truck,
  'Projetista': LayoutDashboard
};

const InstallerListView: React.FC<Props> = ({ installers, setInstallers, projects }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'Todos' | TeamRole>('Todos');
  const [editingInstaller, setEditingInstaller] = useState<Installer | null>(null);

  const [formData, setFormData] = useState({
    name: '', cpf: '', phone: '', specialty: '', observations: '', status: 'Ativo' as any, role: 'Montador' as TeamRole, defaultDailyRate: ''
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
        defaultDailyRate: (inst.defaultDailyRate || '').toString()
      });
    } else {
      setEditingInstaller(null);
      setFormData({ name: '', cpf: '', phone: '', specialty: '', observations: '', status: 'Ativo', role: 'Montador', defaultDailyRate: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      defaultDailyRate: formData.defaultDailyRate ? Number(formData.defaultDailyRate) : undefined
    };

    if (editingInstaller) {
      setInstallers(prev => (prev || []).map(i => i.id === editingInstaller.id ? { ...i, ...dataToSave } : i));
    } else {
      const newInst: Installer = {
        id: `i-${Date.now()}`,
        ...dataToSave,
        installationsCount: 0,
        averageRating: 0,
        totalBonus: 0
      };
      setInstallers(prev => [...(prev || []), newInst]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!editingInstaller) return;
    if (confirm(`Excluir profissional ${editingInstaller.name}?`)) {
      const pwd = prompt('Digite a senha de administrador:');
      if (pwd !== 'adm123') {
        alert('Senha incorreta!');
        return;
      }
      setInstallers(prev => prev.filter(i => i.id !== editingInstaller.id));
      setIsModalOpen(false);
    }
  };

  const filtered = (installers || []).filter(i => {
    const matchesSearch = (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (i.phone || '').includes(searchTerm);
    const matchesRole = filterRole === 'Todos' || i.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Gestão de Equipe & Capital Humano</h3>
          <p className="text-slate-500 font-bold text-sm uppercase italic">Controle de Montadores, Marceneiros e Ajudantes</p>
        </div>
        <button onClick={() => openModal()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-500 transition-all shadow-xl active:scale-95">
          <Plus size={20} /> Cadastrar Profissional
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou contato..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-amber-500 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setFilterRole('Todos')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterRole === 'Todos' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Todos</button>
          {ROLES.map(role => (
            <button key={role} onClick={() => setFilterRole(role)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterRole === role ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>{role}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(inst => {
          const Icon = ROLE_ICONS[inst.role] || User;
          return (
            <div key={inst.id} className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8 hover:border-amber-500 transition-all group relative overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-[24px] flex items-center justify-center text-2xl font-black text-slate-600 group-hover:bg-amber-500 group-hover:text-slate-900 transition-all">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{inst.name}</h4>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1 italic leading-none">{inst.role}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-2 ${inst.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {inst.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => openModal(inst)} className="p-2 text-slate-300 hover:text-amber-500 transition-all">
                  <Edit2 size={18} />
                </button>
              </div>

              <div className="space-y-2 mb-8 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase italic">
                  {inst.phone}
                </div>
                {inst.defaultDailyRate && (
                  <p className="text-[10px] font-black text-emerald-600 uppercase italic tracking-widest">Base Diária: R$ {inst.defaultDailyRate.toLocaleString()}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto border-t border-slate-50 pt-6">
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                  <p className="text-xl font-black text-slate-900">{inst.installationsCount || 0}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Participações</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                  <p className="text-xl font-black text-emerald-600">R$ {inst.totalBonus || 0}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ganhos OS</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-xl font-black uppercase italic tracking-tight">{editingInstaller ? 'Atualizar Profissional' : 'Novo Cadastro Equipe'}</h4>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nome Completo</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-amber-500 outline-none" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Papel / Função</label>
                  <select className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-amber-500 outline-none" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value as TeamRole }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Custo Diária (R$)</label>
                  <input type="number" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-amber-500 outline-none" value={formData.defaultDailyRate} onChange={e => setFormData(p => ({ ...p, defaultDailyRate: e.target.value }))} placeholder="0,00" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">CPF</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-amber-500 outline-none" value={formData.cpf} onChange={e => setFormData(p => ({ ...p, cpf: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Telefone / WhatsApp</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-amber-500 outline-none" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} required />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-amber-500 hover:text-slate-900 transition-all shadow-xl mt-4 active:scale-95">
                Confirmar Cadastro na Equipe
              </button>
            </form>
            {editingInstaller && (
              <button type="button" onClick={handleDelete} className="w-full py-4 border-2 border-red-100 text-red-500 font-bold uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all mt-4">
                Excluir Profissional do Time
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallerListView;
