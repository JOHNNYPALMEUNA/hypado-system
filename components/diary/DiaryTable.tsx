import React from 'react';
import { DailyLog, Project } from '../../types';
import { 
  ArrowRight, 
  CheckCircle2, 
  User, 
  AlertOctagon, 
  Eye, 
  Printer, 
  Trash2, 
  Clock 
} from 'lucide-react';

interface DiaryTableProps {
  filteredLogs: DailyLog[];
  projects: Project[];
  expandedProjects: string[];
  setExpandedProjects: React.Dispatch<React.SetStateAction<string[]>>;
  updateDailyLog: (log: DailyLog) => Promise<void>;
  deleteDailyLog: (id: string) => Promise<void>;
  setViewingLog: (log: DailyLog) => void;
  setPrintingLog: (log: DailyLog) => void;
  getStatusColor: (status: string) => string;
}

const DiaryTable: React.FC<DiaryTableProps> = ({
  filteredLogs,
  projects,
  expandedProjects,
  setExpandedProjects,
  updateDailyLog,
  deleteDailyLog,
  setViewingLog,
  setPrintingLog,
  getStatusColor
}) => {
  const projectIdsWithLogs = Array.from(new Set(filteredLogs.map(l => l.projectId)));

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
            <tr>
              <th className="p-4">Data</th>
              <th className="p-4">Obra</th>
              <th className="p-4">Categoria</th>
              <th className="p-4">Descrição / Detalhes</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projectIdsWithLogs.map(projectId => {
              const projectLogs = filteredLogs.filter(l => l.projectId === projectId);
              const proj = projects.find(p => p.id === projectId);
              const workName = proj?.workName || projectLogs[0]?.workName || 'Obra Removida / Avulsa';
              const isExpanded = expandedProjects.includes(projectId || 'avulsa');
              const idToToggle = projectId || 'avulsa';

              return (
                <React.Fragment key={idToToggle}>
                  <tr
                    className="hover:bg-muted/50 cursor-pointer group transition-colors"
                    onClick={() => setExpandedProjects(prev => prev.includes(idToToggle) ? prev.filter(id => id !== idToToggle) : [...prev, idToToggle])}
                  >
                    <td colSpan={6} className="p-4 border-l-4 border-emerald-500 bg-emerald-50/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
                            <ArrowRight size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                          <div>
                            <span className="font-black text-foreground tracking-wide">{workName}</span>
                            <p className="text-xs font-bold text-muted-foreground mt-0.5">
                              Lote: {projectLogs.length} registro(s) encontrados
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          {projectLogs.some(l => l.status !== 'Concluído') && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Tem certeza que deseja marcar TODAS as pendências desta obra (${workName}) como Concluídas?`)) {
                                  const pending = projectLogs.filter(l => l.status !== 'Concluído');
                                  for (const log of pending) {
                                    await updateDailyLog({ ...log, status: 'Concluído' });
                                  }
                                }
                              }}
                              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded shadow-sm text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                              title="Concluir todos os registros deste lote de uma só vez"
                            >
                              <CheckCircle2 size={12} />
                              Aprovar Lote
                            </button>
                          )}
                          {projectLogs.some(l => l.status === 'Pendente') && (
                            <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider flex items-center">Pendentes</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && projectLogs.map(log => (
                    <tr key={log.id} className="hover:bg-muted/50 bg-card">
                      <td className="p-4 text-muted-foreground whitespace-nowrap pl-8 border-l-4 border-transparent">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-medium text-slate-400 text-xs text-left align-top">
                        <div className="flex flex-col gap-1 w-28">
                          <span>↳ Registro</span>
                          <span className="flex items-center gap-1 font-bold text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap" title={`Registrado por: ${log.author || 'Usuário'}`}>
                            <User size={12} className="shrink-0" /> {log.author || 'Usuário'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${['Falta de Peça', 'Erro de Projeto', 'Erro de Fabricação'].includes(log.category) ? 'bg-red-50 text-red-600' : 'bg-muted text-muted-foreground'
                          }`}>
                          {['Falta de Peça', 'Erro de Projeto', 'Erro de Fabricação'].includes(log.category) && <AlertOctagon size={12} />}
                          {log.category}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate">
                        {log.reworkDetails && log.reworkDetails.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-xs uppercase">PEÇA: {log.reworkDetails[0].partName}</span>
                            <span className="text-xs">{log.reworkDetails[0].width}x{log.reworkDetails[0].height}mm • {log.reworkDetails[0].color}</span>
                          </div>
                        ) : (
                          <div className={`text-xs ${['Montador Ausente', 'Cliente Ausente', 'Falta de Material', 'Serviço de Terceiros'].includes(log.category) ? 'font-bold whitespace-pre-line' : 'truncate max-w-xs'}`}>
                            {log.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {log.status === 'Pendente' && (log.category === 'Erro de Projeto' || log.category === 'Erro de Fabricação') ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const resolution = prompt('Resolvendo Ocorrência\n\nO que foi feito para solucionar este problema?');
                              if (resolution) {
                                updateDailyLog({
                                  ...log,
                                  status: 'Concluído',
                                  description: `${log.description}\n\n[RESOLUÇÃO]: ${resolution}`
                                });
                              }
                            }}
                            className="px-3 py-1 rounded-full text-xs font-bold border border-red-200 bg-red-100 text-red-700 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-200 transition-colors cursor-pointer"
                            title="Clique para marcar como resolvido"
                          >
                            {log.status}
                          </button>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {['Outros', 'Cliente Ausente', 'Montador Ausente', 'Serviço de Terceiros', 'Registro Diário'].includes(log.category) ||
                            (['Erro de Projeto', 'Erro de Fabricação'].includes(log.category) && (!log.reworkDetails || log.reworkDetails.length === 0)) ? (
                            <span className="text-xs text-slate-400 italic">Ciência Apenas</span>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  let nextStatus: DailyLog['status'] = 'Pendente';
                                  if (log.status === 'Pendente') nextStatus = 'Em Produção';
                                  else if (log.status === 'Em Produção') nextStatus = 'Pronto';
                                  else if (log.status === 'Pronto') nextStatus = 'Concluído';

                                  if (nextStatus !== log.status) {
                                    updateDailyLog({ ...log, status: nextStatus });
                                  }
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-black uppercase transition-all flex items-center gap-1 ${log.status === 'Concluído' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-700'
                                  }`}
                                disabled={log.status === 'Concluído'}
                              >
                                {log.status === 'Pendente' ? 'Produzir' : log.status === 'Em Produção' ? 'Pronto' : log.status === 'Pronto' ? 'Concluir' : 'Concluído'}
                              </button>
                            </div>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); setViewingLog(log); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Visualizar Detalhes"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPrintingLog(log); }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Imprimir Relatório"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Tem certeza que deseja excluir permanentemente este registro?')) {
                                deleteDailyLog(log.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir Registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-400 italic">
                  Nenhum registro encontrado para os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DiaryTable;
