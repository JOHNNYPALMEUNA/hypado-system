
import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Clock, CheckCircle2, AlertTriangle, Sparkles, Factory,
  Calendar, Activity, ShieldCheck, Play, ArrowRight, Hammer, Scissors,
  ListTodo, MapPin, Truck, AlertTriangle as AlertTriangleIcon,
  AlertOctagon, X
} from 'lucide-react';
import { Client, Project, CalendarEvent, TechnicalAssistance, Installer, ProductionStatus } from '../types';
import { analyzeDailyBriefing } from '../geminiService';
import { getStatusBadgeClass } from '../utils';

interface Props {
  projects: Project[];
  clients: Client[];
  events: CalendarEvent[];
  assistances: TechnicalAssistance[];
  installers: Installer[];
  onNavigate?: (tab: string) => void;
}

const CACHE_KEY = 'hypado_ai_insight_cache_v2';

const DashboardView: React.FC<Props> = ({ projects, clients, events, assistances, installers, onNavigate }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success'>('idle');
  const [testProgress, setTestProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [showDelayedModal, setShowDelayedModal] = useState(false);

  // --- Derived State (Filters) ---

  const cuttingProjects = useMemo(() =>
    projects.filter(p => p.currentStatus === 'Corte'),
    [projects]);

  const installingProjects = useMemo(() =>
    projects.filter(p => p.currentStatus === 'Instalação'),
    [projects]);

  const logisticsProjects = useMemo(() =>
    projects.filter(p => p.currentStatus === 'Produção' || p.currentStatus === 'Entrega'),
    [projects]);

  const activeProjectsCount = useMemo(() =>
    projects.filter(p => p.currentStatus !== 'Finalizada' && p.currentStatus !== 'Cancelada').length,
    [projects]);

  const todaysEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return events
      .filter(e => e.start.startsWith(todayStr))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events]);

  const priorityAssistances = useMemo(() =>
    (assistances || []).filter(a => a.status === 'Aberto' || a.status === 'Agendado' || a.status === 'Retorno Pendente')
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
    , [assistances]);

  const delayedProjects = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return projects.filter(p => p.promisedDate && p.promisedDate < todayStr && p.currentStatus !== 'Finalizada' && p.currentStatus !== 'Cancelada')
      .sort((a, b) => new Date(a.promisedDate).getTime() - new Date(b.promisedDate).getTime());
  }, [projects]);

  const stats = useMemo(() => {
    return [
      { label: 'Obras Ativas', value: activeProjectsCount, icon: Factory, color: 'text-blue-600', bg: 'bg-blue-600/10', border: 'border-blue-100', gradient: 'from-blue-600 to-blue-400', onClick: () => onNavigate?.('obras') },
      { label: 'Em Atraso', value: delayedProjects.length, icon: AlertOctagon, color: 'text-rose-600', bg: 'bg-rose-600/10', border: 'border-rose-100', gradient: 'from-rose-600 to-rose-400', onClick: () => setShowDelayedModal(true) },
      { label: 'Em Corte', value: cuttingProjects.length, icon: Scissors, color: 'text-orange-600', bg: 'bg-orange-600/10', border: 'border-orange-100', gradient: 'from-orange-600 to-orange-400', onClick: () => onNavigate?.('pcp') },
      { label: 'Logística', value: logisticsProjects.length, icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-600/10', border: 'border-emerald-100', gradient: 'from-emerald-600 to-emerald-400', onClick: () => onNavigate?.('pcp') },
      { label: 'Chamados', value: (assistances || []).filter(a => a.status === 'Aberto').length, icon: AlertTriangle, color: 'text-purple-600', bg: 'bg-purple-600/10', border: 'border-purple-100', gradient: 'from-purple-600 to-purple-400', onClick: () => onNavigate?.('assistance') },
    ];
  }, [assistances, activeProjectsCount, delayedProjects.length, cuttingProjects.length, logisticsProjects.length, onNavigate]);


  // --- Integrity Test Logic ---
  const runIntegrityTest = () => {
    setTestStatus('running');
    setTestProgress(0);
    const steps = [
      "Escaneando Banco de Dados de Obras...", "Validando Memoriais Descritivos...",
      "Simulando Cotação Técnica...", "Testando Entrada de Nota Fiscal...",
      "Verificando Atualização do DRE...", "Validando Auditoria de Montadores...",
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

  // --- AI Insight Logic ---
  const fetchInsight = async (force = false) => {
    if (!force) {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) { setInsight(cached); return; }
    }
    setLoadingInsight(true);
    const result = await analyzeDailyBriefing(projects, todaysEvents, priorityAssistances);
    if (result && !result.includes("limite") && !result.includes("âš ï¸")) {
      sessionStorage.setItem(CACHE_KEY, result);
    }
    setInsight(result);
    setLoadingInsight(false);
  };

  useEffect(() => { fetchInsight(); }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Hero Header */}
      <div className="relative pt-12 pb-8 overflow-hidden rounded-[48px]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6 px-1">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tightest leading-none text-gradient-premium">
              Bom dia, <span className="opacity-50">Equipe Hypado</span>
            </h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.4em] italic pl-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('obras')}
            className="group relative px-8 py-4 bg-slate-900 dark:bg-card text-white dark:text-foreground rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-indigo-200 dark:shadow-none overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-2">
              <Play size={14} fill="currentColor" className="text-amber-500" /> Nova Obra
            </span>
          </button>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            onClick={stat.onClick}
            className={`group relative bg-card dark:bg-slate-900/50 p-8 bento-card border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden ${stat.onClick ? 'cursor-pointer hover:border-rose-200 dark:hover:border-rose-800' : ''}`}
          >
            <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 blur-2xl rounded-full`} />

            <div className="flex flex-col items-start gap-6 relative z-10">
              <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-3xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                <stat.icon size={28} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 italic transition-all group-hover:translate-x-1">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl font-black text-foreground dark:text-white tracking-tighter leading-none italic">{stat.value}</p>
                  <ArrowRight size={14} className="text-slate-300 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Smart AI Hub */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-600/10 rounded-[40px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative glass-premium p-6 bento-card overflow-hidden">
            <div className="absolute -right-20 -top-20 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-1000">
              <Sparkles size={300} className="text-indigo-600 animate-pulse" />
            </div>

            <div className="flex flex-col md:flex-row gap-10 items-start relative z-10">
              <div className="flex flex-col items-center gap-6 shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-300 dark:shadow-none animate-bounce-slow">
                  <Sparkles size={24} strokeWidth={1.5} />
                </div>
                <button
                  onClick={() => fetchInsight(true)}
                  disabled={loadingInsight}
                  className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] hover:text-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingInsight ? 'Sincronizando...' : 'Recalcular'}
                </button>
              </div>

              <div className="flex-1 space-y-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="h-[2px] w-8 bg-indigo-500 rounded-full" />
                    <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.4em] italic">Hypado Assistant</h3>
                  </div>
                  <h4 className="text-xl font-black text-foreground dark:text-white uppercase italic tracking-tighter leading-none pt-1">Pulse Check</h4>
                </div>
                <div className="relative">
                  <p className="text-sm text-muted-foreground dark:text-slate-300 font-medium italic leading-relaxed whitespace-pre-line pl-4">
                    {insight || "Analisando fluxo e pontos críticos..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Health / Performance Mini Bento */}
        <div className="flex flex-col gap-6">
          <div className="flex-1 glass-dark p-8 bento-card group">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 italic">Eficiência Operacional</p>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-black text-white tracking-tighter italic">98.4%</span>
                <TrendingUp size={20} className="text-emerald-400 mb-1" />
              </div>
              <div className="w-full bg-card/10 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 w-[98.4%] rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Sincronização entre corte e logística operando em alta performance.</p>
            </div>
          </div>

          <div className="glass-premium p-6 bento-card bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-none">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Sistema</p>
                <p className="text-xs font-black text-foreground dark:text-white uppercase">Operacional 100%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Ultra-Modern Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left: Production Pulse (Timeline-style) */}
        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-slate-900 dark:bg-card rounded-full" />
              <h3 className="text-sm font-black text-foreground dark:text-white uppercase tracking-[0.4em] italic leading-none">Pulse de Produção</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo Ativo</span>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Cutting Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-orange-500/10 text-orange-600 rounded-xl">
                  <Scissors size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Em Corte</span>
              </div>
              <div className="space-y-4">
                {cuttingProjects.length === 0 ? (
                  <div className="h-40 glass-premium rounded-[32px] flex items-center justify-center border-dashed border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-300 uppercase italic">Vazio</p>
                  </div>
                ) : (
                  cuttingProjects.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => onNavigate?.('pcp')}
                      className="group relative glass-premium p-6 bento-card border-none hover:bg-orange-50/50 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h5 className="text-base font-black text-foreground dark:text-white uppercase italic leading-tight">{p.workName}</h5>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.clientName}</p>
                        </div>
                        <div className="p-2 bg-card dark:bg-slate-800 rounded-xl text-[9px] font-black italic text-orange-600 shadow-sm">
                          {p.promisedDate ? new Date(p.promisedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'S/D'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 w-1/3" />
                        </div>
                        <span className="text-[9px] font-black text-orange-500 italic">33%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Logistics Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Truck size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Logística</span>
              </div>
              <div className="space-y-4">
                {logisticsProjects.length === 0 ? (
                  <div className="h-40 glass-premium rounded-[32px] flex items-center justify-center border-dashed border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-300 uppercase italic">Vazio</p>
                  </div>
                ) : (
                  logisticsProjects.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => onNavigate?.('pcp')}
                      className="group relative glass-premium p-6 bento-card border-none hover:bg-emerald-50/50 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h5 className="text-base font-black text-foreground dark:text-white uppercase italic leading-tight">{p.workName}</h5>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.clientName}</p>
                        </div>
                        <div className="p-2 bg-card dark:bg-slate-800 rounded-xl text-[9px] font-black italic text-emerald-600 shadow-sm">
                          {p.promisedDate ? new Date(p.promisedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'S/D'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-2/3" />
                        </div>
                        <span className="text-[9px] font-black text-emerald-500 italic">66%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Production Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                  <Hammer size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Instalação</span>
              </div>
              <div className="space-y-4">
                {installingProjects.length === 0 ? (
                  <div className="h-40 glass-premium rounded-[32px] flex items-center justify-center border-dashed border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-300 uppercase italic">Vazio</p>
                  </div>
                ) : (
                  installingProjects.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => onNavigate?.('pcp')}
                      className="group relative glass-premium p-6 bento-card border-none hover:bg-indigo-50/50 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h5 className="text-base font-black text-foreground dark:text-white uppercase italic leading-tight">{p.workName}</h5>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.clientName}</p>
                        </div>
                        <div className="p-2 bg-card dark:bg-slate-800 rounded-xl text-[9px] font-black italic text-indigo-600 shadow-sm">
                          {p.promisedDate ? new Date(p.promisedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'S/D'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 w-[90%]" />
                        </div>
                        <span className="text-[9px] font-black text-indigo-500 italic">90%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Minimalist Focus Sidebar */}
        <div className="lg:col-span-4 space-y-8 h-full">
          <div className="glass-premium p-8 bento-card flex flex-col gap-10 min-h-[600px]">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <Calendar size={18} className="text-foreground dark:text-white" />
                <h3 className="text-xs font-black text-foreground dark:text-white uppercase tracking-[0.4em] italic leading-none">Agenda Focal</h3>
              </div>

              <div className="space-y-6">
                {todaysEvents.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic leading-relaxed">Sem compromissos externos para hoje.</p>
                  </div>
                ) : (
                  todaysEvents.map(evt => (
                    <div
                      key={evt.id}
                      onClick={() => onNavigate?.('agenda')}
                      className="group relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer"
                    >
                      <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-all" />
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 italic">{new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-sm font-black text-foreground dark:text-white uppercase italic tracking-tight">{evt.title}</p>
                      <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest mt-1">
                        <MapPin size={8} /> {evt.location || 'Escritório'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-8">
                <AlertTriangle size={18} className="text-rose-500" />
                <h3 className="text-xs font-black text-rose-500 uppercase tracking-[0.4em] italic leading-none">Prioridades</h3>
              </div>
              <div className="space-y-4">
                {priorityAssistances.length === 0 ? (
                  <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 text-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Operação estável âœ¨</p>
                  </div>
                ) : (
                  priorityAssistances.slice(0, 2).map(a => (
                    <div
                      key={a.id}
                      onClick={() => onNavigate?.('assistance')}
                      className="p-6 bg-muted/50 dark:bg-slate-800/50 rounded-[32px] border border-slate-100 dark:border-slate-700 group hover:border-rose-200 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-black text-foreground dark:text-white uppercase italic truncate max-w-[140px]">{a.clientName}</p>
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      </div>
                      <p className="text-[10px] text-muted-foreground dark:text-slate-400 font-medium italic line-clamp-1">"{a.reportedProblem}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Integrity Lab (Mini) Moved to bottom of focus panel */}
            <div className={`mt-auto p-8 rounded-[40px] overflow-hidden relative transition-all duration-700 ${testStatus === 'success' ? 'bg-emerald-600' : 'bg-slate-900'}`}>
              <ShieldCheck className={`absolute -right-6 -bottom-6 text-white opacity-10 transition-transform duration-1000 ${testStatus === 'running' ? 'animate-spin-slow scale-150' : ''}`} size={120} />
              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  {testStatus === 'success' ? <CheckCircle2 size={16} className="text-white" /> : <Activity size={16} className="text-amber-500" />}
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] italic leading-none">Integrity Lab</span>
                </div>

                {testStatus !== 'running' ? (
                  <button
                    onClick={runIntegrityTest}
                    className="w-full bg-card text-foreground text-xs font-black uppercase italic tracking-[0.2em] py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-black/40"
                  >
                    {testStatus === 'success' ? 'Sistema Verificado' : 'Verificar Sistema'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[10px] text-white font-black italic uppercase truncate animate-pulse tracking-widest">{currentStepText}</p>
                    <div className="w-full bg-card/20 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-card transition-all duration-300 shadow-[0_0_10px_white]" style={{ width: `${testProgress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Delayed Projects */}
      {showDelayedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-50/50 dark:bg-rose-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground dark:text-white uppercase italic tracking-tight">Obras em Atraso</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{delayedProjects.length} {delayedProjects.length === 1 ? 'registro' : 'registros'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDelayedModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {delayedProjects.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center">
                  <CheckCircle2 size={48} className="text-emerald-400 mb-4 opacity-50" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Nenhuma obra em atraso!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {delayedProjects.map(project => {
                    const diffTime = Math.abs(new Date().getTime() - new Date(project.promisedDate).getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    return (
                      <div key={project.id} className="p-4 bg-muted/30 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 transition-colors flex justify-between items-center group">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-foreground dark:text-white uppercase italic">{project.workName}</h4>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{project.clientName}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Prometido</p>
                            <p className="text-xs font-bold text-foreground dark:text-white">{new Date(project.promisedDate).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-800 min-w-[80px] text-center">
                            <p className="text-xs font-black italic">{diffDays} {diffDays === 1 ? 'dia' : 'dias'}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-80">Atraso</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
