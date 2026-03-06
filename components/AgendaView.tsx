
import React, { useState } from 'react';
import { Project, Task, CalendarEvent } from '../types';
import {
    Calendar, CheckSquare, Clock, Plus, Trash2,
    ExternalLink, Filter, CheckCircle2, Circle, AlertCircle,
    ChevronRight, MapPin, Video, LayoutList
} from 'lucide-react';

interface Props {
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    tasks: Task[];
    addTask: (task: Task) => Promise<void>;
    updateTask: (task: Task) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    events: CalendarEvent[];
    addEvent: (event: CalendarEvent) => Promise<void>;
    updateEvent: (event: CalendarEvent) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
}

const AgendaView: React.FC<Props> = ({
    projects, setProjects,
    tasks, addTask, updateTask, deleteTask,
    events, addEvent, updateEvent, deleteEvent
}) => {

    const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

    // New Task Form
    const [newTask, setNewTask] = useState<Partial<Task>>({ priority: 'Média' });
    // New Event Form
    const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({ type: 'Reunião' });

    // --- Handlers ---

    const handleCreateTask = async () => {
        if (!newTask.title) return;

        const project = projects.find(p => p.id === newTask.projectId);

        const task: Task = {
            id: `task-${Date.now()}`,
            title: newTask.title,
            projectId: newTask.projectId,
            workName: project?.workName || 'Geral',
            priority: newTask.priority as any,
            dueDate: newTask.dueDate,
            done: false
        };

        await addTask(task);
        setIsTaskModalOpen(false);
        setNewTask({ priority: 'Média' });
    };

    const toggleTask = async (task: Task) => {
        await updateTask({ ...task, done: !task.done });
    };

    const handleDeleteTask = async (id: string) => {
        if (confirm('Excluir tarefa?')) {
            const pwd = prompt('Digite a senha de administrador:');
            if (pwd !== 'adm123') {
                alert('Senha incorreta!');
                return;
            }
            await deleteTask(id);
        }
    }

    const handleCreateEvent = async () => {
        if (!newEvent.title || !newEvent.start) return;

        const event: CalendarEvent = {
            id: `evt-${Date.now()}`,
            title: newEvent.title,
            start: newEvent.start,
            end: newEvent.end || newEvent.start, // Default to start if empty
            type: newEvent.type as any,
            projectId: newEvent.projectId,
            location: newEvent.location,
            description: newEvent.description
        };

        await addEvent(event);

        // Google Calendar Link Generation
        const googleUrl = new URL('https://calendar.google.com/calendar/render');
        googleUrl.searchParams.append('action', 'TEMPLATE');
        googleUrl.searchParams.append('text', event.title);

        // Format dates for Google (YYYYMMDDTHHMMSSZ) - simplistic approach
        const formatDate = (dateStr: string) => dateStr.replace(/-|:|\./g, '');
        const startStr = formatDate(event.start);
        const endStr = formatDate(event.end);

        // Note: This is a basic conversion, rigorous timezone handling would be needed for production
        // For this mock, we assume user inputs ISO strings or similar locally
        // Actually, input type="datetime-local" gives "YYYY-MM-DDTHH:MM"

        googleUrl.searchParams.append('dates', `${startStr}/${endStr}`);
        if (event.description) googleUrl.searchParams.append('details', event.description);
        if (event.location) googleUrl.searchParams.append('location', event.location);
        googleUrl.searchParams.append('add', 'obrashypado@gmail.com');

        window.open(googleUrl.toString(), '_blank');

        setIsEventModalOpen(false);
        setNewEvent({ type: 'Reunião' });
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 'pending') return !t.done;
        if (filter === 'done') return t.done;
        return true;
    });

    const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">

            {/* --- LEFT COLUMN: TASKS --- */}
            <div className="bg-card rounded-[40px] shadow-sm border border-border flex flex-col overflow-hidden animate-in slide-in-from-left duration-500">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-muted/50">
                    <div>
                        <h3 className="text-xl font-black text-foreground uppercase italic tracking-tight flex items-center gap-2">
                            <CheckSquare className="text-amber-500" /> Gestor de Tarefas
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acompanhamento de Obras</p>
                    </div>
                    <button
                        onClick={() => setIsTaskModalOpen(true)}
                        className="bg-slate-900 text-white p-3 rounded-xl hover:bg-amber-500 hover:text-foreground transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-8 py-4 flex gap-2 border-b border-slate-50">
                    {(['all', 'pending', 'done'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white' : 'bg-muted text-slate-400 hover:bg-slate-200'
                                }`}
                        >
                            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Concluídas'}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredTasks.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                            <CheckCircle2 size={48} />
                            <p className="font-bold uppercase tracking-widest text-xs">Nenhuma tarefa encontrada</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => (
                            <div key={task.id} className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all ${task.done ? 'bg-muted/50 border-transparent opacity-60' : 'bg-card border-slate-100 hover:border-amber-200 hover:shadow-sm'}`}>
                                <button
                                    onClick={() => toggleTask(task)}
                                    className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border text-transparent hover:border-amber-500'}`}
                                >
                                    <CheckCircle2 size={14} />
                                </button>
                                <div className="flex-1">
                                    <h4 className={`font-bold text-foreground ${task.done ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
                                    <div className="flex gap-4 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {task.workName && <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">{task.workName}</span>}
                                        {task.priority === 'Alta' && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Alta Prioridade</span>}
                                        {task.dueDate && <span className="flex items-center gap-1"><Clock size={10} /> {new Date(task.dueDate).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteTask(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- RIGHT COLUMN: AGENDA --- */}
            <div className="bg-card rounded-[40px] shadow-sm border border-border flex flex-col overflow-hidden animate-in slide-in-from-right duration-500 delay-100">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-muted/50">
                    <div>
                        <h3 className="text-xl font-black text-foreground uppercase italic tracking-tight flex items-center gap-2">
                            <Calendar className="text-blue-500" /> Agenda Google
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronização Visual (obrashypado@gmail.com)</p>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href="https://calendar.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="p-3 text-slate-400 hover:text-blue-500 transition-colors"
                        >
                            <ExternalLink size={20} />
                        </a>
                        <button
                            onClick={() => setIsEventModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 relative overflow-hidden"
                        >
                            + Novo Evento
                        </button>
                    </div>
                </div>

                {/* Timeline View */}
                <div className="flex-1 overflow-y-auto p-8 relative">
                    <div className="absolute left-12 top-0 bottom-0 w-px bg-muted"></div>

                    {sortedEvents.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                            <LayoutList size={48} />
                            <p className="font-bold uppercase tracking-widest text-xs text-center">Nenhum evento agendado.<br />Clique em "Novo Evento" para começar.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Group by day logic would go here, for now simple list */}
                            {sortedEvents.map(event => (
                                <div key={event.id} className="relative pl-12">
                                    <div className="absolute left-0 top-1 w-24 text-right pr-6">
                                        <span className="block font-black text-slate-400 text-xs">
                                            {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="block text-[10px] font-bold text-slate-300 uppercase mt-1">
                                            {new Date(event.start).toLocaleDateString(undefined, { weekday: 'short' })}
                                        </span>
                                    </div>
                                    <div className="absolute left-[44px] top-2 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white"></div>

                                    <div className={`p-5 rounded-2xl border bg-card hover:shadow-md transition-all group ${event.type === 'Reunião' ? 'border-l-4 border-l-blue-500' :
                                        event.type === 'Visita' ? 'border-l-4 border-l-amber-500' :
                                            event.type === 'Instalação' ? 'border-l-4 border-l-emerald-500' :
                                                'border-l-4 border-l-slate-300'
                                        }`}>
                                        <h4 className="font-bold text-foreground">{event.title}</h4>
                                        {event.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{event.description}</p>}

                                        <div className="flex flex-wrap gap-3 mt-4">
                                            <span className="text-[10px] font-bold uppercase tracking-widest bg-muted text-muted-foreground px-2 py-1 rounded flex items-center gap-1">
                                                <Circle size={8} fill="currentColor" /> {event.type}
                                            </span>
                                            {event.location && (
                                                <span className="text-[10px] font-bold uppercase tracking-widest bg-muted text-muted-foreground px-2 py-1 rounded flex items-center gap-1">
                                                    <MapPin size={10} /> {event.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Task Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-card rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-black text-foreground uppercase italic tracking-tight mb-6">Nova Tarefa</h3>
                        <div className="space-y-4">
                            <input
                                className="w-full text-lg font-bold border-b border-border pb-2 outline-none focus:border-amber-500 placeholder:text-slate-300"
                                placeholder="O que precisa ser feito?"
                                value={newTask.title || ''}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                autoFocus
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    className="bg-muted/50 p-3 rounded-xl text-sm font-bold outline-none"
                                    value={newTask.projectId || ''}
                                    onChange={e => setNewTask({ ...newTask, projectId: e.target.value })}
                                >
                                    <option value="">Vincular a Obra...</option>
                                    {projects.filter(p => p.currentStatus !== 'Finalizada').map(p => (
                                        <option key={p.id} value={p.id}>{p.workName}</option>
                                    ))}
                                </select>
                                <select
                                    className="bg-muted/50 p-3 rounded-xl text-sm font-bold outline-none"
                                    value={newTask.priority}
                                    onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                                >
                                    <option value="Baixa">Baixa Prioridade</option>
                                    <option value="Média">Média Prioridade</option>
                                    <option value="Alta">Alta Prioridade</option>
                                </select>
                            </div>
                            <input
                                type="date"
                                className="w-full bg-muted/50 p-3 rounded-xl text-sm font-bold outline-none text-muted-foreground"
                                value={newTask.dueDate || ''}
                                onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setIsTaskModalOpen(false)} className="flex-1 py-3 font-bold text-slate-400 hover:text-muted-foreground">Cancelar</button>
                            <button onClick={handleCreateTask} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors">Criar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Modal */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-card rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-black text-foreground uppercase italic tracking-tight mb-6">Novo Agendamento</h3>
                        <div className="space-y-4">
                            <input
                                className="w-full text-lg font-bold border-b border-border pb-2 outline-none focus:border-blue-500 placeholder:text-slate-300"
                                placeholder="Título do Evento"
                                value={newEvent.title || ''}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                autoFocus
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="datetime-local"
                                    className="bg-muted/50 p-3 rounded-xl text-sm font-bold outline-none text-muted-foreground"
                                    value={newEvent.start || ''}
                                    onChange={e => setNewEvent({ ...newEvent, start: e.target.value })}
                                />
                                <input
                                    type="datetime-local"
                                    className="bg-muted/50 p-3 rounded-xl text-sm font-bold outline-none text-muted-foreground"
                                    value={newEvent.end || ''}
                                    onChange={e => setNewEvent({ ...newEvent, end: e.target.value })}
                                />
                            </div>
                            <select
                                className="w-full bg-muted/50 p-3 rounded-xl text-sm font-bold outline-none"
                                value={newEvent.type}
                                onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                            >
                                <option value="Reunião">Reunião</option>
                                <option value="Visita">Visita Técnica</option>
                                <option value="Instalação">Instalação</option>
                                <option value="Outro">Outro</option>
                            </select>
                            <textarea
                                className="w-full bg-muted/50 p-3 rounded-xl text-sm font-bold outline-none h-24 resize-none"
                                placeholder="Descrição ou pauta..."
                                value={newEvent.description || ''}
                                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                            />
                            <input
                                className="w-full bg-muted/50 p-3 rounded-xl text-sm font-bold outline-none"
                                placeholder="Localização (ou Link Meet)"
                                value={newEvent.location || ''}
                                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setIsEventModalOpen(false)} className="flex-1 py-3 font-bold text-slate-400 hover:text-muted-foreground">Cancelar</button>
                            <button onClick={handleCreateEvent} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-colors flex flex-col items-center justify-center leading-none">
                                <span>Agendar</span>
                                <span className="text-[8px] opacity-70 mt-1 font-medium transform normal-case tracking-normal">e abrir Google Calendar</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AgendaView;
