import React from 'react';
import {
    Building2, MapPin, Search, Users, Link2, FileText, ArrowRight, FolderOpen, Plus, X, Layers, Share2, Settings2, Boxes, Power, Sparkles, Trash2
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Client, Project, OutsourcedService, Material } from '../../types';

interface GeralTabProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    clients: Client[];
    materials: Material[];
    outsourcedCategories: string[];
    materialCategories: string[];
    handlePdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCopyClientAddress: () => void;
    handleFetchAddress: () => void;
    generateWhatsappOrder: (envName: string) => void;
    toggleEnvironment: (envName: string) => void;
    updateMemorial: (envName: string, field: string, value: any) => void;
    handleAddMdf: (envName: string) => void;
    handleAddHardware: (envName: string) => void;
    handleAddAppliance: (envName: string) => void;
}

const GeralTab: React.FC<GeralTabProps> = ({
    formData,
    setFormData,
    clients,
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
    handleAddAppliance
}) => {
    const { userRole } = useData();
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Cliente</label>
                    <select
                        disabled={formData.currentStatus === 'Finalizada'}
                        className="w-full h-11 px-4 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })} required
                    >
                        <option value="">Selecione...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">PDF do Projeto</label>
                    <div className="flex items-center gap-2">
                        <label className="flex-1 cursor-pointer bg-muted/50 border border-dashed border-border rounded-lg p-2 text-center hover:bg-muted transition-colors">
                            <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
                            <span className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                                <FileText size={14} />
                                {(formData as any).projectPdfUrl ? 'PDF Anexado' : 'Upload PDF'}
                            </span>
                        </label>
                        {(formData as any).projectPdfUrl && (
                            <a
                                href={(formData as any).projectPdfUrl}
                                download="projeto.pdf"
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Baixar PDF"
                            >
                                <ArrowRight size={16} className="rotate-90" />
                            </a>
                        )}
                    </div>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Nome da Obra</label>
                    <input
                        type="text"
                        disabled={formData.currentStatus === 'Finalizada'}
                        className="w-full h-11 px-4 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.workName} onChange={e => setFormData({ ...formData, workName: e.target.value })} placeholder="Ex: Apartamento 42" required
                    />
                </div>
                {userRole === 'owner' && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Valor Contrato (R$)</label>
                        <input
                            type="number"
                            disabled={formData.currentStatus === 'Finalizada'}
                            className="w-full h-11 px-4 bg-background border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} placeholder="0.00"
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Data Registro</label>
                    <input
                        type="date"
                        className="w-full h-11 px-4 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        value={formData.contractDate ? formData.contractDate.split('T')[0] : ''}
                        disabled
                        title="Data de criação da OS (Automático)"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Data Prometida</label>
                    <input
                        type="date"
                        disabled={formData.currentStatus === 'Finalizada'}
                        className="w-full h-11 px-4 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.promisedDate || ''}
                        onChange={e => setFormData({ ...formData, promisedDate: e.target.value })}
                    />
                </div>
            </div>

            {/* MANUAL ENVIRONMENT ADDITION */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
                <h4 className="font-bold text-lg flex items-center gap-2 mb-4"><Layers size={18} className="text-purple-600" /> Adicionar Ambiente</h4>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-xs font-bold uppercase text-slate-400">Nome do Ambiente</label>
                        <div className="flex gap-2">
                            <input
                                list="available-environments"
                                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="Ex: Cozinha, Quarto Casal..."
                                id="new-env-input"
                            />
                            <datalist id="available-environments">
                                <option value="Cozinha" />
                                <option value="Quarto Casal" />
                                <option value="Quarto Solteiro" />
                                <option value="Banheiro Suíte" />
                                <option value="Banheiro Social" />
                                <option value="Sala de Estar" />
                                <option value="Ãrea Gourmet" />
                                <option value="Lavanderia" />
                                <option value="Escritório" />
                                <option value="Closet" />
                            </datalist>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const input = document.getElementById('new-env-input') as HTMLInputElement;
                            const name = input.value.trim();
                            if (!name) return alert('Digite o nome do ambiente!');

                            if (formData.selectedEnvironments.includes(name)) {
                                return alert('Este ambiente já foi adicionado!');
                            }

                            toggleEnvironment(name);
                            input.value = '';
                        }}
                        className="h-10 px-6 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} /> Adicionar
                    </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                    Adicione os ambientes do projeto para detalhar as especificações técnicas, ferragens e materiais.
                </p>
            </div>

            {/* SEÇÃO ENDEREÇO DE INSTALAÇÃO */}
            <div className="bg-muted/50 p-6 rounded-2xl border border-border transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <MapPin size={16} className="text-blue-600" /> Local de Instalação (Endereço da Obra)
                    </h4>
                    <button
                        type="button"
                        onClick={handleCopyClientAddress}
                        className="text-[10px] font-bold uppercase bg-card border border-border px-3 py-1.5 rounded hover:bg-muted transition-colors flex items-center gap-2"
                    >
                        <Users size={12} /> Copiar do Cliente
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">CEP</label>
                        <div className="flex gap-2">
                            <input
                                className="w-full h-9 px-3 bg-card border border-border rounded text-sm outline-none focus:border-blue-500"
                                placeholder="00000-000"
                                value={formData.addressCep}
                                onChange={e => setFormData({ ...formData, addressCep: e.target.value })}
                                onBlur={handleFetchAddress}
                            />
                            <button
                                type="button"
                                onClick={handleFetchAddress}
                                className="bg-blue-600 text-white h-9 px-3 rounded hover:bg-blue-700 transition-colors"
                                title="Buscar CEP"
                            >
                                <Search size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Logradouro / Localização Inteligente</label>
                        <div className="flex gap-2">
                            <input
                                className="w-full h-9 px-3 bg-card border border-border rounded text-sm outline-none focus:border-blue-500"
                                placeholder="Rua das Acácias ou Nome do Condomínio"
                                value={formData.addressStreet}
                                onChange={e => setFormData({ ...formData, addressStreet: e.target.value, workAddress: `${e.target.value}, ${formData.addressNumber} - ${formData.addressNeighborhood}, ${formData.addressCity}` })}
                            />
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!formData.addressStreet) return alert('Digite o nome do local ou rua para buscar.');
                                    const btn = document.activeElement as HTMLButtonElement;
                                    if (btn) btn.disabled = true;

                                    try {
                                        const { searchAddressWithAI } = await import('../../geminiService');
                                        const result = await searchAddressWithAI(formData.addressStreet);
                                        if (result) {
                                            setFormData({
                                                ...formData,
                                                addressStreet: result.addressStreet || formData.addressStreet,
                                                addressNeighborhood: result.addressNeighborhood || formData.addressNeighborhood,
                                                addressCity: result.addressCity || formData.addressCity,
                                                addressCep: result.addressCep || formData.addressCep,
                                                addressComplement: result.addressComplement || formData.addressComplement,
                                                workAddress: `${result.addressStreet}, ${formData.addressNumber} - ${result.addressNeighborhood}, ${result.addressCity}`
                                            });
                                        } else {
                                            alert('Não foi possível encontrar o endereço exato com este nome.');
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert('Erro ao processar busca inteligente.');
                                    } finally {
                                        if (btn) btn.disabled = false;
                                    }
                                }}
                                className="bg-slate-900 text-white h-9 px-3 rounded hover:bg-slate-800 transition-colors flex items-center gap-2 group"
                                title="Busca Inteligente (IA)"
                            >
                                <Sparkles size={14} className="text-amber-400 group-hover:animate-pulse" />
                                <span className="text-[10px] font-black uppercase">Busca AI</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Número</label>
                        <input
                            className="w-full h-9 px-3 bg-card border border-border rounded text-sm outline-none focus:border-blue-500"
                            placeholder="123"
                            value={formData.addressNumber}
                            onChange={e => setFormData({ ...formData, addressNumber: e.target.value, workAddress: `${formData.addressStreet}, ${e.target.value} - ${formData.addressNeighborhood}, ${formData.addressCity}` })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Bairro</label>
                        <input
                            className="w-full h-9 px-3 bg-card border border-border rounded text-sm outline-none focus:border-blue-500"
                            placeholder="Centro"
                            value={formData.addressNeighborhood}
                            onChange={e => setFormData({ ...formData, addressNeighborhood: e.target.value, workAddress: `${formData.addressStreet}, ${formData.addressNumber} - ${e.target.value}, ${formData.addressCity}` })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Cidade/UF</label>
                        <input
                            className="w-full h-9 px-3 bg-card border border-border rounded text-sm outline-none focus:border-blue-500"
                            placeholder="Goiânia/GO"
                            value={formData.addressCity}
                            onChange={e => setFormData({ ...formData, addressCity: e.target.value, workAddress: `${formData.addressStreet}, ${formData.addressNumber} - ${formData.addressNeighborhood}, ${e.target.value}` })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Complemento</label>
                        <input
                            className="w-full h-9 px-3 bg-card border border-border rounded text-sm outline-none focus:border-blue-500"
                            placeholder="Apto 101"
                            value={formData.addressComplement}
                            onChange={e => setFormData({ ...formData, addressComplement: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Quadra</label>
                        <input
                            className="w-full h-9 px-3 bg-card border border-border rounded text-sm outline-none focus:border-blue-500"
                            placeholder="Qd. 10"
                            value={formData.addressQuadra}
                            onChange={e => setFormData({ ...formData, addressQuadra: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Lote</label>
                        <input
                            className="w-full h-9 px-3 bg-card border border-border rounded text-sm outline-none focus:border-blue-500"
                            placeholder="Lt. 05"
                            value={formData.addressLote}
                            onChange={e => setFormData({ ...formData, addressLote: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2 flex items-end pb-1">
                        {formData.addressStreet && (
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${formData.addressStreet}, ${formData.addressNumber} - ${formData.addressNeighborhood}, ${formData.addressCity}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 w-full justify-center"
                            >
                                <Link2 size={14} /> Abrir no Google Maps
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* CLOUD FOLDER LINK CARD */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-lg flex items-center gap-2 mb-4"><FolderOpen size={18} className="text-blue-500" /> Pasta do Projeto (Nuvem)</h4>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400">Link do Google Drive / OneDrive</label>
                    <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 py-3">
                        <Link2 size={16} className="text-muted-foreground" />
                        <input
                            type="url"
                            className="bg-transparent w-full text-sm font-medium outline-none placeholder:text-muted-foreground/50"
                            placeholder="Cole aqui o link da pasta na nuvem..."
                            value={(formData as any).cloudFolderLink || ''}
                            onChange={e => setFormData({ ...formData, cloudFolderLink: e.target.value } as any)}
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Centralize todos os arquivos (PDFs, Imagens, Projetos 3D) em uma pasta na nuvem e cole o link aqui para acesso rápido.</p>
                </div>
            </div>

            {/* Third-Party Service Management */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="font-bold text-lg flex items-center gap-2"><Users size={18} className="text-primary" /> Previsão de Serviços Externos</h4>
                        <p className="text-xs text-muted-foreground">Obrigatório informar fornecedor e valor antes da fase de Produção.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const newSvc: OutsourcedService = { id: `svc-${Date.now()}`, category: outsourcedCategories[0], description: '', status: 'Pendente' };
                            setFormData({ ...formData, outsourcedServices: [...formData.outsourcedServices, newSvc] });
                        }}
                        className="text-xs font-bold bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <Plus size={14} /> Novo Terceiro
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.outsourcedServices.map((svc: any, idx: number) => (
                        <div key={svc.id} className={`p-4 rounded-xl border transition-all relative group ${(!svc.supplierName || !svc.value) ? 'bg-amber-50/50 border-amber-200' : 'bg-background border-border'}`}>
                            <button
                                type="button"
                                onClick={() => {
                                    const svcs = [...formData.outsourcedServices];
                                    svcs.splice(idx, 1);
                                    setFormData({ ...formData, outsourcedServices: svcs });
                                }}
                                className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={14} />
                            </button>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <select
                                        className="w-24 text-xs bg-muted/50 border-transparent rounded-md font-bold uppercase"
                                        value={svc.status}
                                        onChange={e => {
                                            const svcs = [...formData.outsourcedServices];
                                            svcs[idx].status = e.target.value as any;
                                            setFormData({ ...formData, outsourcedServices: svcs });
                                        }}
                                    >
                                        <option value="Pendente">Pendente</option>
                                        <option value="Pedido">Pedido</option>
                                        <option value="Pronto">Pronto</option>
                                    </select>
                                    <select
                                        className="flex-1 text-xs bg-muted/50 border-transparent rounded-md"
                                        value={svc.category}
                                        onChange={e => {
                                            const svcs = [...formData.outsourcedServices];
                                            svcs[idx].category = e.target.value;
                                            setFormData({ ...formData, outsourcedServices: svcs });
                                        }}
                                    >
                                        <option value="">Categoria...</option>
                                        {outsourcedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <input placeholder="Descrição" className="w-full text-sm font-medium bg-transparent border-b border-border focus:border-primary outline-none" value={svc.description} onChange={e => { const svcs = [...formData.outsourcedServices]; svcs[idx].description = e.target.value; setFormData({ ...formData, outsourcedServices: svcs }); }} />
                                <input placeholder="Fornecedor" className="w-full text-xs bg-transparent border-b border-border focus:border-primary outline-none" value={svc.supplierName || ''} onChange={e => { const svcs = [...formData.outsourcedServices]; svcs[idx].supplierName = e.target.value; setFormData({ ...formData, outsourcedServices: svcs }); }} />
                                {userRole === 'owner' && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">R$</span>
                                        <input type="number" placeholder="0.00" className="w-full text-sm font-bold bg-transparent border-b border-border focus:border-primary outline-none" value={svc.value || ''} onChange={e => { const svcs = [...formData.outsourcedServices]; svcs[idx].value = parseFloat(e.target.value); setFormData({ ...formData, outsourcedServices: svcs }); }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {formData.outsourcedServices.length === 0 && (
                        <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                            Nenhum serviço terceirizado previsto.
                        </div>
                    )}
                </div>
            </div>

            {/* Environment Details (Hypado Card Style) */}
            {formData.selectedEnvironments.length > 0 && (
                <div className="space-y-8 mt-8">
                    {formData.selectedEnvironments.map((envName: string) => (
                        <div key={envName} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all hover:shadow-md">
                            {/* Environment Header */}
                            <div className="bg-muted/30 px-6 py-4 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group cursor-pointer" onClick={() => toggleEnvironment(envName)}>
                                <div className="flex-1">
                                    <h4 className="text-lg font-bold flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary"><Layers size={20} /></div>
                                        {envName}
                                        <span className="hidden md:inline-block text-xs font-normal text-muted-foreground uppercase tracking-widest ml-2">Especificação Técnica Detalhada</span>
                                    </h4>
                                    <input
                                        type="text"
                                        placeholder="Observação (ex: Quarto do Victor, Suíte Master...)"
                                        className="mt-2 w-full md:w-1/2 text-xs bg-transparent border-b border-dashed border-border outline-none text-muted-foreground focus:text-foreground focus:border-primary transition-colors"
                                        onClick={e => e.stopPropagation()}
                                        value={(formData.environmentsDetails?.[envName] as any)?.observation || ''}
                                        onChange={e => updateMemorial(envName, 'observation' as any, e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); generateWhatsappOrder(envName); }}
                                        className="text-xs font-bold bg-emerald-500 text-white px-3 py-2 rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/00 hover:shadow-emerald-500/20"
                                    >
                                        <Share2 size={14} /> Enviar p/ Montador
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 space-y-8">
                                {/* Modules List */}
                                <div className="bg-muted/50 p-6 rounded-xl border border-border">
                                    <div className="flex justify-between items-center mb-4">
                                        <h5 className="text-sm font-bold uppercase text-foreground flex items-center gap-2">
                                            <Sparkles size={16} className="text-purple-600" /> Módulos do Ambiente (Editável)
                                        </h5>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                current.push({
                                                    id: `mod-man-${Date.now()}`,
                                                    name: 'Novo Módulo',
                                                    description: '',
                                                    width: 0, height: 0, depth: 0,
                                                    quantity: 1,
                                                    status: 'Pendente'
                                                });
                                                updateMemorial(envName, 'modules' as any, current);
                                            }}
                                            className="text-[10px] font-bold bg-card border border-border hover:bg-muted px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                        >
                                            <Plus size={12} /> Adicionar Item
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {((formData.environmentsDetails?.[envName] as any)?.modules || []).map((mod: any, idx: number) => (
                                            <div key={mod.id} className="p-4 bg-card border border-border rounded-lg shadow-sm group hover:border-primary/30 transition-all">
                                                {/* Header / Main Info */}
                                                <div className="flex gap-3 mb-3">
                                                    <div className="w-16">
                                                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Qtd</label>
                                                        <input
                                                            type="number"
                                                            className="w-full text-xs font-bold text-center bg-muted/50 border border-border rounded p-1.5 outline-none focus:border-primary"
                                                            value={mod.quantity}
                                                            onChange={(e) => {
                                                                const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                current[idx].quantity = parseInt(e.target.value) || 1;
                                                                updateMemorial(envName, 'modules' as any, current);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Nome do Módulo / Item</label>
                                                        <input
                                                            className="w-full text-sm font-bold bg-muted/50 border border-border rounded p-1.5 outline-none focus:border-primary"
                                                            value={mod.name}
                                                            placeholder="Nome do Módulo"
                                                            onChange={(e) => {
                                                                const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                current[idx].name = e.target.value;
                                                                updateMemorial(envName, 'modules' as any, current);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="w-32">
                                                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Status</label>
                                                        <select
                                                            className={`w-full text-[10px] font-bold uppercase rounded p-2 border outline-none cursor-pointer ${mod.status === 'Instalado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                                mod.status === 'Entregue' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                    mod.status === 'Concluído' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                        'bg-muted text-muted-foreground border-border'
                                                                }`}
                                                            value={mod.status || 'Pendente'}
                                                            onChange={(e) => {
                                                                const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                current[idx].status = e.target.value;
                                                                updateMemorial(envName, 'modules' as any, current);
                                                            }}
                                                        >
                                                            <option value="Pendente">Pendente</option>
                                                            <option value="Produção">Produção</option>
                                                            <option value="Concluído">Pronto</option>
                                                            <option value="Entregue">Entregue</option>
                                                            <option value="Instalado">Instalado</option>
                                                        </select>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm('Excluir este item?')) {
                                                                const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                current.splice(idx, 1);
                                                                updateMemorial(envName, 'modules' as any, current);
                                                            }
                                                        }}
                                                        className="self-end mb-0.5 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Excluir Item"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                {/* Details & Dimensions */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold uppercase text-slate-400">Descrição / Detalhes</label>
                                                        <textarea
                                                            rows={2}
                                                            className="w-full text-xs bg-transparent border-b border-dashed border-border outline-none focus:border-primary resize-none"
                                                            placeholder="Detalhes técnicos, puxadores, etc..."
                                                            value={mod.description || Object.values(mod.selectedVariants || {}).join(', ')}
                                                            onChange={(e) => {
                                                                const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                current[idx].description = e.target.value;
                                                                updateMemorial(envName, 'modules' as any, current);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex-1">
                                                            <label className="text-[9px] font-bold uppercase text-slate-400">Larg (cm)</label>
                                                            <input type="number" className="w-full text-xs border-b border-dashed border-border outline-none" placeholder="0" value={mod.width || ''}
                                                                onChange={(e) => {
                                                                    const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                    current[idx].width = parseFloat(e.target.value);
                                                                    updateMemorial(envName, 'modules' as any, current);
                                                                }} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[9px] font-bold uppercase text-slate-400">Alt (cm)</label>
                                                            <input type="number" className="w-full text-xs border-b border-dashed border-border outline-none" placeholder="0" value={mod.height || ''}
                                                                onChange={(e) => {
                                                                    const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                    current[idx].height = parseFloat(e.target.value);
                                                                    updateMemorial(envName, 'modules' as any, current);
                                                                }} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[9px] font-bold uppercase text-slate-400">Prof (cm)</label>
                                                            <input type="number" className="w-full text-xs border-b border-dashed border-border outline-none" placeholder="0" value={mod.depth || ''}
                                                                onChange={(e) => {
                                                                    const current = [...((formData.environmentsDetails?.[envName] as any)?.modules || [])];
                                                                    current[idx].depth = parseFloat(e.target.value);
                                                                    updateMemorial(envName, 'modules' as any, current);
                                                                }} />
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        ))}
                                        {(!formData.environmentsDetails?.[envName]?.modules || formData.environmentsDetails?.[envName]?.modules.length === 0) && (
                                            <div className="text-center py-8 text-slate-400 text-xs italic border-2 border-dashed border-border rounded-lg">
                                                Nenhum módulo listado. Adicione manualmente ou importe um PDF.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Raw Materials - Detail */}
                                <details className="mt-8 group">
                                    <summary className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground cursor-pointer hover:text-primary transition-colors select-none">
                                        <Settings2 size={14} /> Ver Lista Técnica de Materiais (MDF, Ferragens, Eletros)
                                        <div className="flex-1 h-px bg-border group-hover:bg-primary/50 transition-colors" />
                                    </summary>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2 animate-in fade-in slide-in-from-top-2">
                                        {/* MDF & Panels */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center border-b border-border pb-2">
                                                <h5 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Boxes size={14} /> MDF & Panels</h5>
                                                <button type="button" onClick={() => handleAddMdf(envName)} className="text-[10px] font-bold bg-muted hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded transition-colors">+ Add</button>
                                            </div>
                                            <div className="space-y-3">
                                                {(formData.environmentsDetails?.[envName]?.mdfParts || []).map((part: any, idx: number) => (
                                                    <div key={part.id} className="bg-muted/20 p-3 rounded-lg border border-border/50 text-sm space-y-2 group relative">
                                                        <button type="button" onClick={() => { const parts = [...(formData.environmentsDetails?.[envName]?.mdfParts || [])]; parts.splice(idx, 1); updateMemorial(envName, 'mdfParts', parts); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"><X size={10} /></button>
                                                        <input className="w-full bg-transparent font-bold outline-none placeholder:text-muted-foreground/50" placeholder="Nome da Peça" value={part.partName} onChange={e => { const parts = [...(formData.environmentsDetails?.[envName]?.mdfParts || [])]; parts[idx].partName = e.target.value; updateMemorial(envName, 'mdfParts', parts); }} />
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <select className="w-full text-xs bg-transparent border-b border-dashed border-border outline-none appearance-none" value={part.brandColor} onChange={e => { const parts = [...(formData.environmentsDetails?.[envName]?.mdfParts || [])]; parts[idx].brandColor = e.target.value; updateMemorial(envName, 'mdfParts', parts); }}>
                                                                {materials.filter(m => m.category === 'MDF').map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                                            </select>
                                                            <select className="w-full text-xs bg-transparent border-b border-dashed border-border outline-none appearance-none text-right" value={part.thickness} onChange={e => { const parts = [...(formData.environmentsDetails?.[envName]?.mdfParts || [])]; parts[idx].thickness = e.target.value; updateMemorial(envName, 'mdfParts', parts); }}>
                                                                <option value="6mm">6mm</option>
                                                                <option value="15mm">15mm</option>
                                                                <option value="18mm">18mm</option>
                                                                <option value="25mm">25mm</option>
                                                            </select>
                                                        </div>
                                                        {userRole === 'owner' && (
                                                            <div className="flex items-center gap-1 justify-end pt-1 border-t border-dashed border-border/50">
                                                                <span className="text-[10px] text-muted-foreground">R$</span>
                                                                <input
                                                                    type="number"
                                                                    className="w-16 bg-transparent text-[10px] font-bold text-right outline-none focus:text-primary"
                                                                    placeholder="0.00"
                                                                    value={part.value || ''}
                                                                    onChange={e => {
                                                                        const parts = [...(formData.environmentsDetails?.[envName]?.mdfParts || [])];
                                                                        parts[idx].value = parseFloat(e.target.value) || 0;
                                                                        updateMemorial(envName, 'mdfParts', parts);
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Hardware */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center border-b border-border pb-2">
                                                <h5 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Settings2 size={14} /> Ferragens</h5>
                                                <button type="button" onClick={() => handleAddHardware(envName)} className="text-[10px] font-bold bg-muted hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded transition-colors">+ Add</button>
                                            </div>
                                            <div className="space-y-3">
                                                {(formData.environmentsDetails?.[envName]?.hardwareItems || []).map((hw: any, idx: number) => (
                                                    <div key={hw.id} className="bg-muted/20 p-3 rounded-lg border border-border/50 text-sm space-y-2 group relative">
                                                        <button type="button" onClick={() => { const hws = [...(formData.environmentsDetails?.[envName]?.hardwareItems || [])]; hws.splice(idx, 1); updateMemorial(envName, 'hardwareItems', hws); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"><X size={10} /></button>
                                                        <div className="flex gap-2">
                                                            <select className="flex-1 text-xs bg-transparent border-b border-dashed border-border outline-none font-bold" value={hw.category} onChange={e => { const hws = [...(formData.environmentsDetails?.[envName]?.hardwareItems || [])]; hws[idx].category = e.target.value; updateMemorial(envName, 'hardwareItems', hws); }}>
                                                                <option value="">Categoria...</option>
                                                                {materialCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    list={`hardware-list-${envName}`}
                                                                    className="w-full text-xs bg-transparent border-b border-dashed border-border outline-none"
                                                                    placeholder="Busque no banco ou digite..."
                                                                    value={hw.model}
                                                                    onChange={e => {
                                                                        const hws = [...(formData.environmentsDetails?.[envName]?.hardwareItems || [])];
                                                                        hws[idx].model = e.target.value;
                                                                        const match = materials.find(m => m.name === e.target.value);
                                                                        if (match) hws[idx].brand = match.brand || '';
                                                                        updateMemorial(envName, 'hardwareItems', hws);
                                                                    }}
                                                                />
                                                                <datalist id={`hardware-list-${envName}`}>
                                                                    {materials
                                                                        .filter(m => m.category === 'Ferragem' || m.category === 'Ferragens' || m.category === 'Acessórios')
                                                                        .map(m => (
                                                                            <option key={m.id} value={m.name}>{m.brand ? `${m.brand} - ` : ''}{m.unit}</option>
                                                                        ))}
                                                                </datalist>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Appliances */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center border-b border-border pb-2">
                                                <h5 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Power size={14} /> Eletros</h5>
                                                <button type="button" onClick={() => handleAddAppliance(envName)} className="text-[10px] font-bold bg-muted hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded transition-colors">+ Add</button>
                                            </div>
                                            <div className="space-y-3">
                                                {(formData.environmentsDetails?.[envName]?.appliances || []).map((app: any, idx: number) => (
                                                    <div key={app.id} className="bg-muted/20 p-3 rounded-lg border border-border/50 text-sm space-y-2 group relative">
                                                        <button type="button" onClick={() => { const apps = [...(formData.environmentsDetails?.[envName]?.appliances || [])]; apps.splice(idx, 1); updateMemorial(envName, 'appliances', apps); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"><X size={10} /></button>
                                                        <input className="w-full bg-transparent font-bold outline-none placeholder:text-muted-foreground/50" placeholder="Nome do Item (Forno, Cooktop...)" value={app.item} onChange={e => { const apps = [...(formData.environmentsDetails?.[envName]?.appliances || [])]; apps[idx].item = e.target.value; updateMemorial(envName, 'appliances', apps); }} />
                                                        <input className="w-full text-xs bg-transparent border-b border-dashed border-border outline-none" placeholder="Marca/Modelo" value={app.brand} onChange={e => { const apps = [...(formData.environmentsDetails?.[envName]?.appliances || [])]; apps[idx].brand = e.target.value; updateMemorial(envName, 'appliances', apps); }} />
                                                        {userRole === 'owner' && (
                                                            <div className="flex items-center gap-1 justify-end pt-1 border-t border-dashed border-border/50">
                                                                <span className="text-[10px] text-muted-foreground">R$</span>
                                                                <input
                                                                    type="number"
                                                                    className="w-16 bg-transparent text-[10px] font-bold text-right outline-none focus:text-primary"
                                                                    placeholder="0.00"
                                                                    value={app.value || ''}
                                                                    onChange={e => {
                                                                        const apps = [...(formData.environmentsDetails?.[envName]?.appliances || [])];
                                                                        apps[idx].value = parseFloat(e.target.value) || 0;
                                                                        updateMemorial(envName, 'appliances', apps);
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GeralTab;
