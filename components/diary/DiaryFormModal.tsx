import React, { useState, useEffect } from 'react';
import { 
  X, 
  Info, 
  FileWarning, 
  AlertTriangle, 
  AlertOctagon, 
  Camera, 
  CheckCircle2 
} from 'lucide-react';
import { Project, DailyLog, Installer } from '../../types';

interface DiaryFormModalProps {
  showLogModal: boolean;
  setShowLogModal: (show: boolean) => void;
  selectedProject: Project | null;
  isManualEntry: boolean;
  projects: Project[];
  installers: Installer[];
  currentUserEmail: string | null;
  addDailyLog: (log: DailyLog) => Promise<void>;
}

const DiaryFormModal: React.FC<DiaryFormModalProps> = ({
  showLogModal,
  setShowLogModal,
  selectedProject,
  isManualEntry,
  projects,
  installers,
  currentUserEmail,
  addDailyLog
}) => {
  const [category, setCategory] = useState<DailyLog['category']>('Registro Diário');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [specificProjectId, setSpecificProjectId] = useState('');
  const [workName, setWorkName] = useState('');

  // Rework details
  const [partName, setPartName] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [thickness, setThickness] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState('1');

  // Specific forms
  const [missingMaterialName, setMissingMaterialName] = useState('');
  const [absentInstallerId, setAbsentInstallerId] = useState('');

  useEffect(() => {
    if (showLogModal) {
      if (selectedProject) {
        setSpecificProjectId(selectedProject.id);
        setWorkName(selectedProject.workName);
      } else if (isManualEntry) {
        setSpecificProjectId('manual');
        setWorkName('');
      }
    }
  }, [showLogModal, selectedProject, isManualEntry]);

  const handleCloseModal = () => {
    setShowLogModal(false);
    setCategory('Registro Diário');
    setDescription('');
    setPhotoUrl('');
    setPartName('');
    setWidth('');
    setHeight('');
    setThickness('');
    setColor('');
    setQuantity('1');
    setMissingMaterialName('');
    setAbsentInstallerId('');
  };

  const handleSaveLog = async () => {
    if ((isManualEntry || !selectedProject) && specificProjectId === 'manual' && !workName) {
      alert('Por favor, identifique a obra ou nome do projeto.');
      return;
    }

    const newLog: DailyLog = {
      id: `log-${Date.now()}`,
      projectId: specificProjectId,
      workName: selectedProject ? selectedProject.workName : workName,
      date: new Date().toISOString(),
      author: currentUserEmail || 'Usuário',
      category: category,
      description: description,
      photoUrl: photoUrl || undefined,
      status: (category === 'Falta de Peça' || category === 'Peça Danificada' || category === 'Falta de Material') ? 'Pendente' : 'Registrado',
      createdAt: new Date().toISOString()
    };

    if (category === 'Falta de Peça' || category === 'Peça Danificada') {
      newLog.reworkDetails = [{
        partName,
        width: Number(width),
        height: Number(height),
        thickness,
        color,
        quantity: Number(quantity),
        reason: category
      }];
      newLog.description = `[SOLICITAÇÃO REFAZIMENTO]: ${partName} (${width}x${height}mm, ${color}). Motivo: ${category}. Obs: ${description}`;
    } else if (category === 'Falta de Material') {
      newLog.description = `[FALTA MATERIAL]: ${missingMaterialName}. Obs: ${description}`;
    } else if (category === 'Montador Ausente') {
      const installerName = installers.find(i => i.id === absentInstallerId)?.name || 'Não Identificado';
      newLog.description = `[AUSÊNCIA]: Montador ${installerName}. Motivo: ${description}`;
    }

    try {
      await addDailyLog(newLog);
      handleCloseModal();
    } catch (err) {
      console.error('Error saving log:', err);
    }
  };

  if (!showLogModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300 border border-border">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-muted/50">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
              <Info className="text-emerald-500" /> Registrar Ocorrência
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-bold">
              {selectedProject ? `Obra: ${selectedProject.workName}` : isManualEntry ? 'Registro de Ocorrência Avulsa' : ''}
            </p>
          </div>
          <button title="Fechar Modal" onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Form Context */}
          {!selectedProject && isManualEntry && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-2xl border border-dashed border-slate-300">
              <label className="block text-sm font-bold text-foreground">Identificação da Obra / Cliente</label>
              <input
                className="w-full p-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                placeholder="Ex: Apartamento 402 - Sr. João"
                value={workName}
                onChange={e => setWorkName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Categoria da Ocorrência</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                'Registro Diário', 'Falta de Peça', 'Peça Danificada', 'Erro de Projeto',
                'Erro de Fabricação', 'Falta de Material', 'Montador Ausente', 'Serviço de Terceiros',
                'Cliente Ausente', 'Peça Extra', 'Outros'
              ].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat as any)}
                  className={`p-3 rounded-xl border text-xs font-black uppercase tracking-tight transition-all ${category === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Fields based on Category */}
          {(category === 'Falta de Peça' || category === 'Peça Danificada') ? (
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <FileWarning size={20} />
                <h3 className="font-bold">Dados para Reposição de Peça</h3>
              </div>
              <div>
                <label className="text-xs font-bold text-amber-800">Nome da Peça / Módulo</label>
                <input
                  className="w-full mt-1 p-3 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-card"
                  placeholder="Ex: Porta do Aéreo, Frente de Gaveta..."
                  value={partName}
                  onChange={e => setPartName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-amber-800">Largura (mm)</label>
                  <input type="number" className="w-full mt-1 p-3 rounded-lg border border-amber-200 bg-card" placeholder="0" value={width} onChange={e => setWidth(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-amber-800">Altura (mm)</label>
                  <input type="number" className="w-full mt-1 p-3 rounded-lg border border-amber-200 bg-card" placeholder="0" value={height} onChange={e => setHeight(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-amber-800">Espessura</label>
                  <select title="Espessura" className="w-full mt-1 p-3 rounded-lg border border-amber-200 bg-card" value={thickness} onChange={e => setThickness(e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="6mm">6mm</option>
                    <option value="15mm">15mm</option>
                    <option value="18mm">18mm</option>
                    <option value="25mm">25mm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-amber-800">Cor / Acabamento</label>
                  <input className="w-full mt-1 p-3 rounded-lg border border-amber-200 bg-card" placeholder="Ex: Branco Tx" value={color} onChange={e => setColor(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-amber-800">Quantidade</label>
                  <input type="number" title="Quantidade" className="w-full mt-1 p-3 rounded-lg border border-amber-200 bg-card" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
              </div>
            </div>
          ) : category === 'Falta de Material' ? (
            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2 text-orange-800 mb-2">
                <AlertTriangle size={20} />
                <h3 className="font-bold">Registro de Falta de Material</h3>
              </div>
              <div>
                <label className="text-sm font-bold text-orange-800">Qual material faltou?</label>
                <input
                  className="w-full mt-1 p-3 rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-card"
                  placeholder="Ex: Parafusos 4x40, Fita de borda Branca..."
                  value={missingMaterialName}
                  onChange={e => setMissingMaterialName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-bold text-orange-800">Observação / Onde seria usado?</label>
                <textarea
                  className="w-full mt-1 p-3 rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 h-24 bg-card"
                  placeholder="Descreva a finalidade..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>
          ) : category === 'Montador Ausente' ? (
            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <AlertOctagon size={20} />
                <h3 className="font-bold">Registro de Ausência</h3>
              </div>
              <div>
                <label className="text-sm font-bold text-red-800">Qual montador se ausentou?</label>
                <select
                  title="Selecione o Montador"
                  className="w-full mt-1 p-3 rounded-lg border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-card text-foreground"
                  value={absentInstallerId}
                  onChange={e => setAbsentInstallerId(e.target.value)}
                >
                  <option value="">Selecione o montador...</option>
                  {installers.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-red-800">Motivo / Observação</label>
                <textarea
                  className="w-full mt-1 p-3 rounded-lg border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 h-24 bg-card"
                  placeholder="Descreva o motivo informado..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Descrição do Ocorrido</label>
              <textarea
                className="w-full p-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 h-32"
                placeholder="Descreva o que aconteceu..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Link da Foto (Opcional)</label>
            <div className="flex gap-2">
              <div className="bg-muted p-3 rounded-xl flex items-center justify-center text-slate-400">
                <Camera size={20} />
              </div>
              <input
                className="flex-1 p-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Cole o link da foto de evidência..."
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-muted/50 flex justify-end gap-2">
          <button onClick={handleCloseModal} className="px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSaveLog}
            className="px-8 py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-emerald-600 transition-colors shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Confirmar Registro
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiaryFormModal;
