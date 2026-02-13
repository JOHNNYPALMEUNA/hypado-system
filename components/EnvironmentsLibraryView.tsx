
import React, { useState } from 'react';
import { Environment, MemorialDescritivo, MdfPart, HardwareItem, Appliance, Material } from '../types';
import { Plus, Trash2, Layers, Search, X, Edit3, Save, Boxes, Settings2 } from 'lucide-react';

interface Props {
  environments: Environment[];
  setEnvironments: React.Dispatch<React.SetStateAction<Environment[]>>;
}

const INITIAL_MEMORIAL = (): MemorialDescritivo => ({
  mdfParts: [{ id: `mdf-${Date.now()}`, partName: 'Caixaria', brandColor: 'Branco Standard', thickness: '15mm' }],
  fitacao: 'PVC 0.45mm',
  fundo: '6mm Branco Encaixado',
  hardwareItems: [],
  appliances: []
});

const EnvironmentsLibraryView: React.FC<Props> = ({ environments, setEnvironments }) => {
  const [newEnvName, setNewEnvName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvName.trim()) return;

    const newEnv: Environment = {
      id: `e-${Date.now()}`,
      name: newEnvName.trim(),
      memorial: INITIAL_MEMORIAL()
    };

    setEnvironments(prev => [...prev, newEnv]);
    setNewEnvName('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover este ambiente da biblioteca? Isso não afetará obras já criadas.')) {
      setEnvironments(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleSaveEdit = () => {
    if (editingEnv) {
      setEnvironments(prev => prev.map(e => e.id === editingEnv.id ? editingEnv : e));
      setEditingEnv(null);
    }
  };

  const updateMemorial = (field: keyof MemorialDescritivo, val: any) => {
    if (!editingEnv || !editingEnv.memorial) return;
    setEditingEnv({
      ...editingEnv,
      memorial: { ...editingEnv.memorial, [field]: val }
    });
  };

  const filtered = environments.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h3 className="text-2xl font-bold text-slate-800">Biblioteca de Ambientes</h3>
        <p className="text-slate-500">Defina os padrões técnicos (MDF, Ferragens) para cada ambiente.</p>
      </div>

      <form onSubmit={handleAdd} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex gap-3">
        <input
          type="text"
          value={newEnvName}
          onChange={(e) => setNewEnvName(e.target.value)}
          placeholder="Novo Ambiente (ex: Home Theater)..."
          className="flex-1 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-amber-500/30 rounded-2xl outline-none"
          required
        />
        <button type="submit" className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all">
          <Plus size={20} /> Adicionar
        </button>
      </form>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <Search size={20} className="text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar..."
            className="flex-1 bg-transparent outline-none text-sm font-medium"
          />
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.map(env => (
            <div key={env.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${env.memorial ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                  <Layers size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{env.name}</h4>
                  <p className="text-xs text-slate-500">
                    {env.memorial ? 'Padrões definidos' : 'Sem padrões definidos'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingEnv(env.memorial ? env : { ...env, memorial: INITIAL_MEMORIAL() })}
                  className="px-4 py-2 bg-slate-100 hover:bg-amber-500 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                >
                  <Edit3 size={14} /> Editar Padrões
                </button>
                <button
                  onClick={() => handleDelete(env.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-400 italic">Nenhum ambiente encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {editingEnv && editingEnv.memorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase italic">Editando: {editingEnv.name}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Defina os materiais padrão para este ambiente</p>
              </div>
              <button onClick={() => setEditingEnv(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* MDF Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-bold text-amber-500 uppercase flex items-center gap-2 tracking-widest"><Boxes size={14} /> MDF / Caixaria</p>
                  <button
                    onClick={() => {
                      const newPart: MdfPart = { id: `mdf-${Date.now()}`, partName: 'Nova Parte', brandColor: 'A definir', thickness: '15mm' };
                      updateMemorial('mdfParts', [...editingEnv.memorial!.mdfParts, newPart]);
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors"
                  >+ Adicionar</button>
                </div>
                <div className="space-y-2">
                  {editingEnv.memorial.mdfParts.map((part, idx) => (
                    <div key={part.id} className="grid grid-cols-12 gap-2">
                      <input className="col-span-5 text-sm px-3 py-2 bg-slate-50 rounded-lg outline-none font-medium" value={part.partName} onChange={e => {
                        const parts = [...editingEnv.memorial!.mdfParts];
                        parts[idx].partName = e.target.value;
                        updateMemorial('mdfParts', parts);
                      }} placeholder="Descrição (ex: Caixaria)" />

                      <select
                        className="col-span-4 text-sm px-3 py-2 bg-slate-50 rounded-lg outline-none font-medium"
                        value={part.brandColor}
                        onChange={e => {
                          const parts = [...editingEnv.memorial!.mdfParts];
                          parts[idx].brandColor = e.target.value;
                          updateMemorial('mdfParts', parts);
                        }}
                      >
                        <option value="">Selecione o Material...</option>
                        {materials.filter(m => m.category === 'MDF').map(m => (
                          <option key={m.id} value={`${m.name} ${m.brand ? '- ' + m.brand : ''}`}>
                            {m.name} {m.brand && `- ${m.brand}`}
                          </option>
                        ))}
                        <option value="Branco Padrão">Branco Padrão (Genérico)</option>
                      </select>
                      <select className="col-span-2 text-sm px-1 bg-slate-50 rounded-lg outline-none" value={part.thickness} onChange={e => {
                        const parts = [...editingEnv.memorial!.mdfParts];
                        parts[idx].thickness = e.target.value;
                        updateMemorial('mdfParts', parts);
                      }}>
                        <option value="15mm">15mm</option><option value="18mm">18mm</option><option value="25mm">25mm</option>
                      </select>
                      <button className="col-span-1 text-slate-300 hover:text-red-500 flex justify-center" onClick={() => {
                        const parts = [...editingEnv.memorial!.mdfParts];
                        parts.splice(idx, 1);
                        updateMemorial('mdfParts', parts);
                      }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Hardware Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-bold text-amber-500 uppercase flex items-center gap-2 tracking-widest"><Settings2 size={14} /> Ferragens</p>
                  <button
                    onClick={() => {
                      const newItem: HardwareItem = { id: `hw-${Date.now()}`, category: 'Dobradiça', brand: '', model: '' };
                      updateMemorial('hardwareItems', [...editingEnv.memorial!.hardwareItems, newItem]);
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors"
                  >+ Adicionar</button>
                </div>
                <div className="space-y-2">
                  {editingEnv.memorial.hardwareItems.map((hw, idx) => (
                    <div key={hw.id} className="grid grid-cols-12 gap-2">
                      <select className="col-span-3 text-sm px-2 bg-slate-50 rounded-lg outline-none" value={hw.category} onChange={e => {
                        const hws = [...editingEnv.memorial!.hardwareItems];
                        hws[idx].category = e.target.value;
                        updateMemorial('hardwareItems', hws);
                      }}>
                        <option value="Dobradiça">Dobradiça</option><option value="Corrediça">Corrediça</option><option value="Puxador">Puxador</option><option value="Outro">Outro</option>
                      </select>
                      <div className="col-span-8 grid grid-cols-2 gap-2">
                        <select
                          className="col-span-2 text-sm px-3 py-2 bg-slate-50 rounded-lg outline-none font-medium"
                          onChange={e => {
                            const selectedMat = materials.find(m => m.id === e.target.value);
                            if (selectedMat) {
                              const hws = [...editingEnv.memorial!.hardwareItems];
                              hws[idx].brand = selectedMat.brand || 'Genérica';
                              hws[idx].model = selectedMat.name;
                              updateMemorial('hardwareItems', hws);
                            }
                          }}
                          value={materials.find(m => m.name === hw.model)?.id || ''}
                        >
                          <option value="">Selecione do Estoque...</option>
                          {materials.filter(m => m.category === 'Ferragem' || m.category === hw.category).map(m => (
                            <option key={m.id} value={m.id}>{m.name} - {m.brand}</option>
                          ))}
                        </select>
                      </div>
                      <button className="col-span-1 text-slate-300 hover:text-red-500 flex justify-center" onClick={() => {
                        const hws = [...editingEnv.memorial!.hardwareItems];
                        hws.splice(idx, 1);
                        updateMemorial('hardwareItems', hws);
                      }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setEditingEnv(null)} className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={handleSaveEdit} className="px-6 py-3 rounded-2xl text-sm font-bold bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-900 transition-all shadow-lg flex items-center gap-2">
                <Save size={18} /> Salvar Padrão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvironmentsLibraryView;
