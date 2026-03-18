
import React, { useState, useMemo } from 'react';
import {
    TechnicalAssistance, Client, Project, Installer, AssistanceStatus
} from '../types';
import {
    Wrench, Calendar, Clock, AlertTriangle, CheckCircle2,
    Search, Plus, X, Camera, Save, User, MapPin, ArrowRight,
    Filter, AlertCircle, Phone, FileText, ChevronRight, Link, Printer
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface Props {
    assistances: TechnicalAssistance[];
    addAssistance: (assistance: TechnicalAssistance) => Promise<void>;
    updateAssistance: (assistance: TechnicalAssistance) => Promise<void>;
    deleteAssistance: (id: string) => Promise<void>;
    clients: Client[];
    projects: Project[];
    setProjects: any; // Kept for compatibility but we use context
    installers: Installer[];
}

const TechnicalAssistanceView: React.FC<Props> = ({
    assistances, addAssistance, updateAssistance, deleteAssistance, clients, projects, setProjects, installers
}) => {
    const { updateProject } = useData();
    const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'active' | 'scheduled' | 'open' | 'pending' | 'finalizados'>('active');
    const [printingAssistance, setPrintingAssistance] = useState<TechnicalAssistance | null>(null);

    // Form State
    const [formData, setFormData] = useState<TechnicalAssistance>({
        id: '', clientId: '', clientName: '', projectId: '', workName: '',
        requestDate: new Date().toISOString().split('T')[0],
        reportedProblem: '', status: 'Aberto'
    });

    // Derived State
    const filteredAssistances = useMemo(() => {
        return assistances.filter(a => {
            const matchesSearch = (a.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.workName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.reportedProblem || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            // Default: hide Finalizados — show only active tickets
            if (activeFilter === 'active') return a.status !== 'Finalizado';
            if (activeFilter === 'scheduled') return a.status === 'Agendado';
            if (activeFilter === 'open') return a.status === 'Aberto';
            if (activeFilter === 'pending') return a.status === 'Retorno Pendente';
            if (activeFilter === 'finalizados') return a.status === 'Finalizado';

            return true;
        });
    }, [assistances, searchTerm, activeFilter]);

    const stats = useMemo(() => {
        return {
            scheduled: assistances.filter(a => a.status === 'Agendado').length,
            open: assistances.filter(a => a.status === 'Aberto').length,
            pending: assistances.filter(a => a.status === 'Retorno Pendente').length,
            finalizados: assistances.filter(a => a.status === 'Finalizado').length,
            active: assistances.filter(a => a.status !== 'Finalizado').length,
            total: assistances.length
        };
    }, [assistances]);

    // Handlers
    const handleFilterClick = (filter: 'active' | 'scheduled' | 'open' | 'pending' | 'finalizados') => {
        setActiveFilter(filter);
        setViewMode('list');
    };

    const handleOpenModal = (assistance?: TechnicalAssistance) => {
        if (assistance) {
            setEditingId(assistance.id);
            setFormData({ ...assistance });
        } else {
            setEditingId(null);
            const todayObj = new Date();
            const year = todayObj.getFullYear();
            const month = String(todayObj.getMonth() + 1).padStart(2, '0');
            const day = String(todayObj.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;

            setFormData({
                id: `ta-${Date.now()}`,
                clientId: '', clientName: '', projectId: '', workName: '',
                requestDate: today,
                reportedProblem: '', status: 'Aberto'
            });
        }
        setIsModalOpen(true);
    };

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const client = clients.find(c => c.id === e.target.value);
        if (client) {
            setFormData(prev => ({
                ...prev,
                clientId: client.id,
                clientName: client.name,
                projectId: prev.projectId === 'manual' ? 'manual' : '',
                workName: prev.projectId === 'manual' ? prev.workName : ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                clientId: '',
                clientName: '',
                projectId: prev.projectId === 'manual' ? 'manual' : '',
                workName: prev.projectId === 'manual' ? prev.workName : ''
            }));
        }
    };

    const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const project = projects.find(p => p.id === e.target.value);
        if (project) {
            setFormData(prev => ({
                ...prev,
                projectId: project.id,
                workName: project.workName
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Apply Business Rules for Status
        let newStatus: AssistanceStatus = formData.status;

        if (formData.finalObservations) {
            newStatus = 'Finalizado';
        } else if (formData.pendingIssues) {
            newStatus = 'Retorno Pendente';
        } else if (formData.scheduledDate) {
            newStatus = 'Agendado';
        }

        const updatedData = { ...formData, status: newStatus };

        // AUTOMATION: If Finalized, update Project Status
        if (newStatus === 'Finalizado' && formData.projectId && formData.projectId !== 'manual') {
            const p = projects.find(p => p.id === formData.projectId);
            if (p) {
                // Update Project to Finalized and Quality Report to Approved
                const updatedReport = p.qualityReport ? { ...p.qualityReport, status: 'Aprovado' as const } : undefined;
                updateProject({
                    ...p,
                    currentStatus: 'Finalizada',
                    qualityReport: updatedReport,
                    history: [...p.history, { status: 'Finalizada', timestamp: new Date().toISOString() }]
                } as Project);
            }

            // Check if there are other open tickets to clear the global flag
            // We need to check against the updated list, so we simulate it here
            const otherOpenTickets = assistances.filter(a => a.id !== formData.id && a.status !== 'Finalizado').length;
            if (otherOpenTickets === 0) {
                localStorage.removeItem('chamadoAberto');
            }

            alert('✅ CHAMADO FINALIZADO!\n\nA obra foi automaticamente liberada e o status atualizado para "Finalizada" no modulo de Qualidade.');
        }

        if (editingId) {
            await updateAssistance(updatedData);
        } else {
            await addAssistance(updatedData);
            // Logic for global flag if new ticket is open (already covered in QualityView, but good as backup)
            if (newStatus === 'Aberto') {
                localStorage.setItem('chamadoAberto', 'true');
            }
        }

        setIsModalOpen(false);
    };

    const handleDelete = async () => {
        if (!editingId) return;
        if (confirm('Excluir este chamado de assistência?')) {
            const pwd = prompt('Digite a senha de administrador:');
            if (pwd !== 'adm123') {
                alert('Senha incorreta!');
                return;
            }
            await deleteAssistance(editingId);
            setIsModalOpen(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-black text-foreground uppercase italic tracking-tight">Assistência Técnica</h3>
                    <p className="text-muted-foreground font-bold text-sm uppercase italic">Gestão de Garantias e Manutenção</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode(viewMode === 'dashboard' ? 'list' : 'dashboard')} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors">
                        {viewMode === 'dashboard' ? 'Ver Lista Completa' : 'Ver Dashboard'}
                    </button>
                    <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-500 hover:text-foreground transition-all shadow-lg active:scale-95 text-xs">
                        <Plus size={16} /> Nova Solicitação
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                    onClick={() => handleFilterClick('open')}
                    className={`relative overflow-hidden bg-card p-6 rounded-[24px] border shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group ${activeFilter === 'open' ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50' : 'border-slate-100 hover:border-amber-200'}`}
                >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-amber-500" />
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl"><AlertCircle size={22} /></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-muted px-2 py-0.5 rounded-full">Em Aberto</span>
                    </div>
                    <p className="text-4xl font-black text-foreground tracking-tighter">{stats.open}</p>
                    <p className="text-xs font-bold text-amber-500 uppercase tracking-wide mt-1">Aguardando Agenda</p>
                </div>

                <div
                    onClick={() => handleFilterClick('scheduled')}
                    className={`relative overflow-hidden bg-card p-6 rounded-[24px] border shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group ${activeFilter === 'scheduled' ? 'border-blue-400 ring-2 ring-blue-400/20 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
                >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-blue-500" />
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Calendar size={22} /></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-muted px-2 py-0.5 rounded-full">Agendados</span>
                    </div>
                    <p className="text-4xl font-black text-foreground tracking-tighter">{stats.scheduled}</p>
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mt-1">Visitas Marcadas</p>
                </div>

                <div
                    onClick={() => handleFilterClick('pending')}
                    className={`relative overflow-hidden bg-card p-6 rounded-[24px] border shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group ${activeFilter === 'pending' ? 'border-red-400 ring-2 ring-red-400/20 bg-red-50' : 'border-slate-100 hover:border-red-200'}`}
                >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-red-500" />
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-2xl"><Wrench size={22} /></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-muted px-2 py-0.5 rounded-full">Retorno</span>
                    </div>
                    <p className="text-4xl font-black text-foreground tracking-tighter">{stats.pending}</p>
                    <p className="text-xs font-bold text-red-500 uppercase tracking-wide mt-1">Pendências Técnicas</p>
                </div>

                <div
                    onClick={() => handleFilterClick('finalizados')}
                    className={`relative overflow-hidden bg-card p-6 rounded-[24px] border shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group ${activeFilter === 'finalizados' ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}
                >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-emerald-500" />
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><CheckCircle2 size={22} /></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-muted px-2 py-0.5 rounded-full">Finalizados</span>
                    </div>
                    <p className="text-4xl font-black text-foreground tracking-tighter">{stats.finalizados}</p>
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-wide mt-1">Chamados Encerrados</p>
                </div>
            </div>

            {viewMode === 'dashboard' && (
                <div className="bg-card rounded-[32px] border border-border shadow-sm p-8">
                    <h4 className="text-lg font-black text-foreground uppercase italic tracking-tight mb-6 flex items-center gap-2">
                        <Calendar className="text-amber-500" size={24} /> Agenda do Dia
                    </h4>
                    {assistances.filter(a => {
                        const todayObj = new Date();
                        const year = todayObj.getFullYear();
                        const month = String(todayObj.getMonth() + 1).padStart(2, '0');
                        const day = String(todayObj.getDate()).padStart(2, '0');
                        const today = `${year}-${month}-${day}`;
                        return a.scheduledDate === today;
                    }).length === 0 ? (
                        <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                            <p className="text-slate-400 font-bold uppercase tracking-wider text-sm">Nenhuma visita agendada para hoje.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {assistances.filter(a => {
                                const todayObj = new Date();
                                const year = todayObj.getFullYear();
                                const month = String(todayObj.getMonth() + 1).padStart(2, '0');
                                const day = String(todayObj.getDate()).padStart(2, '0');
                                const today = `${year}-${month}-${day}`;
                                return a.scheduledDate === today;
                            }).map(item => (
                                <div key={item.id} onClick={() => handleOpenModal(item)} className="p-6 bg-muted/50 hover:bg-amber-50 border border-transparent hover:border-amber-200 rounded-[24px] cursor-pointer transition-all group">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-card rounded-xl shadow-sm text-foreground font-black text-lg">
                                                {item.scheduledTime || '--:--'}
                                            </div>
                                            <div>
                                                <h5 className="font-black text-foreground uppercase italic">{item.clientName}</h5>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{item.workName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const url = `${window.location.origin}${window.location.pathname}?mode=assistance-report&id=${item.id}`;
                                                    navigator.clipboard.writeText(url);
                                                    alert('✅ Link copiado para a área de transferência!\n\nVocê agora pode enviar este link para o cliente acompanhar o status.');
                                                }}
                                                className="p-2 bg-card text-slate-400 hover:text-blue-500 rounded-lg shadow-sm border border-slate-100 transition-all active:scale-95"
                                                title="Gerar Link para Cliente"
                                            >
                                                <Link size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPrintingAssistance(item);
                                                    setTimeout(() => {
                                                        window.print();
                                                        // Keep it for a bit longer to ensure print dialog captures it
                                                        setTimeout(() => setPrintingAssistance(null), 500);
                                                    }, 500);
                                                }}
                                                className="p-2 bg-card text-slate-400 hover:text-amber-500 rounded-lg shadow-sm border border-slate-100 transition-all active:scale-95"
                                                title="Imprimir Relatório"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'Finalizado' ? 'bg-emerald-100 text-emerald-700' :
                                                item.status === 'Retorno Pendente' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                {item.status}
                                            </span>
                                            <ChevronRight className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'list' && (
                <div className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden">
                    {/* Search + Filter Pills */}
                    <div className="p-6 border-b border-slate-100 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por cliente, obra ou problema..."
                                className="w-full pl-12 pr-4 py-3 bg-muted/50 rounded-2xl outline-none font-bold text-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* Status Filter Pills */}
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { id: 'active', label: '⚡ Em Aberto', color: 'bg-slate-900 text-white', inactive: 'bg-muted text-muted-foreground hover:bg-slate-200' },
                                { id: 'open', label: '🟡 Aberto', color: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                                { id: 'scheduled', label: '📅 Agendado', color: 'bg-blue-500 text-white', inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                                { id: 'pending', label: '🔴 Retorno', color: 'bg-red-500 text-white', inactive: 'bg-red-50 text-red-700 hover:bg-red-100' },
                                { id: 'finalizados', label: '✅ Finalizados', color: 'bg-emerald-600 text-white', inactive: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFilter(f.id as any)}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                        activeFilter === f.id ? f.color : f.inactive
                                    }`}
                                >
                                    {f.label}
                                    <span className="ml-1.5 opacity-70">
                                        {f.id === 'active' ? stats.active :
                                         f.id === 'open' ? stats.open :
                                         f.id === 'scheduled' ? stats.scheduled :
                                         f.id === 'pending' ? stats.pending :
                                         stats.finalizados}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <div className="divide-y divide-slate-50">
                        {filteredAssistances.length === 0 && (
                            <div className="py-16 text-center">
                                <CheckCircle2 size={40} className="text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-black uppercase italic text-sm tracking-widest">Nenhum chamado encontrado</p>
                            </div>
                        )}
                        {filteredAssistances.map(item => {
                            const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
                                'Aberto':           { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
                                'Agendado':         { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
                                'Retorno Pendente': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400' },
                                'Finalizado':       { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
                            };
                            const sc = statusConfig[item.status] || { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-slate-300' };

                            return (
                                <div key={item.id} onClick={() => handleOpenModal(item)}
                                    className="p-5 hover:bg-muted/30 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl shrink-0 ${item.status === 'Finalizado' ? 'bg-emerald-100 text-emerald-600' : item.status === 'Retorno Pendente' ? 'bg-red-100 text-red-500' : item.status === 'Agendado' ? 'bg-blue-100 text-blue-500' : 'bg-amber-100 text-amber-500'}`}>
                                            <Wrench size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h5 className="font-black text-foreground uppercase italic text-sm truncate">{item.clientName}</h5>
                                                <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${sc.bg} ${sc.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                    {item.status}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.workName}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{item.reportedProblem}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-auto">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); const url = `${window.location.origin}${window.location.pathname}?mode=assistance-report&id=${item.id}`; navigator.clipboard.writeText(url); alert('✅ Link copiado!'); }}
                                            className="p-2 bg-muted/50 text-slate-400 hover:text-blue-500 rounded-xl border border-slate-100 transition-all active:scale-95"
                                            title="Copiar Link para Cliente"
                                        >
                                            <Link size={15} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPrintingAssistance(item); setTimeout(() => { window.print(); setTimeout(() => setPrintingAssistance(null), 500); }, 500); }}
                                            className="p-2 bg-muted/50 text-slate-400 hover:text-amber-500 rounded-xl border border-slate-100 transition-all active:scale-95"
                                            title="Imprimir"
                                        >
                                            <Printer size={15} />
                                        </button>
                                        <div className="text-right hidden md:block">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Solicitado</p>
                                            <p className="font-bold text-foreground text-xs">{new Date(item.requestDate).toLocaleDateString()}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[40px] shadow-2xl animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-muted/50 sticky top-0 z-10">
                            <div>
                                <h4 className="text-xl font-black text-foreground uppercase italic tracking-tight">
                                    {editingId ? 'Editar Assistência' : 'Nova Solicitação'}
                                </h4>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    ID: {formData.id}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const assistance = assistances.find(a => a.id === editingId);
                                        if (assistance) {
                                            setPrintingAssistance(assistance);
                                            setTimeout(() => {
                                                window.print();
                                                setPrintingAssistance(null);
                                            }, 300);
                                        }
                                    }}
                                    className="p-2.5 bg-muted text-muted-foreground rounded-full hover:bg-slate-200 transition-colors"
                                    title="Imprimir Relatório"
                                >
                                    <Printer size={20} />
                                </button>
                            )}
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8">
                            {/* Identificação */}
                            <div className="space-y-4">
                                <h5 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <User size={18} /> Identificação
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                                        <select
                                            className="w-full p-4 bg-muted/50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                                            value={formData.clientId}
                                            onChange={handleClientChange}
                                            required
                                        >
                                            <option value="">Selecione o Cliente</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center ml-1 mb-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projeto (RefData)</label>
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.projectId === 'manual'}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setFormData(prev => ({ ...prev, projectId: 'manual', workName: '' }));
                                                        } else {
                                                            setFormData(prev => ({ ...prev, projectId: '', workName: '' }));
                                                        }
                                                    }}
                                                    className="w-3 h-3 text-amber-500 rounded outline-none"
                                                />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informar Manualmente</span>
                                            </label>
                                        </div>
                                        {formData.projectId === 'manual' ? (
                                            <input
                                                type="text"
                                                className="w-full p-4 bg-muted/50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                                                placeholder="Digite o nome da obra..."
                                                value={formData.workName}
                                                onChange={e => setFormData({ ...formData, workName: e.target.value })}
                                                required
                                            />
                                        ) : (
                                            <select
                                                className="w-full p-4 bg-muted/50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                                                value={formData.projectId}
                                                onChange={handleProjectChange}
                                                required
                                                disabled={!formData.clientId}
                                            >
                                                <option value="">Selecione o Projeto</option>
                                                {projects.filter(p => p.clientId === formData.clientId).map(p => (
                                                    <option key={p.id} value={p.id}>{p.workName}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Cronograma & Diagnóstico */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h5 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={18} /> Cronograma
                                    </h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Solicitação</label>
                                            <input type="date" className="w-full p-3 bg-muted/50 rounded-xl font-bold text-sm outline-none" value={formData.requestDate} onChange={e => setFormData({ ...formData, requestDate: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Agendamento</label>
                                            <input type="date" className="w-full p-3 bg-muted/50 rounded-xl font-bold text-sm outline-none focus:bg-amber-50 transition-colors" value={formData.scheduledDate || ''} onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })} />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Horário</label>
                                            <input type="time" className="w-full p-3 bg-muted/50 rounded-xl font-bold text-sm outline-none" value={formData.scheduledTime || ''} onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h5 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                        <AlertTriangle size={18} /> Diagnóstico
                                    </h5>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Problema Relatado</label>
                                        <textarea
                                            className="w-full p-4 bg-muted/50 rounded-2xl font-bold text-sm outline-none h-32 resize-none"
                                            placeholder="Descreva o problema relatado pelo cliente..."
                                            value={formData.reportedProblem}
                                            onChange={e => setFormData({ ...formData, reportedProblem: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-4 mt-2">
                                        <label className="flex-1 relative cursor-pointer py-3 bg-muted rounded-xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                            <Camera size={16} /> {formData.photoUrl ? 'Foto Anexada (Alterar)' : 'Adicionar Foto'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setFormData({ ...formData, photoUrl: reader.result as string });
                                                        };
                                                        reader.readAsDataURL(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                        </label>

                                        <div className="flex gap-2 relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                <Link size={16} />
                                            </div>
                                            <input
                                                type="url"
                                                className="w-full pl-10 pr-4 py-3 bg-muted/50 border-2 border-transparent focus:border-amber-500 rounded-xl font-medium text-xs outline-none transition-colors placeholder-slate-400"
                                                placeholder="Link de Vídeo ou Pasta (OneDrive, Drive, etc...)"
                                                value={formData.videoUrl || ''}
                                                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-border pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Visita Técnica */}
                                <div className="space-y-4">
                                    <h5 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Wrench size={18} /> Relatório Técnico
                                    </h5>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Responsável pela Obra Original</label>
                                            <select
                                                className="w-full p-3 bg-muted/50 rounded-xl font-bold text-sm outline-none"
                                                value={formData.originalInstallerId || ''}
                                                onChange={e => setFormData({ ...formData, originalInstallerId: e.target.value })}
                                            >
                                                <option value="">Não identificado / Selecione...</option>
                                                {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center ml-1 mb-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Técnico que Executou a Assistência</label>
                                                {formData.technicianId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const tech = installers.find(i => i.id === formData.technicianId);
                                                            if (!tech || !tech.phone) {
                                                                alert('Telefone do técnico não cadastrado.');
                                                                return;
                                                            }
                                                            const phone = tech.phone.replace(/\D/g, '');

                                                            let msg = `*ðŸ› ï¸ NOVO CHAMADO: ASSISTÊNCIA TÉCNICA*\n\n`;
                                                            msg += `*Cliente:* ${formData.clientName}\n`;
                                                            msg += `*Obra:* ${formData.workName}\n`;

                                                            const address = clients.find(c => c.id === formData.clientId)?.address || '';
                                                            if (address) {
                                                                msg += `*Endereço:* ${address}\n`;
                                                            }

                                                            msg += `\n*Agendamento:* ${formData.scheduledDate ? new Date(formData.scheduledDate).toLocaleDateString() : 'A combinar'}`;
                                                            if (formData.scheduledTime) msg += ` Ã s ${formData.scheduledTime}`;
                                                            msg += `\n\n*📋 Problema Relatado:*\n${formData.reportedProblem}\n`;

                                                            if (formData.photoUrl) {
                                                                msg += `\n*📸 Foto Anexada:* ${formData.photoUrl}\n`;
                                                            }
                                                            if (formData.videoUrl) {
                                                                msg += `\n*🔗 Link Mídia/Vídeo:* ${formData.videoUrl}\n`;
                                                            }

                                                            msg += `\n*Por favor, acesse o sistema para reportar a conclusão.*`;

                                                            window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                        }}
                                                        className="text-[10px] font-black uppercase tracking-widest text-[#25D366] hover:text-[#128C7E] flex items-center gap-1 transition-colors bg-emerald-50 px-2 py-1 rounded-md"
                                                    >
                                                        <Phone size={12} /> Enviar Resumo
                                                    </button>
                                                )}
                                            </div>
                                            <select
                                                className="w-full p-3 bg-muted/50 rounded-xl font-bold text-sm outline-none"
                                                value={formData.technicianId || ''}
                                                onChange={e => setFormData({ ...formData, technicianId: e.target.value })}
                                            >
                                                <option value="">Selecione...</option>
                                                {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Resultado da Visita</label>
                                            <textarea
                                                className="w-full p-3 bg-muted/50 rounded-xl font-medium text-sm outline-none h-20 resize-none"
                                                placeholder="O que foi feito na visita?"
                                                value={formData.visitResult || ''}
                                                onChange={e => setFormData({ ...formData, visitResult: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Pendências (Gera Retorno)</label>
                                            <textarea
                                                className="w-full p-3 bg-red-50 rounded-xl font-medium text-sm outline-none h-20 resize-none border border-transparent focus:border-red-200 text-red-700 placeholder-red-300"
                                                placeholder="Ficou algo pendente?"
                                                value={formData.pendingIssues || ''}
                                                onChange={e => setFormData({ ...formData, pendingIssues: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pós-Visita / Fechamento */}
                                <div className="space-y-4">
                                    <h5 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle2 size={18} /> Fechamento
                                    </h5>
                                    <div className="space-y-3 bg-emerald-50/50 p-6 rounded-[24px] border border-emerald-100">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Retorno Agendado Para</label>
                                            <input type="date" className="w-full p-3 bg-card rounded-xl font-bold text-sm outline-none" value={formData.returnDate || ''} onChange={e => setFormData({ ...formData, returnDate: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Obs. Final (Encerra Chamado)</label>
                                            <textarea
                                                className="w-full p-3 bg-card rounded-xl font-medium text-sm outline-none h-32 resize-none"
                                                placeholder="Conclusão final para encerramento..."
                                                value={formData.finalObservations || ''}
                                                onChange={e => setFormData({ ...formData, finalObservations: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 space-y-4">
                                <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-amber-500 hover:text-foreground transition-all shadow-xl active:scale-[0.98]">
                                    Salvar Solicitação
                                </button>
                                {editingId && (
                                    <button type="button" onClick={handleDelete} className="w-full py-4 border-2 border-red-100 text-red-500 font-bold uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all">
                                        Excluir Chamado
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )
            }

            {/* PRINTABLE COMPONENT */}
            {
                printingAssistance && (
                    <div id="printable-assistance-report" className="hidden print:block fixed inset-0 z-[9999] bg-card">
                        <div className="print-header">
                            <div>
                                <div className="print-logo-box">
                                    <Wrench size={40} />
                                </div>
                                <h1 className="text-3xl font-black">Hypado System</h1>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Gestão de Assistência e Garantia</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-4xl font-black text-foreground italic uppercase">Relatório de Assistência</h2>
                                <p className="text-sm font-bold text-muted-foreground mt-2">ID: {printingAssistance.id}</p>
                                <div className="print-status-tag">{printingAssistance.status}</div>
                            </div>
                        </div>

                        <div className="print-info-grid">
                            <div className="print-info-item">
                                <span className="print-info-label">Cliente</span>
                                <span className="print-info-value">{printingAssistance.clientName}</span>
                            </div>
                            <div className="print-info-item">
                                <span className="print-info-label">Obra</span>
                                <span className="print-info-value">{printingAssistance.workName}</span>
                            </div>
                            <div className="print-info-item">
                                <span className="print-info-label">Solicitação</span>
                                <span className="print-info-value">{new Date(printingAssistance.requestDate).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="print-info-grid">
                            <div className="print-info-item">
                                <span className="print-info-label">Agendamento</span>
                                <span className="print-info-value">{printingAssistance.scheduledDate ? new Date(printingAssistance.scheduledDate).toLocaleDateString() : 'Não agendado'}</span>
                            </div>
                            <div className="print-info-item">
                                <span className="print-info-label">Horário</span>
                                <span className="print-info-value">{printingAssistance.scheduledTime || '--:--'}</span>
                            </div>
                            <div className="print-info-item">
                                <span className="print-info-label">Técnico Resp.</span>
                                <span className="print-info-value">{installers.find(i => i.id === printingAssistance.technicianId)?.name || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="print-divider" />

                        <div className="print-section">
                            <h3 className="print-section-title">Problema Relatado</h3>
                            <div className="print-description-box">
                                <p className="print-description-text">{printingAssistance.reportedProblem}</p>
                            </div>
                        </div>

                        {printingAssistance.visitResult && (
                            <div className="print-section">
                                <h3 className="print-section-title">Relatório da Visita</h3>
                                <div className="print-description-box" style={{ borderLeftColor: '#10b981' }}>
                                    <p className="print-description-text">{printingAssistance.visitResult}</p>
                                </div>
                            </div>
                        )}

                        {printingAssistance.pendingIssues && (
                            <div className="print-section">
                                <h3 className="print-section-title" style={{ color: '#ef4444' }}>Pendências / Retorno</h3>
                                <div className="print-description-box" style={{ borderLeftColor: '#ef4444', backgroundColor: '#fef2f2' }}>
                                    <p className="print-description-text">{printingAssistance.pendingIssues}</p>
                                    {printingAssistance.returnDate && (
                                        <p className="mt-4 text-xs font-black uppercase text-red-600">Retorno Previsto: {new Date(printingAssistance.returnDate).toLocaleDateString()}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {printingAssistance.finalObservations && (
                            <div className="print-section">
                                <h3 className="print-section-title">Observações Finais</h3>
                                <div className="p-6 border-2 border-slate-100 rounded-2xl italic text-sm text-muted-foreground">
                                    {printingAssistance.finalObservations}
                                </div>
                            </div>
                        )}

                        {printingAssistance.photoUrl && (
                            <div className="print-section">
                                <h3 className="print-section-title">Evidência Fotográfica</h3>
                                <div className="print-photo-container">
                                    <img src={printingAssistance.photoUrl} alt="Evidência" />
                                </div>
                            </div>
                        )}

                        <div className="print-footer">
                            Relatório gerado via Hypado System em {new Date().toLocaleString()} • Documento Oficial de Garantia
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default TechnicalAssistanceView;
