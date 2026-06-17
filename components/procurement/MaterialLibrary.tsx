import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, X, Package } from 'lucide-react';
import { Material } from '../../types';

const resizeAndCompressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG with 0.6 quality to fit within URL parameters easily
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('Falha ao carregar imagem para redimensionar'));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo'));
    };
    reader.readAsDataURL(file);
  });
};

interface MaterialLibraryProps {
  materials: Material[];
  addMaterial: (m: Material) => Promise<void>;
  updateMaterial: (m: Material) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  materialCategories: string[];
  setMaterialCategories?: React.Dispatch<React.SetStateAction<string[]>>;
}

const MaterialLibrary: React.FC<MaterialLibraryProps> = ({
  materials,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  materialCategories,
  setMaterialCategories
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [form, setForm] = useState<Partial<Material>>({
    name: '',
    category: 'MDF',
    unit: 'Chapa',
    stockQuantity: 0,
    imageUrl: ''
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
      setForm({ name: '', category: 'MDF', unit: 'Chapa', stockQuantity: 0, brand: '', imageUrl: '' });
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
      if (pwd !== 'admin123') {
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
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 overflow-hidden border border-slate-100 group-hover:border-slate-900/10 transition-all">
                {m.imageUrl ? (
                  <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover animate-in fade-in-50 duration-300" />
                ) : (
                  <Package size={24} />
                )}
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
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-1 rounded-lg text-slate-500">{m.category}</span>
              {m.brand && <span className="text-[10px] font-black uppercase bg-blue-50 px-2 py-1 rounded-lg text-blue-500">{m.brand}</span>}
              <span className="text-[10px] font-black uppercase bg-emerald-50 px-2 py-1 rounded-lg text-emerald-600">UN: {m.unit}</span>
              <span className="text-[10px] font-black uppercase bg-amber-50 px-2 py-1 rounded-lg text-amber-600">ESTOQUE: {m.stockQuantity || 0}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Marca</label>
                    <input 
                      title="Marca"
                      placeholder="Ex: Eucatex, FGVTN..."
                      type="text" 
                      className="w-full p-5 rounded-[24px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner"
                      value={form.brand || ''}
                      onChange={e => setForm({...form, brand: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Categoria</label>
                    <div className="flex gap-2">
                        <select 
                          title="Categoria"
                          className="w-full p-5 rounded-[24px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer shadow-inner"
                          value={form.category || ''}
                          onChange={e => setForm({...form, category: e.target.value})}
                        >
                          <option value="">Selecione...</option>
                          {materialCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        {setMaterialCategories && (
                            <button
                                type="button"
                                onClick={() => {
                                    const newCategory = prompt("Digite o nome da nova categoria:");
                                    if (newCategory && newCategory.trim()) {
                                        const catName = newCategory.trim();
                                        if (!materialCategories.includes(catName)) {
                                            setMaterialCategories(prev => [...prev, catName]);
                                        }
                                        setForm({...form, category: catName});
                                    }
                                }}
                                className="bg-slate-900 text-white px-5 rounded-[24px] flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg"
                                title="Adicionar Nova Categoria"
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Estoque Inicial / Atual</label>
                     <input 
                      title="Estoque"
                      type="number"
                      className="w-full p-5 rounded-[24px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner"
                      value={form.stockQuantity || ''}
                      placeholder="0"
                      onChange={e => setForm({...form, stockQuantity: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Foto / Imagem do Insumo</label>
                  <div className="flex items-center gap-4 p-4 rounded-[24px] bg-slate-50 border-none shadow-inner">
                    <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
                      {form.imageUrl ? (
                        <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover animate-in fade-in-50 duration-300" />
                      ) : (
                        <Package size={28} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsCompressing(true);
                          try {
                            const base64 = await resizeAndCompressImage(file);
                            setForm(prev => ({ ...prev, imageUrl: base64 }));
                          } catch (err) {
                            console.error(err);
                            alert("Erro ao ler imagem");
                          } finally {
                            setIsCompressing(false);
                          }
                        }}
                        className="hidden" 
                        id="material-image-file" 
                      />
                      <label 
                        htmlFor="material-image-file"
                        className="inline-block bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-emerald-600 transition-colors shadow-sm active:scale-95"
                      >
                        {isCompressing ? 'Processando...' : 'Escolher Foto'}
                      </label>
                      {form.imageUrl && (
                        <button 
                          type="button"
                          onClick={() => setForm({...form, imageUrl: ''})}
                          className="block text-[10px] font-bold text-red-500 uppercase tracking-wider hover:underline ml-1"
                        >
                          Remover Foto
                        </button>
                      )}
                    </div>
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
