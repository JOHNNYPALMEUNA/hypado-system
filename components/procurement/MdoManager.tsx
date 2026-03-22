import React, { useState, useMemo } from 'react';
import { 
  Users, Hammer, DollarSign, MessageSquare, 
  Sparkles, Check, AlertCircle, Calendar, Plus, 
  Briefcase, HardHat, UserCheck, MoreHorizontal,
  PlusCircle, RefreshCw, CheckCircle2
} from 'lucide-react';
import { Project, Supplier, Installer, Company, Expense } from '../../types';

interface MdoManagerProps {
  projects: Project[];
  installers: Installer[];
  suppliers: Supplier[];
  updateProject: (p: Project) => Promise<void>;
  company: Company;
  mode: 'apontamento' | 'diario';
}

const MdoManager: React.FC<MdoManagerProps> = ({
  projects,
  installers,
  suppliers,
  updateProject,
  company,
  mode
}) => {
  // Shared States
  const [selectedOSId, setSelectedOSId] = useState('');
  const [mdoValues, setMdoValues] = useState<Record<string, string>>({});
  const [mdoInstallers, setMdoInstallers] = useState<Record<string, string>>({});
  const [bulkInstallerId, setBulkInstallerId] = useState('');
  
  // Diary States
  const [newDiaryEntry, setNewDiaryEntry] = useState({ 
    personId: '', 
    projectId: '', 
    date: new Date().toISOString().split('T')[0], 
    value: '', 
    description: '' 
  });

  const selectedOS = useMemo(() => projects.find(p => p.id === selectedOSId), [selectedOSId, projects]);

  // --- NEGOTIATION FLOW HANDLERS ---
  const handleSendProposal = async (targetEnvName: string) => {
    const installerId = mdoInstallers[targetEnvName];
    if (!selectedOSId || !selectedOS) return;
    if (!installerId) {
      alert("Selecione o Montador para enviar a proposta.");
      return;
    }

    const groupedEnvs = (selectedOS.environmentsDetails || []).filter(env => 
      mdoInstallers[env.name] === installerId && 
      parseFloat(mdoValues[env.name] || '0') > 0 && 
      !env.isMdoAuthorized
    );

    if (groupedEnvs.length === 0) {
      alert("Nenhum valor válido encontrado para os ambientes deste montador.");
      return;
    }

    const installer = installers.find(i => i.id === installerId);
    const installerName = installer?.name || 'Montador';
    const totalValue = groupedEnvs.reduce((acc, env) => acc + parseFloat(mdoValues[env.name] || '0'), 0);

    const newEnvDetails = selectedOS.environmentsDetails.map(env => {
      const isPartofGroup = groupedEnvs.some(ge => ge.name === env.name);
      if (isPartofGroup) {
        return {
          ...env,
          mdoStatus: 'Enviado',
          authorizedMdoValue: parseFloat(mdoValues[env.name] || '0'),
          assignedInstallerId: installerId,
          isMdoAuthorized: false
        };
      }
      return env;
    });

    await updateProject({ ...selectedOS, environmentsDetails: newEnvDetails as any } as Project);

    // Smart Link Generation
    const proposalData = {
      workName: selectedOS.workName,
      envs: groupedEnvs.map(env => ({ name: env.name, value: parseFloat(mdoValues[env.name] || '0') })),
      totalValue,
      projectId: selectedOSId,
      installerId: installerId,
      adminPhone: company.phone?.replace(/\D/g, '') || '',
      address: selectedOS.workAddress, // Added address
    };
    
    const encodedData = window.btoa(unescape(encodeURIComponent(JSON.stringify(proposalData))));
    const smartLink = `${window.location.origin}/?mode=proposal&data=${encodeURIComponent(encodedData)}`;

    const text = `*PROPOSTA DE EMPREITA - HYPADO*\n\n` +
      `👷 Olá *${installerName}*,\n` +
      `Nova oportunidade na obra *${selectedOS.workName}*.\n` +
      `💰 *VALOR TOTAL:* R$ ${totalValue.toLocaleString('pt-BR')}\n\n` +
      `👉 *Toque no link para ACEITAR:*\n${smartLink}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleRegisterResponse = async (envName: string, response: 'Aceito' | 'Recusado') => {
    if (!selectedOSId || !selectedOS) return;
    const env = selectedOS.environmentsDetails.find(e => e.name === envName);
    if (!env) return;

    let newExpenses = selectedOS.expenses || [];
    let isAuth = false;

    if (response === 'Aceito') {
      isAuth = true;
      const newExp: Expense = {
        id: `mdo-${Date.now()}-${envName}`,
        description: `MDO Ambiente: ${envName}`,
        value: env.authorizedMdoValue || 0,
        date: new Date().toISOString().split('T')[0],
        category: 'Montagem'
      };
      newExpenses = [...newExpenses, newExp];
    }

    const newEnvDetails = selectedOS.environmentsDetails.map(e => 
      e.name === envName ? { ...e, mdoStatus: response, isMdoAuthorized: isAuth } : e
    );

    await updateProject({ ...selectedOS, environmentsDetails: newEnvDetails as any, expenses: newExpenses } as Project);
    alert(response === 'Aceito' ? "EMPREITA REGISTRADA!" : "PROPOSTA RECUSADA!");
  };

  const handleInternalTeamAssignment = async (envName: string) => {
    if (!selectedOSId || !selectedOS) return;
    const env = selectedOS.environmentsDetails.find(e => e.name === envName);
    if (!env) return;

    const selectedInstallerId = mdoInstallers[env.name] || env.assignedInstallerId;
    if (!selectedInstallerId) return alert("Selecione um profissional.");

    const rawValue = mdoValues[env.name] || '0';
    const declaredValue = parseFloat(rawValue) || 0;

    // Record Expense for Internal Team (OS value fall-in)
    const newExp: Expense = {
      id: `mdo-${Date.now()}-${envName}`,
      description: `MDO Ambiente: ${envName}`,
      value: declaredValue,
      date: new Date().toISOString().split('T')[0],
      category: 'Montagem'
    };

    const newEnvDetails = selectedOS.environmentsDetails.map(e => 
      e.name === envName ? { 
        ...e, 
        mdoStatus: 'Aceito' as const, 
        isMdoAuthorized: true, 
        assignedInstallerId: selectedInstallerId,
        authorizedMdoValue: declaredValue 
      } : e
    );

    await updateProject({ 
        ...selectedOS, 
        environmentsDetails: newEnvDetails as any,
        expenses: [...(selectedOS.expenses || []), newExp]
    } as Project);
    alert("REGISTRO INTERNO CONCLUÍDO!");
  };

  const handleUndoAuthorization = async (envName: string) => {
    if (!selectedOSId || !selectedOS) return;
    const pwd = prompt('Digite a senha de administrador:');
    if (pwd !== 'admin') {
        alert('Senha incorreta!');
        return;
    }
    if (!confirm(`Deseja desfazer o apontamento do ambiente "${envName}"? O lançamento financeiro será removido.`)) return;

    const newExpenses = (selectedOS.expenses || []).filter(exp => 
        !(exp.description.includes(`MDO Ambiente: ${envName}`) && exp.category === 'Montagem')
    );

    const newEnvDetails = selectedOS.environmentsDetails.map(env => 
        env.name === envName ? { 
            ...env, 
            isMdoAuthorized: false, 
            mdoStatus: 'Pendente' as const 
        } : env
    );

    await updateProject({ ...selectedOS, environmentsDetails: newEnvDetails as any, expenses: newExpenses } as Project);
    alert("APONTAMENTO REVERTIDO!");
  };

  const handleCalculateAICommission = async () => {
    if (!selectedOS) return;

    const totalPieces = selectedOS.environmentsDetails.reduce((acc, env) => acc + (env.memorial?.partsCount || 0), 0);
    
    if (totalPieces === 0) {
      if (!confirm("AVISO: Nenhuma quantidade de peças foi detectada nesta obra. A IA fará uma divisão IGUAL entre os ambientes. Deseja continuar?")) return;
    } else {
      if (!confirm(`A IA irá sugerir valores baseados em 10% da obra (Orçamento: R$ ${(selectedOS.value * 0.1).toLocaleString()}), distribuídos proporcionalmente por ${totalPieces} peças. Continuar?`)) return;
    }

    const budget = (selectedOS.value || 0) * 0.10;
    
    const newEnvDetails = selectedOS.environmentsDetails.map(env => {
      let share = 0;
      if (totalPieces > 0) {
        share = (env.memorial?.partsCount || 0) / totalPieces;
      } else {
        // Fallback to even split if no pieces are defined
        share = 1 / selectedOS.environmentsDetails.length;
      }
      
      const amount = budget * share;
      return { ...env, commissionValue: Number(amount.toFixed(2)), authorizedMdoValue: Number(amount.toFixed(2)) };
    });

    await updateProject({ ...selectedOS, environmentsDetails: newEnvDetails as any } as Project);
    
    const newVals: Record<string, string> = {};
    newEnvDetails.forEach(e => newVals[e.name] = (e.commissionValue || 0).toFixed(2));
    setMdoValues(newVals);
    alert("CÁLCULO PROPORCIONAL CONCLUÍDO!");
  };

  const handleLaunchDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newDiaryEntry.value);
    if (!newDiaryEntry.personId || !newDiaryEntry.projectId || val <= 0) return alert("Preencha todos os campos.");

    const p = projects.find(proj => proj.id === newDiaryEntry.projectId);
    if (p) {
        const newExp = {
            id: `diary-${Date.now()}`,
            description: `DIÁRIA: ${newDiaryEntry.description || 'Montagem/Serviço'}`,
            value: val,
            date: newDiaryEntry.date,
            category: 'Montagem'
        };
        await updateProject({ ...p, expenses: [...(p.expenses || []), newExp] } as Project);
        setNewDiaryEntry({ ...newDiaryEntry, value: '', description: '' });
        alert("Diária lançada com sucesso!");
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      {mode === 'apontamento' ? (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Apontamento de Empreitas</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Definação de valores e negociação com montadores</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <select 
                        title="Selecione uma Obra"
                        className="flex-1 md:w-80 p-5 rounded-[24px] bg-slate-900 text-white border-none outline-none font-bold text-sm shadow-xl focus:ring-4 focus:ring-slate-900/20"
                        value={selectedOSId}
                        onChange={e => setSelectedOSId(e.target.value)}
                    >
                        <option value="">Selecione uma OS para Gestão...</option>
                        {projects.filter(p => !['Finalizada', 'Cancelada'].includes(p.currentStatus)).map(p => (
                            <option key={p.id} value={p.id}>{p.workName} ({p.clientName})</option>
                        ))}
                    </select>
                    {selectedOS && (
                        <button 
                            onClick={handleCalculateAICommission}
                            className="p-5 bg-amber-500 text-foreground rounded-[24px] hover:bg-slate-900 hover:text-white transition-all shadow-lg active:scale-95 group"
                            title="Sugestão de Valor via IA"
                        >
                            <Sparkles size={24} className="group-hover:animate-pulse" />
                        </button>
                    )}
                </div>
            </div>

            {selectedOS ? (
                <div className="grid grid-cols-1 gap-4">
                    {selectedOS.environmentsDetails?.map((env, idx) => (
                        <div key={idx} className={`bg-card p-4 md:p-8 rounded-[40px] border transition-all flex flex-col md:flex-row items-center gap-8 ${env.isMdoAuthorized ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-100 shadow-sm'}`}>
                             <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-lg">
                                <Hammer size={28} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h5 className="text-xl font-black text-foreground uppercase italic leading-none mb-2">{env.name}</h5>
                                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                                        <Briefcase size={12} /> {env.memorial?.partsCount || 0} Peças
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                                        <DollarSign size={12} /> Sugestão IA: R$ {(env.commissionValue || 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                <select 
                                    title="Selecionar Profissional"
                                    className="w-full md:w-60 p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-xs"
                                    value={mdoInstallers[env.name] || env.assignedInstallerId || ''}
                                    onChange={e => setMdoInstallers({...mdoInstallers, [env.name]: e.target.value})}
                                >
                                    <option value="">Selecionar Profissional...</option>
                                    {installers.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}
                                </select>

                                <div className="relative w-full md:w-40">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                    <input 
                                        type="number" 
                                        placeholder="Valor"
                                        title="Valor do Ambiente"
                                        className="w-full p-4 pl-10 rounded-2xl bg-slate-50 border-none outline-none font-black text-sm text-center"
                                        value={mdoValues[env.name] !== undefined ? mdoValues[env.name] : (env.authorizedMdoValue || '')}
                                        onChange={e => setMdoValues({...mdoValues, [env.name]: e.target.value})}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    {env.isMdoAuthorized ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-3 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                                                <CheckCircle2 size={18} /> Autorizado
                                            </div>
                                            <button 
                                                onClick={() => handleUndoAuthorization(env.name)}
                                                className="p-4 bg-red-100 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-md group"
                                                title="Desfazer Apontamento"
                                            >
                                                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => handleSendProposal(env.name)}
                                                className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-md"
                                                title="Enviar Proposta WhatsApp"
                                            >
                                                <MessageSquare size={20} />
                                            </button>
                                            <button 
                                                onClick={() => handleInternalTeamAssignment(env.name)}
                                                className="p-4 bg-slate-200 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-md"
                                                title="Equipe Interna (Lançamento Direto)"
                                            >
                                                <UserCheck size={20} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center text-slate-400 italic font-medium bg-slate-50 rounded-[48px] border border-dashed border-slate-200">
                    Selecione uma Obra acima para gerenciar os pagamentos de montagem.
                </div>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                    <h4 className="text-3xl font-black text-foreground italic uppercase tracking-tighter leading-none mb-4">Lançamento de Diária</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">Use para montagens especiais ou ajudantes eventuais</p>
                    
                    <form onSubmit={handleLaunchDiary} className="space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Profissional / Beneficiário</label>
                            <select 
                                title="Profissional / Beneficiário"
                                className="w-full p-6 bg-slate-50 rounded-[24px] border-none outline-none font-bold shadow-inner"
                                value={newDiaryEntry.personId}
                                onChange={e => setNewDiaryEntry({...newDiaryEntry, personId: e.target.value})}
                            >
                                <option value="">Quem recebeu...</option>
                                {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Obra de Origem</label>
                            <select 
                                title="Obra de Origem"
                                className="w-full p-6 bg-slate-50 rounded-[24px] border-none outline-none font-bold shadow-inner"
                                value={newDiaryEntry.projectId}
                                onChange={e => setNewDiaryEntry({...newDiaryEntry, projectId: e.target.value})}
                            >
                                <option value="">Vincular custo à obra...</option>
                                {projects.filter(p => !['Finalizada', 'Cancelada'].includes(p.currentStatus)).map(p => <option key={p.id} value={p.id}>{p.workName}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Data</label>
                                <input 
                                    title="Data da Diária"
                                    type="date" 
                                    className="w-full p-6 bg-slate-50 rounded-[24px] border-none outline-none font-bold shadow-inner"
                                    value={newDiaryEntry.date}
                                    onChange={e => setNewDiaryEntry({...newDiaryEntry, date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Valor (R$)</label>
                                <input 
                                    title="Valor da Diária"
                                    placeholder="000.00"
                                    type="number" 
                                    className="w-full p-6 bg-slate-900 text-white rounded-[24px] border-none outline-none font-black text-xl shadow-inner text-center"
                                    value={newDiaryEntry.value}
                                    onChange={e => setNewDiaryEntry({...newDiaryEntry, value: e.target.value})}
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full py-6 bg-amber-500 text-foreground rounded-[24px] font-black uppercase text-xs tracking-[0.3em] shadow-xl hover:bg-slate-900 hover:text-white transition-all active:scale-95">
                            Registrar Diária no Financeiro
                        </button>
                    </form>
                </div>
            </div>
            {/* Visual Helper/Stats */}
            <div className="bg-slate-900 p-12 rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col justify-end">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <Calendar size={80} className="text-white/20 mb-8" />
                <h5 className="text-white text-4xl font-black uppercase italic tracking-tighter leading-none mb-4">Gestão de Equipe Interna</h5>
                <p className="text-slate-400 font-bold leading-relaxed max-w-sm">
                    O lançamento de diárias alimenta automaticamente o DRE de cada obra, permitindo o controle preciso da lucratividade por projeto em tempo real.
                </p>
                <div className="mt-12 flex items-center gap-6">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Média Mensal</p>
                        <p className="text-white font-black text-2xl tracking-tighter italic">R$ 14.250</p>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MdoManager;
