import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, X, Package } from 'lucide-react';
import { Material } from '../../types';

interface MaterialLibraryProps {
  materials: Material[];
  addMaterial: (m: Material) => Promise<void>;
  updateMaterial: (m: Material) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  materialCategories: string[];
}

const MaterialLibrary: React.FC<MaterialLibraryProps> = ({
  materials,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  materialCategories
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [form, setForm] = useState<Partial<Material>>({
    name: '',
    category: 'MDF',
    unit: 'Chapa'
  });

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (mat?: Material) => {
    if (mat) {
      setEditingMaterial(mat);
      setForm(mat);
    } else {
      setEditingMaterial(null);
      setForm({ name: '', category: 'MDF', unit: 'Chapa' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    if (editingMaterial) {
      await updateMaterial({ ...editingMaterial, ...form } as Material);
    } else {
      const newMat: Material = { 
        id: `mat-${Date.now()}`, 
        ...form 
      } as Material;
      await addMaterial(newMat);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir item da biblioteca?")) {
      const pwd = prompt('Digite a senha de administrador:');
      if (pwd !== 'admin') {
        alert('Senha incorreta!');
        return;
      }
      await deleteMaterial(id);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Biblioteca de Insumos</h4>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Controle de materiais, ferragens e acessórios</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-emerald-600 transition-all active:scale-95"
        >
          <Plus size={18} /> Cadastrar Novo Item
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar no catálogo..." 
          className="w-full pl-12 pr-4 py-4 rounded-3xl bg-card border-slate-100 shadow-sm focus:ring-2 focus:ring-slate-900 outline-none font-bold"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.map(m => (
          <div key={m.id} className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all">
                <Package size={24} />
              </div>
              <div className="flex gap-1">
                <button title="Editar Material" onClick={() => handleOpenModal(m)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                  <Edit2 size={16} />
                </button>
                <button title="Excluir Material" onClick={() => handleDelete(m.id)} className="p-2 hover:bg-red-50 rounded-xl transition-colors text-slate-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h5 className="font-black text-foreground uppercase italic leading-tight mb-1">{m.name}</h5>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-1 rounded-lg text-slate-500">{m.category}</span>
              <span className="text-[10px] font-black uppercase bg-emerald-50 px-2 py-1 rounded-lg text-emerald-600">UN: {m.unit}</span>
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
                  {editingMaterial ? 'Editar Material' : 'Novo Material'}
                </h4>
                <button title="Fechar Modal" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nome do Insumo</label>
                  <input 
                    title="Nome do Insumo"
                    placeholder="Ex: MDF Branco 15mm"
                    type="text" 
                    required
                    className="w-full p-5 rounded-[24px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Categoria</label>
                    <select 
                      title="Categoria"
                      className="w-full p-5 rounded-[24px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner"
                      value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}
                    >
                      {materialCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Unidade</label>
                    <select 
                      title="Unidade"
                      className="w-full p-5 rounded-[24px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner"
                      value={form.unit}
                      onChange={e => setForm({...form, unit: e.target.value})}
                    >
                      <option value="Chapa">Chapa</option>
                      <option value="Unidade">Unidade</option>
                      <option value="Par">Par</option>
                      <option value="Metragem">Metragem (m)</option>
                      <option value="Barra">Barra</option>
                      <option value="Lata">Lata</option>
                      <option value="Caixa">Caixa</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white p-6 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 mt-4"
                >
                  Salvar Cadastro
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialLibrary;
