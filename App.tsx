
import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Factory,
  Wrench,
  ShieldCheck,
  BarChart3,
  Menu,
  X,
  Bell,
  Search,
  Briefcase,
  Layers,
  ShoppingCart,
  DollarSign,
  Settings,
  HardHat,
  ChevronRight,
  LogOut,
  Calendar,
  ClipboardList,
  RefreshCcw,
  Mic,
  Sparkles,
  Loader2
} from 'lucide-react';
import { MOCK_CLIENTS, MOCK_PROJECTS, MOCK_ENVIRONMENTS } from './mockData';
import { Client, Project, Environment, Supplier, Material, Quotation, Company, Installer, TechnicalAssistance, Task, CalendarEvent } from './types';
import DashboardView from './components/DashboardView';
import CRMView from './components/CRMView';
import ObrasView from './components/ObrasView';
import PCPView from './components/PCPView';
import TechnicalAssistanceView from './components/TechnicalAssistanceView';
import QualityView from './components/QualityView';
import AnalyticsView from './components/AnalyticsView';
import EnvironmentsLibraryView from './components/EnvironmentsLibraryView';
import ProcurementView from './components/ProcurementView';
import CompanySettingsView from './components/CompanySettingsView';
import InstallerListView from './components/InstallerListView';
import AgendaView from './components/AgendaView';
import HypadoAIChat from './components/HypadoAIChat';
import InstallerProposalView from './components/InstallerProposalView';
import SupplierOrderView from './components/SupplierOrderView';
import ConstructionDiaryView from './components/ConstructionDiaryView';
import FactoryView from './components/FactoryView';
import GanttChartView from './components/GanttChartView';
import AlertCenter from './components/AlertCenter';
import TechnicalAssistanceClientView from './components/TechnicalAssistanceClientView';
import FinancialAuditView from './components/FinancialAuditView';
import { DataProvider, useData } from './contexts/DataContext';
import { processVoiceCommand } from './geminiService';
import Login from './components/Login';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import RefundSettlementReportView from './components/RefundSettlementReportView';
import PurchaseSettlementReportView from './components/PurchaseSettlementReportView';
import PublicAssistanceReportWrapper from './components/PublicAssistanceReportWrapper';
import PublicDailyReportView from './components/PublicDailyReportView';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center font-sans">
      <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-2xl w-full">
        <h2 className="text-2xl font-black text-red-500 mb-4 uppercase tracking-widest">Erro no Sistema</h2>
        <p className="text-slate-400 mb-6 text-sm">Ocorreu um erro inesperado ao renderizar esta tela.</p>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-auto text-left">
          <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap leading-relaxed">{error.message}</pre>
          <pre className="text-slate-500 text-[10px] mt-4 font-mono whitespace-pre-wrap">{error.stack}</pre>
        </div>
        <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-colors">
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}

// Hook personalizado para persistência no LocalStorage
function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (error) {
      console.error(`Error parsing localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  React.useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

// Hook personalizado para persistência no LocalStorage


// ... imports


const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clientes' | 'obras' | 'diario' | 'factory' | 'pcp' | 'cronograma' | 'quality' | 'analytics' | 'ambientes' | 'compras' | 'config' | 'montadores' | 'assistance' | 'agenda' | 'financeiro'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- ROUTING / MODES ---
  const [appMode, setAppMode] = useState<'admin' | 'installer-proposal' | 'purchase-order' | 'assistance-report' | 'settlement-report' | 'purchase-settlement-report' | 'daily-report'>('admin');
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string | null>(null);
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'proposal') {
      setAppMode('installer-proposal');
    } else if (params.get('mode') === 'purchase-order') {
      setAppMode('purchase-order');
    } else if (params.get('mode') === 'assistance-report') {
      setAppMode('assistance-report');
      setReportId(params.get('id'));
    } else if (params.get('mode') === 'settlement-report') {
      setAppMode('settlement-report');
      setReportId(params.get('id'));
    } else if (params.get('mode') === 'purchase-settlement-report') {
      setAppMode('purchase-settlement-report');
      setReportId(params.get('id'));
    } else if (params.get('mode') === 'daily-report') {
      setAppMode('daily-report');
      setReportDate(params.get('date'));
    }
  }, []);

  // Pre-calculate what to show, but don't return early yet to satisfy hooks rules
  const isPublicLink = ['installer-proposal', 'purchase-order', 'daily-report'].includes(appMode);

  // Auth & Admin Sidebar Logic
  React.useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const {
    clients, projects, installers, loading,
    quotations, addQuotation, updateQuotation, deleteQuotation,
    updateProject, deleteProject, addProject,
    updateClient, deleteClient, addClient,
    updateInstaller, deleteInstaller, addInstaller,
    tasks, addTask, updateTask, deleteTask,
    events, addEvent, updateEvent, deleteEvent,
    company, updateCompany,
    assistances, addAssistance, updateAssistance, deleteAssistance,
    dailyLogs, userRole, refundRequests, suppliers, isIdle
  } = useData();

  const [procurementSubTab, setProcurementSubTab] = useState<'cotacoes' | 'apontamento' | 'diario' | 'produtos' | 'fornecedores'>('cotacoes');
  const [selectedProcurementOSId, setSelectedProcurementOSId] = useState('');

  const [environments, setEnvironments] = useStickyState<Environment[]>(MOCK_ENVIRONMENTS, 'hypado_environments');
  const [expenseCategories, setExpenseCategories] = useStickyState<string[]>(['Material', 'Frete', 'Montagem', 'Fitação', 'Terceirizados', 'Uber', 'Alimentação'], 'hypado_expense_categories');

  // Wrapper for setCompany compatibility
  const handleSetCompany = (value: React.SetStateAction<Company>) => {
    if (typeof value === 'function') {
      const newCompany = value(company);
      updateCompany(newCompany);
    } else {
      updateCompany(value);
    }
  };

  const [materialCategories, setMaterialCategories] = useStickyState<string[]>([
    'MDF', 'Ferragem', 'Fitação', 'Cola/Químico', 'Vidraçaria', 'Serralheria', 'Serviço', 'Outros'
  ], 'hypado_material_categories');

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const speakConfirmation = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceCommand = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceResult(null);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setIsProcessingVoice(true);
      setVoiceResult(transcript);

      try {
        const result = await processVoiceCommand(transcript, { projects, tasks });

        if (result.action === 'CREATE_TASK' && addTask) {
          await addTask({
            id: `task-${Date.now()}`,
            title: `${result.data.taskTitle} (via IA)`,
            done: false,
            priority: result.data.priority || 'Média',
            dueDate: new Date().toISOString().split('T')[0]
          });
          setVoiceResult(`Entendido: ${result.data.taskTitle}`);
          speakConfirmation(result.data.answerText || "Tarefa concluída");
        } else if (result.action === 'ANSWER') {
          setVoiceResult(result.data.answerText);
          speakConfirmation(result.data.answerText);
        }
      } catch (error) {
        console.error("Voice Processing Error:", error);
        speakConfirmation("Desculpe, não consegui processar o comando.");
      } finally {
        setIsProcessingVoice(false);
        setTimeout(() => setVoiceResult(null), 8000);
      }
    };

    recognition.start();
  };

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'obras', label: 'Ordens de Serviço', icon: Briefcase },
    { id: 'diario', label: 'Diário / Ocorrências', icon: ClipboardList },
    { id: 'compras', label: 'Suprimentos', icon: ShoppingCart },
    { id: 'pcp', label: 'PCP (Planejamento)', icon: Factory },
    { id: 'cronograma', label: 'Cronograma', icon: BarChart3 },
    { id: 'factory', label: 'Fábrica (Refazimentos)', icon: RefreshCcw },
    { id: 'montadores', label: 'Equipe', icon: HardHat },
    { id: 'assistance', label: 'Assistência', icon: Wrench },
    { id: 'agenda', label: 'Agenda & Tarefas', icon: Calendar },
    { id: 'quality', label: 'Qualidade', icon: ShieldCheck },
    { id: 'ambientes', label: 'Biblioteca', icon: Layers },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'financeiro', label: 'Gestão Financeira', icon: DollarSign },
    { id: 'config', label: 'Configurações', icon: Settings },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.id === 'analytics') return userRole === 'owner';
    return true;
  });

  // --- PUBLIC MODES RENDERING ---
  // Return here so we use all hooks above, but skip the auth/loading/admin-layout logic below
  if (appMode === 'installer-proposal') {
    return <ErrorBoundary FallbackComponent={ErrorFallback}><InstallerProposalView proposalId={reportId || ''} /></ErrorBoundary>;
  }
  if (appMode === 'purchase-order') {
    return <ErrorBoundary FallbackComponent={ErrorFallback}><SupplierOrderView orderId={reportId || ''} /></ErrorBoundary>;
  }
  if (appMode === 'daily-report') {
    return <ErrorBoundary FallbackComponent={ErrorFallback}><PublicDailyReportView date={reportDate || ''} /></ErrorBoundary>;
  }
  if (appMode === 'assistance-report' && reportId) {
    return <ErrorBoundary FallbackComponent={ErrorFallback}><PublicAssistanceReportWrapper reportId={reportId} /></ErrorBoundary>;
  }
  if (appMode === 'settlement-report' && reportId) {
    return <ErrorBoundary FallbackComponent={ErrorFallback}><RefundSettlementReportView settlementId={reportId || ''} requests={refundRequests} installers={installers} /></ErrorBoundary>;
  }
  if (appMode === 'purchase-settlement-report' && reportId) {
    return <ErrorBoundary FallbackComponent={ErrorFallback}><PurchaseSettlementReportView settlementId={reportId || ''} quotations={quotations} suppliers={suppliers} /></ErrorBoundary>;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">
            {authLoading ? 'Verificando Acesso...' : 'Carregando Dados...'}
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={() => { }} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return (
        <DashboardView
          projects={projects}
          clients={clients}
          events={events}
          assistances={assistances}
          installers={installers}
        />
      );
      case 'clientes': return <CRMView clients={clients} setClients={() => { }} projects={projects} />;
      case 'obras': return (
        <ObrasView
          projects={projects}
          setProjects={() => { }}
          clients={clients}
          setClients={() => { }}
          availableEnvironments={environments}
          setEnvironments={setEnvironments}
          expenseCategories={expenseCategories}
          setExpenseCategories={setExpenseCategories}
          company={company}
          installers={installers}
          materialCategories={materialCategories}
          purchaseOrders={quotations}
          dailyLogs={dailyLogs}
          addAssistance={addAssistance}
          assistances={assistances}
        />
      );
      case 'diario': return <ConstructionDiaryView />;
      case 'compras': return (
        <ProcurementView
          projects={projects}
          purchaseOrders={quotations}
          addQuotation={addQuotation}
          updateQuotation={updateQuotation}
          deleteQuotation={deleteQuotation}
          setProjects={() => { }}
          company={company}
          installers={installers}
          clients={clients}
          externalActiveTab={procurementSubTab}
          setExternalActiveTab={setProcurementSubTab}
          externalSelectedOSId={selectedProcurementOSId}
          setExternalSelectedOSId={setSelectedProcurementOSId}
          materialCategories={materialCategories}
          setMaterialCategories={setMaterialCategories}
        />
      );
      case 'pcp': return (
        <PCPView
          projects={projects}
          setProjects={() => { }}
          purchaseOrders={[]}
          installers={installers}
          goToProcurementMDO={(osId) => {
            setSelectedProcurementOSId(osId);
            setProcurementSubTab('apontamento');
            setActiveTab('compras');
          }}
        />
      );
      case 'cronograma': return <GanttChartView />;
      case 'factory': return <FactoryView />;
      case 'montadores': return <InstallerListView installers={installers} setInstallers={() => { }} projects={projects} />;
      case 'assistance': return (
        <TechnicalAssistanceView
          assistances={assistances}
          addAssistance={addAssistance}
          updateAssistance={updateAssistance}
          deleteAssistance={deleteAssistance}
          clients={clients}
          projects={projects}
          setProjects={() => { }} // New Prop
          installers={installers}
        />
      );
      case 'agenda': return (
        <AgendaView
          projects={projects}
          setProjects={() => { }}
          tasks={tasks}
          addTask={addTask}
          updateTask={updateTask}
          deleteTask={deleteTask}
          events={events}
          addEvent={addEvent}
          updateEvent={updateEvent}
          deleteEvent={deleteEvent}
        />
      );
      case 'quality': return (
        <QualityView
          projects={projects}
          setProjects={() => { }}
          installers={installers}
          setInstallers={() => { }}
          assistances={assistances}
          addAssistance={addAssistance}
        />
      );
      case 'ambientes': return <EnvironmentsLibraryView environments={environments} setEnvironments={setEnvironments} materialCategories={materialCategories} />;
      case 'analytics': return (
        <AnalyticsView
          projects={projects}
          clients={clients}
          installers={installers}
          assistances={assistances}
          purchaseOrders={quotations}
          dailyLogs={dailyLogs}
        />
      );
      case 'financeiro': return <FinancialAuditView />;
      case 'config': return <CompanySettingsView company={company} setCompany={handleSetCompany} />;
      default: return (
        <DashboardView
          projects={projects}
          clients={clients}
          events={events}
          assistances={assistances}
          installers={installers}
        />
      );
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans relative">
      {/* Idle Overlay */}
      {isIdle && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <Loader2 size={32} className="text-blue-500 animate-spin" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Sessão Inativa</h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              O sistema foi pausado temporariamente para economizar recursos do banco de dados (Supabase).
              <br /><br />
              Mexa o mouse ou clique em qualquer lugar para reconectar e atualizar os dados.
            </p>
          </div>
        </div>
      )}

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-card text-card-foreground border-r border-border shadow-2xl
          transform transition-transform duration-300 ease-in-out md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="p-6 flex items-center gap-3 border-b border-border/50">
            <div className="relative">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg shadow-primary/25">
                {company.logo ? <img src={company.logo} alt="Logo" className="w-full h-full object-cover rounded-xl" /> : 'H'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
            </div>
            <div className="flex-1 overflow-hidden">
              <h1 className="font-bold text-lg truncate leading-tight">Hypado System</h1>
              <p className="text-xs text-muted-foreground truncate">Gestão Integrada</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Menu Principal</p>
            {navItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setSidebarOpen(false); }}
                className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                    ${activeTab === item.id
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                  `}
              >
                <item.icon size={18} className={`${activeTab === item.id ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'} transition-colors`} />
                <span className="flex-1 text-left">{item.label}</span>
                {activeTab === item.id && <ChevronRight size={14} className="opacity-70" />}
              </button>
            ))}

            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">Gestão & Equipe</p>
            {navItems.slice(5).map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setSidebarOpen(false); }}
                className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                    ${activeTab === item.id
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                  `}
              >
                <item.icon size={18} className={`${activeTab === item.id ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'} transition-colors`} />
                <span className="flex-1 text-left">{item.label}</span>
                {activeTab === item.id && <ChevronRight size={14} className="opacity-70" />}
              </button>
            ))}
          </nav>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-border/50 bg-muted/30">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-background transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold ring-2 ring-transparent group-hover:ring-primary transition-all">
                AD
              </div>
              <div className="flex-1 min-0">
                <p className="text-sm font-medium truncate text-foreground">{session.user.email?.split('@')[0] || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Native Scroll */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 md:pl-72 bg-muted/10 relative`}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 md:px-6 transition-all">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-xs text-muted-foreground hidden md:block">
                Visão geral e gerenciamento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="h-9 w-48 md:w-64 pl-9 pr-4 rounded-full bg-muted/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
              />
            </div>

            <button
              onClick={startVoiceCommand}
              disabled={isListening || isProcessingVoice}
              className={`relative p-3 rounded-full transition-all duration-500 shadow-lg ${isListening ? 'bg-primary text-white animate-pulse scale-110 shadow-primary/50' : isProcessingVoice ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
              aria-label="Voice Assistant"
            >
              {isProcessingVoice ? <Loader2 size={24} className="animate-spin" /> : <Mic size={24} className={isListening ? 'animate-bounce' : ''} />}
              {isListening && <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white animate-ping"></span>}
            </button>

            <button
              onClick={() => setIsAlertCenterOpen(true)}
              className="relative p-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              aria-label="Notifications"
            >
              <Bell size={24} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background"></span>
            </button>
          </div>
        </header>

        {/* Voice Feedback Overlay */}
        {voiceResult && (
          <div className="fixed top-20 right-6 z-[60] animate-in slide-in-from-right duration-500">
            <div className="bg-slate-900 border border-slate-800 text-white px-8 py-5 rounded-[28px] shadow-2xl flex items-center gap-4 max-w-sm">
              <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1 italic">Assistente Hypado</p>
                <p className="text-sm font-bold italic">"{voiceResult}"</p>
                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">âœ… Tarefa criada com sucesso!</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {renderContent()}
          </div>
        </div>
      </main>

      <HypadoAIChat
        projects={projects}
        clients={clients}
        installers={installers}
        isListening={isListening}
        isProcessingVoice={isProcessingVoice}
        startVoiceCommand={startVoiceCommand}
      />

      {isAlertCenterOpen && (
        <AlertCenter
          projects={projects}
          assistances={assistances}
          onClose={() => setIsAlertCenterOpen(false)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;
