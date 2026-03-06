import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { DailyLog, Project, Company } from '../types';
import { Building2, Calendar, ClipboardList, AlertOctagon, User, Loader2 } from 'lucide-react';

interface PublicDailyReportViewProps {
    date: string;
}

const PublicDailyReportView: React.FC<PublicDailyReportViewProps> = ({ date }) => {
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                // Fetch Logs for the specific date
                const { data: logsData, error: logsError } = await supabase
                    .from('daily_logs')
                    .select('*');

                if (logsError) throw logsError;

                // Map and filter by local date
                const mappedLogs = (logsData || []).map(l => ({
                    id: l.id,
                    projectId: l.project_id || l.projectId,
                    workName: l.work_name || l.workName,
                    date: l.date,
                    author: l.author,
                    category: l.category,
                    description: l.description,
                    photoUrl: l.photo_url || l.photoUrl,
                    reworkDetails: l.rework_details || l.reworkDetails,
                    status: l.status,
                    createdAt: l.created_at || l.createdAt,
                } as DailyLog));

                const targetDateFormatted = new Date(date + 'T12:00:00').toLocaleDateString();
                const filteredLogs = mappedLogs.filter(log => new Date(log.date).toLocaleDateString() === targetDateFormatted);
                setLogs(filteredLogs);

                // Fetch Projects
                const { data: projectsData, error: projError } = await supabase.from('projects').select('*');
                if (projError) throw projError;

                const mappedProjects = (projectsData || []).map(p => ({
                    id: p.id,
                    clientId: p.client_id || p.clientId,
                    clientName: p.client_name || p.clientName,
                    workName: p.work_name || p.workName,
                    workAddress: p.work_address || p.workAddress,
                    contractDate: p.contract_date || p.contractDate,
                    promisedDate: p.promised_date || p.promisedDate,
                    currentStatus: p.current_status || p.currentStatus,
                } as Project));
                setProjects(mappedProjects);

                // Fetch Company
                const { data: compData } = await supabase.from('company').select('*').single();
                if (compData) {
                    setCompany({
                        name: compData.name,
                        email: compData.email,
                        phone: compData.phone,
                        cnpj: compData.cnpj,
                        address: compData.address,
                        logoUrl: compData.logo_url || compData.logoUrl,
                    });
                }

            } catch (err: any) {
                console.error('Error fetching report:', err);
                setError(err.message || 'Erro ao carregar relatório.');
            } finally {
                setLoading(false);
            }
        };

        if (date) {
            fetchReportData();
        } else {
            setError('Data não informada na URL.');
            setLoading(false);
        }
    }, [date]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
                <p className="text-slate-500 font-medium">Buscando registros do dia...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
                    <AlertOctagon className="text-red-500 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Ops! Algo deu errado.</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                </div>
            </div>
        );
    }

    const byCategory = logs.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const formatDate = (isoDate: string) => {
        const d = new Date(isoDate + 'T12:00:00'); // Prevent timezone shift
        return d.toLocaleDateString('pt-BR');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pendente': return 'bg-red-100 text-red-700 border-red-200';
            case 'Em Produção': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Pronto': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Concluído': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Registrado': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-200 selection:text-emerald-900 pb-12">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
                            <ClipboardList className="text-white" size={18} />
                        </div>
                        <span className="font-bold text-slate-900 tracking-tight">Fechamento Diário</span>
                    </div>
                    {company?.logoUrl && (
                        <img src={company.logoUrl} alt={company.name} className="h-8 object-contain" />
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

                {/* Print specific header */}
                <div className="hidden print:flex justify-between items-center border-b pb-6 mb-8">
                    {company?.logoUrl ? (
                        <img src={company.logoUrl} alt="Logo" className="h-16 object-contain" />
                    ) : (
                        <h1 className="text-2xl font-black">{company?.name || 'Marcenaria'}</h1>
                    )}
                    <div className="text-right">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Fechamento do Diário</h2>
                        <p className="text-slate-500 font-medium">Data Ref: {formatDate(date)}</p>
                    </div>
                </div>

                {/* Cover / Title */}
                <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group print:shadow-none print:border-none print:p-0">
                    <div className="absolute top-0 right-0 p-8 opacity-5 print:hidden">
                        <ClipboardList size={120} />
                    </div>

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest mb-6">
                            <Calendar size={14} />
                            Relatório de Ocorrências
                        </div>

                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4">
                            Fechamento do Dia
                        </h1>
                        <p className="text-lg text-slate-500 font-medium flex items-center gap-2">
                            Referência: <span className="font-bold text-slate-800">{formatDate(date)}</span>
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Registrado</span>
                        <span className="text-3xl font-black text-slate-800">{logs.length}</span>
                    </div>

                    {Object.entries(byCategory).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 3).map(([cat, count]) => (
                        <div key={cat} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 line-clamp-1" title={cat}>{cat}</span>
                            <span className="text-2xl font-black text-emerald-600">{count}</span>
                        </div>
                    ))}
                </div>

                {/* Detailed Logs */}
                <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Building2 className="text-slate-400" />
                        Detalhamento por Obra
                    </h3>

                    {logs.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 border-dashed">
                            <p className="text-slate-500 font-medium">Nenhum registro encontrado para esta data.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {logs.map(log => {
                                const proj = projects.find(p => p.id === log.projectId);
                                const isWarning = ['Falta de Peça', 'Erro de Projeto', 'Erro de Fabricação'].includes(log.category);

                                return (
                                    <div key={log.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">

                                        {/* Status & Project Header */}
                                        <div className="md:w-1/3 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider ${isWarning ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {isWarning && <AlertOctagon size={12} />}
                                                    {log.category}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 leading-tight">
                                                    {proj?.workName || log.workName || 'Obra Avulsa'}
                                                </h4>
                                                {proj && <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-1">{proj.clientName}</p>}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                <User size={14} className="shrink-0" /> Autor: {log.author || 'Membro da Equipe'}
                                            </div>
                                        </div>

                                        {/* Separator mobile */}
                                        <div className="h-px w-full bg-slate-100 md:hidden" />

                                        {/* Details & Status */}
                                        <div className="md:w-2/3 flex flex-col justify-between gap-4">
                                            {log.reworkDetails && log.reworkDetails.length > 0 ? (
                                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Detalhes da Peça Solicitada</p>
                                                    <ul className="space-y-1 text-sm text-slate-700 font-medium">
                                                        <li><span className="text-slate-400 mr-2">Nome:</span> {log.reworkDetails[0].partName}</li>
                                                        <li><span className="text-slate-400 mr-2">Medidas:</span> {log.reworkDetails[0].width}x{log.reworkDetails[0].height}mm</li>
                                                        {log.reworkDetails[0].thickness && <li><span className="text-slate-400 mr-2">Espessura:</span> {log.reworkDetails[0].thickness}</li>}
                                                        {log.reworkDetails[0].color && <li><span className="text-slate-400 mr-2">Cor/Acabamento:</span> {log.reworkDetails[0].color}</li>}
                                                        <li><span className="text-slate-400 mr-2">Qtd:</span> {log.reworkDetails[0].quantity}</li>
                                                    </ul>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    {log.description || <span className="italic text-slate-400">Sem observações detalhadas.</span>}
                                                </div>
                                            )}

                                            <div className="flex justify-end mt-auto">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(log.status)}`}>
                                                    Status: {log.status}
                                                </span>
                                            </div>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Print Settings & Footer */}
            <footer className="mt-16 py-8 border-t border-slate-200 text-center text-slate-400 text-xs font-medium">
                <div className="max-w-4xl mx-auto px-4">
                    <p className="mb-2">Relatório gerado automaticamente através da plataforma.</p>
                    <p>Powered by <strong className="text-slate-500">Hypado System</strong></p>
                </div>
            </footer>

            {/* Print helper button */}
            <div className="fixed bottom-6 right-6 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-slate-900 hover:bg-emerald-600 text-white shadow-xl shadow-slate-900/20 px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                >
                    <ClipboardList size={18} />
                    Imprimir / PDF
                </button>
            </div>
        </div>
    );
};

export default PublicDailyReportView;
