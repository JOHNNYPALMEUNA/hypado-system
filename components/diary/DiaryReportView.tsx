import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { MessageCircle, Calendar, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { DailyLog, Project } from '../../types';
import { analyzeDailyDiary } from '../../geminiService';

interface DiaryReportViewProps {
  dailyLogs: DailyLog[];
  projects: Project[];
}

const DiaryReportView: React.FC<DiaryReportViewProps> = ({ dailyLogs, projects }) => {
  const [reportDate, setReportDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiAnalysis, setAiAnalysis] = React.useState<{ narrative: string; verdict: string; completionPercentage: number } | null>(null);

  // Filter logs for the selected date
  const filteredLogsForReport = dailyLogs.filter(l => l.date.split('T')[0] === reportDate);

  const handleAIAnalysis = async () => {
    if (filteredLogsForReport.length === 0) {
      alert('Nenhuma ocorrência registrada nesta data para análise.');
      return;
    }

    setIsAnalyzing(true);
    try {
      // For the daily report, we'll pick the most active project or analyze all general logs
      // In this case, we'll try to provide a general summary if no project is focused
      const photos = filteredLogsForReport.flatMap(l => l.photoUrls || (l.photoUrl ? [l.photoUrl] : []));
      
      // We'll use a placeholder project if multiple exist, or the first one
      const mainProject = projects.find(p => p.id === filteredLogsForReport[0].projectId) || { workName: 'Múltiplas Obras' } as Project;

      const result = await analyzeDailyDiary(filteredLogsForReport, mainProject, photos);
      if (result) {
        setAiAnalysis(result);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar análise IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (filteredLogsForReport.length === 0) {
      alert('Nenhuma ocorrência registrada nesta data para compartilhar.');
      return;
    }

    const dateFormatted = new Date(reportDate + 'T12:00:00').toLocaleDateString();
    const publicUrl = `${window.location.origin}${window.location.pathname}?mode=daily-report&date=${reportDate}`;
    
    let message = `*RESUMO DIÁRIO DE OBRAS - ${dateFormatted}*\n\n`;
    
    if (aiAnalysis) {
      message += `*ESTADO GERAL:* ${aiAnalysis.verdict}\n`;
      message += `*VEREDITO TÉCNICO:* \n${aiAnalysis.narrative.substring(0, 200)}...\n\n`;
    }

    message += `📊 Total de Ocorrências: ${filteredLogsForReport.length}\n\n`;
    message += `🔗 *RELATÓRIO COMPLETO COM FOTOS:*\n`;
    message += `${publicUrl}\n\n`;
    message += `_Gerado via Hypado System_`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  // 1. Data by Category
  const categories = Array.from(new Set(dailyLogs.map(l => l.category)));
  const categoryData = categories.map(cat => ({
    name: cat,
    total: dailyLogs.filter(l => l.category === cat).length
  })).sort((a, b) => b.total - a.total);

  // 2. Data by Project (Top 5 most occurrences)
  const projectStats = Array.from(new Set(dailyLogs.map(l => l.projectId))).map(pid => {
    const proj = projects.find(p => p.id === pid);
    return {
      name: proj?.workName || 'Avulsa',
      total: dailyLogs.filter(l => l.projectId === pid).length
    };
  }).sort((a, b) => b.total - a.total).slice(0, 5);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* WhatsApp Summary Section */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
            <MessageCircle className="text-emerald-400" size={24} /> Compartilhar Resumo (Diretoria)
          </h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Envie o resumo das ocorrências do dia anterior/selecionado via WhatsApp</p>
        </div>
        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
          <div className="flex-1 md:w-48 relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
            <input 
              type="date"
              title="Data do Relatório"
              placeholder="aaaa-mm-dd"
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
              value={reportDate}
              onChange={e => {
                setReportDate(e.target.value);
                setAiAnalysis(null);
              }}
            />
          </div>
          <button 
             onClick={handleAIAnalysis}
             disabled={isAnalyzing}
             className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {isAnalyzing ? 'Analisando...' : 'Gerar Relatório IA'}
          </button>
          <button 
             onClick={handleWhatsAppShare}
             className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <MessageCircle size={18} /> Enviar WhatsApp
          </button>
        </div>
      </div>

      {/* AI Analysis Result Display */}
      {aiAnalysis && (
        <div className="bg-white rounded-3xl p-8 border border-indigo-100 shadow-xl shadow-indigo-500/5 animate-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/4 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Veredito da IA</span>
              <div className="text-4xl mb-2">{aiAnalysis.verdict.split(' ')[0]}</div>
              <p className="font-black text-slate-900 uppercase tracking-tight text-sm leading-tight">
                {aiAnalysis.verdict.split(' ').slice(1).join(' ')}
              </p>
              <div className="mt-6 w-full space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Progresso</span>
                  <span>{aiAnalysis.completionPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${aiAnalysis.completionPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="md:w-3/4 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-4 text-indigo-600">
                <Sparkles size={20} />
                <h4 className="font-black uppercase tracking-widest text-sm">Narrativa de Tempo Efetivo</h4>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium italic relative">
                <span className="text-4xl text-slate-200 absolute -top-4 -left-4 opacity-50 font-serif">"</span>
                {aiAnalysis.narrative}
                <span className="text-4xl text-slate-200 absolute -bottom-8 right-0 opacity-50 font-serif">"</span>
              </p>
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => window.open(`${window.location.origin}${window.location.pathname}?mode=daily-report&date=${reportDate}`, '_blank')}
                  className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-500 flex items-center gap-2"
                >
                  Visualizar Página do Relatório <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Category Chart */}
        <div className="bg-card rounded-3xl p-8 border border-border shadow-sm">
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-6 flex items-center gap-2">
            Ocorrências por Categoria
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  scale="band" 
                  width={150} 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight="bold"
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Chart */}
        <div className="bg-card rounded-3xl p-8 border border-border shadow-sm">
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-6 flex items-center gap-2">
            Top 5 Obras com mais Ocorrências
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="total"
                >
                  {projectStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {projectStats.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full bg-dynamic" 
                  style={{ '--dynamic-color': COLORS[i % COLORS.length] } as React.CSSProperties}
                  title={`Legenda: ${s.name}`}
                ></div>
                <span className="text-[10px] font-bold text-muted-foreground truncate">{s.name} ({s.total})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total de Registros</p>
          <p className="text-3xl font-black text-foreground">{dailyLogs.length}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Pendentes</p>
          <p className="text-3xl font-black text-amber-600">{dailyLogs.filter(l => l.status === 'Pendente').length}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Em Produção</p>
          <p className="text-3xl font-black text-blue-600">{dailyLogs.filter(l => l.status === 'Em Produção').length}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Concluídos</p>
          <p className="text-3xl font-black text-emerald-600">{dailyLogs.filter(l => l.status === 'Concluído').length}</p>
        </div>
      </div>
    </div>
  );
};

export default DiaryReportView;
