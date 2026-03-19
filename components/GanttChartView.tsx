
import React, { useMemo, useState } from 'react';
import { Project, ProductionStatus } from '../types';
import { useData } from '../contexts/DataContext';
import { getStatusColor, formatDate } from '../utils';
import {
    ChevronLeft,
    ChevronRight,
    Truck,
    Calendar,
    Search,
    Filter,
    Info,
    AlertTriangle,
    CheckCircle2,
    Clock
} from 'lucide-react';

const GanttChartView: React.FC = () => {
    const { projects } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProductionStatus | 'Todas' | 'Em Aberto'>('Em Aberto');
    const [viewWindowDays] = useState(60); // Total days to show
    const [startOffset, setStartOffset] = useState(-14); // Days from today to start the view (2 weeks ago)

    // Calculate dates for the header
    const timelineDates = useMemo(() => {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < viewWindowDays; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + startOffset + i);
            dates.push(date);
        }
        return dates;
    }, [viewWindowDays, startOffset]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchSearch = p.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.clientName.toLowerCase().includes(searchTerm.toLowerCase());
            // 'Em Aberto' = tudo exceto Finalizada e Cancelada
            const matchStatus =
                statusFilter === 'Todas' ? p.currentStatus !== 'Cancelada' :
                statusFilter === 'Em Aberto' ? (p.currentStatus !== 'Finalizada' && p.currentStatus !== 'Cancelada') :
                p.currentStatus === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [projects, searchTerm, statusFilter]);

    const getDayPosition = (dateStr: string | undefined) => {
        if (!dateStr) return -1;
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDate = new Date(today);
        firstDate.setDate(today.getDate() + startOffset);

        const diffTime = date.getTime() - firstDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    const renderProjectRow = (project: Project) => {
        const startPos = getDayPosition(project.contractDate);
        const endPos = getDayPosition(project.promisedDate);
        const freightPos = getDayPosition(project.freightDate);
        const deliveryPos = getDayPosition(project.deliveryDate);

        const containerWidth = viewWindowDays * 40;
        const barVisible = endPos >= 0 && startPos < viewWindowDays;

        return (
            <div key={project.id} className="flex border-b border-slate-100 hover:bg-slate-50/80 transition-colors group">
                {/* Project Info (Sticky Column) */}
                <div className="sticky left-0 z-20 w-64 bg-card group-hover:bg-white p-4 border-r border-slate-100 shrink-0 shadow-[4px_0_12px_rgba(0,0,0,0.03)]">
                    <p className="text-xs font-black text-foreground uppercase italic truncate group-hover:text-primary transition-colors">{project.workName}</p>
                    <p className="text-[10px] text-slate-400 font-bold truncate opacity-80 group-hover:opacity-100 transition-opacity">{project.clientName}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">Entrega: {formatDate(project.promisedDate)}</span>
                    </div>
                </div>

                {/* Timeline Grid for this project */}
                <div className="relative h-16 flex" style={{ width: `${containerWidth}px` }}>
                    {/* Horizontal grid lines */}
                    {timelineDates.map((date, idx) => (
                        <div key={idx} className={`w-10 h-full border-r border-slate-100/50 shrink-0 ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-slate-50/40' : ''}`}></div>
                    ))}

                    {/* Progress Bar */}
                    {barVisible && (
                        <div
                            className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-xl border border-white/20 shadow-sm flex items-center px-3 ${getStatusColor(project.currentStatus)} bg-gradient-to-r from-white/20 to-transparent hover:scale-[1.01] transition-all cursor-help group/bar z-10`}
                            style={{
                                left: `${startPos * 40}px`,
                                width: `${(endPos - startPos + 1) * 40}px`,
                                minWidth: '40px'
                            }}
                        >
                            {/* Critical Alert Indicator */}
                            {project.promisedDate && new Date(project.promisedDate) < new Date() && project.currentStatus !== 'Finalizada' && (
                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-md z-30 flex items-center justify-center">
                                    <AlertTriangle size={8} className="text-white" />
                                </div>
                            )}

                            <span className="text-[9px] font-black text-white uppercase italic truncate drop-shadow-md">
                                {project.workName.substring(0, 15)}...
                            </span>

                            {/* Bar Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white p-4 rounded-[24px] text-[11px] font-bold opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-all duration-300 z-50 transform translate-y-2 group-hover/bar:translate-y-0 border border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-amber-400 uppercase tracking-widest text-[9px]">Análise de Prazo PCP</span>
                                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-[8px] font-black">{project.id.substring(0,8)}</span>
                                </div>
                                <div className="space-y-2 text-slate-300">
                                    <div className="flex justify-between items-center group/item">
                                        <span className="flex items-center gap-1.5 opacity-60"><Calendar size={12} /> Contrato:</span>
                                        <span className="text-white bg-white/5 px-2 py-0.5 rounded-md">{formatDate(project.contractDate)}</span>
                                    </div>
                                    <div className="flex justify-between items-center group/item">
                                        <span className="flex items-center gap-1.5 opacity-60"><Clock size={12} /> Limite:</span>
                                        <span className={`px-2 py-0.5 rounded-md ${project.promisedDate && new Date(project.promisedDate) < new Date() ? 'text-red-400 bg-red-400/10' : 'text-white bg-white/5'}`}>{formatDate(project.promisedDate)}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-[9px] text-slate-500 uppercase">Fase do Fluxo:</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(project.currentStatus)}`}></div>
                                        <span className="text-amber-400 font-black italic tracking-tighter uppercase">{project.currentStatus}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Milestones */}
                    {freightPos >= 0 && freightPos < viewWindowDays && (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 z-20 group/freight"
                            style={{ left: `${freightPos * 40 + 20}px` }}
                        >
                            <div className="w-8 h-8 -ml-4 bg-blue-600 text-white rounded-[10px] shadow-lg flex items-center justify-center border-2 border-white hover:scale-125 transition-all cursor-pointer">
                                <Truck size={14} />
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-36 bg-blue-600 text-white p-2 rounded-xl text-[10px] font-black text-center opacity-0 group-hover/freight:opacity-100 pointer-events-none transition-all z-50 shadow-2xl uppercase italic border border-white/20">
                                Frete: {formatDate(project.freightDate)}
                            </div>
                        </div>
                    )}

                    {deliveryPos >= 0 && deliveryPos < viewWindowDays && (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 z-20 group/delivery"
                            style={{ left: `${deliveryPos * 40 + 20}px` }}
                        >
                            <div className="w-8 h-8 -ml-4 bg-emerald-600 text-white rounded-[10px] shadow-lg flex items-center justify-center border-2 border-white hover:scale-125 transition-all cursor-pointer">
                                <Calendar size={14} />
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-36 bg-emerald-600 text-white p-2 rounded-xl text-[10px] font-black text-center opacity-0 group-hover/delivery:opacity-100 pointer-events-none transition-all z-50 shadow-2xl uppercase italic border border-white/20">
                                Entrega: {formatDate(project.deliveryDate)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase italic leading-none">Visão de Cronograma</h3>
                    <p className="text-muted-foreground font-bold text-sm uppercase italic tracking-widest mt-2">Gestão de prazos e gargalos fabris</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar obra ou cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-4 py-3 bg-card border-2 border-slate-100 rounded-2xl text-xs font-bold w-64 focus:border-amber-500 outline-none transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-card p-1 rounded-2xl border-2 border-slate-100 shadow-sm">
                        <Filter size={16} className="ml-3 text-slate-400" />
                        <select
                            className="pr-4 py-2 bg-transparent text-xs font-black uppercase outline-none cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            aria-label="Filtrar por status"
                        >
                            <option value="Em Aberto">⚡ Em Aberto</option>
                            <option value="Todas">Status: Todos</option>
                            <option value="Venda">Venda</option>
                            <option value="Projeto">Projeto</option>
                            <option value="Corte">Corte</option>
                            <option value="Produção">Produção</option>
                            <option value="Entrega">Entrega</option>
                            <option value="Instalação">Instalação</option>
                            <option value="Vistoria">Vistoria</option>
                            <option value="Finalizada">Finalizada</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-2xl shadow-xl border border-white/10">
                        <button
                            onClick={() => setStartOffset(prev => prev - 7)}
                            className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors active:scale-90"
                            aria-label="Voltar uma semana"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => setStartOffset(-14)}
                            className="px-4 py-2 text-[10px] font-black text-amber-500 uppercase tracking-widest hover:bg-white/10 rounded-xl transition-colors"
                        >
                            HOJE
                        </button>
                        <button
                            onClick={() => setStartOffset(prev => prev + 7)}
                            className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors active:scale-90"
                            aria-label="Avançar uma semana"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Gantt Chart Container */}
            <div className="bg-card rounded-[48px] border-2 border-slate-100 shadow-2xl overflow-hidden flex flex-col">
                {/* Timeline Header */}
                <div className="flex border-b-2 border-slate-100 bg-muted/50 sticky top-0 z-30">
                    <div className="sticky left-0 z-40 w-64 bg-muted/50 p-6 border-r-2 border-slate-100 shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Obras Ativas</span>
                    </div>

                    <div className="flex overflow-x-hidden" style={{ width: `${viewWindowDays * 40}px` }}>
                        {timelineDates.map((date, idx) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isMonday = date.getDay() === 1;

                            return (
                                <div
                                    key={idx}
                                    className={`w-10 h-20 shrink-0 flex flex-col items-center justify-center border-r border-slate-100 transition-colors ${isToday ? 'bg-amber-500 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]' : ''}`}
                                >
                                    {isMonday && (
                                        <span className="absolute -top-0 text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">
                                            {date.toLocaleDateString('pt-BR', { month: 'short' })}
                                        </span>
                                    )}
                                    <span className={`text-[10px] font-black ${isToday ? 'text-white' : 'text-slate-400'}`}>
                                        {date.toLocaleDateString('pt-BR', { weekday: 'short' }).charAt(0).toUpperCase()}
                                    </span>
                                    <span className={`text-sm font-black italic ${isToday ? 'text-white' : 'text-foreground'}`}>
                                        {date.getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Grid Body */}
                <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar relative">
                    {/* Persistent Today Line across all rows */}
                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10 pointer-events-none group/today" 
                        style={{ left: `${256 + (Math.abs(startOffset) * 40)}px` }}
                    >
                        <div className="absolute top-0 -left-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                        </div>
                    </div>

                    {filteredProjects.length > 0 ? (
                        <div className="flex flex-col min-w-max">
                            {['Venda', 'Projeto', 'Corte', 'Produção', 'Entrega', 'Instalação', 'Vistoria', 'Finalizada'].map(status => {
                                const projectsInStatus = filteredProjects.filter(p => p.currentStatus === status);
                                if (projectsInStatus.length === 0) return null;

                                return (
                                    <div key={status} className="flex flex-col">
                                        {/* Status Header Row */}
                                        <div className="flex bg-slate-50/80 sticky top-0 z-20 backdrop-blur-sm border-b border-slate-100">
                                            <div className="sticky left-0 z-30 w-64 bg-slate-100/50 p-3 pl-6 border-r border-slate-200 flex items-center gap-2 shrink-0">
                                                <div className={`w-2 h-2 rounded-full ${getStatusColor(status as any)}`}></div>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{status}</span>
                                                <span className="ml-auto bg-white/80 px-2 py-0.5 rounded-full text-[8px] font-bold text-slate-400 border border-slate-200">{projectsInStatus.length}</span>
                                            </div>
                                            <div className="flex-1 h-10 border-r border-slate-100 italic flex items-center px-4 text-[9px] text-slate-300 font-medium">Cronograma de Atividades - {status}</div>
                                        </div>
                                        
                                        {projectsInStatus.map(renderProjectRow)}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-20 text-center flex flex-col items-center gap-4">
                            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center text-slate-200">
                                <Search size={40} />
                            </div>
                            <div>
                                <p className="text-foreground font-black uppercase italic">Nenhuma obra encontrada</p>
                                <p className="text-slate-400 text-xs font-bold mt-1">Ajuste os filtros ou a busca para ver resultados.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Legend */}
                <div className="p-6 bg-muted/50 border-t-2 border-slate-100 flex flex-wrap gap-6 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Venda / Projeto</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Produção</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Instalação</span>
                    </div>
                    <div className="flex items-center gap-2 mx-4 border-l border-border pl-6">
                        <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                            <Truck size={10} />
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Previsão Frete</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                            <Calendar size={10} />
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Entrega Final</span>
                    </div>
                </div>
            </div>

            {/* Quick Bottleneck Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Atraso Crítico</p>
                        <p className="text-xl font-black text-foreground leading-tight">
                            {projects.filter(p => p.promisedDate && new Date(p.promisedDate) < new Date() && p.currentStatus !== 'Finalizada').length} Obras
                        </p>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                        <Clock size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Entrega Esta Semana</p>
                        <p className="text-xl font-black text-foreground leading-tight">
                            {projects.filter(p => {
                                if (!p.deliveryDate) return false;
                                const d = new Date(p.deliveryDate);
                                const now = new Date();
                                const weekEnd = new Date();
                                weekEnd.setDate(now.getDate() + 7);
                                return d >= now && d <= weekEnd;
                            }).length} Agendamentos
                        </p>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                        <CheckCircle2 size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Capacidade Operacional</p>
                        <p className="text-xl font-black text-foreground leading-tight">85% Factory Load</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GanttChartView;
