
import React, { useState, useMemo } from 'react';
import { Project, Supplier, Material, Quotation, PurchaseStatus, Expense, SupplierType, QuotationItem, Company, Installer, Client, EnvironmentWithDetails } from '../types';
import { analyzeReceipt } from '../geminiService';
import {
  Plus, ShoppingCart, CheckCircle2, Clock, X, DollarSign,
  Layers, Printer, FileSearch, Trash2, Search, Package,
  UserCheck, Users, HardHat, Briefcase, PlusCircle, Hammer,
  Edit2, Save, MoreHorizontal, Filter, AlertCircle, Check,
  MessageSquare, Sparkles, Upload, Camera, Share2
} from 'lucide-react';

interface Props {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  purchaseOrders: Quotation[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<Quotation[]>>;
  company: Company;
  installers: Installer[];
  clients: Client[];
  externalActiveTab?: 'cotacoes' | 'concluidas' | 'apontamento' | 'diario' | 'produtos' | 'fornecedores';
  setExternalActiveTab?: (tab: 'cotacoes' | 'concluidas' | 'apontamento' | 'diario' | 'produtos' | 'fornecedores') => void;
  externalSelectedOSId?: string;
  setExternalSelectedOSId?: (id: string) => void;
}

const ProcurementView: React.FC<Props> = ({
  projects, setProjects, suppliers, setSuppliers, materials, setMaterials,
  purchaseOrders, setPurchaseOrders, company, installers,
  externalActiveTab, setExternalActiveTab, externalSelectedOSId, setExternalSelectedOSId,
  materialCategories, setMaterialCategories
}) => {
  const activeTab = externalActiveTab || 'cotacoes';
  const setActiveTab = setExternalActiveTab || (() => { });

  // ESTADOS DE MODAL
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [entryModalData, setEntryModalData] = useState<Quotation | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ESTADOS DE EDIÇÃO
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // FORMULÁRIOS
  const [materialForm, setMaterialForm] = useState<Partial<Material>>({ name: '', category: 'MDF', unit: 'Chapa' });
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({ name: '', type: 'Material', contact: '' });
  const [newQuotation, setNewQuotation] = useState({ projectId: '', supplierId: '', items: [] as QuotationItem[] });
  const [searchMaterial, setSearchMaterial] = useState('');
  const [newDiaryEntry, setNewDiaryEntry] = useState({ personId: '', projectId: '', date: new Date().toISOString().split('T')[0], value: '', description: '' });

  // ESTADO PARA VALORES E MONTADORES DE EMPREITA
  const [mdoValues, setMdoValues] = useState<Record<string, string>>({});
  const [mdoInstallers, setMdoInstallers] = useState<Record<string, string>>({});

  const selectedOSId = externalSelectedOSId || '';
  const setSelectedOSId = setExternalSelectedOSId || (() => { });
  const selectedOS = useMemo(() => projects.find(p => p.id === selectedOSId), [selectedOSId, projects]);

  // --- CRUD BIBLIOTECA (MATERIAIS) ---
  const handleOpenMaterialModal = (mat?: Material) => {
    if (mat) {
      setEditingMaterial(mat);
      setMaterialForm(mat);
    } else {
      setEditingMaterial(null);
      setMaterialForm({ name: '', category: 'MDF', unit: 'Chapa' });
    }
    setIsMaterialModalOpen(true);
  };

  const saveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.name) return;
    if (editingMaterial) {
      setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? { ...m, ...materialForm } as Material : m));
    } else {
      const newMat: Material = { id: `mat-${Date.now()}`, ...materialForm } as Material;
      setMaterials(prev => [...prev, newMat]);
    }
    setIsMaterialModalOpen(false);
  };

  const deleteMaterial = (id: string) => {
    if (confirm("Excluir item da biblioteca?")) {
      const pwd = prompt('Digite a senha de administrador:');
      if (pwd !== 'adm123') {
        alert('Senha incorreta!');
        return;
      }
      setMaterials(prev => prev.filter(m => m.id !== id));
    }
  };

  // --- CRUD PARCEIROS (FORNECEDORES) ---
  const handleOpenSupplierModal = (sup?: Supplier) => {
    if (sup) {
      setEditingSupplier(sup);
      setSupplierForm(sup);
    } else {
      setEditingSupplier(null);
      setSupplierForm({ name: '', type: 'Material', contact: '' });
    }
    setIsSupplierModalOpen(true);
  };

  const saveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name) return;
    if (editingSupplier) {
      setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...supplierForm } as Supplier : s));
    } else {
      const newSup: Supplier = { id: `sup-${Date.now()}`, ...supplierForm } as Supplier;
      setSuppliers(prev => [...prev, newSup]);
    }
    setIsSupplierModalOpen(false);
  };

  const deleteSupplier = (id: string) => {
    if (confirm("Excluir parceiro?")) {
      const pwd = prompt('Digite a senha de administrador:');
      if (pwd !== 'adm123') {
        alert('Senha incorreta!');
        return;
      }
      setSuppliers(prev => prev.filter(s => s.id !== id));
    }
  };

  // --- FLUXO DE PEDIDOS E NF ---
  const addItemToQuotation = (material: Material) => {
    setNewQuotation(prev => {
      const exists = prev.items.find(i => i.productId === material.id);
      if (exists) {
        return { ...prev, items: prev.items.map(i => i.productId === material.id ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { ...prev, items: [...prev.items, { productId: material.id, name: material.name, quantity: 1, unit: material.unit || 'un' }] };
    });
  };

  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuotation.projectId || !newQuotation.supplierId || newQuotation.items.length === 0) {
      alert("ERRO: Selecione a obra, o fornecedor e adicione itens.");
      return;
    }
    const project = projects.find(p => p.id === newQuotation.projectId);
    const quotation: Quotation = {
      id: `PED-${Date.now().toString().slice(-4)}`,
      projectId: newQuotation.projectId,
      workName: project?.workName || 'Obra',
      supplierId: newQuotation.supplierId,
      status: 'Cotação',
      date: new Date().toISOString(),
      items: newQuotation.items
    };
    setPurchaseOrders(prev => [quotation, ...prev]);
    setIsQuotationModalOpen(false);
    setNewQuotation({ projectId: '', supplierId: '', items: [] });
  };

  const finalizeEntryAndInjectCost = () => {
    if (!entryModalData) return;
    const totalCost = entryModalData.items.reduce((acc, item) => acc + ((item.materialValue || 0) * item.quantity), 0);
    const supplierName = suppliers.find(s => s.id === entryModalData.supplierId)?.name || 'Fornecedor';

    // Atualiza Ordens de Compra
    setPurchaseOrders(prev => prev.map(q => q.id === entryModalData.id ? { ...q, status: 'Comprado' } : q));

    // Atualiza Projetos (Destrava PCP e lança custo)
    setProjects(prev => prev.map(p => {
      if (p.id === entryModalData.projectId) {
        const newExp = {
          id: `nf-${Date.now()}`,
          description: `NF: ${entryModalData.id} - ${supplierName}`,
          value: totalCost,
          date: new Date().toISOString().split('T')[0],
          category: 'Material'
        };
        return { ...p, materialsDelivered: true, expenses: [...(p.expenses || []), newExp] };
      }
      return p;
    }));

    setEntryModalData(null);
    alert("FATURAMENTO CONCLUÍDO!\n\nA obra foi desbloqueada para produção e o custo injetado no DRE.");
  };

  const handleAnalyzeInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entryModalData) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const context = entryModalData.items.map(i => `${i.quantity}x ${i.name}`).join('\n');

        const result = await analyzeReceipt(base64, context);

        if (result && result.items) {
          // Atualiza os valores unitários com base no retorno da IA
          const newItems = [...entryModalData.items].map(item => {
            // Tenta encontrar um item correspondente na resposta da IA (por nome aproximado ou exato)
            // Simplificação: Assume que a IA retornou na mesma ordem ou com nomes parecidos
            const match = result.items.find((r: any) =>
              r.name.toLowerCase().includes(item.name.toLowerCase()) ||
              item.name.toLowerCase().includes(r.name.toLowerCase())
            );

            if (match && match.unitPrice) {
              return { ...item, materialValue: match.unitPrice };
            }
            return item;
          });

          setEntryModalData({ ...entryModalData, items: newItems });
          alert('Análise de IA concluída! Valores atualizados.');
        } else {
          alert('Não foi possível extrair dados da nota. Tente novamente com uma imagem mais clara.');
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao analisar nota:", error);
      alert("Erro ao processar a imagem.");
      setIsAnalyzing(false);
    }
  };

  // --- DIÁRIO ---
  const handleLaunchDiary = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newDiaryEntry.value);
    if (!newDiaryEntry.personId || !newDiaryEntry.projectId || val <= 0) {
      alert("Preencha todos os campos da diária.");
      return;
    }
    const person = installers.find(i => i.id === newDiaryEntry.personId);
    setProjects(prev => prev.map(p => {
      if (p.id === newDiaryEntry.projectId) {
        const newExp = {
          id: `diary-${Date.now()}`,
          description: `DIÁRIA: ${person?.name} - Motivo: ${newDiaryEntry.description || 'Montagem/Serviço Geral'}`,
          value: val,
          date: newDiaryEntry.date,
          category: 'Montagem'
        };
        return { ...p, expenses: [...(p.expenses || []), newExp] };
      }
      return p;
    }));
    setNewDiaryEntry({ ...newDiaryEntry, value: '', description: '' });
    alert("Diária lançada com sucesso no DRE da obra.");
  };

  // --- APONTAMENTO DE EMPREITAS ---
  // --- NEGOTIATION FLOW HANDLERS ---
  const handleSendProposal = (envName: string) => {
    const valueStr = mdoValues[envName];
    const installerId = mdoInstallers[envName];
    const value = parseFloat(valueStr || '0');

    if (!selectedOSId || !selectedOS) return;
    if (!installerId) {
      alert("Selecione o Montador para enviar a proposta.");
      return;
    }
    if (value <= 0) {
      alert("Informe um valor válido para a proposta.");
      return;
    }

    const installer = installers.find(i => i.id === installerId);
    const installerName = installer?.name || 'Montador';

    setProjects(prev => prev.map(p => {
      if (p.id === selectedOSId) {
        const newEnvDetails = p.environmentsDetails.map(env =>
          env.name === envName ? {
            ...env,
            mdoStatus: 'Enviado',
            authorizedMdoValue: value,
            assignedInstallerId: installerId,
            isMdoAuthorized: false // Not authorized yet
          } : env
        );
        return { ...p, environmentsDetails: newEnvDetails as any };
      }
      return p;
    }));

    // Generate Smart Link
    const proposalData = {
      workName: selectedOS.workName,
      clientName: selectedOS.clientName,
      envName: envName,
      value: value,
      date: selectedOS.promisedDate ? new Date(selectedOS.promisedDate).toLocaleDateString() : 'A combinar',
      installerName: installerName,
      cloudLink: selectedOS.cloudFolderLink,
      obs: (selectedOS.environmentsDetails.find(e => e.name === envName)?.memorial?.observation || ''),
      adminPhone: company.phone?.replace(/\D/g, '') || ''
    };

    const encodedData = btoa(JSON.stringify(proposalData));
    const smartLink = `${window.location.origin}/?mode=proposal&data=${encodedData}`;

    const text = `*PROPOSTA DE EMPREITA - HYPADO*\n\n` +
      `👷‍♂️ Olá *${installerName}*,\n` +
      `Temos uma nova oportunidade para você:\n\n` +
      `🏢 *Obra:* ${selectedOS.workName}\n` +
      `🔨 *Ambiente:* ${envName}\n` +
      `💰 *Valor Proposto:* R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
      `👉 *Toque no link abaixo para ver detalhes e ACEITAR/RECUSAR:*\n` +
      `${smartLink}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleRegisterResponse = (envName: string, response: 'Aceito' | 'Recusado') => {
    if (!selectedOSId || !selectedOS) return;

    setProjects(prev => prev.map(p => {
      if (p.id === selectedOSId) {
        const env = p.environmentsDetails.find(e => e.name === envName);
        if (!env) return p;

        let newExpenses = p.expenses || [];
        let isAuth = false;

        if (response === 'Aceito') {
          isAuth = true;
          const installerName = installers.find(i => i.id === env.assignedInstallerId)?.name || 'Montador';
          // Create Expense only on Acceptance
          const newExp: Expense = {
            id: `mdo-${Date.now()}-${envName}`,
            description: `MDO Ambiente: ${envName} (${installerName})`,
            value: env.authorizedMdoValue || 0,
            date: new Date().toISOString().split('T')[0],
            category: 'Montagem'
          };
          newExpenses = [...newExpenses, newExp];
        }

        const newEnvDetails = p.environmentsDetails.map(e =>
          e.name === envName ? {
            ...e,
            mdoStatus: response,
            isMdoAuthorized: isAuth
          } : e
        );

        return {
          ...p,
          expenses: newExpenses,
          environmentsDetails: newEnvDetails
        };
      }
      return p;
    }));

    if (response === 'Recusado') {
      alert(`Proposta recusada registrada. Você pode enviar uma nova proposta com valor ajustado.`);
    } else {
      alert(`Proposta ACEITA! MDO autorizada e lançada no financeiro.`);
    }
  };



  const filteredMaterials = materials.filter(m => m.name.toLowerCase().includes(searchMaterial.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER NAVEGAÇÃO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Suprimentos & MDO</h3>
        <div className="flex bg-slate-200/60 p-1.5 rounded-[24px] border border-slate-200 shadow-inner overflow-x-auto max-w-full">
          {[
            { id: 'cotacoes', label: 'Pedidos' },
            { id: 'concluidas', label: 'Concluídas' },
            { id: 'apontamento', label: 'Empreitas' },
            { id: 'diario', label: 'Diário MDO' },
            { id: 'fornecedores', label: 'Parceiros' },
            { id: 'produtos', label: 'Biblioteca' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[600px]">
        {/* ABA: PEDIDOS */}
        {activeTab === 'cotacoes' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-black uppercase italic text-slate-700 tracking-tighter">Gestão de Compras</h4>
              <button onClick={() => setIsQuotationModalOpen(true)} className="bg-amber-500 text-slate-900 px-8 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-900 hover:text-white transition-all">
                <Plus size={20} /> Nova Requisição Técnica
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {purchaseOrders.filter(q => q.status === 'Cotação').map(q => (
                <div key={q.id} className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-amber-500 transition-all">
                  <div className="flex items-center gap-6">
                    <div className={`w-18 h-18 rounded-[24px] flex items-center justify-center shadow-lg transition-all ${q.status === 'Comprado' ? 'bg-emerald-500 text-white' : 'bg-amber-50 text-amber-500'}`}><Clock size={36} /></div>
                    <div>
                      <h5 className="text-2xl font-black text-slate-900 uppercase italic leading-none">{q.workName}</h5>
                      <p className="text-xs text-slate-400 font-bold uppercase mt-2 italic">Fornecedor: {suppliers.find(s => s.id === q.supplierId)?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setEntryModalData({ ...q })} className={`px-10 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all ${q.status === 'Cotação' ? 'bg-slate-900 text-white shadow-xl hover:bg-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <FileSearch size={22} /> {q.status === 'Cotação' ? 'Dar Entrada na NF' : 'Visualizar Pedido'}
                  </button>
                </div>
              ))}
              {purchaseOrders.filter(q => q.status === 'Cotação').length === 0 && (
                <div className="py-24 text-center bg-slate-50 border-4 border-dashed rounded-[56px] border-slate-100 italic font-black text-slate-300">Nenhum pedido de compra ativo.</div>
              )}
            </div>
          </div>
        )}

        {/* ABA: COMPRAS CONCLUÍDAS */}
        {activeTab === 'concluidas' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-black uppercase italic text-slate-700 tracking-tighter">Histórico de Compras</h4>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {purchaseOrders.filter(q => q.status === 'Comprado' || q.status === 'Entregue').map(q => (
                <div key={q.id} className="bg-slate-50 p-8 rounded-[48px] border border-slate-200 shadow-inner flex flex-col md:flex-row justify-between items-center gap-8 opacity-75 hover:opacity-100 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-18 h-18 rounded-[24px] flex items-center justify-center bg-emerald-100 text-emerald-600 shadow-sm"><CheckCircle2 size={36} /></div>
                    <div>
                      <h5 className="text-2xl font-black text-slate-700 uppercase italic leading-none">{q.workName}</h5>
                      <p className="text-xs text-slate-400 font-bold uppercase mt-2 italic">Fornecedor: {suppliers.find(s => s.id === q.supplierId)?.name} • {new Date(q.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => setEntryModalData({ ...q })} className="px-10 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 shadow-sm">
                    <FileSearch size={22} /> Visualizar Detalhes
                  </button>
                </div>
              ))}
              {purchaseOrders.filter(q => q.status === 'Comprado' || q.status === 'Entregue').length === 0 && (
                <div className="py-24 text-center bg-slate-50 border-4 border-dashed rounded-[56px] border-slate-100 italic font-black text-slate-300">Nenhuma compra concluída no histórico.</div>
              )}
            </div>
          </div>
        )}

        {/* ABA: DIÁRIO MDO */}
        {activeTab === 'diario' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
            <div className="bg-slate-900 p-12 rounded-[56px] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5"><UserCheck size={140} /></div>
              <h4 className="text-3xl font-black uppercase italic tracking-tighter">Lançamento de Diárias</h4>
              <p className="text-slate-400 text-xs font-bold uppercase mt-2 italic tracking-widest">Injeção de custo operacional para ajudantes avulsos</p>
            </div>
            <form onSubmit={handleLaunchDiary} className="bg-white p-12 rounded-[56px] border-2 shadow-2xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Montador / Ajudante</label>
                  <select className="w-full bg-slate-50 p-5 rounded-[28px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={newDiaryEntry.personId} onChange={e => setNewDiaryEntry({ ...newDiaryEntry, personId: e.target.value })} required>
                    <option value="">Selecione o Profissional</option>
                    {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Obra de Destino</label>
                  <select className="w-full bg-slate-50 p-5 rounded-[28px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={newDiaryEntry.projectId} onChange={e => setNewDiaryEntry({ ...newDiaryEntry, projectId: e.target.value })} required>
                    <option value="">Selecione a Obra</option>
                    {projects.filter(p => p.currentStatus !== 'Finalizada').map(p => <option key={p.id} value={p.id}>{p.workName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Valor da Diária R$</label>
                  <input type="number" className="w-full bg-slate-50 p-5 rounded-[28px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" placeholder="0,00" value={newDiaryEntry.value} onChange={e => setNewDiaryEntry({ ...newDiaryEntry, value: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Data do Serviço</label>
                  <input type="date" className="w-full bg-slate-50 p-5 rounded-[28px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={newDiaryEntry.date} onChange={e => setNewDiaryEntry({ ...newDiaryEntry, date: e.target.value })} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 flex items-center gap-2">
                  <MessageSquare size={14} /> O que essa pessoa fez nesta obra hoje? (Observação)
                </label>
                <textarea
                  className="w-full bg-slate-50 p-6 rounded-[28px] font-bold border-2 border-transparent focus:border-amber-500 outline-none transition-all h-32 resize-none italic text-sm"
                  placeholder="Ex: Ajudou na descarga do MDF e iniciou a fixação da caixaria da cozinha."
                  value={newDiaryEntry.description}
                  onChange={e => setNewDiaryEntry({ ...newDiaryEntry, description: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white p-7 rounded-[32px] font-black uppercase italic tracking-widest hover:bg-amber-500 hover:text-slate-900 shadow-2xl transition-all active:scale-95">Efetivar Lançamento da Diária</button>
            </form>
          </div>
        )}

        {/* ABA: BIBLIOTECA (CRUD) */}
        {activeTab === 'produtos' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-black uppercase italic text-slate-700 tracking-tighter">Biblioteca de Insumos</h4>
              <button onClick={() => handleOpenMaterialModal()} className="bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-amber-500 hover:text-slate-900 transition-all">
                <Plus size={20} /> Cadastrar Novo Item
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {materials.map(m => (
                <div key={m.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-amber-500 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-amber-500 transition-all"><Package size={24} /></div>
                    <div><p className="font-black uppercase italic text-sm text-slate-800 leading-none">{m.name}</p><p className="text-[9px] font-black text-slate-400 mt-1 uppercase italic tracking-widest">{m.category} • {m.unit}</p></div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenMaterialModal(m)} className="p-2 text-slate-400 hover:text-indigo-500 transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => deleteMaterial(m.id)} className="p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: PARCEIROS (CRUD) */}
        {activeTab === 'fornecedores' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-black uppercase italic text-slate-700 tracking-tighter">Rede de Parceiros</h4>
              <button onClick={() => handleOpenSupplierModal()} className="bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-amber-500 hover:text-slate-900 transition-all">
                <Plus size={20} /> Cadastrar Fornecedor
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map(s => (
                <div key={s.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-amber-500 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 group-hover:bg-amber-500 transition-all"><Briefcase size={32} /></div>
                    <div><h5 className="text-lg font-black uppercase italic text-slate-900 leading-none">{s.name}</h5><p className="text-[10px] font-black text-slate-400 mt-2 uppercase italic tracking-widest">{s.type}</p></div>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenSupplierModal(s)} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-500 transition-all shadow-sm"><Edit2 size={20} /></button>
                    <button onClick={() => deleteSupplier(s.id)} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm"><Trash2 size={20} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: EMPREITAS (APONTAMENTO) */}
        {activeTab === 'apontamento' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="bg-slate-900 p-12 rounded-[56px] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <h4 className="text-3xl font-black uppercase italic tracking-tighter">Apontamento de Empreitas</h4>
                <p className="text-slate-400 text-xs font-bold uppercase mt-2 italic tracking-widest leading-relaxed">Liberação técnica e financeira por ambiente montado</p>
              </div>
              <select className="bg-white/10 border-2 border-white/20 text-white px-10 py-5 rounded-[32px] font-black uppercase italic outline-none shadow-xl transition-all focus:bg-white/20" value={selectedOSId} onChange={e => setSelectedOSId(e.target.value)}>
                <option value="" className="text-slate-900">Selecione uma Obra Ativa</option>
                {projects.filter(p => p.currentStatus !== 'Finalizada').map(p => <option key={p.id} value={p.id} className="text-slate-900">{p.workName}</option>)}
              </select>
            </div>
            {selectedOS ? (
              <div className="grid grid-cols-1 gap-6">
                {(selectedOS.environmentsDetails || []).map(env => (
                  <div key={env.name} className={`p-10 rounded-[56px] border shadow-sm flex flex-col xl:flex-row items-center justify-between gap-10 transition-all group ${env.isMdoAuthorized ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-amber-500'}`}>
                    <div className="flex items-center gap-8 flex-1">
                      <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center shadow-2xl group-hover:scale-105 transition-all ${env.isMdoAuthorized ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-amber-500'}`}>
                        {env.isMdoAuthorized ? <CheckCircle2 size={40} /> : <Layers size={40} />}
                      </div>
                      <div>
                        <h5 className={`text-3xl font-black uppercase italic tracking-tighter ${env.isMdoAuthorized ? 'text-emerald-900' : 'text-slate-900'}`}>{env.name}</h5>
                        <p className={`text-[11px] font-black uppercase italic tracking-[0.2em] mt-2 ${env.isMdoAuthorized ? 'text-emerald-600' : 'text-slate-400'}`}>
                          Venda: R$ {env.value?.toLocaleString()}
                          {env.isMdoAuthorized && <span className="ml-3 font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-widest">AUTORIZADO: R$ {env.authorizedMdoValue?.toLocaleString()} para {installers.find(i => i.id === env.assignedInstallerId)?.name}</span>}
                        </p>
                      </div>
                    </div>

                    {!env.isMdoAuthorized ? (
                      env.mdoStatus === 'Enviado' ? (
                        <div className="flex flex-col items-end gap-3 w-full xl:w-auto">
                          <div className="bg-amber-100 text-amber-800 px-6 py-4 rounded-[24px] border border-amber-200 text-xs font-black uppercase tracking-wide flex items-center gap-3 shadow-inner">
                            <div className="bg-amber-500 rounded-full p-1 animate-pulse"><Clock size={12} className="text-white" /></div>
                            Aguardando Resposta: R$ {env.authorizedMdoValue?.toLocaleString()}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleRegisterResponse(env.name, 'Aceito')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2">
                              <Check size={16} /> Aceitar
                            </button>
                            <button onClick={() => handleRegisterResponse(env.name, 'Recusado')} className="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2">
                              <X size={16} /> Recusar
                            </button>
                            <button onClick={() => handleSendProposal(env.name)} className="bg-slate-100 hover:bg-slate-200 text-slate-400 px-4 py-3 rounded-[20px] transition-all" title="Reenviar WhatsApp">
                              <Share2 size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row items-end gap-6 w-full xl:w-auto relative">
                          {env.mdoStatus === 'Recusado' && (
                            <div className="absolute -top-6 right-0 text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                              Proposta Anterior Recusada
                            </div>
                          )}
                          <div className="space-y-2 flex-1 md:w-48">
                            <label className="text-[9px] font-black text-slate-400 uppercase italic ml-2">Montador</label>
                            <select
                              className={`w-full bg-slate-50 p-4 rounded-[20px] font-black border-2 focus:border-amber-500 outline-none italic text-xs shadow-inner transition-colors ${env.mdoStatus === 'Recusado' ? 'border-red-100' : 'border-transparent'}`}
                              value={mdoInstallers[env.name] || ''}
                              onChange={e => setMdoInstallers({ ...mdoInstallers, [env.name]: e.target.value })}
                            >
                              <option value="">Selecionar Profissional</option>
                              {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2 flex-1 md:w-40">
                            <label className="text-[9px] font-black text-slate-400 uppercase italic ml-2">MDO R$</label>
                            <input
                              type="number"
                              className={`w-full bg-slate-50 p-4 rounded-[20px] font-black border-2 focus:border-amber-500 outline-none shadow-inner text-lg text-right transition-colors ${env.mdoStatus === 'Recusado' ? 'border-red-100 text-red-900' : 'border-transparent'}`}
                              placeholder="0,00"
                              value={mdoValues[env.name] || ''}
                              onChange={e => setMdoValues({ ...mdoValues, [env.name]: e.target.value })}
                            />
                          </div>
                          <button
                            onClick={() => handleSendProposal(env.name)}
                            className="h-[64px] bg-slate-900 text-white px-10 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all flex items-center gap-3 active:scale-95"
                          >
                            <MessageSquare size={20} /> Enviar Proposta
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-3 bg-emerald-100 text-emerald-700 px-8 py-4 rounded-[28px] border border-emerald-200">
                        <CheckCircle2 size={24} />
                        <div className="text-left">
                          <span className="text-[10px] font-black uppercase tracking-widest italic block leading-none">Empreita Autorizada</span>
                          <span className="text-[8px] font-bold uppercase opacity-70">Custo Refletido no Financeiro</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-40 text-center border-4 border-dashed rounded-[64px] border-slate-100 bg-slate-50/30 flex flex-col items-center justify-center">
                <AlertCircle size={80} className="text-slate-200 mb-6" />
                <p className="text-slate-400 font-black uppercase italic text-sm tracking-widest">Aguardando seleção de obra para liberação de MDO.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: NOVO/EDITAR MATERIAL (BIBLIOTECA) */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsMaterialModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[48px] shadow-2xl p-12 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-10">
              <h4 className="text-2xl font-black uppercase italic tracking-tighter">{editingMaterial ? 'Editar Item Biblioteca' : 'Cadastrar Insumo'}</h4>
              <button onClick={() => setIsMaterialModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all"><X size={32} /></button>
            </div>
            <form onSubmit={saveMaterial} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Nome do Produto</label>
                <input type="text" className="w-full bg-slate-50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={materialForm.name} onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })} required placeholder="Ex: MDF Louro Freijó 18mm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Marca / Modelo</label>
                <input type="text" className="w-full bg-slate-50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={materialForm.brand || ''} onChange={e => setMaterialForm({ ...materialForm, brand: e.target.value })} placeholder="Ex: Guararapes, Blum..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Categoria</label>
                  <div className="flex gap-2">
                    <select className="w-full bg-slate-50 p-5 rounded-[24px] font-black outline-none border-2 border-transparent focus:border-amber-500 transition-all italic" value={materialForm.category} onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })}>
                      <option value="">Selecione...</option>
                      {materialCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => {
                      const newCat = prompt('Nova Categoria:');
                      if (newCat && !materialCategories.includes(newCat)) {
                        setMaterialCategories([...materialCategories, newCat]);
                        setMaterialForm({ ...materialForm, category: newCat });
                      }
                    }} className="bg-slate-900 text-white p-5 rounded-[24px] hover:bg-amber-500 hover:text-slate-900 transition-colors">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Unidade</label>
                  <input type="text" className="w-full bg-slate-50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all italic" value={materialForm.unit} onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })} placeholder="un, kg, m, chapa..." />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white p-6 rounded-[28px] font-black uppercase italic tracking-widest hover:bg-amber-500 hover:text-slate-900 shadow-2xl transition-all active:scale-95">Salvar na Biblioteca</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO/EDITAR PARCEIRO (FORNECEDORES) */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsSupplierModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[48px] shadow-2xl p-12 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-10">
              <h4 className="text-2xl font-black uppercase italic tracking-tighter">{editingSupplier ? 'Editar Parceiro' : 'Novo Parceiro'}</h4>
              <button onClick={() => setIsSupplierModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all"><X size={32} /></button>
            </div>
            <form onSubmit={saveSupplier} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Razão Social / Nome</label>
                <input type="text" className="w-full bg-slate-50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} required placeholder="Ex: Madereira Silva" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Tipo de Fornecimento</label>
                <select className="w-full bg-slate-50 p-5 rounded-[24px] font-black outline-none border-2 border-transparent focus:border-amber-500 transition-all italic" value={supplierForm.type} onChange={e => setSupplierForm({ ...supplierForm, type: e.target.value as SupplierType })}>
                  <option value="Material">Material de Fábrica</option><option value="Serviço (Corte/Fitação)">Serviço (Corte/Fitação)</option><option value="Montagem (Terceirizado)">Montagem (Terceirizado)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Contato / E-mail</label>
                <input type="text" className="w-full bg-slate-50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={supplierForm.contact} onChange={e => setSupplierForm({ ...supplierForm, contact: e.target.value })} placeholder="vendas@fornecedor.com" />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white p-6 rounded-[28px] font-black uppercase italic tracking-widest hover:bg-amber-500 hover:text-slate-900 shadow-2xl transition-all active:scale-95">Confirmar Cadastro</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA REQUISIÇÃO (BUSCA + ADIÇÃO) */}
      {isQuotationModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setIsQuotationModalOpen(false)} />
          <div className="relative bg-white w-full max-w-6xl h-full md:h-[90vh] rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-10 border-b bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Montar Requisição de Insumos</h4>
                <p className="text-amber-500 text-[10px] font-black uppercase italic mt-3 tracking-widest">Clique nos itens da biblioteca à esquerda para adicionar ao pedido</p>
              </div>
              <button onClick={() => setIsQuotationModalOpen(false)} className="p-4 hover:bg-slate-800 rounded-full transition-all"><X size={36} /></button>
            </div>
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* LADO ESQUERDO: BIBLIOTECA */}
              <div className="w-full md:w-2/5 border-r flex flex-col bg-slate-50/50">
                <div className="p-8 border-b bg-white">
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                    <input type="text" className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-[28px] font-black text-sm outline-none focus:bg-white border-2 border-transparent focus:border-amber-500 transition-all shadow-inner" placeholder="Pesquisar Insumo..." value={searchMaterial} onChange={e => setSearchMaterial(e.target.value)} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar">
                  {filteredMaterials.map(m => (
                    <button key={m.id} onClick={() => addItemToQuotation(m)} className="w-full flex items-center justify-between p-5 bg-white rounded-[28px] border-2 border-slate-50 hover:border-amber-500 group transition-all shadow-sm">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-amber-500 group-hover:bg-amber-50 transition-all"><Package size={24} /></div>
                        <div><p className="font-black uppercase italic text-xs text-slate-800 leading-none">{m.name}</p><p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-widest">{m.category}</p></div>
                      </div>
                      <PlusCircle size={24} className="text-slate-200 group-hover:text-amber-500 transition-colors" />
                    </button>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <p className="text-center py-20 text-slate-300 font-black uppercase italic text-[10px]">Nenhum item encontrado.</p>
                  )}
                </div>
              </div>
              {/* LADO DIREITO: CARRINHO */}
              <form onSubmit={handleCreateQuotation} className="w-full md:w-3/5 flex flex-col bg-white">
                <div className="p-10 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Obra de Destino</label>
                      <select className="w-full bg-slate-50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none italic shadow-inner text-sm" value={newQuotation.projectId} onChange={e => setNewQuotation({ ...newQuotation, projectId: e.target.value })} required>
                        <option value="">Selecione a OS</option>
                        {projects.filter(p => p.currentStatus !== 'Finalizada').map(p => <option key={p.id} value={p.id}>{p.workName}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Fornecedor</label>
                      <select className="w-full bg-slate-50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none italic shadow-inner text-sm" value={newQuotation.supplierId} onChange={e => setNewQuotation({ ...newQuotation, supplierId: e.target.value })} required>
                        <option value="">Selecione o Fornecedor</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h6 className="text-[10px] font-black uppercase text-slate-400 italic tracking-[0.2em] border-b-2 border-slate-50 pb-3 flex items-center gap-3"><ShoppingCart size={18} /> Lista de Materiais ({newQuotation.items.length})</h6>
                    {newQuotation.items.map((item, idx) => (
                      <div key={idx} className="bg-slate-50/50 p-6 rounded-[32px] flex items-center justify-between border-2 border-slate-50 animate-in slide-in-from-right-4 transition-all hover:border-amber-100">
                        <div className="flex-1"><p className="font-black uppercase italic text-sm text-slate-800 leading-none">{item.name}</p><p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{item.unit}</p></div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center bg-white rounded-2xl border-2 overflow-hidden shadow-sm">
                            <button type="button" onClick={() => { const ni = [...newQuotation.items]; if (ni[idx].quantity > 1) ni[idx].quantity -= 1; setNewQuotation({ ...newQuotation, items: ni }); }} className="px-5 py-3 hover:bg-slate-100 font-black text-slate-400 transition-colors">-</button>
                            <input type="number" className="w-16 text-center font-black text-sm border-none outline-none bg-transparent" value={item.quantity} onChange={e => { const ni = [...newQuotation.items]; ni[idx].quantity = Number(e.target.value); setNewQuotation({ ...newQuotation, items: ni }); }} />
                            <button type="button" onClick={() => { const ni = [...newQuotation.items]; ni[idx].quantity += 1; setNewQuotation({ ...newQuotation, items: ni }); }} className="px-5 py-3 hover:bg-slate-100 font-black text-amber-500 transition-colors">+</button>
                          </div>
                          <button type="button" onClick={() => setNewQuotation({ ...newQuotation, items: newQuotation.items.filter((_, i) => i !== idx) })} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={24} /></button>
                        </div>
                      </div>
                    ))}
                    {newQuotation.items.length === 0 && (
                      <div className="py-24 text-center border-4 border-dashed rounded-[56px] border-slate-50 flex flex-col items-center justify-center">
                        <Package size={60} className="text-slate-100 mb-4" />
                        <p className="text-[10px] text-slate-300 font-black uppercase italic tracking-[0.3em]">Aguardando seleção de itens...</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-10 border-t bg-slate-50/30">
                  <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase italic tracking-[0.3em] hover:bg-amber-500 hover:text-slate-900 shadow-2xl transition-all active:scale-[0.98]">Confirmar e Gerar Requisição</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAMENTO DE NOTA FISCAL (BUG FIX: AGORA OPERACIONAL) */}
      {entryModalData && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setEntryModalData(null)} />
          <div className="relative bg-white w-full max-w-4xl h-[85vh] rounded-[64px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-12 border-b bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-amber-500 text-[10px] font-black uppercase italic tracking-[0.2em]">Liquidação de Pedido de Compra</span>
                <h4 className="text-3xl font-black uppercase italic mt-3 tracking-tighter leading-none">{entryModalData.workName}</h4>
              </div>
              <div className="flex gap-2">
                <label className={`cursor-pointer bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-full font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all shadow-lg ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isAnalyzing ? <Sparkles className="animate-spin" size={16} /> : <Camera size={16} />}
                  {isAnalyzing ? 'Analisando...' : 'Ler Nota com IA'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleAnalyzeInvoice} disabled={isAnalyzing} />
                </label>
                <button onClick={() => setEntryModalData(null)} className="p-4 hover:bg-slate-800 rounded-full text-white transition-all"><X size={40} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-8 bg-slate-50 custom-scrollbar">
              {entryModalData.items.map((item, idx) => (
                <div key={idx} className="bg-white p-8 rounded-[48px] border-2 border-slate-50 flex flex-col md:flex-row justify-between items-center shadow-sm gap-8">
                  <div className="flex-1 text-center md:text-left">
                    <h6 className="text-xl font-black text-slate-900 uppercase italic leading-none">{item.name}</h6>
                    <p className="text-[10px] font-black text-slate-400 mt-3 uppercase italic tracking-widest">Quantidade Solicitada: {item.quantity} {item.unit}</p>
                  </div>
                  <div className="w-full md:w-1/3 space-y-2">
                    <label className="text-[10px] font-black text-amber-500 uppercase italic ml-3 tracking-widest">Valor Unitário NF R$</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-amber-500 px-8 py-5 rounded-[28px] text-2xl font-black outline-none transition-all text-right shadow-inner"
                      value={item.materialValue || ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const ni = [...entryModalData.items];
                        ni[idx].materialValue = val;
                        setEntryModalData({ ...entryModalData, items: ni });
                      }}
                      placeholder="0,00"
                      step="0.01"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-12 bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-amber-500 uppercase italic mb-3 tracking-[0.3em]">Total Bruto de Insumos</p>
                <span className="text-white text-6xl font-black italic tracking-tighter leading-none">R$ {entryModalData.items.reduce((acc, item) => acc + ((item.materialValue || 0) * item.quantity), 0).toLocaleString()}</span>
              </div>
              <button
                onClick={finalizeEntryAndInjectCost}
                className="w-full md:w-auto px-16 py-8 bg-emerald-600 text-white font-black uppercase text-sm tracking-[0.2em] rounded-[32px] shadow-2xl hover:bg-emerald-500 flex items-center justify-center gap-5 transition-all active:scale-[0.98]"
              >
                <CheckCircle2 size={36} /> Confirmar & Destravar PCP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcurementView;
