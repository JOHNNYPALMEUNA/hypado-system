
import { Project, ProductionStatus, Quotation, Installer, OutsourcedService, Expense, Supplier } from '../types';
import {
  ArrowRight, Clock, Box, PenTool, CheckCircle2, Truck,
  X, ChevronRight, Lock, Unlock,
  Factory as FactoryIcon, GlassWater, Scissors, DollarSign, Building2, AlertTriangle, Save, Hammer as Screwdriver
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

interface Props {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  purchaseOrders: Quotation[];
  installers: Installer[];
  suppliers: Supplier[];
  goToProcurementMDO: (osId: string) => void;
}

const STATUS_CONFIG: Record<ProductionStatus, { label: string, icon: any, color: string, next: ProductionStatus | null }> = {
  'Venda': { label: 'Venda', icon: DollarSign, color: 'bg-green-500', next: 'Projeto' },
  'Projeto': { label: 'Projeto', icon: PenTool, color: 'bg-indigo-500', next: 'Corte' },
  'Corte': { label: 'Corte', icon: Box, color: 'bg-orange-500', next: 'Produção' },
  'Produção': { label: 'Produção', icon: FactoryIcon, color: 'bg-amber-500', next: 'Entrega' },
  'Entrega': { label: 'Entrega', icon: Truck, color: 'bg-blue-500', next: 'Instalação' },
  'Instalação': { label: 'Instalação', icon: Screwdriver, color: 'bg-slate-500', next: 'Vistoria' },
  'Vistoria': { label: 'Vistoria', icon: CheckCircle2, color: 'bg-purple-500', next: 'Finalizada' },
  'Finalizada': { label: 'Finalizada', icon: CheckCircle2, color: 'bg-emerald-600', next: null },
};

const PCPView: React.FC<Props> = ({ projects, setProjects, installers, suppliers, goToProcurementMDO }) => {
  const [showCentralModal, setShowCentralModal] = useState<string | null>(null);
  const [showOutsourcedModal, setShowOutsourcedModal] = useState<string | null>(null);
  const [centralServiceValue, setCentralServiceValue] = useState<string>('');
  // State for Parts Count per Environment in Production Modal
  const [productionPartsCount, setProductionPartsCount] = useState<Record<string, number>>({});

  const centralSuppliers = useMemo(() => suppliers.filter(s => s.type === 'Serviço (Corte/Fitação)'), [suppliers]);

  const advance = (projectId: string, nextStatus: ProductionStatus, extraData: Partial<Project> = {}) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          ...extraData,
          currentStatus: nextStatus,
          history: [...(p.history || []), { status: nextStatus, timestamp: new Date().toISOString() }]
        };
      }
      return p;
    }));
    setShowCentralModal(null);
    setShowOutsourcedModal(null);
  };

  const updateStatus = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const currentStatus = project.currentStatus;

    if (currentStatus === 'Projeto') {
      if (!project.materialsDelivered) {
        alert('TRAVA PCP: Insumos de fábrica não faturados. Vá em Suprimentos para dar entrada na NF.');
        return;
      }
      advance(projectId, 'Corte');
    }
    else if (currentStatus === 'Corte') {
      const p = projects.find(proj => proj.id === projectId);
      // Initialize parts count from existing data
      const initialParts: Record<string, number> = {};
      if (p) {
        p.environmentsDetails.forEach(env => {
          initialParts[env.name] = (env.memorial as any).partsCount || 0;
        });
      }
      setProductionPartsCount(initialParts);
      setCentralServiceValue('');
      setShowCentralModal(projectId);
    }
    else if (currentStatus === 'Produção') {
      const outsourced = project.outsourcedServices || [];
      const pendingServices = outsourced.filter(s => s.status !== 'Pronto');
      const incompleteFinancials = outsourced.filter(s => !s.supplierName || (s.value || 0) <= 0);

      if (incompleteFinancials.length > 0) {
        alert(`TRAVA FINANCEIRA: Existem ${incompleteFinancials.length} serviços terceirizados aguardando definição de fornecedor e valor. O custo deve ser lançado para garantir a margem da obra.`);
        setShowOutsourcedModal(projectId);
        return;
      }

      if (pendingServices.length > 0) {
        alert(`PENDÊNCIA DE TERCEIRO: ${pendingServices.length} serviços ainda não retornaram para a fábrica com status "Pronto".`);
        setShowOutsourcedModal(projectId);
        return;
      }

      advance(projectId, 'Instalação');
      setTimeout(() => goToProcurementMDO(projectId), 300);
    }
    else if (currentStatus === 'Instalação') {
      if (confirm('A montagem foi concluída? A obra irá para VISTORIA DE QUALIDADE.')) {
        advance(projectId, 'Vistoria');
      }
    }
    else if (currentStatus === 'Vistoria') {
      alert('⛔ AÇÃO BLOQUEADA\n\nA obra está em fase de Vistoria de Qualidade.\nPara finalizar, acesse a OS > Aba Qualidade e complete o checklist.');
    }
  };

  const handleSelectCentral = (centralName: string) => {
    if (!showCentralModal) return;
    const value = Number(centralServiceValue);
    const project = projects.find(p => p.id === showCentralModal);
    if (!project) return;

    const extraData: Partial<Project> = { productionCentral: centralName };
    if (value > 0) {
      const newExpense: Expense = {
        id: `corte-${Date.now()}`,
        description: `Serviço Corte: ${centralName}`,
        value: value,
        date: new Date().toISOString().split('T')[0],
        category: 'Fitação'
      };
      // Fixed: corrected variable name from newExp to newExpense
      extraData.expenses = [...(project.expenses || []), newExpense];
    }

    // Update Project with Parts Count
    const updatedEnvironments = project.environmentsDetails.map(env => ({
      ...env,
      memorial: {
        ...env.memorial,
        partsCount: productionPartsCount[env.name] || 0
      }
    }));
    extraData.environmentsDetails = updatedEnvironments;

    advance(showCentralModal, 'Produção', extraData);
  };

  const updateOutsourcedItem = (projectId: string, serviceId: string, field: keyof OutsourcedService, value: any) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          outsourcedServices: p.outsourcedServices.map(s => s.id === serviceId ? { ...s, [field]: value } : s)
        };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Controle PCP Industrial</h3>
          <p className="text-slate-500 font-bold text-sm uppercase italic tracking-widest mt-2">Gestão de Produção e Auditoria de Terceiros</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[56px] border-2 border-slate-100 bg-white shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-100">
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Ordem de Serviço</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">Insumos</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">Terceiros</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Status</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">Controle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {projects.filter(p => p.currentStatus !== 'Finalizada').map(project => {
              const incompleteOut = (project.outsourcedServices || []).some(s => !s.supplierName || (s.value || 0) <= 0);
              const allOutReady = (project.outsourcedServices || []).length > 0 && (project.outsourcedServices || []).every(s => s.status === 'Pronto');

              return (
                <tr key={project.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-slate-900 text-amber-500 flex items-center justify-center rounded-[20px] font-black italic shadow-lg">{project.id.slice(-2)}</div>
                      <div>
                        <p className="font-black text-slate-900 uppercase italic text-lg tracking-tighter leading-none">{project.workName}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">{project.clientName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className={`inline-flex p-3 rounded-2xl border-2 ${project.materialsDelivered ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100 animate-pulse'}`}>
                      {project.materialsDelivered ? <Unlock size={20} /> : <Lock size={20} />}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <button
                      onClick={() => setShowOutsourcedModal(project.id)}
                      className={`inline-flex p-3 rounded-2xl border-2 transition-all hover:scale-110 ${incompleteOut ? 'bg-amber-50 text-amber-500 border-amber-200 animate-bounce' : (allOutReady ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : (project.outsourcedServices.length > 0 ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-slate-50 text-slate-300 border-slate-100'))}`}
                    >
                      {incompleteOut ? <AlertTriangle size={20} /> : (allOutReady ? <CheckCircle2 size={20} /> : <Clock size={20} />)}
                    </button>
                  </td>
                  <td className="px-10 py-8">
                    <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase text-white shadow-lg ${STATUS_CONFIG[project.currentStatus].color} italic tracking-widest`}>
                      {project.currentStatus}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button onClick={() => updateStatus(project.id)} className="bg-slate-900 text-white px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-amber-500 hover:text-slate-900 transition-all shadow-xl ml-auto active:scale-95">
                      Avançar Obra <ArrowRight size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL: AUDITORIA DE TERCEIROS - EDITÁVEL PARA NOME E VALOR */}
      {showOutsourcedModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowOutsourcedModal(null)} />
          <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="text-3xl font-black uppercase italic tracking-tighter">Gestão de Terceiros e Cotação</h4>
                <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-2">Defina fornecedor e valor para liberar a produção</p>
              </div>
              <button onClick={() => setShowOutsourcedModal(null)} className="p-4 hover:bg-slate-800 rounded-full transition-all"><X size={32} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-8 bg-slate-50 custom-scrollbar">
              {projects.find(p => p.id === showOutsourcedModal)?.outsourcedServices.map(item => (
                <div key={item.id} className="bg-white p-8 rounded-[40px] border-2 border-slate-100 flex flex-col gap-8 shadow-sm hover:border-indigo-200 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Building2 size={24} /></div>
                      <h5 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{item.category}</h5>
                    </div>
                    <div className="flex bg-slate-100 p-1.5 rounded-[24px]">
                      {(['Pendente', 'Pedido', 'Pronto'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => updateOutsourcedItem(showOutsourcedModal, item.id, 'status', s)}
                          className={`px-6 py-2.5 rounded-[18px] text-[10px] font-black uppercase italic transition-all ${item.status === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase italic ml-2">Fornecedor / Empresa Terceirizada</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-bold outline-none shadow-inner"
                        placeholder="Ex: Vidros Real Ltda"
                        value={item.supplierName || ''}
                        onChange={e => updateOutsourcedItem(showOutsourcedModal, item.id, 'supplierName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase italic ml-2">Valor Pago R$ (Custo Real)</label>
                      <div className="relative">
                        <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 p-4 pl-10 rounded-2xl font-black text-lg outline-none shadow-inner text-emerald-600"
                          placeholder="0,00"
                          value={item.value || ''}
                          onChange={e => updateOutsourcedItem(showOutsourcedModal, item.id, 'value', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase italic ml-2">Descrição / Escopo do Serviço</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-300 p-4 rounded-2xl font-medium text-sm outline-none shadow-inner italic"
                      placeholder="Ex: Vidro 4mm com bisotê para banheiro suite"
                      value={item.description || ''}
                      onChange={e => updateOutsourcedItem(showOutsourcedModal, item.id, 'description', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-10 bg-slate-900 flex justify-between items-center">
              <div className="text-white">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic mb-2">Total Terceirizado Obra</p>
                <p className="text-3xl font-black italic">
                  R$ {(projects.find(p => p.id === showOutsourcedModal)?.outsourcedServices || []).reduce((acc, s) => acc + (s.value || 0), 0).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setShowOutsourcedModal(null)}
                className="bg-amber-500 text-slate-900 px-12 py-5 rounded-[28px] font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-xl"
              >
                Salvar & Voltar para Produção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROCESSAMENTO INDUSTRIAL (CORTE) - MANTIDO */}
      {showCentralModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowCentralModal(null)} />
          <div className="relative bg-white w-full max-w-xl rounded-[56px] shadow-2xl p-12 animate-in zoom-in-95">
            <h4 className="text-3xl font-black uppercase italic mb-8 tracking-tighter leading-none">Processamento Industrial</h4>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Custo do Serviço de Corte R$</label>
                <input type="number" className="w-full px-8 py-5 bg-slate-50 border-2 rounded-[28px] text-3xl font-black outline-none focus:border-amber-500 transition-all shadow-inner" placeholder="0,00" value={centralServiceValue} onChange={e => setCentralServiceValue(e.target.value)} />
              </div>

              {/* Parts Count Inputs per Environment */}
              <div className="bg-slate-50 p-6 rounded-[28px] border-2 border-slate-100 space-y-4">
                <h5 className="text-xs font-black uppercase text-slate-400 italic ml-2">Apontamento de Peças (Plano de Corte)</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.find(p => p.id === showCentralModal)?.environmentsDetails.map(env => (
                    <div key={env.name} className="bg-white p-4 rounded-xl border border-slate-200">
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">{env.name}</label>
                      <input
                        type="number"
                        placeholder="Qtd Peças"
                        className="w-full text-lg font-black outline-none"
                        value={productionPartsCount[env.name] || ''}
                        onChange={e => setProductionPartsCount(prev => ({ ...prev, [env.name]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {centralSuppliers.map(s => (
                  <button key={s.id} onClick={() => handleSelectCentral(s.name)} className="w-full p-6 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-[28px] transition-all font-black uppercase italic text-sm text-left px-10 border border-slate-200">
                    {s.name}
                  </button>
                ))}
                <button onClick={() => handleSelectCentral('Produção Interna')} className="w-full p-6 bg-slate-900 text-white rounded-[28px] transition-all font-black uppercase italic text-sm hover:bg-amber-500 hover:text-slate-900 text-left px-10 shadow-lg">
                  Usinagem Interna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PCPView;
