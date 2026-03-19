import { supabase } from '../supabaseClient';
import { Installer } from '../types';

export const mapInstallerFromDB = (i: any): Installer => ({
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

export const mapInstallerToDB = (installer: Installer) => ({
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

export const installerService = {
    async getAll(): Promise<Installer[]> {
        const { data, error } = await supabase.from('installers').select('id, name, cpf, phone, role, status, specialty, observations, avatar');
        if (error) throw error;
        return (data || []).map(mapInstallerFromDB);
    },

    async add(installer: Installer): Promise<void> {
        const payload = mapInstallerToDB(installer);
        const { error } = await supabase.from('installers').insert([payload]);
        if (error) throw error;
    },

    async update(installer: Installer): Promise<void> {
        const payload = mapInstallerToDB(installer);
        const { error } = await supabase.from('installers').update(payload).eq('id', installer.id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('installers').delete().eq('id', id);
        if (error) throw error;
    }
};
