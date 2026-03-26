import { supabase } from '../supabaseClient';
import { DailyLog } from '../types';

export const mapDailyLogFromDB = (l: any): DailyLog => ({
    ...l,
    projectId: l.projectId,
    workName: l.workName,
    photoUrl: l.photoUrl,
    reworkDetails: l.reworkDetails,
    analysisResult: l.analysisResult,
    completionPercentage: l.completionPercentage,
    createdAt: l.createdAt
});

export const mapDailyLogToDB = (l: DailyLog) => ({
    id: l.id,
    projectId: l.projectId,
    workName: l.workName,
    date: l.date,
    author: l.author,
    category: l.category,
    description: l.description,
    photoUrl: l.photoUrl,
    reworkDetails: l.reworkDetails,
    status: l.status,
    environment: l.environment,
    analysisResult: l.analysisResult,
    completionPercentage: l.completionPercentage,
    createdAt: l.createdAt
});

export const diaryService = {
    async getAll(): Promise<DailyLog[]> {
        const { data, error } = await supabase.from('diary_logs').select('*');
        if (error) throw error;
        return (data || []).map(mapDailyLogFromDB);
    },

    async add(log: DailyLog): Promise<void> {
        const payload = mapDailyLogToDB(log);
        const { error } = await supabase.from('diary_logs').insert([payload]);
        if (error) throw error;
    },

    async update(log: DailyLog): Promise<void> {
        const payload = mapDailyLogToDB(log);
        const { error } = await supabase.from('diary_logs').update(payload).eq('id', log.id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('diary_logs').delete().eq('id', id);
        if (error) throw error;
    }
};
