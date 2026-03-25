
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
    const activeProjects = projects.filter(p => p.currentStatus !== 'Cancelada');
    const totalSold = activeProjects.reduce((acc, p) => acc + (p.value || 0), 0);

    // Custo estimado (Materiais + Terceiros + Despesas Extras)
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
    return ranking.sort((a, b) => b.value - a.value).slice(0, 5); // Sort by Value Earned
  }, [installers, projects]);

  // --- 7. TEMPO MÉDIO DE CICLO (Venda -> Finalizada) ---
  const avgCycleTime = useMemo(() => {
    let totalDays = 0;
    let count = 0;

    projects.forEach(p => {
      if (p.currentStatus === 'Finalizada' && (p.history || p.registrationDate)) {
        // Try to find status history or use registrationDate
        const startTimestamp = p.history?.find(h => h.status === 'Venda')?.timestamp || p.registrationDate || p.contractDate;
        const endTimestamp = p.history?.find(h => h.status === 'Finalizada')?.timestamp;

        if (startTimestamp && endTimestamp) {
          const startDate = new Date(startTimestamp);
          const endDate = new Date(endTimestamp);
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
            
            // Sanity check: if it was finalized same day or negative (history error), count as at least 1 day
            totalDays += Math.max(1, diffDays);
            count++;
          }
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

    // Filtrar 'Registro Diário' pois não é causa de refazimento/erro
    const filteredLogs = dailyLogs.filter(log => log.category !== 'Registro Diário');

    const counts = filteredLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, value]): { name: string; value: number } => ({ name, value: value as number }))
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

  // --- 8. RELATÓRIO DE CONSUMO DE ESTOQUE ---
  const [stockMonthFilter, setStockMonthFilter] = React.useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

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

      {/* RELATÓRIO: Consumo de Estoque */}
      <div className="bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm mt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={18} /> Relatório de Consumo de Estoque</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-1">Acompanhamento mensal de materiais baixados para as obras.</p>
              </div>
              <input 
                  type="month"
                  title="Filtro de Mês"
                  className="p-3 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-inner"
                  value={stockMonthFilter}
                  onChange={e => setStockMonthFilter(e.target.value)}
              />
          </div>

          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                      <tr className="border-b border-slate-100">
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Obra Destino</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[40%]">Itens Consumidos</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Custo Transferido</th>
                      </tr>
                  </thead>
                  <tbody>
                      {stockConsumptions.map((cons, idx) => (
                          <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-bold text-sm text-slate-600">
                                  {new Date(cons.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </td>
                              <td className="p-4">
                                  <span className="font-black text-slate-900 uppercase italic text-sm">{cons.projectName}</span>
                              </td>
                              <td className="p-4">
                                  <div className="flex flex-col gap-1">
                                      {cons.items.map((it: any, i: number) => (
                                          <div key={i} className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                              <span className="w-8 text-right shrink-0">{it.quantity} {it.unit}</span>
                                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                              <span className="uppercase truncate" title={it.name}>{it.name}</span>
                                          </div>
                                      ))}
                                  </div>
                              </td>
                              <td className="p-4 text-right">
                                  <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl whitespace-nowrap">
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

    </div>
  );
};

export default AnalyticsView;
