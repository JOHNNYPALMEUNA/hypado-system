
import React, { useState, useEffect } from 'react';
import { Project, ChecklistItem, QualityReport, Installer, TechnicalAssistance } from '../types';
import { AXES, INITIAL_CHECKLIST } from '../mockData';
import { Check, X, Camera, ShieldCheck, Trophy, Sparkles, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  installers: Installer[];
  setInstallers: React.Dispatch<React.SetStateAction<Installer[]>>;
  assistances: TechnicalAssistance[];
  setAssistances: React.Dispatch<React.SetStateAction<TechnicalAssistance[]>>;
}

const QualityView: React.FC<Props> = ({ projects, setProjects, installers, setInstallers, assistances, setAssistances }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST.items);
  const [score, setScore] = useState(10);
  const [bonus, setBonus] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // Quality Control State
  const [auditStatus, setAuditStatus] = useState<'Pendente' | 'Aprovado' | 'Reprovado'>('Pendente');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [evidencePhoto, setEvidencePhoto] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [returnDate, setReturnDate] = useState('');

  useEffect(() => {
    if (selectedProject) {
      // Load existing quality report if available, else reset
      if (selectedProject.qualityReport) {
        setChecklist(selectedProject.qualityReport.items);
        setScore(selectedProject.qualityReport.score);
        setBonus(selectedProject.qualityReport.bonusAmount);
        setAuditStatus(selectedProject.qualityReport.status);
        setInspectorName(selectedProject.qualityReport.inspectorName);
        setInspectionDate(selectedProject.qualityReport.date);
        setEvidencePhoto(selectedProject.qualityReport.evidencePhotoUrl || '');
        setProblemDescription(selectedProject.qualityReport.problemDescription || '');
      } else {
        setChecklist(INITIAL_CHECKLIST.items.map(item => ({ ...item, passed: null })));
        setScore(10);
        setBonus(0);
        setAuditStatus('Pendente');
        setInspectorName('');
        setInspectionDate(new Date().toISOString().split('T')[0]);
        setEvidencePhoto('');
        setProblemDescription('');
        setReturnDate('');
      }
    }
  }, [selectedProject?.id]);

  const calculateResults = (items: ChecklistItem[]) => {
    const totalItems = items.length;
    const passedItems = items.filter(i => i.passed === true).length;
    const answeredItems = items.filter(i => i.passed !== null).length;

    if (answeredItems === 0) return { score: 10, bonus: 0 };

    const newScore = (passedItems / totalItems) * 10;
    const baseBonus = 500;
    const newBonus = newScore === 10 ? baseBonus : (newScore >= 8 ? baseBonus * 0.5 : 0);

    return { score: Number(newScore.toFixed(1)), bonus: newBonus };
  };

  const handleToggle = (id: string, passed: boolean) => {
    const updated = checklist.map(item => item.id === id ? { ...item, passed } : item);
    setChecklist(updated);
    const results = calculateResults(updated);
    setScore(results.score);
    setBonus(results.bonus);
  };

  const handleFinishInspection = () => {
    if (!selectedProject) return;

    // 1. Check for Pending Status
    if (auditStatus === 'Pendente') {
      alert('Selecione o STATUS DA QUALIDADE (Aprovado ou Reprovado) antes de continuar.');
      return;
    }

    const unanswered = checklist.filter(i => i.passed === null);
    if (unanswered.length > 0) {
      alert(`AUDITORIA INCOMPLETA!\n\nRestam ${unanswered.length} itens a serem verificados antes da finalização.`);
      return;
    }

    setIsFinishing(true);

    const report: QualityReport = {
      id: `qr-${Date.now()}`,
      projectId: selectedProject.id,
      installerId: selectedProject.installerId || '',
      date: inspectionDate,
      score: score,
      bonusAmount: bonus,
      inspectorName: inspectorName || 'Admin',
      items: checklist,
      status: auditStatus,
      evidencePhotoUrl: evidencePhoto,
      problemDescription: problemDescription,
      technicianId: selectedProject.installerId,
      returnDate: returnDate
    };

    // Logic for Rejection (Create Ticket)
    if (auditStatus === 'Reprovado') {
      if (!problemDescription || !returnDate) {
        alert('Preencha a descrição do problema e a data de retorno para reprovar.');
        setIsFinishing(false);
        return;
      }

      const newTicket: TechnicalAssistance = {
        id: `ta-${Date.now()}`,
        clientId: selectedProject.clientId,
        clientName: selectedProject.clientName,
        projectId: selectedProject.id,
        workName: selectedProject.workName,
        requestDate: new Date().toISOString().split('T')[0],
        status: 'Aberto',
        reportedProblem: `REPROVAÇÃO ${inspectorName ? 'POR ' + inspectorName : ''}: ${problemDescription}\n\nITENS REPROVADOS:\n` +
          checklist.filter(i => i.passed === false).map(i => `- ${i.label}`).join('\n'),
        technicianId: selectedProject.installerId,
        returnDate: returnDate
      };

      setAssistances(prev => [...prev, newTicket]);
      localStorage.setItem('chamadoAberto', 'true'); // SET FLAG

      alert(`AUDITORIA REPROVADA!\n\nChamado de Assistência Técnica (ID: ${newTicket.id}) aberto com sucesso.\n\nA obra NÃO foi finalizada e permanece em Vistoria até a resolução.`);
      setIsFinishing(false);
      setSelectedProject(null);
      return;
    }

    // Logic for Approval
    if (auditStatus === 'Aprovado') {
      // Check Lock
      if (localStorage.getItem('chamadoAberto') === 'true') {
        alert('⛔ AÇÃO BLOQUEADA\n\nExiste um chamado de assistência em aberto (Flag Ativa). Você deve resolver o chamado antes de aprovar a obra.');
        setIsFinishing(false);
        return;
      }

      // Update Project
      setProjects(prev => prev.map(p => {
        if (p.id === selectedProject.id) {
          return {
            ...p,
            currentStatus: 'Finalizada',
            qualityReport: report,
            history: [...p.history, { status: 'Finalizada', timestamp: new Date().toISOString() }]
          };
        }
        return p;
      }));

      // Update Installer Metrics
      const installerIds = Array.from(new Set(selectedProject.environmentsDetails.map(e => e.assignedInstallerId).filter(Boolean)));
      setInstallers(prev => prev.map(inst => {
        if (installerIds.includes(inst.id)) {
          const newCount = inst.installationsCount + 1;
          const newAverage = ((inst.averageRating * (inst.installationsCount || 0)) + score) / newCount;
          return {
            ...inst,
            installationsCount: newCount,
            averageRating: Number(newAverage.toFixed(1)),
            totalBonus: inst.totalBonus + bonus
          };
        }
        return inst;
      }));

      setTimeout(() => {
        alert(`AUDITORIA APROVADA!\n\nScore: ${score}/10\nBônus Gerado: R$ ${bonus.toFixed(2)}\nO projeto foi arquivado.`);
        setIsFinishing(false);
        setSelectedProject(null);
      }, 1500);
    }
  };

  const resetForm = () => {
    setSelectedProject(null);
    setScore(10);
    setBonus(0);
    setAuditStatus('Pendente');
    setInspectorName('');
    setEvidencePhoto('');
    setProblemDescription('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">Qualidade & Encerramento</h3>
          <p className="text-slate-500 font-bold text-sm uppercase italic">Auditoria Técnica de Acabamento e Mão de Obra</p>
        </div>
        {selectedProject && (
          <button onClick={resetForm} className="text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest border border-slate-200 px-5 py-2.5 rounded-xl transition-all">
            Cancelar Vistoria
          </button>
        )}
      </div>

      {!selectedProject ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.filter(p => p.currentStatus === 'Vistoria').map(project => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="p-8 bg-white border border-slate-200 rounded-[32px] text-left hover:border-amber-500 transition-all shadow-sm group active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-slate-900 text-amber-500 rounded-2xl group-hover:bg-amber-500 group-hover:text-slate-900 transition-all shadow-lg">
                  <ShieldCheck size={28} />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 italic">Vistoria Requerida</span>
                </div>
              </div>
              <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2">{project.workName}</h4>
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest italic">{project.clientName}</p>
            </button>
          ))}
          {projects.filter(p => p.currentStatus === 'Vistoria').length === 0 && (
            <div className="col-span-full py-24 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[40px] opacity-60">
              <Check size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-black uppercase italic text-sm tracking-widest">Aguardando obras em fase de vistoria...</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="bg-slate-900 text-white p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block italic shadow-lg">Checklist Final</span>
                <h4 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{selectedProject.workName}</h4>
              </div>
              <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 text-right min-w-[200px]">
                <div className="flex items-center gap-3 text-amber-500 mb-1 justify-end">
                  <Trophy size={28} />
                  <span className="text-6xl font-black tracking-tighter italic">{score}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic mt-2">Bônus MDO: R$ {bonus.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-12 bg-slate-50/20">
            {/* INSPECTION DATA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nome do Inspetor</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-lg py-2 px-4 outline-none focus:border-amber-500"
                  placeholder="Seu Nome"
                  value={inspectorName}
                  onChange={e => setInspectorName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Data da Vistoria</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-lg py-2 px-4 outline-none focus:border-amber-500"
                  value={inspectionDate}
                  onChange={e => setInspectionDate(e.target.value)}
                />
              </div>
            </div>

            {AXES.map(axis => (
              <div key={axis} className="space-y-6">
                <h5 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.3em] border-b-2 border-slate-900 pb-3 italic">{axis}</h5>
                <div className="grid grid-cols-1 gap-4">
                  {checklist.filter(item => item.axis === axis).map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-6 bg-white rounded-[24px] border transition-all ${item.passed === null ? 'border-slate-100' : (item.passed ? 'border-emerald-500/30' : 'border-red-500/30')}`}>
                      <span className="font-black text-slate-800 uppercase italic text-sm tracking-tight">{item.label}</span>
                      <div className="flex gap-3">
                        <button onClick={() => handleToggle(item.id, true)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${item.passed === true ? 'bg-emerald-600 text-white shadow-xl' : 'bg-slate-50 text-slate-300'}`}><Check size={28} /></button>
                        <button onClick={() => handleToggle(item.id, false)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${item.passed === false ? 'bg-red-600 text-white shadow-xl' : 'bg-slate-50 text-slate-300'}`}><X size={28} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t-2 border-dashed border-slate-200 pt-8 space-y-8">
              <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Status da Qualidade</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Decisão Final</label>
                  <select
                    value={auditStatus}
                    onChange={(e) => setAuditStatus(e.target.value as any)}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wider outline-none border transition-all appearance-none cursor-pointer ${auditStatus === 'Aprovado' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' :
                      auditStatus === 'Reprovado' ? 'bg-red-100 border-red-300 text-red-800' :
                        'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                  >
                    <option value="Pendente">Selecione o Status...</option>
                    <option value="Aprovado">Aprovado (Liberar)</option>
                    <option value="Reprovado">Reprovado (Assistência)</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Relato Visual (Upload)</label>
                  <label className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-all group">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 group-hover:text-amber-500">
                      <Camera size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 uppercase">{evidencePhoto ? 'Foto Anexada' : 'Adicionar Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEvidencePhoto(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                    />
                  </label>
                  {evidencePhoto && (
                    <div className="mt-2 w-full h-32 rounded-xl overflow-hidden border border-slate-200">
                      <img src={evidencePhoto} className="w-full h-full object-cover" alt="Evidência" />
                    </div>
                  )}
                </div>
              </div>

              {/* REJECTION LOGIC */}
              {auditStatus === 'Reprovado' && (
                <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 animate-in slide-in-from-top-4">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h5 className="text-lg font-black text-red-800 uppercase italic">Reprovação & Assistência</h5>
                      <p className="text-sm text-red-600 font-medium">É necessário detalhar o problema para abrir o chamado técnico.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <textarea
                      className="w-full p-4 bg-white border border-red-200 rounded-xl text-red-900 placeholder:text-red-300 font-medium outline-none focus:border-red-400 resize-none h-32"
                      placeholder="Descreva o motivo da reprovação..."
                      value={problemDescription}
                      onChange={e => setProblemDescription(e.target.value)}
                    />
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-red-400 mb-1">Data de Retorno</label>
                      <input
                        type="date"
                        required
                        className="w-full bg-white border border-red-200 text-red-900 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-red-500"
                        value={returnDate}
                        onChange={e => setReturnDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleFinishInspection}
              disabled={isFinishing || auditStatus === 'Pendente'}
              className={`w-full py-8 text-white font-black uppercase tracking-[0.2em] rounded-[32px] transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${auditStatus === 'Reprovado' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-emerald-600'
                }`}
            >
              {isFinishing ? (
                <RefreshCw className="animate-spin" size={28} />
              ) : (
                <>
                  {auditStatus === 'Reprovado' ? (
                    <><AlertTriangle size={32} /> Reprovar & Abrir Chamado</>
                  ) : (
                    <><ShieldCheck size={32} /> Finalizar Auditoria</>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* HISTÓRICO DE VISTORIAS FINALIZADAS */}
      <div className="pt-12 border-t border-slate-200">
        <h4 className="text-xl font-black text-slate-400 uppercase italic tracking-tight mb-6 flex items-center gap-2">
          <CheckCircle2 /> Histórico de Vistorias Finalizadas
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 hover:opacity-100 transition-opacity">
          {projects.filter(p => p.currentStatus === 'Finalizada' && p.qualityReport).map(project => (
            <div key={project.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h5 className="font-black text-slate-800 uppercase italic">{project.workName}</h5>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{project.clientName}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-black text-emerald-500 italic">{project.qualityReport?.score}</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Score</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-500 font-medium border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span>Data Vistoria:</span>
                  <span className="font-bold text-slate-700">{project.qualityReport?.date ? new Date(project.qualityReport.date).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Inspetor:</span>
                  <span className="font-bold text-slate-700">{project.qualityReport?.inspectorName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bônus Gerado:</span>
                  <span className="font-bold text-emerald-600">R$ {project.qualityReport?.bonusAmount?.toFixed(2)}</span>
                </div>
              </div>

              {project.qualityReport?.evidencePhotoUrl && (
                <div className="mt-4 h-24 rounded-lg bg-slate-200 overflow-hidden relative group">
                  <img src={project.qualityReport.evidencePhotoUrl} className="w-full h-full object-cover" alt="Evidência" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-[10px] font-bold uppercase tracking-widest">Ver Foto</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          {projects.filter(p => p.currentStatus === 'Finalizada' && p.qualityReport).length === 0 && (
            <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-slate-400 font-bold uppercase text-xs tracking-wider">Nenhuma vistoria finalizada no histórico.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QualityView;
