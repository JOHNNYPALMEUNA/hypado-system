import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, ShoppingCart, Clock, CheckCircle2, 
  FileSearch, Trash2, Printer, Camera, Upload, 
  RefreshCw, DollarSign, X, MessageSquare, Sparkles 
} from 'lucide-react';
import { Quotation, Project, Supplier, Material, QuotationItem, Company } from '../../types';
import { analyzeReceipt } from '../../geminiService';
import { compressOrderData } from '../../utils';

interface PurchaseOrderManagerProps {
  purchaseOrders: Quotation[];
  projects: Project[];
  suppliers: Supplier[];
  materials: Material[];
  addQuotation: (q: Quotation) => Promise<void>;
  updateQuotation: (q: Quotation) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  updateProject: (p: Project) => Promise<void>;
  company: Company;
  showHistory?: boolean;
}

const PurchaseOrderManager: React.FC<PurchaseOrderManagerProps> = ({
  purchaseOrders,
  projects,
  suppliers,
  materials,
  addQuotation,
  updateQuotation,
  deleteQuotation,
  updateProject,
  company,
  showHistory = false
}) => {
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [entryModalData, setEntryModalData] = useState<Quotation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newQuotation, setNewQuotation] = useState({ 
    projectId: '', 
    supplierId: '', 
    items: [] as QuotationItem[] 
  });
  const [searchMaterial, setSearchMaterial] = useState('');
  const [discount, setDiscount] = useState(0);

  const filteredOrders = useMemo(() => {
    if (showHistory) {
      return purchaseOrders.filter(q => q.status === 'Comprado' || q.status === 'Entregue');
    }
    return purchaseOrders.filter(q => q.status === 'Cotação');
  }, [purchaseOrders, showHistory]);

  const addItemToQuotation = (material: Material) => {
    setNewQuotation(prev => {
      const exists = prev.items.find(i => i.productId === material.id);
      if (exists) {
        return { 
          ...prev, 
          items: prev.items.map(i => i.productId === material.id ? { ...i, quantity: i.quantity + 1 } : i) 
        };
      }
      return { 
        ...prev, 
        items: [...prev.items, { 
          productId: material.id, 
          name: material.name, 
          quantity: 1, 
          unit: material.unit || 'un' 
        }] 
      };
    });
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
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
    await addQuotation(quotation);
    setIsQuotationModalOpen(false);
    setNewQuotation({ projectId: '', supplierId: '', items: [] });
  };

  const handleSendPurchaseOrder = (order: Quotation) => {
    const supplier = suppliers.find(s => s.id === order.supplierId);
    const supplierName = supplier?.name || 'Fornecedor';

    const orderData = {
      workName: order.workName,
      supplierName: supplierName,
      items: order.items,
      date: new Date(order.date).toLocaleDateString(),
      adminPhone: company.phone?.replace(/\D/g, '') || '',
      orderId: order.id,
      totalItems: order.items.length,
      companyName: company.name
    };

    const encodedData = compressOrderData(orderData);
    const smartLink = `${window.location.origin}/?mode=purchase-order&data=${encodedData}`;

    const text = `*PEDIDO DE COMPRA - HYPADO*\n\n` +
      `📦 Olá *${supplierName}*,\n` +
      `Segue pedido de materiais para a obra:\n\n` +
      `🏢 *Obra:* ${order.workName}\n` +
      `📋 *Itens:* ${order.items.length} itens listados\n` +
      `📅 *Data:* ${new Date(order.date).toLocaleDateString()}\n\n` +
      `👉 *Acesse o link abaixo para ver o pedido completo e CONFIRMAR:*\n` +
      `${smartLink}`;

    const url = `https://wa.me/${supplier?.contact?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleAnalyzeInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entryModalData) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        const context = entryModalData.items.map(i => `${i.quantity}x ${i.name}`).join('\n');

        const result = await analyzeReceipt(base64, context, mimeType);

        if (result && result.items) {
          const newItems = [...entryModalData.items].map(item => {
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
          alert('Não foi possível extrair dados da nota.');
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

  const handleAnalyzeForNewQuotation = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        const libraryContext = materials.map(m => m.name).join(', ');

        const result = await analyzeReceipt(base64, libraryContext, mimeType);

        if (result && result.items) {
          const matchedItems: QuotationItem[] = [];
          
          result.items.forEach((r: any) => {
            const match = materials.find(m => 
              m.name.toLowerCase().includes(r.name.toLowerCase()) || 
              r.name.toLowerCase().includes(m.name.toLowerCase())
            );
            
            if (match) {
              matchedItems.push({
                productId: match.id,
                name: match.name,
                quantity: r.quantity || 1,
                unit: match.unit || 'un',
                materialValue: r.unitPrice || 0
              });
            }
          });

          if (matchedItems.length > 0) {
            setNewQuotation(prev => ({
              ...prev,
              items: matchedItems
            }));
            alert(`SUCESSO: ${matchedItems.length} itens identificados e adicionados!`);
          } else {
            alert('A IA não conseguiu encontrar materiais correspondentes na sua biblioteca.');
          }
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro AI:", error);
      alert("Falha no processamento da IA.");
      setIsAnalyzing(false);
    }
  };

  const finalizeEntryAndInjectCost = async () => {
    if (!entryModalData) return;
    const subtotal = entryModalData.items.reduce((acc, item) => acc + ((item.materialValue || 0) * item.quantity), 0);
    const totalCost = Math.max(0, subtotal - discount);
    const supplierName = suppliers.find(s => s.id === entryModalData.supplierId)?.name || 'Fornecedor';

    const originalOrder = purchaseOrders.find(p => p.id === entryModalData.id);
    let hasPendingItems = false;

    if (originalOrder) {
      const missingItems: QuotationItem[] = [];
      entryModalData.items.forEach((entryItem) => {
        const originalItem = originalOrder.items.find(oi => oi.productId === entryItem.productId);
        if (originalItem && entryItem.quantity < originalItem.quantity) {
          missingItems.push({
            ...originalItem,
            quantity: originalItem.quantity - entryItem.quantity,
            materialValue: 0
          });
        }
      });

      if (missingItems.length > 0) {
        hasPendingItems = true;
        const newQuote: Quotation = {
          id: `PED-${Date.now()}`,
          projectId: originalOrder.projectId,
          workName: originalOrder.workName,
          supplierId: originalOrder.supplierId,
          items: missingItems,
          status: 'Cotação',
          date: new Date().toISOString(),
        };
        await addQuotation(newQuote);
      }
    }

    const updatedOrder = {
      ...entryModalData,
      status: 'Comprado' as const
    };
    await updateQuotation(updatedOrder);

    const project = projects.find(p => p.id === entryModalData.projectId);
    if (project) {
        const newExp = {
            id: `nf-${Date.now()}`,
            description: `NF: ${entryModalData.id} - ${supplierName}${discount > 0 ? ` (Desc. R$${discount})` : ''}`,
            value: totalCost,
            date: new Date().toISOString().split('T')[0],
            category: 'Material'
        };

        await updateProject({
            ...project,
            materialsDelivered: !hasPendingItems,
            expenses: [...(project.expenses || []), newExp]
        } as Project);
    }

    setEntryModalData(null);
    setDiscount(0);
    alert(`FATURAMENTO CONCLUÍDO!`);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">
            {showHistory ? 'Histórico de Compras' : 'Gestão de Pedidos'}
        </h4>
        {!showHistory && (
            <button 
                onClick={() => setIsQuotationModalOpen(true)} 
                className="bg-amber-500 text-foreground px-8 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-900 hover:text-white transition-all"
            >
                <Plus size={20} /> Nova Requisição Técnica
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.map(q => (
          <div key={q.id} className="bg-card p-8 rounded-[48px] border border-slate-100 shadow-sm transition-all flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-amber-500">
            <div className="flex items-center gap-6">
              <div className={`w-18 h-18 rounded-[24px] flex items-center justify-center shadow-lg transition-all ${q.status === 'Comprado' ? 'bg-emerald-500 text-white' : 'bg-amber-50 text-amber-500'}`}>
                {q.status === 'Comprado' ? <CheckCircle2 size={36} /> : <Clock size={36} />}
              </div>
              <div>
                <h5 className="text-2xl font-black text-foreground uppercase italic leading-none">{q.workName}</h5>
                <p className="text-xs text-slate-400 font-bold uppercase mt-2 italic">
                    FORNECEDOR: {suppliers.find(s => s.id === q.supplierId)?.name || 'N/A'} • {new Date(q.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {q.status === 'Cotação' && (
                <>
                    <button 
                        onClick={() => handleSendPurchaseOrder(q)}
                        className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Enviar via WhatsApp"
                    >
                        <MessageSquare size={20} />
                    </button>
                    <button 
                        onClick={() => setEntryModalData({ ...q })} 
                        className="px-8 py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-emerald-600 transition-all shadow-xl"
                    >
                        <FileSearch size={20} /> Dar Entrada
                    </button>
                </>
              )}
              {q.status === 'Comprado' && (
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Processado</span>
                      <span className="text-sm font-bold text-slate-400 italic">ID: {q.id}</span>
                  </div>
              )}
              <button title="Excluir Pedido" onClick={() => deleteQuotation(q.id)} className="p-4 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
            <div className="py-20 text-center text-slate-400 italic font-medium">Nenhum pedido encontrado nesta seção.</div>
        )}
      </div>

      {/* MODAL: NOVA COTAÇÃO */}
      {isQuotationModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
              <div className="bg-card w-full max-w-6xl h-[90vh] rounded-[64px] border border-white/10 shadow-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
                  <div className="bg-slate-900 p-10 flex justify-between items-center shrink-0">
                      <div>
                          <h4 className="text-3xl font-black uppercase italic text-white tracking-widest flex items-center gap-4">
                              <ShoppingCart size={32} className="text-amber-500" /> Nova Requisição
                          </h4>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-2">Montagem de cotação e envio automatizado</p>
                      </div>
                      <button title="Fechar Modal" onClick={() => setIsQuotationModalOpen(false)} className="bg-white/10 p-4 rounded-full text-white hover:bg-white/20 transition-all">
                          <X size={32} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-hidden flex">
                      {/* Left: Configuration & Selected Items */}
                      <div className="w-[35%] p-10 border-r border-slate-100 overflow-y-auto space-y-8 bg-slate-50/50">
                          <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Dados do Pedido</label>
                                  <label className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black uppercase text-[8px] tracking-widest cursor-pointer hover:bg-emerald-600 transition-all shadow-lg active:scale-95">
                                      {isAnalyzing ? <RefreshCw className="animate-spin" size={12} /> : <Camera size={12} />}
                                      {isAnalyzing ? 'Analisando...' : 'Importar NF (IA)'}
                                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleAnalyzeForNewQuotation} disabled={isAnalyzing} />
                                  </label>
                              </div>
                              
                              <select 
                                  title="Selecione a Obra"
                                  className="w-full p-6 rounded-[24px] bg-white border border-slate-100 shadow-sm outline-none font-bold text-slate-900 focus:ring-4 focus:ring-amber-500/20"
                                  value={newQuotation.projectId}
                                  onChange={e => setNewQuotation({...newQuotation, projectId: e.target.value})}
                              >
                                  <option value="">Escolher Obra...</option>
                                  {projects.map(p => <option key={p.id} value={p.id}>{p.workName}</option>)}
                              </select>

                              <select 
                                  title="Escolha o Fornecedor"
                                  className="w-full p-6 rounded-[24px] bg-white border border-slate-100 shadow-sm outline-none font-bold text-slate-900 focus:ring-4 focus:ring-amber-500/20"
                                  value={newQuotation.supplierId}
                                  onChange={e => setNewQuotation({...newQuotation, supplierId: e.target.value})}
                              >
                                  <option value="">Escolher Fornecedor...</option>
                                  {suppliers.filter(s => s.type === 'Material').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                          </div>

                          <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Itens Selecionados ({newQuotation.items.length})</label>
                              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                  {newQuotation.items.map((item, idx) => (
                                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group shadow-sm">
                                          <div>
                                              <p className="text-[10px] font-black uppercase italic leading-none">{item.name}</p>
                                              <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{item.quantity} {item.unit}</p>
                                          </div>
                                          <button 
                                              onClick={() => setNewQuotation(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                          >
                                              <Trash2 size={14} />
                                          </button>
                                      </div>
                                  ))}
                                  {newQuotation.items.length === 0 && (
                                      <div className="py-8 text-center text-slate-300 text-[10px] font-bold uppercase italic border-2 border-dashed border-slate-100 rounded-3xl">Clique nos itens à direita</div>
                                  )}
                              </div>
                          </div>

                          <div className="p-8 bg-slate-900 rounded-[40px] border border-white/5 shadow-2xl space-y-6 sticky bottom-0">
                              <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                 <span>Total de Itens</span>
                                 <span className="text-white text-xl">{newQuotation.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                              </div>
                              <button 
                                  onClick={handleCreateQuotation}
                                  className="w-full py-5 bg-amber-500 text-foreground rounded-[20px] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-emerald-500 transition-all active:scale-95"
                              >
                                  Gerar Requisição
                              </button>
                          </div>
                      </div>

                      {/* Right: Item Selection */}
                      <div className="flex-1 flex flex-col bg-white">
                          <div className="p-10 border-b border-slate-50 relative shrink-0">
                                <Search className="absolute left-14 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar material na biblioteca..." 
                                    className="w-full pl-16 pr-8 py-6 rounded-[32px] bg-slate-100/50 border-none outline-none font-bold text-lg focus:bg-white focus:shadow-inner transition-all"
                                    value={searchMaterial}
                                    onChange={e => setSearchMaterial(e.target.value)}
                                />
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {materials.filter(m => m.name.toLowerCase().includes(searchMaterial.toLowerCase())).map(m => (
                                  <button 
                                      key={m.id}
                                      onClick={() => addItemToQuotation(m)}
                                      className="flex items-center justify-between p-6 rounded-[24px] border border-slate-50 hover:border-amber-500 hover:bg-amber-50 transition-all text-left shadow-sm group"
                                  >
                                      <div>
                                          <p className="font-black text-slate-900 uppercase italic leading-none group-hover:text-amber-600 transition-colors">{m.name}</p>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{m.category} • {m.unit}</p>
                                      </div>
                                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                          <Plus size={20} />
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: DAR ENTRADA / NF ANALYZER */}
      {entryModalData && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6">
              <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-[64px] shadow-3xl overflow-hidden flex flex-col border border-white/10 animate-in slide-in-from-bottom-5 duration-500">
                <div className="p-8 bg-slate-900 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter">Recebimento Técnica</h4>
                        <p className="text-slate-400 text-[10px] font-bold tracking-[0.3em] uppercase mt-1">Conferência de itens e injeção de custo real</p>
                    </div>
                    <button 
                        title="Fechar Visualização"
                        onClick={() => setEntryModalData(null)} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={28} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-12 space-y-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-50 p-8 rounded-[40px] border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <div className="space-y-4 relative z-10 w-full md:w-auto">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                <Sparkles size={14} className="text-amber-500" /> Assistente de Entrada IA
                            </label>
                            <p className="text-sm font-bold text-slate-600 max-w-xs leading-tight">Anexe sua Nota Fiscal ou Recibo para extrair os preços reais automaticamente.</p>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-emerald-600 transition-all shadow-xl active:scale-95 group">
                                    {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                                    {isAnalyzing ? 'Processando Documento...' : 'Importar NF / PDF'}
                                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleAnalyzeInvoice} disabled={isAnalyzing} />
                                </label>
                            </div>
                        </div>
                        <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-auto">
                            <div className="text-center md:text-right">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Subtotal</p>
                                <p className="text-xl font-bold text-slate-400 italic">
                                    R$ {entryModalData.items.reduce((acc, i) => acc + ((i.materialValue || 0) * i.quantity), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="text-center md:text-right">
                                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Total Final com Desconto</p>
                                <p className="text-5xl font-black text-slate-900 italic tracking-tighter leading-none">
                                    R$ {Math.max(0, entryModalData.items.reduce((acc, i) => acc + ((i.materialValue || 0) * i.quantity), 0) - discount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50/50 p-8 rounded-[40px] border border-amber-100/50">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-amber-600 tracking-widest ml-4 flex items-center gap-2">
                                <DollarSign size={14} /> Aplicar Desconto (R$)
                            </label>
                            <input 
                                title="Desconto da NF"
                                type="number" 
                                className="w-full bg-white p-6 rounded-[24px] border-none shadow-xl outline-none font-black text-2xl text-amber-600 focus:ring-4 focus:ring-amber-500/20 transition-all"
                                value={discount || ''}
                                placeholder="0,00"
                                onChange={e => setDiscount(Number(e.target.value))}
                            />
                        </div>
                        <div className="flex items-center p-6 text-slate-500 text-xs font-bold leading-tight italic">
                            O valor de desconto será subtraído do total da nota no momento da injeção de custo na obra.
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500" /> Conferência de Itens
                        </h5>
                        <div className="space-y-3">
                            {entryModalData.items.map((item, idx) => (
                                <div key={idx} className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:border-slate-900 transition-all">
                                    <div className="flex-1">
                                        <p className="font-black text-slate-900 uppercase italic leading-none">{item.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">{item.unit}</p>
                                    </div>
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="flex-1 md:w-32">
                                            <input 
                                                title="Quant. Recebida"
                                                type="number" 
                                                className="w-full bg-slate-100/50 p-4 rounded-2xl border-none outline-none font-black text-center"
                                                value={item.quantity}
                                                onChange={e => {
                                                    const newItems = [...entryModalData.items];
                                                    newItems[idx].quantity = Number(e.target.value);
                                                    setEntryModalData({...entryModalData, items: newItems});
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 md:w-48 relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={16} /></div>
                                            <input 
                                                title="Preço Real UN"
                                                type="number" 
                                                className="w-full bg-slate-900 text-white p-4 pl-10 rounded-2xl border-none outline-none font-black"
                                                value={item.materialValue || ''}
                                                placeholder="---"
                                                onChange={e => {
                                                    const newItems = [...entryModalData.items];
                                                    newItems[idx].materialValue = Number(e.target.value);
                                                    setEntryModalData({...entryModalData, items: newItems});
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                    <button 
                        onClick={finalizeEntryAndInjectCost}
                        className="px-16 py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-emerald-600 transition-all active:scale-95"
                    >
                        Confirmar Recebimento & Faturar
                    </button>
                </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PurchaseOrderManager;
