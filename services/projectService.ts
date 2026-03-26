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
    installerId: p.installerId,
    cloudFolderLink: p.cloudFolderLink,
    materialsDelivered: p.materialsDelivered,
    productionCentral: p.productionCentral,
    qualityReport: p.qualityReport,
    history: p.history || [],
    preAssemblyDone: p.preAssemblyDone,
    freightOrganized: p.freightOrganized,
    clientScheduled: p.clientScheduled,
    deliveryPath: p.deliveryPath,
    preAssemblyTeam: p.preAssemblyTeam,
    freightCarrierId: p.freightCarrierId,
    freightDate: p.freightDate,
    deliveryDate: p.deliveryDate,
    isExpeditionReady: p.isExpeditionReady,
    projectPdfUrl: p.projectPdfUrl,
    pdfSummary: p.pdfSummary,
    architectId: p.architectId || '',
    environmentsDetails: p.environmentsDetails || [],
    outsourcedServices: p.outsourcedServices || []
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
        qualityReport: project.qualityReport || null,
        outsourcedServices: project.outsourcedServices || [],
        attachments: project.attachments || [],
        projectPdfUrl: project.projectPdfUrl,
        pdfSummary: project.pdfSummary,
        preAssemblyDone: project.preAssemblyDone,
        freightOrganized: project.freightOrganized,
        clientScheduled: project.clientScheduled,
        deliveryPath: project.deliveryPath,
        freightCarrierId: project.freightCarrierId,
        freightDate: project.freightDate,
        deliveryDate: project.deliveryDate,
        isExpeditionReady: project.isExpeditionReady,
        architectId: project.architectId,
        installerId: project.installerId,
        productionCentral: project.productionCentral,
        preAssemblyTeam: project.preAssemblyTeam || []
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
