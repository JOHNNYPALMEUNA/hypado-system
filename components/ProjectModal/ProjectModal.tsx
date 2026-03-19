import React from 'react';
import {
    X, Save, FileText, Users, ShieldCheck, TrendingUp, Clock, Sparkles, Trash2, Layers, Brain
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Client, Project, Installer, Material, ProductionStatus } from '../../types';
import GeralTab from './GeralTab';
import QualityTab from './QualityTab';
import CPCTab from './CPCTab';
import EquipeTab from './EquipeTab';
import ProjectTimelineTab from './ProjectTimelineTab';
import BudgetAnalystTab from './BudgetAnalystTab';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editingProject: Project | null;
    activeModalTab: string;
    setActiveModalTab: (tab: any) => void;
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    clients: Client[];
    installers: Installer[];
    materials: Material[];
    outsourcedCategories: string[];
    materialCategories: string[];

    // Handlers
    handlePdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCopyClientAddress: () => void;
    handleFetchAddress: () => void;
    generateWhatsappOrder: (envName: string) => void;
    toggleEnvironment: (envName: string) => void;
    updateMemorial: (envName: string, field: string, value: any) => void;
    handleAddMdf: (envName: string) => void;
    handleAddHardware: (envName: string) => void;
    handleAddAppliance: (envName: string) => void;

    // Quality Handlers
    auditStatus: 'Pendente' | 'Aprovado' | 'Reprovado';
    setAuditStatus: (status: 'Pendente' | 'Aprovado' | 'Reprovado') => void;
    report: any;
    setReport: (report: any) => void;
    handleSubmitAudit: () => void;

    // Actions
    handleDelete: () => void;
    handleCancel: () => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingProject,
    activeModalTab,
    setActiveModalTab,
    formData,
    setFormData,
    clients,
    installers,
    materials,
    outsourcedCategories,
    materialCategories,
    handlePdfUpload,
    handleCopyClientAddress,
    handleFetchAddress,
    generateWhatsappOrder,
    toggleEnvironment,
    updateMemorial,
    handleAddMdf,
    handleAddHardware,
    handleAddAppliance,
    auditStatus,
    setAuditStatus,
    report,
    setReport,
    handleSubmitAudit,
    handleDelete,
    handleCancel
}) => {
    const { userRole } = useData();
    if (!isOpen) return null;

    const allTabs = [
        { id: 'geral', label: 'Dossiê Técnico', icon: <FileText size={16} /> },
        { id: 'memorial', label: 'Timeline PCP', icon: <Clock size={16} /> },
        { id: 'equipe', label: 'Equipe', icon: <Users size={16} /> },
        { id: 'qualidade', label: 'Auditoria', icon: <ShieldCheck size={16} /> },
        { id: 'budget', label: 'Analista IA', icon: <Brain size={16} /> },
        { id: 'cpc', label: 'CPC Relatório', icon: <TrendingUp size={16} /> }
    ];

    const tabs = allTabs.filter(tab => {
        if (tab.id === 'cpc' || tab.id === 'budget') return userRole === 'owner';
        return true;
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <div className="relative bg-background w-full max-w-7xl h-full md:h-[90vh] md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-slate-900 text-white p-6 md:p-10 flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="bg-blue-500 p-2 rounded-xl"><Sparkles size={20} className="text-white" /></div>
                            <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">
                                {editingProject ? 'Configurar Ordem de Serviço' : 'Nova Ordem de Serviço'}
                            </h3>
                        </div>
                        <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest">
                            {formData.workName || 'Identifique a Obra'} â€¢ {formData.clientId ? clients.find(c => c.id === formData.clientId)?.name : 'Selecione o Cliente'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        title="Fechar"
                        aria-label="Fechar"
                        className="p-3 bg-card/10 hover:bg-card/20 rounded-full transition-all text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Dynamic Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-muted/50 custom-scrollbar">
                    {activeModalTab === 'geral' && (
                        <GeralTab
                            formData={formData}
                            setFormData={setFormData}
                            clients={clients}
                            materials={materials}
                            outsourcedCategories={outsourcedCategories}
                            materialCategories={materialCategories}
                            handlePdfUpload={handlePdfUpload}
                            handleCopyClientAddress={handleCopyClientAddress}
                            handleFetchAddress={handleFetchAddress}
                            generateWhatsappOrder={generateWhatsappOrder}
                            toggleEnvironment={toggleEnvironment}
                            updateMemorial={updateMemorial}
                            handleAddMdf={handleAddMdf}
                            handleAddHardware={handleAddHardware}
                            handleAddAppliance={handleAddAppliance}
                        />
                    )}

                    {activeModalTab === 'memorial' && (
                        <ProjectTimelineTab projectId={formData.id} history={formData.history || []} />
                    )}

                    {activeModalTab === 'equipe' && (
                        <EquipeTab
                            formData={formData}
                            setFormData={setFormData}
                            installers={installers}
                        />
                    )}

                    {activeModalTab === 'qualidade' && (
                        <QualityTab
                            formData={formData}
                            setFormData={setFormData}
                            auditStatus={auditStatus}
                            setAuditStatus={setAuditStatus}
                            report={report}
                            setReport={setReport}
                            handleSubmitAudit={handleSubmitAudit}
                        />
                    )}

                    {activeModalTab === 'cpc' && (
                        <CPCTab
                            project={formData}
                            installers={installers}
                            setFormData={setFormData}
                        />
                    )}

                    {activeModalTab === 'budget' && (
                        <BudgetAnalystTab
                            project={formData}
                        />
                    )}
                </div>

                {/* Footer / Tabs Navigation */}
                <div className="bg-card border-t border-border p-4 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-1 bg-muted p-1 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveModalTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeModalTab === tab.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            {editingProject && (
                                <>
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-3 rounded-2xl text-xs font-black uppercase text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                                        title="Excluir Obra"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-3 rounded-2xl text-xs font-black uppercase text-muted-foreground hover:bg-muted transition-all border border-border"
                                    >
                                        Cancelar Obra
                                    </button>
                                </>
                            )}
                            <button
                                onClick={onClose}
                                className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-xs font-black uppercase text-muted-foreground hover:bg-muted/50 transition-all border border-transparent"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={onSave}
                                className="flex-1 md:flex-none px-8 py-3 rounded-2xl text-xs font-black uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> {editingProject ? 'Salvar Alterações' : 'Registrar OS'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectModal;
