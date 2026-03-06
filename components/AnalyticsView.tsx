
import React, { useMemo } from 'react';
import { Project, Client, Installer, TechnicalAssistance, Quotation, DailyLog } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, Users, AlertTriangle, DollarSign, Award, Truck, ShoppingCart, Hammer, Timer } from 'lucide-react';
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
  const { userRole } = useData();

  // --- 1. FINANCEIRO ---
  const financialMetrics = useMemo(() => {
    const totalSold = projects.reduce((acc, p) => acc + (p.value || 0), 0);

    // Custo estimado (Materiais + Terceiros + Despesas Extras)
    // Nota: O cálculo exato dependeria de ter o custo de cada item do memorial, 
    // aqui usamos os valores salvos no memorial e despesas lançadas.
    const totalCost = projects.reduce((acc, p) => {
      const expenses = (p.expenses || []).reduce((eAcc, e) => eAcc + e.value, 0);
      const outsourced = (p.outsourcedServices || []).reduce((oAcc, o) => oAcc + (o.value || 0), 0);

      // Custo de material do dossiê (estimado pelos valores cadastrados)
      // Se o valor não estiver no memorial, assumimos 0
      let materialCost = 0;
      p.environmentsDetails.forEach(env => {
        materialCost += (env.memorial.mdfParts || []).reduce((mAcc, m) => mAcc + (m.value || 0), 0);
        materialCost += (env.memorial.hardwareItems || []).reduce((hAcc, h) => hAcc + (h.value || 0), 0);
        materialCost += (env.memorial.appliances || []).reduce((aAcc, a) => aAcc + (a.value || 0), 0);
      });

      return acc + expenses + outsourced + materialCost;
    }, 0);

    const margin = totalSold > 0 ? ((totalSold - totalCost) / totalSold) * 100 : 0;
    const ticketmedio = projects.length > 0 ? totalSold / projects.length : 0;

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
    return ranking.sort((a, b) => b.value - a.value).slice(0, 5); // Sort by Value Earned
  }, [installers, projects]);

  // --- 7. TEMPO MÉDIO DE CICLO (Confirmado -> Finalizada) ---
  const avgCycleTime = useMemo(() => {
    let totalDays = 0;
    let count = 0;

    projects.forEach(p => {
      if (p.currentStatus === 'Finalizada' && p.history) {
        // Find earliest 'Confirmado' (Sale) and latest 'Finalizada'
        const start = p.history.find(h => h.status === 'Confirmado')?.timestamp;
        const end = p.history.find(h => h.status === 'Finalizada')?.timestamp;

        if (start && end) {
          const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
          totalDays += diffDays;
          count++;
        }
      }
    });

    return count > 0 ? Math.round(totalDays / count) : 0;
  }, [projects]);


  // --- 4. ÍNDICE DE RETRABALHO (Chamados por Montador) ---
  const reworkRanking = useMemo(() => {
    const counts: Record<string, number> = {};

    (assistances || []).forEach(ticket => {
      const project = projects.find(p => p.id === ticket.projectId);
      if (project) {
        // Try to find installer from project.installerId (Legacy) or infer from environments?
        // For now, we stick to project.installerId as primary responsibility holder
        if (project.installerId) {
          counts[project.installerId] = (counts[project.installerId] || 0) + 1;
        }
      }
    });

    const ranking = installers.map(i => ({
      name: i.name,
      tickets: counts[i.id] || 0
    })).sort((a, b) => b.tickets - a.tickets).slice(0, 5);

    return ranking;
  }, [assistances, projects, installers]);

  // --- 5. INDICADORES DE REFAZIMENTO (Causas de Ocorrência) ---
  const reworkCausesData = useMemo(() => {
    if (!dailyLogs) return [];

    // Filtrar apenas categorias de erro/problema (ignorando 'Outros' se desejar, ou incluir todos)
    const counts = dailyLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, value]): { name: string; value: number } => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [dailyLogs]);

  // --- 6. TOP FORNECEDORES (Compras) ---
  const topSuppliers = useMemo(() => {
    if (!purchaseOrders) return [];

    const supplierCounts: Record<string, number> = {};

    purchaseOrders.forEach(po => {
      const total = po.items.reduce((acc, i) => acc + ((i.materialValue || 0) * i.quantity), 0);
      if (po.status === 'Comprado' || po.status === 'Entregue') {
        supplierCounts[po.supplierId] = (supplierCounts[po.supplierId] || 0) + total;
      }
    });

    return Object.entries(supplierCounts)
      .map(([id, value]) => ({ id, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

  }, [purchaseOrders]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div>
        <h3 className="text-3xl font-black text-foreground uppercase italic tracking-tighter">Relatórios & Métricas</h3>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Inteligência de Dados para Decisões Estratégicas</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Vendas Totais</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {userRole === 'owner' ? `R$ ${financialMetrics.totalSold.toLocaleString()}` : 'RESTRITO'}
            </p>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24} /></div>
        </div>
        <div className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ticket Médio</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {userRole === 'owner' ? `R$ ${financialMetrics.ticketmedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'RESTRITO'}
            </p>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><ShoppingCart size={24} /></div>
        </div>
        <div className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tempo Médio Ciclo</p>
            <p className="text-2xl font-black text-foreground mt-1">{avgCycleTime} Dias</p>
          </div>
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Timer size={24} /></div>
        </div>
        <div className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Obras Finalizadas</p>
            <p className="text-2xl font-black text-foreground mt-1">{projects.filter(p => p.currentStatus === 'Finalizada').length}</p>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Award size={24} /></div>
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
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
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
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 800 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number) => `${value} ocorrências`} contentStyle={{ borderRadius: '12px' }} />
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
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                    <span>{inst.name}</span>
                    <span className="text-foreground">
                      {userRole === 'owner' ? `R$ ${inst.value.toLocaleString()}` : '***'}
                    </span>
                  </div>
                  <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                    <div className="bg-slate-900 h-full" style={{ width: `${(inst.value / (installerRanking[0]?.value || 1)) * 100}%` }}></div>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{inst.count} Ambientes Entregues</p>
                </div>
              </div>
            ))}
            {installerRanking.length === 0 && <p className="text-center text-slate-300 font-bold italic">Sem dados suficientes.</p>}
          </div>
        </div>

        {/* CHART: Índice de Retrabalho */}
        <div className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm border-l-8 border-l-red-500">
          <h4 className="text-sm font-black text-red-500 uppercase tracking-widest mb-8 flex items-center gap-2"><AlertTriangle size={18} /> Índice de Retrabalho (Chamados)</h4>
          <p className="text-xs text-slate-400 mb-6 font-bold uppercase">Montadores com maior volume de chamados de assistência técnica vinculados aos seus projetos.</p>
          <div className="space-y-4">
            {reworkRanking.map((inst, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                <span className="font-black text-foreground uppercase text-xs">{inst.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-red-600">{inst.tickets}</span>
                  <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Chamados</span>
                </div>
              </div>
            ))}
            {reworkRanking.length === 0 && <p className="text-center text-slate-300 font-bold italic">Nenhum chamado registrado.</p>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsView;
