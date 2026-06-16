import React, { useState, useMemo } from 'react';
import { 
  DollarSign, Calendar, Users, CheckCircle2, Printer, Search, 
  FileText, PlusCircle, Percent, Hammer, Trash2, Clock, X
} from 'lucide-react';
import { Project, Installer } from '../../types';
import { useData } from '../../contexts/DataContext';
import { formatCurrency, roundToTwo } from '../../utils';

interface PayrollManagerProps {
  projects: Project[];
  installers: Installer[];
}

export const PayrollManager: React.FC<PayrollManagerProps> = ({ projects, installers }) => {
  const { updateProject } = useData();

  // Get current week's Monday and Friday
  const defaultDates = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMonday));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    return {
      start: monday.toISOString().split('T')[0],
      end: friday.toISOString().split('T')[0]
    };
  }, []);

  // Filter States
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [selectedInstallerId, setSelectedInstallerId] = useState('Todos');

  // Launch Payment Modal / Drawer States
  const [launchingEnv, setLaunchingEnv] = useState<{ projectId: string; envName: string; envValue: number } | null>(null);
  const [launchPayment, setLaunchPayment] = useState({
    value: '',
    percentage: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Calculate stats for all authorized environments (Empreitas)
  const activeEmpreitas = useMemo(() => {
    const list: {
      projectId: string;
      workName: string;
      clientName: string;
      envName: string;
      installerId: string;
      installerName: string;
      totalValue: number;
      alreadyPaid: number;
      remainingValue: number;
      payments: any[];
    }[] = [];

    projects.forEach(p => {
      if (p.environmentsDetails) {
        p.environmentsDetails.forEach(env => {
          if (env.isMdoAuthorized && env.mdoStatus === 'Aceito' && env.assignedInstallerId) {
            const installer = installers.find(inst => inst.id === env.assignedInstallerId);
            const payments = (env as any).payments || [];
            const alreadyPaid = payments.reduce((sum: number, pay: any) => sum + (pay.value || 0), 0);
            
            list.push({
              projectId: p.id,
              workName: p.workName,
              clientName: p.clientName,
              envName: env.name,
              installerId: env.assignedInstallerId,
              installerName: installer?.name || 'Não atribuído',
              totalValue: env.authorizedMdoValue || 0,
              alreadyPaid: roundToTwo(alreadyPaid),
              remainingValue: roundToTwo((env.authorizedMdoValue || 0) - alreadyPaid),
              payments
            });
          }
        });
      }
    });

    return list;
  }, [projects, installers]);

  // Calculate detailed payroll items for each installer in the date range
  const payrollReport = useMemo(() => {
    const list: {
      installerId: string;
      installerName: string;
      diarias: { projectId: string; workName: string; date: string; value: number; description: string }[];
      assistencias: { projectId: string; workName: string; date: string; value: number; description: string }[];
      empreitas: { projectId: string; workName: string; envName: string; date: string; value: number; percentage: number; description: string }[];
      totalDiarias: number;
      totalAssistencias: number;
      totalEmpreitas: number;
      grandTotal: number;
    }[] = [];

    const activeInstallers = installers.filter(inst => 
      selectedInstallerId === 'Todos' || inst.id === selectedInstallerId
    );

    activeInstallers.forEach(inst => {
      const diarias: any[] = [];
      const assistencias: any[] = [];
      const empreitas: any[] = [];

      // Scan all projects for matching expenses and environment payments
      projects.forEach(p => {
        // Gather Diárias & Assistências from project expenses
        if (p.expenses) {
          p.expenses.forEach(exp => {
            const expDate = exp.date;
            if (expDate >= startDate && expDate <= endDate) {
              const expInstallerId = exp.metadata?.installerId;
              if (expInstallerId === inst.id) {
                if (exp.id.startsWith('diary-')) {
                  diarias.push({
                    projectId: p.id,
                    workName: p.workName,
                    date: exp.date,
                    value: exp.value,
                    description: exp.description
                  });
                } else if (exp.id.startsWith('assistance-')) {
                  assistencias.push({
                    projectId: p.id,
                    workName: p.workName,
                    date: exp.date,
                    value: exp.value,
                    description: exp.description
                  });
                }
              }
            }
          });
        }

        // Gather Empreitas progress payments from environment details
        if (p.environmentsDetails) {
          p.environmentsDetails.forEach(env => {
            if (env.assignedInstallerId === inst.id && (env as any).payments) {
              (env as any).payments.forEach((pay: any) => {
                if (pay.date >= startDate && pay.date <= endDate) {
                  empreitas.push({
                    projectId: p.id,
                    workName: p.workName,
                    envName: env.name,
                    date: pay.date,
                    value: pay.value,
                    percentage: pay.percentage,
                    description: pay.description || `Avanço de ${pay.percentage}%`
                  });
                }
              });
            }
          });
        }
      });

      const totalDiarias = diarias.reduce((sum, d) => sum + d.value, 0);
      const totalAssistencias = assistencias.reduce((sum, a) => sum + a.value, 0);
      const totalEmpreitas = empreitas.reduce((sum, e) => sum + e.value, 0);
      const grandTotal = totalDiarias + totalAssistencias + totalEmpreitas;

      if (diarias.length > 0 || assistencias.length > 0 || empreitas.length > 0) {
        list.push({
          installerId: inst.id,
          installerName: inst.name,
          diarias,
          assistencias,
          empreitas,
          totalDiarias: roundToTwo(totalDiarias),
          totalAssistencias: roundToTwo(totalAssistencias),
          totalEmpreitas: roundToTwo(totalEmpreitas),
          grandTotal: roundToTwo(grandTotal)
        });
      }
    });

    return list;
  }, [projects, installers, startDate, endDate, selectedInstallerId]);

  // Handle Amount Input Change
  const handleAmountChange = (valStr: string) => {
    if (!launchingEnv) return;
    const val = parseFloat(valStr) || 0;
    const envValue = launchingEnv.envValue;
    setLaunchPayment(prev => ({
      ...prev,
      value: valStr,
      percentage: envValue > 0 ? roundToTwo((val / envValue) * 100).toString() : '0'
    }));
  };

  // Handle Percentage Input Change
  const handlePercentageChange = (pctStr: string) => {
    if (!launchingEnv) return;
    const pct = parseFloat(pctStr) || 0;
    const envValue = launchingEnv.envValue;
    setLaunchPayment(prev => ({
      ...prev,
      percentage: pctStr,
      value: envValue > 0 ? roundToTwo((envValue * pct) / 100).toString() : '0'
    }));
  };

  // Submit Partial Payment to Project Environment
  const handleLaunchPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!launchingEnv) return;

    const val = parseFloat(launchPayment.value) || 0;
    const pct = parseFloat(launchPayment.percentage) || 0;

    if (val <= 0 || pct <= 0) {
      alert("Por favor, preencha valores maiores que zero.");
      return;
    }

    const p = projects.find(proj => proj.id === launchingEnv.projectId);
    if (!p) return;

    const newPayment = {
      id: `pay-${Date.now()}`,
      date: launchPayment.date,
      value: val,
      percentage: pct,
      description: launchPayment.description || `Avanço de ${pct}%`
    };

    const newEnvDetails = p.environmentsDetails.map(env => {
      if (env.name === launchingEnv.envName) {
        const currentPayments = (env as any).payments || [];
        return {
          ...env,
          payments: [...currentPayments, newPayment]
        };
      }
      return env;
    });

    try {
      await updateProject({
        ...p,
        environmentsDetails: newEnvDetails as any
      });
      alert("Pagamento parcial registrado com sucesso!");
      setLaunchingEnv(null);
      setLaunchPayment({
        value: '',
        percentage: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar pagamento.");
    }
  };

  // Remove a partial payment from an environment
  const handleDeletePayment = async (projectId: string, envName: string, paymentId: string) => {
    if (!confirm("Tem certeza de que deseja remover este pagamento?")) return;

    const p = projects.find(proj => proj.id === projectId);
    if (!p) return;

    const newEnvDetails = p.environmentsDetails.map(env => {
      if (env.name === envName) {
        const currentPayments = (env as any).payments || [];
        return {
          ...env,
          payments: currentPayments.filter((pay: any) => pay.id !== paymentId)
        };
      }
      return env;
    });

    try {
      await updateProject({
        ...p,
        environmentsDetails: newEnvDetails as any
      });
      alert("Pagamento removido com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao remover pagamento.");
    }
  };

  const grandPayrollTotal = useMemo(() => {
    return payrollReport.reduce((sum, r) => sum + r.grandTotal, 0);
  }, [payrollReport]);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      
      {/* 1. HEADER ROW */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div>
          <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Controle de Folha de Pagamento</h4>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fechamento semanal para envio ao escritório comercial</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Date range filters */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-border p-2 rounded-2xl text-xs font-bold shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date" 
              className="bg-transparent border-none outline-none text-foreground font-semibold"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              title="Data de Início"
            />
            <span className="text-slate-400">até</span>
            <input 
              type="date" 
              className="bg-transparent border-none outline-none text-foreground font-semibold"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              title="Data Final"
            />
          </div>

          <select 
            title="Selecionar Profissional"
            className="p-3 bg-slate-900 text-white rounded-2xl border-none outline-none font-bold text-xs shadow-lg"
            value={selectedInstallerId}
            onChange={e => setSelectedInstallerId(e.target.value)}
          >
            <option value="Todos">Todos os Profissionais</option>
            {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>

          {payrollReport.length > 0 && (
            <button 
              onClick={() => window.print()}
              className="p-3 bg-amber-500 text-slate-900 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-lg font-black uppercase text-[10px] tracking-widest flex items-center gap-2"
            >
              <Printer size={14} /> Imprimir Folha
            </button>
          )}
        </div>
      </div>

      {/* 2. REPORT VIEW / LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Payroll Summary */}
        <div className="lg:col-span-2 space-y-6 printable-area">
          <div className="bg-card text-card-foreground border border-border rounded-3xl shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <h5 className="font-black text-md text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText size={18} className="text-primary" /> Relatório de Pagamentos
              </h5>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total a Pagar no Período</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(grandPayrollTotal)}
                </p>
              </div>
            </div>

            {payrollReport.length === 0 ? (
              <div className="py-20 text-center text-slate-400 italic font-semibold">
                Nenhum pagamento registrado no período selecionado.
              </div>
            ) : (
              <div className="space-y-8 divide-y divide-border">
                {payrollReport.map(report => (
                  <div key={report.installerId} className="pt-6 first:pt-0 space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-border">
                      <span className="font-black text-foreground text-sm uppercase tracking-wide">{report.installerName}</span>
                      <span className="font-black text-slate-900 dark:text-slate-100 text-sm">{formatCurrency(report.grandTotal)}</span>
                    </div>

                    {/* Diárias Details */}
                    {report.diarias.length > 0 && (
                      <div className="space-y-2 pl-4">
                        <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Clock size={12} /> Diárias (Serviços Diários)
                        </h6>
                        <div className="space-y-1 text-xs">
                          {report.diarias.map((d, idx) => (
                            <div key={idx} className="flex justify-between text-muted-foreground py-1 border-b border-dashed border-border/60">
                              <span>{d.date} • Obra: {d.workName} • {d.description}</span>
                              <span className="font-semibold text-foreground">{formatCurrency(d.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assistências Details */}
                    {report.assistencias.length > 0 && (
                      <div className="space-y-2 pl-4">
                        <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Hammer size={12} /> Assistência Técnica
                        </h6>
                        <div className="space-y-1 text-xs">
                          {report.assistencias.map((a, idx) => (
                            <div key={idx} className="flex justify-between text-muted-foreground py-1 border-b border-dashed border-border/60">
                              <span>{a.date} • Obra: {a.workName} • {a.description}</span>
                              <span className="font-semibold text-foreground">{formatCurrency(a.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empreitas Details */}
                    {report.empreitas.length > 0 && (
                      <div className="space-y-2 pl-4">
                        <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <DollarSign size={12} /> Empreitas (Adiantamentos / Medições)
                        </h6>
                        <div className="space-y-1 text-xs">
                          {report.empreitas.map((e, idx) => (
                            <div key={idx} className="flex justify-between text-muted-foreground py-1 border-b border-dashed border-border/60">
                              <span>{e.date} • Obra: {e.workName} ({e.envName}) • Avanço: {e.percentage}%</span>
                              <span className="font-semibold text-foreground">{formatCurrency(e.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Active Empreitas Management */}
        <div className="space-y-6 no-print">
          <div className="bg-card text-card-foreground border border-border rounded-3xl shadow-sm p-6 space-y-4">
            <h5 className="font-black text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
              <PlusCircle size={16} className="text-primary" /> Avanço de Empreitas
            </h5>
            <p className="text-[11px] text-muted-foreground">Lance pagamentos parciais de mão de obra vinculados ao percentual de avanço físico da montagem.</p>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {activeEmpreitas.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground italic">
                  Nenhuma empreita ativa/autorizada no momento.
                </div>
              ) : (
                activeEmpreitas.map((emp, idx) => (
                  <div key={idx} className="bg-muted/40 border border-border p-4 rounded-2xl space-y-3 hover:border-primary/20 transition-all">
                    <div>
                      <h6 className="font-bold text-foreground text-xs">{emp.workName}</h6>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">{emp.envName} • {emp.installerName}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                      <div className="bg-background border border-border rounded-lg p-2">
                        <span className="text-slate-400 block mb-0.5">Total</span>
                        <span className="text-foreground">{formatCurrency(emp.totalValue)}</span>
                      </div>
                      <div className="bg-background border border-border rounded-lg p-2">
                        <span className="text-slate-400 block mb-0.5">Pago</span>
                        <span className="text-foreground">{formatCurrency(emp.alreadyPaid)}</span>
                      </div>
                      <div className="bg-background border border-border rounded-lg p-2">
                        <span className="text-slate-400 block mb-0.5">Saldo</span>
                        <span className="text-emerald-600">{formatCurrency(emp.remainingValue)}</span>
                      </div>
                    </div>

                    {emp.payments.length > 0 && (
                      <div className="bg-background border border-border p-3 rounded-xl space-y-2 text-[10px]">
                        <span className="font-bold text-slate-400 block border-b border-border pb-1">Histórico de Pagamentos</span>
                        {emp.payments.map((pay: any) => (
                          <div key={pay.id} className="flex justify-between items-center py-0.5">
                            <span className="text-muted-foreground">{pay.date} • {pay.percentage}%</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{formatCurrency(pay.value)}</span>
                              <button 
                                onClick={() => handleDeletePayment(emp.projectId, emp.envName, pay.id)}
                                className="text-red-500 hover:text-red-600"
                                title="Excluir Pagamento"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {emp.remainingValue > 0 && (
                      <button
                        onClick={() => setLaunchingEnv({ projectId: emp.projectId, envName: emp.envName, envValue: emp.totalValue })}
                        className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle size={12} /> Lançar Pagamento
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3. LAUNCH PAYMENT DIALOG / MODAL */}
      {launchingEnv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <div>
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Lançar Pagamento Parcial
                </h4>
                <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">
                  {launchingEnv.envName} • Total do Ambiente: {formatCurrency(launchingEnv.envValue)}
                </p>
              </div>
              <button
                onClick={() => setLaunchingEnv(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLaunchPaymentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Percentual (%)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      placeholder="Ex: 15"
                      className="w-full p-4 pr-10 bg-slate-50 border border-border rounded-xl font-bold text-sm outline-none"
                      value={launchPayment.percentage}
                      onChange={e => handlePercentageChange(e.target.value)}
                      required
                      title="Percentual de Avanço"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Valor (R$)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      placeholder="0.00"
                      className="w-full p-4 pl-10 bg-slate-50 border border-border rounded-xl font-bold text-sm outline-none"
                      value={launchPayment.value}
                      onChange={e => handleAmountChange(e.target.value)}
                      required
                      title="Valor do Pagamento"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data de Pagamento</label>
                <input 
                  type="date"
                  className="w-full p-4 bg-slate-50 border border-border rounded-xl font-bold text-sm outline-none"
                  value={launchPayment.date}
                  onChange={e => setLaunchPayment({ ...launchPayment, date: e.target.value })}
                  required
                  title="Data do Pagamento"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Observações (Descrição)</label>
                <input 
                  type="text"
                  placeholder="Ex: Adiantamento de montagem / 15% concluído"
                  className="w-full p-4 bg-slate-50 border border-border rounded-xl font-medium text-sm outline-none"
                  value={launchPayment.description}
                  onChange={e => setLaunchPayment({ ...launchPayment, description: e.target.value })}
                  title="Descrição do Pagamento"
                />
              </div>

              <div className="pt-4 border-t border-border flex gap-3">
                <button
                  type="button"
                  onClick={() => setLaunchingEnv(null)}
                  className="flex-1 bg-background border border-border text-foreground py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PayrollManager;
