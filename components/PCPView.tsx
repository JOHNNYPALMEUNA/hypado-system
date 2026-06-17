import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, ProductionStatus, Quotation, Installer, OutsourcedService, Expense, Supplier, SelectedModule, MdfPart } from '../types';
import {
  ArrowRight, Box, PenTool, CheckCircle2, Truck,
  ChevronRight, Lock, Unlock,
  Factory as FactoryIcon, GlassWater, Scissors, DollarSign, Building2, AlertTriangle, Hammer as Screwdriver,
  User, Layers, FileText, Upload, Sparkles, Check, ExternalLink, Search, ArrowLeft, Gauge, ShieldCheck, Brain, TrendingUp, Clock, X, Save, Users, CalendarDays
} from 'lucide-react';


import { useData } from '../contexts/DataContext';
import { getStatusBadgeClass, formatCurrency, roundToTwo } from '../utils';
import Confetti from './Confetti';

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
  const { updateProject, patchProject, suppliers, clients, userRole, logEvent, fetchFullProject } = useData();
  const [showCentralModal, setShowCentralModal] = useState<string | null>(null);
  const [showOutsourcedModal, setShowOutsourcedModal] = useState<string | null>(null);
  const [showLogisticsModal, setShowLogisticsModal] = useState<string | null>(null);
  const [showPreAssemblyModal, setShowPreAssemblyModal] = useState<string | null>(null);
  const [tempPreAssemblyTeam, setTempPreAssemblyTeam] = useState<string[]>([]);
  const [showFreightModal, setShowFreightModal] = useState<string | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState<string | null>(null);
  const [showExpeditionModal, setShowExpeditionModal] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState<string>('');

  const [selectedProjectDeadlines, setSelectedProjectDeadlines] = useState<Project | null>(null);
  const [deadlineForm, setDeadlineForm] = useState({
    projectDeadlineDate: '',
    cuttingDeadlineDate: '',
    preAssemblyDeadlineDate: '',
    installationDeadlineDate: ''
  });
  const [tempFreightDate, setTempFreightDate] = useState<string>('');
  const [assemblySearch, setAssemblySearch] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [productionPartsCount, setProductionPartsCount] = useState<Record<string, number>>({});
  const [showArchitectModal, setShowArchitectModal] = useState<string | null>(null);
  const [selectedArchitectId, setSelectedArchitectId] = useState<string>('');
  const [showAssemblyModal, setShowAssemblyModal] = useState<string | null>(null);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  const startCelebration = () => {
    setTriggerConfetti(false);
    setTimeout(() => {
      setTriggerConfetti(true);
      // Optional: Store last success globally for "System Happiness"
      localStorage.setItem('lastSuccess', new Date().toISOString());
    }, 10);
  };
  
  // Industrial Cost States
  const [cuttingUnitPrice, setCuttingUnitPrice] = useState<string>('');
  const [cuttingQuantity, setCuttingQuantity] = useState<string>('');
  const [edgingUnitPrice, setEdgingUnitPrice] = useState<string>('');
  const [edgingQuantity, setEdgingQuantity] = useState<string>('');
  const [packingValue, setPackingValue] = useState<string>('');
  const [machiningValue, setMachiningValue] = useState<string>('');
  const [drillingValue, setDrillingValue] = useState<string>('');
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [smartImportText, setSmartImportText] = useState('');
  const [selectedEnvsForCutting, setSelectedEnvsForCutting] = useState<string[]>([]);
  const [pendingProjectData, setPendingProjectData] = useState<Partial<Project> | null>(null);
  const [transitionDate, setTransitionDate] = useState<string>(new Date().toISOString().split('T')[0]);
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

  useEffect(() => {
    if (showPreAssemblyModal) {
      const p = projects.find(proj => proj.id === showPreAssemblyModal);
      setTempPreAssemblyTeam(p?.preAssemblyTeam || []);
    }
  }, [showPreAssemblyModal, projects]);

  // HYDRATION: Fetch full project details when opening any detail modal
  useEffect(() => {
    const activeModalId = 
      showCentralModal || showOutsourcedModal || showLogisticsModal || 
      showPreAssemblyModal || showFreightModal || showDeliveryModal || 
      showExpeditionModal || showArchitectModal || showAssemblyModal;

    if (activeModalId) {
      const p = projects.find(proj => proj.id === activeModalId);
      // If project exists but is a summary (no environmentsDetails or outsourcedServices)
      // Note: We check if they are explicitly empty as the summary fetch doesn't include them
      if (p && (!p.environmentsDetails || p.environmentsDetails.length === 0) && (!p.outsourcedServices || p.outsourcedServices.length === 0)) {
        console.log(`Hydrating project ${activeModalId} for PCP controls...`);
        fetchFullProject(activeModalId);
      }
    }
  }, [
    showCentralModal, showOutsourcedModal, showLogisticsModal, 
    showPreAssemblyModal, showFreightModal, showDeliveryModal, 
    showExpeditionModal, showArchitectModal, showAssemblyModal,
    projects, fetchFullProject
  ]);

  const advance = async (projectId: string, nextStatus: ProductionStatus, extraData: Partial<Project> = {}) => {
    const p = projects.find(proj => proj.id === projectId);
    if (p) {
      logEvent(projectId, 'PROJECT', 'STATUS_CHANGE', p.currentStatus, nextStatus);
      await patchProject(projectId, {
        ...extraData,
        currentStatus: nextStatus,
        history: [...(p.history || []), { status: nextStatus, timestamp: transitionDate ? new Date(transitionDate).toISOString() : new Date().toISOString() }]
      });
      if (nextStatus === 'Finalizada') {
        startCelebration();
      }
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
      setSelectedEnvsForCutting(p ? p.environmentsDetails.filter(e => e.currentStatus === 'Corte').map(e => e.name) : []);
      setCuttingUnitPrice('');
      setCuttingQuantity('');
      setEdgingUnitPrice('');
      setEdgingQuantity('');
      setPackingValue('');
      setMachiningValue('');
      setDrillingValue('');
      setShowSmartImport(false);
      setSmartImportText('');
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
        patchProject(projectId, {
          currentStatus: prevStatus,
          history: [...(p.history || []), { status: prevStatus, timestamp: new Date().toISOString() }]
        });
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
    const project = projects.find(p => p.id === showCentralModal);
    if (!project) return;

    const extraData: Partial<Project> = { productionCentral: centralName };
    const newExpenses: Expense[] = [...(project.expenses || [])];
    const date = new Date().toISOString().split('T')[0];

    const addServiceExpense = (val: string, label: string, cat: string) => {
        const v = Number(val);
        if (v > 0) {
            newExpenses.push({
                id: `${cat.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                description: `${label}: ${centralName}`,
                value: v,
                date: date,
                category: cat
            });
        }
    };

    if (userRole === 'owner') {
        const cTotal = Number(cuttingUnitPrice) * Number(cuttingQuantity);
        const eTotal = Number(edgingUnitPrice) * Number(edgingQuantity);
        
        if (cTotal > 0) {
            newExpenses.push({
                id: `corte-${Date.now()}-1`,
                description: `Serviço Corte: ${centralName} (${cuttingQuantity} un x R$ ${cuttingUnitPrice})`,
                value: cTotal,
                date: date,
                category: 'Corte'
            });
        }
        
        if (eTotal > 0) {
            newExpenses.push({
                id: `fita-${Date.now()}-2`,
                description: `Serviço Fitação: ${centralName} (${edgingQuantity} m x R$ ${edgingUnitPrice})`,
                value: eTotal,
                date: date,
                category: 'Fitação'
            });
        }

        addServiceExpense(packingValue, 'Serviço Embalagem', 'Produção');
        addServiceExpense(machiningValue, 'Serviço Usinagem', 'Produção');
        addServiceExpense(drillingValue, 'Serviço Furação', 'Produção');
    }

    extraData.expenses = newExpenses;

    // --- COMMISSION CALCULATION LOGIC ---
    const totalParts = Object.values(productionPartsCount).reduce((a: number, b: number) => a + b, 0) as number;
    const totalCommissionBudget = (project.value || 0) * 0.10; // 10% of Project Value

    const updatedEnvironments = project.environmentsDetails.map(env => {
      const envParts = (productionPartsCount[env.name] || 0) as number;
      const share = totalParts > 0 ? envParts / totalParts : 1 / project.environmentsDetails.length;
      const calculatedCommission = totalCommissionBudget * share;
      
      const isNewlyCutting = selectedEnvsForCutting.includes(env.name);

      return {
        ...env,
        currentStatus: isNewlyCutting ? ('Corte' as ProductionStatus) : (env.currentStatus || ('Projeto' as ProductionStatus)),
        memorial: {
          ...env.memorial,
          partsCount: envParts
        },
        commissionValue: roundToTwo(calculatedCommission),
        authorizedMdoValue: roundToTwo(calculatedCommission)
      }
    });

    const hasAnyCutting = updatedEnvironments.some(e => e.currentStatus === 'Corte');
    if (hasAnyCutting && project.currentStatus === 'Projeto') {
        extraData.currentStatus = 'Corte' as ProductionStatus;
    }

    // Validate Total Commission (Alert if > 10%) - Though here it is exactly 10%, future edits might change it
    const currentTotalCommission = updatedEnvironments.reduce((acc, env) => acc + (env.commissionValue || 0), 0);
    if (currentTotalCommission > totalCommissionBudget + 0.1) { // Tolerance for float rounding
      alert(`ATENCÃO: O valor total de comissão (R$ ${currentTotalCommission.toFixed(2)}) excede 10% do valor da obra!`);
    }

    extraData.environmentsDetails = updatedEnvironments;

    setPendingProjectData(extraData);
    setShowLogisticsModal(showCentralModal);
    setShowCentralModal(null);
  };

  const savePartsCount = async () => {
    if (!showCentralModal) return;
    const project = projects.find(p => p.id === showCentralModal);
    if (!project) return;

    const totalParts = Object.values(productionPartsCount).reduce((a: number, b: number) => a + b, 0) as number;
    const totalCommissionBudget = (project.value || 0) * 0.10;

    const updatedEnvironments = project.environmentsDetails.map(env => {
      const envParts = (productionPartsCount[env.name] || 0) as number;
      const share = totalParts > 0 ? envParts / totalParts : 1 / project.environmentsDetails.length;
      const calculatedCommission = totalCommissionBudget * share;

      const isNewlyCutting = selectedEnvsForCutting.includes(env.name);

      return {
        ...env,
        currentStatus: isNewlyCutting ? ('Corte' as ProductionStatus) : (env.currentStatus || ('Projeto' as ProductionStatus)),
        memorial: {
          ...env.memorial,
          partsCount: envParts
        },
        commissionValue: roundToTwo(calculatedCommission),
        authorizedMdoValue: roundToTwo(calculatedCommission)
      };
    });

    const hasAnyCutting = updatedEnvironments.some(e => e.currentStatus === 'Corte');
    const nextProjectStatus = (hasAnyCutting && project.currentStatus === 'Projeto') ? ('Corte' as ProductionStatus) : project.currentStatus;

    await patchProject(showCentralModal, {
      environmentsDetails: updatedEnvironments,
      currentStatus: nextProjectStatus
    });
    
    alert("APONTAMENTO DE PEÇAS SALVO!\nOs ambientes selecionados foram marcados como 'Em Corte'.");
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

  const setLogisticsPath = async (projectId: string, path: 'Workshop' | 'Direct') => {
    // Standardize: Use the same advance() function used in other parts of the system
    await advance(projectId, 'Produção', {
      ...pendingProjectData as any,
      deliveryPath: path
    });
    
    setPendingProjectData(null);
    setShowLogisticsModal(null);
  };

  const updateLogistics = (projectId: string, data: Partial<Project>) => {
    patchProject(projectId, data);
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

      {/* PCP Table - Fixed-width columns via colgroup, overflow-x-auto ensures scroll on narrow screens */}
      <div className="rounded-[40px] border-2 border-slate-100 bg-card shadow-2xl overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: '860px' }}>
          <colgroup>
            <col style={{ width: '30%' }} />  {/* Ordem de Serviço */}
            <col style={{ width: '8%' }} />   {/* Insumos */}
            <col style={{ width: '8%' }} />   {/* Terceiros */}
            <col style={{ width: '16%' }} />  {/* Logística */}
            <col style={{ width: '10%' }} />  {/* Status */}
            <col style={{ width: '28%' }} />  {/* Controle */}
          </colgroup>
          <thead>
            <tr className="bg-muted/50 border-b-2 border-slate-100">
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-left">Ordem de Serviço</th>
              <th className="px-3 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">Insumos</th>
              <th className="px-3 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">Terceiros</th>
              <th className="px-3 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">Logística</th>
              <th className="px-3 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">Status</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">Controle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.filter(p => p.currentStatus !== 'Finalizada' && p.currentStatus !== 'Cancelada' && p.currentStatus !== 'Venda').map(project => {
              const incompleteOut = (project.outsourcedServices || []).some(s => !s.supplierName || (s.value || 0) <= 0);
              const allOutReady = (project.outsourcedServices || []).length > 0 && (project.outsourcedServices || []).every(s => s.status === 'Pronto');
              const isDirect = project.deliveryPath === 'Direct';
              const logisticsComplete = project.clientScheduled && project.freightOrganized && project.isExpeditionReady && (isDirect || project.preAssemblyDone);

              return (
                <tr key={project.id} className="hover:bg-muted/30 transition-all group">
                  {/* 1. Ordem de Serviço */}
                  <td className="px-6 py-7">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 text-amber-500 flex items-center justify-center rounded-[16px] font-black italic shadow-lg shrink-0 text-sm">
                        {project.id.slice(-2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-foreground uppercase italic text-base tracking-tighter leading-none truncate" title={project.workName}>
                          {project.workName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic truncate" title={project.clientName}>
                          {project.clientName}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* 2. Insumos */}
                  <td className="px-3 py-7 text-center">
                    <div className={`inline-flex p-2.5 rounded-xl border-2 ${project.materialsDelivered ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100 animate-pulse'}`}>
                      {project.materialsDelivered ? <Unlock size={18} /> : <Lock size={18} />}
                    </div>
                  </td>

                  {/* 3. Terceiros */}
                  <td className="px-3 py-7 text-center">
                    <button
                      onClick={() => setShowOutsourcedModal(project.id)}
                      title="Ver terceirizados"
                      className={`inline-flex p-2.5 rounded-xl border-2 transition-all hover:scale-110 ${incompleteOut ? 'bg-amber-50 text-amber-500 border-amber-200 animate-bounce' : (allOutReady ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : (project.outsourcedServices.length > 0 ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-muted/50 text-slate-300 border-slate-100'))}`}
                    >
                      {incompleteOut ? <AlertTriangle size={18} /> : (allOutReady ? <CheckCircle2 size={18} /> : <Clock size={18} />)}
                    </button>
                  </td>

                  {/* 4. Logística */}
                  <td className="px-3 py-7 text-center">
                    {(project.currentStatus === 'Produção' || project.currentStatus === 'Entrega' || project.currentStatus === 'Instalação') ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <button onClick={() => setShowExpeditionModal(project.id)} className={`p-1.5 rounded-lg border-2 transition-all ${project.isExpeditionReady ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-border text-slate-300 hover:border-indigo-400 hover:text-indigo-400'}`} title="Expedição (Móvel Pronto)">
                            <Box size={13} />
                          </button>
                          {!isDirect && (
                            <button onClick={() => setShowPreAssemblyModal(project.id)} className={`p-1.5 rounded-lg border-2 transition-all ${project.preAssemblyDone ? 'bg-indigo-400 border-indigo-400 text-white' : 'border-border text-slate-300'}`} title="Pré-montagem">
                              <Screwdriver size={13} />
                            </button>
                          )}
                          <button onClick={() => setShowDeliveryModal(project.id)} className={`p-1.5 rounded-lg border-2 transition-all ${project.clientScheduled ? 'bg-amber-500 border-amber-500 text-white' : 'border-border text-slate-300'}`} title="Agendado com Cliente">
                            <Clock size={13} />
                          </button>
                          <button onClick={() => setShowFreightModal(project.id)} className={`p-1.5 rounded-lg border-2 transition-all ${project.freightOrganized ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border text-slate-300'}`} title="Frete Organizado">
                            <Truck size={13} />
                          </button>
                        </div>
                        <p className="text-[7px] font-black uppercase text-slate-400 italic">{isDirect ? 'Direto CLI' : 'Via Oficina'}</p>
                      </div>
                    ) : (
                      <span className="text-slate-200">—</span>
                    )}
                  </td>

                  {/* 5. Status */}
                  <td className="px-3 py-7 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] font-black uppercase border shadow-md ${getStatusBadgeClass(project.currentStatus)} italic tracking-widest whitespace-nowrap`}>
                        {project.currentStatus}
                      </span>
                      {project.currentStatus === 'Corte' && project.environmentsDetails.some(e => e.currentStatus === 'Projeto') && (
                        <span className="text-[7px] font-black text-orange-500 uppercase italic animate-pulse">Corte Parcial</span>
                      )}
                    </div>
                  </td>

                  {/* 6. Controle */}
                  <td className="px-6 py-7 text-right">
                    <div className="flex flex-col items-end gap-2.5">
                      <button
                        onClick={() => setShowAssemblyModal(project.id)}
                        className="px-5 py-2 bg-card border-2 border-border rounded-[14px] text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900 shadow-sm whitespace-nowrap ml-auto"
                        title="Abrir Mapa de Montagem"
                      >
                        <Layers size={13} className="text-amber-500" /> Mapa de Montagem
                      </button>

                      <div className="flex items-center gap-2 justify-end">
                        {project.currentStatus !== 'Venda' && project.currentStatus !== 'Cancelada' && (
                          <button
                            onClick={() => goBackStatus(project.id)}
                            className="p-3 rounded-[14px] bg-muted/50 text-slate-400 hover:bg-red-50 hover:text-red-500 border-2 border-slate-100 hover:border-red-100 transition-all active:scale-95"
                            title="Voltar Etapa Anterior"
                          >
                            <ArrowLeft size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedProjectDeadlines(project);
                            setDeadlineForm({
                              projectDeadlineDate: project.projectDeadlineDate || '',
                              cuttingDeadlineDate: project.cuttingDeadlineDate || '',
                              preAssemblyDeadlineDate: project.preAssemblyDeadlineDate || '',
                              installationDeadlineDate: project.installationDeadlineDate || ''
                            });
                          }}
                          className="p-3 rounded-[14px] bg-muted/50 text-amber-500 hover:bg-amber-50 hover:text-amber-600 border-2 border-slate-100 hover:border-amber-100 transition-all active:scale-95"
                          title="Definir Datas e Prazos PCP"
                        >
                          <CalendarDays size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (project.currentStatus === 'Produção' && !logisticsComplete) {
                              alert(`TRAVA LOGÍSTICA: Complete o checklist logístico (${isDirect ? 'Expedição, Agendamento, Frete' : 'Expedição, Pré-montagem, Agendamento, Frete'}) para avançar.`);
                              return;
                            }
                            updateStatus(project.id);
                          }}
                          className={`px-5 py-3 rounded-[14px] text-[9px] font-black uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 whitespace-nowrap ${project.currentStatus === 'Instalação' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-slate-900 text-white hover:bg-amber-500 hover:text-foreground'}`}
                        >
                          {project.currentStatus === 'Instalação' ? 'Solicitar Vistoria' : 'Avançar Obra'} <ArrowRight size={15} />
                        </button>
                      </div>

                      {/* Ambientes para Instalação/Vistoria */}
                      {(project.currentStatus === 'Instalação' || project.currentStatus === 'Vistoria') && (
                        <div className="flex flex-col gap-1.5 w-full max-w-[210px]">
                          <p className="text-[8px] font-black text-slate-400 uppercase italic tracking-widest text-right">Status por Ambiente</p>
                          {project.environmentsDetails.map(env => (
                            <div key={env.name} className="flex items-center justify-end gap-2 bg-muted/50 p-2 rounded-lg border border-slate-100">
                              <span className="text-[8px] font-black text-foreground uppercase italic truncate">{env.name}</span>
                              <div className="flex gap-1 shrink-0">
                                {!env.isMdoAuthorized ? (
                                  <div className="flex items-center gap-1 bg-red-50 text-red-500 px-1.5 py-0.5 rounded text-[7px] font-black border border-red-100 animate-pulse">
                                    <Lock size={7} /> SEM MDO
                                  </div>
                                ) : (
                                  <>
                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${getStatusBadgeClass(env.currentStatus || 'Instalação' as ProductionStatus)}`}>
                                      {env.currentStatus || 'Instalação'}
                                    </span>
                                    {env.currentStatus !== 'Finalizada' && (
                                      <button
                                        onClick={() => {
                                          const next = env.currentStatus === 'Vistoria' ? 'Finalizada' : 'Vistoria';
                                          updateEnvironmentStatus(project.id, env.name, next as ProductionStatus);
                                        }}
                                        className="p-0.5 bg-slate-900 text-white rounded hover:bg-amber-500 transition-colors"
                                        title={env.currentStatus === 'Vistoria' ? 'Finalizar' : 'Para Vistoria'}
                                      >
                                        <ChevronRight size={9} />
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
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar p-2">
              {userRole === 'owner' && (
                <>
                  <button 
                    onClick={() => setShowSmartImport(!showSmartImport)}
                    className="w-full py-3 bg-indigo-500/10 text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 mb-4 group"
                  >
                    <Brain size={14} className="group-hover:animate-pulse" /> {showSmartImport ? 'Fechar Importação Inteligente' : 'Importar Texto do Orçamento (IA)'}
                  </button>

                  {showSmartImport && (
                    <div className="bg-indigo-50/50 p-6 rounded-[32px] border-2 border-indigo-100 mb-6 animate-in slide-in-from-top-4">
                      <p className="text-[10px] font-black uppercase text-indigo-400 italic mb-3 flex items-center gap-2">
                        <Sparkles size={12} /> Cole aqui o texto do seu orçamento/pedido
                      </p>
                      <textarea 
                        className="w-full h-32 bg-white/80 border-2 border-indigo-100 rounded-2xl p-4 text-xs font-bold outline-none focus:border-indigo-500 transition-all resize-none shadow-inner"
                        placeholder="Ex: DESLOCAMENTO SERRA 173 un x 3,40..."
                        value={smartImportText}
                        onChange={e => setSmartImportText(e.target.value)}
                      />
                      <button 
                        onClick={() => {
                          const text = smartImportText.toUpperCase();
                          
                          // Improved Regex Patterns based on screenshot
                          // Structure: [Name/Desc] [Code] [Qty] SV [UnitPrice] [Total]
                          
                          // Corte (Deslocamento Serra)
                          const corteMatch = text.match(/SERRA.*?(\d+)\s+SV.*?([\d,.]+)\s+[\d,.]+$/m) || 
                                           text.match(/SERRA.*?(\d+)\s+SV.*?([\d,.]+)/);
                          if (corteMatch) {
                            setCuttingQuantity(corteMatch[1]);
                            setCuttingUnitPrice(corteMatch[2].replace(',', '.'));
                          }

                          // Fitação (Aplicação de Fita)
                          const fitaMatch = text.match(/FITA.*?(\d+)\s+SV.*?([\d,.]+)\s+[\d,.]+$/m) || 
                                          text.match(/FITA.*?(\d+)\s+SV.*?([\d,.]+)/);
                          if (fitaMatch) {
                            setEdgingQuantity(fitaMatch[1]);
                            setEdgingUnitPrice(fitaMatch[2].replace(',', '.'));
                          }

                          setShowSmartImport(false);
                          setSmartImportText('');
                        }}
                        className="w-full mt-3 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-200 hover:bg-slate-900 transition-all"
                      >
                        Processar com IA Hypado
                      </button>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* CORTE */}
                    <div className="bg-orange-50/30 p-6 rounded-[32px] border-2 border-orange-100/50">
                      <div className="flex justify-between items-center mb-4 px-2">
                        <label className="text-[10px] font-black uppercase text-orange-600 italic">Serviço de Corte (Serra)</label>
                        {(Number(cuttingUnitPrice) * Number(cuttingQuantity)) > 0 && (
                          <span className="text-xs font-black text-orange-600">Subtotal: R$ {(Number(cuttingUnitPrice) * Number(cuttingQuantity)).toFixed(2)}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase italic ml-2">Preço Unitário</p>
                          <input type="number" className="w-full px-4 py-3 bg-white border-2 border-orange-100 rounded-2xl text-lg font-black outline-none focus:border-orange-500 transition-all" placeholder="0,00" value={cuttingUnitPrice} onChange={e => setCuttingUnitPrice(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase italic ml-2">Quantidade (SV)</p>
                          <input type="number" className="w-full px-4 py-3 bg-white border-2 border-orange-100 rounded-2xl text-lg font-black outline-none focus:border-orange-500 transition-all" placeholder="0" value={cuttingQuantity} onChange={e => setCuttingQuantity(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* FITAÇÃO */}
                    <div className="bg-blue-50/30 p-6 rounded-[32px] border-2 border-blue-100/50">
                      <div className="flex justify-between items-center mb-4 px-2">
                        <label className="text-[10px] font-black uppercase text-blue-600 italic">Serviço de Fitação (Aplicação)</label>
                        {(Number(edgingUnitPrice) * Number(edgingQuantity)) > 0 && (
                          <span className="text-xs font-black text-blue-600">Subtotal: R$ {(Number(edgingUnitPrice) * Number(edgingQuantity)).toFixed(2)}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase italic ml-2">Preço Unitário</p>
                          <input type="number" className="w-full px-4 py-3 bg-white border-2 border-blue-100 rounded-2xl text-lg font-black outline-none focus:border-blue-500 transition-all" placeholder="0,00" value={edgingUnitPrice} onChange={e => setEdgingUnitPrice(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase italic ml-2">Metragem/Quant.</p>
                          <input type="number" className="w-full px-4 py-3 bg-white border-2 border-blue-100 rounded-2xl text-lg font-black outline-none focus:border-blue-500 transition-all" placeholder="0" value={edgingQuantity} onChange={e => setEdgingQuantity(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* OUTROS */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/30 p-4 rounded-[28px] border-2 border-slate-100">
                        <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-2 text-center">Embalagem R$</label>
                        <input type="number" className="w-full px-2 py-2 bg-transparent text-center text-sm font-black outline-none" placeholder="0,00" value={packingValue} onChange={e => setPackingValue(e.target.value)} />
                      </div>
                      <div className="bg-muted/30 p-4 rounded-[28px] border-2 border-slate-100">
                        <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-2 text-center">Usinagem R$</label>
                        <input type="number" className="w-full px-2 py-2 bg-transparent text-center text-sm font-black outline-none" placeholder="0,00" value={machiningValue} onChange={e => setMachiningValue(e.target.value)} />
                      </div>
                      <div className="bg-muted/30 p-4 rounded-[28px] border-2 border-slate-100">
                        <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-2 text-center">Furação R$</label>
                        <input type="number" className="w-full px-2 py-2 bg-transparent text-center text-sm font-black outline-none" placeholder="0,00" value={drillingValue} onChange={e => setDrillingValue(e.target.value)} />
                      </div>
                    </div>

                    {/* TOTAL GERAL BOX */}
                    {(Number(cuttingUnitPrice) * Number(cuttingQuantity) + Number(edgingUnitPrice) * Number(edgingQuantity) + Number(packingValue) + Number(machiningValue) + Number(drillingValue)) > 0 && (
                      <div className="bg-slate-900 p-8 rounded-[40px] text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] italic mb-2 relative z-10">Total Industrial Estimado</p>
                        <p className="text-4xl font-black text-white italic tracking-tighter relative z-10">
                          R$ {(Number(cuttingUnitPrice) * Number(cuttingQuantity) + Number(edgingUnitPrice) * Number(edgingQuantity) + Number(packingValue) + Number(machiningValue) + Number(drillingValue)).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="bg-muted/50 p-6 rounded-[28px] border-2 border-slate-100 space-y-4">
                <h5 className="text-xs font-black uppercase text-slate-400 italic ml-2">Apontamento de Peças (Plano de Corte)</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.find(p => p.id === showCentralModal)?.environmentsDetails.map(env => (
                    <div key={env.name} className={`bg-card p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${selectedEnvsForCutting.includes(env.name) ? 'border-orange-500 bg-orange-50/10' : 'border-border'}`}>
                      <input 
                        title="Selecionar para Corte"
                        type="checkbox"
                        className="w-5 h-5 rounded-lg border-2 border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                        checked={selectedEnvsForCutting.includes(env.name)}
                        onChange={() => {
                          setSelectedEnvsForCutting(prev => 
                            prev.includes(env.name) ? prev.filter(e => e !== env.name) : [...prev, env.name]
                          )
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block">{env.name}</label>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${env.currentStatus === 'Corte' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {env.currentStatus || 'Projeto'}
                          </span>
                        </div>
                        <input
                          type="number"
                          placeholder="Qtd Peças"
                          className="w-full text-lg font-black outline-none bg-transparent"
                          value={productionPartsCount[env.name] || ''}
                          onChange={e => setProductionPartsCount(prev => ({ ...prev, [env.name]: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mt-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Data da Transição (Opcional)</label>
                  <input 
                    title="Data de Transição"
                    type="date" 
                    className="w-full bg-muted/50 border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-bold outline-none" 
                    value={transitionDate}
                    onChange={e => setTransitionDate(e.target.value)}
                  />
                </div>
                
                <button 
                  onClick={savePartsCount}
                  className="w-full py-3 bg-amber-500/10 text-amber-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <Save size={14} /> Salvar Apontamento
                </button>
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

            <div className="space-y-2 mt-12 max-w-xs mx-auto text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Data da Transição (Opcional)</label>
              <input 
                title="Data de Transição"
                type="date" 
                className="w-full bg-muted/50 border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-bold outline-none" 
                value={transitionDate}
                onChange={e => setTransitionDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {showPreAssemblyModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setShowPreAssemblyModal(null)} />
          <div className="relative bg-card w-full max-w-md rounded-[48px] shadow-2xl p-10 animate-in zoom-in-95">
            <h4 className="text-2xl font-black uppercase italic mb-6 tracking-tighter leading-none">Equipe de Pré-montagem</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 italic">Quem realizou o serviço na oficina?</p>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {installers.filter(i => i.role === 'Marceneiro' || i.role === 'Ajudante').map(inst => {
                const isSelected = tempPreAssemblyTeam.includes(inst.id);
                return (
                  <button
                    key={inst.id}
                    onClick={() => {
                      const nextTeam = isSelected 
                        ? tempPreAssemblyTeam.filter(id => id !== inst.id) 
                        : [...tempPreAssemblyTeam, inst.id];
                      setTempPreAssemblyTeam(nextTeam);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.02]' : 'bg-muted/50 border-slate-100 text-muted-foreground hover:border-border'}`}
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

            <div className="space-y-2 mt-6">
              <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Data da Transição (Opcional)</label>
              <input 
                title="Data de Transição"
                type="date" 
                className="w-full bg-muted/50 border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-bold outline-none" 
                value={transitionDate}
                onChange={e => setTransitionDate(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => {
                if (tempPreAssemblyTeam.length > 0) {
                  updateLogistics(showPreAssemblyModal, { 
                    preAssemblyTeam: tempPreAssemblyTeam,
                    preAssemblyDone: true 
                  });
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
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Data da Transição (Opcional)</label>
                <input 
                  title="Data de Transição"
                  type="date" 
                  className="w-full bg-muted/50 border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-bold outline-none" 
                  value={transitionDate}
                  onChange={e => setTransitionDate(e.target.value)}
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

      {/* MODAL: EXPEDIÇÃO (NOVA ETAPA SENSACIONAL) */}
      {showExpeditionModal && (() => {
        const project = projects.find(p => p.id === showExpeditionModal);
        if (!project) return null;

        return (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setShowExpeditionModal(null)} />
            <div className="relative bg-card w-full max-w-md rounded-[48px] shadow-2xl p-10 animate-in zoom-in-95 border-b-8 border-indigo-500">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-3xl font-black uppercase italic tracking-tighter leading-none text-indigo-600">Expedição</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Móvel Pronto para Entrega</p>
                </div>
                <div className="p-4 bg-indigo-500 text-white rounded-3xl shadow-lg shadow-indigo-500/30">
                  <Box size={32} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 italic mb-2">Status da Obra</p>
                  <p className="text-xl font-black text-foreground uppercase italic">{project.workName}</p>
                  <p className="text-sm font-bold text-muted-foreground mt-1">{project.clientName}</p>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => {
                      const newState = !project.isExpeditionReady;
                      updateLogistics(showExpeditionModal, { isExpeditionReady: newState });
                      if (newState) {
                        startCelebration();
                        alert("Móvel marcado como PRONTO NA EXPEDIÇÃO! 📦✨");
                      } else {
                        alert("Móvel removido da expedição.");
                      }
                    }}
                    className={`w-full py-5 rounded-3xl font-black uppercase italic tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${project.isExpeditionReady ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
                  >
                    {project.isExpeditionReady ? <X size={24} /> : <Box size={24} />}
                    {project.isExpeditionReady ? 'Remover da Expedição' : 'Marcar como Pronto'}
                  </button>

                  <button
                    onClick={() => {
                      const client = clients.find(c => c.name === project.clientName);
                      if (!client?.phone) {
                        alert("Cliente sem telefone cadastrado.");
                        return;
                      }
                      const phone = client.phone.replace(/\D/g, '');
                      
                      const message = `*MÓVEL EM EXPEDIÇÃO - HYPADO PLANEJADOS* 📦✨\n\n` +
                        `Olá *${client.name.split(' ')[0]}*! Tudo bem?\n\n` +
                        `Temos uma notícia **SENSACIONAL**! 🚀\n` +
                        `O seu projeto *${project.workName}* acabou de passar pela nossa conferência final e já está na área de **EXPEDIÇÃO**.\n\n` +
                        `✅ Peças conferidas\n` +
                        `✅ Qualidade garantida\n` +
                        `✅ Tudo pronto para transformar seu ambiente!\n\n` +
                        `Agora falta pouco! Vamos agendar o melhor dia para a sua entrega?`;

                      const link = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
                      window.open(link, '_blank');
                    }}
                    className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black uppercase italic tracking-widest hover:bg-emerald-600 transition-all shadow-xl flex items-center justify-center gap-3"
                  >
                    <Sparkles size={24} className="animate-pulse" /> Notificar Cliente (Link Sensacional)
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowExpeditionModal(null)}
                className="w-full mt-8 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        );
      })()}

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
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Data da Transição (Opcional)</label>
                <input 
                  title="Data de Transição"
                  type="date" 
                  className="w-full bg-muted/50 border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-bold outline-none" 
                  value={transitionDate}
                  onChange={e => setTransitionDate(e.target.value)}
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
      
      {/* MODAL PARA DEFINIÇÃO DE PRAZOS DO PCP */}
      {selectedProjectDeadlines && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[48px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">
                    Datas e Prazos PCP
                  </h4>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 truncate max-w-[280px]">
                    {selectedProjectDeadlines.workName}
                  </p>
                </div>
                <button 
                  title="Fechar" 
                  onClick={() => setSelectedProjectDeadlines(null)} 
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await patchProject(selectedProjectDeadlines.id, {
                      project_deadline_date: deadlineForm.projectDeadlineDate || null,
                      cutting_deadline_date: deadlineForm.cuttingDeadlineDate || null,
                      pre_assembly_deadline_date: deadlineForm.preAssemblyDeadlineDate || null,
                      installation_deadline_date: deadlineForm.installationDeadlineDate || null
                    });
                    setSelectedProjectDeadlines(null);
                    alert("Prazos do PCP atualizados com sucesso!");
                  } catch (err: any) {
                    console.error("Erro ao atualizar prazos:", err);
                    alert("Erro ao atualizar prazos: " + err.message);
                  }
                }} 
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Prazo do Projeto (Desenho)</label>
                  <input 
                    type="date"
                    className="w-full p-4 rounded-[20px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner animate-in fade-in-50"
                    value={deadlineForm.projectDeadlineDate}
                    onChange={e => setDeadlineForm({ ...deadlineForm, projectDeadlineDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Prazo de Entrega do Corte</label>
                  <input 
                    type="date"
                    className="w-full p-4 rounded-[20px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner animate-in fade-in-50"
                    value={deadlineForm.cuttingDeadlineDate}
                    onChange={e => setDeadlineForm({ ...deadlineForm, cuttingDeadlineDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Prazo de Pré-Montagem</label>
                  <input 
                    type="date"
                    className="w-full p-4 rounded-[20px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner animate-in fade-in-50"
                    value={deadlineForm.preAssemblyDeadlineDate}
                    onChange={e => setDeadlineForm({ ...deadlineForm, preAssemblyDeadlineDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Prazo de Instalação</label>
                  <input 
                    type="date"
                    className="w-full p-4 rounded-[20px] bg-slate-50 border-none outline-none font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-inner animate-in fade-in-50"
                    value={deadlineForm.installationDeadlineDate}
                    onChange={e => setDeadlineForm({ ...deadlineForm, installationDeadlineDate: e.target.value })}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white p-5 rounded-[20px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 mt-4 animate-in slide-in-from-bottom-2 duration-300"
                >
                  Salvar Prazos
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <Confetti active={triggerConfetti} />
    </div >
  );
};

export default PCPView;
