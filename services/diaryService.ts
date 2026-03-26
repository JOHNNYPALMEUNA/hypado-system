import { supabase } from '../supabaseClient';
import { DailyLog } from '../types';

export const mapDailyLogFromDB = (l: any): DailyLog => ({
    ...l,
    projectId: l.project_id || l.projectId,
    workName: l.work_name || l.workName,
    photoUrl: l.photo_url || l.photoUrl,
    reworkDetails: l.rework_details || l.reworkDetails,
    analysisResult: l.analysis_result || l.analysisResult,
    completionPercentage: l.completion_percentage || l.completionPercentage,
    createdAt: l.created_at || l.createdAt
});

export const mapDailyLogToDB = (l: DailyLog) => ({
    id: l.id,
    project_id: l.projectId,
    work_name: l.workName,
    date: l.date,
    author: l.author,
    category: l.category,
    description: l.description,
    photo_url: l.photoUrl,
    rework_details: l.reworkDetails,
    status: l.status,
    environment: l.environment,
    analysis_result: l.analysisResult,
    completion_percentage: l.completionPercentage,
    created_at: l.createdAt
});

export const diaryService = {
    async getAll(): Promise<DailyLog[]> {
        const { data, error } = await supabase.from('daily_logs').select('*');
        if (error) throw error;
        return (data || []).map(mapDailyLogFromDB);
    },

    async add(log: DailyLog): Promise<void> {
        const payload = mapDailyLogToDB(log);
        const { error } = await supabase.from('daily_logs').insert([payload]);
        if (error) throw error;
    },

    async update(log: DailyLog): Promise<void> {
        const payload = mapDailyLogToDB(log);
        const { error } = await supabase.from('daily_logs').update(payload).eq('id', log.id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('daily_logs').delete().eq('id', id);
        if (error) throw error;
    }
};
