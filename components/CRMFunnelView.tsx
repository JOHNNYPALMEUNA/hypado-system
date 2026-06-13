import React, { useState } from 'react';
import { Project, Client, ProductionStatus } from '../types';
import { useData } from '../contexts/DataContext';
import { generateFollowUpMessage, analyzeSalesPipeline } from '../geminiService';
import {
  Plus,
  Search,
  MessageSquare,
  Clock,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  X,
  User,
  DollarSign,
  TrendingUp,
  Sparkles,
  Phone,
  Mail,
  Loader2,
  Copy,
  ExternalLink,
  BarChart3,
  FileText,
  ArrowRight,
  TrendingDown
} from 'lucide-react';

interface CRMFunnelViewProps {
  projects: Project[];
  clients: Client[];
}

const CRM_STAGES = [
  'Sem tarefa',
  'Folow up (Whatsapp)',
  'Gerar orçamento',
  'Apresentação da proposta'
];

const CRMFunnelView: React.FC<CRMFunnelViewProps> = ({ projects, clients }) => {
  const { addProject, updateProject, deleteProject, addClient, userRole } = useData();

  // Top tabs: Board vs. Reports
  const [activeView, setActiveView] = useState<'board' | 'reports'>('board');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('Todos');

  // Modals
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Client Selection type: 'existing' or 'new'
  const [clientSelectionType, setClientSelectionType] = useState<'existing' | 'new'>('existing');
  const [selectedClientId, setSelectedClientId] = useState('');

  // Form State for New Lead
  const [newLeadData, setNewLeadData] = useState({
    clientName: '',
    phone: '',
    email: '',
    workName: '',
    value: '',
    crmStage: 'Sem tarefa',
    seller: '',
    description: '',
    environments: [] as string[],
    promisedDate: '',
    cep: '',
    address: '',
    quadra: '',
    lote: '',
    cpf: '',
    isCorporate: false,
    sendNotifications: true,
    storeName: 'Hypado Planejados',
    leadSource: '',
    hasAddress: false,
    isCompleteRegistration: false
  });

  // Form State for Editing Lead
  const [editLeadData, setEditLeadData] = useState({
    value: 0,
    crmStage: 'Sem tarefa',
    seller: '',
    description: '',
    workName: '',
    promisedDate: ''
  });

  // AI Message Generation State
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');

  // AI Pipeline Analysis State
  const [isAnalyzingPipeline, setIsAnalyzingPipeline] = useState(false);
  const [pipelineReport, setPipelineReport] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const fetchAddressForLead = async (cep: string) => {
    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        const fullAddress = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
        setNewLeadData(prev => ({ ...prev, address: fullAddress }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleLeadInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'cep') {
      const cleanCep = value.replace(/\D/g, '').substring(0, 8);
      setNewLeadData(prev => ({ ...prev, [name]: cleanCep }));
      if (cleanCep.length === 8) fetchAddressForLead(cleanCep);
    } else {
      setNewLeadData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Filter projects that are in the 'Venda' stage
  const activeLeads = (projects || []).filter(p => p.currentStatus === 'Venda');

  // Sellers list for filtering
  const sellersList = Array.from(
    new Set(activeLeads.map(p => p.team).filter(Boolean))
  );

  // Filtered Leads
  const filteredLeads = activeLeads.filter(lead => {
    const matchesSearch =
      lead.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.addressStreet || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeller =
      selectedSeller === 'Todos' || lead.team === selectedSeller;

    return matchesSearch && matchesSeller;
  });

  // Calculate Column metrics
  const getStageMetrics = (stage: string) => {
    const stageLeads = filteredLeads.filter(p => (p.crmStage || 'Sem tarefa') === stage);
    const count = stageLeads.length;
    const totalValue = stageLeads.reduce((sum, p) => sum + (p.value || 0), 0);
    return { count, totalValue };
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('text/plain', projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('text/plain');
    if (!projectId) return;

    const project = projects.find(p => p.id === projectId);
    if (project) {
      const updatedProject = { ...project, crmStage: newStage };
      try {
        await updateProject(updatedProject);
      } catch (error) {
        console.error('Error updating crmStage on drop:', error);
      }
    }
  };

  // Handle client selection change
  const handleExistingClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setNewLeadData(prev => ({
        ...prev,
        clientName: client.name,
        phone: client.phone || '',
        email: client.email || ''
      }));
    }
  };

  // Quick Create Lead Submit
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientSelectionType === 'existing' && !selectedClientId) {
      alert('Por favor, selecione um cliente existente.');
      return;
    }
    if (clientSelectionType === 'new' && !newLeadData.clientName) {
      alert('Por favor, digite o nome do cliente.');
      return;
    }
    if (!newLeadData.workName) {
      alert('Por favor, preencha o apelido do projeto.');
      return;
    }

    let clientId = selectedClientId;

    // Create client if new
    if (clientSelectionType === 'new') {
      clientId = `c-${Date.now()}`;
      const newClient: Client = {
        id: clientId,
        name: newLeadData.clientName,
        phone: newLeadData.phone || '(00) 00000-0000',
        email: newLeadData.email || '',
        address: newLeadData.hasAddress ? newLeadData.address : '',
        quadra: newLeadData.hasAddress ? newLeadData.quadra : '',
        lote: newLeadData.hasAddress ? newLeadData.lote : '',
        description: newLeadData.isCompleteRegistration ? newLeadData.description : '',
        cpf: newLeadData.isCompleteRegistration ? newLeadData.cpf : '',
        isCorporate: newLeadData.isCorporate,
        sendNotifications: newLeadData.sendNotifications,
        storeName: newLeadData.storeName || 'Hypado Planejados',
        leadSource: newLeadData.leadSource || '',
        projectsCount: 1,
        averageRating: 0,
        lastVisit: new Date().toISOString().split('T')[0]
      };
      await addClient(newClient);
    }

    // Create Project/Lead
    const newProject: Project = {
      id: `os-${Date.now()}`,
      clientId: clientId,
      clientName: newLeadData.clientName,
      workName: newLeadData.workName,
      environments: newLeadData.environments.length > 0 ? newLeadData.environments : ['Geral'],
      environmentsDetails: (newLeadData.environments.length > 0 ? newLeadData.environments : ['Geral']).map(env => ({
        name: env,
        type: 'Geral',
        value: 0,
        memorial: { mdfParts: [], fitacao: '', fundo: '', hardwareItems: [], appliances: [] }
      })),
      contractDate: new Date().toISOString().split('T')[0],
      promisedDate: newLeadData.promisedDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      currentStatus: 'Venda',
      crmStage: newLeadData.crmStage,
      value: parseFloat(newLeadData.value) || 0,
      team: newLeadData.seller || 'Sem Vendedor',
      expenses: [],
      workAddress: '',
      outsourcedServices: [],
      history: [{ status: 'Venda', timestamp: new Date().toISOString() }],
      registrationDate: new Date().toISOString().split('T')[0]
    };

    try {
      await addProject(newProject);
      setIsLeadModalOpen(false);
      // Reset form
      setNewLeadData({
        clientName: '',
        phone: '',
        email: '',
        workName: '',
        value: '',
        crmStage: 'Sem tarefa',
        seller: '',
        description: '',
        environments: [],
        promisedDate: '',
        cep: '',
        address: '',
        quadra: '',
        lote: '',
        cpf: '',
        isCorporate: false,
        sendNotifications: true,
        storeName: 'Hypado Planejados',
        leadSource: '',
        hasAddress: false,
        isCompleteRegistration: false
      });
      setSelectedClientId('');
    } catch (err: any) {
      console.error("Erro ao criar oportunidade/cliente:", err);
      alert(`Erro ao criar oportunidade/cliente: ${err.message || JSON.stringify(err)}`);
    }
  };

  // Open Edit Modal
  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setGeneratedMessage('');
    setEditLeadData({
      value: project.value || 0,
      crmStage: project.crmStage || 'Sem tarefa',
      seller: project.team || '',
      description: project.workAddress || '', // using workAddress as notes
      workName: project.workName || '',
      promisedDate: project.promisedDate || ''
    });
    setIsEditModalOpen(true);
  };

  // Submit Lead Updates
  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    const updated = {
      ...editingProject,
      value: editLeadData.value,
      crmStage: editLeadData.crmStage,
      team: editLeadData.seller,
      workAddress: editLeadData.description,
      workName: editLeadData.workName,
      promisedDate: editLeadData.promisedDate
    };

    try {
      await updateProject(updated);
      setIsEditModalOpen(false);
      setEditingProject(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Close/Win Deal (Convert to active project)
  const handleCloseDeal = async (project: Project) => {
    if (confirm(`Parabéns pelo fechamento! Confirmar início do projeto executivo para: "${project.workName}"?`)) {
      const updated = {
        ...project,
        currentStatus: 'Projeto' as ProductionStatus,
        contractDate: new Date().toISOString().split('T')[0],
        history: [...(project.history || []), { status: 'Projeto' as ProductionStatus, timestamp: new Date().toISOString() }]
      };

      try {
        await updateProject(updated);
        setIsEditModalOpen(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Lead Deletion
  const handleDeleteLead = async (projectId: string) => {
    if (confirm('Tem certeza que deseja excluir esta oportunidade/lead?')) {
      try {
        await deleteProject(projectId);
        setIsEditModalOpen(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Generate AI Follow up Message
  const triggerGenerateFollowUp = async () => {
    if (!editingProject) return;
    setIsGeneratingMessage(true);
    setGeneratedMessage('');

    try {
      const message = await generateFollowUpMessage({
        clientName: editingProject.clientName,
        workName: editingProject.workName,
        value: editLeadData.value,
        crmStage: editLeadData.crmStage,
        team: editLeadData.seller || 'Equipe',
        environments: editingProject.environments,
        notes: editLeadData.description
      });
      setGeneratedMessage(message);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  // Copy Generated Message to Clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    alert('Mensagem copiada para a área de transferência!');
  };

  // Send WhatsApp with customized message
  const handleSendWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(text);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  // Open WhatsApp with a default friendly message
  const openWhatsApp = (phone: string, clientName: string, workName: string) => {
    const defaultText = `Olá, ${clientName}! Tudo bem? Gostaria de saber como está o andamento do seu projeto ${workName}. Ficamos à disposição!`;
    handleSendWhatsApp(phone, defaultText);
  };

  // Trigger AI Pipeline Analysis
  const triggerPipelineAnalysis = async () => {
    setIsAnalyzingPipeline(true);
    setPipelineReport('');
    try {
      const report = await analyzeSalesPipeline(filteredLeads);
      setPipelineReport(report);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzingPipeline(false);
    }
  };

  // Calculate Pipeline Metrics
  const pipelineTotal = filteredLeads.reduce((sum, p) => sum + (p.value || 0), 0);
  const totalLeadsCount = filteredLeads.length;

  // Render Pipeline Report/Analysis Tab
  const renderReportsTab = () => {
    // Stage counts for funnel visualization
    const stageCounts = CRM_STAGES.map(stage => ({
      stage,
      count: filteredLeads.filter(p => (p.crmStage || 'Sem tarefa') === stage).length,
      value: filteredLeads.filter(p => (p.crmStage || 'Sem tarefa') === stage).reduce((sum, p) => sum + (p.value || 0), 0)
    }));

    const maxCount = Math.max(...stageCounts.map(s => s.count)) || 1;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
        
        {/* Funnel Chart Box */}
        <div className="lg:col-span-1 bg-card text-card-foreground border border-border p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-black text-sm uppercase tracking-wider text-foreground mb-1 flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" /> Conversão do Funil
            </h4>
            <p className="text-xs text-muted-foreground mb-6">Taxa de retenção e acúmulo por etapa comercial.</p>

            {/* Funnel visualization */}
            <div className="space-y-4">
              {stageCounts.map((sc, index) => {
                const widthPercent = Math.max(30, (sc.count / maxCount) * 100);
                const colors = [
                  'bg-indigo-500/20 border-indigo-500/30 text-indigo-500',
                  'bg-sky-500/20 border-sky-500/30 text-sky-500',
                  'bg-amber-500/20 border-amber-500/30 text-amber-500',
                  'bg-emerald-500/20 border-emerald-500/30 text-emerald-500'
                ];

                return (
                  <div key={sc.stage} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-foreground">
                      <span>{sc.stage}</span>
                      <span>{sc.count} leads (R$ {(sc.value / 1000).toFixed(0)}k)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-8 overflow-hidden relative border border-border">
                      <div
                        className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500 flex items-center pl-3 border-r-2`}
                        style={{ width: `${widthPercent}%` }}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {Math.round((sc.count / (totalLeadsCount || 1)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-6 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <Clock size={16} className="shrink-0 text-slate-400 mt-0.5" />
            <span>
              Mantenha o funil balanceado! Se a etapa de <strong>Apresentação</strong> estiver muito vazia comparada ao <strong>Orçamento</strong>, foque em agendar reuniões com urgência.
            </span>
          </div>
        </div>

        {/* AI Analytics Panel */}
        <div className="lg:col-span-2 bg-card text-card-foreground border border-border p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h4 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Sparkles size={16} className="text-primary animate-pulse" /> Analista de Vendas IA
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Diagnóstico completo do seu pipeline comercial gerado por Inteligência Artificial.</p>
              </div>

              <button
                onClick={triggerPipelineAnalysis}
                disabled={isAnalyzingPipeline || filteredLeads.length === 0}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isAnalyzingPipeline ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Analisar Pipeline
                  </>
                )}
              </button>
            </div>

            {/* Analysis Output Container */}
            <div className="bg-background border border-border p-5 rounded-2xl min-h-[350px] overflow-y-auto max-h-[400px] custom-scrollbar">
              {isAnalyzingPipeline ? (
                <div className="h-60 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 size={32} className="text-primary animate-spin" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
                    Gemini está avaliando seus leads e estatísticas de vendas...
                  </p>
                </div>
              ) : pipelineReport ? (
                <div className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground space-y-4 whitespace-pre-line">
                  {pipelineReport}
                </div>
              ) : (
                <div className="h-60 flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <FileText size={40} className="text-slate-400" />
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {filteredLeads.length === 0 
                      ? 'Nenhum lead ativo para analisar no funil' 
                      : 'Clique no botão acima para solicitar a análise da IA'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-4 border-t border-border pt-4">
            Análise alimentada pelo modelo Gemini 2.0. Os pesos de probabilidade de conversão são estimados.
          </p>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* View Switcher: Board vs Reports */}
      <div className="flex justify-between items-center bg-card border border-border px-4 py-2 rounded-2xl shadow-sm">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveView('board')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${activeView === 'board' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Quadro Kanban
          </button>
          <button
            onClick={() => setActiveView('reports')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${activeView === 'reports' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            📊 Relatórios & IA
          </button>
        </div>
        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest hidden sm:block">
          CRM Hypado Planejados
        </div>
      </div>

      {activeView === 'board' ? (
        <>
          {/* 1. TOP STATS BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Metric 1 */}
            <div className="bg-card text-card-foreground border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Total em Negociação</p>
                <p className="text-xl font-black text-foreground mt-1">
                  R$ {pipelineTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <DollarSign size={24} />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-card text-card-foreground border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Oportunidades</p>
                <p className="text-2xl font-black text-foreground mt-1">{totalLeadsCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <TrendingUp size={24} />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-card text-card-foreground border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Apresentações</p>
                <p className="text-2xl font-black text-foreground mt-1">
                  {filteredLeads.filter(p => p.crmStage === 'Apresentação da proposta').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Sparkles size={22} />
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-card text-card-foreground border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Sem Vendedor</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-500 mt-1">
                  {filteredLeads.filter(p => !p.team || p.team === 'Sem Vendedor').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-500">
                <AlertTriangle size={22} />
              </div>
            </div>

            {/* Metric 5 */}
            <div className="bg-card text-card-foreground border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Orçamentos</p>
                <p className="text-2xl font-black text-sky-600 dark:text-sky-450 mt-1">
                  {filteredLeads.filter(p => p.crmStage === 'Gerar orçamento').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-450">
                <Clock size={22} />
              </div>
            </div>
          </div>

          {/* 2. FILTER & ACTION HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-4 border border-border rounded-2xl">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Pesquisar por cliente, local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-foreground text-sm outline-none focus:border-primary/50 transition-all font-medium placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2 text-xs text-muted-foreground font-bold">
                <User size={14} />
                <select
                  value={selectedSeller}
                  onChange={(e) => setSelectedSeller(e.target.value)}
                  className="bg-transparent text-foreground outline-none border-none cursor-pointer font-medium"
                >
                  <option value="Todos" className="bg-card text-foreground">Vendedores: Todos</option>
                  {sellersList.map(seller => (
                    <option key={seller} value={seller} className="bg-card text-foreground">{seller}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsLeadModalOpen(true)}
                className="flex-1 md:flex-initial bg-primary hover:bg-primary-hover text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
              >
                <Plus size={16} />
                NOVO LEAD
              </button>
            </div>
          </div>

          {/* 3. KANBAN BOARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {CRM_STAGES.map(stage => {
              const stageLeads = filteredLeads.filter(p => (p.crmStage || 'Sem tarefa') === stage);
              const { count, totalValue } = getStageMetrics(stage);

              return (
                <div
                  key={stage}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, stage)}
                  className="bg-muted/40 border border-border rounded-3xl p-4 flex flex-col min-h-[600px] shadow-sm relative overflow-hidden group"
                >
                  <div className="pb-3 mb-4 border-b border-border flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-sm text-foreground uppercase tracking-wider">{stage}</h4>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase mt-1 block">
                        {count} {count === 1 ? 'oportunidade' : 'oportunidades'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        R$ {(totalValue / 1000).toFixed(1)}k
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 overflow-y-auto max-h-[550px] custom-scrollbar pr-1">
                    {stageLeads.length === 0 ? (
                      <div className="h-40 border border-dashed border-border rounded-2xl flex items-center justify-center text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Arrastar leads aqui
                      </div>
                    ) : (
                      stageLeads.map(lead => {
                        const client = clients.find(c => c.id === lead.clientId);

                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onClick={() => openEditModal(lead)}
                            className="bg-card hover:bg-muted/30 border border-border hover:border-primary/40 p-4 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing transition-all group/card relative overflow-hidden"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary transform scale-y-0 group-hover/card:scale-y-100 transition-transform"></div>

                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h5 className="font-bold text-foreground text-sm leading-tight group-hover/card:text-primary transition-colors">
                                {lead.workName}
                              </h5>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(lead);
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                              >
                                <Edit3 size={14} />
                              </button>
                            </div>

                            <div className="space-y-1 text-xs text-muted-foreground font-medium mb-3">
                              <p className="text-foreground font-semibold">{lead.clientName}</p>
                              <p className="text-muted-foreground truncate">{lead.environments.join(', ')}</p>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-border">
                              <div>
                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Valor Estimado</p>
                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </p>
                              </div>

                              {client?.phone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openWhatsApp(client.phone, lead.clientName, lead.workName);
                                  }}
                                  title="Chamar no WhatsApp"
                                  className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all duration-200"
                                >
                                  <MessageSquare size={14} />
                                </button>
                              )}
                            </div>

                            <div className="flex justify-between items-center mt-3 text-[10px] text-muted-foreground font-semibold uppercase">
                              <div className="flex items-center gap-1">
                                <User size={10} />
                                <span>{lead.team || 'Sem Vendedor'}</span>
                              </div>
                              <div className="bg-muted border border-border rounded-full px-2 py-0.5 text-primary font-bold">
                                {lead.registrationDate ? (
                                  `${Math.ceil((Date.now() - new Date(lead.registrationDate).getTime()) / (86400000))} dias`
                                ) : (
                                  'Lead Novo'
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        renderReportsTab()
      )}

      {/* 4. NEW LEAD MODAL */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <h4 className="text-lg font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Plus className="text-primary" size={20} /> Cadastrar Nova Oportunidade
              </h4>
              <button
                onClick={() => setIsLeadModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              
              {/* Client Choice Switcher */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-border pb-1">
                  <h5 className="text-xs font-black text-primary uppercase tracking-widest">Dados do Cliente</h5>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setClientSelectionType('existing')}
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${clientSelectionType === 'existing' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      Existente
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientSelectionType('new')}
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${clientSelectionType === 'new' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      Novo Cadastro
                    </button>
                  </div>
                </div>
                
                {clientSelectionType === 'existing' ? (
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Escolha o Cliente</label>
                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => handleExistingClientSelect(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all font-semibold"
                    >
                      <option value="" className="bg-card text-foreground">Selecionar cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id} className="bg-card text-foreground">{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    {/* Toggle: Pessoa jurídica */}
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                        Pessoa jurídica: <span className="text-primary font-black ml-1">{newLeadData.isCorporate ? 'Sim' : 'Não'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewLeadData(prev => ({ ...prev, isCorporate: !prev.isCorporate }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${newLeadData.isCorporate ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${newLeadData.isCorporate ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Campo: Nome */}
                    <div>
                      <label className="text-[10px] font-bold text-foreground uppercase mb-1 block">
                        * Nome do Cliente
                      </label>
                      <input
                        type="text"
                        name="clientName"
                        value={newLeadData.clientName}
                        onChange={handleLeadInputChange}
                        placeholder={newLeadData.isCorporate ? "Razão Social ou Nome Fantasia" : "Nome Completo do Cliente"}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all font-semibold"
                        required
                      />
                    </div>

                    {/* Campo: Celular Principal (com Alerta Rosa) */}
                    <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl space-y-2">
                      <label className="text-[10px] font-bold text-foreground uppercase block">
                        * Celular Principal
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={newLeadData.phone}
                        onChange={handleLeadInputChange}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all font-semibold"
                        required
                      />
                      <p className="text-[9px] text-red-500 font-semibold leading-relaxed">
                        Número que o cliente precisa inserir no aplicativo para ter acesso ao projeto!
                      </p>
                    </div>

                    {/* Campo: Origem do lead */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                        Origem do lead (procedência do cliente)
                      </label>
                      <select
                        name="leadSource"
                        value={newLeadData.leadSource}
                        onChange={handleLeadInputChange}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all font-semibold"
                      >
                        <option value="">Selecione uma origem</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Indicação">Indicação de Cliente</option>
                        <option value="Arquiteto">Parceria com Arquiteto</option>
                        <option value="Google">Google / Pesquisa Web</option>
                        <option value="WhatsApp">WhatsApp Business / Prospecção</option>
                        <option value="Outro">Outro Canal</option>
                      </select>
                    </div>

                    {/* Campo: E-mail */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                        E-mail
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={newLeadData.email}
                        onChange={handleLeadInputChange}
                        placeholder="cliente@email.com"
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all font-semibold"
                      />
                    </div>

                    {/* Toggle: Enviar notificação */}
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                        Enviar notificação para este e-mail: <span className="text-primary font-black ml-1">{newLeadData.sendNotifications ? 'Sim' : 'Não'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewLeadData(prev => ({ ...prev, sendNotifications: !prev.sendNotifications }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${newLeadData.sendNotifications ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${newLeadData.sendNotifications ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Campo: Loja */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                        Loja
                      </label>
                      <select
                        name="storeName"
                        value={newLeadData.storeName}
                        onChange={handleLeadInputChange}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all font-black text-primary"
                      >
                        <option value="Hypado Planejados">Hypado Planejados</option>
                      </select>
                    </div>

                    {/* Toggle: Já sabe o endereço? */}
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                        Já sabe o endereço?: <span className="text-primary font-black ml-1">{newLeadData.hasAddress ? 'Sim' : 'Não'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewLeadData(prev => ({ ...prev, hasAddress: !prev.hasAddress }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${newLeadData.hasAddress ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${newLeadData.hasAddress ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Seção Endereço Revelada */}
                    {newLeadData.hasAddress && (
                      <div className="pt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block flex items-center gap-1">
                              CEP {isFetchingCep && <Loader2 size={10} className="animate-spin text-primary" />}
                            </label>
                            <input
                              type="text"
                              name="cep"
                              value={newLeadData.cep}
                              onChange={handleLeadInputChange}
                              maxLength={8}
                              placeholder="00000000"
                              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                              Endereço / Logradouro
                            </label>
                            <input
                              type="text"
                              name="address"
                              value={newLeadData.address}
                              onChange={handleLeadInputChange}
                              placeholder="Rua, Número, Bairro"
                              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                              Quadra
                            </label>
                            <input
                              type="text"
                              name="quadra"
                              value={newLeadData.quadra}
                              onChange={handleLeadInputChange}
                              placeholder="Quadra"
                              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                              Lote
                            </label>
                            <input
                              type="text"
                              name="lote"
                              value={newLeadData.lote}
                              onChange={handleLeadInputChange}
                              placeholder="Lote"
                              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Toggle: Fazer cadastro completo */}
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                        Fazer cadastro completo: <span className="text-primary font-black ml-1">{newLeadData.isCompleteRegistration ? 'Sim' : 'Não'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewLeadData(prev => ({ ...prev, isCompleteRegistration: !prev.isCompleteRegistration }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${newLeadData.isCompleteRegistration ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${newLeadData.isCompleteRegistration ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Seção Cadastro Completo Revelada */}
                    {newLeadData.isCompleteRegistration && (
                      <div className="pt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                            {newLeadData.isCorporate ? 'CNPJ' : 'CPF'}
                          </label>
                          <input
                            type="text"
                            name="cpf"
                            value={newLeadData.cpf}
                            onChange={handleLeadInputChange}
                            placeholder={newLeadData.isCorporate ? "00.000.000/0000-00" : "000.000.000-00"}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                            Anotações / Descrição do Cliente
                          </label>
                          <textarea
                            name="description"
                            value={newLeadData.description}
                            onChange={handleLeadInputChange}
                            rows={3}
                            placeholder="Informações adicionais do cliente..."
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Opportunity Info */}
              <div className="space-y-3 pt-3">
                <h5 className="text-xs font-black text-primary uppercase tracking-widest border-b border-border pb-1">Dados da Oportunidade</h5>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Apelido do Projeto / Obra</label>
                  <input
                    type="text"
                    required
                    value={newLeadData.workName}
                    onChange={(e) => setNewLeadData(prev => ({ ...prev, workName: e.target.value }))}
                    placeholder="Ex: Cozinha e Suíte - Apto 804"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Valor Estimado (R$)</label>
                    <input
                      type="number"
                      value={newLeadData.value}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="Ex: 25000"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Vendedor</label>
                    <input
                      type="text"
                      value={newLeadData.seller}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, seller: e.target.value }))}
                      placeholder="Ex: Fernanda"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Ambientes (Separados por vírgula)</label>
                  <input
                    type="text"
                    onChange={(e) => setNewLeadData(prev => ({ ...prev, environments: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    placeholder="Ex: Cozinha, Sala, Banheiro"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="flex-1 bg-background border border-border text-foreground py-3 rounded-xl text-sm font-bold transition-all hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-black transition-all hover:bg-primary-hover active:scale-[0.98] shadow-sm"
                >
                  Criar Oportunidade
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. EDIT/DETAILS LEAD MODAL */}
      {isEditModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <h4 className="text-lg font-black text-foreground uppercase tracking-wider">
                Detalhes da Oportunidade
              </h4>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              
              {/* Form Side */}
              <form onSubmit={handleUpdateLead} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Apelido do Projeto</label>
                  <input
                    type="text"
                    required
                    value={editLeadData.workName}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, workName: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Valor Estimado (R$)</label>
                    <input
                      type="number"
                      required
                      value={editLeadData.value}
                      onChange={(e) => setEditLeadData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Etapa do Funil</label>
                    <select
                      value={editLeadData.crmStage}
                      onChange={(e) => setEditLeadData(prev => ({ ...prev, crmStage: e.target.value }))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all font-semibold"
                    >
                      {CRM_STAGES.map(stage => (
                        <option key={stage} value={stage} className="bg-card text-foreground">{stage}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Vendedor Responsável</label>
                    <input
                      type="text"
                      value={editLeadData.seller}
                      onChange={(e) => setEditLeadData(prev => ({ ...prev, seller: e.target.value }))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Previsão Fechamento</label>
                    <input
                      type="date"
                      value={editLeadData.promisedDate}
                      onChange={(e) => setEditLeadData(prev => ({ ...prev, promisedDate: e.target.value }))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Anotações / Notas de Vendas</label>
                  <textarea
                    rows={3}
                    value={editLeadData.description}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Contexto das conversas, especificidades do cliente..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-primary-hover shadow-sm"
                  >
                    Salvar Oportunidade
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLead(editingProject.id)}
                    className="bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500 hover:text-white px-3 py-2.5 rounded-xl text-xs font-black uppercase"
                  >
                    Excluir
                  </button>
                </div>
              </form>

              {/* AI Assistant & Action Side */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                
                {/* AI Follow up Generator */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles size={14} className="animate-pulse" /> Assistente de Contato IA
                    </h5>
                    <button
                      type="button"
                      onClick={triggerGenerateFollowUp}
                      disabled={isGeneratingMessage}
                      className="bg-slate-500/10 hover:bg-slate-500/20 text-foreground border border-border text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                    >
                      {isGeneratingMessage ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Escrevendo...
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} /> Sugerir Mensagem
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-background border border-border rounded-2xl p-4 min-h-[180px] flex flex-col justify-between">
                    {isGeneratingMessage ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center text-xs font-semibold text-muted-foreground animate-pulse">
                        <Loader2 size={24} className="text-primary animate-spin" />
                        <span>A IA está formulando uma abordagem persuasiva...</span>
                      </div>
                    ) : generatedMessage ? (
                      <div className="space-y-3">
                        <textarea
                          rows={6}
                          value={generatedMessage}
                          onChange={(e) => setGeneratedMessage(e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-xs text-foreground resize-none leading-relaxed"
                        />
                        <div className="flex gap-2 border-t border-border pt-3">
                          <button
                            type="button"
                            onClick={handleCopyMessage}
                            className="bg-muted text-foreground border border-border px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 flex-1 hover:bg-muted/70 transition-all"
                          >
                            <Copy size={12} /> Copiar
                          </button>
                          
                          {clients.find(c => c.id === editingProject.clientId)?.phone && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(
                                clients.find(c => c.id === editingProject.clientId)!.phone,
                                generatedMessage
                              )}
                              className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 flex-1 hover:bg-emerald-500 transition-all shadow-sm"
                            >
                              <MessageSquare size={12} /> Disparar WhatsApp
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground text-xs py-8">
                        <MessageSquare size={32} className="text-slate-400 mb-2" />
                        <span>Clique em "Sugerir Mensagem" para gerar uma abordagem comercial do WhatsApp com o Gemini AI.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Win Close Deal Box */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={18} />
                    <span className="text-xs font-black uppercase tracking-wider">Contrato Fechado</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Avance o projeto para a fase de <strong>Desenho Técnico / PCP</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCloseDeal(editingProject)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                  >
                    🚀 Iniciar Produção Executiva
                  </button>
                </div>

              </div>
            </div>

            <div className="p-6 bg-muted/20 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="bg-background border border-border text-foreground px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all"
              >
                Fechar Painel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default CRMFunnelView;
