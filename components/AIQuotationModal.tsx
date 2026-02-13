import React, { useState } from 'react';
import { X, Upload, Sparkles, FileText, Check, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { analyzeBlueprint } from '../geminiService';
import { QuotationItem } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAddItems: (items: QuotationItem[]) => void;
}

const AIQuotationModal: React.FC<Props> = ({ isOpen, onClose, onAddItems }) => {
    const [image, setImage] = useState<string | null>(null);
    const [instructions, setInstructions] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    if (!isOpen) return null;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove data:image/jpeg;base64, prefix for API
                const base64 = (reader.result as string);
                setImage(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setIsLoading(true);
        try {
            // Extract raw base64
            const rawBase64 = image.split(',')[1];
            const data = await analyzeBlueprint(rawBase64, instructions);
            setResult(data);
        } catch (error) {
            alert('Erro ao analisar imagem. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (result && result.materials) {
            const items: QuotationItem[] = result.materials.map((m: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                name: m.name,
                quantity: m.quantity,
                unit: m.unit,
                estimatedValue: m.unitPrice,
                materialValue: m.unitPrice, // Defaulting
                status: 'Pendente'
            }));
            onAddItems(items);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95">

                {/* Left Side: Input */}
                <div className="w-full md:w-1/2 p-8 bg-slate-50 border-r border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Sparkles className="text-purple-600" /> Orçamentista AI
                        </h3>
                        <button onClick={onClose} className="md:hidden p-2 bg-white rounded-full"><X size={20} /></button>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">

                        {/* Image Upload */}
                        <div className="group relative w-full aspect-video bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-purple-500 transition-all flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                            {image ? (
                                <>
                                    <img src={image} alt="Preview" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white font-bold">Trocar Imagem</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-6">
                                    <Upload className="mx-auto text-slate-300 mb-3" size={48} />
                                    <p className="text-slate-500 font-medium">Arraste sua planta ou clique aqui</p>
                                    <p className="text-xs text-slate-400 mt-2">Suporta JPG, PNG</p>
                                </div>
                            )}
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} accept="image/*" />
                        </div>

                        {/* Instructions */}
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Instruções Extras (Opcional)</label>
                            <textarea
                                className="w-full mt-2 p-4 bg-white rounded-2xl border-2 border-transparent focus:border-purple-500 outline-none text-sm resize-none"
                                rows={4}
                                placeholder="Ex: Considere MDF amadeirado para os armários e branco para as partes internas..."
                                value={instructions}
                                onChange={e => setInstructions(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={!image || isLoading}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                            {isLoading ? 'Analisando Desenho...' : 'Gerar Orçamento Inteligente'}
                        </button>
                    </div>
                </div>

                {/* Right Side: Result */}
                <div className="w-full md:w-1/2 p-8 bg-white flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-700">Análise da IA</h3>
                        <button onClick={onClose} className="hidden md:block p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
                        {!result && !isLoading && (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 opacity-50 space-y-4">
                                <FileText size={64} strokeWidth={1} />
                                <p className="max-w-xs">Faça o upload de uma planta ou desenho para a IA identificar os materiais necessários.</p>
                            </div>
                        )}

                        {isLoading && (
                            <div className="h-full flex flex-col items-center justify-center space-y-6">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600 animate-pulse" size={24} />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="font-bold text-slate-800 text-lg">Analisando Geometria...</p>
                                    <p className="text-slate-400 text-sm">Identificando móveis e calculando chapas.</p>
                                </div>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Furniture Identified */}
                                <div>
                                    <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Check size={14} /> Móveis Identificados</h4>
                                    <div className="grid gap-3">
                                        {result.furniture?.map((f: any, i: number) => (
                                            <div key={i} className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                                <div className="flex justify-between font-bold text-slate-800 text-sm">
                                                    <span>{f.name}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{f.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Materials Estimated */}
                                <div>
                                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Check size={14} /> Materiais Estimados</h4>
                                    <div className="space-y-2">
                                        {result.materials?.map((m: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{m.quantity}</span>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">{m.name}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase">{m.unit}</span>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-medium text-slate-500">~R$ {m.unitPrice * m.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Nuances */}
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                                    <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                                    <p className="text-xs text-amber-800 leading-relaxed font-medium">{result.technicalNuances}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {result && (
                        <div className="pt-6 mt-4 border-t border-slate-100">
                            <button
                                onClick={handleConfirm}
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center gap-3"
                            >
                                Adicionar Materiais à Cotação <ArrowRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIQuotationModal;
