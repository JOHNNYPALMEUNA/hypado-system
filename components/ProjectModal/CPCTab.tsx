import React, { useState } from 'react';
import {
    DollarSign, Clock, ShieldCheck, TrendingUp, AlertTriangle, Users, Star, Award,
    PenTool, Lock, Trash2, Calendar
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils';
import { Project, Expense } from '../../types';

interface CPCTabProps {
    project: Project;
    installers: any[];
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const CPCTab: React.FC<CPCTabProps> = ({ project, installers, setFormData }) => {
    const { userRole, updateProject, refundRequests } = useData();

    // 1. Calculate Financials
    const projectRefunds = (refundRequests || [])
        .filter(r => String(r.projectId) === String(project.id));
    
    const totalRefunds = projectRefunds.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalRevenue = project.value || 0;
    const totalExpenses = (project.expenses || []).reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) + totalRefunds;
    const grossMargin = totalRevenue - totalExpenses;
    const marginPercentage = totalRevenue > 0 ? ((grossMargin / totalRevenue) * 100) : 0;

    const handleDeleteExpense = (expenseId: string) => {
        if (confirm('Deseja realmente excluir este lançamento de custo?')) {
            console.log('Attempting to delete expense:', expenseId);
            const updatedExpenses = (project.expenses || []).filter(e => e.id !== expenseId);

            // Log for debugging
            console.log('Updated expenses list:', updatedExpenses);

            // Update database directly
            updateProject({ ...project, expenses: updatedExpenses });

            // Sync with Modal's state to prevent "Save" from reverting deletion
            setFormData((prev: any) => ({
                ...prev,
                expenses: updatedExpenses
            }));

            alert('Custo excluído com sucesso.');
        }
    };

    // 2. Categorize Expenses
    const expensesByCategory = (project.expenses || []).reduce((acc: any, curr: any) => {
        const cat = curr.category || 'Outros';
        acc[cat] = (acc[cat] || 0) + (curr.value || 0);
        return acc;
    }, {});

    if (totalRefunds > 0) {
        expensesByCategory['Financeiro / Reembolsos'] = totalRefunds;
    }

    // 3. Find Architect & Installer
    const assignedInstaller = installers.find(i => String(i.id) === String(project.installerId));
    const assignedArchitect = installers.find(i => String(i.id) === String(project.architectId));

    // 4. Calculate Duration (Days Since Contract)
    const daysInProcess = Math.ceil((new Date().getTime() - new Date(project.contractDate).getTime()) / (1000 * 3600 * 24));
    const qualityScore = project.qualityReport?.score || 'N/A';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-10">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Faturamento Total</span>
                    <div className="flex items-center gap-3">
                        <DollarSign className="text-emerald-400" size={24} />
                        <span className="text-2xl font-black">{formatCurrency(totalRevenue)}</span>
                    </div>
                </div>

                {userRole === 'owner' ? (
                    <>
                        <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                            <span className="text-[10px] font-black uppercase text-red-600 tracking-widest block mb-2">Custo Total (Real)</span>
                            <div className="flex items-center gap-3">
                                <TrendingUp className="text-red-500" size={24} />
                                <span className="text-2xl font-black text-red-700">{formatCurrency(totalExpenses)}</span>
                            </div>
                        </div>
                        <div className={`${marginPercentage >= 40 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'} p-6 rounded-3xl border`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${marginPercentage >= 40 ? 'text-emerald-600' : 'text-amber-600'}`}>Margem de Lucro</span>
                            <div className="flex items-center gap-3">
                                <Award className={marginPercentage >= 40 ? 'text-emerald-500' : 'text-amber-500'} size={24} />
                                <span className={`text-2xl font-black ${marginPercentage >= 40 ? 'text-emerald-700' : 'text-amber-700'}`}>{marginPercentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-muted/50 p-6 rounded-3xl border border-slate-100 col-span-2 flex items-center justify-center">
                        <p className="text-xs font-black text-slate-300 uppercase italic">Dados Financeiros Restritos</p>
                    </div>
                )}

                <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                    <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest block mb-2">Score Qualidade</span>
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="text-purple-500" size={24} />
                        <span className="text-2xl font-black text-purple-700">{qualityScore}/10</span>
                    </div>
                </div>
            </div>

            {/* EXPENSE BREAKDOWN & TEAM */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 1. Expense Breakdown Chart (List for now) */}
                <div className="md:col-span-2 bg-card p-8 rounded-[40px] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h5 className="text-sm font-black uppercase text-foreground flex items-center gap-2">
                            <TrendingUp size={18} className="text-slate-400" /> Detalhamento de Custos
                        </h5>
                        <p className="text-[10px] font-bold text-slate-400 bg-muted px-3 py-1 rounded-full">{project.expenses?.length || 0} Lançamentos</p>
                    </div>

                    {userRole === 'owner' ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {
                                    Object.entries(expensesByCategory).map(([category, value]: [string, any]) => (
                                        <div key={category} className="flex flex-col p-4 bg-muted/50 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{category}</span>
                                            <span className="text-lg font-black text-foreground">{formatCurrency(value)}</span>
                                            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                                                <div
                                                    className="h-full bg-slate-900 rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.min(100, Math.max(0, (value / totalRevenue) * 100))}%` }}
                                                />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 mt-1 text-right">{((value / totalRevenue) * 100).toFixed(1)}% da Receita</span>
                                        </div>
                                    ))
                                }
                                {
                                    project.expenses?.length === 0 && (
                                        <p className="col-span-2 text-center text-slate-400 py-10 italic">Nenhum custo lançado até o momento.</p>
                                    )
                                }
                            </div>

                            {/* LISTA DE LANÇAMENTOS INDIVIDUAIS COM OPÇÃO DE EXCLUSÃO */}
                            {project.expenses && project.expenses.length > 0 && (
                                <div className="mt-8">
                                    <h6 className="text-xs font-black uppercase text-muted-foreground mb-4 border-b border-slate-100 pb-2">Lançamentos Individuais</h6>
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {project.expenses.slice().reverse().map((exp: Expense) => (
                                            <div key={exp.id} className="flex items-center justify-between p-4 bg-muted/50 border border-slate-100 rounded-2xl hover:border-red-200 transition-colors group">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] bg-slate-200 text-muted-foreground px-2 py-0.5 rounded uppercase font-black tracking-wider">{exp.category}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Calendar size={10} /> {new Date(exp.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="font-bold text-foreground text-sm leading-tight">{exp.description}</p>
                                                </div>
                                                <div className="flex items-center gap-4 ml-4">
                                                    <span className="font-black text-red-600 truncate max-w-[100px]">{formatCurrency(exp.value || 0)}</span>
                                                    <button
                                                        onClick={() => handleDeleteExpense(exp.id)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                        title="Excluir Lançamento"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* LISTA DE REEMBOLSOS / DIÁRIAS (READ ONLY) */}
                            {totalRefunds > 0 && (
                                <div className="mt-8 border-t border-dashed border-slate-100 pt-6">
                                    <h6 className="text-[10px] font-black uppercase text-indigo-600 mb-4 tracking-widest flex items-center gap-2">
                                        <DollarSign size={12} /> Despesas Reembolsáveis (Financeiro)
                                    </h6>
                                    <div className="space-y-2">
                                        {projectRefunds.map(r => (
                                            <div key={r.id} className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-xs text-indigo-900 font-bold">
                                                <div className="flex-1">
                                                    <p>{r.description || r.category}</p>
                                                    <p className="text-[10px] text-indigo-400 uppercase font-black">{r.collaboratorName} • {new Date(r.date).toLocaleDateString()}</p>
                                                </div>
                                                <span className="font-black text-indigo-600 ml-2">{formatCurrency(r.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-40 bg-muted/50 rounded-3xl border-2 border-dashed border-border">
                            <Lock className="text-slate-300 mb-2" size={24} />
                            <p className="text-xs font-black text-slate-300 uppercase italic">Visualização Restrita</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Team: Architect & Installer */}
            <div className="space-y-6">
                {/* Architect Card */}
                <div className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <PenTool size={64} />
                    </div>
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 z-10 relative">Responsável Técnico (Projetista)</h5>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xl">
                            {assignedArchitect?.avatar ? <img src={assignedArchitect.avatar} alt={assignedArchitect.name} className="w-full h-full object-cover rounded-2xl" /> : (assignedArchitect?.name[0] || 'N/A')}
                        </div>
                        <div>
                            <p className="text-lg font-black text-foreground leading-tight">{assignedArchitect?.name || 'Não Informado'}</p>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-1">Projetista / Arquiteto</p>
                        </div>
                    </div>
                </div>

                {/* Installer Card */}
                <div className="bg-card p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={64} />
                    </div>
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 z-10 relative">Responsável Execução (Montador)</h5>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-black text-xl">
                            {assignedInstaller?.avatar ? <img src={assignedInstaller.avatar} alt={assignedInstaller.name} className="w-full h-full object-cover rounded-2xl" /> : (assignedInstaller?.name[0] || 'N/A')}
                        </div>
                        <div>
                            <p className="text-lg font-black text-foreground leading-tight">{assignedInstaller?.name || 'Não Atribuído'}</p>
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-1">Líder de Montagem</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CPCTab;

