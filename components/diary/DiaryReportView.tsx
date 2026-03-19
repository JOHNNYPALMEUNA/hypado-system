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
import { DailyLog, Project } from '../../types';

interface DiaryReportViewProps {
  dailyLogs: DailyLog[];
  projects: Project[];
}

const DiaryReportView: React.FC<DiaryReportViewProps> = ({ dailyLogs, projects }) => {
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
