
import React, { useState, useMemo } from 'react';
import { Project, Supplier, Material, Quotation, PurchaseStatus, Expense, SupplierType, QuotationItem, Company, Installer, Client, EnvironmentWithDetails } from '../types';
import { analyzeReceipt, analyzeCutList } from '../geminiService';
import {
  Plus, ShoppingCart, CheckCircle2, Clock, X, DollarSign,
  Layers, Printer, FileSearch, Trash2, Search, Package,
  UserCheck, Users, HardHat, Briefcase, PlusCircle, Hammer,
  Edit2, Save, MoreHorizontal, Filter, AlertCircle, Check,
  MessageSquare, Sparkles, Upload, Camera, Share2, RefreshCw,
  Calendar
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { compressOrderData } from '../utils';

interface Props {
  projects: Project[];
  setProjects: any;
  // suppliers: Supplier[]; // Removed
  // setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>; // Removed
  // materials: Material[]; // Removed
  // setMaterials: React.Dispatch<React.SetStateAction<Material[]>>; // Removed
  purchaseOrders: Quotation[];
  addQuotation: (q: Quotation) => Promise<void>;
  updateQuotation: (q: Quotation) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  company: Company;
  installers: Installer[];
  clients: Client[];
  externalActiveTab?: 'cotacoes' | 'apontamento' | 'diario' | 'produtos' | 'fornecedores';
  setExternalActiveTab?: (tab: any) => void;
  externalSelectedOSId?: string;
  setExternalSelectedOSId?: (id: string) => void;
  materialCategories: string[];
  setMaterialCategories: React.Dispatch<React.SetStateAction<string[]>>;
}

const ProcurementView: React.FC<Props> = ({
  projects, setProjects,
  purchaseOrders, addQuotation, updateQuotation, deleteQuotation, company, installers,
  externalActiveTab, setExternalActiveTab, externalSelectedOSId, setExternalSelectedOSId,
  materialCategories, setMaterialCategories
}) => {
  const { updateProject, suppliers, addSupplier, updateSupplier, deleteSupplier, materials, addMaterial, updateMaterial, deleteMaterial, userRole, projects: allProjects } = useData();
  const activeTab = externalActiveTab || 'cotacoes';
  const setActiveTab = setExternalActiveTab || (() => { });

  // ESTADOS DE SELEÇÃO E LIQUIDAÇÃO
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [settlementSuccessData, setSettlementSuccessData] = useState<{ id: string; url: string } | null>(null);

  // ESTADOS DE MODAL
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [entryModalData, setEntryModalData] = useState<Quotation | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<Quotation | null>(null);

  // ESTADOS DE EDIÇÃO
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingQuotationData, setEditingQuotationData] = useState<Quotation | null>(null);
  const [substitutingItemIndex, setSubstitutingItemIndex] = useState<number | null>(null);

  // FORMULÃRIOS
  const [materialForm, setMaterialForm] = useState<Partial<Material>>({ name: '', category: 'MDF', unit: 'Chapa' });
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({ name: '', type: 'Material', contact: '' });
  const [newQuotation, setNewQuotation] = useState({ projectId: '', supplierId: '', items: [] as QuotationItem[] });
  const [searchMaterial, setSearchMaterial] = useState('');
  const [newDiaryEntry, setNewDiaryEntry] = useState({ personId: '', projectId: '', date: new Date().toISOString().split('T')[0], value: '', description: '' });

  // ESTADO PARA VALORES E MONTADORES DE EMPREITA
  const [mdoValues, setMdoValues] = useState<Record<string, string>>({});
  const [mdoInstallers, setMdoInstallers] = useState<Record<string, string>>({});
  const [bulkInstallerId, setBulkInstallerId] = useState('');

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

  const saveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.name) return;
    if (editingMaterial) {
      await updateMaterial({ ...editingMaterial, ...materialForm } as Material);
    } else {
      const newMat: Material = { id: `mat-${Date.now()}`, ...materialForm } as Material;
      await addMaterial(newMat);
    }
    setIsMaterialModalOpen(false);
  };

  const handleDeleteMaterial = async (id: string) => {
    if (confirm("Excluir item da biblioteca?")) {
      const pwd = prompt('Digite a senha de administrador:');
      if (pwd !== 'adm123') {
        alert('Senha incorreta!');
        return;
      }
      await deleteMaterial(id);
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

  const saveSupplierHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name) return;
    if (editingSupplier) {
      await updateSupplier({ ...editingSupplier, ...supplierForm } as Supplier);
    } else {
      const newSup: Supplier = { id: `sup-${Date.now()}`, ...supplierForm } as Supplier;
      await addSupplier(newSup);
    }
    setIsSupplierModalOpen(false);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (confirm("Excluir parceiro?")) {
      const pwd = prompt('Digite a senha de administrador:');
      if (pwd !== 'adm123') {
        alert('Senha incorreta!');
        return;
      }
      await deleteSupplier(id);
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
    addQuotation(quotation);
    setIsQuotationModalOpen(false);
    setNewQuotation({ projectId: '', supplierId: '', items: [] });
  };

  const handleConfirmSettle = async () => {
    if (selectedOrders.length === 0) return;

    const settlementId = `LOT-PURCH-${Date.now().toString().slice(-6)}`;
    const settlementDate = new Date().toISOString();

    try {
      // Process logical grouping for selected orders
      const ordersToUpdate = purchaseOrders.filter(q => selectedOrders.includes(q.id));

      for (const order of ordersToUpdate) {
        await updateQuotation({
          ...order,
          status: 'Comprado' as const,
          settlementId,
          settlementDate
        });

        // Also inject costs into project like finalizeEntryAndInjectCost does
        const project = allProjects.find(p => p.id === order.projectId);
        if (project) {
          const supplierName = suppliers.find(s => s.id === order.supplierId)?.name || 'Fornecedor';
          const totalCost = order.items.reduce((acc, item) => acc + ((item.materialValue || 0) * item.quantity), 0);

          const newExp = {
            id: `nf-settle-${Date.now()}-${order.id}`,
            description: `NF: ${order.id} - ${supplierName} (Lote)`,
            value: totalCost,
            date: settlementDate.split('T')[0],
            category: 'Material'
          };

          await updateProject({
            ...project,
            expenses: [...(project.expenses || []), newExp]
          } as Project);
        }
      }

      setSettlementSuccessData({
        id: settlementId,
        url: `${window.location.origin}/?mode=purchase-settlement-report&id=${settlementId}`
      });
      setSelectedOrders([]);
    } catch (error) {
      console.error("Erro ao liquidar pedidos:", error);
      alert("Erro ao processar a liquidação.");
    }
  };

  const groupedHistory = useMemo(() => {
    const paid = purchaseOrders.filter(q => q.status === 'Comprado' || q.status === 'Entregue');
    const groups: Record<string, any> = {};

    paid.forEach(q => {
      const dateStr = q.settlementDate || q.date;
      const dateObj = new Date(dateStr);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const sId = `${year}-${month}`; // e.g., "2026-03"

      if (!groups[sId]) {
        groups[sId] = {
          id: sId,
          date: dateStr,
          total: 0,
          ordersCount: 0,
          suppliers: new Set<string>(),
          projects: new Set<string>(),
          minDate: dateStr,
          maxDate: dateStr
        };
      }
      const item = groups[sId];
      const orderTotal = q.items.reduce((acc, i) => acc + ((i.materialValue || 0) * i.quantity), 0);
      item.total += orderTotal;
      item.ordersCount += 1;
      const sName = suppliers.find(s => s.id === q.supplierId)?.name || 'Fornecedor';
      item.suppliers.add(sName);
      item.projects.add(q.workName);
      if (dateStr < item.minDate) item.minDate = dateStr;
      if (dateStr > item.maxDate) item.maxDate = dateStr;
    });

    return Object.values(groups).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchaseOrders, suppliers]);

  const finalizeEntryAndInjectCost = () => {
    if (!entryModalData) return;
    const totalCost = entryModalData.items.reduce((acc, item) => acc + ((item.materialValue || 0) * item.quantity), 0);
    const supplierName = suppliers.find(s => s.id === entryModalData.supplierId)?.name || 'Fornecedor';

    // Atualiza Ordens de Compra
    // 4. Update order status and items (with potentially reduced quantity)
    // CHECK FOR PARTIAL DELIVERY (Split Order)
    const originalOrder = purchaseOrders.find(p => p.id === entryModalData.id);
    let newQuote: Quotation | null = null;
    let hasPendingItems = false;

    if (originalOrder) {
      const missingItems: QuotationItem[] = [];

      entryModalData.items.forEach((entryItem, idx) => {
        const originalItem = originalOrder.items.find(oi => oi.productId === entryItem.productId); // Find by product ID for robustness
        if (originalItem && entryItem.quantity < originalItem.quantity) {
          // Found missing/pending items
          missingItems.push({
            ...originalItem,
            quantity: originalItem.quantity - entryItem.quantity,
            materialValue: 0 // Reset value for new quote
          });
        }
      });

      if (missingItems.length > 0) {
        hasPendingItems = true;
        // Create Backorder Quote
        newQuote = {
          id: `PED-${Date.now()}`, // Using Date.now() for ID consistency
          projectId: originalOrder.projectId,
          workName: originalOrder.workName,
          supplierId: originalOrder.supplierId,
          items: missingItems,
          status: 'Cotação',
          date: new Date().toISOString(),
        };

        // Add new quote to state
        addQuotation(newQuote);
        alert(`ATENÇÃO: Entrada Parcial detectada.\n\nOs itens restantes foram movidos para uma NOVA Cotação (Pendente).\nVerifique a lista de pedidos.`);
      }
    }

    // Update the ORIGINAL order with the RECEIVED quantities
    const updatedOrder = {
      ...entryModalData,
      status: 'Comprado' as const
    };

    updateQuotation(updatedOrder);

    // 5. Update Project Status (Materials Delivered?)
    const project = projects.find(p => p.id === entryModalData.projectId);
    if (!project) return;

    // Logic: Only mark Delivered if NO pending quotes exist for this project (including the one we just created)
    const activeQuotesForProject = purchaseOrders.filter(p =>
      p.projectId === entryModalData.projectId &&
      p.status === 'Cotação' &&
      p.id !== entryModalData.id // exclude current (which is becoming bought)
    );

    // If we created a new quote, it counts as active
    const materialsReallyDelivered = activeQuotesForProject.length === 0 && !hasPendingItems;

    const newExp = {
      id: `nf-${Date.now()}`,
      description: `NF: ${entryModalData.id} - ${supplierName}`,
      value: totalCost,
      date: new Date().toISOString().split('T')[0],
      category: 'Material'
    };

    updateProject({
      ...project,
      materialsDelivered: materialsReallyDelivered,
      expenses: [...(project.expenses || []), newExp]
    } as Project);

    setEntryModalData(null);
    alert(`FATURAMENTO CONCLUÍDO!\n\nStatus da Obra: ${materialsReallyDelivered ? 'MATERIAIS ENTREGUES' : 'MATERIAIS PENDENTES'}.\nO custo foi injetado no DRE.`);
  };

  const handleAnalyzeInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entryModalData) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const mimeType = file.type; // Capture MIME type (image/jpeg, application/pdf, etc.)
        const context = entryModalData.items.map(i => `${i.quantity}x ${i.name}`).join('\n');

        const result = await analyzeReceipt(base64, context, mimeType);

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
          alert('Não foi possível extrair dados da nota. Tente novamente com uma imagem/PDF mais claro.');
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

  // --- DIÃRIO ---
  const handleLaunchDiary = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newDiaryEntry.value);
    if (!newDiaryEntry.personId || !newDiaryEntry.projectId || val <= 0) {
      alert("Preencha todos os campos da diária.");
      return;
    }
    const person = installers.find(i => i.id === newDiaryEntry.personId);
    const p = projects.find(proj => proj.id === newDiaryEntry.projectId);
    if (p) {
      const newExp = {
        id: `diary-${Date.now()}`,
        description: `DIÃRIA: ${person?.name} - Motivo: ${newDiaryEntry.description || 'Montagem/Serviço Geral'}`,
        value: val,
        date: newDiaryEntry.date,
        category: 'Montagem'
      };
      updateProject({ ...p, expenses: [...(p.expenses || []), newExp] } as Project);
    }
    setNewDiaryEntry({ ...newDiaryEntry, value: '', description: '' });
    alert("Diária lançada com sucesso no DRE da obra.");
  };

  // --- APONTAMENTO DE EMPREITAS ---
  // --- ORDER SENDING HANDLER ---
  const handleSendPurchaseOrder = (order: Quotation) => {
    const supplier = suppliers.find(s => s.id === order.supplierId);
    const supplierName = supplier?.name || 'Fornecedor';

    // Generate Smart Link for Purchase Order
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

    // Compress data using LZString to prevent URL truncation on mobile
    const encodedData = compressOrderData(orderData);
    const smartLink = `${window.location.origin}/?mode=purchase-order&data=${encodedData}`;

    const text = `*PEDIDO DE COMPRA - HYPADO*\n\n` +
      `ðŸ­ Olá *${supplierName}*,\n` +
      `Segue pedido de materiais para a obra:\n\n` +
      `ðŸ¢ *Obra:* ${order.workName}\n` +
      `📋 *Itens:* ${order.items.length} itens listados\n` +
      `📅 *Data:* ${new Date(order.date).toLocaleDateString()}\n\n` +
      `👉 *Acesse o link abaixo para ver o pedido completo e CONFIRMAR:*\n` +
      `${smartLink}`;

    const url = `https://wa.me/${supplier?.contact?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // --- NEGOTIATION FLOW HANDLERS ---
  const handleSendProposal = (targetEnvName: string) => {
    const installerId = mdoInstallers[targetEnvName];
    if (!selectedOSId || !selectedOS) return;
    if (!installerId) {
      alert("Selecione o Montador para enviar a proposta.");
      return;
    }

    // Identificar todos os ambientes atribuídos a este mesmo montador nesta OS que possuem valor definido e não estão autorizados
    const groupedEnvs = (selectedOS.environmentsDetails || []).filter(env =>
      mdoInstallers[env.name] === installerId &&
      parseFloat(mdoValues[env.name] || '0') > 0 &&
      !env.isMdoAuthorized
    );

    if (groupedEnvs.length === 0) {
      alert("Nenhum valor válido encontrado para os ambientes deste montador.");
      return;
    }

    const installer = installers.find(i => i.id === installerId);
    const installerName = installer?.name || 'Montador';
    const totalValue = groupedEnvs.reduce((acc, env) => acc + parseFloat(mdoValues[env.name] || '0'), 0);

    const p = projects.find(proj => proj.id === selectedOSId);
    if (p) {
      const newEnvDetails = p.environmentsDetails.map(env => {
        const isPartofGroup = groupedEnvs.some(ge => ge.name === env.name);
        if (isPartofGroup) {
          return {
            ...env,
            mdoStatus: 'Enviado',
            authorizedMdoValue: parseFloat(mdoValues[env.name] || '0'),
            assignedInstallerId: installerId,
            isMdoAuthorized: false
          };
        }
        return env;
      });
      updateProject({ ...p, environmentsDetails: newEnvDetails as any } as Project);
    }

    // Generate Smart Link Payload (Updated for multiple environments)
    const proposalData = {
      workName: selectedOS.workName,
      clientName: selectedOS.clientName,
      envs: groupedEnvs.map(env => ({
        name: env.name,
        value: parseFloat(mdoValues[env.name] || '0'),
        obs: env.memorial?.observation || ''
      })),
      totalValue: totalValue,
      date: selectedOS.promisedDate ? new Date(selectedOS.promisedDate).toLocaleDateString() : 'A combinar',
      installerName: installerName,
      cloudLink: selectedOS.cloudFolderLink,
      adminPhone: company.phone?.replace(/\D/g, '') || '',
      projectId: selectedOSId,
      installerId: installerId,
      address: selectedOS.addressStreet
        ? `${selectedOS.addressStreet}, ${selectedOS.addressNumber} - ${selectedOS.addressNeighborhood}, ${selectedOS.addressCity}`
        : (selectedOS.workAddress || 'Endereço não informado'),
      mapsLink: selectedOS.addressStreet
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedOS.addressStreet}, ${selectedOS.addressNumber} - ${selectedOS.addressNeighborhood}, ${selectedOS.addressCity}`)}`
        : '',
    };

    // Use encodeURIComponent to support UTF-8 characters properly
    const encodedData = window.btoa(unescape(encodeURIComponent(JSON.stringify(proposalData))));
    const smartLink = `${window.location.origin}/?mode=proposal&data=${encodeURIComponent(encodedData)}`;

    const envsListText = groupedEnvs.map(env =>
      `• *${env.name}:* R$ ${parseFloat(mdoValues[env.name] || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ).join('\n');

    const text = `*PROPOSTA DE EMPREITA - HYPADO*\n\n` +
      `ðŸ‘·â€â™‚ï¸ Olá *${installerName}*,\n` +
      `Temos uma nova oportunidade para você na obra *${selectedOS.workName}*:\n\n` +
      `${envsListText}\n\n` +
      `💰 *VALOR TOTAL:* R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
      `👉 *Toque no link abaixo para ver detalhes e ACEITAR/RECUSAR:*\n` +
      `${smartLink}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleRegisterResponse = (envName: string, response: 'Aceito' | 'Recusado') => {
    if (!selectedOSId || !selectedOS) return;

    const p = projects.find(proj => proj.id === selectedOSId);
    if (!p) return;

    const env = p.environmentsDetails.find(e => e.name === envName);
    if (!env) return;

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

    let refusalReason = '';

    if (response === 'Recusado') {
      const reason = prompt("Informe o motivo da recusa (Opcional):", "Valor incompatível / Sem agenda");
      if (reason) refusalReason = reason;
    }

    const newEnvDetails = p.environmentsDetails.map(e =>
      e.name === envName ? {
        ...e,
        mdoStatus: response,
        isMdoAuthorized: isAuth,
        mdoRefusalReason: refusalReason
      } : e
    );

    updateProject({
      ...p,
      environmentsDetails: newEnvDetails as any,
      expenses: newExpenses
    } as Project);

    if (response === 'Aceito') {
      alert("EMPREITA REGISTRADA!\n\nO custo foi lançado no DRE e o montador está oficialmente vinculado a este ambiente.");
    } else {
      alert("PROPOSTA RECUSADA!\n\nO status foi atualizado. Você pode enviar uma nova proposta com outro valor ou para outro montador.");
    }
  };

  const handleInternalTeamAssignment = (envName: string) => {
    if (!selectedOSId || !selectedOS) return;

    const p = projects.find(proj => proj.id === selectedOSId);
    if (!p) return;

    const env = p.environmentsDetails.find(e => e.name === envName);
    if (!env) return;

    const selectedInstallerId = mdoInstallers[env.name] || env.assignedInstallerId;
    if (!selectedInstallerId) {
      alert("Selecione um profissional antes de registrar internamente.");
      return;
    }

    const installerName = installers.find(i => i.id === selectedInstallerId)?.name || 'Montador Interno';
    // Use input value or 0
    const rawValue = mdoValues[env.name] !== undefined ? mdoValues[env.name] : (env.commissionValue?.toString() ?? env.authorizedMdoValue?.toString() ?? '0');
    const declaredValue = parseFloat(rawValue) || 0;

    if (declaredValue > 0) {
      const confirmCost = window.confirm(`ATENÇÃO: Você informou o valor de R$ ${declaredValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.\n\nDeseja lançar este custo na obra ${p.workName} para o(a) profissional ${installerName}?`);
      if (!confirmCost) return;
    }

    let newExpenses = p.expenses || [];
    if (declaredValue > 0) {
      const newExp: Expense = {
        id: `mdo-internal-${Date.now()}-${envName}`,
        description: `MDO Interno Parcial: ${envName} (${installerName})`,
        value: declaredValue,
        date: new Date().toISOString().split('T')[0],
        category: 'Montagem'
      };
      newExpenses = [...newExpenses, newExp];
    }

    const newEnvDetails = p.environmentsDetails.map(e =>
      e.name === envName ? {
        ...e,
        mdoStatus: 'Aceito' as const,
        isMdoAuthorized: true,
        assignedInstallerId: selectedInstallerId,
        commissionValue: declaredValue,
        authorizedMdoValue: declaredValue,
      } : e
    );

    updateProject({
      ...p,
      environmentsDetails: newEnvDetails as any,
      expenses: newExpenses
    } as Project);

    alert(`REGISTRO INTERNO CONCLUÍDO!\n\n${installerName} foi vinculado(a) ao ambiente ${envName}${declaredValue > 0 ? ` com custo apontado de R$ ${declaredValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ' sem custo adicional'}.`);
  };





  const handleApplyBulkInstaller = () => {
    if (!selectedOSId || !bulkInstallerId) {
      alert("Selecione um montador para aplicar a todos.");
      return;
    }
    const p = projects.find(proj => proj.id === selectedOSId);
    if (!p) return;

    const newEnvDetails = p.environmentsDetails.map(env => ({
      ...env,
      assignedInstallerId: bulkInstallerId
    }));

    updateProject({ ...p, environmentsDetails: newEnvDetails as any } as Project);

    // Also update local state to reflect immediately if needed, though updateProject should trigger re-render
    const newInstallers: Record<string, string> = {};
    newEnvDetails.forEach(env => { newInstallers[env.name] = bulkInstallerId; });
    setMdoInstallers(prev => ({ ...prev, ...newInstallers })); // Keep for UI responsivness if needed

    alert(`DEFINIDO E SALVO!\n\n${installers.find(i => i.id === bulkInstallerId)?.name} foi atribuído a ${p.environmentsDetails.length} ambientes.`);
  };

  const handleCalculateAICommission = () => {
    if (!selectedOSId) return;
    const p = projects.find(proj => proj.id === selectedOSId);
    if (!p) return;

    const confirmCalc = confirm("A IA irá analisar a complexidade (peças/ferragens) e sugerir uma distribuição de comissão baseada em 10% do valor da obra.\n\nIsso substituirá os valores atuais E SALVARÃ AUTOMATICAMENTE. Deseja continuar?");
    if (!confirmCalc) return;

    const projectValue = p.value || 0;
    const commissionBudget = projectValue * 0.10; // 10%

    let totalComplexity = 0;
    const envComplexity = p.environmentsDetails.map(env => {
      let points = 0;

      // 1. Prioridade: Apontamento de Peças (PCP)
      if (env.memorial?.partsCount && env.memorial.partsCount > 0) {
        points = env.memorial.partsCount;
      }
      // 2. Fallback: Memorial Descritivo (MDF + Ferragens)
      else if (env.memorial) {
        points += (env.memorial.mdfParts?.length || 0);
        points += (env.memorial.hardwareItems?.length || 0);
        points += (env.memorial.appliances?.length || 0) * 2;
      }

      // 3. Fallback Final: Valor Monetário (se não houver contagem)
      if (points < 5) {
        points = (env.value || 0) / 100;
      }
      if (points === 0) points = 1;

      totalComplexity += points;
      return { name: env.name, points };
    });

    const newEnvDetails = p.environmentsDetails.map(env => {
      const item = envComplexity.find(i => i.name === env.name);
      const points = item ? item.points : 0;
      const share = totalComplexity > 0 ? points / totalComplexity : 0;
      const amount = commissionBudget * share;

      return {
        ...env,
        commissionValue: Number(amount.toFixed(2)), // Save to DB as commissionValue
        authorizedMdoValue: Number(amount.toFixed(2)) // Also set authorized? Maybe not yet. default to commissionValue.
      };
    });

    updateProject({ ...p, environmentsDetails: newEnvDetails as any } as Project);

    // Update local state
    const newValues: Record<string, string> = {};
    newEnvDetails.forEach(env => {
      if (env.commissionValue) newValues[env.name] = env.commissionValue.toFixed(2);
    });
    setMdoValues(prev => ({ ...prev, ...newValues }));

    alert(`CÃLCULO CONCLUÍDO E SALVO!\n\n💰 Orçamento Total (10%): R$ ${commissionBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nOs valores foram calculados e salvos no projeto.`);
  };

  const filteredMaterials = materials.filter(m => m.name.toLowerCase().includes(searchMaterial.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER NAVEGAÇÃO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase italic leading-none">Suprimentos & MDO</h3>
        <div className="flex bg-slate-200/60 p-1.5 rounded-[24px] border border-border shadow-inner overflow-x-auto max-w-full">
          {[
            { id: 'cotacoes', label: 'Pedidos' },
            { id: 'concluidas', label: 'Concluídas' },
            { id: 'apontamento', label: 'Empreitas' },
            { id: 'diario', label: 'Diário MDO' },
            { id: 'fornecedores', label: 'Parceiros' },
            { id: 'produtos', label: 'Biblioteca' }
          ].filter(tab => {
            if (tab.id === 'diario') return userRole === 'owner';
            return true;
          }).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-muted-foreground hover:text-foreground'}`}>
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
              <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Gestão de Compras</h4>
              <button onClick={() => setIsQuotationModalOpen(true)} className="bg-amber-500 text-foreground px-8 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-900 hover:text-white transition-all">
                <Plus size={20} /> Nova Requisição Técnica
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {purchaseOrders.filter(q => q.status === 'Cotação').map(q => (
                <div key={q.id} className={`bg-card p-8 rounded-[48px] border transition-all flex flex-col md:flex-row justify-between items-center gap-8 group ${selectedOrders.includes(q.id) ? 'border-amber-500 bg-amber-50/30' : 'border-slate-100 shadow-sm'} group hover:border-amber-500`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-18 h-18 rounded-[24px] flex items-center justify-center shadow-lg transition-all ${q.status === 'Comprado' ? 'bg-emerald-500 text-white' : 'bg-amber-50 text-amber-500'}`}><Clock size={36} /></div>
                    <div>
                      <h5 className="text-2xl font-black text-foreground uppercase italic leading-none">{q.workName}</h5>
                      <p className="text-xs text-slate-400 font-bold uppercase mt-2 italic">Fornecedor: {suppliers.find(s => s.id === q.supplierId)?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEntryModalData({ ...q })} className={`px-8 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all ${q.status === 'Cotação' ? 'bg-slate-900 text-white shadow-xl hover:bg-emerald-600' : 'bg-muted text-slate-400'}`}>
                      <FileSearch size={20} /> {q.status === 'Cotação' ? 'Dar Entrada' : 'Ver Pedido'}
                    </button>
                    {q.status === 'Cotação' && (
                      <>
                        <button
                          onClick={() => setEditingQuotationData({ ...q })}
                          className="px-6 py-5 bg-amber-100 text-amber-700 rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-amber-200 transition-all border border-amber-200"
                        >
                          <Edit2 size={20} /> Editar
                        </button>
                        <button onClick={() => handleSendPurchaseOrder(q)} className="px-6 py-5 bg-emerald-500 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-95">
                          <MessageSquare size={20} /> WhatsApp
                        </button>
                        <button
                          onClick={() => {
                            setPrintingOrder(q);
                            setTimeout(() => {
                              window.print();
                              setPrintingOrder(null);
                            }, 300);
                          }}
                          className="px-6 py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-slate-800 shadow-lg transition-all active:scale-95"
                          title="Imprimir PDF"
                        >
                          <Printer size={20} /> PDF
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Tem certeza que deseja EXCLUIR este pedido? Essa ação não pode ser desfeita.')) {
                              deleteQuotation(q.id);
                            }
                          }}
                          className="px-5 py-5 bg-red-50 text-red-500 rounded-[24px] hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
                          title="Excluir Pedido"
                        >
                          <Trash2 size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {purchaseOrders.filter(q => q.status === 'Cotação').length === 0 && (
                <div className="py-24 text-center bg-muted/50 border-4 border-dashed rounded-[56px] border-slate-100 italic font-black text-slate-300">Nenhum pedido de compra ativo.</div>
              )}
            </div>

          </div>
        )}

        {/* ABA: COMPRAS CONCLUÍDAS */}
        {activeTab === 'concluidas' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Histórico por Lotes</h4>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {groupedHistory.map(lot => (
                <div key={lot.id} className="bg-card p-10 rounded-[48px] border border-slate-100 shadow-sm hover:border-emerald-500 transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                    <Layers size={120} />
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest leading-none">
                          {lot.id.includes('-') && lot.id.length === 7 ? `LOTE MENSAL: ${lot.id.split('-')[1]}/${lot.id.split('-')[0]}` : `Lote ${lot.id}`}
                        </div>
                        <div className="text-slate-400 font-bold text-xs uppercase italic flex items-center gap-2">
                          <Calendar size={14} /> {new Date(lot.date).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h5 className="text-2xl font-black text-foreground uppercase italic tracking-tighter flex items-center gap-2">
                          <Package size={24} className="text-foreground" /> {lot.suppliers.size} Fornecedores Envolvidos
                        </h5>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {Array.from(lot.suppliers).slice(0, 3).map((s: any) => (
                            <span key={s} className="px-3 py-1 bg-muted/50 text-muted-foreground rounded-lg text-[10px] font-black uppercase border border-slate-100">
                              {s}
                            </span>
                          ))}
                          {lot.suppliers.size > 3 && (
                            <span className="text-[10px] text-slate-400 font-bold uppercase italic py-1">+{lot.suppliers.size - 3} mais</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4 w-full md:w-auto text-right">
                      <div className="text-left md:text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL DO LOTE</div>
                        <div className="text-2xl font-black text-emerald-600 tracking-tighter">
                          R$ {lot.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">PEDIDOS</div>
                        <div className="text-xl font-black text-foreground leading-none">{lot.ordersCount}</div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-6 md:pt-0">
                      <button
                        onClick={() => window.open(`${window.location.origin}/?mode=purchase-settlement-report&id=${lot.id}`, '_blank')}
                        className="flex-1 md:flex-none px-10 py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 shadow-xl shadow-slate-900/10 transition-all hover:scale-105"
                      >
                        <FileSearch size={20} /> Ver Espelho
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {groupedHistory.length === 0 && (
                <div className="py-24 text-center bg-muted/50 border-4 border-dashed rounded-[56px] border-slate-100 italic font-black text-slate-300">Nenhuma compra concluída para agrupar.</div>
              )}
            </div>
          </div>
        )}

        {/* ABA: DIÃRIO MDO */}
        {activeTab === 'diario' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
            <div className="bg-slate-900 p-12 rounded-[56px] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5"><UserCheck size={140} /></div>
              <h4 className="text-3xl font-black uppercase italic tracking-tighter">Lançamento de Diárias</h4>
              <p className="text-slate-400 text-xs font-bold uppercase mt-2 italic tracking-widest">Injeção de custo operacional para ajudantes avulsos</p>
            </div>
            <form onSubmit={handleLaunchDiary} className="bg-card p-12 rounded-[56px] border-2 shadow-2xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Montador / Ajudante</label>
                  <select className="w-full bg-muted/50 p-5 rounded-[28px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={newDiaryEntry.personId} onChange={e => setNewDiaryEntry({ ...newDiaryEntry, personId: e.target.value })} required>
                    <option value="">Selecione o Profissional</option>
                    {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Obra de Destino</label>
                  <select className="w-full bg-muted/50 p-5 rounded-[28px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={newDiaryEntry.projectId} onChange={e => setNewDiaryEntry({ ...newDiaryEntry, projectId: e.target.value })} required>
                    <option value="">Selecione a Obra</option>
                    {projects.filter(p => p.currentStatus !== 'Finalizada').map(p => <option key={p.id} value={p.id}>{p.workName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Valor da Diária R$</label>
                  <input type="number" className="w-full bg-muted/50 p-5 rounded-[28px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" placeholder="0,00" value={newDiaryEntry.value} onChange={e => setNewDiaryEntry({ ...newDiaryEntry, value: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Data do Serviço</label>
                  <input type="date" className="w-full bg-muted/50 p-5 rounded-[28px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={newDiaryEntry.date} onChange={e => setNewDiaryEntry({ ...newDiaryEntry, date: e.target.value })} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 flex items-center gap-2">
                  <MessageSquare size={14} /> O que essa pessoa fez nesta obra hoje? (Observação)
                </label>
                <textarea
                  className="w-full bg-muted/50 p-6 rounded-[28px] font-bold border-2 border-transparent focus:border-amber-500 outline-none transition-all h-32 resize-none italic text-sm"
                  placeholder="Ex: Ajudou na descarga do MDF e iniciou a fixação da caixaria da cozinha."
                  value={newDiaryEntry.description}
                  onChange={e => setNewDiaryEntry({ ...newDiaryEntry, description: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white p-7 rounded-[32px] font-black uppercase italic tracking-widest hover:bg-amber-500 hover:text-foreground shadow-2xl transition-all active:scale-95">Efetivar Lançamento da Diária</button>
            </form>
          </div>
        )}

        {/* ABA: BIBLIOTECA (CRUD) */}
        {activeTab === 'produtos' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Biblioteca de Insumos</h4>
              <button onClick={() => handleOpenMaterialModal()} className="bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-amber-500 hover:text-foreground transition-all">
                <Plus size={20} /> Cadastrar Novo Item
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {materials.map(m => (
                <div key={m.id} className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-amber-500 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted/50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-amber-500 transition-all"><Package size={24} /></div>
                    <div><p className="font-black uppercase italic text-sm text-foreground leading-none">{m.name}</p><p className="text-[9px] font-black text-slate-400 mt-1 uppercase italic tracking-widest">{m.category} • {m.unit}</p></div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenMaterialModal(m)} className="p-2 text-slate-400 hover:text-indigo-500 transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteMaterial(m.id)} className="p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
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
              <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Rede de Parceiros</h4>
              <button onClick={() => handleOpenSupplierModal()} className="bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-amber-500 hover:text-foreground transition-all">
                <Plus size={20} /> Cadastrar Fornecedor
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map(s => (
                <div key={s.id} className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-amber-500 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-muted/50 rounded-3xl flex items-center justify-center text-slate-300 group-hover:bg-amber-500 transition-all"><Briefcase size={32} /></div>
                    <div><h5 className="text-lg font-black uppercase italic text-foreground leading-none">{s.name}</h5><p className="text-[10px] font-black text-slate-400 mt-2 uppercase italic tracking-widest">{s.type}</p></div>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenSupplierModal(s)} className="p-2.5 bg-muted/50 rounded-xl text-slate-400 hover:text-indigo-500 transition-all shadow-sm"><Edit2 size={20} /></button>
                    <button onClick={() => handleDeleteSupplier(s.id)} className="p-2.5 bg-muted/50 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm"><Trash2 size={20} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: EMPREITAS (APONTAMENTO) */}
        {activeTab === 'apontamento' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl flex flex-col xl:flex-row justify-between items-center gap-8">
              <div className="flex-1">
                <h4 className="text-3xl font-black uppercase italic tracking-tighter">Apontamento de Empreitas</h4>
                <p className="text-slate-400 text-xs font-bold uppercase mt-2 italic tracking-widest leading-relaxed">Gestão Técnica e Financeira de Montagem</p>

                {/* BULK ACTIONS TOOLBAR */}
                {selectedOS && (
                  <div className="mt-6 flex flex-wrap items-center gap-4 bg-slate-800/50 p-4 rounded-[24px] border border-slate-700/50">
                    <div className="flex items-center gap-2 bg-slate-700 rounded-xl p-2 pr-4">
                      <select
                        value={bulkInstallerId}
                        onChange={e => setBulkInstallerId(e.target.value)}
                        className="bg-transparent text-white font-bold text-xs uppercase outline-none w-40"
                      >
                        <option value="">Definir Montador...</option>
                        {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <button
                        onClick={handleApplyBulkInstaller}
                        className="bg-emerald-500 hover:bg-emerald-400 text-foreground text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all"
                      >
                        Aplicar a Todos
                      </button>
                    </div>

                    <div className="w-px h-8 bg-slate-700 mx-2"></div>

                    <button
                      onClick={handleCalculateAICommission}
                      className="bg-amber-500 hover:bg-amber-400 text-foreground px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                      <Sparkles size={14} /> Calcular Valores (IA)
                    </button>

                    <div className="text-[9px] text-slate-400 font-bold uppercase italic ml-2">
                      *Base: 10% do Valor da Obra
                    </div>
                  </div>
                )}
              </div>

              <select className="bg-card/10 border-2 border-white/20 text-white px-10 py-5 rounded-[32px] font-black uppercase italic outline-none shadow-xl transition-all focus:bg-card/20 min-w-[300px]" value={selectedOSId} onChange={e => setSelectedOSId(e.target.value)}>
                <option value="" className="text-foreground">Selecione uma Obra Ativa</option>
                {projects.filter(p => p.currentStatus !== 'Finalizada').map(p => <option key={p.id} value={p.id} className="text-foreground">{p.workName}</option>)}
              </select>
            </div>
            {selectedOS ? (
              <div className="grid grid-cols-1 gap-6">
                {(selectedOS.environmentsDetails || []).map(env => (
                  <div key={env.name} className={`p-10 rounded-[56px] border shadow-sm flex flex-col xl:flex-row items-center justify-between gap-10 transition-all group ${env.isMdoAuthorized ? 'bg-emerald-50 border-emerald-200' : 'bg-card border-slate-100 hover:border-amber-500'}`}>
                    <div className="flex items-center gap-8 flex-1">
                      <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center shadow-2xl group-hover:scale-105 transition-all ${env.isMdoAuthorized ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-amber-500'}`}>
                        {env.isMdoAuthorized ? <CheckCircle2 size={40} /> : <Layers size={40} />}
                      </div>
                      <div>
                        <h5 className={`text-3xl font-black uppercase italic tracking-tighter ${env.isMdoAuthorized ? 'text-emerald-900' : 'text-foreground'}`}>{env.name}</h5>
                        <p className={`text-[11px] font-black uppercase italic tracking-[0.2em] mt-2 ${env.isMdoAuthorized ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {userRole === 'owner' ? `Venda: R$ ${env.value?.toLocaleString()}` : ''}
                          {env.isMdoAuthorized && (
                            <span className="ml-3 font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-widest">
                              AUTORIZADO: {userRole === 'owner' ? `R$ ${env.authorizedMdoValue?.toLocaleString()}` : 'RESTRITO'} para {installers.find(i => i.id === env.assignedInstallerId)?.name}
                            </span>
                          )}
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
                            <button onClick={() => handleSendProposal(env.name)} className="bg-muted hover:bg-slate-200 text-slate-400 px-4 py-3 rounded-[20px] transition-all" title="Reenviar WhatsApp">
                              <Share2 size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row items-end gap-6 w-full xl:w-auto relative">
                          {env.mdoStatus === 'Recusado' && (
                            <div className="absolute -top-6 right-0 text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-lg border border-red-100 flex items-center gap-1">
                              <span>Proposta Anterior Recusada</span>
                              {env.mdoRefusalReason && <span className="text-red-400 italic normal-case">- "{env.mdoRefusalReason}"</span>}
                            </div>
                          )}
                          <div className="space-y-2 flex-1 md:w-48">
                            <label className="text-[9px] font-black text-slate-400 uppercase italic ml-2">Montador</label>
                            <select
                              className={`w-full bg-muted/50 p-4 rounded-[20px] font-black border-2 focus:border-amber-500 outline-none italic text-xs shadow-inner transition-colors ${env.mdoStatus === 'Recusado' ? 'border-red-100' : 'border-transparent'}`}
                              value={mdoInstallers[env.name] ?? env.assignedInstallerId ?? ''}
                              onChange={e => {
                                const newId = e.target.value;
                                setMdoInstallers(prev => ({ ...prev, [env.name]: newId }));
                                // Auto-Save
                                const p = projects.find(proj => proj.id === selectedOSId);
                                if (p) {
                                  const newDetails = p.environmentsDetails.map(d => d.name === env.name ? { ...d, assignedInstallerId: newId } : d);
                                  updateProject({ ...p, environmentsDetails: newDetails as any } as Project);
                                }
                              }}
                            >
                              <option value="">Selecionar Profissional</option>
                              {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                          </div>
                          {userRole === 'owner' && (
                            <div className="space-y-2 flex-1 md:w-40">
                              <label className="text-[9px] font-black text-slate-400 uppercase italic ml-2">MDO R$</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  className={`w-full bg-muted/50 p-4 rounded-[20px] font-black border-2 focus:border-amber-500 outline-none shadow-inner text-lg text-right transition-colors ${env.mdoStatus === 'Recusado' ? 'border-red-100 text-red-900' :
                                    (parseFloat(mdoValues[env.name] || '0') > (selectedOS.value || 0) * 0.10 ? 'border-amber-500 text-amber-600' : 'border-transparent')
                                    }`}
                                  placeholder="0,00"
                                  value={mdoValues[env.name] ?? env.commissionValue?.toString() ?? env.authorizedMdoValue?.toString() ?? ''}
                                  onChange={e => {
                                    const newVal = e.target.value;
                                    setMdoValues({ ...mdoValues, [env.name]: newVal });
                                  }}
                                  onBlur={e => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) {
                                      const p = projects.find(proj => proj.id === selectedOSId);
                                      if (p) {
                                        const newDetails = p.environmentsDetails.map(d => d.name === env.name ? { ...d, commissionValue: val } : d);
                                        updateProject({ ...p, environmentsDetails: newDetails as any } as Project);
                                      }
                                    }
                                  }}
                                />
                                {parseFloat(mdoValues[env.name] || String(env.commissionValue || 0)) > (selectedOS.value || 0) * 0.10 && (
                                  <div className="absolute top-0 right-0 -mt-2 -mr-2 text-amber-500 bg-amber-50 rounded-full p-1 border border-amber-200" title="Valor excede 10% da obra">
                                    <AlertCircle size={12} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleSendProposal(env.name)}
                              disabled={userRole !== 'owner' && !mdoInstallers[env.name]}
                              className="h-[52px] bg-slate-900 border-2 border-slate-900 text-white px-8 rounded-[20px] font-black uppercase text-[10px] tracking-[0.2em] shadow-lg hover:bg-emerald-600 hover:border-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                              <MessageSquare size={16} /> Enviar Proposta
                            </button>
                            {userRole === 'owner' && (
                              <button
                                onClick={() => handleInternalTeamAssignment(env.name)}
                                disabled={!mdoInstallers[env.name] && !env.assignedInstallerId}
                                className="h-[40px] bg-card border-2 border-border text-muted-foreground hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 px-6 rounded-[16px] font-black uppercase text-[9px] tracking-[0.1em] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                title="Registra a instalação e contabiliza o valor digitado sem enviar proporsta"
                              >
                                <HardHat size={14} /> Aprovar Internamente
                              </button>
                            )}
                          </div>
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
              <div className="py-40 text-center border-4 border-dashed rounded-[64px] border-slate-100 bg-muted/50/30 flex flex-col items-center justify-center">
                <AlertCircle size={80} className="text-slate-200 mb-6" />
                <p className="text-slate-400 font-black uppercase italic text-sm tracking-widest">Aguardando seleção de obra para liberação de MDO.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: NOVO/EDITAR MATERIAL (BIBLIOTECA) */}
      {
        isMaterialModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsMaterialModalOpen(false)} />
            <div className="relative bg-card w-full max-w-lg rounded-[48px] shadow-2xl p-12 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-10">
                <h4 className="text-2xl font-black uppercase italic tracking-tighter">{editingMaterial ? 'Editar Item Biblioteca' : 'Cadastrar Insumo'}</h4>
                <button onClick={() => setIsMaterialModalOpen(false)} className="p-3 hover:bg-muted rounded-full transition-all"><X size={32} /></button>
              </div>
              <form onSubmit={saveMaterial} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Nome do Produto</label>
                  <input type="text" className="w-full bg-muted/50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={materialForm.name} onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })} required placeholder="Ex: MDF Louro Freijó 18mm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Marca / Modelo</label>
                  <input type="text" className="w-full bg-muted/50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={materialForm.brand || ''} onChange={e => setMaterialForm({ ...materialForm, brand: e.target.value })} placeholder="Ex: Guararapes, Blum..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Categoria</label>
                    <div className="flex gap-2">
                      <select className="w-full bg-muted/50 p-5 rounded-[24px] font-black outline-none border-2 border-transparent focus:border-amber-500 transition-all italic" value={materialForm.category} onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })}>
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
                      }} className="bg-slate-900 text-white p-5 rounded-[24px] hover:bg-amber-500 hover:text-foreground transition-colors">
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Unidade</label>
                    <input type="text" className="w-full bg-muted/50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all italic" value={materialForm.unit} onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })} placeholder="un, kg, m, chapa..." />
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white p-6 rounded-[28px] font-black uppercase italic tracking-widest hover:bg-amber-500 hover:text-foreground shadow-2xl transition-all active:scale-95">Salvar na Biblioteca</button>
              </form>
            </div>
          </div>
        )
      }

      {/* MODAL: NOVO/EDITAR PARCEIRO (FORNECEDORES) */}
      {
        isSupplierModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsSupplierModalOpen(false)} />
            <div className="relative bg-card w-full max-w-lg rounded-[48px] shadow-2xl p-12 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-10">
                <h4 className="text-2xl font-black uppercase italic tracking-tighter">{editingSupplier ? 'Editar Parceiro' : 'Novo Parceiro'}</h4>
                <button onClick={() => setIsSupplierModalOpen(false)} className="p-3 hover:bg-muted rounded-full transition-all"><X size={32} /></button>
              </div>
              <form onSubmit={saveSupplierHandler} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Razão Social / Nome</label>
                  <input type="text" className="w-full bg-muted/50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} required placeholder="Ex: Madereira Silva" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Tipo de Fornecimento</label>
                  <select className="w-full bg-muted/50 p-5 rounded-[24px] font-black outline-none border-2 border-transparent focus:border-amber-500 transition-all italic" value={supplierForm.type} onChange={e => setSupplierForm({ ...supplierForm, type: e.target.value as SupplierType })}>
                    <option value="Material">Material de Fábrica</option><option value="Serviço (Corte/Fitação)">Serviço (Corte/Fitação)</option><option value="Montagem (Terceirizado)">Montagem (Terceirizado)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Contato / E-mail</label>
                  <input type="text" className="w-full bg-muted/50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none transition-all" value={supplierForm.contact} onChange={e => setSupplierForm({ ...supplierForm, contact: e.target.value })} placeholder="vendas@fornecedor.com" />
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white p-6 rounded-[28px] font-black uppercase italic tracking-widest hover:bg-amber-500 hover:text-foreground shadow-2xl transition-all active:scale-95">Confirmar Cadastro</button>
              </form>
            </div>
          </div>
        )
      }

      {/* MODAL: EDITAR REQUISIÇÃO (FIXED) */}
      {
        editingQuotationData && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setEditingQuotationData(null)} />
            <div className="relative bg-card p-8 rounded-[40px] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-black uppercase italic text-foreground">Editar Requisição</h3>
                  <p className="text-muted-foreground text-sm font-bold uppercase">{editingQuotationData.workName}</p>
                </div>
                <button onClick={() => setEditingQuotationData(null)} className="p-3 hover:bg-muted rounded-full transition-all"><X size={24} /></button>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-amber-700 text-xs font-bold flex items-center gap-2 mb-4 shrink-0">
                <Edit2 size={16} />
                Edite os nomes ou substitua por itens da biblioteca.
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {editingQuotationData.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 items-start md:items-center p-4 bg-muted/50 rounded-2xl border border-border">
                    <div className="flex-1 w-full">
                      <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Item / Descrição</label>
                      <input
                        type="text"
                        className="w-full bg-card px-3 py-2 rounded-lg border border-border font-bold text-foreground outline-none focus:border-amber-500 transition-colors"
                        value={item.name}
                        onChange={e => {
                          const newItems = [...editingQuotationData.items];
                          newItems[idx].name = e.target.value;
                          setEditingQuotationData({ ...editingQuotationData, items: newItems });
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Qtd</label>
                      <input
                        type="number"
                        className="w-full bg-card px-3 py-2 rounded-lg border border-border font-bold text-center outline-none focus:border-amber-500 transition-colors"
                        value={item.quantity}
                        onChange={e => {
                          const newItems = [...editingQuotationData.items];
                          newItems[idx].quantity = parseFloat(e.target.value);
                          setEditingQuotationData({ ...editingQuotationData, items: newItems });
                        }}
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Unid</label>
                      <input
                        type="text"
                        className="w-full bg-card px-3 py-2 rounded-lg border border-border text-center text-xs outline-none focus:border-amber-500 transition-colors"
                        value={item.unit}
                        onChange={e => {
                          const newItems = [...editingQuotationData.items];
                          newItems[idx].unit = e.target.value;
                          setEditingQuotationData({ ...editingQuotationData, items: newItems });
                        }}
                      />
                    </div>

                    {/* BOTÃ•ES DE AÇÃO */}
                    <div className="flex items-center gap-1 mt-4 md:mt-0">
                      <button
                        onClick={() => setSubstitutingItemIndex(idx)}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Substituir por Item da Biblioteca"
                      >
                        <RefreshCw size={18} />
                      </button>
                      <button
                        onClick={() => {
                          const newItems = [...editingQuotationData.items];
                          newItems.splice(idx, 1);
                          setEditingQuotationData({ ...editingQuotationData, items: newItems });
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover Item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 shrink-0">
                <button
                  onClick={() => {
                    const newItem: QuotationItem = { productId: `manual-${Date.now()}`, name: 'Novo Item Manual', quantity: 1, unit: 'un', materialValue: 0 };
                    setEditingQuotationData({ ...editingQuotationData, items: [...editingQuotationData.items, newItem] });
                  }}
                  className="text-xs font-bold uppercase bg-muted px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <Plus size={14} /> Adicionar Item Manual
                </button>
              </div>

              <div className="flex gap-4 pt-6 mt-4 border-t border-slate-100 shrink-0">
                <button onClick={() => setEditingQuotationData(null)} className="flex-1 bg-card border-2 border-slate-100 text-muted-foreground py-4 rounded-[20px] font-bold uppercase hover:bg-muted/50 transition-all">Cancelar</button>
                <button
                  onClick={() => {
                    updateQuotation(editingQuotationData);
                    setEditingQuotationData(null);
                    alert('Requisição atualizada com sucesso!');
                  }}
                  className="flex-1 bg-amber-500 text-foreground py-4 rounded-[20px] font-black uppercase hover:bg-amber-600 hover:text-white transition-all shadow-lg"
                >
                  <Save size={18} className="inline mr-2" /> Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL: SELECIONAR SUBSTITUTO (NOVO) */}
      {
        substitutingItemIndex !== null && editingQuotationData && (
          <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSubstitutingItemIndex(null)} />
            <div className="relative bg-card w-full max-w-md h-[80vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div>
                  <h5 className="font-black uppercase italic">Substituir Item</h5>
                  <p className="text-[10px] text-slate-400 uppercase">Selecione o item correto na biblioteca</p>
                </div>
                <button onClick={() => setSubstitutingItemIndex(null)} className="p-2 hover:bg-slate-800 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-4 bg-muted/50 border-b">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    autoFocus
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-card rounded-xl border border-border font-bold text-sm outline-none focus:border-blue-500"
                    placeholder="Buscar na biblioteca..."
                    value={searchMaterial}
                    onChange={e => setSearchMaterial(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {filteredMaterials.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      // SUBSTITUIR
                      const newItems = [...editingQuotationData.items];
                      newItems[substitutingItemIndex].name = m.name;
                      newItems[substitutingItemIndex].unit = m.unit;
                      newItems[substitutingItemIndex].productId = m.id; // Linkar ID se existir
                      setEditingQuotationData({ ...editingQuotationData, items: newItems });
                      setSubstitutingItemIndex(null);
                    }}
                    className="w-full text-left p-3 bg-card border border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground group-hover:text-blue-700 text-sm">{m.name}</span>
                      <span className="text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground font-bold uppercase">{m.unit}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{m.brand}</span>
                  </button>
                ))}
                {filteredMaterials.length === 0 && (
                  <div className="text-center py-10 text-slate-300 font-bold italic">Nenhum item encontrado.</div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL: NOVA REQUISIÇÃO (BUSCA + ADIÇÃO) */}
      {
        isQuotationModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setIsQuotationModalOpen(false)} />
            <div className="relative bg-card w-full max-w-6xl h-full md:h-[90vh] rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-10 border-b bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h4 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Montar Requisição de Insumos</h4>
                  <p className="text-amber-500 text-[10px] font-black uppercase italic mt-3 tracking-widest">Clique nos itens da biblioteca Ã  esquerda para adicionar ao pedido</p>
                </div>
                <button onClick={() => setIsQuotationModalOpen(false)} className="p-4 hover:bg-slate-800 rounded-full transition-all"><X size={36} /></button>
              </div>
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* LADO ESQUERDO: BIBLIOTECA */}
                <div className="w-full md:w-2/5 border-r flex flex-col bg-muted/50/50">
                  <div className="p-8 border-b bg-card">
                    <div className="relative">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                      <input type="text" className="w-full pl-14 pr-6 py-5 bg-muted/50 rounded-[28px] font-black text-sm outline-none focus:bg-card border-2 border-transparent focus:border-amber-500 transition-all shadow-inner" placeholder="Pesquisar Insumo..." value={searchMaterial} onChange={e => setSearchMaterial(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar">
                    {filteredMaterials.map(m => (
                      <button key={m.id} onClick={() => addItemToQuotation(m)} className="w-full flex items-center justify-between p-5 bg-card rounded-[28px] border-2 border-slate-50 hover:border-amber-500 group transition-all shadow-sm">
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-12 h-12 bg-muted/50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-amber-500 group-hover:bg-amber-50 transition-all"><Package size={24} /></div>
                          <div><p className="font-black uppercase italic text-xs text-foreground leading-none">{m.name}</p><p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-widest">{m.category}</p></div>
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
                <form onSubmit={handleCreateQuotation} className="w-full md:w-3/5 flex flex-col bg-card">
                  <div className="p-10 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Obra de Destino</label>
                        <select className="w-full bg-muted/50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none italic shadow-inner text-sm" value={newQuotation.projectId} onChange={e => setNewQuotation({ ...newQuotation, projectId: e.target.value })} required>
                          <option value="">Selecione a OS</option>
                          {projects.filter(p => p.currentStatus !== 'Finalizada').map(p => <option key={p.id} value={p.id}>{p.workName}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Fornecedor</label>
                        <select className="w-full bg-muted/50 p-5 rounded-[24px] font-black border-2 border-transparent focus:border-amber-500 outline-none italic shadow-inner text-sm" value={newQuotation.supplierId} onChange={e => setNewQuotation({ ...newQuotation, supplierId: e.target.value })} required>
                          <option value="">Selecione o Fornecedor</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {newQuotation.projectId && (
                      <div className="bg-indigo-50 p-6 rounded-[32px] border-2 border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4">
                          <div className="bg-card p-3 rounded-full text-indigo-600 shadow-sm"><Upload size={24} /></div>
                          <div>
                            <h6 className="text-indigo-900 font-black uppercase italic text-xs">Importação Inteligente (Smart CUT / PDF)</h6>
                            <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-wide">Carregue o plano de corte para preenchimento automático</p>
                          </div>
                        </div>
                        <label className="bg-indigo-600 text-white px-6 py-3 rounded-[20px] font-black uppercase text-[9px] tracking-[0.2em] shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-all cursor-pointer active:scale-95">
                          Selecionar Arquivo
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  try {
                                    const base64 = (reader.result as string).split(',')[1];
                                    const mimeType = file.type;
                                    alert('Processando arquivo com IA... Isso pode levar alguns segundos.');

                                    const result = await analyzeCutList(base64, mimeType);

                                    if (result) {
                                      const newItems: QuotationItem[] = [];

                                      if (result.mdf) {
                                        result.mdf.forEach((m: any) => {
                                          newItems.push({
                                            productId: `temp-mdf-${Date.now()}-${Math.random()}`,
                                            name: `MDF ${m.name} ${m.color || ''} ${m.dimensions || ''}`.trim(),
                                            quantity: Number(m.quantity) || 1,
                                            unit: 'Chapa'
                                          });
                                        });
                                      }

                                      if (result.tapes) {
                                        result.tapes.forEach((t: any) => {
                                          newItems.push({
                                            productId: `temp-tape-${Date.now()}-${Math.random()}`,
                                            name: `Fita ${t.name}`,
                                            quantity: Number(t.quantity) || 1,
                                            unit: t.unit || 'm'
                                          });
                                        });
                                      }

                                      if (result.hardware) {
                                        result.hardware.forEach((h: any) => {
                                          newItems.push({
                                            productId: `temp-hw-${Date.now()}-${Math.random()}`,
                                            name: h.name,
                                            quantity: Number(h.quantity) || 1,
                                            unit: h.unit || 'un'
                                          });
                                        });
                                      }

                                      setNewQuotation(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
                                      alert(`Importação Realizada! ${newItems.length} itens adicionados.`);
                                    }
                                  } catch (error) {
                                    console.error(error);
                                    alert('Erro ao processar arquivo. Verifique se é uma imagem ou PDF válido.');
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}

                    <div className="space-y-4">
                      <h6 className="text-[10px] font-black uppercase text-slate-400 italic tracking-[0.2em] border-b-2 border-slate-50 pb-3 flex items-center gap-3"><ShoppingCart size={18} /> Lista de Materiais ({newQuotation.items.length})</h6>
                      {newQuotation.items.map((item, idx) => (
                        <div key={idx} className="bg-muted/50/50 p-6 rounded-[32px] flex items-center justify-between border-2 border-slate-50 animate-in slide-in-from-right-4 transition-all hover:border-amber-100">
                          <div className="flex-1"><p className="font-black uppercase italic text-sm text-foreground leading-none">{item.name}</p><p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{item.unit}</p></div>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center bg-card rounded-2xl border-2 overflow-hidden shadow-sm">
                              <button type="button" onClick={() => { const ni = [...newQuotation.items]; if (ni[idx].quantity > 1) ni[idx].quantity -= 1; setNewQuotation({ ...newQuotation, items: ni }); }} className="px-5 py-3 hover:bg-muted font-black text-slate-400 transition-colors">-</button>
                              <input type="number" className="w-16 text-center font-black text-sm border-none outline-none bg-transparent" value={item.quantity} onChange={e => { const ni = [...newQuotation.items]; ni[idx].quantity = Number(e.target.value); setNewQuotation({ ...newQuotation, items: ni }); }} />
                              <button type="button" onClick={() => { const ni = [...newQuotation.items]; ni[idx].quantity += 1; setNewQuotation({ ...newQuotation, items: ni }); }} className="px-5 py-3 hover:bg-muted font-black text-amber-500 transition-colors">+</button>
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
                  <div className="p-10 border-t bg-muted/50/30">
                    <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase italic tracking-[0.3em] hover:bg-amber-500 hover:text-foreground shadow-2xl transition-all active:scale-[0.98]">Confirmar e Gerar Requisição</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL: LANÇAMENTO DE NOTA FISCAL (BUG FIX: AGORA OPERACIONAL) */}
      {
        entryModalData && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setEntryModalData(null)} />
            <div className="relative bg-card w-full max-w-4xl h-[85vh] rounded-[64px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-12 border-b bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <span className="text-amber-500 text-[10px] font-black uppercase italic tracking-[0.2em]">Liquidação de Pedido de Compra</span>
                  <h4 className="text-3xl font-black uppercase italic mt-3 tracking-tighter leading-none">{entryModalData.workName}</h4>
                </div>
                <div className="flex gap-2">
                  <label className={`cursor-pointer bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-full font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all shadow-lg ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isAnalyzing ? <Sparkles className="animate-spin" size={16} /> : <Camera size={16} />}
                    {isAnalyzing ? 'Analisando...' : 'Ler Nota com IA'}
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleAnalyzeInvoice} disabled={isAnalyzing} />
                  </label>
                  <button onClick={() => setEntryModalData(null)} className="p-4 hover:bg-slate-800 rounded-full text-white transition-all"><X size={40} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-12 space-y-8 bg-muted/50 custom-scrollbar">
                {entryModalData.items.map((item, idx) => (
                  <div key={idx} className="bg-card p-8 rounded-[48px] border-2 border-slate-50 flex flex-col md:flex-row justify-between items-center shadow-sm gap-8">
                    <div className="flex-1 text-center md:text-left">
                      <h6 className="text-xl font-black text-foreground uppercase italic leading-none">{item.name}</h6>
                      <p className="text-[10px] font-black text-slate-400 mt-3 uppercase italic tracking-widest">Quantidade Solicitada: {item.quantity} {item.unit}</p>
                    </div>
                    <div className="w-full md:w-1/3 space-y-2">
                      <label className="text-[10px] font-black text-amber-500 uppercase italic ml-3 tracking-widest">Valor Unitário NF R$</label>
                      <input
                        type="number"
                        className="w-full bg-muted/50 border-2 border-transparent focus:border-amber-500 px-8 py-5 rounded-[28px] text-2xl font-black outline-none transition-all text-right shadow-inner"
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
        )
      }
      {/* PRINTABLE COMPONENT (Hidden by default, visible only during print if printingOrder is set) */}
      {
        printingOrder && (
          <div id="printable-purchase-order" className="hidden print:block fixed inset-0 z-[9999] bg-card">
            <div className="print-header">
              <div>
                <div className="print-logo-box">
                  <ShoppingCart size={40} />
                </div>
                <h1 className="text-3xl font-black">{company.name || 'Hypado System'}</h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Gestão de Marcenaria Premium</p>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-black text-foreground italic uppercase">Pedido de Compra</h2>
                <p className="text-sm font-bold text-muted-foreground mt-2">ID: {printingOrder.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mt-8">
              <div className="print-section">
                <h3 className="print-section-title">Dados do Fornecedor</h3>
                <div className="print-data-row">
                  <span className="print-data-label">Empresa:</span>
                  <span>{suppliers.find(s => s.id === printingOrder.supplierId)?.name || 'N/A'}</span>
                </div>
                <div className="print-data-row">
                  <span className="print-data-label">Contato:</span>
                  <span>{suppliers.find(s => s.id === printingOrder.supplierId)?.contact || 'N/A'}</span>
                </div>
              </div>

              <div className="print-section">
                <h3 className="print-section-title">Dados da Obra</h3>
                <div className="print-data-row">
                  <span className="print-data-label">Projeto:</span>
                  <span>{printingOrder.workName}</span>
                </div>
                <div className="print-data-row">
                  <span className="print-data-label">Data do Pedido:</span>
                  <span>{new Date(printingOrder.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="print-section-title italic">Lista de Itens Solicitados</h3>
              <table className="print-table">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Descrição do Item / Material</th>
                    <th className="text-right">Qtd.</th>
                    <th className="text-center">Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {printingOrder.items.map((item, index) => (
                    <tr key={index}>
                      <td className="text-slate-400 font-bold">{index + 1}</td>
                      <td className="uppercase">{item.name}</td>
                      <td className="text-right text-lg font-black">{item.quantity}</td>
                      <td className="text-center text-[10px] uppercase text-muted-foreground">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-12 p-8 bg-muted/50 rounded-3xl border-2 border-dashed border-border no-print-background">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Instruções para o Fornecedor:</p>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed italic">
                Este é um documento de requisição técnica oficial da {company.name}. Favor validar a disponibilidade e preços dos itens acima.
                A entrega deve ser agendada conforme combinado previamente.
              </p>
            </div>

            <div className="print-footer">
              Documento gerado eletronicamente via Hypado System em {new Date().toLocaleString()}
            </div>
          </div>
        )
      }

      {/* MODAL DE SUCESSO NA LIQUIDAÇÃO */}
      {
        settlementSuccessData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card max-w-lg w-full rounded-[48px] overflow-hidden shadow-2xl border border-slate-100 flex flex-col p-10 space-y-8 text-center animate-in zoom-in-95 duration-300">
              <div className="mx-auto w-24 h-24 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner">
                <CheckCircle2 size={48} />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black text-foreground uppercase italic leading-none tracking-tighter">
                  Liquidação Concluída!
                </h2>
                <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest italic">
                  O lote foi processado e os custos injetados no DRE
                </p>
              </div>

              <div className="bg-muted/50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center gap-2 border-dashed">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ID DO LOTE</span>
                <span className="text-xl font-mono font-black text-foreground">{settlementSuccessData.id}</span>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.open(settlementSuccessData.url, '_blank')}
                  className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase italic tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/10"
                >
                  <Printer size={18} /> Abrir Relatório do Lote
                </button>

                <button
                  onClick={() => setSettlementSuccessData(null)}
                  className="w-full bg-card text-slate-400 py-6 rounded-[24px] font-black uppercase tracking-widest text-[10px] border border-slate-100 hover:bg-muted/50 transition-all font-mono"
                >
                  [ FECHAR JANELA ]
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default ProcurementView;
