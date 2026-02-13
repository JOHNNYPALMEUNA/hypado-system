
import { supabase } from './supabaseClient';
import { MOCK_CLIENTS, MOCK_PROJECTS, MOCK_INSTALLERS } from './mockData';

export const migrateData = async () => {
    console.log('--- Starting Migration ---');

    // 1. Migrate Clients
    try {
        const { error } = await supabase.from('clients').upsert(MOCK_CLIENTS.map(c => ({
            id: c.id,
            name: c.name,
            cpf: c.cpf,
            phone: c.phone,
            email: c.email,
            address: c.address,
            status: c.status,
            totalSpent: c.totalSpent
        })));
        if (error) console.error('Error migrating clients:', error);
        else console.log('✅ Clients migrated successfully');
    } catch (e) {
        console.error('Exception migrating clients:', e);
    }

    // 2. Migrate Projects
    try {
        const { error } = await supabase.from('projects').upsert(MOCK_PROJECTS.map(p => ({
            id: p.id,
            clientId: p.clientId,
            clientName: p.clientName,
            workName: p.workName,
            workAddress: p.workAddress,
            value: p.value,
            contractDate: p.contractDate,
            promisedDate: p.promisedDate,
            currentStatus: p.currentStatus,
            cloudFolderLink: p.cloudFolderLink,
            environments: p.environments,
            environmentsDetails: p.environmentsDetails,
            expenses: p.expenses,
            history: p.history,
            materialsDelivered: p.materialsDelivered
        })));
        if (error) console.error('Error migrating projects:', error);
        else console.log('✅ Projects migrated successfully');
    } catch (e) {
        console.error('Exception migrating projects:', e);
    }

    // 3. Migrate Installers
    try {
        const { error } = await supabase.from('installers').upsert(MOCK_INSTALLERS.map(i => ({
            id: i.id,
            name: i.name,
            cpf: i.cpf,
            phone: i.phone,
            status: i.status,
            specialty: i.specialty,
            observations: i.observations,
            installationsCount: i.installationsCount,
            averageRating: i.averageRating,
            totalBonus: i.totalBonus,
            role: i.role
        })));
        if (error) console.error('Error migrating installers:', error);
        else console.log('✅ Installers migrated successfully');
    } catch (e) {
        console.error('Exception migrating installers:', e);
    }

    console.log('--- Migration Completed ---');
};

// Execute if running directly
migrateData();
