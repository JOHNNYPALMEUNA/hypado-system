import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { DailyLog, Project } from '../types';
import {
    ClipboardList, AlertTriangle, CheckCircle2, Clock,
    Search, Plus, Hammer, Camera, X, ArrowRight,
    AlertOctagon, FileWarning, Pencil, Trash2, Eye,
    BarChart3, PieChart, TrendingUp, Calendar as CalendarIcon, Filter,
    Link, Printer, MessageCircle, User
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const ConstructionDiaryView: React.FC = () => {
    const { projects, dailyLogs, installers, addDailyLog, updateDailyLog, deleteDailyLog, currentUserEmail } = useData();
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [showLogModal, setShowLogModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showArchive, setShowArchive] = useState(false);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [viewingLog, setViewingLog] = useState<DailyLog | null>(null);
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [manualWorkName, setManualWorkName] = useState('');
    const [expandedProjects, setExpandedProjects] = useState<string[]>([]);

    // Form State
    const [category, setCategory] = useState<DailyLog['category']>('Outros');
    const [description, setDescription] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');

    // Missing Material State
    const [missingMaterialName, setMissingMaterialName] = useState('');

    // Absent Installer State
    const [absentInstallerId, setAbsentInstallerId] = useState('');

    // Project Error State
    const [needsReplacementPart, setNeedsReplacementPart] = useState(false);
    const [designerName, setDesignerName] = useState('');

    // Advanced Filters State
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const [printingLog, setPrintingLog] = useState<DailyLog | null>(null);

    const [activeTab, setActiveTab] = useState<'diary' | 'reports'>('diary');

    // Rework Form State
    const [partName, setPartName] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [thickness, setThickness] = useState('');
    const [color, setColor] = useState('');
    const [quantity, setQuantity] = useState('1');

    // Filter Active Projects (Installation Phase)
    const activeProjects = useMemo(() => {
        return projects.filter(p =>
            (p.currentStatus === 'Instalação' || p.currentStatus === 'Vistoria') &&
            (p.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [projects, searchTerm]);

    // Filter Pending Reworks (Factory View - implied for now, but visible here)
    const pendingReworks = useMemo(() => {
        return dailyLogs.filter(l =>
            ['Falta de Peça', 'Peça Danificada', 'Erro de Projeto', 'Peça Extra'].includes(l.category) &&
            l.status !== 'Concluído'
        );
    }, [dailyLogs]);

    const filteredLogs = useMemo(() => {
        let list = dailyLogs;

        // Identifica projetos que ainda possuem pendências ou registros não arquivados
        const pendingLogs = dailyLogs.filter(l => l.status !== 'Concluído');
        const activeProjectIds = new Set(pendingLogs.map(l => l.projectId));

        // Tab Filter
        if (showArchive) {
            // Archive: Mostra apenas se TODOS os logs daquele projeto estão concluídos
            list = list.filter(l => l.status === 'Concluído' && !activeProjectIds.has(l.projectId));
        } else {
            // Diário Ativo: Mostra logs se o projeto tiver pendências (mesmo os já concluídos para manter o lote agrupado)
            list = list.filter(l => l.status !== 'Concluído' || activeProjectIds.has(l.projectId));
        }

        // Category Filter
        if (filterCategory !== 'all') {
            list = list.filter(l => l.category === filterCategory);
        }

        // Status Filter
        if (filterStatus !== 'all') {
            list = list.filter(l => l.status === filterStatus);
        }

        // Date Range Filter
        if (filterStartDate) {
            list = list.filter(l => l.date >= filterStartDate);
        }
        if (filterEndDate) {
            list = list.filter(l => l.date <= filterEndDate);
        }

        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [dailyLogs, showArchive, filterCategory, filterStatus, filterStartDate, filterEndDate]);

    const handleSaveLog = async () => {
        if (!selectedProject && !editingLog && !isManualEntry) return;

        let isRework = ['Falta de Peça', 'Peça Danificada', 'Peça Extra'].includes(category);
        if (category === 'Erro de Projeto' && needsReplacementPart) {
            isRework = true;
        }

        let compiledDescription = description;

        if (category === 'Falta de Material') {
            if (!missingMaterialName) {
                alert('Informe qual material faltou.');
                return;
            }
            compiledDescription = `Material Faltante: ${missingMaterialName}\nObservação: ${description}`;
        }

        if (category === 'Montador Ausente') {
            if (!absentInstallerId) {
                alert('Selecione qual montador faltou.');
                return;
            }
            const installerName = installers.find((i: any) => i.id === absentInstallerId)?.name || 'Desconhecido';
            compiledDescription = `Montador: ${installerName}\nMotivo/Observação: ${description}`;
        }

        if (category === 'Erro de Projeto' || category === 'Erro de Fabricação') {
            if (!designerName || !description) {
                alert('Informe o projetista/arquiteto e a observação detalhada do erro.');
                return;
            }
            compiledDescription = `Projetista/Arquiteto: ${designerName}\nNecessita Peça/Reparo: ${needsReplacementPart ? 'Sim' : 'Não'}\nObservação/Motivo: ${description}`;
        }

        // Validation
        if (!compiledDescription && !isRework && category !== 'Erro de Projeto' && category !== 'Erro de Fabricação') {
            alert('Descreva o ocorrido.');
            return;
        }
        if (isRework && (!partName || !width || !height)) {
            alert('Para solicitações de peça, preencha as medidas e nome.');
            return;
        }

        const logData: DailyLog = {
            id: editingLog ? editingLog.id : crypto.randomUUID(),
            projectId: editingLog ? editingLog.projectId : (isManualEntry ? 'manual' : selectedProject!.id),
            workName: isManualEntry ? manualWorkName : undefined,
            date: editingLog ? editingLog.date : new Date().toISOString().split('T')[0],
            author: editingLog ? editingLog.author : (currentUserEmail ? currentUserEmail.split('@')[0] : 'Usuário'),
            category,
            description: compiledDescription || (isRework ? `Solicitação de peça: ${partName}` : ''),
            photoUrl,
            status: editingLog ? editingLog.status : (['Cliente Ausente', 'Montador Ausente', 'Serviço de Terceiros', 'Registro Diário', 'Outros'].includes(category) || (['Erro de Projeto', 'Erro de Fabricação'].includes(category) && !needsReplacementPart) ? 'Registrado' : 'Pendente'),
            createdAt: editingLog ? editingLog.createdAt : new Date().toISOString(),
            reworkDetails: isRework ? [{
                partName,
                width: Number(width),
                height: Number(height),
                thickness,
                color,
                quantity: Number(quantity),
                reason: category
            }] : undefined
        };

        if (editingLog) {
            await updateDailyLog(logData);
        } else {
            await addDailyLog(logData);
        }

        handleCloseModal();
    };

    const handleEditLog = (log: DailyLog) => {
        setEditingLog(log);
        setCategory(log.category);
        setPhotoUrl(log.photoUrl || '');

        let parsedDesc = log.description;
        if (log.category === 'Falta de Material') {
            const match = log.description.match(/Material Faltante: (.*?)\nObservação: (.*)/s);
            if (match) {
                setMissingMaterialName(match[1]);
                parsedDesc = match[2];
            }
        } else if (log.category === 'Montador Ausente') {
            const match = log.description.match(/Montador: (.*?)\nMotivo\/Observação: (.*)/s);
            if (match) {
                const installerName = match[1];
                const inst = installers.find((i: any) => i.name === installerName);
                if (inst) setAbsentInstallerId(inst.id);
                parsedDesc = match[2];
            }
        } else if (log.category === 'Erro de Projeto' || log.category === 'Erro de Fabricação') {
            const match = log.description.match(/Projetista\/Arquiteto: (.*?)\nNecessita Peça\/Reparo: (.*?)\nObservação\/Motivo: (.*)/s);
            if (match) {
                setDesignerName(match[1]);
                setNeedsReplacementPart(match[2] === 'Sim');
                parsedDesc = match[3];
            } else {
                const oldMatch = log.description.match(/Necessita Peça\/Reparo: (.*?)\nObservação\/Motivo: (.*)/s);
                if (oldMatch) {
                    setNeedsReplacementPart(oldMatch[1] === 'Sim');
                    parsedDesc = oldMatch[2];
                } else {
                    setNeedsReplacementPart(!!(log.reworkDetails && log.reworkDetails.length > 0));
                    parsedDesc = log.description;
                }
            }
        }
        setDescription(parsedDesc);

        if (log.reworkDetails && log.reworkDetails.length > 0) {
            const detail = log.reworkDetails[0];
            setPartName(detail.partName);
            setWidth(String(detail.width));
            setHeight(String(detail.height));
            setThickness(detail.thickness || '');
            setColor(detail.color || '');
            setQuantity(String(detail.quantity));
        }

        setShowLogModal(true);
    };

    const handleDeleteLog = async (id: string) => {
        const pwd = prompt('🔒 Acesso Restrito 🔒\n\nPara excluir este registro, digite a senha de administrador:');
        if (pwd !== 'adm123') {
            alert('Senha incorreta! Operação cancelada.');
            return;
        }
        if (window.confirm('Tem certeza que deseja excluir este registro? Todos os dados serão perdidos.')) {
            await deleteDailyLog(id);
        }
    };

    const handleCloseModal = () => {
        setShowLogModal(false);
        setEditingLog(null);
        setSelectedProject(null);
        setCategory('Outros');
        setDescription('');
        setPhotoUrl('');
        setPartName('');
        setWidth('');
        setHeight('');
        setThickness('');
        setColor('');
        setQuantity('1');
        setMissingMaterialName('');
        setAbsentInstallerId('');
        setIsManualEntry(false);
        setManualWorkName('');
        setNeedsReplacementPart(false);
        setDesignerName('');
    };

    const getStatusColor = (status: DailyLog['status']) => {
        switch (status) {
            case 'Pendente': return 'bg-red-100 text-red-700 border-red-200';
            case 'Em Produção': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Pronto': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Concluído': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Registrado': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-muted text-foreground';
        }
    };

    return (
        <div className="flex flex-col h-full bg-muted/50 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-end justify-between p-6 pb-4 gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                            <ClipboardList className="text-emerald-500" />
                            Diário de Obra & Solicitações
                        </h1>
                        <p className="text-slate-400 mt-1 font-bold text-sm tracking-wide">PORTAL DO MONTADOR E GERENCIAMENTO DE OCORRÊNCIAS</p>
                    </div>

                    <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                        <button
                            onClick={() => setActiveTab('diary')}
                            className={`px-6 py-2.5 rounded-lg font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'diary' ? 'bg-emerald-500 text-foreground shadow-sm' : 'text-slate-300 hover:text-white'}`}
                        >
                            <CalendarIcon size={16} /> Diário
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`px-6 py-2.5 rounded-lg font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'bg-emerald-500 text-foreground shadow-sm' : 'text-slate-300 hover:text-white'}`}
                        >
                            <BarChart3 size={16} /> Relatórios
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {activeTab === 'diary' ? (
                    <div className="max-w-7xl mx-auto space-y-8">

                        {/* Section 1: Active Projects */}
                        <section>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                                    <Hammer size={20} className="text-emerald-600" /> Obras em Instalação
                                </h2>
                                <button
                                    onClick={() => {
                                        setIsManualEntry(true);
                                        setSelectedProject(null);
                                        setShowLogModal(true);
                                    }}
                                    className="bg-slate-900 hover:bg-emerald-500 text-white hover:text-foreground px-6 py-3 rounded-xl font-black tracking-widest uppercase text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                                >
                                    <Plus size={16} /> Ocorrência Avulsa (S/ Projeto)
                                </button>
                            </div>

                            {/* Search */}
                            <div className="mb-4 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar obra..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeProjects.map(project => (
                                    <div key={project.id} className="bg-card rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-foreground">{project.workName}</h3>
                                            <span className="px-2 py-1 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                                {project.currentStatus}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">{project.clientName} • {project.workAddress}</p>

                                        <button
                                            onClick={() => {
                                                setSelectedProject(project);
                                                setShowLogModal(true);
                                            }}
                                            className="w-full bg-slate-900 text-white py-3 rounded-xl font-black tracking-widest uppercase text-xs hover:bg-emerald-500 hover:text-foreground transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} /> Registrar Ocorrência
                                        </button>
                                    </div>
                                ))}
                                {activeProjects.length === 0 && (
                                    <div className="col-span-full py-10 text-center text-slate-400 italic">
                                        Nenhuma obra em fase de instalação no momento.
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Section 2: Recent Logs & Reworks */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                                    <AlertTriangle size={20} className="text-amber-500" /> {showArchive ? 'Histórico de Concluídos' : 'Solicitações Recentes'}
                                </h2>
                                <button
                                    onClick={() => setShowArchive(!showArchive)}
                                    className={`text-[10px] uppercase tracking-widest font-black px-4 py-2.5 rounded-lg border transition-all active:scale-95 ${showArchive
                                        ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                                        : 'bg-card text-muted-foreground border-border hover:border-border shadow-sm'
                                        }`}
                                >
                                    {showArchive ? 'Ver Ativos (Diário)' : 'Ver Arquivo de Concluídos'}
                                </button>
                            </div>

                            {/* Advanced Filters Bar */}
                            <div className="bg-card p-4 rounded-2xl border border-border shadow-sm mb-4 flex flex-wrap items-end gap-4">
                                <div className="flex-1 min-w-[200px] space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                                    <select
                                        title="Filtrar por Categoria"
                                        className="w-full p-2.5 bg-muted/50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={filterCategory}
                                        onChange={e => setFilterCategory(e.target.value)}
                                    >
                                        <option value="all">Todas</option>
                                        <option value="Falta de Peça">Falta de Peça</option>
                                        <option value="Peça Danificada">Peça Danificada</option>
                                        <option value="Erro de Projeto">Erro de Projeto</option>
                                        <option value="Erro de Fabricação">Erro de Fabricação</option>
                                        <option value="Falta de Material">Falta de Material</option>
                                        <option value="Montador Ausente">Montador Ausente</option>
                                        <option value="Serviço de Terceiros">Serviço de Terceiros</option>
                                        <option value="Cliente Ausente">Cliente Ausente</option>
                                        <option value="Peça Extra">Peça Extra</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                                <div className="w-32 space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                    <select
                                        title="Filtrar por Status"
                                        className="w-full p-2.5 bg-muted/50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value)}
                                    >
                                        <option value="all">Todos</option>
                                        <option value="Pendente">Pendente</option>
                                        <option value="Em Produção">Em Produção</option>
                                        <option value="Pronto">Pronto</option>
                                    </select>
                                </div>
                                <div className="w-36 space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">De</label>
                                    <input
                                        type="date"
                                        title="Data Inicial"
                                        className="w-full p-2.5 bg-muted/50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={filterStartDate}
                                        onChange={e => setFilterStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="w-36 space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Até</label>
                                    <input
                                        type="date"
                                        title="Data Final"
                                        className="w-full p-2.5 bg-muted/50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={filterEndDate}
                                        onChange={e => setFilterEndDate(e.target.value)}
                                    />
                                </div>
                                {(filterCategory !== 'all' || filterStatus !== 'all' || filterStartDate || filterEndDate) && (
                                    <button
                                        onClick={() => {
                                            setFilterCategory('all');
                                            setFilterStatus('all');
                                            setFilterStartDate('');
                                            setFilterEndDate('');
                                        }}
                                        className="p-2.5 text-slate-400 hover:text-foreground bg-muted hover:bg-slate-200 rounded-xl transition-colors"
                                        title="Limpar Filtros"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                                            <tr>
                                                <th className="p-4">Data</th>
                                                <th className="p-4">Obra</th>
                                                <th className="p-4">Categoria</th>
                                                <th className="p-4">Descrição / Detalhes</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {Array.from(new Set(filteredLogs.map(l => l.projectId))).map(projectId => {
                                                const projectLogs = filteredLogs.filter(l => l.projectId === projectId);
                                                const proj = projects.find(p => p.id === projectId);
                                                const workName = proj?.workName || projectLogs[0]?.workName || 'Obra Removida / Avulsa';
                                                const isExpanded = expandedProjects.includes(projectId || 'avulsa');
                                                const idToToggle = projectId || 'avulsa';

                                                return (
                                                    <React.Fragment key={idToToggle}>
                                                        <tr
                                                            className="hover:bg-muted/50 cursor-pointer group transition-colors"
                                                            onClick={() => setExpandedProjects(prev => prev.includes(idToToggle) ? prev.filter(id => id !== idToToggle) : [...prev, idToToggle])}
                                                        >
                                                            <td colSpan={6} className="p-4 border-l-4 border-emerald-500 bg-emerald-50/30">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
                                                                            <ArrowRight size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-black text-foreground tracking-wide">{workName}</span>
                                                                            <p className="text-xs font-bold text-muted-foreground mt-0.5">
                                                                                Lote: {projectLogs.length} registro(s) encontrados
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2 items-center">
                                                                        {/* Apoio ao Lote - Aprovar Todos */}
                                                                        {projectLogs.some(l => l.status !== 'Concluído') && (
                                                                            <button
                                                                                onClick={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    if (window.confirm(`Tem certeza que deseja marcar TODAS as pendências desta obra (${workName}) como Concluídas?`)) {
                                                                                        const pending = projectLogs.filter(l => l.status !== 'Concluído');
                                                                                        for (const log of pending) {
                                                                                            await updateDailyLog({ ...log, status: 'Concluído' });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded shadow-sm text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                                                                                title="Concluir todos os registros deste lote de uma só vez"
                                                                            >
                                                                                <CheckCircle2 size={12} />
                                                                                Aprovar Lote
                                                                            </button>
                                                                        )}

                                                                        {/* Resumo de Status Rápido */}
                                                                        {projectLogs.some(l => l.status === 'Pendente') && (
                                                                            <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider flex items-center">Pendentes</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && projectLogs.map(log => {
                                                            return (
                                                                <tr key={log.id} className="hover:bg-muted/50 bg-card">
                                                                    <td className="p-4 text-muted-foreground whitespace-nowrap pl-8 border-l-4 border-transparent">
                                                                        {new Date(log.date).toLocaleDateString()}
                                                                    </td>
                                                                    <td className="p-4 font-medium text-slate-400 text-xs text-left align-top">
                                                                        <div className="flex flex-col gap-1 w-28">
                                                                            <span>↳ Registro</span>
                                                                            <span className="flex items-center gap-1 font-bold text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap" title={`Registrado por: ${log.author || 'Usuário'}`}>
                                                                                <User size={12} className="shrink-0" /> {log.author || 'Usuário'}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${['Falta de Peça', 'Erro de Projeto', 'Erro de Fabricação'].includes(log.category) ? 'bg-red-50 text-red-600' : 'bg-muted text-muted-foreground'
                                                                            }`}>
                                                                            {['Falta de Peça', 'Erro de Projeto', 'Erro de Fabricação'].includes(log.category) && <AlertOctagon size={12} />}
                                                                            {log.category}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-4 text-muted-foreground max-w-xs truncate">
                                                                        {log.reworkDetails ? (
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className="font-bold text-xs">PEÇA: {log.reworkDetails[0].partName}</span>
                                                                                <span className="text-xs">{log.reworkDetails[0].width}x{log.reworkDetails[0].height}mm • {log.reworkDetails[0].color}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className={`text-xs ${['Montador Ausente', 'Cliente Ausente', 'Falta de Material', 'Serviço de Terceiros'].includes(log.category) ? 'font-bold whitespace-pre-line' : 'truncate max-w-xs'}`}>
                                                                                {log.description}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-4">
                                                                        {log.status === 'Pendente' && (log.category === 'Erro de Projeto' || log.category === 'Erro de Fabricação') ? (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const resolution = prompt('Resolvendo Ocorrência\n\nO que foi feito para solucionar este problema?');
                                                                                    if (resolution) {
                                                                                        updateDailyLog({
                                                                                            ...log,
                                                                                            status: 'Concluído',
                                                                                            description: `${log.description}\n\n[RESOLUÇÃO]: ${resolution}`
                                                                                        });
                                                                                    }
                                                                                }}
                                                                                className="px-3 py-1 rounded-full text-xs font-bold border border-red-200 bg-red-100 text-red-700 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-200 transition-colors cursor-pointer"
                                                                                title="Clique para marcar como resolvido"
                                                                            >
                                                                                {log.status}
                                                                            </button>
                                                                        ) : (
                                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(log.status)}`}>
                                                                                {log.status}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-4 text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            {/* Status Management */}
                                                                            {['Outros', 'Cliente Ausente', 'Montador Ausente', 'Serviço de Terceiros', 'Registro Diário'].includes(log.category) ||
                                                                                (['Erro de Projeto', 'Erro de Fabricação'].includes(log.category) && (!log.reworkDetails || log.reworkDetails.length === 0)) ? (
                                                                                <span className="text-xs text-slate-400 italic">Ciência Apenas</span>
                                                                            ) : (
                                                                                <>
                                                                                    {log.status === 'Pendente' && !['Erro de Projeto', 'Erro de Fabricação'].includes(log.category) && (
                                                                                        <button
                                                                                            onClick={() => updateDailyLog({ ...log, status: 'Em Produção' })}
                                                                                            className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200"
                                                                                            title="Mover para Produção"
                                                                                        >
                                                                                            Produzir
                                                                                        </button>
                                                                                    )}
                                                                                    {log.status === 'Em Produção' && (
                                                                                        <button
                                                                                            onClick={() => updateDailyLog({ ...log, status: 'Pronto' })}
                                                                                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                                                                            title="Marcar como Pronto"
                                                                                        >
                                                                                            Pronto
                                                                                        </button>
                                                                                    )}
                                                                                    {log.status === 'Pronto' && (
                                                                                        <button
                                                                                            onClick={() => updateDailyLog({ ...log, status: 'Concluído' })}
                                                                                            className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200"
                                                                                            title="Marcar como Concluído"
                                                                                        >
                                                                                            Recebido
                                                                                        </button>
                                                                                    )}
                                                                                </>
                                                                            )}

                                                                            <div className="w-px h-4 bg-slate-200 mx-1" />

                                                                            {/* Edit/View/Delete Actions */}
                                                                            <button
                                                                                onClick={() => setViewingLog(log)}
                                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                                title="Visualizar Detalhes (Leitura)"
                                                                            >
                                                                                <Eye size={15} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleEditLog(log)}
                                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                                title="Editar Registro"
                                                                            >
                                                                                <Pencil size={15} />
                                                                            </button>

                                                                            {/* Share/Print Actions */}
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    let msg = `*🚧 NOVA OCORRÊNCIA NA OBRA*\n\n`;
                                                                                    msg += `*Obra:* ${proj?.workName || log.workName || 'Avulsa'}\n`;
                                                                                    msg += `*Categoria:* ${log.category}\n`;
                                                                                    msg += `*Data:* ${new Date(log.date).toLocaleDateString()}\n\n`;
                                                                                    if (log.reworkDetails && log.reworkDetails.length > 0) {
                                                                                        msg += `*🔧 DETALHES DA PEÇA:*\n`;
                                                                                        msg += `- Nome: ${log.reworkDetails[0].partName}\n`;
                                                                                        msg += `- Medidas: ${log.reworkDetails[0].width}x${log.reworkDetails[0].height}mm\n`;
                                                                                        if (log.reworkDetails[0].thickness) msg += `- Espessura: ${log.reworkDetails[0].thickness}\n`;
                                                                                        if (log.reworkDetails[0].color) msg += `- Cor/Acabamento: ${log.reworkDetails[0].color}\n`;
                                                                                        msg += `- Quantidade: ${log.reworkDetails[0].quantity}\n\n`;
                                                                                    }
                                                                                    msg += `*ðŸ“ OBSERVAÇÕES:*\n${log.description}\n`;
                                                                                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                                                                }}
                                                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                                title="Compartilhar no WhatsApp"
                                                                            >
                                                                                <MessageCircle size={15} />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setPrintingLog(log);
                                                                                    setTimeout(() => {
                                                                                        window.print();
                                                                                        setTimeout(() => setPrintingLog(null), 500);
                                                                                    }, 500);
                                                                                }}
                                                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                                title="Imprimir Arquivo em PDF"
                                                                            >
                                                                                <Printer size={15} />
                                                                            </button>

                                                                            <button
                                                                                onClick={() => handleDeleteLog(log.id)}
                                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                                title="Excluir Registro"
                                                                            >
                                                                                <Trash2 size={15} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                            {filteredLogs.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                                        Nenhum registro no diário.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                                <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                                    <BarChart3 className="text-emerald-500" />
                                    Visão Geral de Ocorrências e Erros
                                </h2>
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        const yesterday = new Date(now);
                                        yesterday.setDate(yesterday.getDate() - 1);
                                        const yesterdayStr = yesterday.toLocaleDateString();

                                        const yesterdayLogs = dailyLogs.filter(log => {
                                            // Compare based on the exact string rendered on the screen
                                            return new Date(log.date).toLocaleDateString() === yesterdayStr;
                                        });

                                        if (yesterdayLogs.length === 0) {
                                            alert('Nenhuma ocorrência registrada ontem (' + yesterdayStr + ').');
                                            return;
                                        }

                                        const yesterdayDateStr = yesterday.toISOString().split('T')[0];
                                        const baseUrl = window.location.origin;
                                        const shareUrl = `${baseUrl}/?mode=daily-report&date=${yesterdayDateStr}`;

                                        let msg = `*📊 FECHAMENTO DIÁRIO DE OCORRÊNCIAS*\n`;
                                        msg += `Acesse o link abaixo para visualizar o relatório completo e interativo de ontem (${yesterdayStr}):\n\n`;
                                        msg += `${shareUrl}\n\n`;
                                        msg += `_Hypado System - Gestão Inteligente_`;

                                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                    }}
                                    className="bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2.5 rounded-xl font-black tracking-widest uppercase text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
                                >
                                    <MessageCircle size={16} /> Fechamento de Ontem (Zap)
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="p-4 bg-muted/50 rounded-xl border border-slate-100">
                                    <p className="text-sm font-bold text-muted-foreground mb-1">Total de Ocorrências</p>
                                    <p className="text-3xl font-black text-foreground">{dailyLogs.length}</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                    <p className="text-sm font-bold text-red-600 mb-1">Erros (Projeto / Fábrica)</p>
                                    <p className="text-3xl font-black text-red-700">
                                        {dailyLogs.filter(l => l.category === 'Erro de Projeto' || l.category === 'Erro de Fabricação').length}
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-sm font-bold text-amber-600 mb-1">Falta de Peça / Material</p>
                                    <p className="text-3xl font-black text-amber-700">
                                        {dailyLogs.filter(l => l.category === 'Falta de Peça' || l.category === 'Falta de Material').length}
                                    </p>
                                </div>
                            </div>

                            <h3 className="text-md font-bold text-foreground mb-4">Ocorrências por Categoria</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={Object.entries(
                                            dailyLogs.reduce((acc, log) => {
                                                acc[log.category] = (acc[log.category] || 0) + 1;
                                                return acc;
                                            }, {} as Record<string, number>)
                                        ).map(([name, count]) => ({ name, count: count as number })).sort((a, b) => b.count - a.count)}
                                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                                        <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h3 className="text-md font-bold text-foreground mb-4 flex items-center gap-2">
                                <AlertTriangle className="text-amber-500" size={18} />
                                Análise de Erros
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">Abaixo estão listados os motivos informados para erros (projeto/fábrica) recentes para tomada de decisão e feedback.</p>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {dailyLogs.filter(l => l.category === 'Erro de Projeto' || l.category === 'Erro de Fabricação').length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">Nenhum erro registrado.</p>
                                ) : (
                                    dailyLogs.filter(l => l.category === 'Erro de Projeto' || l.category === 'Erro de Fabricação').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(log => {
                                        const proj = projects.find(p => p.id === log.projectId);
                                        return (
                                            <div key={log.id} className="p-4 rounded-xl border border-red-100 bg-red-50/50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="font-bold text-foreground text-sm block">{proj?.workName || log.workName || 'Obra Removida'}</span>
                                                        <span className="text-xs text-muted-foreground mt-0.5 block">{new Date(log.date).toLocaleDateString()}</span>
                                                    </div>
                                                    {log.reworkDetails && log.reworkDetails.length > 0 && (
                                                        <span className="px-2 py-1 rounded-md bg-red-100 text-red-800 font-bold text-[10px] uppercase">
                                                            Nova Peça Solicitada
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-foreground whitespace-pre-wrap">{log.description}</p>
                                                {log.reworkDetails && log.reworkDetails.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-red-200 border-dashed">
                                                        <p className="text-xs font-bold text-red-800">Peça p/ Refazer: {log.reworkDetails[0].partName}</p>
                                                        <p className="text-xs text-red-600">{log.reworkDetails[0].width}x{log.reworkDetails[0].height}mm • {log.reworkDetails[0].thickness || '-'} • {log.reworkDetails[0].color || '-'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: Nova Ocorrência / Edição */}
            {showLogModal && (selectedProject || editingLog || isManualEntry) && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-muted/50">
                            <h2 className="text-xl font-bold text-foreground">
                                {editingLog ? 'Editar Registro' : 'Registrar Diário / Ocorrência'}
                            </h2>
                            <button onClick={handleCloseModal} title="Fechar" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-6">

                            {/* Project Info */}
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <p className="text-xs text-emerald-800 font-bold uppercase tracking-wide">Obra</p>
                                {isManualEntry ? (
                                    <input
                                        autoFocus
                                        className="w-full mt-2 p-3 bg-card rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-foreground"
                                        placeholder="Nome livre da Obra ou Cliente..."
                                        value={manualWorkName}
                                        onChange={(e) => setManualWorkName(e.target.value)}
                                    />
                                ) : (
                                    <p className="text-lg font-bold text-emerald-900 mt-1">
                                        {editingLog ? projects.find(p => p.id === editingLog.projectId)?.workName : selectedProject?.workName}
                                    </p>
                                )}
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Qual o tipo de ocorrência?</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                        'Falta de Peça', 'Peça Extra', 'Peça Danificada', 'Erro de Projeto', 'Erro de Fabricação',
                                        'Falta de Material', 'Montador Ausente', 'Cliente Ausente', 'Serviço de Terceiros', 'Atraso Frete', 'Registro Diário', 'Outros'
                                    ].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setCategory(cat as any)}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${category === cat
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                                : 'bg-card text-muted-foreground border-border hover:border-emerald-500'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conditional Form: Rework Request */}
                            {category === 'Erro de Projeto' || category === 'Erro de Fabricação' ? (
                                <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                                    <div className="flex items-center gap-2 text-red-800 mb-2">
                                        <AlertOctagon size={20} />
                                        <h3 className="font-bold">Registro de {category}</h3>
                                    </div>

                                    <div className="bg-card p-5 rounded-xl border border-red-200 shadow-sm space-y-4">
                                        <div>
                                            <label className="text-sm font-bold text-foreground block mb-1">Nome do Projetista / Arquiteto / Responsável</label>
                                            <input
                                                className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-red-500 bg-muted/50 transition-all font-medium text-foreground"
                                                placeholder="Ex: João Silva"
                                                value={designerName}
                                                onChange={e => setDesignerName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-foreground block mb-1">Observação / Motivo do Erro</label>
                                            <textarea
                                                className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-red-500 h-24 bg-muted/50 transition-all font-medium text-foreground"
                                                placeholder="Descreva detalhadamente o erro ocorrido..."
                                                value={description}
                                                onChange={e => setDescription(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-red-200 mt-4">
                                        <div>
                                            <p className="font-bold text-foreground text-sm">Necessita solicitar peça ou reparo?</p>
                                            <p className="text-xs text-muted-foreground">Selecione se será necessário produzir uma nova peça para resolver o erro.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                title="Necessita solicitar peça ou reparo?"
                                                className="sr-only peer"
                                                checked={needsReplacementPart}
                                                onChange={e => setNeedsReplacementPart(e.target.checked)}
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500 text-transparent"></div>
                                        </label>
                                    </div>

                                    {needsReplacementPart && (
                                        <div className="mt-4 border-t border-red-200 pt-4 space-y-4 animate-in fade-in">
                                            <h4 className="font-bold text-sm text-red-800 flex items-center gap-2">
                                                <Hammer size={16} /> Detalhes da Peça para Refazimento
                                            </h4>
                                            <div>
                                                <label className="text-xs font-bold text-red-800">Nome da Peça / Módulo</label>
                                                <input
                                                    className="w-full mt-1 p-3 rounded-lg border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-card"
                                                    placeholder="Ex: Porta do Aéreo, Frente de Gaveta..."
                                                    value={partName}
                                                    onChange={e => setPartName(e.target.value)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-xs font-bold text-red-800">Largura (mm)</label>
                                                    <input type="number" className="w-full mt-1 p-3 rounded-lg border border-red-200 bg-card" placeholder="0" value={width} onChange={e => setWidth(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-red-800">Altura (mm)</label>
                                                    <input type="number" className="w-full mt-1 p-3 rounded-lg border border-red-200 bg-card" placeholder="0" value={height} onChange={e => setHeight(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-red-800">Espessura</label>
                                                    <select title="Espessura" className="w-full mt-1 p-3 rounded-lg border border-red-200 bg-card" value={thickness} onChange={e => setThickness(e.target.value)}>
                                                        <option value="">Selecione...</option>
                                                        <option value="6mm">6mm</option>
                                                        <option value="15mm">15mm</option>
                                                        <option value="18mm">18mm</option>
                                                        <option value="25mm">25mm</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs font-bold text-red-800">Cor / Acabamento</label>
                                                    <input className="w-full mt-1 p-3 rounded-lg border border-red-200 bg-card" placeholder="Ex: Branco Tx" value={color} onChange={e => setColor(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-red-800">Quantidade</label>
                                                    <input type="number" title="Quantidade" className="w-full mt-1 p-3 rounded-lg border border-red-200 bg-card" value={quantity} onChange={e => setQuantity(e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : ['Falta de Peça', 'Peça Danificada', 'Peça Extra'].includes(category) ? (
                                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                                    <div className="flex items-center gap-2 text-amber-800 mb-2">
                                        <FileWarning size={20} />
                                        <h3 className="font-bold">Dados da Peça (Refazimento / Extra)</h3>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-amber-800">Nome da Peça / Módulo</label>
                                        <input
                                            className="w-full mt-1 p-3 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-card"
                                            placeholder="Ex: Porta do Aéreo, Frente de Gaveta..."
                                            value={partName}
                                            onChange={e => setPartName(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-amber-800">Largura (mm)</label>
                                            <input type="number" className="w-full mt-1 p-3 rounded-lg border border-amber-200 bg-card" placeholder="0" value={width} onChange={e => setWidth(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-amber-800">Altura (mm)</label>
                                            <input type="number" className="w-full mt-1 p-3 rounded-lg border border-amber-200 bg-card" placeholder="0" value={height} onChange={e => setHeight(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-amber-800">Espessura</label>
                                            <select title="Espessura" className="w-full mt-1 p-3 rounded-lg border border-amber-200 bg-card" value={thickness} onChange={e => setThickness(e.target.value)}>
                                                <option value="">Selecione...</option>
                                                <option value="6mm">6mm</option>
                                                <option value="15mm">15mm</option>
                                                <option value="18mm">18mm</option>
                                                <option value="25mm">25mm</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-amber-800">Cor / Acabamento</label>
                                            <input className="w-full mt-1 p-3 rounded-lg border border-amber-200 bg-card" placeholder="Ex: Branco Tx" value={color} onChange={e => setColor(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-amber-800">Quantidade</label>
                                            <input type="number" title="Quantidade" className="w-full mt-1 p-3 rounded-lg border border-amber-200 bg-card" value={quantity} onChange={e => setQuantity(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ) : category === 'Falta de Material' ? (
                                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                                    <div className="flex items-center gap-2 text-orange-800 mb-2">
                                        <AlertTriangle size={20} />
                                        <h3 className="font-bold">Registro de Falta de Material</h3>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-orange-800">Qual material faltou?</label>
                                        <input
                                            className="w-full mt-1 p-3 rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-card"
                                            placeholder="Ex: Parafusos 4x40, Fita de borda Branca..."
                                            value={missingMaterialName}
                                            onChange={e => setMissingMaterialName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-orange-800">Observação / Onde seria usado?</label>
                                        <textarea
                                            className="w-full mt-1 p-3 rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 h-24 bg-card"
                                            placeholder="Descreva a finalidade..."
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : category === 'Montador Ausente' ? (
                                <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                                    <div className="flex items-center gap-2 text-red-800 mb-2">
                                        <AlertOctagon size={20} />
                                        <h3 className="font-bold">Registro de Ausência</h3>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-red-800">Qual montador se ausentou?</label>
                                        <select
                                            title="Selecione o Montador"
                                            className="w-full mt-1 p-3 rounded-lg border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-card text-foreground"
                                            value={absentInstallerId}
                                            onChange={e => setAbsentInstallerId(e.target.value)}
                                        >
                                            <option value="">Selecione o montador...</option>
                                            {(installers || []).map((inst: any) => (
                                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-red-800">Motivo / Observação</label>
                                        <textarea
                                            className="w-full mt-1 p-3 rounded-lg border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 h-24 bg-card"
                                            placeholder="Descreva o motivo informado..."
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-2">Descrição do Ocorrido</label>
                                    <textarea
                                        className="w-full p-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 h-32"
                                        placeholder="Descreva o que aconteceu..."
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Photo Upload (Visual Only for now) */}
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Link da Foto (Opcional)</label>
                                <div className="flex gap-2">
                                    <div className="bg-muted p-3 rounded-xl flex items-center justify-center text-slate-400">
                                        <Camera size={20} />
                                    </div>
                                    <input
                                        className="flex-1 p-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Cole o link da foto de evidência..."
                                        value={photoUrl}
                                        onChange={e => setPhotoUrl(e.target.value)}
                                    />
                                </div>
                            </div>

                        </div>

                        <div className="p-6 border-t border-slate-100 bg-muted/50 flex justify-end gap-2">
                            <button
                                onClick={handleCloseModal}
                                className="px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveLog}
                                className="px-8 py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-emerald-600 transition-colors shadow-lg flex items-center gap-2"
                            >
                                <CheckCircle2 size={18} />
                                Confirmar Registro
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW MODAL (Read-Only) */}
            {viewingLog && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-muted/50">
                            <div>
                                <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
                                    <Eye className="text-indigo-500" /> Detalhes da Ocorrência
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1 font-bold">Modo de Leitura</p>
                            </div>
                            <button
                                onClick={() => setViewingLog(null)}
                                title="Fechar Visualização"
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-8 flex-1">
                            <div className="grid grid-cols-2 gap-6 bg-muted/50 p-6 rounded-2xl border border-border">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400">Obra / Referência</label>
                                    <p className="font-bold text-foreground text-lg mt-1">{projects.find(p => p.id === viewingLog.projectId)?.workName || viewingLog.workName || 'Avulsa'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400">Categoria da Ocorrência</label>
                                    <p className="font-bold text-foreground text-lg mt-1">{viewingLog.category}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400">Status Atual</label>
                                    <p className={`font-bold text-sm mt-1 inline-block px-3 py-1 rounded-full border ${getStatusColor(viewingLog.status)}`}>{viewingLog.status}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400">Data de Registro</label>
                                    <p className="font-bold text-foreground text-sm mt-1">{new Date(viewingLog.date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {viewingLog.reworkDetails && viewingLog.reworkDetails.length > 0 && (
                                <div className="border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="bg-amber-100 p-4 border-b border-amber-200 flex items-center gap-2">
                                        <FileWarning className="text-amber-600" size={20} />
                                        <h3 className="font-black text-amber-800 uppercase tracking-tight">Detalhes do Retrabalho ou Reposição</h3>
                                    </div>
                                    <div className="p-6 bg-amber-50/50">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Peça</label>
                                                <p className="font-bold text-foreground">{viewingLog.reworkDetails[0].partName}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Medidas (L x A)</label>
                                                <p className="font-bold text-foreground">{viewingLog.reworkDetails[0].width} x {viewingLog.reworkDetails[0].height} mm</p>
                                            </div>
                                            {viewingLog.reworkDetails[0].thickness && (
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Espessura</label>
                                                    <p className="font-bold text-foreground">{viewingLog.reworkDetails[0].thickness}</p>
                                                </div>
                                            )}
                                            {viewingLog.reworkDetails[0].color && (
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Cor</label>
                                                    <p className="font-bold text-foreground">{viewingLog.reworkDetails[0].color}</p>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Quantidade</label>
                                                <p className="font-bold text-foreground">{viewingLog.reworkDetails[0].quantity} unid.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs uppercase tracking-widest font-black text-muted-foreground mb-2 flex items-center gap-2">
                                    <ClipboardList size={16} /> Observações Registradas
                                </label>
                                <div className="bg-muted/50 p-6 rounded-2xl border border-border">
                                    <p className="text-foreground whitespace-pre-wrap leading-relaxed font-medium">
                                        {viewingLog.description}
                                    </p>
                                </div>
                            </div>

                            {viewingLog.photoUrl && (
                                <div>
                                    <label className="text-xs uppercase tracking-widest font-black text-muted-foreground mb-2 flex items-center gap-2">
                                        <Camera size={16} /> Foto Anexada
                                    </label>
                                    <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
                                        <img src={viewingLog.photoUrl} alt="Foto da ocorrência" className="w-full h-auto object-contain max-h-[300px] bg-muted" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-muted/50 flex justify-end">
                            <button
                                onClick={() => setViewingLog(null)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-slate-800 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINTABLE COMPONENT */}
            {printingLog && (
                <div id="printable-log-report" className="hidden print:block fixed inset-0 z-[9999] bg-card text-black p-8">
                    <div className="border-b-4 border-slate-900 pb-6 mb-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black uppercase italic tracking-tight">Hypado System</h1>
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">Relatório de Ocorrência / Diário</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-black text-foreground border-2 border-slate-900 px-4 py-2 inline-block rounded-xl uppercase">
                                    {printingLog.category}
                                </h2>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Obra Referência</p>
                            <p className="text-xl font-bold bg-muted/50 p-4 rounded-xl border border-border">
                                {projects.find(p => p.id === printingLog.projectId)?.workName || printingLog.workName || 'Obra Removida'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Data do Registro</p>
                            <p className="text-xl font-bold bg-muted/50 p-4 rounded-xl border border-border">
                                {new Date(printingLog.date).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {printingLog.reworkDetails && printingLog.reworkDetails.length > 0 && (
                        <div className="mb-8 relative border-2 border-slate-900 rounded-2xl p-6">
                            <h3 className="absolute -top-4 left-6 bg-card px-2 font-black text-foreground uppercase tracking-widest">Detalhes da Peça / Reposição</h3>
                            <div className="grid grid-cols-2 gap-y-4">
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase block">Nome da Peça</span>
                                    <span className="font-bold text-lg">{printingLog.reworkDetails[0].partName}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase block">Medidas (L x A)</span>
                                    <span className="font-bold text-lg">{printingLog.reworkDetails[0].width} x {printingLog.reworkDetails[0].height} mm</span>
                                </div>
                                {printingLog.reworkDetails[0].thickness && (
                                    <div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase block">Espessura</span>
                                        <span className="font-bold text-lg">{printingLog.reworkDetails[0].thickness}</span>
                                    </div>
                                )}
                                {printingLog.reworkDetails[0].color && (
                                    <div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase block">Acabamento / Cor</span>
                                        <span className="font-bold text-lg">{printingLog.reworkDetails[0].color}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase block">Quantidade</span>
                                    <span className="font-bold text-lg">{printingLog.reworkDetails[0].quantity} unid.</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mb-8 relative border border-border rounded-2xl p-6 bg-muted/50">
                        <h3 className="absolute -top-4 left-6 bg-muted/50 px-2 font-black text-muted-foreground uppercase tracking-widest">Observações Registradas</h3>
                        <p className="whitespace-pre-wrap font-medium text-foreground pt-2 leading-relaxed text-lg">
                            {printingLog.description}
                        </p>
                    </div>

                    <div className="mt-16 pt-8 border-t border-border text-center flex justify-between items-end">
                        <div>
                            <p className="font-bold text-foreground text-lg border-b border-black w-64 inline-block mb-2">&nbsp;</p>
                            <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Assinatura Responsável</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Documento Gerado via Hypado System</p>
                            <p className="text-[10px] text-slate-400">Em {new Date().toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConstructionDiaryView;
