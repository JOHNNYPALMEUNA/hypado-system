import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  BarChart3, 
  Plus, 
  Hammer, 
  Search, 
  AlertTriangle, 
  X,
  Eye,
  Camera,
  CheckCircle2,
  FileWarning,
  ClipboardList
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { DailyLog, Project } from '../types';

// Modular Components
import DiaryTable from './diary/DiaryTable';
import DiaryFormModal from './diary/DiaryFormModal';
import DiaryReportView from './diary/DiaryReportView';

const ConstructionDiaryView: React.FC = () => {
    const { 
        projects, 
        dailyLogs, 
        addDailyLog, 
        updateDailyLog, 
        deleteDailyLog, 
        installers,
        currentUserEmail 
    } = useData();

    // UI States
    const [activeTab, setActiveTab] = useState<'diary' | 'reports'>('diary');
    const [searchTerm, setSearchTerm] = useState('');
    const [showArchive, setShowArchive] = useState(false);
    
    // Filters
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    
    // Modal & Selection States
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
    const [viewingLog, setViewingLog] = useState<DailyLog | null>(null);
    const [printingLog, setPrintingLog] = useState<DailyLog | null>(null);

    // Filter Logic
    const activeProjects = useMemo(() => {
        return projects.filter(p => 
            (p.currentStatus === 'Instalação' || p.currentStatus === 'Vistoria') && 
            p.workName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

    const filteredLogs = useMemo(() => {
        return dailyLogs.filter(log => {
            const matchesCategory = filterCategory === 'all' || log.category === filterCategory;
            const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
            
            let matchesDate = true;
            if (filterStartDate) matchesDate = matchesDate && new Date(log.date) >= new Date(filterStartDate);
            if (filterEndDate) matchesDate = matchesDate && new Date(log.date) <= new Date(filterEndDate);

            const isArchived = log.status === 'Concluído';
            const matchesArchive = showArchive ? isArchived : !isArchived;

            return matchesCategory && matchesStatus && matchesDate && matchesArchive;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyLogs, filterCategory, filterStatus, filterStartDate, filterEndDate, showArchive]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pendente': return 'bg-red-100 text-red-700 border-red-200';
            case 'Em Produção': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Pronto': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Concluído': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header Sticky Area */}
            <div className="bg-slate-900 text-white p-6 shadow-2xl relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight uppercase italic">Diário de Obras</h1>
                        <p className="text-emerald-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Gestão de Ocorrências e Retrabalhos</p>
                    </div>

                    <div className="flex bg-slate-800/50 p-1 rounded-xl backdrop-blur-md border border-white/5">
                        <button
                            onClick={() => setActiveTab('diary')}
                            className={`px-6 py-2.5 rounded-lg font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'diary' ? 'bg-emerald-500 text-foreground shadow-sm' : 'text-slate-300 hover:text-white'}`}
                            title="Ver Diário"
                        >
                            <CalendarIcon size={16} /> Diário
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`px-6 py-2.5 rounded-lg font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'bg-emerald-500 text-foreground shadow-sm' : 'text-slate-300 hover:text-white'}`}
                            title="Ver Relatórios"
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
                                        <Plus size={16} /> Acompanhamento Avulso (S/ Projeto)
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
                                            <Plus size={16} /> Registrar Acompanhamento
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

                            {/* Filters Bar */}
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

                            <DiaryTable 
                                filteredLogs={filteredLogs}
                                projects={projects}
                                expandedProjects={expandedProjects}
                                setExpandedProjects={setExpandedProjects}
                                updateDailyLog={updateDailyLog}
                                deleteDailyLog={deleteDailyLog}
                                setViewingLog={setViewingLog}
                                setPrintingLog={setPrintingLog}
                                getStatusColor={getStatusColor}
                            />
                        </section>
                    </div>
                ) : (
                    <DiaryReportView dailyLogs={dailyLogs} projects={projects} />
                )}
            </div>

            {/* Modals */}
            <DiaryFormModal 
                showLogModal={showLogModal}
                setShowLogModal={setShowLogModal}
                selectedProject={selectedProject}
                isManualEntry={isManualEntry}
                projects={projects}
                installers={installers}
                currentUserEmail={currentUserEmail}
                addDailyLog={addDailyLog}
            />

            {/* VIEW MODAL (Read-Only) */}
            {viewingLog && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-border">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-muted/50">
                            <div>
                                <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2" title="Visualização de Ocorrência">
                                    <Eye className="text-indigo-500" /> Detalhes da Ocorrência
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1 font-bold">Modo de Leitura</p>
                            </div>
                            <button title="Fechar Visualização" onClick={() => setViewingLog(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
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
                            <button onClick={() => setViewingLog(null)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-wider text-sm">
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
