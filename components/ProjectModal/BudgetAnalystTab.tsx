import React, { useState } from 'react';
import {
    Brain, Sparkles, DollarSign, TrendingUp, TrendingDown, Award,
    RefreshCw, BarChart3, AlertTriangle, CheckCircle2, Loader2
} from 'lucide-react';
import { analyzeBudget } from '../../geminiService';
import { formatCurrency } from '../../utils';

interface BudgetAnalystTabProps {
    project: any;
}

// Simple markdown-to-HTML renderer for AI output
function renderMarkdown(text: string): React.ReactNode {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
        if (line.startsWith('## ')) {
            elements.push(
                <h3 key={idx} className="text-base font-black uppercase text-foreground mt-6 mb-2 flex items-center gap-2">
                    {line.replace('## ', '')}
                </h3>
            );
        } else if (line.startsWith('# ')) {
            elements.push(
                <h2 key={idx} className="text-lg font-black uppercase text-foreground mt-4 mb-2">
                    {line.replace('# ', '')}
                </h2>
            );
        } else if (line.startsWith('**') && line.endsWith('**')) {
            elements.push(
                <p key={idx} className="font-black text-foreground text-sm mb-1">
                    {line.replace(/\*\*/g, '')}
                </p>
            );
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            const content = line.replace(/^[-*] /, '').replace(/\*\*(.*?)\*\*/g, '$1');
            elements.push(
                <div key={idx} className="flex items-start gap-2 mb-1.5 ml-2">
                    <span className="text-primary mt-1 shrink-0">•</span>
                    <span className="text-sm text-foreground/80 leading-relaxed">{content}</span>
                </div>
            );
        } else if (line.trim() !== '') {
            // Replace inline bold
            const parts = line.split(/\*\*(.*?)\*\*/g);
            const formatted = parts.map((part, i) =>
                i % 2 === 1 ? <strong key={i} className="font-black text-foreground">{part}</strong> : part
            );
            elements.push(
                <p key={idx} className="text-sm text-foreground/80 mb-2 leading-relaxed">{formatted}</p>
            );
        } else {
            elements.push(<div key={idx} className="h-2" />);
        }
    });

    return <>{elements}</>;
}

const BudgetAnalystTab: React.FC<BudgetAnalystTabProps> = ({ project }) => {
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    // Financial calculations
    const totalRevenue = project.value || 0;
    const totalExpenses = (project.expenses || []).reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
    const grossMargin = totalRevenue - totalExpenses;
    const marginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    const getMarginColor = (pct: number) => {
        if (pct >= 45) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: '🟢 Excelente' };
        if (pct >= 30) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: '🟡 Razoável' };
        return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: '🔴 Crítica' };
    };

    const marginStyle = getMarginColor(marginPct);

    const expensesByCategory = (project.expenses || []).reduce((acc: any, curr: any) => {
        const cat = curr.category || 'Outros';
        acc[cat] = (acc[cat] || 0) + (curr.value || 0);
        return acc;
    }, {});

    const handleAnalyze = async () => {
        setIsLoading(true);
        setHasAnalyzed(false);
        try {
            const result = await analyzeBudget(project);
            setAnalysis(result);
            setHasAnalyzed(true);
        } catch (err) {
            setAnalysis('Erro ao conectar com a IA. Tente novamente.');
            setHasAnalyzed(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10">

            {/* Header Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                </div>
                <div className="relative z-10 flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-indigo-500/30 border border-indigo-400/30 rounded-2xl flex items-center justify-center">
                        <Brain size={24} className="text-indigo-300" />
                    </div>
                    <div>
                        <h4 className="text-xl font-black uppercase italic tracking-tight">Analista de Orçamento</h4>
                        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">IA Financeira · Diagnóstico de Lucratividade</p>
                    </div>
                </div>
                <p className="relative z-10 text-slate-400 text-xs mt-4 max-w-lg leading-relaxed">
                    A IA analisa receita, custos, margem e composição do orçamento desta OS para gerar um diagnóstico de rentabilidade profissional.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-lg">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">Receita</span>
                    <div className="flex items-center gap-2">
                        <DollarSign size={18} className="text-emerald-400 shrink-0" />
                        <span className="text-lg font-black truncate">{formatCurrency(totalRevenue)}</span>
                    </div>
                </div>

                <div className="bg-red-50 p-5 rounded-3xl border border-red-100">
                    <span className="text-[9px] font-black uppercase text-red-500 tracking-widest block mb-2">Custos</span>
                    <div className="flex items-center gap-2">
                        <TrendingDown size={18} className="text-red-500 shrink-0" />
                        <span className="text-lg font-black text-red-700 truncate">{formatCurrency(totalExpenses)}</span>
                    </div>
                </div>

                <div className={`p-5 rounded-3xl border ${marginStyle.bg} ${marginStyle.border}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${marginStyle.text}`}>Margem Bruta</span>
                    <div className="flex items-center gap-2">
                        <Award size={18} className={`${marginStyle.text} shrink-0`} />
                        <span className={`text-lg font-black ${marginStyle.text} truncate`}>{formatCurrency(grossMargin)}</span>
                    </div>
                </div>

                <div className={`p-5 rounded-3xl border ${marginStyle.bg} ${marginStyle.border}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${marginStyle.text}`}>Margem %</span>
                    <div className="flex items-center gap-2">
                        <BarChart3 size={18} className={`${marginStyle.text} shrink-0`} />
                        <span className={`text-2xl font-black ${marginStyle.text}`}>{marginPct.toFixed(1)}%</span>
                    </div>
                    <span className={`text-[9px] font-bold mt-1 block ${marginStyle.text}`}>{marginStyle.label}</span>
                </div>
            </div>

            {/* Expense Breakdown */}
            {Object.keys(expensesByCategory).length > 0 && (
                <div className="bg-card p-6 rounded-[32px] border border-border shadow-sm">
                    <h5 className="text-xs font-black uppercase text-foreground flex items-center gap-2 mb-5">
                        <TrendingUp size={16} className="text-slate-400" /> Composição dos Custos
                    </h5>
                    <div className="space-y-3">
                        {Object.entries(expensesByCategory)
                            .sort(([, a]: any, [, b]: any) => b - a)
                            .map(([category, value]: [string, any]) => {
                                const pct = totalRevenue > 0 ? (value / totalRevenue) * 100 : 0;
                                return (
                                    <div key={category}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{category}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-foreground">{formatCurrency(value)}</span>
                                                <span className="text-[10px] text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-indigo-500 to-blue-400"
                                                style={{ width: `${Math.min(100, pct * 2)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Empty state for no costs */}
            {totalExpenses === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-center gap-4">
                    <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                    <div>
                        <p className="font-black text-amber-800 text-sm uppercase italic">Nenhum custo lançado</p>
                        <p className="text-amber-600 text-xs mt-1">Lance os custos desta OS (materiais, mão de obra, frete) para obter uma análise precisa.</p>
                    </div>
                </div>
            )}

            {/* AI Analysis Area */}
            <div className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Sparkles size={20} className="text-indigo-400" />
                        <div>
                            <p className="text-white font-black text-sm uppercase italic tracking-tight">Diagnóstico por IA</p>
                            <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Gemini 2.0 Flash · Análise Financeira</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-900/40 active:scale-95"
                    >
                        {isLoading ? (
                            <><Loader2 size={14} className="animate-spin" /> Analisando...</>
                        ) : (
                            <><Brain size={14} /> {hasAnalyzed ? 'Reanalisar' : 'Analisar com IA'}</>
                        )}
                    </button>
                </div>

                <div className="p-6 min-h-[200px]">
                    {!hasAnalyzed && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mb-4 border border-indigo-100">
                                <Brain size={32} className="text-indigo-300" />
                            </div>
                            <p className="text-sm font-black text-slate-400 uppercase italic tracking-wider mb-1">Aguardando análise</p>
                            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                                Clique em "Analisar com IA" para gerar um diagnóstico financeiro completo desta OS em segundos.
                            </p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mb-4 border border-indigo-100 animate-pulse">
                                <Loader2 size={32} className="text-indigo-400 animate-spin" />
                            </div>
                            <p className="text-sm font-black text-slate-400 uppercase italic tracking-wider">Consultando IA...</p>
                            <p className="text-xs text-slate-400 mt-2">Calculando margens, riscos e recomendações</p>
                        </div>
                    )}

                    {hasAnalyzed && !isLoading && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
                                <CheckCircle2 size={16} className="text-indigo-500" />
                                <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Análise Gerada</span>
                                <span className="ml-auto text-[10px] text-slate-400 font-bold">
                                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="prose-sm max-w-none">
                                {renderMarkdown(analysis)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BudgetAnalystTab;
