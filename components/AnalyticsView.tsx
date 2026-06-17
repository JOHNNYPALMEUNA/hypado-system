import React, { useMemo } from 'react';
import { Project, Client, Installer, TechnicalAssistance, Quotation, DailyLog } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, AlertTriangle, DollarSign, Award, Truck, 
  ShoppingCart, Hammer, Timer, Calendar, Briefcase 
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface Props {
  projects: Project[];
  clients: Client[];
  installers: Installer[];
  assistances: TechnicalAssistance[];
  purchaseOrders: Quotation[];
  dailyLogs: DailyLog[];
}

const COLORS = ['#f59e0b', '#10b981', '#6366f1', '#f43f5e', '#64748b', '#8b5cf6'];

const AnalyticsView: React.FC<Props> = ({ projects, clients, installers, assistances, purchaseOrders, dailyLogs }) => {
  const { userRole, fetchFullProject, refundRequests } = useData();
  
  // Navigation tab
  const [activeTab, setActiveTab] = React.useState<'geral' | 'montadores' | 'internas' | 'estoque'>('geral');
  
  // Installer specific filters
  const [selectedInstallerName, setSelectedInstallerName] = React.useState('Todos');
  const [selectedMonth, setSelectedMonth] = React.useState('Todos');

  // Stock filter
  const [stockMonthFilter, setStockMonthFilter] = React.useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // HYDRATION: Analytics needs full project data for costs and rankings
  React.useEffect(() => {
    projects.forEach(p => {
      if ((!p.environmentsDetails || p.environmentsDetails.length === 0) && (!p.outsourcedServices || p.outsourcedServices.length === 0)) {
        fetchFullProject(p.id);
      }
    });
  }, []);

  // --- 1. FINANCEIRO (Resumo Geral) ---
  const financialMetrics = useMemo(() => {
    const activeProjects = projects.filter(p => p.currentStatus !== 'Cancelada');
    const totalSold = activeProjects.reduce((acc, p) => acc + (p.value || 0), 0);

    const totalCost = activeProjects.reduce((acc, p) => {
      const expenses = (p.expenses || []).reduce((eAcc, e) => eAcc + e.value, 0);
      const outsourced = (p.outsourcedServices || []).reduce((oAcc, o) => oAcc + (o.value || 0), 0);

      let materialCost = 0;
      p.environmentsDetails.forEach(env => {
        materialCost += (env.memorial.mdfParts || []).reduce((mAcc, m) => mAcc + (m.value || 0), 0);
        materialCost += (env.memorial.hardwareItems || []).reduce((hAcc, h) => hAcc + (h.value || 0), 0);
        materialCost += (env.memorial.appliances || []).reduce((aAcc, a) => aAcc + (a.value || 0), 0);
      });

      return acc + expenses + outsourced + materialCost;
    }, 0);

    const margin = totalSold > 0 ? ((totalSold - totalCost) / totalSold) * 100 : 0;
    const ticketmedio = activeProjects.length > 0 ? totalSold / activeProjects.length : 0;

    return { totalSold, totalCost, margin, ticketmedio };
  }, [projects]);

  // --- 2. PRODUÇÃO (Status) ---
  const statusData = useMemo(() => {
    const counts = projects.reduce((acc, p) => {
      acc[p.currentStatus] = (acc[p.currentStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projects]);

  // --- 3. RANKING DE MONTADORES (Ambientes Autorizados) ---
  const installerRanking = useMemo(() => {
    const ranking = installers.map(installer => {
      let authorizedEnvs = 0;
      let totalValue = 0;
      let activeEnvs = 0;

      projects.forEach(p => {
        if (p.environmentsDetails) {
          p.environmentsDetails.forEach(env => {
            if (env.assignedInstallerId === installer.id) {
              if (env.isMdoAuthorized) {
                authorizedEnvs++;
                totalValue += (env.authorizedMdoValue || 0);
              } else if (env.mdoStatus === 'Enviado') {
                activeEnvs++;
              }
            }
          });
        }
      });

      return { name: installer.name, count: authorizedEnvs, value: totalValue, active: activeEnvs };
    });
    return ranking.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [installers, projects]);

  // --- 4. ÍNDICE DE RETRABALHO (Chamados por Montador) ---
  const reworkRanking = useMemo(() => {
    const counts: Record<string, number> = {};

    (assistances || []).forEach(ticket => {
      const project = projects.find(p => p.id === ticket.projectId);
      if (project) {
        if (project.installerId) {
          counts[project.installerId] = (counts[project.installerId] || 0) + 1;
        }
      }
    });

    return installers.map(i => ({
      name: i.name,
      tickets: counts[i.id] || 0
    })).sort((a, b) => b.tickets - a.tickets).slice(0, 5);
  }, [assistances, projects, installers]);

  // --- 5. INDICADORES DE REFAZIMENTO (Causas de Ocorrência) ---
  const reworkCausesData = useMemo(() => {
    if (!dailyLogs) return [];
    const filteredLogs = dailyLogs.filter(log => log.category !== 'Registro Diário');
    const counts = filteredLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, value]): { name: string; value: number } => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }, [dailyLogs]);

  // --- 6. TEMPO MÉDIO DE CICLO (Venda -> Finalizada) ---
  const avgCycleTime = useMemo(() => {
    let totalDays = 0;
    let count = 0;

    projects.forEach(p => {
      if (p.currentStatus === 'Finalizada' && (p.history || p.registrationDate)) {
        const startTimestamp = p.history?.find(h => h.status === 'Venda')?.timestamp || p.registrationDate || p.contractDate;
        const endTimestamp = p.history?.find(h => h.status === 'Finalizada')?.timestamp;

        if (startTimestamp && endTimestamp) {
          const startDate = new Date(startTimestamp);
          const endDate = new Date(endTimestamp);
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
            
            totalDays += Math.max(1, diffDays);
            count++;
          }
        }
      }
    });

    return count > 0 ? Math.round(totalDays / count) : 0;
  }, [projects]);

  // --- 7. RELATÓRIO DE CONSUMO DE ESTOQUE ---
  const stockConsumptions = useMemo(() => {
    const list: { id: string, date: string, projectName: string, items: any[], totalValue: number }[] = [];
    projects.forEach(p => {
      if (p.expenses) {
        p.expenses.forEach(exp => {
          if (exp.metadata && exp.metadata.type === 'stock_consumption' && exp.date.startsWith(stockMonthFilter)) {
            list.push({
               id: exp.id,
               date: exp.date,
               projectName: p.workName,
               items: exp.metadata.items || [],
               totalValue: exp.value
            });
          }
        });
      }
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [projects, stockMonthFilter]);


  // ==========================================
  // PHASE 2 DATA CALCULATIONS: INSTALLER MONTHLY
  // ==========================================

  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    refundRequests.forEach(r => {
      const m = r.date.substring(0, 7);
      if (m && m.match(/^\d{4}-\d{2}$/)) {
        months.add(m);
      }
    });
    return Array.from(months).sort();
  }, [refundRequests]);

  const installerChartData = useMemo(() => {
    if (selectedInstallerName !== 'Todos') {
      const dataMap: Record<string, number> = {};
      uniqueMonths.forEach(m => { dataMap[m] = 0; });
      refundRequests.forEach(r => {
        if (r.collaboratorName === selectedInstallerName) {
          const m = r.date.substring(0, 7);
          if (dataMap[m] !== undefined) {
            dataMap[m] += r.amount;
          }
        }
      });
      return Object.entries(dataMap).map(([month, value]) => ({
        name: month,
        value: parseFloat(value.toFixed(2))
      }));
    } else if (selectedMonth !== 'Todos') {
      const dataMap: Record<string, number> = {};
      installers.forEach(inst => { dataMap[inst.name] = 0; });
      refundRequests.forEach(r => {
        const m = r.date.substring(0, 7);
        if (m === selectedMonth && dataMap[r.collaboratorName] !== undefined) {
          dataMap[r.collaboratorName] += r.amount;
        }
      });
      return Object.entries(dataMap)
        .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
        .filter(item => item.value > 0);
    } else {
      const dataMap: Record<string, number> = {};
      uniqueMonths.forEach(m => { dataMap[m] = 0; });
      refundRequests.forEach(r => {
        const m = r.date.substring(0, 7);
        if (dataMap[m] !== undefined) {
          dataMap[m] += r.amount;
        }
      });
      return Object.entries(dataMap).map(([month, value]) => ({
        name: month,
        value: parseFloat(value.toFixed(2))
      }));
    }
  }, [selectedInstallerName, selectedMonth, refundRequests, uniqueMonths, installers]);

  const filteredInstallerRequests = useMemo(() => {
    return refundRequests.filter(r => {
      const matchesInstaller = selectedInstallerName === 'Todos' || r.collaboratorName === selectedInstallerName;
      const matchesMonth = selectedMonth === 'Todos' || r.date.substring(0, 7) === selectedMonth;
      return matchesInstaller && matchesMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [refundRequests, selectedInstallerName, selectedMonth]);


  // ==========================================
  // PHASE 2 DATA CALCULATIONS: INTERNAL OS / LOSSES
  // ==========================================

  const internalOSProjects = useMemo(() => {
    return projects.filter(p => 
      p.workName.toLowerCase().includes('interno') || 
      p.workName.toLowerCase().includes('interna') || 
      p.clientName.toLowerCase().includes('interno') || 
      p.clientName.toLowerCase().includes('interna')
    );
  }, [projects]);

  const internalLossStats = useMemo(() => {
    let totalLoss = 0;
    const monthlyMap: Record<string, number> = {};
    
    internalOSProjects.forEach(p => {
      const pExpenses = p.expenses || [];
      pExpenses.forEach(e => {
        totalLoss += e.value;
        const month = e.date.substring(0, 7);
        if (month && month.match(/^\d{4}-\d{2}$/)) {
          monthlyMap[month] = (monthlyMap[month] || 0) + e.value;
        }
      });
    });

    const chartData = Object.entries(monthlyMap)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { totalLoss, chartData };
  }, [internalOSProjects]);

  const internalProjectsDetails = useMemo(() => {
    return internalOSProjects.map(p => {
      let total = 0;
      const categories: Record<string, number> = {};
      
      const pExpenses = p.expenses || [];
      pExpenses.forEach(e => {
        total += e.value;
        const cat = e.category || 'Outros';
        categories[cat] = (categories[cat] || 0) + e.value;
      });

      return {
        id: p.id,
        workName: p.workName,
        clientName: p.clientName,
        totalValue: total,
        categories: Object.entries(categories).map(([name, val]) => ({ name, val: parseFloat(val.toFixed(2)) }))
      };
    }).sort((a, b) => b.totalValue - a.totalValue);
  }, [internalOSProjects]);


  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-black text-foreground uppercase italic tracking-tighter">Relatórios & Métricas</h3>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Inteligência de Dados para Decisões Estratégicas</p>
        </div>

        {/* Unified Tab Selector */}
        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
          {[
            { id: 'geral', label: 'Resumo Geral', icon: TrendingUp },
            { id: 'montadores', label: 'Gastos com Montadores', icon: Users },
            { id: 'internas', label: 'OS Internas & Prejuízos', icon: AlertTriangle },
            { id: 'estoque', label: 'Consumo de Estoque', icon: ShoppingCart }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === t.id
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          TAB 1: RESUMO GERAL
          ========================================== */}
      {activeTab === 'geral' && (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Vendas Totais</p>
                <p className="text-2xl font-black text-foreground mt-1">
                  {userRole === 'owner' ? `R$ ${financialMetrics.totalSold.toLocaleString()}` : 'RESTRITO'}
                </p>
              </div>
              <div className="p-4 bg-emerald-50/10 text-emerald-400 rounded-2xl"><DollarSign size={24} /></div>
            </div>
            <div className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ticket Médio</p>
                <p className="text-2xl font-black text-foreground mt-1">
                  {userRole === 'owner' ? `R$ ${financialMetrics.ticketmedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'RESTRITO'}
                </p>
              </div>
              <div className="p-4 bg-blue-50/10 text-blue-400 rounded-2xl"><ShoppingCart size={24} /></div>
            </div>
            <div className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tempo Médio Ciclo</p>
                <p className="text-2xl font-black text-foreground mt-1">{avgCycleTime} Dias</p>
              </div>
              <div className="p-4 bg-indigo-50/10 text-indigo-400 rounded-2xl"><Timer size={24} /></div>
            </div>
            <div className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Obras Finalizadas</p>
                <p className="text-2xl font-black text-foreground mt-1">{projects.filter(p => p.currentStatus === 'Finalizada').length}</p>
              </div>
              <div className="p-4 bg-amber-50/10 text-amber-400 rounded-2xl"><Award size={24} /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CHART: Status das Obras */}
            <div className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Truck size={18} /> Status de Produção</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART: Indicadores de Refazimento (Causas) */}
            <div className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><AlertTriangle size={18} /> Principais Causas de Refazimento</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reworkCausesData} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} formatter={(value: number) => `${value} ocorrências`} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }} />
                    <Bar dataKey="value" fill="#f43f5e" radius={[0, 8, 8, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART: Ranking Montadores (Valor Autorizado) */}
            <div className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Hammer size={18} /> Montadores: Valor Autorizado</h4>
              <div className="space-y-6">
                {installerRanking.map((inst, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs border border-slate-800">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                        <span>{inst.name}</span>
                        <span className="text-foreground font-black">
                          {userRole === 'owner' ? `R$ ${inst.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '***'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(inst.value / (installerRanking[0]?.value || 1)) * 100}%` }}></div>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{inst.count} Ambientes Entregues</p>
                    </div>
                  </div>
                ))}
                {installerRanking.length === 0 && <p className="text-center text-slate-400 font-bold italic">Sem dados suficientes.</p>}
              </div>
            </div>

            {/* CHART: Índice de Retrabalho */}
            <div className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm border-l-8 border-l-rose-500">
              <h4 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-8 flex items-center gap-2"><AlertTriangle size={18} /> Índice de Retrabalho (Chamados)</h4>
              <p className="text-xs text-slate-400 mb-6 font-bold uppercase">Montadores com maior volume de chamados de assistência técnica vinculados aos seus projetos.</p>
              <div className="space-y-4">
                {reworkRanking.map((inst, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-rose-950/20 rounded-2xl border border-rose-500/10">
                    <span className="font-black text-foreground uppercase text-xs">{inst.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-rose-400">{inst.tickets}</span>
                      <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">Chamados</span>
                    </div>
                  </div>
                ))}
                {reworkRanking.length === 0 && <p className="text-center text-slate-400 font-bold italic">Nenhum chamado registrado.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==========================================
          TAB 2: GASTOS COM MONTADORES (PHASE 2)
          ========================================== */}
      {activeTab === 'montadores' && (
        <div className="space-y-8">
          {/* Filters card */}
          <div className="glass-premium p-6 rounded-3xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Filtrar por Montador</label>
              <div className="relative">
                <select
                  value={selectedInstallerName}
                  onChange={(e) => setSelectedInstallerName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none appearance-none text-white font-bold"
                  title="Selecionar Montador"
                >
                  <option value="Todos">Todos os Montadores</option>
                  {installers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Filtrar por Mês</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none appearance-none text-white font-bold"
                  title="Selecionar Mês"
                >
                  <option value="Todos">Todos os Meses</option>
                  {uniqueMonths.map(m => (
                    <option key={m} value={m}>{m.split('-')[1]}/{m.split('-')[0]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Column */}
            <div className="lg:col-span-1 bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <TrendingUp size={18} /> Histórico Financeiro
                </h4>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-6">
                  {selectedInstallerName === 'Todos' 
                    ? (selectedMonth === 'Todos' ? 'Soma total de gastos por mês' : `Comparação entre montadores em ${selectedMonth}`)
                    : `Gastos mensais de ${selectedInstallerName}`}
                </p>
              </div>

              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={installerChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* List Details Column */}
            <div className="lg:col-span-2 bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Hammer size={18} /> Detalhamento de Lançamentos ({filteredInstallerRequests.length})
                </h4>
              </div>

              <div className="overflow-x-auto custom-scrollbar flex-1 max-h-[350px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="py-3 px-2">Data</th>
                      <th className="py-3 px-2">Montador</th>
                      <th className="py-3 px-2">Descrição</th>
                      <th className="py-3 px-2">Categoria</th>
                      <th className="py-3 px-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInstallerRequests.map((req) => (
                      <tr key={req.id} className="border-b border-slate-800/50 text-xs hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 px-2 font-bold text-slate-400">
                          {new Date(req.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-2 font-black text-white">{req.collaboratorName}</td>
                        <td className="py-3 px-2 max-w-[200px] truncate">
                          <p className="font-bold text-white uppercase">{req.establishment}</p>
                          <p className="text-[10px] text-slate-400 truncate">{req.description}</p>
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] font-bold text-slate-300">
                            {req.category}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-black text-emerald-400">
                          R$ {req.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {filteredInstallerRequests.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-bold italic uppercase text-[10px]">
                          Nenhum lançamento encontrado para estes filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: OS INTERNAS & PREJUÍZOS (PHASE 2)
          ========================================== */}
      {activeTab === 'internas' && (
        <div className="space-y-8">
          {/* Loss KPI & monthly trend layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* KPI Card */}
            <div className="lg:col-span-1 bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between border-l-8 border-l-red-500">
              <div className="space-y-3">
                <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={16} /> Total Prejuízos OS Internas
                </h4>
                <p className="text-[11px] text-slate-400 font-bold uppercase leading-relaxed">
                  Agregado de todas as despesas e prejuízos lançados sob OSs que contêm "Interna/Interno" no nome.
                </p>
              </div>

              <div className="my-8">
                <p className="text-4xl font-black text-rose-400">
                  R$ {internalLossStats.totalLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                  Total em {internalOSProjects.length} OSs Internas abertas
                </p>
              </div>
            </div>

            {/* Monthly trend chart */}
            <div className="lg:col-span-2 bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Briefcase size={18} /> Tendência Mensal de Perdas Internas
                </h4>
              </div>

              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={internalLossStats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }} />
                    <Bar dataKey="value" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table Details */}
          <div className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calendar size={18} /> Detalhamento de Custos de OS Internas
            </h4>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-3 px-2">ID</th>
                    <th className="py-3 px-2">Nome da OS Interna</th>
                    <th className="py-3 px-2">Responsável/Cliente</th>
                    <th className="py-3 px-2">Composição de Gastos</th>
                    <th className="py-3 px-2 text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {internalProjectsDetails.map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/50 text-xs hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-2 font-bold text-slate-500 uppercase">{p.id.split('-')[1] || p.id}</td>
                      <td className="py-4 px-2 font-black text-white uppercase italic">{p.workName}</td>
                      <td className="py-4 px-2 text-slate-300 font-bold uppercase">{p.clientName}</td>
                      <td className="py-4 px-2">
                        <div className="flex flex-wrap gap-2">
                          {p.categories.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-[8px] text-[9px] font-bold text-slate-300">
                              {c.name}: R$ {c.val.toLocaleString('pt-BR')}
                            </span>
                          ))}
                          {p.categories.length === 0 && <span className="text-slate-500 italic">Sem lançamentos</span>}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right font-black text-rose-400">
                        R$ {p.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {internalProjectsDetails.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold italic uppercase text-[10px]">
                        Nenhuma OS interna identificada no sistema (crie uma OS com o nome "Interno" ou "Interna" no cadastro de obras).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: CONSUMO DE ESTOQUE
          ========================================== */}
      {activeTab === 'estoque' && (
        <div className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={18} /> Relatório de Consumo de Estoque</h4>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">Acompanhamento mensal de materiais baixados para as obras.</p>
            </div>
            <input 
              type="month"
              title="Filtro de Mês"
              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 outline-none font-bold text-sm text-white focus:ring-2 focus:ring-emerald-500 shadow-inner"
              value={stockMonthFilter}
              onChange={e => setStockMonthFilter(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Obra Destino</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[40%]">Itens Consumidos</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Custo Transferido</th>
                </tr>
              </thead>
              <tbody>
                {stockConsumptions.map((cons, idx) => (
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 font-bold text-sm text-slate-400">
                      {new Date(cons.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                      <span className="font-black text-white uppercase italic text-sm">{cons.projectName}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {cons.items.map((it: any, i: number) => (
                          <div key={i} className="text-xs font-bold text-slate-400 flex items-center gap-2">
                            <span className="w-8 text-right shrink-0">{it.quantity} {it.unit}</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="uppercase truncate" title={it.name}>{it.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-black text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 px-3 py-1 rounded-xl whitespace-nowrap">
                        R$ {cons.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
                {stockConsumptions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-bold italic uppercase text-xs">
                      Nenhum consumo de estoque registrado neste mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsView;
