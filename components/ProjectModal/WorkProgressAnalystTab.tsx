import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Loader2, CheckCircle2, Play, Trash2, Plus, X } from 'lucide-react';
import { analyzeWorkProgress } from '../../geminiService';

interface WorkProgressAnalystTabProps {
    project: any;
}

const WorkProgressAnalystTab: React.FC<WorkProgressAnalystTabProps> = ({ project }) => {
    const [renderImage, setRenderImage] = useState<string | null>(null);
    const [progressPhotos, setProgressPhotos] = useState<string[]>([]);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleRenderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setRenderImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => setProgressPhotos(prev => [...prev, reader.result as string]);
            reader.readAsDataURL(file);
        });
    };

    const handleAnalyze = async () => {
        if (!renderImage || progressPhotos.length === 0) {
            alert("Por favor, selecione o Render e pelo menos uma foto da obra.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await analyzeWorkProgress(renderImage, progressPhotos);
            setAnalysis(result);
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
            {/* Header section */}
            <div className="bg-card p-8 rounded-[40px] border border-border shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Camera size={24} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">IA Avanço de Obra</h4>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Controle visual de montagem vs projeto</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Render Image Source */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Projeto 3D (Render / Objetivo)</label>
                        <div className={`relative aspect-video rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden h-48 bg-muted/20 ${renderImage ? 'border-primary' : 'border-slate-200 hover:border-primary/50'}`}>
                            {renderImage ? (
                                <>
                                    <img src={renderImage} alt="Render" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setRenderImage(null)}
                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all z-10"
                                        title="Remover Render"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                                    <ImageIcon size={32} className="text-slate-300 mb-2" />
                                    <span className="text-[10px] font-black uppercase text-slate-400">Selecionar Render</span>
                                    <input type="file" title="Procurar Render" accept="image/*" className="hidden" onChange={handleRenderUpload} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Progress Photos Source */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Fotos Atuais (Progresso)</label>
                        <div className="grid grid-cols-3 gap-3">
                            {progressPhotos.map((photo, idx) => (
                                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-border shadow-sm group">
                                    <img src={photo} alt="Progresso" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setProgressPhotos(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="Remover Foto"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <label className="cursor-pointer aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/50 flex flex-col items-center justify-center transition-all bg-muted/20 group">
                                <Plus size={24} className="text-slate-300 group-hover:text-primary transition-colors" />
                                <span className="text-[8px] font-black uppercase text-slate-400 group-hover:text-primary transition-colors">Adicionar</span>
                                <input type="file" title="Adicionar Fotos" accept="image/*" multiple className="hidden" onChange={handlePhotosUpload} />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analysis Button */}
            <div className="flex justify-center">
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading || !renderImage || progressPhotos.length === 0}
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
                            {isLoading ? 'Analisando Imagens...' : 'Analisar Avanço agora'}
                        </span>
                    </div>
                </button>
            </div>

            {/* AI Results */}
            {analysis && (
                <div className="bg-card rounded-[40px] border border-border overflow-hidden shadow-xl animate-in zoom-in-95 duration-500">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-8 flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-white backdrop-blur-md border border-white/30">
                            <Sparkles size={32} />
                        </div>
                        <div>
                            <h5 className="text-white font-black text-xl uppercase italic tracking-tight">Resultado do Avanço</h5>
                            <p className="text-emerald-50 text-[10px] font-bold uppercase tracking-widest">Análise Baseada em Visão Computacional</p>
                        </div>
                    </div>
                    <div className="p-10 bg-white">
                        <div className="max-w-3xl mx-auto">
                            {renderMarkdown(analysis)}
                        </div>
                        <div className="mt-10 pt-8 border-t border-slate-100 flex items-center gap-3 text-emerald-600">
                            <CheckCircle2 size={18} />
                            <p className="text-[10px] font-black uppercase tracking-widest italic">O resultado é uma estimativa baseada nas fotos fornecidas.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkProgressAnalystTab;
