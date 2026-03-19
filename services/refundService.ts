import { supabase } from '../supabaseClient';
import { RefundRequest, RefundStatus } from '../types';

export const mapRefundFromDB = (r: any): RefundRequest => ({
    id: r.id,
    collaboratorName: r.collaborator_name,
    date: r.date,
    establishment: r.establishment,
    description: r.description,
    category: r.category,
    amount: parseFloat(r.amount),
    cnpj: r.cnpj,
    status: r.status as RefundStatus,
    projectId: r.project_id,
    receiptUrl: r.receipt_url,
    settlementId: r.settlement_id,
    createdAt: r.created_at
});

export const mapRefundToDB = (r: RefundRequest) => ({
    collaborator_name: r.collaboratorName,
    date: r.date,
    establishment: r.establishment,
    description: r.description,
    category: r.category,
    amount: r.amount,
    cnpj: r.cnpj,
    status: r.status,
    project_id: r.projectId,
    receipt_url: r.receiptUrl,
    settlement_id: r.settlementId
});

export const refundService = {
    async getAll(): Promise<RefundRequest[]> {
        const { data, error } = await supabase.from('refund_requests').select('*');
        if (error) throw error;
        return (data || []).map(mapRefundFromDB);
    },

    async add(request: RefundRequest): Promise<void> {
        const payload = mapRefundToDB(request);
        const { error } = await supabase.from('refund_requests').insert([payload]);
        if (error) throw error;
    },

    async update(request: RefundRequest): Promise<void> {
        const payload = mapRefundToDB(request);
        const { error } = await supabase.from('refund_requests').update(payload).eq('id', request.id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('refund_requests').delete().eq('id', id);
        if (error) throw error;
    }
};
