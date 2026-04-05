import { supabase } from '../supabaseClient';
import { Project, ProductionStatus } from '../types';

export const mapProjectFromDB = (p: any): Project => ({
    ...p,
    clientId: p.clientId,
    clientName: p.clientName,
    workName: p.workName,
    workAddress: p.workAddress,
    contractDate: p.contractDate,
    promisedDate: p.promisedDate,
    currentStatus: p.currentStatus,
    installerId: p.installer_id || p.installerId,
    cloudFolderLink: p.cloudFolderLink,
    materialsDelivered: p.materialsDelivered,
    productionCentral: p.production_central || p.productionCentral,
    qualityReport: p.quality_report || p.qualityReport,
    history: p.history || [],
    preAssemblyDone: p.pre_assembly_done,
    freightOrganized: p.freight_organized,
    clientScheduled: p.client_scheduled,
    deliveryPath: p.delivery_path,
    preAssemblyTeam: p.pre_assembly_team,
    freightCarrierId: p.freight_carrier_id,
    freightDate: p.freight_scheduling_date,
    deliveryDate: p.client_delivery_date,
    isExpeditionReady: p.is_expedition_ready,
    projectPdfUrl: p.project_pdf_url,
    pdfSummary: p.pdf_summary || p.pdfSummary,
    architectId: p.architect_id || p.architectId || '',
    environmentsDetails: p.environmentsDetails || p.environments_details || [],
    outsourcedServices: p.outsourced_services || p.outsourcedServices || []
});

export const mapProjectToDB = (project: Project) => {
    return {
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
        history: project.history || [],
        quality_report: project.qualityReport || null,
        outsourced_services: project.outsourcedServices || [],
        attachments: project.attachments || [],
        project_pdf_url: project.projectPdfUrl,
        pdf_summary: project.pdfSummary,
        pre_assembly_done: project.preAssemblyDone,
        freight_organized: project.freightOrganized,
        client_scheduled: project.clientScheduled,
        delivery_path: project.deliveryPath,
        freight_carrier_id: project.freightCarrierId,
        freight_scheduling_date: project.freightDate,
        client_delivery_date: project.deliveryDate,
        is_expedition_ready: project.isExpeditionReady,
        architect_id: project.architectId,
        installer_id: project.installerId,
        production_central: project.productionCentral,
        pre_assembly_team: project.preAssemblyTeam || [],
        // Address structured fields (verified as camelCase)
        addressCep: project.addressCep,
        addressCity: project.addressCity,
        addressStreet: project.addressStreet,
        addressNumber: project.addressNumber,
        addressNeighborhood: project.addressNeighborhood,
        addressComplement: project.addressComplement,
        addressQuadra: project.addressQuadra,
        addressLote: project.addressLote
    };
};

const SUMMARY_COLUMNS = `
    id, clientId, clientName, workName, workAddress, 
    value, contractDate, promisedDate, currentStatus, 
    materialsDelivered, is_expedition_ready, architect_id, 
    installer_id, production_central, pre_assembly_done, 
    freight_organized, client_scheduled, delivery_path, 
    freight_carrier_id, freight_scheduling_date, client_delivery_date,
    addressCep, addressCity, addressStreet, addressNumber, 
    addressNeighborhood, addressComplement, addressQuadra, addressLote
`;

export const projectService = {
    async getAll(): Promise<Project[]> {
        const { data, error } = await supabase.from('projects').select('*');
        if (error) throw error;
        return (data || []).map(mapProjectFromDB);
    },

    async getSummaries(): Promise<Project[]> {
        const { data, error } = await supabase.from('projects').select(SUMMARY_COLUMNS);
        if (error) throw error;
        return (data || []).map(mapProjectFromDB);
    },

    async getById(id: string): Promise<Project> {
        const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
        if (error) throw error;
        return mapProjectFromDB(data);
    },

    async add(project: Project): Promise<void> {
        const payload = mapProjectToDB(project);
        const { error } = await supabase.from('projects').insert([payload]);
        if (error) throw error;
    },

    async update(project: Project): Promise<void> {
        const payload = mapProjectToDB(project);
        const { error } = await supabase.from('projects').update(payload).eq('id', project.id);
        if (error) throw error;
    },

    async updatePartial(id: string, updates: Partial<Record<keyof ReturnType<typeof mapProjectToDB>, any>>): Promise<void> {
        const { error } = await supabase.from('projects').update(updates).eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
    }
};
