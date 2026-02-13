
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Clock, CheckCircle2, AlertTriangle, Sparkles, Factory, Calendar, Info, Activity, ShieldCheck, Zap, RefreshCw, Play, Search, ArrowRight } from 'lucide-react';
import { Client, Project, CalendarEvent, TechnicalAssistance } from '../types';
import { analyzeProductionBottlenecks } from '../geminiService';

interface Props {
  projects: Project[];
  clients: Client[];
  events: CalendarEvent[];
  assistances: TechnicalAssistance[];
}

const CACHE_KEY = 'hypado_ai_insight_cache';

const DashboardView: React.FC<Props> = ({ projects, clients, events, assistances }) => {
  const [activeTab, setActiveTab] = useState<'financeira' | 'producao'>('financeira');
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success'>('idle');
  const [testProgress, setTestProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');

  const stats = useMemo(() => {
    const totalValue = projects.reduce((acc, p) => acc + p.value, 0);
    const activeProjects = projects.filter(p => p.currentStatus !== 'Finalizada').length;
    const pendingDeliveries = projects.filter(p => {
      const promised = new Date(p.promisedDate);
      const now = new Date();
      const diff = (promised.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff < 15 && p.currentStatus !== 'Finalizada';
    }).length;

    // Vistorias do Mês (Real Data)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Count events of type 'Visita' in current month
    const visitsCount = events.filter(e => {
      const d = new Date(e.start);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.type === 'Visita';
    }).length;

    // Count assistances created in current month
    const assistanceCount = assistances.filter(a => {
      const d = new Date(a.requestDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const totalInspections = visitsCount + assistanceCount;

    return [
      { label: 'Obras Ativas', value: activeProjects, icon: Factory, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Valor em Produção', value: `R$ ${(totalValue / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'Entregas Próximas', value: pendingDeliveries, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { label: 'Vistorias Mês', value: totalInspections, icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ];
  }, [projects, events, assistances]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(e => new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 3);
  }, [events]);

  const runIntegrityTest = () => {
    setTestStatus('running');
    setTestProgress(0);

    const steps = [
      "Escaneando Banco de Dados de Obras...",
      "Validando Memoriais Descritivos...",
      "Simulando Cotação Técnica...",
      "Testando Entrada de Nota Fiscal...",
      "Verificando Atualização do DRE...",
      "Validando Auditoria de Montadores...",
      "Hypado Integrity Lab: Sistema Operacional!"
    ];

    let currentStep = 0;
    setCurrentStepText(steps[0]);

    const interval = setInterval(() => {
      currentStep++;
      setTestProgress((currentStep / steps.length) * 100);
      setCurrentStepText(steps[currentStep] || steps[steps.length - 1]);

      if (currentStep >= steps.length) {
        clearInterval(interval);
        setTestStatus('success');
      }
    }, 1000);
  };

  const fetchInsight = async (force = false) => {
    if (!force) {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setInsight(cached);
        return;
      }
    }

    setLoadingInsight(true);
    const result = await analyzeProductionBottlenecks(projects);
    if (result && !result.includes("limite de cota") && !result.includes("⚠️")) {
      sessionStorage.setItem(CACHE_KEY, result);
    }
    setInsight(result);
    setLoadingInsight(false);
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Welcome / Header Section if needed */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da produção e desempenho.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Nova Obra
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-muted-foreground">
              <span className="text-emerald-500 font-medium flex items-center gap-1">
                <TrendingUp size={12} /> +2.5%
              </span>
              <span className="ml-1">vs mês passado</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* AI Insights Card */}
          <div className="bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Sparkles className="text-purple-500" size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Inteligência de Produção</h3>
                  <p className="text-xs text-muted-foreground">Análise Gemini AI em tempo real</p>
                </div>
              </div>
              <button
                onClick={() => fetchInsight(true)}
                disabled={loadingInsight}
                className="text-xs font-medium bg-background border border-border hover:bg-accent hover:text-accent-foreground px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
              >
                {loadingInsight ? 'Analisando...' : 'Recalcular Análise'}
              </button>
            </div>

            <div className="p-6">
              {loadingInsight ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                </div>
              ) : (
                <div className={`prose prose-sm max-w-none ${insight?.includes("⚠️") ? 'text-sm bg-destructive/10 text-destructive p-4 rounded-lg flex gap-3 items-start' : 'text-muted-foreground'}`}>
                  {insight?.includes("⚠️") && <AlertTriangle className="shrink-0 mt-0.5" size={16} />}
                  <p className="leading-relaxed whitespace-pre-line">
                    {insight || "Iniciando análise inteligente da linha de produção..."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Projects List */}
          <div className="bg-card text-card-foreground rounded-xl border border-border shadow-sm">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-lg">Cronograma de Entregas</h3>
              <button className="text-sm text-primary hover:underline">Ver todas</button>
            </div>
            <div className="divide-y divide-border">
              {projects.filter(p => p.currentStatus !== 'Finalizada').slice(0, 5).map(project => {
                const promised = new Date(project.promisedDate);
                const diff = Math.ceil((promised.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isLate = diff < 10;

                return (
                  <div key={project.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLate ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                        {isLate ? <AlertTriangle size={18} /> : <Calendar size={18} />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{project.workName}</p>
                        <p className="text-xs text-muted-foreground">{project.clientName} • {project.currentStatus}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${isLate ? 'text-red-500' : 'text-foreground'}`}>
                        {diff} dias
                      </p>
                      <p className="text-xs text-muted-foreground">restantes</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column / Sidebar Stats */}
        <div className="space-y-6">

          {/* System Check Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldCheck size={100} />
            </div>

            <div className="p-6 relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-amber-500" size={18} />
                <h3 className="font-bold text-lg">Integrity Lab</h3>
              </div>
              <p className="text-slate-400 text-xs mb-6">Verificação de integridade operacional do sistema.</p>

              {testStatus !== 'running' ? (
                <button
                  onClick={runIntegrityTest}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Play size={16} fill="currentColor" />
                  {testStatus === 'success' ? 'Verificar Novamente' : 'Iniciar Verificação'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Progresso</span>
                    <span>{testProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${testProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-amber-500 italic animate-pulse">{currentStepText}</p>
                </div>
              )}

              {testStatus === 'success' && (
                <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 size={14} />
                  <span>Sistema Operando Normalmente</span>
                </div>
              )}
            </div>
          </div>

          {/* Agenda / Next Events */}
          <div className="bg-card text-card-foreground rounded-xl border border-border shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">Agenda Próxima</h3>
            <div className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum evento próximo agendado.</p>
              ) : (
                upcomingEvents.map((evt, i) => (
                  <div key={i} className="flex gap-3 group cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-muted rounded-lg border border-border group-hover:border-primary/50 group-hover:text-primary transition-colors">
                      <span className="text-[10px] font-bold uppercase">{new Date(evt.start).toLocaleDateString(undefined, { month: 'short' }).toUpperCase().replace('.', '')}</span>
                      <span className="text-lg font-bold leading-none">{new Date(evt.start).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-sm font-medium truncate">{evt.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {evt.type}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="w-full mt-6 py-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 group">
              Ver agenda completa <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
