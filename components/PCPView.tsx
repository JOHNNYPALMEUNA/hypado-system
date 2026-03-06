import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, ProductionStatus, Quotation, Installer, OutsourcedService, Expense, Supplier, SelectedModule, MdfPart } from '../types';
import {
  ArrowRight, Clock, Box, PenTool, CheckCircle2, Truck,
  X, ChevronRight, Lock, Unlock,
  Factory as FactoryIcon, GlassWater, Scissors, DollarSign, Building2, AlertTriangle, Save, Hammer as Screwdriver,
  User, Layers, FileText, Upload, Sparkles, Check, ExternalLink, Search, ArrowLeft
} from 'lucide-react';


import { useData } from '../contexts/DataContext';
import { getStatusBadgeClass, formatCurrency } from '../utils';

interface Props {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  purchaseOrders: Quotation[];
  installers: Installer[];
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
  'Cancelada': { label: 'Cancelada', icon: X, color: 'bg-red-500', next: null },
};

const PCPView: React.FC<Props> = ({ projects, setProjects, installers, goToProcurementMDO }) => {
  const { updateProject, suppliers, clients, userRole } = useData();
  const [showCentralModal, setShowCentralModal] = useState<string | null>(null);
  const [showOutsourcedModal, setShowOutsourcedModal] = useState<string | null>(null);
  const [showLogisticsModal, setShowLogisticsModal] = useState<string | null>(null);
  const [showPreAssemblyModal, setShowPreAssemblyModal] = useState<string | null>(null);
  const [showFreightModal, setShowFreightModal] = useState<string | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState<string>('');
  const [tempFreightDate, setTempFreightDate] = useState<string>('');
  const [centralServiceValue, setCentralServiceValue] = useState<string>('');
  const [productionPartsCount, setProductionPartsCount] = useState<Record<string, number>>({});
  const [showArchitectModal, setShowArchitectModal] = useState<string | null>(null);
  const [selectedArchitectId, setSelectedArchitectId] = useState<string>('');
  const [showAssemblyModal, setShowAssemblyModal] = useState<string | null>(null);
  const [assemblySearch, setAssemblySearch] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const centralSuppliers = useMemo(() => suppliers.filter(s => s.type === 'Serviço (Corte/Fitação)'), [suppliers]);

  useEffect(() => {
    if (showDeliveryModal) {
      const p = projects.find(proj => proj.id === showDeliveryModal);
      setTempDate(p?.deliveryDate?.split('T')[0] || '');
    }
  }, [showDeliveryModal, projects]); // Added projects to dependency array

  useEffect(() => {
    if (showFreightModal) {
      const p = projects.find(proj => proj.id === showFreightModal);
      setTempFreightDate(p?.freightDate?.split('T')[0] || '');
    }
  }, [showFreightModal, projects]); // Added projects to dependency array

  const advance = (projectId: string, nextStatus: ProductionStatus, extraData: Partial<Project> = {}) => {
    const p = projects.find(proj => proj.id === projectId);
    if (p) {
      updateProject({
        ...p,
        ...extraData as any,
        currentStatus: nextStatus,
        history: [...(p.history || []), { status: nextStatus, timestamp: new Date().toISOString() }]
      } as Project);
    }
    setShowCentralModal(null);
    setShowOutsourcedModal(null);
    setShowLogisticsModal(null);
    setShowArchitectModal(null);
  };

  const updateStatus = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const currentStatus = project.currentStatus;

    if (currentStatus === 'Projeto') {
      setShowArchitectModal(projectId);
    }
    else if (currentStatus === 'Corte') {
      const p = projects.find(proj => proj.id === projectId);
      const initialParts: Record<string, number> = {};
      if (p) {
        p.environmentsDetails.forEach(env => {
          initialParts[env.name] = env.memorial?.partsCount || 0;
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

      if (incompleteFinancials.length > 0 && userRole === 'owner') {
        alert(`TRAVA FINANCEIRA: Existem ${incompleteFinancials.length} serviços terceirizados aguardando definição de fornecedor e valor. O custo deve ser lançado para garantir a margem da obra.`);
        setShowOutsourcedModal(projectId);
        return;
      }

      if (pendingServices.length > 0) {
        alert(`PENDÃŠNCIA DE TERCEIRO: ${pendingServices.length} serviços ainda não retornaram para a fábrica com status "Pronto".`);
        setShowOutsourcedModal(projectId);
        return;
      }

      advance(projectId, 'Entrega');
    }
    else if (currentStatus === 'Entrega') {
      // Allow advancing even if materials are not formally delivered (User might use leftover materials from workshop)
      advance(projectId, 'Instalação');
      setTimeout(() => goToProcurementMDO(projectId), 300);
    }
    else if (currentStatus === 'Instalação') {
      const allAtLeastVistoria = project.environmentsDetails.every(env =>
        env.currentStatus === 'Vistoria' || env.currentStatus === 'Finalizada'
      );

      if (!allAtLeastVistoria) {
        const pending = project.environmentsDetails.filter(env =>
          !env.currentStatus || env.currentStatus === 'Instalação'
        );
        alert(`SOLICITAÇÃO DE VISTORIA:\nExistem ${pending.length} ambientes em montagem:\n\n${pending.map(e => `• ${e.name}`).join('\n')}\n\nFinalize a montagem de todos os ambientes para avançar para Vistoria.`);
        return;
      }

      if (confirm('Deseja avançar esta obra para a fase de VISTORIA TÉCNICA?')) {
        advance(projectId, 'Vistoria');
      }
    }
    else if (currentStatus === 'Vistoria') {
      alert('â›” AÇÃO BLOQUEADA\n\nA obra está em fase de Vistoria de Qualidade.\nPara finalizar individualmente cada ambiente, use os controles de ambiente abaixo.');
    }
  };

  const goBackStatus = (projectId: string) => {
    const p = projects.find(proj => proj.id === projectId);
    if (!p) return;

    let prevStatus: ProductionStatus | null = null;
    for (const [key, value] of Object.entries(STATUS_CONFIG)) {
      if (value.next === p.currentStatus) {
        prevStatus = key as ProductionStatus;
        break;
      }
    }

    if (prevStatus) {
      if (confirm(`Atenção: Deseja realmente VOLTAR esta obra para a fase de ${STATUS_CONFIG[prevStatus].label}?`)) {
        updateProject({
          ...p,
          currentStatus: prevStatus,
          history: [...(p.history || []), { status: prevStatus, timestamp: new Date().toISOString() }]
        } as Project);
      }
    } else {
      alert('Não é possível voltar desta etapa.');
    }
  };

  const updateEnvironmentStatus = (projectId: string, envName: string, nextStatus: ProductionStatus) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const env = project.environmentsDetails.find(e => e.name === envName);
    if (!env) return;

    // Validation: Only advance if negotiated (MDO Authorized)
    if (!env.isMdoAuthorized && nextStatus !== 'Cancelada') {
      alert(`BLOQUEIO DE AMBIENTE: O ambiente "${envName}" não pode avançar para ${nextStatus} sem negociação de MDO autorizada em Suprimentos.`);
      return;
    }

    const updatedEnvs = project.environmentsDetails.map(e =>
      e.name === envName ? { ...e, currentStatus: nextStatus } : e
    );

    // AUTO-ADVANCE: If all envs reach Vistoria, move project to Vistoria status
    let nextProjectStatus = project.currentStatus;
    if (project.currentStatus === 'Instalação') {
      const allReady = updatedEnvs.every(e => e.currentStatus === 'Vistoria' || e.currentStatus === 'Finalizada');
      if (allReady) {
        nextProjectStatus = 'Vistoria';
      }
    }

    updateProject({
      ...project,
      currentStatus: nextProjectStatus,
      environmentsDetails: updatedEnvs,
      history: nextProjectStatus !== project.currentStatus
        ? [...project.history, { status: nextProjectStatus, timestamp: new Date().toISOString() }]
        : project.history
    } as Project);
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
      extraData.expenses = [...(project.expenses || []), newExpense];
    }

    // --- COMMISSION CALCULATION LOGIC ---
    const totalParts = Object.values(productionPartsCount).reduce((a: number, b: number) => a + b, 0);
    const totalCommissionBudget = (project.value || 0) * 0.10; // 10% of Project Value

    const updatedEnvironments = project.environmentsDetails.map(env => {
      const envParts = productionPartsCount[env.name] || 0;
      // Distribute Commission Proporciomonally to Parts
      const calculatedCommission = (totalParts as number) > 0
        ? (envParts / (totalParts as number)) * totalCommissionBudget
        : 0;

      return {
        ...env,
        memorial: {
          ...env.memorial,
          partsCount: envParts
        },
        // Initialize Commission Values
        commissionValue: calculatedCommission,
        authorizedMdoValue: calculatedCommission, // Auto-authorize initial calculation
        isMdoAuthorized: true // Auto-authorize to streamline process (can be revoked in Procurement)
      }
    });

    // Validate Total Commission (Alert if > 10%) - Though here it is exactly 10%, future edits might change it
    const currentTotalCommission = updatedEnvironments.reduce((acc, env) => acc + (env.commissionValue || 0), 0);
    if (currentTotalCommission > totalCommissionBudget + 1) { // Tolerance for float rounding
      alert(`ATENÇÃO: O valor total de comissão (R$ ${currentTotalCommission.toFixed(2)}) excede 10% do valor da obra!`);
    }

    extraData.environmentsDetails = updatedEnvironments;

    setShowLogisticsModal(showCentralModal);
    setShowCentralModal(null);
  };

  const updateOutsourcedItem = (projectId: string, serviceId: string, field: keyof OutsourcedService, value: any) => {
    const p = projects.find(proj => proj.id === projectId);
    if (p) {
      updateProject({
        ...p,
        outsourcedServices: p.outsourcedServices.map(s => s.id === serviceId ? { ...s, [field]: value } : s)
      } as Project);
    }
  };

  const setLogisticsPath = (projectId: string, path: 'Workshop' | 'Direct') => {
    const p = projects.find(proj => proj.id === projectId);
    if (p) {
      updateProject({
        ...p,
        deliveryPath: path,
        currentStatus: 'Produção',
        history: [...(p.history || []), { status: 'Produção', timestamp: new Date().toISOString() }]
      } as Project);
    }
    setShowLogisticsModal(null);
  };

  const updateLogistics = (projectId: string, data: Partial<Project>) => {
    const p = projects.find(proj => proj.id === projectId);
    if (p) {
      updateProject({ ...p, ...data } as Project);
    }
  };

  const processAssemblyPDFWithAI = async (projectId: string) => {
    setIsProcessingAI(true);
    // Simulating AI extraction from Technical PDF (Promob/CutList)
    await new Promise(resolve => setTimeout(resolve, 3000));

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // IA Smarter Logic v3: 
    // 1. Group by "Módulo Pai" ID.
    // 2. Individual Listing: No merging (each row is distinct).
    // 3. Consolidated Panels: All panels in one "PAINÉIS" card.
    const mockExtractedUnits = project.environmentsDetails.map(env => {
      const modulesMap: Record<string, SelectedModule> = {};
      const allPanels: MdfPart[] = [];

      const simulatedData = [
        // RELATÓRIO: Módulo 55 (Multi-Seção)
        // CAIXAS
        { parentId: '55', section: 'CAIXAS', part: { id: `p55-1`, uniqueId: 'BASE_INF', partName: 'BASE_INF', width: 1669, depth: 400, brandColor: 'Cinza Supremo', thickness: '15mm' } },
        { parentId: '55', section: 'CAIXAS', part: { id: `p55-2`, uniqueId: 'LAT_DIR', partName: 'LAT_DIR', width: 684.5, depth: 400, brandColor: 'Cinza Supremo', thickness: '15mm' } },
        // FRENTES
        { parentId: '55', section: 'FRENTES', part: { id: `p55-3`, uniqueId: 'FRENTE_ARM', partName: 'FRENTE_ARM_NORMAL_DIR', width: 375, depth: 409.5, brandColor: 'Cinza Supremo', thickness: '15mm' } },
        // FUNDOS
        { parentId: '55', section: 'FUNDOS', part: { id: `p55-4`, uniqueId: 'FUNDO', partName: 'FUNDO', width: 609, depth: 1679, brandColor: 'Branco TX', thickness: '6mm' } },
        // INTERNOS
        { parentId: '55', section: 'INTERNOS', part: { id: `p55-5`, uniqueId: 'DIV_HORZ', partName: 'DIV_HORZ', width: 1669, depth: 378, brandColor: 'Cinza Supremo', thickness: '15mm' } },

        // RELATÓRIO: Módulo 1606 (Multi-Seção)
        // CAIXAS
        { parentId: '1606', section: 'CAIXAS', part: { id: `p1606-1`, uniqueId: 'BASE_INF', partName: 'BASE_INF', width: 1819, depth: 523, brandColor: 'Branco TX', thickness: '15mm' } },
        // INTERNOS
        { parentId: '1606', section: 'INTERNOS', part: { id: `p1606-2`, uniqueId: 'LAT_GAV_DIR', partName: 'LAT_GAV_DIR', width: 400, depth: 114.5, brandColor: 'Branco TX', thickness: '15mm' } },
        { parentId: '1606', section: 'INTERNOS', part: { id: `p1606-3`, uniqueId: 'LAT_GAV_DIR', partName: 'LAT_GAV_DIR', width: 400, depth: 114.5, brandColor: 'Branco TX', thickness: '15mm' } },
        { parentId: '1606', section: 'INTERNOS', part: { id: `p1606-4`, uniqueId: 'LAT_GAV_DIR', partName: 'LAT_GAV_DIR', width: 400, depth: 114.5, brandColor: 'Branco TX', thickness: '15mm' } },

        // PAINEIS (Cada um com seu ID Pai Próprio conforme imagem)
        { parentId: '1222', section: 'PAINÉIS', part: { id: `pan-1222`, uniqueId: 'PNL', partName: 'PNL', width: 1850, depth: 40, brandColor: 'Jequitiba Trend', thickness: '15mm' } },
        { parentId: '1227', section: 'PAINÉIS', part: { id: `pan-1227`, uniqueId: 'PNL', partName: 'PNL', width: 1850, depth: 40, brandColor: 'Jequitiba Trend', thickness: '15mm' } },
        { parentId: '1240', section: 'PAINÉIS', part: { id: `pan-1240`, uniqueId: 'PNL', partName: 'PNL', width: 1850, depth: 40, brandColor: 'Jequitiba Trend', thickness: '15mm' } },
        { parentId: '1253', section: 'PAINÉIS', part: { id: `pan-1253`, uniqueId: 'PNL', partName: 'PNL', width: 1850, depth: 40, brandColor: 'Jequitiba Trend', thickness: '15mm' } },
        { parentId: '1305', section: 'PAINÉIS', part: { id: `pan-1305`, uniqueId: 'PNL', partName: 'PNL', width: 1850, depth: 40, brandColor: 'Jequitiba Trend', thickness: '15mm' } },
        { parentId: '1528', section: 'PAINÉIS', part: { id: `pan-1528`, uniqueId: 'PNL', partName: 'PNL', width: 1700, depth: 1084, brandColor: 'Cinza Supremo', thickness: '15mm' } }
      ];

      simulatedData.forEach(item => {
        const blockId = `${item.section}-${item.parentId || 'AVULSOS'}`;
        if (!modulesMap[blockId]) {
          modulesMap[blockId] = {
            id: `mod-${blockId}-${Date.now()}`,
            originalId: item.parentId || 'AVULSOS',
            name: `${item.section} - ${item.parentId || 'AVULSOS'}`,
            description: 'Espelhado via IA',
            width: 0, height: 0, depth: 0, quantity: 1,
            selectedVariants: {},
            parts: []
          };
        }
        const mod = modulesMap[blockId];
        // Mirror Mode: Individual line listing
        mod.parts = [...(mod.parts || []), { ...item.part, quantity: 1 }];
      });

      const modules = Object.values(modulesMap);

      return {
        ...env,
        memorial: {
          ...(env.memorial || {}),
          modules
        }
      };
    });

    updateProject({ ...project, environmentsDetails: mockExtractedUnits as any } as Project);
    setIsProcessingAI(false);
    alert('IA HYPADO: Espelhamento 1:1 gerado com sucesso! Cada linha do PDF foi extraída individualmente.');
  };

  const resetAssemblyData = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    if (confirm('Deseja realmente remover todo o plano de montagem extraído para recomeçar?')) {
      const resetUnits = project.environmentsDetails.map(env => ({
        ...env,
        memorial: {
          ...(env.memorial || {}),
          modules: []
        }
      }));
      updateProject({ ...project, environmentsDetails: resetUnits as any } as Project);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase italic leading-none">Controle PCP Industrial</h3>
          <p className="text-muted-foreground font-bold text-sm uppercase italic tracking-widest mt-2">Gestão de Produção e Auditoria de Terceiros</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[56px] border-2 border-slate-100 bg-card shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b-2 border-slate-100">
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Ordem de Serviço</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">Insumos</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">Terceiros</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">Logística</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Status</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">Controle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {projects.filter(p => p.currentStatus !== 'Finalizada').map(project => {
              const incompleteOut = (project.outsourcedServices || []).some(s => !s.supplierName || (s.value || 0) <= 0);
              const allOutReady = (project.outsourcedServices || []).length > 0 && (project.outsourcedServices || []).every(s => s.status === 'Pronto');

              const isDirect = project.deliveryPath === 'Direct';
              const logisticsComplete = project.clientScheduled && project.freightOrganized && (isDirect || project.preAssemblyDone);

              return (
                <tr key={project.id} className="hover:bg-muted/50/50 transition-all group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-slate-900 text-amber-500 flex items-center justify-center rounded-[20px] font-black italic shadow-lg">{project.id.slice(-2)}</div>
                      <div>
                        <p className="font-black text-foreground uppercase italic text-lg tracking-tighter leading-none">{project.workName}</p>
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
                      className={`inline-flex p-3 rounded-2xl border-2 transition-all hover:scale-110 ${incompleteOut ? 'bg-amber-50 text-amber-500 border-amber-200 animate-bounce' : (allOutReady ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : (project.outsourcedServices.length > 0 ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-muted/50 text-slate-300 border-slate-100'))}`}
                    >
                      {incompleteOut ? <AlertTriangle size={20} /> : (allOutReady ? <CheckCircle2 size={20} /> : <Clock size={20} />)}
                    </button>
                  </td>
                  <td className="px-10 py-8 text-center">
                    {(project.currentStatus === 'Produção' || project.currentStatus === 'Entrega' || project.currentStatus === 'Instalação') ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex gap-2">
                          {!isDirect && (
                            <button onClick={() => setShowPreAssemblyModal(project.id)} className={`p-2 rounded-lg border-2 transition-all ${project.preAssemblyDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border text-slate-300'}`} title="Pré-montagem">
                              <Screwdriver size={14} />
                            </button>
                          )}
                          <button onClick={() => setShowFreightModal(project.id)} className={`p-2 rounded-lg border-2 transition-all ${project.freightOrganized ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border text-slate-300'}`} title="Frete Organizado">
                            <Truck size={14} />
                          </button>
                          <button onClick={() => setShowDeliveryModal(project.id)} className={`p-2 rounded-lg border-2 transition-all ${project.clientScheduled ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border text-slate-300'}`} title="Agendado com Cliente">
                            <Clock size={14} />
                          </button>
                        </div>
                        <p className="text-[8px] font-black uppercase text-slate-400 italic">{project.deliveryPath === 'Direct' ? 'Direto CLI' : 'Via Oficina'}</p>
                      </div>
                    ) : (
                      <div className="text-slate-200">—</div>
                    )}
                  </td>
                  <td className="px-10 py-8">
                    <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase border shadow-lg ${getStatusBadgeClass(project.currentStatus)} italic tracking-widest`}>
                      {project.currentStatus}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex flex-col gap-4">
                      <button
                        onClick={() => setShowAssemblyModal(project.id)}
                        className="px-8 py-3 bg-card border-2 border-border rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900 ml-auto shadow-sm"
                        title="Abrir Mapa de Montagem"
                      >
                        <Layers size={16} className="text-amber-500" /> Mapa de Montagem
                      </button>

                      <div className="flex items-center gap-2 w-full justify-end">
                        {project.currentStatus !== 'Venda' && project.currentStatus !== 'Cancelada' && (
                          <button
                            onClick={() => goBackStatus(project.id)}
                            className="p-4 rounded-[20px] bg-muted/50 text-slate-400 hover:bg-red-50 hover:text-red-500 border-2 border-slate-100 hover:border-red-100 transition-all shadow-sm active:scale-95"
                            title="Voltar Etapa Anterior"
                          >
                            <ArrowLeft size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (project.currentStatus === 'Produção' && !logisticsComplete) {
                              alert(`TRAVA LOGÍSTICA: Complete o checklist logístico (${isDirect ? 'Frete, Agendamento' : 'Pré-montagem, Frete, Agendamento'}) para avançar.`);
                              return;
                            }
                            updateStatus(project.id);
                          }}
                          className={`px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${project.currentStatus === 'Instalação' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-slate-900 text-white hover:bg-amber-500 hover:text-foreground'}`}
                        >
                          {project.currentStatus === 'Instalação' ? 'Solicitar Vistoria' : 'Avançar Obra'} <ArrowRight size={18} />
                        </button>
                      </div>

                      {/* Sub-lista de Ambientes para Instalação/Vistoria */}
                      {(project.currentStatus === 'Instalação' || project.currentStatus === 'Vistoria') && (
                        <div className="flex flex-col gap-2 mt-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest text-right">Status por Ambiente</p>
                          {project.environmentsDetails.map(env => (
                            <div key={env.name} className="flex items-center justify-end gap-3 bg-muted/50 p-3 rounded-2xl border border-slate-100 group-hover:bg-card transition-all">
                              <span className="text-[10px] font-black text-foreground uppercase italic">{env.name}</span>
                              <div className="flex gap-1">
                                {!env.isMdoAuthorized ? (
                                  <div className="flex items-center gap-1 bg-red-50 text-red-500 px-2 py-1 rounded-lg text-[8px] font-black border border-red-100 shadow-sm animate-pulse">
                                    <Lock size={10} /> SEM MDO
                                  </div>
                                ) : (
                                  <>
                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${getStatusBadgeClass(env.currentStatus || 'Instalação' as ProductionStatus)}`}>
                                      {env.currentStatus || 'Instalação'}
                                    </span>
                                    {env.currentStatus !== 'Finalizada' && (
                                      <button
                                        onClick={() => {
                                          const next = env.currentStatus === 'Vistoria' ? 'Finalizada' : 'Vistoria';
                                          updateEnvironmentStatus(project.id, env.name, next as ProductionStatus);
                                        }}
                                        className="p-1 bg-slate-900 text-white rounded-lg hover:bg-amber-500 transition-colors shadow-sm"
                                        title={env.currentStatus === 'Vistoria' ? 'Finalizar Ambiente' : 'Mandar para Vistoria'}
                                      >
                                        <ChevronRight size={12} />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL: ARCHITECT SELECTION */}
      {showArchitectModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setShowArchitectModal(null)} />
          <div className="relative bg-card w-full max-w-md rounded-[48px] shadow-2xl p-10 animate-in zoom-in-95">
            <h4 className="text-2xl font-black uppercase italic mb-6 tracking-tighter leading-none">Responsável Técnico</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 italic">Quem foi o projetista desta obra?</p>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {installers
                .filter(i => i.role === 'Projetista' || i.role === 'Vendedor' || i.role === 'Arquiteto' || i.role === 'Marceneiro')
                .map(inst => (
                  <button
                    key={inst.id}
                    onClick={() => setSelectedArchitectId(inst.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedArchitectId === inst.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-muted/50 border-slate-100 text-muted-foreground hover:border-border'}`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center overflow-hidden">
                        {inst.avatar ? <img src={inst.avatar} alt={inst.name} className="w-full h-full object-cover" /> : <User size={16} className="text-slate-400" />}
                      </div>
                      <div>
                        <p className="font-black uppercase text-xs truncate w-40 italic leading-none">{inst.name}</p>
                        <p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mt-1 italic">{inst.role}</p>
                      </div>
                    </div>
                    {selectedArchitectId === inst.id && <CheckCircle2 size={16} className="text-amber-500" />}
                  </button>
                ))}
              {installers.filter(i => i.role === 'Projetista' || i.role === 'Vendedor' || i.role === 'Arquiteto').length === 0 && (
                <p className="text-center text-slate-400 italic text-xs">Nenhum projetista cadastrado.</p>
              )}
            </div>

            <button
              onClick={() => {
                if (selectedArchitectId) {
                  advance(showArchitectModal, 'Corte', { architectId: selectedArchitectId });
                  setSelectedArchitectId('');
                } else {
                  alert('Selecione um projetista para continuar.');
                }
              }}
              className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-emerald-500 hover:text-foreground transition-all shadow-xl"
            >
              Confirmar e Enviar para Corte
            </button>
          </div>
        </div>
      )}

      {/* MODAL: AUDITORIA DE TERCEIROS - Keep existing code or refactor if needed */}
      {showOutsourcedModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowOutsourcedModal(null)} />
          <div className="relative bg-card w-full max-w-5xl h-[85vh] rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="text-3xl font-black uppercase italic tracking-tighter">Gestão de Terceiros e Cotação</h4>
                <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-2">Defina fornecedor e valor para liberar a produção</p>
              </div>
              <button onClick={() => setShowOutsourcedModal(null)} title="Fechar Modal" className="p-4 hover:bg-slate-800 rounded-full transition-all"><X size={32} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-8 bg-muted/50 custom-scrollbar">
              {projects.find(p => p.id === showOutsourcedModal)?.outsourcedServices.map(item => (
                <div key={item.id} className="bg-card p-8 rounded-[40px] border-2 border-slate-100 flex flex-col gap-8 shadow-sm hover:border-indigo-200 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Building2 size={24} /></div>
                      <h5 className="text-2xl font-black text-foreground uppercase italic tracking-tighter leading-none">{item.category}</h5>
                    </div>
                    <div className="flex bg-muted p-1.5 rounded-[24px]">
                      {(['Pendente', 'Pedido', 'Pronto'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => updateOutsourcedItem(showOutsourcedModal, item.id, 'status', s)}
                          className={`px-6 py-2.5 rounded-[18px] text-[10px] font-black uppercase italic transition-all ${item.status === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-muted-foreground'}`}
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
                        className="w-full bg-muted/50 border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-bold outline-none shadow-inner"
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
                          type={userRole === 'owner' ? "number" : "password"}
                          className="w-full bg-muted/50 border-2 border-transparent focus:border-emerald-500 p-4 pl-10 rounded-2xl font-black text-lg outline-none shadow-inner text-emerald-600 disabled:opacity-50"
                          placeholder={userRole === 'owner' ? "0,00" : "RESTRITO"}
                          value={userRole === 'owner' ? (item.value || '') : '****'}
                          onChange={e => userRole === 'owner' && updateOutsourcedItem(showOutsourcedModal, item.id, 'value', Number(e.target.value))}
                          disabled={userRole !== 'owner'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-10 bg-slate-900 flex justify-between items-center">
              <div className="text-white">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic mb-2">Total Terceirizado Obra</p>
                <p className="text-3xl font-black italic">
                  {userRole === 'owner'
                    ? `R$ ${(projects.find(p => p.id === showOutsourcedModal)?.outsourcedServices || []).reduce((acc, s) => acc + (s.value || 0), 0).toLocaleString()}`
                    : 'R$ RESTRITO'}
                </p>
              </div>
              <button
                onClick={() => setShowOutsourcedModal(null)}
                className="bg-amber-500 text-foreground px-12 py-5 rounded-[28px] font-black uppercase text-xs tracking-widest hover:bg-card transition-all shadow-xl"
              >
                Salvar & Voltar para Produção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROCESSAMENTO INDUSTRIAL (CORTE) */}
      {showCentralModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowCentralModal(null)} />
          <div className="relative bg-card w-full max-w-xl rounded-[56px] shadow-2xl p-12 animate-in zoom-in-95">
            <h4 className="text-3xl font-black uppercase italic mb-8 tracking-tighter leading-none">Processamento Industrial</h4>
            <div className="space-y-8">
              {userRole === 'owner' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Custo do Serviço de Corte R$</label>
                  <input type="number" className="w-full px-8 py-5 bg-muted/50 border-2 rounded-[28px] text-3xl font-black outline-none focus:border-amber-500 transition-all shadow-inner" placeholder="0,00" value={centralServiceValue} onChange={e => setCentralServiceValue(e.target.value)} />
                </div>
              )}

              <div className="bg-muted/50 p-6 rounded-[28px] border-2 border-slate-100 space-y-4">
                <h5 className="text-xs font-black uppercase text-slate-400 italic ml-2">Apontamento de Peças (Plano de Corte)</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.find(p => p.id === showCentralModal)?.environmentsDetails.map(env => (
                    <div key={env.name} className="bg-card p-4 rounded-xl border border-border">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">{env.name}</label>
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
                  <button key={s.id} onClick={() => handleSelectCentral(s.name)} className="w-full p-6 bg-muted hover:bg-slate-900 hover:text-white rounded-[28px] transition-all font-black uppercase italic text-sm text-left px-10 border border-border">
                    {s.name}
                  </button>
                ))}
                <button onClick={() => handleSelectCentral('Produção Interna')} className="w-full p-6 bg-slate-900 text-white rounded-[28px] transition-all font-black uppercase italic text-sm hover:bg-amber-500 hover:text-foreground text-left px-10 shadow-lg">
                  Usinagem Interna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOGISTICA DECISION */}
      {showLogisticsModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl" onClick={() => setShowLogisticsModal(null)} />
          <div className="relative bg-card w-full max-w-2xl rounded-[56px] shadow-2xl p-16 animate-in zoom-in-95 text-center">
            <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Truck size={48} />
            </div>
            <h4 className="text-4xl font-black uppercase italic mb-4 tracking-tighter leading-none">Logística de Entrega</h4>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm mb-12">Para onde essa obra deve seguir após o corte?</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setLogisticsPath(showLogisticsModal, 'Workshop')}
                className="group flex flex-col items-center gap-6 p-10 bg-muted/50 hover:bg-slate-900 border-2 border-slate-100 hover:border-slate-900 rounded-[40px] transition-all"
              >
                <div className="p-5 bg-card rounded-2xl text-foreground group-hover:bg-amber-500 group-hover:text-foreground transition-colors shadow-sm">
                  <FactoryIcon size={32} />
                </div>
                <div className="text-center">
                  <p className="font-black uppercase italic text-xl group-hover:text-white transition-colors">Via Oficina</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Requer Pré-montagem</p>
                </div>
              </button>

              <button
                onClick={() => setLogisticsPath(showLogisticsModal, 'Direct')}
                className="group flex flex-col items-center gap-6 p-10 bg-muted/50 hover:bg-slate-900 border-2 border-slate-100 hover:border-slate-900 rounded-[40px] transition-all"
              >
                <div className="p-5 bg-card rounded-2xl text-foreground group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
                  <Truck size={32} />
                </div>
                <div className="text-center">
                  <p className="font-black uppercase italic text-xl group-hover:text-white transition-colors">Direto ao Cliente</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Corte Direto (Sem Montagem)</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRÉ-MONTAGEM (TEAM) */}
      {showPreAssemblyModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setShowPreAssemblyModal(null)} />
          <div className="relative bg-card w-full max-w-md rounded-[48px] shadow-2xl p-10 animate-in zoom-in-95">
            <h4 className="text-2xl font-black uppercase italic mb-6 tracking-tighter leading-none">Equipe de Pré-montagem</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 italic">Quem realizou o serviço na oficina?</p>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {installers.filter(i => i.role === 'Marceneiro' || i.role === 'Ajudante').map(inst => {
                const project = projects.find(p => p.id === showPreAssemblyModal);
                const isSelected = project?.preAssemblyTeam?.includes(inst.id);
                return (
                  <button
                    key={inst.id}
                    onClick={() => {
                      const currentTeam = project?.preAssemblyTeam || [];
                      const nextTeam = isSelected ? currentTeam.filter(id => id !== inst.id) : [...currentTeam, inst.id];
                      updateLogistics(showPreAssemblyModal, { preAssemblyTeam: nextTeam });
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'bg-muted/50 border-slate-100 text-muted-foreground hover:border-border'}`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center overflow-hidden">
                        {inst.avatar ? <img src={inst.avatar} alt={inst.name} className="w-full h-full object-cover" /> : <User size={16} className="text-slate-400" />}
                      </div>
                      <div>
                        <p className="font-black uppercase text-xs truncate w-40 italic leading-none">{inst.name}</p>
                        <p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mt-1 italic">{inst.role}</p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 size={16} className="text-amber-500" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                const project = projects.find(p => p.id === showPreAssemblyModal);
                if (project && (project.preAssemblyTeam || []).length > 0) {
                  updateLogistics(showPreAssemblyModal, { preAssemblyDone: true });
                  setShowPreAssemblyModal(null);
                } else {
                  alert("Selecione ao menos um profissional.");
                }
              }}
              className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-amber-500 hover:text-foreground transition-all shadow-xl"
            >
              Confirmar Pré-montagem
            </button>
          </div>
        </div>
      )}

      {/* MODAL: FRETE */}
      {showFreightModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setShowFreightModal(null)} />
          <div className="relative bg-card w-full max-w-md rounded-[48px] shadow-2xl p-10 animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
              <h4 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Agendamento de Frete</h4>
              <Truck size={32} className="text-blue-500" />
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="freightCarrierId" className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Freteiro Responsável</label>
                <select
                  id="freightCarrierId"
                  className="w-full p-4 bg-muted/50 border-2 border-slate-100 rounded-2xl font-black uppercase text-xs outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  value={projects.find(p => p.id === showFreightModal)?.freightCarrierId || ''}
                  onChange={e => updateLogistics(showFreightModal, { freightCarrierId: e.target.value })}
                >
                  <option value="">Selecione o Profissional</option>
                  {installers.filter(i => i.role === 'Freteiro').map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="freightDate" className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Data do Frete</label>
                <input
                  id="freightDate"
                  type="date"
                  className="w-full p-4 bg-muted/50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-blue-500 transition-all"
                  value={tempFreightDate}
                  onChange={e => setTempFreightDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={() => {
                  const project = projects.find(p => p.id === showFreightModal);
                  if (project?.freightCarrierId && tempFreightDate) {
                    updateLogistics(showFreightModal, { freightOrganized: true, freightDate: tempFreightDate });
                    setShowFreightModal(null);
                  } else {
                    alert("Preencha todos os campos do frete.");
                  }
                }}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-blue-600 transition-all shadow-xl"
              >
                Salvar Frete
              </button>

              {/* Botão de Notificação WhatsApp */}
              <button
                onClick={() => {
                  const project = projects.find(p => p.id === showFreightModal);
                  const carrier = installers.find(i => i.id === project?.freightCarrierId);

                  if (!carrier || !tempFreightDate) {
                    alert("Selecione um freteiro e uma data para notificar.");
                    return;
                  }

                  const phone = carrier.phone?.replace(/\D/g, '');
                  if (!phone) {
                    alert("O freteiro selecionado não possui telefone cadastrado.");
                    return;
                  }

                  const date = new Date(tempFreightDate + 'T00:00:00').toLocaleDateString('pt-BR');
                  const address = project.addressStreet
                    ? `${project.addressStreet}, ${project.addressNumber} - ${project.addressNeighborhood}, ${project.addressCity}`
                    : (project.workAddress || "Endereço não informado");

                  const message = `*AGENDAMENTO DE FRETE - HYPADO*\n\n` +
                    `🚚 Olá *${carrier.name.split(' ')[0]}*,\n` +
                    `Temos uma entrega programada para você:\n\n` +
                    `📅 *Data:* ${date}\n` +
                    `ðŸ¢ *Obra:* ${project.workName}\n` +
                    `ðŸ“ *Destino:* ${address}\n\n` +
                    `Pode confirmar a disponibilidade?`;

                  const link = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
                  window.open(link, '_blank');
                }}
                className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-emerald-600 transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <Truck size={20} /> Notificar Freteiro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ENTREGA (CLIENTE) */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setShowDeliveryModal(null)} />
          <div className="relative bg-card w-full max-w-md rounded-[48px] shadow-2xl p-10 animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Agendamento de Entrega</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Combinado com o Cliente</p>
              </div>
              <Clock size={32} className="text-emerald-500" />
            </div>
            <div className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black uppercase text-slate-400 italic">Cliente</p>
                <p className="text-sm font-black text-foreground uppercase italic">{projects.find(p => p.id === showDeliveryModal)?.clientName}</p>
                <p className="text-[10px] font-bold text-muted-foreground mt-1">{projects.find(p => p.id === showDeliveryModal)?.workName}</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="deliveryDate" className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Data Combinada</label>
                <input
                  id="deliveryDate"
                  type="date"
                  className="w-full p-4 bg-muted/50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 transition-all"
                  value={tempDate}
                  onChange={e => setTempDate(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => {
                const project = projects.find(p => p.id === showDeliveryModal);
                if (tempDate) {
                  updateLogistics(showDeliveryModal, { clientScheduled: true, deliveryDate: tempDate });
                  setShowDeliveryModal(null);
                } else {
                  alert("Informe a data de entrega.");
                }
              }}
              className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-emerald-600 transition-all shadow-xl"
            >
              Confirmar Entrega
            </button>

            {/* Client Notification Button */}
            <button
              onClick={() => {
                const project = projects.find(p => p.id === showDeliveryModal);

                if (!tempDate) {
                  alert("Informe a data de entrega para notificar.");
                  return;
                }

                // Determine Main Installer (Lead)
                let mainInstallerName = "Nossa Equipe";
                let mainInstallerPhoto = "";

                if (project.preAssemblyTeam && project.preAssemblyTeam.length > 0) {
                  const leadId = project.preAssemblyTeam[0];
                  const lead = installers.find(i => i.id === leadId);
                  if (lead) {
                    mainInstallerName = lead.name;
                    mainInstallerPhoto = lead.avatar || "";
                  }
                } else if (project.installerId) {
                  const lead = installers.find(i => i.id === project.installerId);
                  if (lead) {
                    mainInstallerName = lead.name;
                    mainInstallerPhoto = lead.avatar || "";
                  }
                }

                // Get Client Phone
                const client = clients.find(c => c.name === project.clientName);
                if (!client?.phone) {
                  alert("Cliente sem telefone cadastrado.");
                  return;
                }
                const phone = client.phone.replace(/\D/g, '');

                const date = new Date(tempDate + 'T00:00:00').toLocaleDateString('pt-BR'); // Force Time 

                let message = `*AGENDAMENTO DE ENTREGA/INSTALAÇÃO - HYPADO*\n\n` +
                  `Olá *${client.name.split(' ')[0]}*! Tudo bem?\n\n` +
                  `Passando para confirmar o agendamento da sua obra:\n` +
                  `📅 *Data:* ${date}\n` +
                  `ðŸ¢ *Projeto:* ${project.workName}\n\n` +
                  `Quem irá lhe atender é o *${mainInstallerName}*.\n`;

                if (mainInstallerPhoto) {
                  message += `📸 Conheça o profissional: ${mainInstallerPhoto}`;
                }

                const link = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
                window.open(link, '_blank');
              }}
              className="w-full mt-4 bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-emerald-600 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Truck size={20} /> Notificar Cliente (WhatsApp)
            </button>
          </div>
        </div>
      )}

      {/* MODAL: MAPA DE MONTAGEM & IA READER */}
      {showAssemblyModal && (() => {
        const project = projects.find(p => p.id === showAssemblyModal);
        if (!project) return null;

        return (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-2xl" onClick={() => setShowAssemblyModal(null)} />
            <div className="relative bg-card w-full max-w-6xl h-[90vh] rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border-2 border-white/20">
              {/* Header */}
              <div className="p-10 bg-slate-900 flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/20 rounded-full blur-[100px] -mr-40 -mt-40" />
                <div className="relative z-10 flex items-center gap-8">
                  <div className="p-5 bg-amber-500 text-foreground rounded-[32px] shadow-2xl shadow-amber-500/40 animate-pulse">
                    <Layers size={36} />
                  </div>
                  <div>
                    <h4 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">Mapa de Montagem IA</h4>
                    <div className="flex items-center gap-4 mt-3">
                      <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-[0.4em] italic flex items-center gap-3">
                        <Sparkles size={14} className="animate-spin-slow" /> Processamento Digital
                      </p>
                      <div className="h-4 w-[1px] bg-card/10" />
                      <div className="relative group/search">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-amber-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="BUSCAR ID DA PEÇA..."
                          value={assemblySearch}
                          onChange={(e) => setAssemblySearch(e.target.value.toUpperCase())}
                          className="bg-card/5 border border-white/10 rounded-xl py-1.5 pl-9 pr-4 text-[10px] font-black text-white placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 focus:bg-card/10 transition-all w-48 uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 relative z-10">
                  {project.project_pdf_url && (
                    <a
                      href={project.project_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-card/10 hover:bg-card/20 text-white rounded-2xl flex items-center gap-2 transition-all border border-white/20 text-xs font-black uppercase italic"
                    >
                      <FileText size={18} className="text-amber-500" />
                      Ver PDF Original
                    </a>
                  )}
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black text-muted-foreground uppercase italic tracking-widest">{project.clientName}</p>
                    <p className="text-2xl font-black text-white uppercase italic">{project.workName}</p>
                  </div>
                  <button
                    onClick={() => setShowAssemblyModal(null)}
                    title="Fechar Mapa de Montagem"
                    className="p-5 bg-card/5 hover:bg-card/10 text-white rounded-full transition-all border border-white/10 active:scale-90"
                  >
                    <X size={32} />
                  </button>
                </div>
              </div>

              {/* Main Container */}
              <div className="flex-1 flex overflow-hidden">
                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-muted/50 custom-scrollbar">
                  {project.environmentsDetails.map((env: any, envIdx: number) => (
                    <div key={envIdx} className="bg-card rounded-[48px] border-2 border-slate-100 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500">
                      <div className="p-8 bg-slate-900 flex justify-between items-center">
                        <h5 className="text-xl font-black text-white uppercase italic flex items-center gap-4">
                          <Box size={24} className="text-amber-500" /> {env.name}
                        </h5>
                        <div className="px-6 py-2 bg-card/10 rounded-full text-[11px] font-black uppercase tracking-widest text-white">
                          {(env.memorial?.modules || env.modules || []).length} Módulos
                        </div>
                      </div>
                      <div className="p-8 space-y-6">
                        {(env.memorial?.modules || env.modules || []).map((mod: any, modIdx: number) => (
                          <div key={modIdx} className="p-8 bg-muted/50 rounded-[40px] border border-border/60 relative group/mod">
                            <div className="flex justify-between items-start mb-8">
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase italic mb-1">Módulo / Item</p>
                                <h6 className="text-xl font-black text-foreground uppercase italic leading-none tracking-tight">{mod.name}</h6>
                                <p className="text-xs font-bold text-muted-foreground mt-2 italic">{mod.description || 'Nenhuma descrição técnica informada.'}</p>
                              </div>
                              <div className="bg-card p-3 rounded-2xl border-2 border-slate-100 text-[10px] font-black text-slate-400 uppercase italic">
                                {mod.parts?.length || 0} Peças
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(mod.parts?.filter((p: any) =>
                                !assemblySearch ||
                                p.uniqueId?.toUpperCase().includes(assemblySearch) ||
                                p.partName?.toUpperCase().includes(assemblySearch)
                              ) || []).map((part: any) => (
                                <div key={part.id} className={`bg-card p-5 rounded-[28px] border-2 transition-all flex flex-col gap-3 group/part ${assemblySearch && (part.uniqueId?.toUpperCase().includes(assemblySearch) || part.partName?.toUpperCase().includes(assemblySearch)) ? 'border-amber-400 ring-4 ring-amber-500/10 shadow-lg' : 'border-slate-100 shadow-sm hover:border-amber-400'}`}>
                                  <div className="flex items-center gap-4">
                                    <div className={`px-3 py-2 rounded-xl text-[11px] font-black border transition-all shadow-lg flex items-center gap-2 ${assemblySearch && part.uniqueId?.toUpperCase().includes(assemblySearch) ? 'bg-amber-500 text-foreground border-amber-600' : 'bg-slate-900 text-amber-500 border-slate-800'}`}>
                                      {part.uniqueId}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-black text-foreground uppercase italic truncate">{part.partName}</p>
                                      <p className="text-[9px] font-bold text-slate-400 tracking-tight">{part.width}x{part.depth}mm • {part.brandColor}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {(!mod.parts || mod.parts.length === 0) && (
                                <div className="col-span-full py-10 text-center border-4 border-dashed border-border rounded-[32px] flex flex-col items-center gap-3">
                                  <AlertTriangle size={32} className="text-slate-200" />
                                  <p className="text-xs font-black text-slate-300 uppercase italic tracking-widest">Aguardando Processamento de PDF</p>
                                </div>
                              )}
                              {mod.parts && mod.parts.length > 0 && mod.parts.filter((p: any) =>
                                !assemblySearch ||
                                p.uniqueId?.toUpperCase().includes(assemblySearch) ||
                                p.partName?.toUpperCase().includes(assemblySearch)
                              ).length === 0 && (
                                  <div className="col-span-full py-6 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                                    <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Nenhuma peça encontrada neste módulo</p>
                                  </div>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sidebar Controls */}
                <div className="w-[420px] bg-card border-l-4 border-slate-50 p-12 flex flex-col gap-10 shadow-2xl z-20 overflow-y-auto custom-scrollbar shrink-0">
                  <div className="space-y-6">
                    <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] italic px-2">Automação Hypado AI</h5>
                    <div className="bg-slate-900 rounded-[48px] p-10 text-center space-y-8 relative overflow-hidden group shadow-2xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-purple-600/30 opacity-40 blur-3xl group-hover:opacity-60 transition-opacity" />
                      <div className="relative z-10">
                        <div className="w-24 h-24 bg-card/5 rounded-[32px] flex items-center justify-center mx-auto mb-6 border-2 border-white/10 group-hover:scale-110 transition-transform group-hover:rotate-6 duration-500 shadow-inner">
                          <FileText size={48} className="text-amber-500" />
                        </div>
                        <h6 className="text-white font-black uppercase italic text-xl tracking-tighter leading-none">Leitura de PDF</h6>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-4 leading-relaxed italic px-4">
                          Suba o arquivo Promob ou Plano de Corte para extrair IDs automaticamente.
                        </p>
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf"
                        title="Selecionar PDF"
                        onChange={(e) => {
                          if (e.target.files?.[0] && showAssemblyModal) {
                            processAssemblyPDFWithAI(showAssemblyModal);
                          }
                        }}
                      />

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingAI}
                        title="Anexar PDF e processar via IA"
                        className={`w-full relative z-10 py-6 rounded-3xl font-black uppercase text-xs tracking-widest transition-all shadow-2xl flex items-center justify-center gap-4 overflow-hidden border-2 ${isProcessingAI ? 'bg-slate-800 border-slate-700 text-muted-foreground cursor-wait' : 'bg-amber-500 border-amber-400 text-foreground hover:bg-card hover:border-white active:scale-95'}`}
                      >
                        {isProcessingAI ? (
                          <>
                            <div className="w-5 h-5 border-3 border-slate-400 border-t-transparent animate-spin rounded-full" />
                            <span>Lendo PDF...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={16} /> <span>Anexar PDF</span>
                          </>
                        )}
                        {isProcessingAI && <div className="absolute bottom-0 left-0 h-1.5 bg-amber-400/50 animate-progress" style={{ width: '100%' }} />}
                      </button>

                      <button
                        onClick={() => resetAssemblyData(project.id)}
                        disabled={isProcessingAI}
                        className="w-full relative z-10 py-4 text-[10px] font-black uppercase text-muted-foreground hover:text-red-500 cursor-pointer transition-all active:scale-95"
                      >
                        Remover Mapa Atual
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6 flex-1">
                    <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] italic px-2">Link de Montagem</h5>
                    <div className="bg-muted/50 rounded-[40px] p-8 border-2 border-slate-100 space-y-6 shadow-inner">
                      <div className="bg-card p-6 rounded-3xl border-2 border-slate-100 shadow-md">
                        <p className="text-[10px] font-black text-slate-400 uppercase italic mb-3 flex items-center gap-2">
                          <ExternalLink size={12} /> URL do Instalador
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            readOnly
                            value={`${window.location.origin}/?mode=proposal&id=${project.id}`}
                            title="Link do Instalador"
                            placeholder="Link gerado pela IA"
                            className="flex-1 bg-muted/50 text-xs font-black p-3 rounded-xl border-none outline-none text-slate-400 truncate tracking-tight"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/?mode=proposal&id=${project.id}`);
                              alert('Copiado com sucesso!');
                            }}
                            className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-amber-500 hover:text-foreground transition-all shadow-lg active:scale-90"
                            title="Copiar Link"
                          >
                            <ExternalLink size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                        <Check size={14} />
                        <p className="text-[10px] font-black uppercase italic">PCP Autorizado</p>
                      </div>

                      <p className="text-[10px] font-bold text-slate-400 text-center uppercase italic px-4 leading-relaxed">
                        Este link levará o montador para a interface mobile com todos os IDs acima.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAssemblyModal(null)}
                    className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black uppercase italic tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-2xl flex items-center justify-center gap-4 group"
                  >
                    <Check size={24} className="group-hover:scale-125 transition-transform" /> Finalizar & Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div >
  );
};

export default PCPView;
