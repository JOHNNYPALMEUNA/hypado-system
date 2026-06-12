import React, { useState } from 'react';
import { Project, Client, ProductionStatus } from '../types';
import { useData } from '../contexts/DataContext';
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
  Mail
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

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('Todos');

  // Modals
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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
    promisedDate: ''
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

  // Quick Create Lead Submit
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadData.clientName || !newLeadData.workName) {
      alert('Nome do cliente e Nome do projeto são obrigatórios.');
      return;
    }

    // 1. Check or Create Client
    let client = clients.find(c => c.name.toLowerCase() === newLeadData.clientName.toLowerCase());
    let clientId = client?.id;

    if (!client) {
      clientId = `c-${Date.now()}`;
      const newClient: Client = {
        id: clientId,
        name: newLeadData.clientName,
        phone: newLeadData.phone || '(00) 00000-0000',
        email: newLeadData.email || 'lead@exemplo.com',
        address: '',
        projectsCount: 1,
        averageRating: 0,
        lastVisit: new Date().toISOString().split('T')[0]
      };
      await addClient(newClient);
    }

    // 2. Create Project/Lead
    const newProject: Project = {
      id: `os-${Date.now()}`,
      clientId: clientId!,
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
      history: [{ status: 'Venda', timestamp: new Date().toISOString() }]
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
        promisedDate: ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Open Edit Modal
  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditLeadData({
      value: project.value || 0,
      crmStage: project.crmStage || 'Sem tarefa',
      seller: project.team || '',
      description: project.workAddress || '', // using workAddress as fallback description or notes
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

  // Helper to open Whatsapp
  const openWhatsApp = (phone: string, clientName: string, workName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${clientName}, tudo bem? Aqui é da marcenaria Hypado Planejados. Estou passando para dar um retorno sobre o seu projeto: ${workName}. Como estão as coisas por aí?`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  // Calculate Pipeline Metrics
  const pipelineTotal = filteredLeads.reduce((sum, p) => sum + (p.value || 0), 0);
  const totalLeadsCount = filteredLeads.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
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
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
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
          {/* Seller Filter */}
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
              {/* Column Top Info */}
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

              {/* Column Cards Container */}
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
                        {/* Accent border on hover */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary transform scale-y-0 group-hover/card:scale-y-100 transition-transform"></div>

                        {/* Title & Edit */}
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

                        {/* Client details */}
                        <div className="space-y-1 text-xs text-muted-foreground font-medium mb-3">
                          <p className="text-foreground font-semibold">{lead.clientName}</p>
                          <p className="text-muted-foreground truncate">{lead.environments.join(', ')}</p>
                        </div>

                        {/* Value & WhatsApp */}
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

                        {/* Footer details: Seller & Days */}
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
              
              <div className="space-y-3">
                <h5 className="text-xs font-black text-primary uppercase tracking-widest border-b border-border pb-1">Dados do Cliente</h5>
                
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Nome do Cliente</label>
                  <input
                    type="text"
                    required
                    value={newLeadData.clientName}
                    onChange={(e) => setNewLeadData(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Nome Completo do Cliente"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">WhatsApp</label>
                    <input
                      type="tel"
                      value={newLeadData.phone}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(62) 99999-9999"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">E-mail</label>
                    <input
                      type="email"
                      value={newLeadData.email}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="cliente@email.com"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>
              </div>

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
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Valor Estimado</label>
                    <input
                      type="number"
                      value={newLeadData.value}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="R$ 15000"
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
          <div className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
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

            <form onSubmit={handleUpdateLead} className="p-6 space-y-4">
              
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
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Expectativa de Fechamento</label>
                  <input
                    type="date"
                    value={editLeadData.promisedDate}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, promisedDate: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Anotações / Descrição</label>
                <textarea
                  rows={3}
                  value={editLeadData.description}
                  onChange={(e) => setEditLeadData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Informações adicionais do cliente, necessidades de projeto, etc."
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-all"
                />
              </div>

              {/* Conversion/Win section */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-2 mt-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">Negócio Fechado?</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ao fechar o negócio, este lead será transformado em um **projeto ativo** e aparecerá no cronograma de produção e na tela de PCP.
                </p>
                <button
                  type="button"
                  onClick={() => handleCloseDeal(editingProject)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all mt-1 shadow-sm"
                >
                  🚀 Fechar Contrato / Iniciar Produção
                </button>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-border flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteLead(editingProject.id)}
                  className="bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-650 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Excluir
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-background border border-border text-foreground py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-muted"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-primary-hover active:scale-[0.98] shadow-sm"
                >
                  Salvar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CRMFunnelView;
