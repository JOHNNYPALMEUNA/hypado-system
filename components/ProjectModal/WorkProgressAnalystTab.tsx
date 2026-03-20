import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Loader2, CheckCircle2, Play, Trash2, Plus, X, RefreshCw, Save, FileText } from 'lucide-react';
import { analyzeWorkProgress } from '../../geminiService';
import { useData } from '../../contexts/DataContext';

interface WorkProgressAnalystTabProps {
    project: any;
}

interface PhotoWithMeta {
    url: string;
    environment?: string;
}

const WorkProgressAnalystTab: React.FC<WorkProgressAnalystTabProps> = ({ project }) => {
    const { dailyLogs, updateProject } = useData();
    const [renderImage, setRenderImage] = useState<string | null>(project.renderImageUrl || null);
    const [progressPhotos, setProgressPhotos] = useState<PhotoWithMeta[]>([]);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [completionPercentage, setCompletionPercentage] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingRender, setIsSavingRender] = useState(false);

    // Sync render image with project if it changes externally
    useEffect(() => {
        if (project.renderImageUrl) {
            setRenderImage(project.renderImageUrl);
        }
    }, [project.renderImageUrl]);

    // Load photos from Daily Logs with Environment mapping
    useEffect(() => {
        const fetchDiaryPhotos = () => {
            const projectLogs = dailyLogs.filter(log => log.projectId === project.id);
            const photos: PhotoWithMeta[] = projectLogs
                .filter(log => log.photoUrl)
                .map(log => ({
                    url: log.photoUrl as string,
                    environment: log.environment
                }));
            setProgressPhotos(photos);
        };
        fetchDiaryPhotos();
    }, [dailyLogs, project.id]);

    const handleRenderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setRenderImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSaveRender = async () => {
        if (!renderImage) return;
        setIsSavingRender(true);
        try {
            await updateProject({ ...project, renderImageUrl: renderImage });
            alert("Imagem do projeto (Render) salva com sucesso!");
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar imagem.");
        } finally {
            setIsSavingRender(false);
        }
    };

    const handleAnalyze = async () => {
        const hasProjectSource = renderImage || project.projectPdfUrl;
        if (!hasProjectSource || progressPhotos.length === 0) {
            alert("Por favor, garanta que existe uma fonte de projeto (Render ou PDF) e que existam fotos no Diário de Obra.");
            return;
        }
        setIsLoading(true);
        try {
            const photosBase64 = progressPhotos.map(p => p.url);
            const result = await analyzeWorkProgress(renderImage, photosBase64, project.projectPdfUrl);
            setAnalysis(result);
            
            // Extract percentage
            const match = result.match(/AVANÇO ESTIMADO\*\*:\s*(\d+)%/i);
            if (match) {
                setCompletionPercentage(parseInt(match[1]));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMarkdown = (content: string) => {
        return content.split('\n').map((line, i) => {
            if (line.trim().startsWith('- **')) {
                const parts = line.replace(/^\s*-\s*\*\*/, '').split('**:');
                const label = parts[0];
                const rest = parts.slice(1).join('**:');
                
                return (
                    <div key={i} className="mb-6 last:mb-0">
                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest block mb-1">{label}</span>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{rest}</p>
                    </div>
                );
            }
            if (line.trim() === '') return <div key={i} className="h-2" />;
            return <p key={i} className="text-sm text-slate-600 mb-2 leading-relaxed">{line}</p>;
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            {/* Header section with Stats */}
            <div className="bg-card p-8 rounded-[40px] border border-border shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Camera size={24} />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">IA Avanço de Obra v2</h4>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest italic">Análise técnica avançada via PDF e Diário</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                         {project.projectPdfUrl && (
                             <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2">
                                <FileText size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase text-emerald-600">PDF Detectado</span>
                             </div>
                         )}
                         <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2">
                            <ImageIcon size={14} className="text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-slate-500">{progressPhotos.length} Fotos no Diário</span>
                         </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Source of Truth (Project Design) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Projeto Reference (Render / PDF)</label>
                            {renderImage && renderImage !== project.renderImageUrl && (
                                <button 
                                    onClick={handleSaveRender}
                                    disabled={isSavingRender}
                                    className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-600 hover:text-emerald-700 transition-colors"
                                >
                                    {isSavingRender ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                    Fixar Render
                                </button>
                            )}
                        </div>
                        <div className={`relative aspect-video rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden h-48 bg-muted/20 ${renderImage || project.projectPdfUrl ? 'border-primary' : 'border-slate-200 hover:border-primary/50'}`}>
                            {renderImage ? (
                                <>
                                    <img src={renderImage} alt="Render" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <label className="cursor-pointer p-3 bg-white text-slate-900 rounded-2xl shadow-xl hover:scale-110 transition-all">
                                            <RefreshCw size={18} />
                                            <input type="file" title="Trocar Render" accept="image/*" className="hidden" onChange={handleRenderUpload} />
                                        </label>
                                        <button 
                                            onClick={() => setRenderImage(null)}
                                            className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:scale-110 transition-all"
                                            title="Remover Render"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </>
                            ) : project.projectPdfUrl ? (
                                <div className="flex flex-col items-center text-center p-6">
                                    <FileText size={48} className="text-emerald-500 mb-2" />
                                    <p className="text-[10px] font-black uppercase text-emerald-600">PDF Usado como Base</p>
                                    <p className="text-[8px] text-muted-foreground mt-1 uppercase italic">A IA lerá as pranchas técnicas diretamente do PDF.</p>
                                    <label className="mt-4 cursor-pointer px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase hover:bg-slate-800 transition-all">
                                        Adicionar Render Opcional
                                        <input type="file" title="Subir Render" accept="image/*" className="hidden" onChange={handleRenderUpload} />
                                    </label>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                                    <ImageIcon size={32} className="text-slate-300 mb-2" />
                                    <span className="text-[10px] font-black uppercase text-slate-400">Selecionar Render</span>
                                    <p className="text-[8px] text-muted-foreground mt-1 uppercase italic">Ou use o PDF geral do projeto</p>
                                    <input type="file" title="Procurar Render" accept="image/*" className="hidden" onChange={handleRenderUpload} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Progress Photos Source (from Daily Logs) */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Fotos da Obra (Mapeadas por Ambiente)</label>
                        <div className="grid grid-cols-3 gap-3 h-48 content-start overflow-y-auto pr-2 custom-scrollbar">
                            {progressPhotos.length > 0 ? (
                                progressPhotos.map((photo, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-border shadow-sm bg-muted/20 group/photo">
                                        <img src={photo.url} alt="Progresso" className="w-full h-full object-cover" />
                                        {photo.environment && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 backdrop-blur-sm transform translate-y-full group-hover/photo:translate-y-0 transition-transform">
                                                <p className="text-[8px] font-black text-white uppercase text-center truncate tracking-tighter">{photo.environment}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-3 flex flex-col items-center justify-center h-full bg-slate-50 border border-slate-100 rounded-3xl p-6 text-center">
                                    <ImageIcon size={24} className="text-slate-300 mb-2" />
                                    <p className="text-[10px] font-black uppercase text-slate-400">Nenhuma foto encontrada no Diário</p>
                                    <p className="text-[9px] text-slate-400 mt-1 uppercase italic tracking-tighter">O montador deve registrar o progresso no Diário.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Analysis Button */}
            <div className="flex justify-center">
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading || (!renderImage && !project.projectPdfUrl) || progressPhotos.length === 0}
                    className="group relative px-10 py-5 bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-3">
                        {isLoading ? (
                            <Loader2 size={24} className="text-white animate-spin" />
                        ) : (
                            <Play size={20} className="text-primary group-hover:text-white" />
                        )}
                        <span className="text-white font-black uppercase tracking-widest text-sm">
                            {isLoading ? 'Cruzando Projeto vs Real...' : 'Analisar Avanço agora'}
                        </span>
                    </div>
                </button>
            </div>

            {/* AI Results */}
            {analysis && (
                <div className="bg-card rounded-[40px] border border-border overflow-hidden shadow-xl animate-in zoom-in-95 duration-500">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-8 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-white backdrop-blur-md border border-white/30">
                                <Sparkles size={32} />
                            </div>
                            <div>
                                <h5 className="text-white font-black text-xl uppercase italic tracking-tight">Veredicto de Montagem</h5>
                                <p className="text-emerald-50 text-[10px] font-bold uppercase tracking-widest italic">Análise detalhada por Ambiente e Montador:</p>
                            </div>
                        </div>

                        {completionPercentage !== null && (
                            <div className="text-right">
                                <span className="text-4xl font-black text-white italic">{completionPercentage}%</span>
                                <div className="w-32 h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                                    <div 
                                        className="h-full bg-white rounded-full transition-all duration-1000" 
                                        style={{ width: `${completionPercentage}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-10 bg-white">
                        <div className="max-w-3xl mx-auto">
                            {renderMarkdown(analysis)}
                        </div>
                        <div className="mt-10 pt-8 border-t border-slate-100 flex items-center gap-3 text-emerald-600 font-bold uppercase text-[9px] tracking-widest italic">
                            <CheckCircle2 size={18} />
                            <span>Análise Visual V2 (Granular) concluída.</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkProgressAnalystTab;
