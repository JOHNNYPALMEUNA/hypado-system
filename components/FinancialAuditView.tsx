
import React, { useState, useRef, useMemo } from 'react';
import {
    Receipt,
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    Trash2,
    Search,
    ArrowRight,
    ShieldCheck,
    TrendingUp,
    DollarSign,
    User,
    Calendar,
    MoreVertical,
    Plus,
    X,
    ExternalLink
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { RefundRequest, RefundStatus } from '../types';
import { processRefundReceipt } from '../geminiService';

import { supabase } from '../supabaseClient';

const FinancialAuditView: React.FC = () => {
    const { addRefundRequest, updateRefundRequest, deleteRefundRequest, projects, installers } = useData();
    const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);

    React.useEffect(() => {
        const fetchRefunds = async () => {
            const { data, error } = await supabase.from('refund_requests').select('*');
            if (error) {
                console.error('Error fetching refunds:', error);
                return;
            }
            if (data) {
                const mapped = data.map((r: any) => ({
                    id: r.id,
                    collaboratorName: r.collaborator_name,
                    date: r.date,
                    establishment: r.establishment,
                    description: r.description,
                    category: r.category,
                    amount: parseFloat(r.amount),
                    cnpj: r.cnpj,
                    status: r.status,
                    projectId: r.project_id,
                    receiptUrl: r.receipt_url,
                    settlementId: r.settlement_id,
                    createdAt: r.created_at
                }));
                // Sort by date inside the direct context to maintain integrity
                setRefundRequests(mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }
        };
        fetchRefunds();

        const sub = supabase.channel('public:refund_requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_requests' }, () => fetchRefunds())
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);
    const [isProcessing, setIsProcessing] = useState(false);
    const [filter, setFilter] = useState('');
    const [showSettlementSummary, setShowSettlementSummary] = useState(false);
    const [manualText, setManualText] = useState('');
    const [selectedCollaborator, setSelectedCollaborator] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [manualProjectName, setManualProjectName] = useState('');
    const [isManualProject, setIsManualProject] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState<'pending' | 'history'>('pending');

    const [editingRequest, setEditingRequest] = useState<RefundRequest | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [settlementSuccessData, setSettlementSuccessData] = useState<{ id: string, url: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!selectedCollaborator) {
            alert("Por favor, selecione ou digite o nome do colaborador primeiro.");
            return;
        }
        if (!selectedProjectId && !isManualProject) {
            alert("Por favor, selecione um projeto.");
            return;
        }











        setIsProcessing(true);
        try {
            const base64 = await fileToBase64(file);
            const data = await processRefundReceipt({
                base64Image: base64.split(',')[1],
                mimeType: file.type || 'image/jpeg'
            }, manualText); // Pass current manual text as context

            if (data) {
                // Ensure amount is a number and handle common formatting issues
                let processedAmount = 0;
                if (typeof data.amount === 'number') {
                    processedAmount = data.amount;
                } else if (typeof data.amount === 'string') {
                    processedAmount = parseFloat(data.amount.replace('R$', '').replace('.', '').replace(',', '.').trim());
                }

                // FALLBACK LOGIC: If AI fails to identify clearly, use manual input
                const finalEstablishment = (data.establishment && data.establishment !== 'Desconhecido')
                    ? data.establishment
                    : (manualText || 'Desconhecido');

                const finalDescription = data.description || manualText || 'Recibo processado por IA';

                const newRequest: Omit<RefundRequest, 'id'> = {
                    collaboratorName: selectedCollaborator,
                    date: data.date || new Date().toISOString().split('T')[0],
                    establishment: finalEstablishment,
                    category: data.category || 'Outros',
                    amount: processedAmount || 0,
                    cnpj: data.cnpj,
                    status: '🟡 A PAGAR',
                    createdAt: new Date().toISOString(),
                    projectId: isManualProject ? undefined : (selectedProjectId || undefined),
                    description: isManualProject ? `[INTERNO: ${manualProjectName}] ${finalDescription}` : finalDescription,
                    receiptUrl: base64 // Store the digital mirror
                } as any;
                await addRefundRequest(newRequest as RefundRequest);

                // feedback toast-like alert if needed
                if (!processedAmount || finalEstablishment === 'Desconhecido') {
                    console.warn("IA teve dificuldade com alguns dados. Por favor, confira o lançamento.");
                }

                // Clear manual text after successful recognition with context
                setManualText('');
            }
        } catch (error) {
            console.error("Error processing receipt:", error);
            alert("Erro ao processar recibo. Tente novamente.");
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleManualSubmit = async () => {
        if (!manualText || !selectedCollaborator) return;
        if (!selectedProjectId && !isManualProject) {
            alert("Por favor, selecione um projeto.");
            return;
        }

        setIsProcessing(true);
        try {
            const data = await processRefundReceipt(manualText);
            if (data) {
                let processedAmount = 0;
                if (typeof data.amount === 'number') {
                    processedAmount = data.amount;
                } else if (typeof data.amount === 'string') {
                    processedAmount = parseFloat(data.amount.replace('R$', '').replace('.', '').replace(',', '.').trim());
                }

                const newRequest: Omit<RefundRequest, 'id'> = {
                    collaboratorName: selectedCollaborator,
                    date: data.date || new Date().toISOString().split('T')[0],
                    establishment: data.establishment || 'Lançamento Manual',
                    category: data.category || 'Outros',
                    amount: processedAmount || 0,
                    cnpj: data.cnpj,
                    status: '🟡 A PAGAR',
                    createdAt: new Date().toISOString(),
                    projectId: isManualProject ? undefined : (selectedProjectId || undefined),
                    description: isManualProject ? `[INTERNO: ${manualProjectName}] ${data.description || manualText}` : (data.description || manualText),
                } as any;
                await addRefundRequest(newRequest as RefundRequest);
                setManualText('');
            }
        } catch (error) {
            console.error("Error processing manual text:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditClick = (request: RefundRequest) => {
        setEditingRequest({ ...request });
    };

    const handleSaveEdit = async () => {
        if (!editingRequest || !editingRequest.establishment || !editingRequest.amount) return;

        await updateRefundRequest(editingRequest);
        setEditingRequest(null);
    };

    const handleStatusToggle = async (request: RefundRequest) => {
        const newStatus: RefundStatus = request.status === '🟡 A PAGAR' ? '🟢 PAGO' : '🟡 A PAGAR';
        await updateRefundRequest({ ...request, status: newStatus });
    };

    const filteredRequests = refundRequests.filter(r => {
        const matchesFilter = r.collaboratorName.toLowerCase().includes(filter.toLowerCase()) ||
            r.establishment.toLowerCase().includes(filter.toLowerCase()) ||
            r.description.toLowerCase().includes(filter.toLowerCase());

        const matchesTab = activeSubTab === 'pending' ? r.status === '🟡 A PAGAR' : r.status === '🟢 PAGO';

        return matchesFilter && matchesTab;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const settlementSummary = useMemo(() => {
        const pending = refundRequests.filter(r => r.status === '🟡 A PAGAR');
        const grouped: Record<string, number> = {};
        pending.forEach(r => {
            grouped[r.collaboratorName] = (grouped[r.collaboratorName] || 0) + r.amount;
        });
        return grouped;
    }, [refundRequests]);

    const totalToPay = useMemo(() =>
        (Object.values(settlementSummary) as number[]).reduce((sum, amount) => sum + amount, 0)
        , [settlementSummary]);

    const groupedHistory = useMemo(() => {
        const history = refundRequests.filter(r => r.status === '🟢 PAGO');
        const groups: Record<string, {
            id: string,
            dateRange: { min: string, max: string },
            total: number,
            count: number,
            collaborators: Set<string>
        }> = {};

        history.forEach(r => {
            const sid = r.settlementId || 'SEM_ID';
            if (!groups[sid]) {
                groups[sid] = {
                    id: sid,
                    dateRange: { min: r.date, max: r.date },
                    total: 0,
                    count: 0,
                    collaborators: new Set()
                };
            }
            groups[sid].total += r.amount;
            groups[sid].count += 1;
            groups[sid].collaborators.add(r.collaboratorName);
            if (new Date(r.date) < new Date(groups[sid].dateRange.min)) groups[sid].dateRange.min = r.date;
            if (new Date(r.date) > new Date(groups[sid].dateRange.max)) groups[sid].dateRange.max = r.date;
        });

        return Object.values(groups).sort((a, b) => b.id.localeCompare(a.id));
    }, [refundRequests]);

    const handleConfirmSettle = async () => {
        const outstanding = refundRequests.filter(r => r.status === '🟡 A PAGAR');
        if (outstanding.length === 0) return;

        const now = new Date();
        const settlementId = `SET-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

        for (const req of outstanding) {
            await updateRefundRequest({ ...req, status: '🟢 PAGO', settlementId });
        }
        setShowSettlementSummary(false);

        // Generate and navigate to report
        const reportUrl = `${window.location.origin}${window.location.pathname}?mode=settlement-report&id=${settlementId}`;

        // Auto-open in new tab
        // window.open(reportUrl, '_blank');

        // Provide visual confirmation
        // setManualText(settlementId); // Reuse manualText temporarily to show ID if needed or just use alert
        // alert(`✅ BAIXA CONCLUÍDA!\n\nRelatório gerado: ${settlementId}\nO Financeiro receberá todos os comprovantes digitais.\n\nA página do relatório foi aberta em uma nova aba.`);
        setSettlementSuccessData({ id: settlementId, url: reportUrl });
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Premium Header Container */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[40px] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative glass-premium p-10 bento-card">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                    <ShieldCheck size={28} />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black tracking-tighter text-gradient-premium">
                                        Auditoria de Reembolsos
                                    </h1>
                                    <p className="text-muted-foreground font-medium text-sm">Especialista Financeiro IA • Gestão e Baixa de Despesas</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="glass-dark p-6 rounded-3xl border-slate-800/50 flex items-center gap-4">
                                <div className="w-12 h-12 bg-card/5 rounded-2xl flex items-center justify-center text-amber-400">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total a Pagar</p>
                                    <p className="text-2xl font-black tracking-tight text-white">
                                        R$ {totalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-premium p-8 bento-card h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                                <Plus size={20} />
                            </div>
                            <h3 className="text-lg font-black tracking-tight">Nova Despesa</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Colaborador</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select
                                        value={selectedCollaborator}
                                        onChange={(e) => setSelectedCollaborator(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none"
                                        title="Selecionar colaborador"
                                    >
                                        <option value="">Selecione o colaborador</option>
                                        {installers.map(member => (
                                            <option key={member.id} value={member.name}>{member.name} ({member.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Projeto</label>
                                <div className="relative">
                                    <select
                                        value={isManualProject ? "manual" : selectedProjectId}
                                        onChange={(e) => {
                                            if (e.target.value === "manual") {
                                                setIsManualProject(true);
                                                setSelectedProjectId('');
                                            } else {
                                                setIsManualProject(false);
                                                setSelectedProjectId(e.target.value);
                                            }
                                        }}
                                        className="w-full pl-4 pr-12 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none"
                                        title="Selecionar projeto ou uso interno"
                                    >
                                        <option value="">Selecione um projeto</option>
                                        <option value="manual">👉 Lancamento Interno / Outro</option>
                                        {projects.map(project => (
                                            <option key={project.id} value={project.id}>{project.workName}</option>
                                        ))}
                                    </select>
                                    <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={18} />
                                </div>

                                {isManualProject && (
                                    <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                                        <input
                                            type="text"
                                            placeholder="Nome do gasto interno (ex: Manutenção Serra)"
                                            value={manualProjectName}
                                            onChange={(e) => setManualProjectName(e.target.value)}
                                            className="w-full px-4 py-4 bg-emerald-500/5 border border-emerald-500/30 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none placeholder:text-emerald-500/40"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block text-center">Captura por IA</label>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isProcessing}
                                    className="w-full aspect-square border-2 border-dashed border-slate-800 rounded-[32px] flex flex-col items-center justify-center gap-4 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group disabled:opacity-50"
                                >
                                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                                        {isProcessing ? <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Upload size={32} />}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold">Subir Foto ou PDF</p>
                                        <p className="text-xs text-muted-foreground mt-1">Clique para selecionar</p>
                                    </div>
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" title="Selecionar comprovante" />
                            </div>

                            <div className="pt-4 border-t border-slate-800/50">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Lançamento por Texto</label>
                                <div className="relative">
                                    <textarea
                                        placeholder="Cole o texto da nota aqui..."
                                        value={manualText}
                                        onChange={(e) => setManualText(e.target.value)}
                                        className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm h-32 resize-none focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                    />
                                    <button
                                        onClick={handleManualSubmit}
                                        disabled={isProcessing || !manualText}
                                        className="absolute bottom-4 right-4 p-2 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                        title="Enviar texto para processamento"
                                    >
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Card */}
                <div className="lg:col-span-2">
                    <div className="glass-premium p-0 bento-card overflow-hidden h-full flex flex-col">
                        <div className="p-8 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                        <FileText size={20} />
                                    </div>
                                    <h3 className="text-lg font-black tracking-tight">Controle de Gastos</h3>
                                </div>

                                <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
                                    <button
                                        onClick={() => setActiveSubTab('pending')}
                                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'pending' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        Pendentes
                                    </button>
                                    <button
                                        onClick={() => setActiveSubTab('history')}
                                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'history' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        Histórico
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar lançamentos..."
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-xs text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowSettlementSummary(true)}
                                    disabled={totalToPay === 0}
                                    className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    Fechar Baixa
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="bg-muted border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        <th className="px-8 py-4">Colaborador</th>
                                        <th className="px-5 py-4">Data</th>
                                        <th className="px-5 py-4">Local / Descrição</th>
                                        <th className="px-5 py-4">Categoria</th>
                                        <th className="px-5 py-4 text-right">Valor</th>
                                        <th className="px-5 py-4 text-center">Status</th>
                                        <th className="px-8 py-4 text-right w-[140px]">Gerenciar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {activeSubTab === 'pending' ? (
                                        filteredRequests.map((request) => (
                                            <tr key={request.id} className="group hover:bg-slate-800/20 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-black text-muted-foreground">
                                                            {request.collaboratorName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm tracking-tight text-foreground">{request.collaboratorName}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID: {request.id.split('-')[1]}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-6">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        <span className="text-xs font-bold">{new Date(request.date).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-sm tracking-tight text-foreground">{request.establishment}</p>
                                                        {request.receiptUrl && (
                                                            <button
                                                                onClick={() => setSelectedImage(request.receiptUrl || null)}
                                                                className="p-1 px-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white rounded-md transition-all flex items-center gap-1 group/receipt border border-emerald-200"
                                                                title="Ver Comprovante Digital"
                                                            >
                                                                <Receipt size={12} className="group-hover/receipt:scale-110" />
                                                                <span className="text-[8px] font-black uppercase">Mirror</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{request.description}</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {request.projectId && (
                                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-black uppercase tracking-tighter border border-blue-500/20">
                                                                🏗️ {projects.find(p => p.id === request.projectId)?.workName || 'Obra vinculada'}
                                                            </span>
                                                        )}
                                                        {request.cnpj && <span className="text-[10px] text-muted-foreground">CNPJ: {request.cnpj}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-6">
                                                    <span className="px-3 py-1 bg-muted border border-border rounded-lg text-[10px] font-black text-foreground uppercase tracking-wider">
                                                        {request.category}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-6 text-right">
                                                    <p className="font-black text-foreground text-base">
                                                        R$ {request.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-6 text-center">
                                                    <button
                                                        onClick={() => handleStatusToggle(request)}
                                                        className={`
                                                        px-3 py-1.5 rounded-full text-[10px] font-black transition-all
                                                        ${request.status === '🟢 PAGO'
                                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}
                                                      `}
                                                    >
                                                        {request.status}
                                                    </button>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => handleEditClick(request)}
                                                            className="p-3 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl transition-all shadow-sm group/btn"
                                                            title="Editar lançamento"
                                                        >
                                                            <FileText size={18} className="group-hover/btn:scale-110 transition-transform" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteRefundRequest(request.id)}
                                                            className="p-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm group/btn"
                                                            title="Excluir lançamento"
                                                        >
                                                            <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        groupedHistory.map((lot) => (
                                            <tr key={lot.id} className="group hover:bg-slate-800/20 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-2xl bg-indigo-500 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-indigo-500/20">
                                                            <TrendingUp size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm tracking-tight text-foreground">Lote: {lot.id.split('-')[1] || lot.id}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lot.count} lançamentos • {lot.collaborators.size} colaboradores</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-6" colSpan={2}>
                                                    <div className="flex items-center gap-3 text-muted-foreground">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black uppercase text-slate-400">Período</span>
                                                            <span className="text-xs font-bold">
                                                                {new Date(lot.dateRange.min).toLocaleDateString()} — {new Date(lot.dateRange.max).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-6">
                                                    <span className="px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-lg text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                                                        LIQUIDADO
                                                    </span>
                                                </td>
                                                <td className="px-5 py-6 text-right">
                                                    <p className="font-black text-foreground text-base">
                                                        R$ {lot.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                </td>
                                                <td className="px-8 py-6 text-right" colSpan={2}>
                                                    <button
                                                        onClick={() => window.open(window.location.origin + window.location.pathname + `?mode=settlement-report&id=${lot.id}`, '_blank')}
                                                        className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 ml-auto"
                                                    >
                                                        <FileText size={14} /> Abrir Relatório
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}

                                    {((activeSubTab === 'pending' && filteredRequests.length === 0) || (activeSubTab === 'history' && groupedHistory.length === 0)) && (
                                        <tr>
                                            <td colSpan={7} className="px-8 py-20 text-center">
                                                <div className="max-w-xs mx-auto space-y-4">
                                                    <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-foreground mx-auto">
                                                        <Receipt size={32} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-400 italic">Nenhum reembolso pendente</p>
                                                        <p className="text-xs text-muted-foreground mt-1 uppercase font-black tracking-widest">Aguardando novos lançamentos</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settlement Summary Modal */}
            {showSettlementSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setShowSettlementSummary(false)} />
                    <div className="relative glass-premium p-10 bento-card max-w-lg w-full">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                                <DollarSign size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tighter">Baixa de Pagamentos</h2>
                                <p className="text-muted-foreground text-sm font-medium italic">Resumo consolidado para repasse</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-10">
                            {Object.entries(settlementSummary).map(([name, amount]) => (
                                <div key={name} className="flex items-center justify-between p-5 bg-slate-900/50 rounded-2xl border border-slate-800">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">
                                            {name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold tracking-tight">{name}</span>
                                    </div>
                                    <span className="font-black text-emerald-400">
                                        R$ {(amount as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))}

                            <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Consolidado</span>
                                <span className="text-3xl font-black tracking-tighter text-white">
                                    R$ {totalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowSettlementSummary(false)}
                                className="flex-1 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleConfirmSettle}
                                className="flex-2 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
                            >
                                Confirmar Liquidação
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingRequest && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setEditingRequest(null)} />
                    <div className="relative glass-premium p-10 bento-card max-w-lg w-full">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-indigo-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                                <Receipt size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tighter">Editar Lançamento</h2>
                                <p className="text-muted-foreground text-sm font-medium italic">Corrija os dados extraídos ou informados</p>
                            </div>
                        </div>

                        <div className="space-y-6 mb-10">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Estabelecimento / Favorecido</label>
                                <input
                                    type="text"
                                    value={editingRequest.establishment || ''}
                                    onChange={(e) => setEditingRequest({ ...editingRequest, establishment: e.target.value })}
                                    className="w-full px-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                    title="Inserir nome do estabelecimento ou favorecido"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Valor (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingRequest.amount || 0}
                                        onChange={(e) => setEditingRequest({ ...editingRequest, amount: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                        title="Inserir valor do reembolso"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Data</label>
                                    <input
                                        type="date"
                                        value={editingRequest.date || ''}
                                        onChange={(e) => setEditingRequest({ ...editingRequest, date: e.target.value })}
                                        className="w-full px-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                        title="Selecionar data da despesa"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Categoria</label>
                                <select
                                    value={editingRequest.category || ''}
                                    onChange={(e) => setEditingRequest({ ...editingRequest, category: e.target.value })}
                                    className="w-full px-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none"
                                    title="Selecionar categoria da despesa"
                                >
                                    <option value="Alimentação">Alimentação</option>
                                    <option value="Transporte">Transporte</option>
                                    <option value="Suprimentos">Suprimentos</option>
                                    <option value="Ferramentas">Ferramentas</option>
                                    <option value="Material">Material</option>
                                    <option value="Frete">Frete</option>
                                    <option value="Montagem">Montagem</option>
                                    <option value="Fitação">Fitação</option>
                                    <option value="Terceirizados">Terceirizados</option>
                                    <option value="Uber">Uber</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Descrição / Notas</label>
                                <textarea
                                    value={editingRequest.description || ''}
                                    onChange={(e) => setEditingRequest({ ...editingRequest, description: e.target.value })}
                                    className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                    title="Inserir descrição ou notas sobre a despesa"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setEditingRequest(null)}
                                className="flex-1 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="flex-2 py-4 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Image Modal Preview */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-slate-950/98 backdrop-blur-xl animate-in fade-in duration-300">
                    {/* Header Bar - Fixed and High Contrast */}
                    <div className="w-full max-w-5xl flex justify-between items-center mb-4 px-6 py-4 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 z-[110]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                <Receipt size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-white font-black uppercase tracking-widest text-[10px]">Visualização Digital</h3>
                                <p className="text-white/40 text-[8px] font-medium">Use os botões para voltar ao sistema</p>
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
                                className="w-full h-full rounded-[32px] border border-white/10 shadow-2xl bg-card"
                                title="Visualização PDF"
                            />
                        ) : (
                            <img
                                src={selectedImage}
                                alt="Preview"
                                className="rounded-[32px] shadow-2xl border border-white/10 max-w-full max-h-full object-contain shadow-emerald-500/10 animate-in zoom-in-95 duration-500"
                                onError={(e) => {
                                    console.error('Image failed to load');
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                        const errorDiv = document.createElement('div');
                                        errorDiv.className = 'p-12 glass-premium border-red-500/50 text-red-400 flex flex-col items-center gap-4';
                                        errorDiv.innerHTML = '<span class="text-xs font-black uppercase tracking-widest">Erro ao carregar prévia</span>';
                                        parent.appendChild(errorDiv);
                                    }
                                }}
                            />
                        )}
                    </div>

                    {/* Secondary Quick Close Footer */}
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="mt-8 px-12 py-4 bg-card text-black rounded-full font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-110 active:scale-95 transition-all z-[110] border-4 border-black/10"
                    >
                        FECHAR E VOLTAR
                    </button>
                </div>
            )}

            {/* Settlement Success Modal */}
            {settlementSuccessData && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-muted/80 backdrop-blur-3xl" onClick={() => setSettlementSuccessData(null)} />
                    <div className="relative glass-premium p-12 bento-card max-w-xl w-full text-center border-emerald-500/20 shadow-2xl">
                        <div className="w-24 h-24 bg-emerald-500 rounded-[40px] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-emerald-500/40 animate-bounce-slow">
                            <CheckCircle2 size={48} />
                        </div>

                        <h2 className="text-3xl font-black tracking-tighter text-foreground mb-2">Baixa Concluída!</h2>
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mb-8">Lote: {settlementSuccessData.id}</p>

                        <div className="bg-muted/50 border border-border rounded-3xl p-6 mb-10 space-y-4">
                            <p className="text-sm text-muted-foreground font-medium text-center">O relatório de liquidação foi gerado e está pronto para o financeiro. Ele contém todos os comprovantes digitais (mirrors).</p>
                            <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-2xl">
                                <Search size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground truncate flex-1 text-left">{settlementSuccessData.url}</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(settlementSuccessData.url);
                                        alert("Link copiado!");
                                    }}
                                    className="p-2 bg-muted hover:bg-slate-200 rounded-xl transition-colors text-muted-foreground"
                                    title="Copiar Link"
                                >
                                    <FileText size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    window.open(settlementSuccessData.url, '_blank');
                                    setSettlementSuccessData(null);
                                }}
                                className="w-full py-5 bg-emerald-500 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <ExternalLink size={18} /> ABRIR RELATÓRIO AGORA
                            </button>
                            <button
                                onClick={() => setSettlementSuccessData(null)}
                                className="w-full py-4 text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-colors"
                            >
                                FECHAR E CONTINUAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialAuditView;
