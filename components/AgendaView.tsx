
import React, { useState, useMemo } from 'react';
import { Project, Task, CalendarEvent, TechnicalAssistance } from '../types';
import {
    Calendar, CheckSquare, Clock, Plus, Trash2,
    ExternalLink, Filter, CheckCircle2, Circle, AlertCircle,
    ChevronRight, ChevronLeft, MapPin, Video, LayoutList,
    Truck, Wrench, AlertTriangle, CalendarDays, CalendarRange,
    CalendarCheck, ShieldAlert, Sparkles, UserCheck
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
    assistances?: TechnicalAssistance[];
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface ScheduledItem {
    id: string;
    type: 'event' | 'promised' | 'freight' | 'delivery' | 'task' | 'assistance';
    title: string;
    description?: string;
    color: string;
    borderColor: string;
    textColor: string;
    icon: React.ReactNode;
    time?: string;
    originalItem: any;
}

const AgendaView: React.FC<Props> = ({
    projects, setProjects,
    tasks, addTask, updateTask, deleteTask,
    events, addEvent, updateEvent, deleteEvent,
    assistances = []
}) => {
    // Tab and Calendar Navigation State
    const [activeTab, setActiveTab] = useState<'calendar' | 'timeline' | 'tasks'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

    // New Task Form
    const [newTask, setNewTask] = useState<Partial<Task>>({ priority: 'Média' });
    // New Event Form
    const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({ type: 'Reunião' });

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Helper to format date in YYYY-MM-DD safely
    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper to extract items scheduled on a specific YYYY-MM-DD
    const getItemsForDate = (dateStr: string): ScheduledItem[] => {
        const list: ScheduledItem[] = [];

        // 1. Calendar Events
        events.forEach(evt => {
            const evtDateStr = evt.start.split('T')[0];
            if (evtDateStr === dateStr) {
                let color = 'bg-blue-500/10 hover:bg-blue-500/20';
                let borderColor = 'border-blue-500/20';
                let textColor = 'text-blue-700 dark:text-blue-300';
                
                if (evt.type === 'Visita') {
                    color = 'bg-amber-500/10 hover:bg-amber-500/20';
                    borderColor = 'border-amber-500/20';
                    textColor = 'text-amber-700 dark:text-amber-300';
                } else if (evt.type === 'Instalação') {
                    color = 'bg-emerald-500/10 hover:bg-emerald-500/20';
                    borderColor = 'border-emerald-500/20';
                    textColor = 'text-emerald-700 dark:text-emerald-300';
                } else if (evt.type === 'Outro') {
                    color = 'bg-slate-500/10 hover:bg-slate-500/20';
                    borderColor = 'border-slate-500/20';
                    textColor = 'text-slate-700 dark:text-slate-300';
                }

                const time = evt.start.includes('T') ? evt.start.split('T')[1].substring(0, 5) : undefined;

                list.push({
                    id: evt.id,
                    type: 'event',
                    title: evt.title,
                    description: evt.description || evt.location,
                    color,
                    borderColor,
                    textColor,
                    icon: <Calendar size={12} />,
                    time,
                    originalItem: evt
                });
            }
        });

        // 2. Project promised dates, freight, and deliveries
        projects.forEach(proj => {
            if (proj.promisedDate === dateStr) {
                list.push({
                    id: `promised-${proj.id}`,
                    type: 'promised',
                    title: `🚨 Prazo: ${proj.workName}`,
                    description: `Cliente: ${proj.clientName} (Entrega Final Acordada)`,
                    color: 'bg-red-500/10 hover:bg-red-500/20',
                    borderColor: 'border-red-500/20',
                    textColor: 'text-red-700 dark:text-red-300',
                    icon: <Clock size={12} />,
                    originalItem: proj
                });
            }
            if (proj.freightDate === dateStr) {
                list.push({
                    id: `freight-${proj.id}`,
                    type: 'freight',
                    title: `🚚 Frete: ${proj.workName}`,
                    description: `Freteiro / Carregamento planejado`,
                    color: 'bg-indigo-500/10 hover:bg-indigo-500/20',
                    borderColor: 'border-indigo-500/20',
                    textColor: 'text-indigo-700 dark:text-indigo-300',
                    icon: <Truck size={12} />,
                    originalItem: proj
                });
            }
            if (proj.deliveryDate === dateStr) {
                list.push({
                    id: `delivery-${proj.id}`,
                    type: 'delivery',
                    title: `📦 Montagem: ${proj.workName}`,
                    description: `Início da montagem da marcenaria`,
                    color: 'bg-emerald-500/10 hover:bg-emerald-500/20',
                    borderColor: 'border-emerald-500/20',
                    textColor: 'text-emerald-700 dark:text-emerald-300',
                    icon: <Wrench size={12} />,
                    originalItem: proj
                });
            }
        });

        // 3. Uncompleted tasks
        tasks.forEach(task => {
            if (task.dueDate === dateStr && !task.done) {
                list.push({
                    id: `task-${task.id}`,
                    type: 'task',
                    title: `📋 Tarefa: ${task.title}`,
                    description: task.workName ? `Obra: ${task.workName}` : 'Tarefa Geral',
                    color: 'bg-amber-500/10 hover:bg-amber-500/20',
                    borderColor: 'border-amber-500/20',
                    textColor: 'text-amber-700 dark:text-amber-300',
                    icon: <CheckSquare size={12} />,
                    originalItem: task
                });
            }
        });

        // 4. Technical Assistances
        assistances.forEach(asst => {
            if (asst.scheduledDate === dateStr) {
                list.push({
                    id: `asst-${asst.id}`,
                    type: 'assistance',
                    title: `🛠️ Assistência: ${asst.workName}`,
                    description: `Problema: ${asst.reportedProblem}`,
                    color: 'bg-rose-500/10 hover:bg-rose-500/20',
                    borderColor: 'border-rose-500/20',
                    textColor: 'text-rose-700 dark:text-rose-300',
                    icon: <AlertTriangle size={12} />,
                    time: asst.scheduledTime,
                    originalItem: asst
                });
            }
        });

        return list;
    };

    // --- Task Handlers ---
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
            if (pwd !== 'admin123') {
                alert('Senha incorreta!');
                return;
            }
            await deleteTask(id);
        }
    };

    // --- Event Handlers ---
    const handleCreateEvent = async () => {
        if (!newEvent.title || !newEvent.start) return;

        const event: CalendarEvent = {
            id: `evt-${Date.now()}`,
            title: newEvent.title,
            start: newEvent.start,
            end: newEvent.end || newEvent.start,
            type: newEvent.type as any,
            projectId: newEvent.projectId,
            location: newEvent.location,
            description: newEvent.description
        };

        await addEvent(event);

        // Google Calendar Link
        const googleUrl = new URL('https://calendar.google.com/calendar/render');
        googleUrl.searchParams.append('action', 'TEMPLATE');
        googleUrl.searchParams.append('text', event.title);

        const formatDateStr = (dateStr: string) => dateStr.replace(/-|:|\./g, '');
        const startStr = formatDateStr(event.start);
        const endStr = formatDateStr(event.end);

        googleUrl.searchParams.append('dates', `${startStr}/${endStr}`);
        if (event.description) googleUrl.searchParams.append('details', event.description);
        if (event.location) googleUrl.searchParams.append('location', event.location);
        googleUrl.searchParams.append('add', 'obrashypado@gmail.com');

        window.open(googleUrl.toString(), '_blank');

        setIsEventModalOpen(false);
        setNewEvent({ type: 'Reunião' });
    };

    // Filtered tasks for the list tab
    const filteredTasks = tasks.filter(t => {
        if (filter === 'pending') return !t.done;
        if (filter === 'done') return t.done;
        return true;
    });

    const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Generate Month Days (42 cells to fill the calendar grid)
    const calendarCells = useMemo(() => {
        const cells = [];
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

        // 1. Fill previous month padding
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            cells.push({
                date: new Date(currentYear, currentMonth - 1, prevMonthDays - i),
                isCurrentMonth: false
            });
        }

        // 2. Fill current month days
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push({
                date: new Date(currentYear, currentMonth, i),
                isCurrentMonth: true
            });
        }

        // 3. Fill next month padding
        const remaining = 42 - cells.length;
        for (let i = 1; i <= remaining; i++) {
            cells.push({
                date: new Date(currentYear, currentMonth + 1, i),
                isCurrentMonth: false
            });
        }

        return cells;
    }, [currentMonth, currentYear]);

    // Navigate Calendar
    const prevMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const jumpToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const selectedDateStr = getLocalDateString(selectedDate);
    const selectedDateItems = getItemsForDate(selectedDateStr);

    // Get 30 Days Future Timeline Projection
    const timelineProjection = useMemo(() => {
        const list = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = getLocalDateString(date);
            const items = getItemsForDate(dateStr);

            if (items.length > 0) {
                list.push({
                    date,
                    dateStr,
                    items
                });
            }
        }
        return list;
    }, [events, projects, tasks, assistances]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Mode Switch */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-5">
                <div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2 uppercase italic">
                        <CalendarRange className="text-primary" /> Central de Agendamentos
                    </h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Cronograma Integrado de Vendas, Medição, Montagem e Assistência
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-muted p-1 rounded-2xl border border-border/50 shadow-inner">
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'calendar'
                                ? 'bg-card text-foreground shadow-md'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <CalendarDays size={14} /> Calendário Mensal
                    </button>
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'timeline'
                                ? 'bg-card text-foreground shadow-md'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Sparkles size={14} className="text-amber-500 animate-pulse" /> Próximos 30 Dias
                    </button>
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'tasks'
                                ? 'bg-card text-foreground shadow-md'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <CheckSquare size={14} /> Tarefas & Google
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: 1. MONTHLY CALENDAR GRID */}
            {activeTab === 'calendar' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Visual Month Grid (Left 2 columns) */}
                    <div className="lg:col-span-2 bg-card rounded-[40px] border border-border p-6 shadow-sm flex flex-col space-y-4">
                        {/* Month Nav */}
                        <div className="flex justify-between items-center">
                            <h4 className="text-lg font-black text-foreground uppercase italic tracking-tight">
                                {MONTH_NAMES[currentMonth]} <span className="text-primary font-black">{currentYear}</span>
                            </h4>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={prevMonth}
                                    className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border/50"
                                    title="Mês Anterior"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={jumpToToday}
                                    className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors border border-border/50"
                                >
                                    Hoje
                                </button>
                                <button
                                    onClick={nextMonth}
                                    className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border/50"
                                    title="Próximo Mês"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 border-t border-border/40 pt-4">
                            {/* Week days labels */}
                            {WEEK_DAYS.map(day => (
                                <div key={day} className="text-center py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    {day}
                                </div>
                            ))}

                            {/* Cells */}
                            {calendarCells.map((cell, idx) => {
                                const dateStr = getLocalDateString(cell.date);
                                const dayItems = getItemsForDate(dateStr);
                                const isToday = getLocalDateString(new Date()) === dateStr;
                                const isSelected = getLocalDateString(selectedDate) === dateStr;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedDate(cell.date)}
                                        className={`min-h-[90px] p-2 border rounded-xl flex flex-col justify-between transition-all cursor-pointer select-none relative overflow-hidden group ${
                                            cell.isCurrentMonth 
                                                ? 'bg-card border-border/40 hover:border-primary/50' 
                                                : 'bg-muted/30 border-transparent opacity-40 hover:opacity-60'
                                        } ${isSelected ? 'ring-2 ring-primary border-primary shadow-sm' : ''} ${
                                            isToday ? 'bg-primary/5 border-primary/20' : ''
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className={`text-xs font-bold ${
                                                isToday 
                                                    ? 'bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center font-black shadow-sm' 
                                                    : 'text-foreground/80'
                                            }`}>
                                                {cell.date.getDate()}
                                            </span>
                                            {dayItems.length > 0 && (
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight group-hover:text-primary transition-colors">
                                                    {dayItems.length} {dayItems.length === 1 ? 'item' : 'itens'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Day mini tags */}
                                        <div className="mt-1 space-y-0.5 max-h-[60px] overflow-y-auto no-scrollbar">
                                            {dayItems.slice(0, 3).map((item, itemIdx) => (
                                                <div
                                                    key={itemIdx}
                                                    title={item.title}
                                                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${item.color} ${item.borderColor} ${item.textColor} flex items-center gap-1 truncate`}
                                                >
                                                    {item.icon}
                                                    <span className="truncate leading-none">{item.title.replace(/🚨 Prazo: |🚚 Frete: |📦 Montagem: |📋 Tarefa: |🛠️ Assistência: /g, '')}</span>
                                                </div>
                                            ))}
                                            {dayItems.length > 3 && (
                                                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest text-center mt-0.5">
                                                    + {dayItems.length - 3} mais
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected Day Panel (Right Column) */}
                    <div className="bg-card rounded-[40px] border border-border p-8 shadow-sm flex flex-col justify-between min-h-[450px]">
                        <div className="space-y-6">
                            <div>
                                <span className="text-[9px] font-black uppercase text-primary tracking-widest bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                                    Detalhamento Técnico
                                </span>
                                <h4 className="text-xl font-black text-foreground uppercase tracking-tight mt-3">
                                    {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
                                </h4>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
                                    {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>

                            {/* Scheduled items list for selected date */}
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedDateItems.length === 0 ? (
                                    <div className="py-12 text-center text-slate-300 dark:text-slate-700 flex flex-col items-center gap-3">
                                        <CalendarCheck size={40} className="stroke-[1.5]" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum compromisso agendado</p>
                                    </div>
                                ) : (
                                    selectedDateItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-2xl border transition-all hover:shadow-sm ${item.color} ${item.borderColor} ${item.textColor}`}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <div className="mt-0.5 shrink-0">{item.icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-extrabold text-xs leading-snug">{item.title}</h5>
                                                    {item.description && (
                                                        <p className="text-[10px] font-medium opacity-80 mt-1 line-clamp-2 leading-relaxed">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                    {item.time && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black mt-2 bg-black/5 px-2 py-0.5 rounded uppercase tracking-wider">
                                                            <Clock size={8} /> {item.time}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Quick create action buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-6 border-t border-border/50 mt-6">
                            <button
                                onClick={() => {
                                    setNewEvent(prev => ({ ...prev, start: `${selectedDateStr}T09:00`, end: `${selectedDateStr}T10:00` }));
                                    setIsEventModalOpen(true);
                                }}
                                className="py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex flex-col items-center justify-center leading-none"
                            >
                                <span>+ Evento</span>
                                <span className="text-[7px] opacity-70 mt-1 font-medium normal-case tracking-normal">Agenda Google</span>
                            </button>
                            <button
                                onClick={() => {
                                    setNewTask(prev => ({ ...prev, dueDate: selectedDateStr }));
                                    setIsTaskModalOpen(true);
                                }}
                                className="py-3 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-800 transition-colors shadow-sm flex flex-col items-center justify-center leading-none"
                            >
                                <span>+ Tarefa</span>
                                <span className="text-[7px] opacity-70 mt-1 font-medium normal-case tracking-normal">Interna</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 2. 30-DAY PROJECTION TIMELINE (Fernanda's View) */}
            {activeTab === 'timeline' && (
                <div className="bg-card rounded-[40px] border border-border p-8 shadow-sm flex flex-col space-y-6">
                    <div>
                        <h4 className="text-lg font-black text-foreground uppercase italic tracking-tight flex items-center gap-2">
                            <Sparkles className="text-amber-500 animate-pulse" /> Projeção de Cronograma (Próximos 30 Dias)
                        </h4>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            Listagem linear organizada para visualização de entregas, montagens e reuniões futuras
                        </p>
                    </div>

                    <div className="relative pl-6 border-l-2 border-border/50 space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {timelineProjection.length === 0 ? (
                            <div className="py-24 text-center text-slate-300 dark:text-slate-700 flex flex-col items-center justify-center gap-4">
                                <CalendarDays size={56} className="stroke-[1.2] opacity-60" />
                                <div>
                                    <p className="text-sm font-black uppercase tracking-widest">Nenhum agendamento futuro</p>
                                    <p className="text-xs font-bold text-muted-foreground/70 mt-1">
                                        Não há fretes, montagens, prazos de entrega ou reuniões agendados para os próximos 30 dias.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            timelineProjection.map((day, idx) => {
                                const isToday = getLocalDateString(new Date()) === day.dateStr;
                                const weekday = day.date.toLocaleDateString('pt-BR', { weekday: 'long' });
                                const dateFormatted = day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                                return (
                                    <div key={idx} className="relative">
                                        {/* Left timeline dot indicator */}
                                        <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-card ${
                                            isToday ? 'border-primary ring-4 ring-primary/20' : 'border-border'
                                        }`}></div>

                                        {/* Day Header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                                                isToday 
                                                    ? 'bg-primary text-primary-foreground font-black shadow-sm' 
                                                    : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {isToday ? 'Hoje' : dateFormatted}
                                            </span>
                                            <span className="text-xs font-extrabold text-foreground capitalize">
                                                {weekday}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                ({day.items.length} {day.items.length === 1 ? 'atividade' : 'atividades'})
                                            </span>
                                        </div>

                                        {/* Day items list */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {day.items.map((item, itemIdx) => (
                                                <div
                                                    key={itemIdx}
                                                    className={`p-4 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-sm ${item.color} ${item.borderColor} ${item.textColor}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className="mt-0.5 shrink-0">{item.icon}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <h5 className="font-extrabold text-xs leading-snug">{item.title}</h5>
                                                                {item.time && (
                                                                    <span className="text-[8px] font-black bg-black/5 px-1.5 py-0.5 rounded shrink-0 ml-1">
                                                                        {item.time}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.description && (
                                                                <p className="text-[10px] font-medium opacity-80 mt-1 leading-relaxed line-clamp-2">
                                                                    {item.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 3. INTERNAL TASKS & GOOGLE EVENTS LIST */}
            {activeTab === 'tasks' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Tasks panel */}
                    <div className="bg-card rounded-[40px] shadow-sm border border-border flex flex-col overflow-hidden">
                        <div className="p-8 border-b border-border flex justify-between items-center bg-muted/30">
                            <div>
                                <h3 className="text-lg font-black text-foreground uppercase italic tracking-tight flex items-center gap-2">
                                    <CheckSquare className="text-amber-500" /> Gestor de Tarefas
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Controles e pendências internas</p>
                            </div>
                            <button
                                title="Nova Tarefa"
                                onClick={() => {
                                    setNewTask({ priority: 'Média', dueDate: getLocalDateString(new Date()) });
                                    setIsTaskModalOpen(true);
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        {/* Task Filters */}
                        <div className="px-8 py-3.5 flex gap-2 border-b border-border/40 bg-muted/10">
                            {(['all', 'pending', 'done'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                        filter === f 
                                            ? 'bg-slate-900 text-white' 
                                            : 'bg-muted text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Concluídas'}
                                </button>
                            ))}
                        </div>

                        {/* Task Items List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-[450px]">
                            {filteredTasks.length === 0 ? (
                                <div className="py-16 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-3">
                                    <CheckCircle2 size={40} className="stroke-[1.5]" />
                                    <p className="font-black uppercase tracking-widest text-[10px]">Nenhuma tarefa nesta visualização</p>
                                </div>
                            ) : (
                                filteredTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                                            task.done 
                                                ? 'bg-muted/50 border-transparent opacity-60' 
                                                : 'bg-card border-border hover:border-amber-200 hover:shadow-sm'
                                        }`}
                                    >
                                        <button
                                            onClick={() => toggleTask(task)}
                                            title="Concluir Tarefa"
                                            className={`mt-0.5 w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                task.done 
                                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                    : 'border-border text-transparent hover:border-amber-500'
                                            }`}
                                        >
                                            <CheckCircle2 size={12} />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-bold text-xs text-foreground truncate ${task.done ? 'line-through text-slate-400' : ''}`}>
                                                {task.title}
                                            </h4>
                                            <div className="flex flex-wrap gap-2 mt-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                {task.workName && (
                                                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border/50">
                                                        {task.workName}
                                                    </span>
                                                )}
                                                {task.priority === 'Alta' && (
                                                    <span className="text-red-500 flex items-center gap-0.5">
                                                        <AlertCircle size={9} /> Alta
                                                    </span>
                                                )}
                                                {task.dueDate && (
                                                    <span className="flex items-center gap-0.5">
                                                        <Clock size={9} /> {new Date(task.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            title="Excluir Tarefa"
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-2"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Google Events List */}
                    <div className="bg-card rounded-[40px] shadow-sm border border-border flex flex-col overflow-hidden">
                        <div className="p-8 border-b border-border flex justify-between items-center bg-muted/30">
                            <div>
                                <h3 className="text-lg font-black text-foreground uppercase italic tracking-tight flex items-center gap-2">
                                    <Calendar className="text-blue-500" /> Eventos Sincronizados
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Google Calendar (obrashypado@gmail.com)
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <a
                                    href="https://calendar.google.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Abrir Agenda Google"
                                    className="p-2.5 text-slate-400 hover:text-blue-500 transition-colors bg-muted rounded-xl border border-border/50"
                                >
                                    <ExternalLink size={16} />
                                </a>
                                <button
                                    onClick={() => {
                                        setNewEvent({ type: 'Reunião', start: `${getLocalDateString(new Date())}T09:00` });
                                        setIsEventModalOpen(true);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-500/10"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[500px]">
                            {sortedEvents.length === 0 ? (
                                <div className="py-24 text-center text-slate-300 dark:text-slate-700 flex flex-col items-center justify-center gap-3">
                                    <LayoutList size={40} className="stroke-[1.5]" />
                                    <p className="font-black uppercase tracking-widest text-[10px]">Nenhum evento registrado</p>
                                </div>
                            ) : (
                                sortedEvents.map(event => {
                                    const eventDate = new Date(event.start);
                                    const isToday = getLocalDateString(new Date()) === event.start.split('T')[0];

                                    return (
                                        <div
                                            key={event.id}
                                            className={`p-4 rounded-2xl border bg-card hover:shadow-sm transition-all group flex items-start gap-4 ${
                                                event.type === 'Reunião' ? 'border-l-4 border-l-blue-500' :
                                                event.type === 'Visita' ? 'border-l-4 border-l-amber-500' :
                                                event.type === 'Instalação' ? 'border-l-4 border-l-emerald-500' :
                                                'border-l-4 border-l-slate-400'
                                            }`}
                                        >
                                            {/* Date badge */}
                                            <div className="text-center w-14 shrink-0 pr-4 border-r border-border/60">
                                                <span className={`block text-xs font-black leading-none ${isToday ? 'text-primary' : 'text-foreground/80'}`}>
                                                    {eventDate.getDate()}
                                                </span>
                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                    {eventDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                                                </span>
                                                <span className="block text-[8px] font-extrabold text-slate-300 uppercase mt-0.5">
                                                    {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {/* Event details */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-xs text-foreground truncate">{event.title}</h4>
                                                {event.description && (
                                                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                                        {event.description}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    <span className="text-[8px] font-black uppercase tracking-widest bg-muted px-2 py-0.5 rounded border border-border/50 text-muted-foreground flex items-center gap-1">
                                                        <Circle size={5} fill="currentColor" /> {event.type}
                                                    </span>
                                                    {event.location && (
                                                        <span className="text-[8px] font-black uppercase tracking-widest bg-muted px-2 py-0.5 rounded border border-border/50 text-muted-foreground flex items-center gap-1 truncate max-w-[150px]">
                                                            <MapPin size={8} /> {event.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}

            {/* Task Creation Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-md font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                                <CheckSquare size={18} className="text-amber-500" /> Nova Tarefa Interna
                            </h3>
                            <button
                                onClick={() => setIsTaskModalOpen(false)}
                                className="text-slate-400 hover:text-foreground text-sm font-bold"
                            >
                                Fechar
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Título da Tarefa</label>
                                <input
                                    className="w-full bg-muted/40 border border-border/60 px-4 py-3 rounded-2xl text-xs font-bold outline-none focus:border-amber-500 placeholder:text-slate-400"
                                    placeholder="Ex: Comprar ferragens extras para Obra X"
                                    value={newTask.title || ''}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Vincular a uma Obra</label>
                                    <select
                                        className="w-full bg-muted/40 border border-border/60 p-3 rounded-2xl text-xs font-bold outline-none cursor-pointer"
                                        value={newTask.projectId || ''}
                                        onChange={e => setNewTask({ ...newTask, projectId: e.target.value })}
                                    >
                                        <option value="">Nenhuma Obra...</option>
                                        {projects.filter(p => p.currentStatus !== 'Finalizada').map(p => (
                                            <option key={p.id} value={p.id}>{p.workName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Prioridade</label>
                                    <select
                                        className="w-full bg-muted/40 border border-border/60 p-3 rounded-2xl text-xs font-bold outline-none cursor-pointer"
                                        value={newTask.priority}
                                        onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                                    >
                                        <option value="Baixa">Baixa</option>
                                        <option value="Média">Média</option>
                                        <option value="Alta">Alta</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Prazo Final</label>
                                <input
                                    type="date"
                                    className="w-full bg-muted/40 border border-border/60 p-3 rounded-2xl text-xs font-bold outline-none text-muted-foreground"
                                    value={newTask.dueDate || ''}
                                    onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setIsTaskModalOpen(false)}
                                className="flex-1 py-3 font-black text-slate-400 hover:text-foreground text-[10px] uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateTask}
                                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Creation Modal */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-md font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                                <Calendar size={18} className="text-blue-500" /> Novo Compromisso Google
                            </h3>
                            <button
                                onClick={() => setIsEventModalOpen(false)}
                                className="text-slate-400 hover:text-foreground text-sm font-bold"
                            >
                                Fechar
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Título do Evento</label>
                                <input
                                    className="w-full bg-muted/40 border border-border/60 px-4 py-3 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 placeholder:text-slate-400"
                                    placeholder="Ex: Medição Técnica - Ap 50 Debora"
                                    value={newEvent.title || ''}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Início</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-muted/40 border border-border/60 p-3 rounded-2xl text-xs font-bold outline-none text-muted-foreground"
                                        value={newEvent.start || ''}
                                        onChange={e => setNewEvent({ ...newEvent, start: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Fim (Previsto)</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-muted/40 border border-border/60 p-3 rounded-2xl text-xs font-bold outline-none text-muted-foreground"
                                        value={newEvent.end || ''}
                                        onChange={e => setNewEvent({ ...newEvent, end: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Tipo de Evento</label>
                                    <select
                                        className="w-full bg-muted/40 border border-border/60 p-3 rounded-2xl text-xs font-bold outline-none cursor-pointer"
                                        value={newEvent.type}
                                        onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                                    >
                                        <option value="Reunião">Reunião / Apresentação</option>
                                        <option value="Visita">Medição / Visita Técnica</option>
                                        <option value="Instalação">Entrega / Montagem</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Vincular a Obra</label>
                                    <select
                                        className="w-full bg-muted/40 border border-border/60 p-3 rounded-2xl text-xs font-bold outline-none cursor-pointer"
                                        value={newEvent.projectId || ''}
                                        onChange={e => setNewEvent({ ...newEvent, projectId: e.target.value })}
                                    >
                                        <option value="">Nenhuma Obra...</option>
                                        {projects.filter(p => p.currentStatus !== 'Finalizada').map(p => (
                                            <option key={p.id} value={p.id}>{p.workName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Descrição ou Pauta</label>
                                <textarea
                                    className="w-full bg-muted/40 border border-border/60 p-3 rounded-2xl text-xs font-bold outline-none h-20 resize-none placeholder:text-slate-400"
                                    placeholder="Pauta da reunião ou detalhes específicos..."
                                    value={newEvent.description || ''}
                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Localização / Link de Videochamada</label>
                                <input
                                    className="w-full bg-muted/40 border border-border/60 px-4 py-3 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 placeholder:text-slate-400"
                                    placeholder="Ex: Endereço do cliente ou meet.google.com/xyz"
                                    value={newEvent.location || ''}
                                    onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setIsEventModalOpen(false)}
                                className="flex-1 py-3 font-black text-slate-400 hover:text-foreground text-[10px] uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateEvent}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg flex flex-col items-center justify-center leading-none"
                            >
                                <span>Agendar</span>
                                <span className="text-[7px] opacity-75 mt-1 font-medium transform normal-case tracking-normal">e abrir Google Calendar</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaView;
