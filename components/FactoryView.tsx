import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { DailyLog, Project } from '../types';
import {
    AlertTriangle, CheckCircle2, Clock,
    Search, ArrowRight, Package, Truck,
    AlertOctagon, Hammer, RefreshCcw
} from 'lucide-react';

const FactoryView: React.FC = () => {
    const { dailyLogs, projects, updateDailyLog } = useData();
    const [showHistory, setShowHistory] = React.useState(false);

    // Filter only Rework logs
    const reworkLogs = useMemo(() => {
        return dailyLogs.filter(l =>
            ['Falta de Peça', 'Peça Danificada', 'Erro de Projeto', 'Falta de Material'].includes(l.category)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyLogs]);

    // Split into Active and Completed
    const activeReworkLogs = useMemo(() => reworkLogs.filter(l => l.status !== 'Concluído'), [reworkLogs]);
    const completedReworkLogs = useMemo(() => reworkLogs.filter(l => l.status === 'Concluído'), [reworkLogs]);

    const columns = [
        { id: 'Pendente', title: 'A Fazer', icon: AlertOctagon, color: 'bg-red-100 text-red-700 border-red-200' },
        { id: 'Em Produção', title: 'Produzindo', icon: Hammer, color: 'bg-amber-100 text-amber-700 border-amber-200' },
        { id: 'Pronto', title: 'Pronto / Embalado', icon: Package, color: 'bg-blue-100 text-blue-700 border-blue-200' }
    ];

    const handleAdvanceStatus = async (log: DailyLog) => {
        const nextStatus = {
            'Pendente': 'Em Produção',
            'Em Produção': 'Pronto',
            'Pronto': 'Concluído'
        };

        const newStatus = nextStatus[log.status as keyof typeof nextStatus];
        if (newStatus) {
            await updateDailyLog({ ...log, status: newStatus });
        }
    };

    return (
        <div className="flex flex-col h-full bg-muted/50 overflow-hidden">
            {/* Header */}
            <div className="bg-card border-b border-border p-6 flex justify-between items-center shadow-sm shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <RefreshCcw className="text-amber-600" />
                        Gestão de Refazimentos (Fábrica)
                    </h1>
                    <p className="text-muted-foreground">Controle de peças danificadas, erros e garantias</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-card border border-border rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
                        <Search size={18} className="text-slate-400" />
                        <input
                            placeholder="Filtrar..."
                            className="outline-none text-sm w-48"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* 1. KANBAN OPERACIONAL (Active Items) */}
                <div>
                    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <Hammer className="text-slate-400" size={20} />
                        Kanban Operacional
                    </h2>
                    <div className="flex gap-6 overflow-x-auto pb-4">
                        {columns.map(col => {
                            const items = activeReworkLogs.filter(l => l.status === col.id);

                            return (
                                <div key={col.id} className="flex-1 flex flex-col min-w-[300px]">
                                    <div className={`flex items-center justify-between p-3 rounded-t-xl border-b-2 font-bold ${col.color.split(' ')[1]} bg-card border-${col.color.split('-')[1]}-200 shadow-sm`}>
                                        <div className="flex items-center gap-2">
                                            <col.icon size={18} />
                                            {col.title}
                                        </div>
                                        <span className="bg-card/50 px-2 py-0.5 rounded text-sm shadow-sm border border-black/5">
                                            {items.length}
                                        </span>
                                    </div>

                                    <div className="bg-muted/50 rounded-b-xl border border-t-0 border-border p-3 space-y-3 min-h-[200px]">
                                        {items.map(log => {
                                            const project = projects.find(p => p.id === log.projectId);
                                            const part = log.reworkDetails?.[0];

                                            return (
                                                <div key={log.id} className="bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-all group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-muted/50 px-2 py-1 rounded">
                                                            {new Date(log.date).toLocaleDateString()}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${log.category === 'Erro de Projeto' ? 'bg-red-50 border-red-100 text-red-600' :
                                                            log.category === 'Peça Danificada' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                                'bg-muted/50 border-slate-100 text-muted-foreground'
                                                            }`}>
                                                            {log.category}
                                                        </span>
                                                    </div>

                                                    <h3 className="font-bold text-foreground mb-1 leading-tight">
                                                        {project?.workName}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground mb-3">{project?.clientName}</p>

                                                    <div className="bg-muted/50 rounded-lg p-3 border border-slate-100 mb-3">
                                                        {part ? (
                                                            <div className="space-y-1">
                                                                <p className="font-bold text-sm text-foreground">{part.partName}</p>
                                                                <div className="flex gap-2 text-xs text-muted-foreground">
                                                                    <span className="bg-card px-1.5 rounded border border-border">{part.width} x {part.height}</span>
                                                                    <span className="bg-card px-1.5 rounded border border-border">{part.color}</span>
                                                                </div>
                                                                {part.quantity > 1 && (
                                                                    <p className="text-xs font-bold text-amber-600 mt-1">Qtd: {part.quantity}</p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground italic">
                                                                {log.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {log.photoUrl && (
                                                        <a
                                                            href={log.photoUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-3"
                                                        >
                                                            <AlertTriangle size={12} /> Ver Foto / Evidência
                                                        </a>
                                                    )}

                                                    <button
                                                        onClick={() => handleAdvanceStatus(log)}
                                                        className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg"
                                                    >
                                                        Mover para {
                                                            col.id === 'Pendente' ? 'Produção' :
                                                                col.id === 'Em Produção' ? 'Pronto' :
                                                                    'Entregue'
                                                        } <ArrowRight size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {items.length === 0 && (
                                            <div className="text-center py-10 opacity-30">
                                                <Package size={40} className="mx-auto mb-2" />
                                                <p className="text-xs font-medium">Vazio</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. HISTÓRICO DE ENTREGAS (Table) */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-600" size={20} />
                            Histórico de Entregas
                        </h2>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all ${showHistory
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 shadow-sm'
                                    : 'bg-card text-muted-foreground border-border hover:border-border shadow-sm'
                                }`}
                        >
                            {showHistory ? 'Ocultar Histórico' : 'Ver Histórico Completo'}
                        </button>
                    </div>

                    {showHistory && (
                        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Obra / Cliente</th>
                                        <th className="px-6 py-4">Peça / Descrição</th>
                                        <th className="px-6 py-4">Motivo</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {completedReworkLogs.map(log => {
                                        const project = projects.find(p => p.id === log.projectId);
                                        const part = log.reworkDetails?.[0];

                                        return (
                                            <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {new Date(log.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-bold text-foreground">{project?.workName}</p>
                                                        <p className="text-xs text-muted-foreground">{project?.clientName}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {part ? (
                                                        <div>
                                                            <p className="font-medium text-foreground">{part.partName}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {part.width}x{part.height} • {part.color}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="italic text-muted-foreground">{log.description}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${log.category === 'Erro de Projeto' ? 'bg-red-50 border-red-100 text-red-600' :
                                                        log.category === 'Peça Danificada' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                            'bg-muted/50 border-slate-100 text-muted-foreground'
                                                        }`}>
                                                        {log.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 size={12} />
                                                        Entregue
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {completedReworkLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                                <Package size={32} className="mx-auto mb-2 opacity-50" />
                                                Nenhum refazimento finalizado ainda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FactoryView;
