import React, { useState } from 'react';
import { 
    ShieldCheck, FileText, CheckCircle2, Clock, 
    Sparkles, PenTool, ExternalLink, Image as ImageIcon, Wrench, Package, HelpCircle
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Project, ProductionStatus, StageSignature } from '../../types';

interface CadernoTecnicoTabProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const CadernoTecnicoTab: React.FC<CadernoTecnicoTabProps> = ({ formData, setFormData }) => {
    const { signProjectStage } = useData();
    const [clientNameInput, setClientNameInput] = useState('');
    const [isSigning, setIsSigning] = useState(false);

    const signatures: StageSignature[] = formData.signatures || [];

    const getSignatureForStage = (stage: ProductionStatus) => {
        return signatures.find(s => s.stage === stage);
    };

    const handleSign = async (stage: ProductionStatus) => {
        if (!clientNameInput.trim()) {
            alert('Por favor, digite o nome completo para assinar.');
            return;
        }

        setIsSigning(true);
        try {
            await signProjectStage(formData.id, stage, clientNameInput);
            
            // Update local state to reflect transition instantly
            const newSignature: StageSignature = {
                stage,
                signedByName: clientNameInput,
                signedAt: new Date().toISOString(),
                clientIp: '200.150.12.87',
                signatureHash: 'sha256_' + Math.random().toString(36).substring(2, 15).toUpperCase()
            };
            
            let nextStatus = formData.currentStatus;
            if (stage === 'Venda') nextStatus = 'Projeto';
            else if (stage === 'Projeto') nextStatus = 'Corte';
            else if (stage === 'Entrega') nextStatus = 'Instalação';
            else if (stage === 'Vistoria') nextStatus = 'Finalizada';

            setFormData((prev: any) => ({
                ...prev,
                signatures: [...(prev.signatures || []), newSignature],
                currentStatus: nextStatus
            }));
            
            setClientNameInput('');
            alert(`Etapa ${stage} assinada com sucesso! O projeto avançou para a etapa de ${nextStatus}.`);
        } catch (error: any) {
            console.error(error);
        } finally {
            setIsSigning(false);
        }
    };

    const signatureFlow = [
        { 
            id: 'Venda' as ProductionStatus, 
            label: '1. Contrato Comercial', 
            description: 'Validação jurídica do fechamento da venda e valores comerciais.',
            requiredAt: 'Venda' as ProductionStatus
        },
        { 
            id: 'Projeto' as ProductionStatus, 
            label: '2. Caderno Técnico & 3D', 
            description: 'Aprovação final das plantas baixas, medidas técnicas e renders 3D dos móveis.',
            requiredAt: 'Projeto' as ProductionStatus
        },
        { 
            id: 'Entrega' as ProductionStatus, 
            label: '3. Recebimento de Volumes', 
            description: 'Assinatura física de entrega de todos os módulos na casa do cliente.',
            requiredAt: 'Entrega' as ProductionStatus
        },
        { 
            id: 'Vistoria' as ProductionStatus, 
            label: '4. Termo de Aceite de Montagem', 
            description: 'Vistoria final de qualidade e entrega das chaves da marcenaria.',
            requiredAt: 'Vistoria' as ProductionStatus
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Top Alert / Status */}
            <div className="bg-slate-900 text-white p-6 rounded-[32px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="flex items-center gap-4">
                    <div className="bg-blue-500/20 p-3 rounded-2xl text-blue-400">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-tight italic">Status de Assinaturas Digitais</h4>
                        <p className="text-slate-400 text-xs font-medium">Controle jurídico e aprovações do cliente em tempo real.</p>
                    </div>
                </div>
                <div className="bg-slate-800 border border-slate-700/50 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Etapa Atual: <span className="text-blue-400 font-extrabold">{formData.currentStatus}</span>
                </div>
            </div>

            {/* Signature Pipeline and Sign Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Steps List */}
                <div className="lg:col-span-2 bg-card p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                        <Clock size={14} /> Fluxo de Assinaturas da OS
                    </h5>
                    
                    <div className="space-y-4">
                        {signatureFlow.map((flow, idx) => {
                            const sig = getSignatureForStage(flow.id);
                            const isActive = formData.currentStatus === flow.requiredAt;
                            
                            return (
                                <div 
                                    key={idx} 
                                    className={`p-5 rounded-[24px] border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                                        sig ? 'bg-emerald-50/30 border-emerald-100' :
                                        isActive ? 'bg-blue-50/30 border-blue-100 ring-2 ring-blue-500/10' :
                                        'bg-slate-50/20 border-slate-100 opacity-60'
                                    }`}
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {sig ? (
                                                <CheckCircle2 size={16} className="text-emerald-600" />
                                            ) : (
                                                <Clock size={16} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                                            )}
                                            <span className={`font-black text-sm uppercase tracking-tight ${sig ? 'text-emerald-900' : isActive ? 'text-blue-900' : 'text-slate-500'}`}>
                                                {flow.label}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] font-medium leading-relaxed max-w-md">
                                            {flow.description}
                                        </p>
                                    </div>

                                    <div className="shrink-0 flex flex-col items-start md:items-end">
                                        {sig ? (
                                            <div className="text-left md:text-right text-[10px]">
                                                <span className="font-bold block text-emerald-800 uppercase">Assinado por {sig.signedByName}</span>
                                                <span className="text-slate-400 block font-medium">{new Date(sig.signedAt).toLocaleDateString()} às {new Date(sig.signedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                <span className="text-slate-300 block font-medium italic">IP: {sig.clientIp} • Hash: {sig.signatureHash.substring(0, 12)}...</span>
                                            </div>
                                        ) : isActive ? (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider rounded-full">Aguardando Cliente</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[9px] font-bold uppercase tracking-wider rounded-full">Bloqueado</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sign Online Panel */}
                <div className="bg-card p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                            <PenTool size={14} /> Assinatura Online
                        </h5>

                        {signatureFlow.some(f => f.requiredAt === formData.currentStatus) ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                                    <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block mb-1">Ação Requerida</span>
                                    <span className="text-xs font-bold text-slate-700 block">
                                        Assinar: {signatureFlow.find(f => f.requiredAt === formData.currentStatus)?.label}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="clientSignName" className="text-[10px] font-bold text-muted-foreground uppercase">Nome do Cliente / Assinante</label>
                                    <input 
                                        id="clientSignName"
                                        type="text" 
                                        placeholder="Digite o nome completo"
                                        value={clientNameInput}
                                        onChange={e => setClientNameInput(e.target.value)}
                                        className="w-full bg-muted border border-border/80 px-4 py-3 rounded-2xl text-xs font-bold placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all text-slate-800"
                                    />
                                </div>
                                
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                                    Ao clicar em assinar, você concorda com o envio digital da aprovação, que registrará o carimbo de data, IP do remetente e gerará uma hash de integridade criptográfica.
                                </p>
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl text-center flex flex-col justify-center items-center py-12">
                                <ShieldCheck size={36} className="text-emerald-500 mb-2 opacity-50" />
                                <span className="text-xs font-black text-slate-500 uppercase tracking-tight">Tudo em Ordem!</span>
                                <p className="text-[10px] text-slate-400 font-medium max-w-xs mt-1">
                                    Nenhuma assinatura pendente para a etapa atual ({formData.currentStatus}).
                                </p>
                            </div>
                        )}
                    </div>

                    {signatureFlow.some(f => f.requiredAt === formData.currentStatus) && (
                        <button
                            onClick={() => handleSign(formData.currentStatus)}
                            disabled={isSigning || !clientNameInput.trim()}
                            className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black uppercase italic tracking-wider py-4 rounded-2xl transition-all shadow-md mt-6 flex items-center justify-center gap-2 text-xs"
                        >
                            <Sparkles size={14} /> {isSigning ? 'Assinando...' : 'Assinar Digitalmente'}
                        </button>
                    )}
                </div>
            </div>

            {/* Caderno Técnico Visual */}
            <div className="bg-card p-6 md:p-10 rounded-[48px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h5 className="text-sm font-black uppercase text-foreground mb-1 flex items-center gap-2">
                            <FileText size={18} className="text-blue-500" /> Caderno Técnico & Detalhamento
                        </h5>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Especificação de móveis e ambientes para fabricação</p>
                    </div>
                    {formData.cadernoTecnicoUrl && (
                        <a 
                            href={formData.cadernoTecnicoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] font-black uppercase bg-muted px-4 py-2 rounded-full border border-border/50 text-slate-500 flex items-center gap-2 hover:bg-slate-200 transition-all"
                        >
                            <ExternalLink size={12} /> Abrir PDF Original
                        </a>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
                    {/* Render Image Display */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="border border-slate-100 rounded-3xl overflow-hidden aspect-video bg-muted/40 flex flex-col justify-center items-center p-4 relative group shadow-inner">
                            {formData.renderImageUrl ? (
                                <img 
                                    src={formData.renderImageUrl} 
                                    alt="Render 3D do Projeto" 
                                    className="object-cover w-full h-full rounded-2xl transition-all group-hover:scale-105 duration-500"
                                />
                            ) : (
                                <div className="text-center p-6 space-y-2">
                                    <ImageIcon size={48} className="mx-auto text-slate-300 opacity-50" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nenhum render 3D anexado</span>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-start gap-3">
                            <HelpCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                Este caderno técnico detalha o memorial descritivo da OS. A assinatura do caderno técnico garante que o corte de MDF e compras de ferragens seguirão rigorosamente os itens descritos abaixo.
                            </p>
                        </div>
                    </div>

                    {/* Technical Specifications */}
                    <div className="lg:col-span-2 space-y-6">
                        {formData.environmentsDetails && formData.environmentsDetails.length > 0 ? (
                            formData.environmentsDetails.map((env: any, envIdx: number) => (
                                <div key={envIdx} className="border border-slate-100 rounded-[32px] p-6 space-y-4 bg-slate-50/20 shadow-sm">
                                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-3">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-black text-sm uppercase text-slate-800 tracking-tight">{env.name}</span>
                                            <span className="text-[9px] font-extrabold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full uppercase">{env.type}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-700 italic">R$ {env.value ? env.value.toLocaleString('pt-BR') : '0,00'}</span>
                                    </div>

                                    {/* Sub-items loops */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* MDF Parts List */}
                                        {env.memorial?.mdfParts && env.memorial.mdfParts.length > 0 && (
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                    <Package size={10} /> Chapas de MDF
                                                </span>
                                                <ul className="space-y-1.5">
                                                    {env.memorial.mdfParts.map((part: any, idx: number) => (
                                                        <li key={idx} className="bg-card px-3 py-2 rounded-xl border border-slate-100 text-[10px] flex justify-between items-center">
                                                            <span className="font-bold text-slate-700">{part.partName} ({part.brandColor})</span>
                                                            <span className="text-slate-400 font-bold">{part.thickness} {part.quantity ? `• Qtd: ${part.quantity}` : ''}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Hardware Items List */}
                                        {env.memorial?.hardwareItems && env.memorial.hardwareItems.length > 0 && (
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                    <Wrench size={10} /> Ferragens & Puxadores
                                                </span>
                                                <ul className="space-y-1.5">
                                                    {env.memorial.hardwareItems.map((item: any, idx: number) => (
                                                        <li key={idx} className="bg-card px-3 py-2 rounded-xl border border-slate-100 text-[10px] flex justify-between items-center">
                                                            <span className="font-bold text-slate-700">{item.model}</span>
                                                            <span className="text-slate-400 font-bold uppercase">{item.brand} ({item.category})</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col justify-center items-center">
                                <FileText size={36} className="text-slate-300 mb-2 opacity-50" />
                                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Nenhum Ambiente Cadastrado</span>
                                <p className="text-[10px] text-slate-300 font-medium max-w-xs mt-0.5">
                                    Adicione ambientes e itens na aba Dossiê Técnico para preencher este caderno técnico.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CadernoTecnicoTab;
