
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Client, Project, Installer, Quotation, Task, CalendarEvent, Company, TechnicalAssistance, Supplier, Material, DailyLog, TimelineEvent, UserRole, AssistanceStatus, RefundRequest, RefundStatus } from '../types';

interface DataContextType {
    clients: Client[];
    projects: Project[];
    installers: Installer[];
    loading: boolean;
    refreshData: () => Promise<void>;
    addInstaller: (installer: Installer) => Promise<void>;
    updateInstaller: (installer: Installer) => Promise<void>;
    deleteInstaller: (id: string) => Promise<void>;
    addProject: (project: Project) => Promise<void>;
    updateProject: (project: Project) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    addClient: (client: Client) => Promise<void>;
    updateClient: (client: Client) => Promise<void>;
    deleteClient: (id: string) => Promise<void>;
    quotations: Quotation[];
    addQuotation: (quotation: Quotation) => Promise<void>;
    updateQuotation: (quotation: Quotation) => Promise<void>;
    deleteQuotation: (id: string) => Promise<void>;
    tasks: Task[];
    addTask: (task: Task) => Promise<void>;
    updateTask: (task: Task) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    events: CalendarEvent[];
    addEvent: (event: CalendarEvent) => Promise<void>;
    updateEvent: (event: CalendarEvent) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    company: Company;
    updateCompany: (company: Company) => Promise<void>;
    assistances: TechnicalAssistance[];
    addAssistance: (assistance: TechnicalAssistance) => Promise<void>;
    updateAssistance: (assistance: TechnicalAssistance) => Promise<void>;
    deleteAssistance: (id: string) => Promise<void>;
    suppliers: Supplier[];
    addSupplier: (supplier: Supplier) => Promise<void>;
    updateSupplier: (supplier: Supplier) => Promise<void>;
    deleteSupplier: (id: string) => Promise<void>;
    materials: Material[];
    addMaterial: (material: Material) => Promise<void>;
    updateMaterial: (material: Material) => Promise<void>;
    deleteMaterial: (id: string) => Promise<void>;
    dailyLogs: DailyLog[];
    addDailyLog: (log: DailyLog) => Promise<void>;
    updateDailyLog: (log: DailyLog) => Promise<void>;
    deleteDailyLog: (id: string) => Promise<void>;
    refundRequests: RefundRequest[];
    addRefundRequest: (request: RefundRequest) => Promise<void>;
    updateRefundRequest: (request: RefundRequest) => Promise<void>;
    deleteRefundRequest: (id: string) => Promise<void>;
    resetDatabase: () => Promise<void>;
    logEvent: (
        relatedId: string,
        relatedType: 'PROJECT' | 'DAILY_LOG' | 'PURCHASE_ORDER' | 'TASK',
        eventType: 'STATUS_CHANGE' | 'CREATED' | 'UPDATED' | 'COMMENT',
        oldValue?: string,
        newValue?: string
    ) => Promise<void>;
    userRole: UserRole | null;
    currentUserEmail: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const mapProjectFromDB = (p: any): Project => ({
    ...p,
    clientId: p.client_id || p.clientId,
    clientName: p.client_name || p.clientName,
    workName: p.work_name || p.workName,
    workAddress: p.work_address || p.workAddress,
    contractDate: p.contract_date || p.contractDate,
    promisedDate: p.promised_date || p.promisedDate,
    currentStatus: p.current_status || p.currentStatus,
    installerId: p.installer_id || p.installerId,
    cloudFolderLink: p.cloud_folder_link || p.cloudFolderLink,
    materialsDelivered: p.materials_delivered || p.materialsDelivered,
    productionCentral: p.production_central || p.productionCentral,
    qualityReport: p.quality_report,
    preAssemblyDone: p.pre_assembly_done,
    freightOrganized: p.freight_organized,
    clientScheduled: p.client_scheduled,
    deliveryPath: p.delivery_path,
    preAssemblyTeam: p.pre_assembly_team,
    freightCarrierId: p.freight_carrier_id,
    freightDate: p.freight_scheduling_date,
    deliveryDate: p.client_delivery_date,
    projectPdfUrl: p.project_pdf_url,
    architectId: p.architectId || p.architect_id || '', // Load architect ID
    environmentsDetails: p.environmentsDetails || p.environments_details || [], // FIX: Load rich data
    outsourcedServices: p.outsourced_services || p.outsourcedServices || [] // FIX: Load from DB
});

const mapProjectToDB = (project: Project) => {
    const payload = {
        id: project.id,
        clientId: project.clientId,
        clientName: project.clientName,
        workName: project.workName,
        workAddress: project.workAddress || '',
        value: project.value,
        contractDate: project.contractDate,
        promisedDate: project.promisedDate,
        currentStatus: project.currentStatus,
        cloudFolderLink: project.cloudFolderLink,
        materialsDelivered: project.materialsDelivered,
        environments: project.environments || [],
        environmentsDetails: project.environmentsDetails || [],
        expenses: project.expenses || [],
        outsourced_services: project.outsourcedServices || [],
        attachments: project.attachments || [],
        project_pdf_url: project.projectPdfUrl,
        pre_assembly_done: project.preAssemblyDone,
        freight_organized: project.freightOrganized,
        client_scheduled: project.clientScheduled,
        delivery_path: project.deliveryPath,
        freight_carrier_id: project.freightCarrierId,
        freight_scheduling_date: project.freightDate,
        client_delivery_date: project.deliveryDate,
        architect_id: project.architectId,
        installer_id: project.installerId,
        production_central: project.productionCentral
    };
    console.log('Project mapping payload for DB (Hybrid):', payload);
    return payload;
};

const mapClientFromDB = (c: any): Client => ({
    ...c,
    // Add any specific field mappings if needed in the future
});

const mapClientToDB = (client: Client) => {
    const {
        quadra,
        lote,
        description,
        projectsCount,
        averageRating,
        lastVisit,
        isBlocked,
        avatar,
        ...dbClient
    } = client;
    return dbClient;
};

const mapInstallerFromDB = (i: any): Installer => ({
    id: i.id,
    name: i.name || '',
    cpf: i.cpf || '',
    phone: i.phone || '',
    role: i.role || 'Montador',
    status: i.status || 'Ativo',
    specialty: i.specialty || '',
    observations: i.observations || '',
    installationsCount: 0,
    averageRating: 0,
    totalBonus: 0,
    avatar: i.avatar || ''
});

const mapInstallerToDB = (installer: Installer) => ({
    id: installer.id,
    name: installer.name,
    cpf: installer.cpf,
    phone: installer.phone,
    role: installer.role,
    status: installer.status,
    specialty: installer.specialty,
    observations: installer.observations,
    avatar: installer.avatar
});

const mapRefundFromDB = (r: any): RefundRequest => ({
    id: r.id,
    collaboratorName: r.collaborator_name,
    date: r.date,
    establishment: r.establishment,
    description: r.description,
    category: r.category,
    amount: parseFloat(r.amount),
    cnpj: r.cnpj,
    status: r.status as RefundStatus,
    projectId: r.project_id,
    receiptUrl: r.receipt_url,
    settlementId: r.settlement_id,
    createdAt: r.created_at
});

const mapRefundToDB = (r: RefundRequest) => ({
    collaborator_name: r.collaboratorName,
    date: r.date,
    establishment: r.establishment,
    description: r.description,
    category: r.category,
    amount: r.amount,
    cnpj: r.cnpj,
    status: r.status,
    project_id: r.projectId,
    receipt_url: r.receiptUrl,
    settlement_id: r.settlementId
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [installers, setInstallers] = useState<Installer[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [company, setCompany] = useState<Company>({
        name: 'Hypado Planejados',
        cnpj: '00.000.000/0001-00',
        phone: '(11) 99999-8888',
        email: 'contato@hypado.com.br',
        address: 'Rua da Marcenaria, 123 - Polo Industrial'
    });
    const [assistances, setAssistances] = useState<TechnicalAssistance[]>([]);
    const [loading, setLoading] = useState(true);

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const [materials, setMaterials] = useState<Material[]>([]);
    const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

    const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);


    // --- GRANULAR FETCH FUNCTIONS ---

    const fetchClients = async () => {
        const { data, error } = await supabase.from('clients').select('*');
        if (error) console.error('Error fetching clients:', error);
        if (data) setClients(data as Client[]);
    };

    const fetchProjects = async () => {
        const { data, error } = await supabase.from('projects').select('*');
        if (error) console.error('Error fetching projects:', error);
        if (data) setProjects(data.map(mapProjectFromDB));
    };

    const fetchInstallers = async () => {
        const { data, error } = await supabase.from('installers').select('id, name, cpf, phone, role, status, specialty, observations');
        if (error) console.error('Error fetching installers:', error);

        if (data && data.length === 0) {
            console.log('No installers found. Seeding mock installers...');
            // Auto-seed if empty
            const { MOCK_INSTALLERS } = await import('../mockData');
            const mappedMock = MOCK_INSTALLERS.map(inst => mapInstallerToDB(inst));
            const { error: seedError } = await supabase.from('installers').insert(mappedMock);

            if (seedError) {
                console.error('Error seeding installers:', seedError);
                // Fallback to memory so UI doesn't break even if table schema completely differs
                setInstallers(MOCK_INSTALLERS);
            } else {
                setInstallers(MOCK_INSTALLERS);
            }
            return;
        }

        if (data && data.length > 0) {
            setInstallers(data.map(mapInstallerFromDB));
        }
    };

    const fetchQuotations = async () => {
        const { data, error } = await supabase.from('purchase_orders').select('*');
        if (error) console.error('Error fetching quotations:', error);
        if (data) setQuotations(data as Quotation[]);
    };

    const fetchTasks = async () => {
        const { data, error } = await supabase.from('tasks').select('*');
        if (error) console.error('Error fetching tasks:', error);
        if (data) setTasks(data as Task[]);
    };

    const fetchEvents = async () => {
        const { data, error } = await supabase.from('events').select('*');
        if (error) console.error('Error fetching events:', error);
        if (data) setEvents(data as CalendarEvent[]);
    };

    const fetchSuppliers = async () => {
        const { data, error } = await supabase.from('suppliers').select('*');
        if (error) console.error('Error fetching suppliers:', error);
        if (data) setSuppliers(data as Supplier[]);
    };

    const fetchMaterials = async () => {
        const { data, error } = await supabase.from('materials').select('*');
        if (error) console.error('Error fetching materials:', error);
        if (data) {
            const mappedMaterials = data.map((m: any) => ({
                id: m.id,
                name: m.name,
                category: m.category,
                brand: m.brand,
                model: m.model,
                color: m.color,
                thickness: m.thickness,
                unit: m.unit,
                costPrice: m.cost_price,
                sellingPrice: m.selling_price,
                code: m.code,
                supplierId: m.supplier_id,
                imageUrl: m.image_url
            }));
            setMaterials(mappedMaterials);
        }
    };

    const fetchAssistances = async () => {
        const { data, error } = await supabase.from('technical_assistance').select('*');
        if (error) console.error('Error fetching assistances:', error);
        if (data) {
            const mapped = data.map((a: any) => ({
                id: a.id,
                clientId: a.client_id,
                clientName: a.client_name,
                projectId: a.project_id,
                workName: a.work_name,
                requestDate: a.request_date,
                scheduledDate: a.scheduled_date,
                scheduledTime: a.scheduled_time,
                reportedProblem: a.reported_problem,
                photoUrl: a.photo_url,
                videoUrl: a.video_url,
                originalInstallerId: a.original_installer_id,
                technicianId: a.technician_id,
                visitResult: a.visit_result,
                pendingIssues: a.pending_issues,
                returnDate: a.return_date,
                finalObservations: a.final_observations,
                status: a.status as AssistanceStatus
            }));
            setAssistances(mapped);
        }
    };

    const fetchDailyLogs = async () => {
        const { data, error } = await supabase.from('daily_logs').select('*');
        if (error) console.error('Error fetching daily logs:', error);
        if (data) {
            const mapped = data.map((l: any) => ({
                id: l.id,
                projectId: l.project_id,
                workName: l.work_name,
                date: l.date,
                author: l.author,
                category: l.category,
                description: l.description,
                photoUrl: l.photo_url,
                reworkDetails: l.rework_details,
                status: l.status,
                createdAt: l.created_at
            }));
            setDailyLogs(mapped);
        }
    };

    const fetchTimelineEvents = async () => {
        const { data, error } = await supabase.from('timeline_events').select('*');
        if (error) console.error('Error fetching timeline events:', error);
        if (data) {
            const mapped = data.map((e: any) => ({
                id: e.id,
                createdAt: e.created_at,
                relatedId: e.related_id,
                relatedType: e.related_type,
                eventType: e.event_type,
                oldValue: e.old_value,
                newValue: e.new_value,
                userId: e.user_id,
            }));
            setTimelineEvents(mapped);
        }
    };

    const fetchCompany = async () => {
        const { data, error } = await supabase.from('company_settings').select('*').eq('id', 'main').single();
        if (error && error.code !== 'PGRST116') console.error('Error fetching company:', error);
        if (data) setCompany(data as Company);
    };

    const isFetching = useRef(false);

    // Global Fetch (Initial Load)
    const fetchRefundRequests = async () => {
        const { data, error } = await supabase.from('refund_requests').select('*');
        if (error) console.error('Error fetching refunds:', error);
        if (data) setRefundRequests(data.map(mapRefundFromDB));
    };

    const fetchData = async () => {
        if (isFetching.current) return; // Prevent double-fetch queueing on DB
        isFetching.current = true;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            isFetching.current = false;
            return;
        }

        try {
            await Promise.all([
                fetchClients(),
                fetchProjects(),
                fetchInstallers(),
                fetchRefundRequests(),
                fetchEvents(),
                fetchSuppliers(),
                fetchMaterials(),
                fetchQuotations(),
                fetchAssistances(),
                fetchDailyLogs(),
                fetchTasks(),
                fetchTimelineEvents(),
                fetchCompany()
            ]);
        } catch (error) {
            console.error('Exception fetching data:', error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    };

    useEffect(() => {
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                // FORCE OWNER ROLE TO RESTORE FULL ACCESS
                const role = 'owner';
                console.log('DEBUG: Forced User Role:', role);
                setUserRole(role);
                setCurrentUserEmail(session.user?.email || null);
                fetchData();
            } else {
                setUserRole(null);
                setCurrentUserEmail(null);
                setClients([]);
                setProjects([]);
                setInstallers([]);
                setQuotations([]);
                setTasks([]);
                setEvents([]);
                setAssistances([]);
                setSuppliers([]);
                setMaterials([]);
                setDailyLogs([]);
                setTimelineEvents([]);
                setRefundRequests([]);
                setLoading(false);
            }
        });

        // Initial check required since some Supabase clients miss the onAuthStateChange mount trigger
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                const role = 'owner';
                setUserRole(role);
                setCurrentUserEmail(session.user?.email || null);
                fetchData();
            } else {
                setLoading(false);
            }
        });

        // --- GRANULAR SUBSCRIPTIONS ---
        // Only trigger specific fetch functions to prevent full reload on every event
        const clientSub = supabase.channel('public:clients')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchClients())
            .subscribe();

        const projectSub = supabase.channel('public:projects')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchProjects())
            .subscribe();

        const installersSub = supabase.channel('public:installers')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'installers' }, () => fetchInstallers())
            .subscribe();

        const quotationSub = supabase.channel('public:purchase_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => fetchQuotations())
            .subscribe();

        const tasksSub = supabase.channel('public:tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
            .subscribe();

        const eventsSub = supabase.channel('public:events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents())
            .subscribe();

        const companySub = supabase.channel('public:company_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'company_settings' }, () => fetchCompany())
            .subscribe();

        const assistanceSub = supabase.channel('public:technical_assistance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'technical_assistance' }, () => fetchAssistances())
            .subscribe();

        const suppliersSub = supabase.channel('public:suppliers')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => fetchSuppliers())
            .subscribe();

        const materialsSub = supabase.channel('public:materials')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => fetchMaterials())
            .subscribe();

        const logsSub = supabase.channel('public:daily_logs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, () => fetchDailyLogs())
            .subscribe();

        const timelineEventsSub = supabase.channel('public:timeline_events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'timeline_events' }, () => fetchTimelineEvents())
            .subscribe();

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(clientSub);
            supabase.removeChannel(projectSub);
            supabase.removeChannel(installersSub);
            supabase.removeChannel(quotationSub);
            supabase.removeChannel(tasksSub);
            supabase.removeChannel(eventsSub);
            supabase.removeChannel(companySub);
            supabase.removeChannel(assistanceSub);
            supabase.removeChannel(suppliersSub);
            supabase.removeChannel(materialsSub); // supplySub was duplicated in old code
            supabase.removeChannel(logsSub);
            supabase.removeChannel(timelineEventsSub);
        };
    }, []);

    const addInstaller = async (installer: Installer) => {
        try {
            const dbPayload = mapInstallerToDB(installer);
            const { error } = await supabase.from('installers').insert([dbPayload]);
            if (error) throw error;
            setInstallers(prev => [...prev, installer]);
        } catch (error: any) {
            console.error('Error adding installer:', error);
            alert(`Erro ao adicionar montador: ${error.message || JSON.stringify(error)}`);
        }
    };

    const updateInstaller = async (installer: Installer) => {
        try {
            const dbPayload = mapInstallerToDB(installer);
            const { error } = await supabase.from('installers').update(dbPayload).eq('id', installer.id);
            if (error) throw error;
            setInstallers(prev => prev.map(i => i.id === installer.id ? installer : i));
        } catch (error) {
            console.error('Error updating installer:', error);
            alert('Erro ao atualizar montador. Verifique o console.');
        }
    };

    const deleteInstaller = async (id: string) => {
        try {
            const { error } = await supabase.from('installers').delete().eq('id', id);
            if (error) throw error;
            setInstallers(prev => prev.filter(i => i.id !== id));
        } catch (error) {
            console.error('Error deleting installer:', error);
            alert('Erro ao excluir montador. Verifique o console.');
        }
    };

    const addProject = async (project: Project) => {
        try {
            const payload = mapProjectToDB(project);
            const { error } = await supabase.from('projects').insert([payload]);
            if (error) throw error;
            setProjects(prev => [...prev, project]);
        } catch (error: any) {
            console.error('Error adding project:', error);
            alert(`Erro ao adicionar obra: ${error.message}`);
        }
    };

    const updateProject = async (project: Project) => {
        try {
            const payload = mapProjectToDB(project);
            const currentProject = projects.find(p => p.id === project.id);
            if (project.currentStatus !== currentProject?.currentStatus) {
                await logEvent(
                    project.id,
                    'PROJECT',
                    'STATUS_CHANGE',
                    currentProject?.currentStatus,
                    project.currentStatus
                );
            }

            const { error } = await supabase.from('projects').update(payload).eq('id', project.id);
            if (error) throw error;

            // Sync local state and force a refresh from DB
            setProjects(prev => prev.map(p => p.id === project.id ? project : p));
            await fetchData();
        } catch (error: any) {
            console.error('Error updating project:', error);
            alert(`Erro ao atualizar obra: ${error.message}`);
        }
    };

    const deleteProject = async (id: string) => {
        try {
            const { error } = await supabase.from('projects').delete().eq('id', id);
            if (error) throw error;
            setProjects(prev => prev.filter(p => p.id !== id));
        } catch (error: any) {
            console.error('Error deleting project:', error);
            alert(`Erro ao excluir obra: ${error.message}`);
        }
    };

    const addClient = async (client: Client) => {
        try {
            const payload = mapClientToDB(client);
            const { error } = await supabase.from('clients').insert([payload]);
            if (error) throw error;
            setClients(prev => [...prev, client]);
        } catch (error: any) {
            console.error('Error adding client:', error);
            alert(`Erro ao adicionar cliente: ${error.message}`);
        }
    };

    const updateClient = async (client: Client) => {
        try {
            const payload = mapClientToDB(client);
            const { error } = await supabase.from('clients').update(payload).eq('id', client.id);
            if (error) throw error;
            setClients(prev => prev.map(c => c.id === client.id ? client : c));
        } catch (error: any) {
            console.error('Error updating client:', error);
            alert(`Erro ao atualizar cliente: ${error.message}`);
        }
    };

    const deleteClient = async (id: string) => {
        try {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
            setClients(prev => prev.filter(c => c.id !== id));
        } catch (error: any) {
            console.error('Error deleting client:', error);
            alert(`Erro ao excluir cliente: ${error.message}`);
        }
    };

    const addQuotation = async (quotation: Quotation) => {
        try {
            const { error } = await supabase.from('purchase_orders').insert([quotation]);
            if (error) throw error;
            setQuotations(prev => [...prev, quotation]);
        } catch (error: any) {
            console.error('Error adding quotation:', error);
            alert(`Erro ao adicionar pedido: ${error.message}`);
        }
    };

    const updateQuotation = async (quotation: Quotation) => {
        try {
            const { error } = await supabase.from('purchase_orders').update(quotation).eq('id', quotation.id);
            if (error) throw error;
            setQuotations(prev => prev.map(q => q.id === quotation.id ? quotation : q));
        } catch (error: any) {
            console.error('Error updating quotation:', error);
            alert(`Erro ao atualizar pedido: ${error.message}`);
        }
    };

    const deleteQuotation = async (id: string) => {
        try {
            const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
            if (error) throw error;
            setQuotations(prev => prev.filter(q => q.id !== id));
        } catch (error: any) {
            console.error('Error deleting quotation:', error);
            alert(`Erro ao excluir pedido: ${error.message}`);
        }
    };

    const addTask = async (task: Task) => {
        try {
            const { error } = await supabase.from('tasks').insert([task]);
            if (error) throw error;
            setTasks(prev => [...prev, task]);
        } catch (error: any) {
            console.error('Error adding task:', error);
            alert(`Erro ao adicionar tarefa: ${error.message}`);
        }
    };

    const updateTask = async (task: Task) => {
        try {
            const { error } = await supabase.from('tasks').update(task).eq('id', task.id);
            if (error) throw error;
            setTasks(prev => prev.map(t => t.id === task.id ? task : t));
        } catch (error: any) {
            console.error('Error updating task:', error);
            alert(`Erro ao atualizar tarefa: ${error.message}`);
        }
    };

    const deleteTask = async (id: string) => {
        try {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
            setTasks(prev => prev.filter(t => t.id !== id));
        } catch (error: any) {
            console.error('Error deleting task:', error);
            alert(`Erro ao excluir tarefa: ${error.message}`);
        }
    };

    const addEvent = async (event: CalendarEvent) => {
        try {
            const { error } = await supabase.from('events').insert([event]);
            if (error) throw error;
            setEvents(prev => [...prev, event]);
        } catch (error: any) {
            console.error('Error adding event:', error);
            alert(`Erro ao adicionar evento: ${error.message}`);
        }
    };

    const updateEvent = async (event: CalendarEvent) => {
        try {
            const { error } = await supabase.from('events').update(event).eq('id', event.id);
            if (error) throw error;
            setEvents(prev => prev.map(e => e.id === event.id ? event : e));
        } catch (error: any) {
            console.error('Error updating event:', error);
            alert(`Erro ao atualizar evento: ${error.message}`);
        }
    };

    const deleteEvent = async (id: string) => {
        try {
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (error) throw error;
            setEvents(prev => prev.filter(e => e.id !== id));
        } catch (error: any) {
            console.error('Error deleting event:', error);
            alert(`Erro ao excluir evento: ${error.message}`);
        }
    };

    const updateCompany = async (updatedCompany: Company) => {
        try {
            const { name, cnpj, phone, email, address, logo } = updatedCompany;
            // Upsert with id='main'
            const { error } = await supabase.from('company_settings').upsert({
                id: 'main',
                name, cnpj, phone, email, address, logo
            });

            if (error) throw error;
            setCompany(updatedCompany);
        } catch (error: any) {
            console.error('Error updating company:', error);
            alert(`Erro ao atualizar configurações: ${error.message}`);
        }
    };

    const addAssistance = async (assistance: TechnicalAssistance) => {
        try {
            const dbAssistance = {
                id: assistance.id,
                client_id: assistance.clientId,
                client_name: assistance.clientName,
                project_id: assistance.projectId,
                work_name: assistance.workName,
                request_date: assistance.requestDate,
                scheduled_date: assistance.scheduledDate,
                scheduled_time: assistance.scheduledTime,
                reported_problem: assistance.reportedProblem,
                photo_url: assistance.photoUrl,
                video_url: assistance.videoUrl, // New Field
                original_installer_id: assistance.originalInstallerId, // New Field
                technician_id: assistance.technicianId,
                visit_result: assistance.visitResult,
                pending_issues: assistance.pendingIssues,
                return_date: assistance.returnDate,
                final_observations: assistance.finalObservations,
                status: assistance.status
            };

            const { error } = await supabase.from('technical_assistance').insert([dbAssistance]);
            if (error) throw error;
            setAssistances(prev => [...prev, assistance]);
        } catch (error: any) {
            console.error('Error adding assistance:', error);
            alert(`Erro ao adicionar assistência: ${error.message}`);
        }
    };

    const updateAssistance = async (assistance: TechnicalAssistance) => {
        try {
            const dbAssistance = {
                client_id: assistance.clientId,
                client_name: assistance.clientName,
                project_id: assistance.projectId,
                work_name: assistance.workName,
                request_date: assistance.requestDate,
                scheduled_date: assistance.scheduledDate,
                scheduled_time: assistance.scheduledTime,
                reported_problem: assistance.reportedProblem,
                photo_url: assistance.photoUrl,
                video_url: assistance.videoUrl, // New Field
                original_installer_id: assistance.originalInstallerId, // New Field
                technician_id: assistance.technicianId,
                visit_result: assistance.visitResult,
                pending_issues: assistance.pendingIssues,
                return_date: assistance.returnDate,
                final_observations: assistance.finalObservations,
                status: assistance.status
            };

            const { error } = await supabase.from('technical_assistance').update(dbAssistance).eq('id', assistance.id);
            if (error) throw error;
            setAssistances(prev => prev.map(a => a.id === assistance.id ? assistance : a));
        } catch (error: any) {
            console.error('Error updating assistance:', error);
            alert(`Erro ao atualizar assistência: ${error.message}`);
        }
    };

    const deleteAssistance = async (id: string) => {
        try {
            const { error } = await supabase.from('technical_assistance').delete().eq('id', id);
            if (error) throw error;
            setAssistances(prev => prev.filter(a => a.id !== id));
        } catch (error: any) {
            console.error('Error deleting assistance:', error);
            alert(`Erro ao excluir assistência: ${error.message}`);
        }
    };

    const addSupplier = async (supplier: Supplier) => {
        try {
            const { error } = await supabase.from('suppliers').insert([supplier]);
            if (error) throw error;
            setSuppliers(prev => [...prev, supplier]);
        } catch (error: any) {
            console.error('Error adding supplier:', error);
            alert(`Erro ao adicionar parceiro: ${error.message}`);
        }
    };

    const updateSupplier = async (supplier: Supplier) => {
        try {
            const { error } = await supabase.from('suppliers').update(supplier).eq('id', supplier.id);
            if (error) throw error;
            setSuppliers(prev => prev.map(s => s.id === supplier.id ? supplier : s));
        } catch (error: any) {
            console.error('Error updating supplier:', error);
            alert(`Erro ao atualizar parceiro: ${error.message}`);
        }
    };

    const deleteSupplier = async (id: string) => {
        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            setSuppliers(prev => prev.filter(s => s.id !== id));
        } catch (error: any) {
            console.error('Error deleting supplier:', error);
            alert(`Erro ao excluir parceiro: ${error.message}`);
        }
    };

    const addMaterial = async (material: Material) => {
        try {
            // Map frontend camelCase to DB snake_case
            const payload = {
                id: material.id,
                name: material.name,
                category: material.category,
                brand: material.brand,
                model: material.model,
                color: material.color,
                thickness: material.thickness,
                unit: material.unit,
                cost_price: material.costPrice,
                selling_price: material.sellingPrice,
                code: material.code,
                supplier_id: material.supplierId,
                image_url: material.imageUrl
            };
            const { error } = await supabase.from('materials').insert([payload]);
            if (error) throw error;
            setMaterials(prev => [...prev, material]);
        } catch (error: any) {
            console.error('Error adding material:', error);
            alert(`Erro ao adicionar material: ${error.message}`);
        }
    };

    const updateMaterial = async (material: Material) => {
        try {
            // Map frontend camelCase to DB snake_case
            const payload = {
                name: material.name,
                category: material.category,
                brand: material.brand,
                model: material.model,
                color: material.color,
                thickness: material.thickness,
                unit: material.unit,
                cost_price: material.costPrice,
                selling_price: material.sellingPrice,
                code: material.code,
                supplier_id: material.supplierId,
                image_url: material.imageUrl
            };
            const { error } = await supabase.from('materials').update(payload).eq('id', material.id);
            if (error) throw error;
            setMaterials(prev => prev.map(m => m.id === material.id ? material : m));
        } catch (error: any) {
            console.error('Error updating material:', error);
            alert(`Erro ao atualizar material: ${error.message}`);
        }
    };

    const deleteMaterial = async (id: string) => {
        try {
            const { error } = await supabase.from('materials').delete().eq('id', id);
            if (error) throw error;
            setMaterials(prev => prev.filter(m => m.id !== id));
        } catch (error: any) {
            console.error('Error deleting material:', error);
            alert(`Erro ao excluir material: ${error.message}`);
        }
    };

    const addDailyLog = async (log: DailyLog) => {
        try {
            const payload = {
                project_id: log.projectId === 'manual' ? null : log.projectId,
                work_name: log.workName,
                date: log.date,
                author: log.author,
                category: log.category,
                description: log.description,
                photo_url: log.photoUrl,
                rework_details: log.reworkDetails,
                status: log.status
            };
            const { error } = await supabase.from('daily_logs').insert([payload]);
            if (error) throw error;

            // Log Creation
            await logEvent(log.id, 'DAILY_LOG', 'CREATED', undefined, log.status);

            setDailyLogs(prev => [...prev, log]);
        } catch (error: any) {
            console.error('Error adding daily log:', error);
            alert(`Erro ao adicionar diário: ${error.message}`);
        }
    };

    const updateDailyLog = async (log: DailyLog) => {
        try {
            const logToUpdate = {
                project_id: log.projectId === 'manual' ? null : log.projectId,
                work_name: log.workName,
                date: log.date,
                author: log.author,
                category: log.category,
                description: log.description,
                photo_url: log.photoUrl,
                rework_details: log.reworkDetails,
                status: log.status
            };

            const currentLog = dailyLogs.find(l => l.id === log.id);
            if (log.status !== currentLog?.status) {
                await logEvent(
                    log.id,
                    'DAILY_LOG',
                    'STATUS_CHANGE',
                    currentLog?.status,
                    log.status
                );
            }

            const { error } = await supabase.from('daily_logs').update(logToUpdate).eq('id', log.id);
            if (error) throw error;
            setDailyLogs(prev => prev.map(l => l.id === log.id ? log : l));
        } catch (error: any) {
            console.error('Error updating daily log:', error);
            alert(`Erro ao atualizar diário: ${error.message}`);
        }
    };

    const deleteDailyLog = async (id: string) => {
        try {
            const { error } = await supabase.from('daily_logs').delete().eq('id', id);
            if (error) throw error;
            setDailyLogs(prev => prev.filter(l => l.id !== id));
        } catch (error: any) {
            console.error('Error deleting daily log:', error);
            alert(`Erro ao excluir diário: ${error.message}`);
        }
    };

    const logEvent = async (
        relatedId: string,
        relatedType: 'PROJECT' | 'DAILY_LOG' | 'PURCHASE_ORDER' | 'TASK',
        eventType: 'STATUS_CHANGE' | 'CREATED' | 'UPDATED' | 'COMMENT',
        oldValue?: string,
        newValue?: string
    ) => {
        try {
            const { error } = await supabase.from('timeline_events').insert([{
                related_id: relatedId,
                related_type: relatedType,
                event_type: eventType,
                old_value: oldValue,
                new_value: newValue,
                user_id: 'System User' // Replace with actual user when Auth is ready
            }]);

            if (error) console.error('Error logging event:', error);
        } catch (err) {
            console.error('Exception logging event:', err);
        }
    };

    const addRefundRequest = async (request: RefundRequest) => {
        try {
            const payload = mapRefundToDB(request);
            const { data, error } = await supabase.from('refund_requests').insert([payload]).select();
            if (error) throw error;
            if (data && data[0]) {
                setRefundRequests(prev => [...prev, mapRefundFromDB(data[0])]);
            }
        } catch (error: any) {
            console.error('Error adding refund:', error);
            alert(`Erro ao adicionar reembolso: ${error.message}`);
        }
    };

    const updateRefundRequest = async (request: RefundRequest) => {
        try {
            const payload = mapRefundToDB(request);
            const { error } = await supabase.from('refund_requests').update(payload).eq('id', request.id);
            if (error) throw error;
            setRefundRequests(prev => prev.map(r => r.id === request.id ? request : r));
        } catch (error: any) {
            console.error('Error updating refund:', error);
            alert(`Erro ao atualizar reembolso: ${error.message}`);
        }
    };

    const deleteRefundRequest = async (id: string) => {
        try {
            const { error } = await supabase.from('refund_requests').delete().eq('id', id);
            if (error) throw error;
            setRefundRequests(prev => prev.filter(r => r.id !== id));
        } catch (error: any) {
            console.error('Error deleting refund:', error);
            alert(`Erro ao excluir reembolso: ${error.message}`);
        }
    };

    const resetDatabase = async () => {
        try {
            console.log('Starting Factory Reset...');
            // Delete in order to avoid foreign key constraints (although Supabase handles CASCADE if configured, explicit is safer)

            // 1. Technical Assistance & Daily Logs
            await supabase.from('technical_assistance').delete().neq('id', '0');
            await supabase.from('daily_logs').delete().neq('id', '0');
            // 2. Events & Tasks
            await supabase.from('events').delete().neq('id', '0');
            await supabase.from('tasks').delete().neq('id', '0');
            // 3. Purchase Orders
            await supabase.from('purchase_orders').delete().neq('id', '0');
            // 4. Projects (and cascading environments)
            await supabase.from('projects').delete().neq('id', '0');
            // 5. Clients
            await supabase.from('clients').delete().neq('id', '0');
            // 6. Timeline Events
            await supabase.from('timeline_events').delete().neq('id', '0');


            // Refresh Local State
            setProjects([]);
            setClients([]);
            setQuotations([]);
            setTasks([]);
            setEvents([]);
            setEvents([]);
            setAssistances([]);
            setDailyLogs([]);
            setTimelineEvents([]);

            alert('Sistema reiniciado com sucesso! Todos os dados operacionais foram apagados.');
        } catch (error: any) {
            console.error('Error resetting database:', error);
            alert(`Erro ao reiniciar sistema: ${error.message}`);
        }
    };

    return (
        <DataContext.Provider value={{
            clients, projects, installers, quotations, tasks, events, loading, refreshData: fetchData,
            addInstaller, updateInstaller, deleteInstaller,
            addProject, updateProject, deleteProject,
            addClient, updateClient, deleteClient,
            addQuotation, updateQuotation, deleteQuotation,
            addTask, updateTask, deleteTask,
            addEvent, updateEvent, deleteEvent,
            company, updateCompany,
            assistances, addAssistance, updateAssistance, deleteAssistance,
            suppliers, addSupplier, updateSupplier, deleteSupplier,
            materials, addMaterial, updateMaterial, deleteMaterial,
            dailyLogs, addDailyLog, updateDailyLog, deleteDailyLog,
            refundRequests, addRefundRequest, updateRefundRequest, deleteRefundRequest,
            resetDatabase,
            logEvent,
            userRole,
            currentUserEmail
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
