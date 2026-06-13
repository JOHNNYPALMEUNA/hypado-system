import { supabase } from '../supabaseClient';
import { Client } from '../types';

export const mapClientToDB = (client: Client) => {
    return {
        id: client.id,
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        cpf: client.cpf || null,
        status: client.status || 'Ativo',
        total_spent: client.totalSpent || 0,
        is_corporate: client.isCorporate || false,
        lead_source: client.leadSource || null,
        send_notifications: client.sendNotifications !== false,
        store_name: client.storeName || 'Hypado Planejados',
        quadra: client.quadra || null,
        lote: client.lote || null,
        description: client.description || null,
        is_blocked: client.isBlocked || false,
    };
};

export const clientService = {
    async getAll(): Promise<Client[]> {
        const { data, error } = await supabase.from('clients').select('*');
        if (error) throw error;
        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            email: row.email || '',
            phone: row.phone || '',
            address: row.address || '',
            cpf: row.cpf,
            status: row.status || 'Ativo',
            totalSpent: row.total_spent || row.totalSpent || 0,
            isCorporate: row.is_corporate || row.isCorporate || false,
            leadSource: row.lead_source || row.leadSource || '',
            sendNotifications: row.send_notifications !== false,
            storeName: row.store_name || row.storeName || 'Hypado Planejados',
            quadra: row.quadra,
            lote: row.lote,
            description: row.description,
            isBlocked: row.is_blocked || row.isBlocked || false,
            projectsCount: row.projectsCount || 0,
            averageRating: row.averageRating || 0,
            lastVisit: row.lastVisit || new Date().toISOString().split('T')[0]
        })) as Client[];
    },

    async add(client: Client): Promise<void> {
        const payload = mapClientToDB(client);
        const { error } = await supabase.from('clients').insert([payload]);
        if (error) throw error;
    },

    async update(client: Client): Promise<void> {
        const payload = mapClientToDB(client);
        const { error } = await supabase.from('clients').update(payload).eq('id', client.id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
    }
};
