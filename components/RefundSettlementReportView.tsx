
import React, { useEffect, useMemo, useState } from 'react';
import { RefundRequest, Installer, Project } from '../types';
import {
    Receipt,
    Calendar,
    User,
    DollarSign,
    FileText,
    Printer,
    ExternalLink,
    ArrowLeft,
    ShieldCheck,
    Briefcase,
    X,
    Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props {
    settlementId: string;
    requests?: RefundRequest[];
    installers?: Installer[];
    onBack?: () => void;
}

const RefundSettlementReportView: React.FC<Props> = ({ settlementId, requests = [], installers = [], onBack }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [fetchedRequests, setFetchedRequests] = useState<RefundRequest[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch requests specific to this settlement
                const { data: reqData, error: reqError } = await supabase
                    .from('refund_requests')
                    .select('*')
                    .eq('settlement_id', settlementId);

                if (reqError) throw reqError;

                const mappedReqs: RefundRequest[] = (reqData || []).map(r => ({
                    id: r.id,
                    collaboratorName: r.collaborator_name,
                    date: r.date,
                    establishment: r.establishment,
                    description: r.description,
                    category: r.category,
                    amount: parseFloat(r.amount),
                    cnpj: r.cnpj,
                    status: r.status as any,
                    projectId: r.project_id,
                    receiptUrl: r.receipt_url,
                    settlementId: r.settlement_id,
                    createdAt: r.created_at
                }));

                setFetchedRequests(mappedReqs);

                // Fetch projects
                const { data: projData, error: projError } = await supabase.from('projects').select('*');
                if (projError) throw projError;

                const mappedProj: Project[] = (projData || []).map(p => ({
                    id: p.id,
                    clientId: p.client_id || p.clientId,
                    clientName: p.client_name || p.clientName,
                    workName: p.work_name || p.workName,
                    workAddress: p.work_address || p.workAddress,
                    contractDate: p.contract_date || p.contractDate,
                    promisedDate: p.promised_date || p.promisedDate,
                    currentStatus: p.current_status || p.currentStatus,
                } as Project));

                setProjects(mappedProj);
            } catch (err) {
                console.error('Error fetching settlement report data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (settlementId) {
            loadData();
        }
    }, [settlementId]);

    // Use passed requests if available and matching, otherwise use fetched
    const settlementRequests = useMemo(() => {
        if (requests.length > 0) {
            const filtered = requests.filter(r => r.settlementId === settlementId);
            if (filtered.length > 0) return filtered;
        }
        return fetchedRequests;
    }, [requests, settlementId, fetchedRequests]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-950">
                <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando Liquidação...</p>
            </div>
        );
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(value);
    };

    const stats = useMemo(() => {
        const grouped: Record<string, number> = {};
        let total = 0;
        settlementRequests.forEach(r => {
            grouped[r.collaboratorName] = (grouped[r.collaboratorName] || 0) + r.amount;
            total += r.amount;
        });
        return { grouped, total };
    }, [settlementRequests]);

    if (settlementRequests.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-950">
                <Receipt size={64} className="mb-4 opacity-20" />
                <h1 className="text-xl font-black uppercase italic">Liquidação não encontrada</h1>
                <p className="text-sm">O ID {settlementId} não possui lançamentos vinculados.</p>
                {onBack && (
                    <button onClick={onBack} className="mt-8 px-6 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all">
                        Voltar ao Sistema
                    </button>
                )}
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-10 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
            <div className="max-w-5xl mx-auto space-y-10">

                {/* Header - Non-Printable */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
                                    Espelho de Liquidação
                                </h1>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest italic flex items-center gap-2">
                                    ID: <span className="text-slate-300 font-black">{settlementId}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={handlePrint}
                            className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Printer size={16} /> Imprimir Relatório
                        </button>
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-colors"
                                title="Voltar"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Report Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">

                    {/* Left Column: Summary and items */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Summary Card */}
                        <div className="glass-premium p-8 bento-card relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                <DollarSign size={160} />
                            </div>

                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-6 flex items-center gap-2">
                                <DollarSign size={14} /> Resumo Consolidado
                            </h3>

                            <div className="space-y-4">
                                {Object.entries(stats.grouped).map(([name, amount]) => (
                                    <div key={name} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800 group/item hover:border-emerald-500/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 group-hover/item:bg-emerald-500/10 group-hover/item:text-emerald-400 transition-colors">
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold tracking-tight text-slate-200">{name}</span>
                                        </div>
                                        <span className="font-black text-emerald-400">
                                            {formatCurrency(amount as number)}
                                        </span>
                                    </div>
                                ))}

                                <div className="pt-6 border-t border-slate-800 flex justify-between items-center px-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Valor Total Liquidado</span>
                                    <span className="text-4xl font-black tracking-tighter text-white">
                                        {formatCurrency(stats.total)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="glass-premium p-8 bento-card">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 mb-8 flex items-center gap-2">
                                <FileText size={14} /> Detalhamento de Lançamentos
                            </h3>

                            <div className="space-y-4">
                                {settlementRequests.map((req) => (
                                    <div key={req.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-200 hover:bg-slate-100 transition-all group/card">
                                        <div className="flex flex-col md:flex-row justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 py-0.5 px-2 bg-slate-200 rounded-md">
                                                        {new Date(req.date).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 py-0.5 px-2 bg-emerald-100 rounded-md">
                                                        {req.category}
                                                    </span>
                                                </div>
                                                <h4 className="font-black text-slate-900 transition-colors uppercase italic">{req.establishment}</h4>
                                                <p className="text-xs text-slate-600 font-medium italic">{req.description}</p>
                                                {req.projectId && (
                                                    <div className="flex items-center gap-1.5 text-blue-600 mt-2 bg-blue-50 py-1 px-2 rounded-lg border border-blue-100 w-fit">
                                                        <Briefcase size={10} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                                            🏗️ {projects.find(p => p.id === req.projectId)?.workName || 'Obra vinculada'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col justify-center items-end">
                                                <span className="text-2xl font-black tracking-tighter text-slate-900 group-hover/card:scale-110 transition-transform origin-right">
                                                    {formatCurrency(req.amount)}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">{req.collaboratorName}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Mirror Receipts */}
                    <div className="lg:col-span-1 space-y-8 no-print">
                        <div className="glass-premium p-8 bento-card sticky top-10">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 mb-8 flex items-center gap-2">
                                <Receipt size={14} /> Espelho de Comprovantes
                            </h3>

                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                {settlementRequests.map((req, idx) => (
                                    <div key={req.id} className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">
                                            <span>#{idx + 1} {req.establishment}</span>
                                            <span className="text-emerald-500">{formatCurrency(req.amount)}</span>
                                        </div>
                                        {req.receiptUrl ? (
                                            <div className="relative group/mirror rounded-2xl overflow-hidden border border-slate-800 aspect-[3/4] bg-slate-900 flex items-center justify-center cursor-zoom-in" onClick={() => setSelectedImage(req.receiptUrl)}>
                                                {req.receiptUrl.startsWith('data:application/pdf') ? (
                                                    <iframe
                                                        src={req.receiptUrl}
                                                        className="w-full h-full border-none pointer-events-none"
                                                        title={`Comprovante PDF ${req.establishment}`}
                                                    />
                                                ) : (
                                                    <img
                                                        src={req.receiptUrl}
                                                        alt={`Comprovante ${req.establishment}`}
                                                        className="w-full h-full object-contain transition-transform duration-500 group-hover/mirror:scale-110"
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/mirror:opacity-100 transition-opacity flex items-center justify-center">
                                                    <ExternalLink size={24} className="text-white" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-800 p-8 flex flex-col items-center justify-center gap-2 text-slate-600 italic text-center">
                                                <FileText size={32} className="opacity-20" />
                                                <p className="text-[10px] uppercase font-black">Sem comprovante digital</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Print Section (Hidden on Screen) */}
                <div className="hidden print:block space-y-12">
                    <div className="text-center space-y-2 border-b-2 border-slate-900 pb-8">
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter">Relatório de Baixa Financeira</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.5em]">Hypado System • Gestão Integrada</p>
                        <p className="text-sm font-black mt-4">ID DO FECHAMENTO: <span className="bg-slate-100 px-2">{settlementId}</span></p>
                        <p className="text-xs font-bold mt-1">DATA DE EMISSÃO: {new Date().toLocaleString('pt-BR')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 py-8">
                        <div className="p-6 bg-slate-50 border-2 border-slate-900 rounded-3xl">
                            <h3 className="text-xs font-black uppercase tracking-widest mb-4">Total Consolidado</h3>
                            <p className="text-4xl font-black tracking-tighter">{formatCurrency(stats.total)}</p>
                        </div>
                        <div className="p-6 bg-slate-50 border-2 border-slate-900 rounded-3xl">
                            <h3 className="text-xs font-black uppercase tracking-widest mb-4">Quantidade de Itens</h3>
                            <p className="text-4xl font-black tracking-tighter">{settlementRequests.length} Lançamentos</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] border-b border-slate-200 pb-2">Detalhamento dos Lançamentos</h3>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-900 text-left">
                                    <th className="py-2 px-1">Data</th>
                                    <th className="py-2">Favorecido / Estabelecimento</th>
                                    <th className="py-2">Colaborador</th>
                                    <th className="py-2 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {settlementRequests.map(req => (
                                    <tr key={req.id}>
                                        <td className="py-3 px-1">{new Date(req.date).toLocaleDateString()}</td>
                                        <td className="py-3 font-bold">
                                            {req.establishment} <span className="text-[10px] font-normal italic">({req.category})</span>
                                            {req.projectId && (
                                                <div className="text-[9px] text-blue-600 font-black uppercase mt-0.5">
                                                    🏗️ OBRA: {projects.find(p => p.id === req.projectId)?.workName || 'Vinculada'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3">{req.collaboratorName}</td>
                                        <td className="py-3 text-right font-black">{formatCurrency(req.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="pt-20 break-before-page">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-center mb-10 border-b-2 border-slate-900 pb-4">Espelho Digital dos Comprovantes</h3>
                        <div className="grid grid-cols-1 gap-12">
                            {settlementRequests.filter(r => r.receiptUrl).map((req, idx) => (
                                <div key={req.id} className="space-y-4 pt-10 border-t border-slate-200 first:border-t-0">
                                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest bg-slate-50 p-2 border-l-4 border-slate-900">
                                        <span>#{idx + 1} - {req.establishment} ({new Date(req.date).toLocaleDateString()})</span>
                                        <span>{formatCurrency(req.amount)}</span>
                                    </div>
                                    <div className="flex justify-center">
                                        {req.receiptUrl.startsWith('data:application/pdf') ? (
                                            <iframe
                                                src={req.receiptUrl}
                                                className="w-full h-[800px] border border-slate-200 shadow-md bg-white rounded-xl"
                                                title={`Mirror PDF ${idx}`}
                                            />
                                        ) : (
                                            <img
                                                src={req.receiptUrl}
                                                alt={`Mirror ${idx}`}
                                                className="max-h-[800px] w-auto object-contain shadow-md"
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-slate-950/98 backdrop-blur-xl animate-in fade-in duration-300">
                    {/* Header Bar - Fixed and High Contrast */}
                    <div className="w-full max-w-5xl flex justify-between items-center mb-4 px-6 py-4 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 z-[110] no-print">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                <Receipt size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-white font-black uppercase tracking-widest text-[10px]">Visualização do Comprovante</h3>
                                <p className="text-white/40 text-[8px] font-medium">Use os botões para voltar ao relatório</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl transition-all shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 group"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest">Sair da Visualização</span>
                            <X size={18} className="group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>

                    <div className="w-full max-w-5xl h-[70vh] relative group flex flex-col items-center justify-center z-[105]">
                        {selectedImage.startsWith('data:application/pdf') ? (
                            <iframe
                                src={selectedImage}
                                className="w-full h-full rounded-[32px] border border-white/10 shadow-2xl bg-white"
                                title="Visualização PDF"
                            />
                        ) : (
                            <img
                                src={selectedImage}
                                alt="Preview"
                                className="rounded-[32px] shadow-2xl border border-white/10 max-w-full max-h-full object-contain shadow-emerald-500/10 animate-in zoom-in-95 duration-500"
                            />
                        )}
                    </div>

                    {/* Quick Close Footer */}
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="mt-8 px-12 py-4 bg-white text-black rounded-full font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-110 active:scale-95 transition-all z-[110] border-4 border-black/10 no-print"
                    >
                        FECHAR E VOLTAR
                    </button>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .no-print, .print\\:hidden { display: none !important; }
                    .print\\:block { display: flex !important; flex-direction: column !important; }
                    body { background: white !important; color: black !important; }
                    .bg-slate-950, .bg-slate-900, .bg-slate-900\\/50, .bg-slate-900\\/30 { background: transparent !important; }
                    .bg-slate-50 { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .border-slate-900 { border-color: black !important; }
                    .border-slate-200, .border-slate-100 { border-color: #cbd5e1 !important; }
                    .text-white, .text-slate-100, .text-slate-300, .text-slate-200, .text-slate-400 { color: black !important; }
                    .text-slate-500, .text-slate-600 { color: #475569 !important; }
                    .shadow-xl, .shadow-2xl, .shadow-lg, .shadow-md { shadow: none !important; box-shadow: none !important; }
                    .bg-emerald-500 { background: #10b981 !important; border: 1px solid #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .text-emerald-400, .text-emerald-500, .text-emerald-600 { color: #059669 !important; font-weight: 900 !important; }
                    .text-amber-400, .text-amber-500 { color: #d97706 !important; font-weight: 900 !important; }
                    .text-blue-500, .text-blue-600 { color: #2563eb !important; font-weight: 900 !important; }
                    .divide-slate-100 > :not([hidden]) ~ :not([hidden]) { border-color: #cbd5e1 !important; }
                    @page { margin: 1cm; }
                }
            ` }} />
        </div>
    );
};

export default RefundSettlementReportView;
