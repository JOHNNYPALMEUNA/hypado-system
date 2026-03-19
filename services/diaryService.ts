import { supabase } from '../supabaseClient';
import { DailyLog } from '../types';

export const diaryService = {
    async getAll(): Promise<DailyLog[]> {
        const { data, error } = await supabase.from('diary_logs').select('*');
        if (error) throw error;
        return (data || []) as DailyLog[];
    },

    async add(log: DailyLog): Promise<void> {
        const { error } = await supabase.from('diary_logs').insert([log]);
        if (error) throw error;
    },

    async update(log: DailyLog): Promise<void> {
        const { error } = await supabase.from('diary_logs').update(log).eq('id', log.id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('diary_logs').delete().eq('id', id);
        if (error) throw error;
    }
};
