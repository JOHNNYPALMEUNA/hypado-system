
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
  Calendar
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
import { DataProvider, useData } from './contexts/DataContext';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clientes' | 'obras' | 'pcp' | 'quality' | 'analytics' | 'ambientes' | 'compras' | 'config' | 'montadores' | 'assistance' | 'agenda'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Persisted States (Database Simulation)

  const { clients, projects, installers, loading } = useData();

  const [procurementSubTab, setProcurementSubTab] = useState<'cotacoes' | 'apontamento' | 'diario' | 'produtos' | 'fornecedores'>('cotacoes');
  const [selectedProcurementOSId, setSelectedProcurementOSId] = useState('');


  // Local state for UI only (initialized from DB, but editable locally for now)
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [localClients, setLocalClients] = useState<Client[]>([]);
  const [localInstallers, setLocalInstallers] = useState<Installer[]>([]);

  React.useEffect(() => { if (projects) setLocalProjects(projects); }, [projects]);
  React.useEffect(() => { if (clients) setLocalClients(clients); }, [clients]);
  React.useEffect(() => { if (installers) setLocalInstallers(installers); }, [installers]);



  const [environments, setEnvironments] = useStickyState<Environment[]>(MOCK_ENVIRONMENTS, 'hypado_environments');
  const [expenseCategories, setExpenseCategories] = useStickyState<string[]>(['Material', 'Frete', 'Montagem', 'Fitação', 'Terceirizados', 'Uber', 'Alimentação'], 'hypado_expense_categories');

  const [company, setCompany] = useStickyState<Company>({
    name: 'Hypado Planejados',
    cnpj: '00.000.000/0001-00',
    phone: '(11) 99999-8888',
    email: 'contato@hypado.com.br',
    address: 'Rua da Marcenaria, 123 - Polo Industrial'
  }, 'hypado_company');

  // Installers are now from DataContext
  // const [installers, setInstallers] = ...


  const [suppliers, setSuppliers] = useStickyState<Supplier[]>([
    { id: 's1', name: 'Madeira & Cia', type: 'Material', contact: 'comercial@madeira.com' },
    { id: 's2', name: 'Ferragens Prime (Blum)', type: 'Material', contact: 'vendas@prime.com' },
    { id: 's3', name: 'Central de Corte VIP', type: 'Serviço (Corte/Fitação)', contact: 'producao@vip.com.br' }
  ], 'hypado_suppliers');

  const [materials, setMaterials] = useStickyState<Material[]>([
    { id: 'm1', name: 'MDF Louro Freijó 18mm', category: 'MDF', unit: 'Chapa' },
    { id: 'm2', name: 'MDF Branco Diamante 15mm', category: 'MDF', unit: 'Chapa' },
    { id: 'm3', name: 'Dobradiça Blumotion 35mm', category: 'Ferragem', unit: 'Par' },
    { id: 'm4', name: 'Serviço de Corte e Fitação', category: 'Serviço', unit: 'M2' }
  ], 'hypado_materials');

  const [materialCategories, setMaterialCategories] = useStickyState<string[]>([
    'MDF', 'Ferragem', 'Fitação', 'Cola/Químico', 'Vidraçaria', 'Serralheria', 'Serviço', 'Outros'
  ], 'hypado_material_categories');

  const [quotations, setQuotations] = useStickyState<Quotation[]>([], 'hypado_quotations');

  const [assistances, setAssistances] = useStickyState<TechnicalAssistance[]>([], 'hypado_assistances');

  // Agenda State (Lifted)
  const [tasks, setTasks] = useStickyState<Task[]>([], 'hypado_tasks');
  const [events, setEvents] = useStickyState<CalendarEvent[]>([], 'hypado_events');

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'obras', label: 'Ordens de Serviço', icon: Briefcase },
    { id: 'compras', label: 'Suprimentos', icon: ShoppingCart },
    { id: 'pcp', label: 'Produção', icon: Factory },
    { id: 'montadores', label: 'Equipe', icon: HardHat },
    { id: 'assistance', label: 'Assistência', icon: Wrench },
    { id: 'agenda', label: 'Agenda & Tarefas', icon: Calendar },
    { id: 'quality', label: 'Qualidade', icon: ShieldCheck },
    { id: 'ambientes', label: 'Biblioteca', icon: Layers },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'config', label: 'Configurações', icon: Settings },
  ];

  // --- ROUTING / MODES ---
  const [appMode, setAppMode] = useState<'admin' | 'installer-proposal'>('admin');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'proposal') {
      setAppMode('installer-proposal');
    }
  }, []);

  if (appMode === 'installer-proposal') {
    return <InstallerProposalView />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return (
        <DashboardView
          projects={localProjects}
          clients={localClients}
          events={events}
          assistances={assistances}
        />
      );
      case 'clientes': return <CRMView clients={localClients} setClients={setLocalClients} projects={localProjects} />;
      case 'obras': return (
        <ObrasView
          projects={localProjects}
          setProjects={setLocalProjects}
          clients={localClients}
          setClients={setLocalClients}
          availableEnvironments={environments}
          setEnvironments={setEnvironments}
          expenseCategories={expenseCategories}
          setExpenseCategories={setExpenseCategories}
          company={company}
          installers={localInstallers}
          materials={materials}
          materialCategories={materialCategories}
          purchaseOrders={quotations}
          setAssistances={setAssistances}
        />
      );
      case 'compras': return (
        <ProcurementView
          projects={projects}
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          materials={materials}
          setMaterials={setMaterials}
          purchaseOrders={quotations}
          setPurchaseOrders={setQuotations}
          setProjects={setLocalProjects}
          company={company}
          installers={localInstallers}
          clients={localClients}
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
          projects={localProjects}
          setProjects={setLocalProjects}
          purchaseOrders={[]}
          installers={localInstallers}
          suppliers={suppliers}
          goToProcurementMDO={(osId) => {
            setSelectedProcurementOSId(osId);
            setProcurementSubTab('apontamento');
            setActiveTab('compras');
          }}
        />
      );
      case 'montadores': return <InstallerListView installers={localInstallers} setInstallers={setLocalInstallers} projects={localProjects} />;
      case 'assistance': return (
        <TechnicalAssistanceView
          assistances={assistances}
          setAssistances={setAssistances}
          clients={localClients}
          projects={localProjects}
          setProjects={setLocalProjects} // New Prop
          installers={localInstallers}
        />
      );
      case 'agenda': return (
        <AgendaView
          projects={localProjects}
          setProjects={setLocalProjects}
          tasks={tasks}
          setTasks={setTasks}
          events={events}
          setEvents={setEvents}
        />
      );
      case 'quality': return (
        <QualityView
          projects={localProjects}
          setProjects={setLocalProjects}
          installers={localInstallers}
          setInstallers={setLocalInstallers}
          assistances={assistances}
          setAssistances={setAssistances}
        />
      );
      case 'ambientes': return <EnvironmentsLibraryView environments={environments} setEnvironments={setEnvironments} materials={materials} materialCategories={materialCategories} />;
      case 'analytics': return (
        <AnalyticsView
          projects={localProjects}
          clients={localClients}
          installers={localInstallers}
          assistances={assistances}
          purchaseOrders={quotations}
        />
      );
      case 'config': return <CompanySettingsView company={company} setCompany={setCompany} />;
      default: return <DashboardView projects={projects} clients={clients} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans">
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
          transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
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
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">Admin User</p>
                <p className="text-xs text-muted-foreground truncate">admin@hypado.com</p>
              </div>
              <LogOut size={16} className="text-muted-foreground hover:text-destructive transition-colors" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-muted/10 relative">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-6 transition-all">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
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
                className="h-9 w-64 pl-9 pr-4 rounded-full bg-muted/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
              />
            </div>

            <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderContent()}
          </div>
        </div>
      </main>

      <HypadoAIChat projects={localProjects} clients={localClients} installers={localInstallers} />
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
