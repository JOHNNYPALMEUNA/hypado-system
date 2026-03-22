
import React, { useEffect, useState } from 'react';
import { Check, X, FileText, MapPin, Calendar, DollarSign, FolderOpen, User, Building2, Phone, Layers, Search, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { Project, Environment, Expense } from '../types';

import { supabase } from '../supabaseClient';

interface ProposalData {
    workName: string;
    clientName: string;
    envName?: string; // Legacy field for reverse compatibility
    value?: number;   // Legacy field for reverse compatibility
    envs?: { name: string; value: number; obs?: string }[]; // New bulk field
    totalValue?: number; // New bulk field
    date: string;
    installerName: string;
    cloudLink?: string;
    obs?: string;
    adminPhone?: string;
    projectId?: string;
    installerId?: string;
    address?: string;
    mapsLink?: string;
    projectPdfUrl?: string;
}

const InstallerProposalView: React.FC = () => {
    const [data, setData] = useState<ProposalData | null>(null);
    const [error, setError] = useState<string>('');

    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});

    const toggleModule = (idx: number) => {
        setCollapsedModules(prev => ({ ...prev, [idx]: !prev[idx] }));
    };
    const [fullProject, setFullProject] = useState<Project | null>(null);

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const encoded = params.get('data');
            const directId = params.get('id');

            if (encoded) {
                // Fix: browsers often convert '+' to ' ' in URL search params
                const safeEncoded = encoded.replace(/ /g, '+');
                const jsonStr = decodeURIComponent(escape(atob(safeEncoded)));
                const parsed = JSON.parse(jsonStr);
                console.log('Parsed proposal data:', parsed);
                setData(parsed);

                if (parsed.projectId) {
                    fetchProjectPdf(parsed.projectId).then(pdfUrl => {
                        if (pdfUrl) {
                            setData(prev => prev ? { ...prev, projectPdfUrl: pdfUrl } : null);
                        }
                    });
                    fetchFullProject(parsed.projectId);
                }
            } else if (directId) {
                // Direct link mode (from PCP)
                fetchFullProject(directId);
            } else {
                setError('Dados da proposta não encontrados no link.');
            }
        } catch (err) {
            console.error(err);
            setError('Link inválido ou expirado.');
        }
    }, [window.location.search]);

    const fetchFullProject = async (id: string) => {
        try {
            const { data: pList, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id);

            if (error) throw error;
            const p = pList && pList.length > 0 ? pList[0] : null;
            if (p) {
                const project = {
                    ...p,
                    environmentsDetails: p.environmentsDetails || p.environments_details || [],
                    projectPdfUrl: p.projectPdfUrl || p.project_pdf_url
                } as Project;

                setFullProject(project);

                // If we don't have data state yet (direct link), synthesize it
                setData(prev => prev || ({
                    workName: project.workName,
                    clientName: project.clientName,
                    date: new Date().toLocaleDateString(),
                    installerName: 'EQUIPE PCP',
                    projectId: project.id,
                    projectPdfUrl: project.projectPdfUrl
                }));
            }
        } catch (err) {
            console.error('Error fetching full project for map:', err);
            // Non-fatal error: don't call setError here, 
            // the main proposal data from link parameters is what matters most.
        }
    };

    const fetchProjectPdf = async (projectId: string) => {
        try {
            const { data: pList, error } = await supabase
                .from('projects')
                .select('project_pdf_url')
                .eq('id', projectId);

            if (error) {
                console.error('Error fetching project PDF:', error);
                return null;
            }
            return pList && pList.length > 0 ? pList[0].project_pdf_url : null;
        } catch (err) {
            console.error('Exception fetching project PDF:', err);
            return null;
        }
    };

    const handleAccept = async () => {
        if (!data || !data.projectId) return;

        // Determine environment list (new bulk or legacy single)
        const targetEnvs = data.envs ? data.envs.map(e => e.name) : (data.envName ? [data.envName] : []);
        if (targetEnvs.length === 0) return;

        try {
            const { data: pList, error: fetchError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', data.projectId);

            if (fetchError) throw fetchError;

            if (!pList || pList.length === 0) {
                throw new Error('Não foi possível localizar o projeto no banco de dados. O link pode ter expirado ou o projeto foi removido.');
            }

            const project = pList[0];

            // Handle both camelCase and snake_case for DB columns
            const envsList = project.environmentsDetails || project.environments_details || [];
            if (!Array.isArray(envsList)) {
                throw new Error('Formato de dados dos ambientes inválido no banco de dados.');
            }

            // Create Expenses for each accepted environment
            const newExpenses = [...(project.expenses || [])];
            targetEnvs.forEach(envName => {
                const env = envsList.find((e: any) => e.name === envName);
                const value = env?.authorizedMdoValue || env?.authorized_mdo_value || 0;
                
                // Only add if not already present to avoid duplicates
                const exists = newExpenses.some(exp => exp.description.includes(`MDO Ambiente: ${envName}`));
                if (!exists && value > 0) {
                    newExpenses.push({
                        id: `mdo-${Date.now()}-${envName}`,
                        description: `MDO Ambiente: ${envName}`,
                        value: value,
                        date: new Date().toISOString().split('T')[0],
                        category: 'Montagem'
                    });
                }
            });

            // Update all environments in the proposal
            const newEnvDetails = envsList.map((env: any) =>
                targetEnvs.includes(env.name) ? {
                    ...env,
                    mdoStatus: 'Aceito',
                    mdo_status: 'Aceito', // Handle both
                    isMdoAuthorized: true,
                    is_mdo_authorized: true // Handle both
                } : env
            );

            // Try to update using both possible column names
            let updatePayload: any = {
                expenses: newExpenses
            };
            if (project.environmentsDetails !== undefined) updatePayload.environmentsDetails = newEnvDetails;
            if (project.environments_details !== undefined) updatePayload.environments_details = newEnvDetails;

            const { error: updateError } = await supabase
                .from('projects')
                .update(updatePayload)
                .eq('id', data.projectId);

            if (updateError) throw updateError;

            alert('Proposta aceita com sucesso! O sistema foi atualizado.');

            if (confirm('Deseja confirmar também via WhatsApp?')) {
                const envsListText = targetEnvs.map(name => `• ${name}`).join('\n');
                const totalValueDisplay = (data.totalValue || data.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

                const text = `*RESPOSTA DE PROPOSTA - HYPADO*\n\n` +
                    `✅ Eu *ACEITO* a proposta de empreita para os ambientes:\n\n` +
                    `${envsListText}\n\n` +
                    `ðŸ¢ *Obra:* ${data.workName}\n` +
                    `💰 *Valor Total:* R$ ${totalValueDisplay}`;

                const targetPhone = data.adminPhone || '556299990000';
                window.location.href = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
            }

        } catch (error: any) {
            console.error('Error accepting proposal:', error);
            alert(`Erro ao aceitar proposta: ${error.message || 'Erro desconhecido'}. Tente novamente.`);
        }
    };

    const handleReject = async () => {
        if (!data || !data.projectId) return;

        const targetEnvs = data.envs ? data.envs.map(e => e.name) : (data.envName ? [data.envName] : []);
        if (targetEnvs.length === 0) return;

        const reason = prompt('Qual o motivo da recusa? (Ex: Valor baixo, Sem agenda, Local distante...)');
        if (!reason) return;

        try {
            const { data: pList, error: fetchError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', data.projectId);

            if (fetchError) throw fetchError;

            if (!pList || pList.length === 0) {
                throw new Error('Não foi possível localizar o projeto no banco de dados. O link pode ter expirado ou o projeto foi removido.');
            }

            const project = pList[0];

            // Handle both camelCase and snake_case for DB columns
            const envsList = project.environmentsDetails || project.environments_details || [];
            if (!Array.isArray(envsList)) {
                throw new Error('Formato de dados dos ambientes inválido no banco de dados.');
            }

            const newEnvDetails = envsList.map((env: any) =>
                targetEnvs.includes(env.name) ? {
                    ...env,
                    mdoStatus: 'Recusado',
                    mdo_status: 'Recusado', // Handle both
                    isMdoAuthorized: false,
                    is_mdo_authorized: false, // Handle both
                    rejectionReason: reason,
                    rejection_reason: reason // Handle both
                } : env
            );

            // Try to update using both possible column names
            let updatePayload: any = {};
            if (project.environmentsDetails !== undefined) updatePayload.environmentsDetails = newEnvDetails;
            if (project.environments_details !== undefined) updatePayload.environments_details = newEnvDetails;

            // If neither was found in the initial select, default to environmentsDetails (camelCase)
            if (Object.keys(updatePayload).length === 0) {
                updatePayload = { environmentsDetails: newEnvDetails };
            }

            const { error: updateError } = await supabase
                .from('projects')
                .update(updatePayload)
                .eq('id', data.projectId);

            if (updateError) throw updateError;

            alert('Recusa registrada. Obrigado pelo retorno.');

            const envsListText = targetEnvs.map(name => `• ${name}`).join('\n');
            const text = `*RESPOSTA DE PROPOSTA - HYPADO*\n\n` +
                `âŒ Eu *RECUSO* a proposta para os ambientes:\n\n` +
                `${envsListText}\n\n` +
                `ðŸ¢ *Obra:* ${data.workName}\n` +
                `💬 *Motivo:* ${reason}`;

            const targetPhone = data.adminPhone || '556299990000';
            window.location.href = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;

        } catch (error: any) {
            console.error('Error rejecting proposal:', error);
            alert(`Erro ao recusar proposta: ${error.message || 'Erro desconhecido'}. Tente novamente.`);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (error) {
        return (
            <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6">
                <div className="bg-card p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X size={32} />
                    </div>
                    <h2 className="text-xl font-black text-foreground mb-2">Erro no Link</h2>
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-muted/50 flex items-center justify-center">
                <div className="animate-spin text-amber-500"><FileText size={40} /></div>
            </div>
        );
    }

    const envsToDisplay = data.envs || (data.envName ? [{ name: data.envName, value: data.value || 0, obs: data.obs }] : []);
    const displayedTotalValue = data.totalValue || data.value || 0;

    return (
        <div className="min-h-screen bg-muted p-4 md:p-8 font-sans">
            <div id="printable-content" className="max-w-lg mx-auto bg-card rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">

                {/* Header */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500"></div>
                    <div className="w-20 h-20 bg-card/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <FileText size={32} className="text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Proposta de Serviço</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Hypado Planejados</p>
                </div>

                <div className="p-8 space-y-8">

                    {/* Welcome */}
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-foreground">Olá, <span className="text-foreground font-black uppercase">{data.installerName}</span></h2>
                        <p className="text-muted-foreground text-sm mt-1">Temos uma nova oportunidade para você.</p>
                    </div>

                    {/* Details Card */}
                    <div className="bg-muted/50 rounded-[32px] p-6 space-y-4 border border-slate-100 shadow-inner">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-card rounded-2xl text-foreground shadow-sm"><Building2 size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Obra</p>
                                <p className="text-sm font-bold text-foreground">{data.workName}</p>
                                <p className="text-xs text-muted-foreground">{data.clientName}</p>
                            </div>
                        </div>

                        {/* Address Section */}
                        {data.address && (
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-card rounded-2xl text-foreground shadow-sm"><MapPin size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Localização</p>
                                    <p className="text-sm font-bold text-foreground whitespace-pre-line">{data.address}</p>
                                    {data.mapsLink && (
                                        <a
                                            href={data.mapsLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 font-bold hover:underline mt-1 block"
                                        >
                                            Abrir no Google Maps
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-card rounded-2xl text-foreground shadow-sm"><Calendar size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Previsão</p>
                                <p className="text-sm font-bold text-foreground">{data.date}</p>
                            </div>
                        </div>

                        {/* Environments List */}
                        <div className="space-y-3 pt-2">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                                <Layers size={14} /> Ambientes e Valores Individuais
                            </p>
                            <div className="space-y-2">
                                {envsToDisplay.map((env, idx) => (
                                    <div key={idx} className="bg-card/50 p-4 rounded-2xl border border-border/50 flex justify-between items-center group">
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{env.name}</p>
                                            {env.obs && <p className="text-[10px] text-muted-foreground italic mt-0.5">{env.obs}</p>}
                                        </div>
                                        <p className="text-sm font-black text-foreground">R$ {env.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Global Value */}
                    <div className="bg-emerald-50 rounded-[32px] p-8 text-center border border-emerald-100">
                        <p className="text-xs font-black uppercase text-emerald-600 tracking-widest mb-1">Valor Global da Proposta</p>
                        <div className="flex items-center justify-center gap-1 text-emerald-900">
                            <span className="text-lg font-bold">R$</span>
                            <span className="text-4xl font-black tracking-tighter">{displayedTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 no-print">
                        <button onClick={handlePrint} className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-foreground font-bold py-4 rounded-[24px] uppercase text-xs tracking-widest transition-all shadow-lg mb-4">
                            <Printer size={18} />
                            Imprimir Proposta
                        </button>
                        {data.cloudLink && (
                            <a href={data.cloudLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-slate-200 hover:bg-slate-300 text-foreground font-bold py-4 rounded-[24px] uppercase text-xs tracking-widest transition-all">
                                <FolderOpen size={18} />
                                Ver Projetos (Nuvem)
                            </a>
                        )}

                        {data.projectPdfUrl && (
                            <a href={data.projectPdfUrl} download="projeto.pdf" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-slate-200 hover:bg-slate-300 text-foreground font-bold py-4 rounded-[24px] uppercase text-xs tracking-widest transition-all">
                                <FileText size={18} />
                                Ver PDF do Projeto
                            </a>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button onClick={handleReject} className="bg-red-50 hover:bg-red-100 text-red-500 font-black py-4 rounded-[24px] uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2">
                                <X size={18} /> Recusar
                            </button>
                            <button onClick={handleAccept} className="bg-slate-900 hover:bg-emerald-600 text-white font-black py-4 rounded-[24px] uppercase text-xs tracking-widest shadow-2xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                                <Check size={18} /> Aceitar
                            </button>
                        </div>
                    </div>

                    {/* DIGITAL ASSEMBLY MAP (ASSEMBLY GUIDE) */}
                    {fullProject && (
                        <div className="mt-12 border-t border-slate-100 pt-10 pb-20">
                            <div className="flex items-center gap-3 mb-6 px-2">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Layers size={24} /></div>
                                <div>
                                    <h3 className="text-xl font-black text-foreground uppercase italic tracking-tighter leading-none">Mapa de Montagem</h3>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Consulte IDs de Peças e Módulos</p>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="relative mb-6 no-print">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar ID da Peça (ex: 338)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-muted/50 border-2 border-transparent focus:border-amber-500 focus:bg-card rounded-[24px] text-sm font-bold transition-all shadow-inner"
                                />
                            </div>

                            <div className="space-y-8">
                                {fullProject.environmentsDetails.map((env, eIdx) => (
                                    <div key={eIdx} className="space-y-4">
                                        <div className="flex items-center gap-2 px-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                            <h4 className="font-black text-foreground uppercase text-xs tracking-widest">{env.name}</h4>
                                        </div>

                                        <div className="space-y-4">
                                            {(env.memorial?.modules || []).map((mod, mIdx) => {
                                                const filteredParts = (mod.parts || []).filter(p =>
                                                    !searchTerm ||
                                                    p.uniqueId?.includes(searchTerm) ||
                                                    p.partName.toLowerCase().includes(searchTerm.toLowerCase())
                                                );

                                                if (searchTerm && filteredParts.length === 0) return null;

                                                return (
                                                    <div key={mIdx} className="bg-card rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
                                                        <div
                                                            className="flex justify-between items-start cursor-pointer group/header"
                                                            onClick={() => toggleModule(mIdx)}
                                                        >
                                                            <div className="flex-1">
                                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 italic">Módulo</p>
                                                                <div className="flex items-center gap-3">
                                                                    <h4 className="text-lg font-black text-foreground uppercase italic leading-none">{mod.name}</h4>
                                                                    <div className="p-1.5 bg-muted/50 rounded-lg text-slate-400 group-hover/header:text-amber-500 transition-colors">
                                                                        {collapsedModules[mIdx] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                                                    </div>
                                                                </div>
                                                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                                                    {mod.width}x{mod.height}x{mod.depth}mm
                                                                </p>
                                                            </div>
                                                            <div className="px-3 py-1.5 bg-slate-900 rounded-xl text-[10px] font-black text-amber-500 italic border border-slate-800 shadow-lg">
                                                                {mod.parts?.length || 0} PEÇAS
                                                            </div>
                                                        </div>

                                                        {!collapsedModules[mIdx] && (
                                                            <div className="animate-in slide-in-from-top-2 duration-200">
                                                                {/* Parts List */}
                                                                <div className="space-y-2 mt-4 pt-4 border-t border-slate-50">
                                                                    {filteredParts.length > 0 ? (
                                                                        filteredParts.map((part, pIdx) => (
                                                                            <div key={pIdx} className={`p-3 rounded-2xl border flex justify-between items-center transition-all ${searchTerm && part.uniqueId?.includes(searchTerm) ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/10' : 'bg-muted/50/50 border-slate-100'}`}>
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-10 h-10 min-w-[40px] rounded-xl bg-card shadow-sm flex items-center justify-center text-xs font-black text-foreground border border-slate-100 flex-col leading-none">
                                                                                        <span>{part.uniqueId || '-'}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs font-bold text-foreground line-clamp-1">{part.partName}</p>
                                                                                        <p className="text-[10px] text-muted-foreground font-medium">{part.width}x{part.depth}mm | {part.thickness}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tight text-right ml-2">{part.brandColor}</div>
                                                                            </div>
                                                                        ))
                                                                    ) : !searchTerm && (
                                                                        <p className="text-[10px] text-slate-400 italic text-center py-2">Nenhuma peça detalhada para este módulo.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default InstallerProposalView;
