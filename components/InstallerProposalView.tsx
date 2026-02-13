
import React, { useEffect, useState } from 'react';
import { Check, X, FileText, MapPin, Calendar, DollarSign, FolderOpen, User, Building2, Phone } from 'lucide-react';
import { Project, Environment } from '../types';

interface ProposalData {
    workName: string;
    clientName: string;
    envName: string;
    value: number;
    date: string;
    installerName: string;
    cloudLink?: string;
    obs?: string;
    adminPhone?: string; // To reply back
}

const InstallerProposalView: React.FC = () => {
    const [data, setData] = useState<ProposalData | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const encoded = params.get('data');
            if (!encoded) {
                setError('Dados da proposta não encontrados no link.');
                return;
            }

            // Decode Base64 (handling potential formatting issues)
            const jsonStr = atob(encoded);
            const parsed = JSON.parse(jsonStr);
            setData(parsed);
        } catch (err) {
            console.error(err);
            setError('Link inválido ou expirado.');
        }
    }, []);

    const handleResponse = (accepted: boolean) => {
        if (!data) return;

        // Default admin phone if not provided (Company Phone)
        const targetPhone = data.adminPhone || '5511999998888';

        // Format message
        const status = accepted ? 'ACEITO' : 'RECUSO';
        const icon = accepted ? '✅' : '❌';

        let text = `*RESPOSTA DE PROPOSTA - HYPADO*\n\n`;
        text += `${icon} Eu *${status}* a proposta de empreita.\n\n`;
        text += `🏢 *Obra:* ${data.workName}\n`;
        text += `🔨 *Ambiente:* ${data.envName}\n`;
        text += `💰 *Valor:* R$ ${data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;

        if (!accepted) {
            text += `\n💬 *Motivo:* (Escreva aqui o motivo ou contraproposta)`;
        }

        const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X size={32} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">Erro no Link</h2>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin text-amber-500"><FileText size={40} /></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
            <div className="max-w-lg mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">

                {/* Header */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500"></div>
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <FileText size={32} className="text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Proposta de Serviço</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Hypado Planejados</p>
                </div>

                <div className="p-8 space-y-8">

                    {/* Welcome */}
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-slate-700">Olá, <span className="text-slate-900 font-black uppercase">{data.installerName}</span></h2>
                        <p className="text-slate-500 text-sm mt-1">Temos uma nova oportunidade para você.</p>
                    </div>

                    {/* Details Card */}
                    <div className="bg-slate-50 rounded-[32px] p-6 space-y-4 border border-slate-100 shadow-inner">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl text-slate-900 shadow-sm"><Building2 size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Obra</p>
                                <p className="text-sm font-bold text-slate-900">{data.workName}</p>
                                <p className="text-xs text-slate-500">{data.clientName}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl text-slate-900 shadow-sm"><MapPin size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ambiente</p>
                                <p className="text-sm font-bold text-slate-900">{data.envName}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl text-slate-900 shadow-sm"><Calendar size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Previsão</p>
                                <p className="text-sm font-bold text-slate-900">{data.date}</p>
                            </div>
                        </div>

                        {data.obs && (
                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-xs text-amber-800 italic">
                                <span className="font-bold not-italic mr-1">Obs:</span> {data.obs}
                            </div>
                        )}
                    </div>

                    {/* Value */}
                    <div className="bg-emerald-50 rounded-[32px] p-8 text-center border border-emerald-100">
                        <p className="text-xs font-black uppercase text-emerald-600 tracking-widest mb-1">Valor da Proposta</p>
                        <div className="flex items-center justify-center gap-1 text-emerald-900">
                            <span className="text-lg font-bold">R$</span>
                            <span className="text-4xl font-black tracking-tighter">{data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        {data.cloudLink && (
                            <a href={data.cloudLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-4 rounded-[24px] uppercase text-xs tracking-widest transition-all">
                                <FolderOpen size={18} />
                                Ver Projetos (Nuvem)
                            </a>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button onClick={() => handleResponse(false)} className="bg-red-50 hover:bg-red-100 text-red-500 font-black py-4 rounded-[24px] uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2">
                                <X size={18} /> Recusar
                            </button>
                            <button onClick={() => handleResponse(true)} className="bg-slate-900 hover:bg-emerald-600 text-white font-black py-4 rounded-[24px] uppercase text-xs tracking-widest shadow-2xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                                <Check size={18} /> Aceitar
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default InstallerProposalView;
