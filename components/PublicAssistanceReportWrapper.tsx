import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { TechnicalAssistance, Installer, AssistanceStatus } from '../types';
import TechnicalAssistanceClientView from './TechnicalAssistanceClientView';
import { Loader2 } from 'lucide-react';

interface Props {
    reportId: string;
}

const PublicAssistanceReportWrapper: React.FC<Props> = ({ reportId }) => {
    const [assistance, setAssistance] = useState<TechnicalAssistance | null>(null);
    const [installers, setInstallers] = useState<Installer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                setLoading(true);
                // Fetch the specific assistance
                const { data: assistanceData, error: assistanceError } = await supabase
                    .from('technical_assistance')
                    .select('*')
                    .eq('id', reportId)
                    .single();

                if (assistanceError) {
                    if (assistanceError.code === 'PGRST116') {
                        throw new Error("Chamado não encontrado.");
                    }
                    throw assistanceError;
                }

                if (assistanceData) {
                    const mappedAssistance: TechnicalAssistance = {
                        id: assistanceData.id,
                        clientId: assistanceData.client_id,
                        clientName: assistanceData.client_name,
                        projectId: assistanceData.project_id,
                        workName: assistanceData.work_name,
                        requestDate: assistanceData.request_date,
                        scheduledDate: assistanceData.scheduled_date,
                        scheduledTime: assistanceData.scheduled_time,
                        reportedProblem: assistanceData.reported_problem,
                        photoUrl: assistanceData.photo_url,
                        videoUrl: assistanceData.video_url,
                        originalInstallerId: assistanceData.original_installer_id,
                        technicianId: assistanceData.technician_id,
                        visitResult: assistanceData.visit_result,
                        pendingIssues: assistanceData.pending_issues,
                        returnDate: assistanceData.return_date,
                        finalObservations: assistanceData.final_observations,
                        status: assistanceData.status as AssistanceStatus
                    };
                    setAssistance(mappedAssistance);
                }

                // Fetch installers for mapping the technician and original installer name
                const rawInstallerIds = [];
                if (assistanceData.technician_id && assistanceData.technician_id.trim() !== '') rawInstallerIds.push(assistanceData.technician_id);
                if (assistanceData.original_installer_id && assistanceData.original_installer_id.trim() !== '') rawInstallerIds.push(assistanceData.original_installer_id);

                const installerIds = [...new Set(rawInstallerIds)];

                if (installerIds.length > 0) {
                    const { data: installersData, error: installersError } = await supabase
                        .from('installers')
                        .select('*')
                        .in('id', installerIds);

                    if (installersError) {
                        // Non-blocking error
                        console.error("Error fetching installers:", installersError);
                    } else if (installersData) {
                        const mappedInstallers: Installer[] = installersData.map(i => ({
                            id: i.id,
                            name: i.name,
                            phone: i.phone,
                            status: i.status || 'active'
                        } as Installer));
                        setInstallers(mappedInstallers);
                    }
                }

            } catch (err: any) {
                console.error("Error loading assistance report:", err);
                setError(err.message || "Erro ao carregar o relatório.");
            } finally {
                setLoading(false);
            }
        };

        if (reportId) {
            fetchPublicData();
        }
    }, [reportId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                        Procurando Chamado de Assistência...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !assistance) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
                    <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">
                        CHAMADO NÃO ENCONTRADO.
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Não foi possível localizar este protocolo. O link pode estar incorreto ou o chamado foi removido.
                    </p>
                </div>
            </div>
        );
    }

    return <TechnicalAssistanceClientView assistance={assistance} installers={installers} />;
};

export default PublicAssistanceReportWrapper;
