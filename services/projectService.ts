import { supabase } from '../supabaseClient';
import { Project, ProductionStatus } from '../types';

export const mapProjectFromDB = (p: any): Project => ({
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
    projectPdfUrl: p.project_pdf_url,
    architectId: p.architectId || p.architect_id || '',
    environmentsDetails: p.environmentsDetails || p.environments_details || [],
    outsourcedServices: p.outsourced_services || p.outsourcedServices || []
});

export const mapProjectToDB = (project: Project) => {
    return {
        id: project.id,
        client_id: project.clientId,
        client_name: project.clientName,
        work_name: project.workName,
        work_address: project.workAddress || '',
        value: project.value,
        contract_date: project.contractDate,
        promised_date: project.promisedDate,
        current_status: project.currentStatus,
        cloud_folder_link: project.cloudFolderLink,
        materials_delivered: project.materialsDelivered,
        environments: project.environments || [],
        environments_details: project.environmentsDetails || [],
        expenses: project.expenses || [],
        history: project.history || [],
        quality_report: project.qualityReport || null,
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
};

export const projectService = {
    async getAll(): Promise<Project[]> {
        const { data, error } = await supabase.from('projects').select('*');
        if (error) throw error;
        return (data || []).map(mapProjectFromDB);
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

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
    }
};
