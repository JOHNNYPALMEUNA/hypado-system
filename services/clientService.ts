import { supabase } from '../supabaseClient';
import { Client } from '../types';

export const mapClientToDB = (client: Client) => {
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

export const clientService = {
    async getAll(): Promise<Client[]> {
        const { data, error } = await supabase.from('clients').select('*');
        if (error) throw error;
        return (data || []) as Client[];
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
