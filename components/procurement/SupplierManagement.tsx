import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, X, Users, MessageSquare } from 'lucide-react';
import { Supplier, SupplierType } from '../../types';

interface SupplierManagementProps {
  suppliers: Supplier[];
  addSupplier: (s: Supplier) => Promise<void>;
  updateSupplier: (s: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
}

const SupplierManagement: React.FC<SupplierManagementProps> = ({
  suppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Partial<Supplier>>({
    name: '',
    type: 'Material',
    contact: ''
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (sup?: Supplier) => {
    if (sup) {
      setEditingSupplier(sup);
      setForm(sup);
    } else {
      setEditingSupplier(null);
      setForm({ name: '', type: 'Material', contact: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    if (editingSupplier) {
      await updateSupplier({ ...editingSupplier, ...form } as Supplier);
    } else {
      const newSup: Supplier = { 
        id: `sup-${Date.now()}`, 
        ...form 
      } as Supplier;
      await addSupplier(newSup);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir parceiro?")) {
      const pwd = prompt('Digite a senha de administrador:');
      if (pwd !== 'adm123') {
        alert('Senha incorreta!');
        return;
      }
      await deleteSupplier(id);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Gestão de Parceiros</h4>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fornecedores, Montadores e Prestadores de Serviço</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-emerald-600 transition-all active:scale-95"
        >
          <Plus size={18} /> Cadastrar Novo Parceiro
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar parceiro..." 
          className="w-full pl-12 pr-4 py-4 rounded-3xl bg-card border-slate-100 shadow-sm focus:ring-2 focus:ring-slate-900 outline-none font-bold"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(s => (
          <div key={s.id} className="bg-card p-10 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
             {/* Decorative Background Icon */}
            <div className="absolute -right-4 -bottom-4 text-slate-50 opacity-10 group-hover:scale-110 transition-transform">
                <Users size={120} />
            </div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                s.type === 'Material' ? 'bg-amber-50 text-amber-500' :
                s.type === 'Montagem' ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-500'
              }`}>
                <Users size={28} />
              </div>
              <div className="flex gap-1">
                <button title="Editar Parceiro" onClick={() => handleOpenModal(s)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                  <Edit2 size={16} />
                </button>
                <button title="Excluir Parceiro" onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-50 rounded-xl transition-colors text-slate-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="relative z-10">
                <h5 className="text-2xl font-black text-foreground uppercase italic leading-none mb-2">{s.name}</h5>
                <div className="flex flex-wrap gap-2 mb-4">
                <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full ${
                    s.type === 'Material' ? 'bg-amber-100 text-amber-700' :
                    s.type === 'Montagem' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                }`}>
                    {s.type}
                </span>
                </div>

                {s.contact && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <MessageSquare size={14} className="text-emerald-500" />
                    {s.contact}
                </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-[48px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-2xl font-black uppercase italic text-foreground tracking-tighter">
                  {editingSupplier ? 'Editar Parceiro' : 'Novo Parceiro'}
                </h4>
                <button title="Fechar Modal" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Razão Social / Nome</label>
                  <input 
                    title="Razão Social / Nome"
                    placeholder="Ex: Madeireira Hypada LTDA"
                    type="text" 
                    required
                    className="w-full p-5 rounded-[24px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tipo</label>
                    <select 
                      title="Tipo de Parceiro"
                      className="w-full p-5 rounded-[24px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner"
                      value={form.type}
                      onChange={e => setForm({...form, type: e.target.value as SupplierType})}
                    >
                      <option value="Material">Fornecedor Material</option>
                      <option value="Montagem">Montador Externo</option>
                      <option value="Terceiros">Serviço de Terceiros</option>
                      <option value="Serviço">Prestador Serviço</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">WhatsApp / Contato</label>
                    <input 
                      type="text" 
                      placeholder="(DD) 99999-9999"
                      className="w-full p-5 rounded-[24px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner"
                      value={form.contact}
                      onChange={e => setForm({...form, contact: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white p-6 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 mt-4"
                >
                  Confirmar Cadastro
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
