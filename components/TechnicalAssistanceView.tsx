
import React, { useState, useMemo } from 'react';
import {
    TechnicalAssistance, Client, Project, Installer, AssistanceStatus
} from '../types';
import {
    Wrench, Calendar, Clock, AlertTriangle, CheckCircle2,
    Search, Plus, X, Camera, Save, User, MapPin, ArrowRight,
    Filter, AlertCircle, Phone, FileText, ChevronRight
} from 'lucide-react';

interface Props {
    assistances: TechnicalAssistance[];
    setAssistances: React.Dispatch<React.SetStateAction<TechnicalAssistance[]>>;
    clients: Client[];
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>; // New Prop
    installers: Installer[];
}

const TechnicalAssistanceView: React.FC<Props> = ({
    assistances, setAssistances, clients, projects, setProjects, installers
}) => {
    const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState<TechnicalAssistance>({
        id: '', clientId: '', clientName: '', projectId: '', workName: '',
        requestDate: new Date().toISOString().split('T')[0],
        reportedProblem: '', status: 'Aberto'
    });

    // Derived State
    const filteredAssistances = useMemo(() => {
        return assistances.filter(a =>
            a.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.reportedProblem.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [assistances, searchTerm]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return {
            today: assistances.filter(a => a.scheduledDate === today).length,
            open: assistances.filter(a => a.status === 'Aberto').length,
            pending: assistances.filter(a => a.status === 'Retorno Pendente').length,
            completed: assistances.filter(a => a.status === 'Finalizado').length
        };
    }, [assistances]);

    // Handlers
    const handleOpenModal = (assistance?: TechnicalAssistance) => {
        if (assistance) {
            setEditingId(assistance.id);
            setFormData({ ...assistance });
        } else {
            setEditingId(null);
            setFormData({
                id: `ta-${Date.now()}`,
                clientId: '', clientName: '', projectId: '', workName: '',
                requestDate: new Date().toISOString().split('T')[0],
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
                projectId: '', workName: '' // Reset project when client changes
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

    const handleSubmit = (e: React.FormEvent) => {
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
        if (newStatus === 'Finalizado' && formData.projectId) {
            setProjects(prev => prev.map(p => {
                if (p.id === formData.projectId) {
                    // Update Project to Finalized and Quality Report to Approved
                    const updatedReport = p.qualityReport ? { ...p.qualityReport, status: 'Aprovado' as const } : undefined;
                    return {
                        ...p,
                        currentStatus: 'Finalizada',
                        qualityReport: updatedReport,
                        history: [...p.history, { status: 'Finalizada', timestamp: new Date().toISOString() }]
                    };
                }
                return p;
            }));

            // Check if there are other open tickets to clear the global flag
            // We need to check against the updated list, so we simulate it here
            const otherOpenTickets = assistances.filter(a => a.id !== formData.id && a.status !== 'Finalizado').length;
            if (otherOpenTickets === 0) {
                localStorage.removeItem('chamadoAberto');
            }

            alert('✅ CHAMADO FINALIZADO!\n\nA obra foi automaticamente liberada e o status atualizado para "Finalizada" no modulo de Qualidade.');
        }

        if (editingId) {
            setAssistances(prev => prev.map(a => a.id === editingId ? updatedData : a));
        } else {
            setAssistances(prev => [...prev, updatedData]);
            // Logic for global flag if new ticket is open (already covered in QualityView, but good as backup)
            if (newStatus === 'Aberto') {
                localStorage.setItem('chamadoAberto', 'true');
            }
        }

        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (!editingId) return;
        if (confirm('Excluir este chamado de assistência?')) {
            const pwd = prompt('Digite a senha de administrador:');
            if (pwd !== 'adm123') {
                alert('Senha incorreta!');
                return;
            }
            setAssistances(prev => prev.filter(a => a.id !== editingId));
            setIsModalOpen(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">Assistência Técnica</h3>
                    <p className="text-slate-500 font-bold text-sm uppercase italic">Gestão de Garantias e Manutenção</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode(viewMode === 'dashboard' ? 'list' : 'dashboard')} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors">
                        {viewMode === 'dashboard' ? 'Ver Lista Completa' : 'Ver Dashboard'}
                    </button>
                    <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-500 hover:text-slate-900 transition-all shadow-lg active:scale-95 text-xs">
                        <Plus size={16} /> Nova Solicitação
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Calendar size={24} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hoje</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{stats.today}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Visitas Agendadas</p>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><AlertCircle size={24} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Abertas</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{stats.open}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Aguardando Agenda</p>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Wrench size={24} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retorno</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{stats.pending}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Pendências Técnicas</p>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 size={24} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{stats.completed}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Finalizadas</p>
                </div>
            </div>

            {viewMode === 'dashboard' && (
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8">
                    <h4 className="text-lg font-black text-slate-800 uppercase italic tracking-tight mb-6 flex items-center gap-2">
                        <Calendar className="text-amber-500" size={24} /> Agenda do Dia
                    </h4>
                    {assistances.filter(a => a.scheduledDate === new Date().toISOString().split('T')[0]).length === 0 ? (
                        <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                            <p className="text-slate-400 font-bold uppercase tracking-wider text-sm">Nenhuma visita agendada para hoje.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {assistances.filter(a => a.scheduledDate === new Date().toISOString().split('T')[0]).map(item => (
                                <div key={item.id} onClick={() => handleOpenModal(item)} className="p-6 bg-slate-50 hover:bg-amber-50 border border-transparent hover:border-amber-200 rounded-[24px] cursor-pointer transition-all group">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-xl shadow-sm text-slate-700 font-black text-lg">
                                                {item.scheduledTime || '--:--'}
                                            </div>
                                            <div>
                                                <h5 className="font-black text-slate-800 uppercase italic">{item.clientName}</h5>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.workName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
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
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por cliente, obra ou problema..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl outline-none font-bold text-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {filteredAssistances.map(item => (
                            <div key={item.id} onClick={() => handleOpenModal(item)} className="p-6 hover:bg-slate-50 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-2xl ${item.status === 'Finalizado' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                        <Wrench size={24} />
                                    </div>
                                    <div>
                                        <h5 className="font-black text-slate-800 uppercase italic text-sm">{item.clientName}</h5>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{item.workName}</p>
                                        <p className="text-xs text-slate-600 line-clamp-1">{item.reportedProblem}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden md:block">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitado em</p>
                                        <p className="font-bold text-slate-700 text-xs">{new Date(item.requestDate).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'Finalizado' ? 'bg-emerald-100 text-emerald-700' :
                                        item.status === 'Retorno Pendente' ? 'bg-red-100 text-red-700' :
                                            item.status === 'Agendado' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {item.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[40px] shadow-2xl animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                            <div>
                                <h4 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">
                                    {editingId ? 'Editar Assistência' : 'Nova Solicitação'}
                                </h4>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    ID: {formData.id}
                                </p>
                            </div>
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
                                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                                            value={formData.clientId}
                                            onChange={handleClientChange}
                                            required
                                        >
                                            <option value="">Selecione o Cliente</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Projeto (RefData)</label>
                                        <select
                                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
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
                                            <input type="date" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none" value={formData.requestDate} onChange={e => setFormData({ ...formData, requestDate: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Agendamento</label>
                                            <input type="date" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:bg-amber-50 transition-colors" value={formData.scheduledDate || ''} onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })} />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Horário</label>
                                            <input type="time" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none" value={formData.scheduledTime || ''} onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })} />
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
                                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none h-32 resize-none"
                                            placeholder="Descreva o problema relatado pelo cliente..."
                                            value={formData.reportedProblem}
                                            onChange={e => setFormData({ ...formData, reportedProblem: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button type="button" className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                            <Camera size={16} /> {formData.photoUrl ? 'Foto Anexada' : 'Adicionar Foto'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-slate-200 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Visita Técnica */}
                                <div className="space-y-4">
                                    <h5 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <Wrench size={18} /> Relatório Técnico
                                    </h5>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Técnico Responsável</label>
                                            <select
                                                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none"
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
                                                className="w-full p-3 bg-slate-50 rounded-xl font-medium text-sm outline-none h-20 resize-none"
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
                                            <input type="date" className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none" value={formData.returnDate || ''} onChange={e => setFormData({ ...formData, returnDate: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Obs. Final (Encerra Chamado)</label>
                                            <textarea
                                                className="w-full p-3 bg-white rounded-xl font-medium text-sm outline-none h-32 resize-none"
                                                placeholder="Conclusão final para encerramento..."
                                                value={formData.finalObservations || ''}
                                                onChange={e => setFormData({ ...formData, finalObservations: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 space-y-4">
                                <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-amber-500 hover:text-slate-900 transition-all shadow-xl active:scale-[0.98]">
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
            )}

            {/* Import fake ChevronRight to avoid build error if not imported */}
            {false && <ChevronRight />}
        </div>
    );
};

export default TechnicalAssistanceView;
