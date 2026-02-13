import React, { useState, useMemo } from 'react';
import { Project, Client, Environment, Company, MemorialDescritivo, MdfPart, ProductionStatus, Appliance, HardwareItem, Installer, OutsourcedService, Material, Quotation, ChecklistItem, TechnicalAssistance, QualityReport, SelectedModule } from '../types';
import { AXES, INITIAL_CHECKLIST, STANDARD_MODULES } from '../mockData';
import { Plus, Trash2, Save, FileText, ChevronDown, ChevronUp, Search, X, FolderOpen, Calendar, DollarSign, PenTool, Layout, CheckCircle2, AlertTriangle, Package, Share2, Printer, ArrowRight, Layers, Ruler, Sparkles, UserCheck, Settings2, Power, Camera, Edit3, TrendingDown, Wallet, Boxes, Receipt, Users, LayoutGrid, ListIcon, Building2 } from 'lucide-react';
import { generateContract, parseContractData } from '../geminiService';
import { extractTextFromPDF } from '../pdfService';
import AIQuotationModal from './AIQuotationModal';

interface Props {
   projects: Project[];
   setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
   clients: Client[];
   setClients: React.Dispatch<React.SetStateAction<Client[]>>;
   availableEnvironments: Environment[];
   setEnvironments: React.Dispatch<React.SetStateAction<Environment[]>>;
   expenseCategories: string[];
   setExpenseCategories: React.Dispatch<React.SetStateAction<string[]>>;
   company: Company;
   installers: Installer[];
   materials: Material[];
   materialCategories: string[];
   purchaseOrders: Quotation[];
   setAssistances: React.Dispatch<React.SetStateAction<TechnicalAssistance[]>>;
}

const INITIAL_MEMORIAL = (): MemorialDescritivo => ({
   mdfParts: [{ id: `mdf-${Date.now()}`, partName: 'Caixaria', brandColor: 'Branco Standard', thickness: '15mm' }],
   fitacao: 'PVC 0.45mm',
   fundo: '6mm Branco Encaixado',
   hardwareItems: [],
   appliances: []
});

const ObrasView: React.FC<Props> = ({
   projects, setProjects, clients, setClients, availableEnvironments,
   company, installers, materials, materialCategories, purchaseOrders, setAssistances
}) => {
   // ... existing code ...


   const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
   const [filterStatus, setFilterStatus] = useState<ProductionStatus | 'Todas'>('Todas');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
   const [activeEnvForm, setActiveEnvForm] = useState<string | null>(null);
   const [activeModalTab, setActiveModalTab] = useState<'geral' | 'financeiro' | 'qualidade'>('geral');
   const [activeInput, setActiveInput] = useState<{ itemId: string, type: 'photo' | 'obs' } | null>(null);

   // Quality Control State
   const [auditStatus, setAuditStatus] = useState<'Pendente' | 'Aprovado' | 'Reprovado'>('Pendente');
   const [inspectorName, setInspectorName] = useState('');
   const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
   const [evidencePhoto, setEvidencePhoto] = useState('');
   const [problemDescription, setProblemDescription] = useState('');
   const [returnDate, setReturnDate] = useState('');

   const [outsourcedCategories, setOutsourcedCategories] = useState<string[]>(['Vidraçaria', 'Pintura de Portas', 'Serralheria', 'Mármore', 'Estofaria', 'Automação']);

   // AI States
   const [isAIModalOpen, setIsAIModalOpen] = useState(false);
   const [aiTargetEnv, setAiTargetEnv] = useState<string | null>(null);
   const [contractText, setContractText] = useState('');
   const [isContractModalOpen, setIsContractModalOpen] = useState(false);
   const [isGeneratingContract, setIsGeneratingContract] = useState(false);



   const [formData, setFormData] = useState({
      clientId: '',
      workName: '',
      selectedEnvironments: [] as string[],
      environmentsDetails: {} as Record<string, MemorialDescritivo>,
      environmentsValues: {} as Record<string, string>,
      outsourcedServices: [] as OutsourcedService[],
      value: '',
      contractDate: new Date().toISOString().split('T')[0],
      promisedDate: '',
      installerId: '',
      workAddress: '',
      currentStatus: 'Projeto' as ProductionStatus,
      checklist: [] as ChecklistItem[],
      cloudFolderLink: '' // New field
   });

   const handleImportContract = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
         alert('Lendo contrato... Aguarde (pode levar alguns segundos)');
         const text = await extractTextFromPDF(file);

         const data = await parseContractData(text);

         if (data) {
            // Auto-register or find client
            let clientId = '';
            if (data.clientName) {
               const existingClient = clients.find(c => c.name.toLowerCase() === data.clientName.toLowerCase());
               if (existingClient) {
                  clientId = existingClient.id;
                  alert(`Cliente existente encontrado: ${existingClient.name}`);
               } else {
                  // Create new client
                  const newClient: Client = {
                     id: `cli-${Date.now()}`,
                     name: data.clientName,
                     cpf: data.clientCpf || '',
                     phone: data.clientContact || '',
                     email: '',
                     address: data.clientAddress || '',
                     status: 'Ativo',
                     totalSpent: 0
                  };
                  setClients(prev => [...prev, newClient]);
                  clientId = newClient.id;
                  alert(`Novo cliente cadastrado: ${newClient.name}`);
               }
            }

            setFormData(prev => ({
               ...prev,
               workName: data.clientName ? `${data.clientName} - Móveis` : prev.workName,
               clientId: clientId || 'new-client',
               value: (data.value || 0).toString(),
               contractDate: data.contractDate || prev.contractDate,
               promisedDate: data.promisedDate || prev.promisedDate,
               selectedEnvironments: data.environments?.map((e: any) => e.name) || [],
               environmentsDetails: (data.environments || []).reduce((acc: any, env: any) => {
                  const items: SelectedModule[] = (env.modules || []).map((m: any, idx: number) => ({
                     id: `mod-ai-${Date.now()}-${idx}`,
                     originalId: 'ai-generated',
                     name: m.name,
                     description: m.description || '',
                     width: 0, height: 0, depth: 0,
                     quantity: 1,
                     selectedVariants: m.details ? { "Detalhes (IA)": m.details } : {},
                     status: 'Pendente'
                  }));

                  // Map Colors to MDF Parts
                  const mdfParts = [];
                  if (env.colors?.box) mdfParts.push({ id: `mdf-box-${Date.now()}`, partName: 'Caixaria', brandColor: env.colors.box, thickness: '15mm' });
                  else mdfParts.push({ id: `mdf-box-def`, partName: 'Caixaria', brandColor: 'Branco Tx', thickness: '15mm' });

                  if (env.colors?.front) mdfParts.push({ id: `mdf-front-${Date.now()}`, partName: 'Frentes', brandColor: env.colors.front, thickness: '18mm' });

                  acc[env.name] = {
                     ...INITIAL_MEMORIAL(),
                     modules: items,
                     mdfParts: mdfParts,
                     observation: `Importado via IA em ${new Date().toLocaleDateString()}`
                  };
                  return acc;
               }, {} as Record<string, MemorialDescritivo>)
            }));
            alert('Dados e Cliente importados com sucesso! Verifique e complete as informações.');
            setIsModalOpen(true);
            setActiveModalTab('geral');
         }
      } catch (error) {
         alert('Erro ao importar contrato. Verifique o arquivo.');
         console.error(error);
      }
   };

   const filteredProjects = useMemo(() => {
      let list = projects;
      if (filterStatus !== 'Todas') {
         list = list.filter(p => p.currentStatus === filterStatus);
      }
      return list;
   }, [projects, filterStatus]);

   const openCreateModal = () => {
      setFormData({
         clientId: '', workName: '', selectedEnvironments: [], environmentsDetails: {}, environmentsValues: {},
         outsourcedServices: [], value: '', contractDate: new Date().toISOString().split('T')[0],
         promisedDate: '', installerId: '', workAddress: '', currentStatus: 'Projeto', expenses: [],
         checklist: INITIAL_CHECKLIST.items.map(i => ({ ...i, passed: null }))
      });
      setIsModalOpen(true);
      setActiveModalTab('geral');
   };

   const openEditModal = (os: Project) => {
      setEditingProjectId(os.id);
      const envDetails: Record<string, MemorialDescritivo> = {};
      const envValues: Record<string, string> = {};
      (os.environmentsDetails || []).forEach(env => {
         envDetails[env.name] = env.memorial || INITIAL_MEMORIAL();
         envValues[env.name] = (env.value || 0).toString();
      });
      setFormData({
         clientId: os.clientId,
         workName: os.workName,
         selectedEnvironments: os.environments,
         environmentsDetails: envDetails,
         environmentsValues: envValues,
         outsourcedServices: os.outsourcedServices || [],
         checklist: os.qualityReport?.items || INITIAL_CHECKLIST.items.map(i => ({ ...i, passed: null })),
         value: os.value.toString(),
         contractDate: os.contractDate,
         promisedDate: os.promisedDate,
         installerId: os.installerId || '',
         workAddress: os.workAddress,
         currentStatus: os.currentStatus,

         expenses: os.expenses || [], // FIX: Loading expenses
         cloudFolderLink: os.cloudFolderLink || '',
         attachments: os.attachments || [] // Load attachments
      });
      setIsModalOpen(true);
   };

   // --- ATTACHMENTS HANDLER ---
   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'Project' | 'CutList' | 'Other') => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
         const base64 = reader.result as string;
         setFormData(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), { name: file.name, url: base64, type }]
         }));
      };
      reader.readAsDataURL(file);
   };

   const removeAttachment = (index: number) => {
      setFormData(prev => ({
         ...prev,
         attachments: (prev.attachments || []).filter((_, i) => i !== index)
      }));
   };

   const toggleEnvironment = (envName: string) => {
      setFormData(prev => {
         const selected = prev.selectedEnvironments.includes(envName);
         const newSelected = selected
            ? prev.selectedEnvironments.filter(e => e !== envName)
            : [...prev.selectedEnvironments, envName];

         const newDetails = { ...prev.environmentsDetails };
         // When selecting (adding) and no details exist yet
         if (!selected && !newDetails[envName]) {
            // Look for library match to autofill
            const libraryEnv = availableEnvironments.find(e => e.name === envName);
            if (libraryEnv?.memorial) {
               // Deep copy to avoid reference issues
               newDetails[envName] = JSON.parse(JSON.stringify(libraryEnv.memorial));
            } else {
               newDetails[envName] = INITIAL_MEMORIAL();
            }
         }

         return { ...prev, selectedEnvironments: newSelected, environmentsDetails: newDetails };
      });
   };

   const updateMemorial = (envName: string, field: keyof MemorialDescritivo, val: any) => {
      setFormData(prev => ({
         ...prev,
         environmentsDetails: {
            ...prev.environmentsDetails,
            [envName]: { ...prev.environmentsDetails[envName], [field]: val }
         }
      }));
   };

   const handleAddMdf = (envName: string) => {
      const newPart: MdfPart = { id: `mdf-${Date.now()}`, partName: 'Nova Parte', brandColor: 'A definir', thickness: '15mm' };
      updateMemorial(envName, 'mdfParts', [...formData.environmentsDetails[envName].mdfParts, newPart]);
   };

   const handleAddHardware = (envName: string) => {
      const newItem: HardwareItem = { id: `hw-${Date.now()}`, category: 'Dobradiça', brand: '', model: '' };
      updateMemorial(envName, 'hardwareItems', [...formData.environmentsDetails[envName].hardwareItems, newItem]);
   };

   const handleAddAppliance = (envName: string) => {
      const newItem: Appliance = { id: `ap-${Date.now()}`, item: '', brandModel: '', voltage: '220v', needsVentilation: true, manualConfirmed: false };
      updateMemorial(envName, 'appliances', [...formData.environmentsDetails[envName].appliances, newItem]);
   };



   const handleSubmitOS = (e: React.SyntheticEvent) => {
      e.preventDefault();
      const client = clients.find(c => c.id === formData.clientId);
      if (!client) return;

      const projectData = {
         clientId: client.id,
         clientName: client.name,
         workName: formData.workName,
         environments: formData.selectedEnvironments,
         environmentsDetails: formData.selectedEnvironments.map(env => ({
            name: env,
            type: 'Geral',
            memorial: formData.environmentsDetails[env] || INITIAL_MEMORIAL(),
            value: Number(formData.environmentsValues[env] || 0)
         })),
         outsourcedServices: formData.outsourcedServices,
         expenses: formData.expenses, // FIX: Saving expenses
         value: Number(formData.value),
         contractDate: formData.contractDate,
         promisedDate: formData.promisedDate,
         team: installers.find(i => i.id === formData.installerId)?.name || 'N/A',
         installerId: formData.installerId,
         workAddress: formData.workAddress,

         currentStatus: formData.currentStatus,
         cloudFolderLink: (formData as any).cloudFolderLink,
         attachments: (formData as any).attachments || [],
         materialsDelivered: editingProjectId ? projects.find(p => p.id === editingProjectId)?.materialsDelivered : false
      };

      // AUTO-STATUS: Update modules if Project Status advances
      if (['Produção', 'Instalação', 'Finalizada'].includes(formData.currentStatus)) {
         projectData.environmentsDetails.forEach(env => {
            if (env.memorial?.modules) {
               env.memorial.modules.forEach(mod => {
                  // Only advance status, never rollback automatically
                  if (mod.status === 'Pendente' || formData.currentStatus === 'Finalizada') {
                     mod.status = formData.currentStatus === 'Finalizada' ? 'Concluído' :
                        formData.currentStatus === 'Instalação' ? 'Entregue' :
                           formData.currentStatus === 'Produção' ? 'Produção' : mod.status;
                  }
               });
            }
         });
      }

      if (editingProjectId) {
         setProjects(prev => prev.map(p => {
            if (p.id === editingProjectId) {
               const newHistory = p.currentStatus !== projectData.currentStatus
                  ? [...p.history, { status: projectData.currentStatus, timestamp: new Date().toISOString() }]
                  : p.history;
               return { ...p, ...projectData as any, history: newHistory };
            }
            return p;
         }));
      } else {
         setProjects(prev => [{
            id: `OS-${Date.now().toString().slice(-4)}`,
            ...projectData as any,
            history: [{ status: formData.currentStatus, timestamp: new Date().toISOString() }]
         }, ...prev]);
      }
      setIsModalOpen(false);
   };

   const handleDelete = () => {
      if (!editingProjectId) return;
      if (confirm('Tem certeza que deseja excluir esta obra? Todos os dados vinculados serão perdidos.')) {
         const pwd = prompt('Digite a senha de administrador:');
         if (pwd !== 'adm123') {
            alert('Senha incorreta!');
            return;
         }
         setProjects(prev => prev.filter(p => p.id !== editingProjectId));
         setIsModalOpen(false);
      }
   };

   const handleGenerateContract = async () => {
      const client = clients.find(c => c.id === formData.clientId);
      if (!client) {
         alert('Selecione um cliente primeiro.');
         return;
      }
      if (!formData.selectedEnvironments.length) {
         alert('Selecione pelo menos um ambiente.');
         return;
      }

      setIsGeneratingContract(true);
      try {
         // Enhanced Description with Modules if available
         const fullDescription = formData.selectedEnvironments.map(envName => {
            const details = formData.environmentsDetails[envName];
            let text = `### ${envName}\n`;

            // Finishes
            if (details.finishExternal || details.finishInternal) {
               text += `**Acabamentos:**\n`;
               if (details.finishExternal) text += `- Externo: ${details.finishExternal}\n`;
               if (details.finishInternal) text += `- Interno: ${details.finishInternal}\n`;
               text += '\n';
            }

            // Modules
            if (details.modules && details.modules.length > 0) {
               text += `**Módulos/Itens:**\n`;
               details.modules.forEach(mod => {
                  let varText = '';
                  if (mod.selectedVariants && Object.keys(mod.selectedVariants).length > 0) {
                     varText = ' (' + Object.entries(mod.selectedVariants)
                        .map(([k, v]) => `${k}: ${v === true ? 'Sim' : v}`)
                        .join(', ') + ')';
                  }

                  // Clean dimensions if 0
                  const dimText = (mod.width || mod.height || mod.depth)
                     ? ` - [${mod.width}x${mod.height}x${mod.depth}cm]`
                     : '';

                  text += `- ${mod.quantity}x **${mod.name}**${dimText}\n  ${mod.description}${varText}\n`;
               });
            } else {
               // Fallback to basic heuristics if no modules selected
               let partsText = 'Mobiliário planejado conforme projeto.';
               if (details.partsCount && details.partsCount > 0) {
                  partsText = `${details.partsCount} peças (plano de corte)`;
               } else if (details?.mdfParts?.length) {
                  partsText = `${details.mdfParts.length} bases/peças avulsas`;
               }
               text += `- ${partsText}\n`;
            }

            return text;
         }).join('\n\n');

         const text = await generateContract(
            client.name,
            client.cpf || 'Não informado',
            Number(formData.value) || 0,
            formData.promisedDate || 'A combinar',
            fullDescription
         );

         setContractText(text);
         setIsContractModalOpen(true);
      } catch (error) {
         alert('Erro ao gerar contrato.');
      } finally {
         setIsGeneratingContract(false);
      }
   };

   // Helper to add AI items to environment
   const handleAddAIItems = (items: any[]) => {
      if (!aiTargetEnv) return;

      const currentMemorial = formData.environmentsDetails[aiTargetEnv] || INITIAL_MEMORIAL();

      // Separate items by type (heuristic)
      const newMdfParts = [...currentMemorial.mdfParts];
      const newHardware = [...currentMemorial.hardwareItems];

      items.forEach(item => {
         // Simple heuristic: if 'Chapa' -> MDF, if 'Un' -> Hardware
         if (item.unit === 'Chapa' || item.name.includes('MDF')) {
            newMdfParts.push({
               id: `mdf-ai-${Date.now()}-${Math.random()}`,
               partName: item.name,
               brandColor: 'A definir (IA)',
               thickness: '15mm',
               value: item.estimatedValue
            });
         } else {
            newHardware.push({
               id: `hw-ai-${Date.now()}-${Math.random()}`,
               category: 'Outros',
               brand: item.name,
               model: 'Sugestão IA',
               value: item.estimatedValue
            });
         }
      });

      updateMemorial(aiTargetEnv, 'mdfParts', newMdfParts);
      updateMemorial(aiTargetEnv, 'hardwareItems', newHardware);
      setAiTargetEnv(null);
   };

   return (
      <div className="space-y-6 animate-in fade-in duration-500">

         {/* HEADER */}
         <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
               <h3 className="text-2xl font-bold tracking-tight">Ordens de Serviço</h3>
               <p className="text-sm text-muted-foreground">Gerencie seus projetos e produções.</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="bg-card border border-border rounded-lg p-1 flex">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}><LayoutGrid size={18} /></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}><ListIcon size={18} /></button>
               </div>
               <label className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm cursor-pointer">
                  <Plus size={18} /> Nova OS (Importar Contrato)
                  <input
                     type="file"
                     accept="application/pdf"
                     className="hidden"
                     onChange={handleImportContract}
                  />
               </label>
            </div>
         </div>

         {/* FILTER BAR */}
         <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['Todas', 'Projeto', 'Corte', 'Produção', 'Instalação', 'Finalizada'].map(status => (
               <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === status ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-foreground/20'}`}
               >
                  {status}
               </button>
            ))}
         </div>

         {/* PROJECTS GRID/LIST */}
         {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {filteredProjects.map(os => (
                  <div key={os.id} className="group bg-card text-card-foreground rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                     <div>
                        <div className="flex justify-between items-start mb-4">
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${os.currentStatus === 'Finalizada' ? 'bg-emerald-500/10 text-emerald-500' : os.currentStatus === 'Vistoria' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                              {os.currentStatus}
                           </span>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditModal(os)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Edit3 size={16} /></button>
                           </div>
                        </div>

                        <h4 className="text-xl font-bold truncate mb-1">{os.workName}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                           <Building2 size={14} /> {os.clientName}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6">
                           {(os.environments || []).slice(0, 3).map(env => (
                              <span key={env} className="text-[10px] font-medium bg-muted/50 text-muted-foreground px-2 py-1 rounded-md">{env}</span>
                           ))}
                           {(os.environments || []).length > 3 && <span className="text-[10px] font-medium bg-muted/50 text-muted-foreground px-2 py-1 rounded-md">+{os.environments.length - 3}</span>}
                        </div>
                     </div>

                     <div className="pt-4 border-t border-border flex justify-between items-end">
                        <div>
                           <span className="text-xs text-muted-foreground block">Valor Total</span>
                           <span className="text-lg font-bold text-emerald-600">R$ {os.value.toLocaleString()}</span>
                        </div>
                        <div className="flex -space-x-2">
                           {/* Placeholder for team avatars */}
                           <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-card flex items-center justify-center text-[10px] font-bold text-slate-500">{os.team.slice(0, 2).toUpperCase()}</div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
               <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                     <tr>
                        <th className="px-6 py-3">Obra</th>
                        <th className="px-6 py-3">Cliente</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Ambientes</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                        <th className="px-6 py-3 w-10"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                     {filteredProjects.map(os => (
                        <tr key={os.id} className="hover:bg-muted/20 group transition-colors">
                           <td className="px-6 py-4 font-medium">{os.workName}</td>
                           <td className="px-6 py-4 text-muted-foreground">{os.clientName}</td>
                           <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${os.currentStatus === 'Finalizada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                                 {os.currentStatus}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-muted-foreground">{os.environments.length} ambientes</td>
                           <td className="px-6 py-4 text-right font-medium">R$ {os.value.toLocaleString()}</td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100">
                                 <button onClick={() => openEditModal(os)} className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                                    <Edit3 size={16} />
                                 </button>
                                 {os.cloudFolderLink && (
                                    <a href={os.cloudFolderLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                                       <FolderOpen size={16} />
                                    </a>
                                 )}
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         {/* CREATE/EDIT MODAL */}
         {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
               <div className="bg-card w-full max-w-5xl h-[90vh] rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">

                  {/* Modal Header */}
                  <div className="bg-muted/20 border-b border-border">
                     <div className="p-6 flex justify-between items-center">
                        <div>
                           <h3 className="text-xl font-bold">{editingProjectId ? 'Editar Obra' : 'Nova Ordem de Serviço'}</h3>
                           <p className="text-xs text-muted-foreground mt-1">Gestão completa do projeto</p>
                        </div>

                        <div className="flex items-center gap-4">
                           <button
                              type="button"
                              onClick={handleGenerateContract}
                              disabled={isGeneratingContract}
                              className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2 mr-2"
                           >
                              {isGeneratingContract ? <span className="animate-spin">⏳</span> : <FileText size={14} />}
                              {isGeneratingContract ? 'Gerando...' : 'Gerar Contrato'}
                           </button>

                           {/* Status Selector with Blocking Logic */}
                           <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-1">
                              <span className="text-xs font-bold uppercase px-2 text-muted-foreground">Fase Atual:</span>
                              <select
                                 className={`text-sm font-bold bg-transparent outline-none cursor-pointer ${formData.currentStatus === 'Finalizada' ? 'text-emerald-600' : 'text-primary'
                                    }`}
                                 value={formData.currentStatus}
                                 onChange={e => {
                                    const newStatus = e.target.value as ProductionStatus;
                                    const isAdvancing = ['Produção', 'Instalação', 'Finalizada'].includes(newStatus);

                                    // 1. Validation Logic: Block Vistoria/Finalizada if MDO not authorized
                                    if (['Vistoria', 'Finalizada'].includes(newStatus)) {
                                       const unauthorizedEnvs = formData.selectedEnvironments.filter(envName => {
                                          const details = formData.environmentsDetails[envName];
                                          // Check if MDO is authorized (which means Accepted in new flow)
                                          return !details?.isMdoAuthorized;
                                       });

                                       if (unauthorizedEnvs.length > 0) {
                                          alert(`⛔ BLOQUEIO DE PROCESSO\n\nExistem ambientes sem Apontamento de Empreita autorizado (Suprimentos).\n\nAmbientes pendentes:\n${unauthorizedEnvs.join('\n')}\n\nRegularize a situação em Suprimentos > Empreitas para avançar.`);
                                          return;
                                       }
                                    }

                                    // 2. Existing Blocking Logic (Outsourced Services)
                                    if (isAdvancing && formData.outsourcedServices.length > 0) {
                                       const incompleteServices = formData.outsourcedServices.filter(s => !s.supplierName || !s.value);
                                       if (incompleteServices.length > 0) {
                                          alert(`⛔ BLOQUEIO DE PRODUÇÃO\n\nExistem ${incompleteServices.length} serviços terceirizados sem fornecedor ou valor definidos.\n\nPreencha essas informações na aba "Dossiê Técnico" para avançar.`);
                                          return;
                                       }
                                    }
                                    setFormData({ ...formData, currentStatus: newStatus });
                                 }}
                              >
                                 <option value="Projeto">Projeto</option>
                                 <option value="Corte">Corte</option>
                                 <option value="Produção">Produção</option>
                                 <option value="Instalação">Instalação</option>
                                 <option value="Vistoria">Vistoria (Qualidade)</option>
                                 <option value="Finalizada" disabled>Finalizada (Automático)</option>
                              </select>
                           </div>

                           <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
                        </div>
                     </div>

                     {/* Tabs Navigation */}
                     <div className="px-6 flex gap-6">
                        <button
                           type="button"
                           onClick={() => setActiveModalTab('geral')}
                           className={`pb-3 px-1 text-xs font-bold tracking-widest transition-colors border-b-2 uppercase ${activeModalTab === 'geral' ? 'border-amber-400 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                           Dossiê Técnico
                        </button>
                        <button
                           type="button"
                           onClick={() => setActiveModalTab('financeiro')}
                           className={`pb-3 px-1 text-xs font-bold tracking-widest transition-colors border-b-2 uppercase ${activeModalTab === 'financeiro' ? 'border-amber-400 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                           DRE Industrial Real & Relatório
                        </button>
                     </div>
                  </div>

                  {/* Modal Body */}
                  <form onSubmit={handleSubmitOS} className="flex-1 overflow-y-auto p-8 space-y-8">

                     {/* Financial Calculations (Hoisted for usage in tabs) */}
                     {(() => {
                        // 1. Receita
                        const revenue = parseFloat(formData.value) || 0;

                        // 2. Custos de Materiais (Compras Confirmadas)
                        const projectPOs = (purchaseOrders || []).filter(po => po.projectId === editingProjectId && (po.status === 'Comprado' || po.status === 'Entregue'));
                        const poCost = projectPOs.reduce((total, po) => {
                           return total + (po.items || []).reduce((sum, item) => sum + ((item.materialValue || 0) * item.quantity), 0);
                        }, 0);

                        // 3. Custos do Dossiê
                        let dossieMdfCost = 0;
                        let dossieHardwareCost = 0;
                        let dossieApplianceCost = 0;

                        if (formData.environmentsDetails) {
                           Object.values(formData.environmentsDetails).forEach((env: any) => {
                              dossieMdfCost += (env.mdfParts || []).reduce((sum: number, item: any) => sum + (item.value || 0), 0);
                              dossieHardwareCost += (env.hardwareItems || []).reduce((sum: number, item: any) => sum + (item.value || 0), 0);
                              dossieApplianceCost += (env.appliances || []).reduce((sum: number, item: any) => sum + (item.value || 0), 0);
                           });
                        }

                        const totalMaterialCost = poCost + dossieMdfCost + dossieHardwareCost + dossieApplianceCost;

                        // 4. Custos Terceirizados
                        const outsourcedCost = (formData.outsourcedServices || []).reduce((acc, curr) => acc + (curr.value || 0), 0);

                        // 5. Custos Extras
                        const extraExpensesCost = (formData as any).expenses ? ((formData as any).expenses as any[]).reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) : 0;

                        const totalCost = totalMaterialCost + outsourcedCost + extraExpensesCost;
                        const profit = revenue - totalCost;
                        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                        const handleChecklistToggle = (id: string, passed: boolean) => {
                           setFormData(prev => ({
                              ...prev,
                              checklist: prev.checklist.map(item => item.id === id ? { ...item, passed } : item)
                           }));
                        };

                        const handleFinishInspection = () => {
                           // 1. Check for Pending Status
                           if (auditStatus === 'Pendente') {
                              alert('Selecione o STATUS DA QUALIDADE (Aprovado ou Reprovado) antes de continuar.');
                              return;
                           }

                           const unanswered = formData.checklist.filter(i => i.passed === null);
                           if (unanswered.length > 0) {
                              alert(`AUDITORIA INCOMPLETA!\n\nRestam ${unanswered.length} itens a serem verificados antes da finalização.`);
                              return;
                           }

                           // Calculate Score
                           const totalItems = formData.checklist.length;
                           const passedItems = formData.checklist.filter(i => i.passed === true).length;
                           const newScore = (passedItems / totalItems) * 10;
                           const baseBonus = 500;
                           const newBonus = newScore === 10 ? baseBonus : (newScore >= 8 ? baseBonus * 0.5 : 0);

                           const report: QualityReport = {
                              id: `qr-${Date.now()}`,
                              projectId: editingProjectId || `temp-${Date.now()}`,
                              installerId: formData.installerId,
                              date: inspectionDate, // Use manual inspection date
                              score: Number(newScore.toFixed(1)),
                              bonusAmount: newBonus,
                              inspectorName: inspectorName || 'Admin',
                              items: formData.checklist,
                              status: auditStatus,
                              evidencePhotoUrl: evidencePhoto,
                              problemDescription: problemDescription,
                              technicianId: formData.installerId,
                              returnDate: returnDate
                           };

                           // Logic for Rejection (Create Ticket)
                           if (auditStatus === 'Reprovado') {
                              const newTicket: TechnicalAssistance = {
                                 id: `ta-${Date.now()}`,
                                 clientId: formData.clientId,
                                 clientName: clients.find(c => c.id === formData.clientId)?.name || 'Cliente Desconhecido',
                                 projectId: editingProjectId || '',
                                 workName: formData.workName,
                                 requestDate: new Date().toISOString().split('T')[0],
                                 status: 'Aberto',
                                 reportedProblem: `REPROVAÇÃO ${inspectorName ? 'POR ' + inspectorName : ''}: ${problemDescription}\n\nITENS REPROVADOS:\n` +
                                    formData.checklist.filter(i => i.passed === false).map(i => `- ${i.label}: ${i.observation || 'Sem obs'}`).join('\n'),
                                 technicianId: formData.installerId,
                                 returnDate: returnDate
                              };

                              setAssistances(prev => [...prev, newTicket]);
                              localStorage.setItem('chamadoAberto', 'true'); // SET FLAG

                              alert(`AUDITORIA REPROVADA!\n\nChamado de Assistência Técnica (ID: ${newTicket.id}) aberto com sucesso.\n\nA obra NÃO foi finalizada e permanece em Vistoria até a resolução.`);
                              setIsModalOpen(false);
                              return;
                           }

                           // Logic for Approval
                           if (auditStatus === 'Aprovado') {
                              // Check Lock
                              if (localStorage.getItem('chamadoAberto') === 'true') {
                                 alert('⛔ AÇÃO BLOQUEADA\n\nExiste um chamado de assistência em aberto (Flag Ativa). Você deve resolver o chamado antes de aprovar a obra.');
                                 return;
                              }

                              // Update Project
                              if (editingProjectId) {
                                 setProjects(prev => prev.map(p => {
                                    if (p.id === editingProjectId) {
                                       return {
                                          ...p,
                                          currentStatus: 'Finalizada',
                                          qualityReport: report,
                                          history: [...p.history, { status: 'Finalizada', timestamp: new Date().toISOString() }]
                                       };
                                    }
                                    return p;
                                 }));
                              } else {
                                 // For new projects, just update form data status
                                 setFormData(prev => ({ ...prev, currentStatus: 'Finalizada' }));
                              }

                              alert(`AUDITORIA APROVADA!\n\nScore: ${newScore.toFixed(1)}/10\nBônus: R$ ${newBonus.toFixed(2)}\n\nA obra foi FINALIZADA com sucesso.`);
                              setIsModalOpen(false);
                           }
                        };

                        const getStatusSteps = (status: string) => {
                           const steps = ['Venda', 'Projeto', 'Corte (Terceirizado)', 'Montagem (Interna)', 'Entrega', 'Instalação'];
                           const currentIdx = steps.indexOf(status);
                           return steps.map((s, i) => ({ label: s, active: i <= currentIdx }));
                        };

                        const calculateFairCommission = (envName: string, value: number) => {
                           const details = formData.environmentsDetails[envName] as any;
                           const factor = details.difficultyFactor || 1.0;
                           // Base Commission = 10%
                           return (value * 0.10) * factor;
                        };

                        const generateWhatsappOrder = (envName: string) => {
                           const client = clients.find(c => c.id === formData.clientId);
                           const details = formData.environmentsDetails[envName] as any;
                           const modules = details.modules || [];

                           let text = `*ORDEM DE SERVIÇO - HYPADO PLANEJADOS*\n`;
                           text += `📅 Data: ${new Date().toLocaleDateString()}\n`;
                           text += `👤 Cliente: ${client?.name}\n`;
                           text += `📍 Endereço: ${client?.address || 'A confirmar'}\n\n`;

                           text += `*AMBIENTE: ${envName}*\n`;
                           if (details.observation) text += `ℹ️ Obs: ${details.observation}\n`;
                           text += `--------------------------------\n`;

                           modules.forEach((mod: any, i: number) => {
                              text += `${i + 1}. *${mod.name}* (${mod.width}x${mod.height}x${mod.depth}cm)\n`;
                              if (mod.promobId) text += `   🏷️ ID: ${mod.promobId}\n`;
                              const vars = Object.entries(mod.selectedVariants || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
                              if (vars) text += `   🔧 Detalhes: ${vars}\n`;
                              text += `\n`;
                           });

                           text += `\n⚠️ *Atenção:* Verificar nível e esquadro antes da fixação final.`;

                           // Add File Links
                           if ((formData as any).attachments?.length > 0) {
                              text += `\n\n📁 *Arquivos Anexados:*\n`;
                              (formData as any).attachments.forEach((att: any) => {
                                 // If it's a base64 (which is long), we can't send it via URL param easily.
                                 // Ideally we sends a link. For now, if we have a cloudFolderLink, we send that.
                                 // If it's a base64, we might skip or mention "Ver anexo no sistema".
                                 // Assuming we use cloudFolderLink as primary for now.
                                 if (att.url.startsWith('http')) {
                                    text += `- ${att.name}: ${att.url}\n`;
                                 }
                              });
                           }

                           if (formData.cloudFolderLink) {
                              text += `\n📂 *Pasta na Nuvem:* ${formData.cloudFolderLink}`;
                           }

                           const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                           window.open(url, '_blank');
                        };

                        return (
                           <>
                              {activeModalTab === 'geral' && (
                                 /* CONTEÚDO DA ABA GERAL (DOSSIÊ TÉCNICO) */
                                 <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
                                       <div className="space-y-2 col-span-1 md:col-span-2">
                                          <label className="text-xs font-medium text-muted-foreground uppercase">Nome da Obra</label>
                                          <input
                                             type="text"
                                             disabled={formData.currentStatus === 'Finalizada'}
                                             className="w-full h-11 px-4 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                             value={formData.workName} onChange={e => setFormData({ ...formData, workName: e.target.value })} placeholder="Ex: Apartamento 42" required
                                          />
                                       </div>
                                       <div className="space-y-2">
                                          <label className="text-xs font-medium text-muted-foreground uppercase">Valor Contrato (R$)</label>
                                          <input
                                             type="number"
                                             disabled={formData.currentStatus === 'Finalizada'}
                                             className="w-full h-11 px-4 bg-background border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                             value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} placeholder="0.00"
                                          />
                                       </div>
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

                                    {/* Ambientes Disponíveis - REMOVIDO PARA FORÇAR USO DO CONTRATO */}
                                    {/* <div className="space-y-4"> ... </div> */}

                                    {/* FILES & ATTACHMENTS CARD */}
                                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                                       <h4 className="font-bold text-lg flex items-center gap-2 mb-4"><FileText size={18} className="text-primary" /> Arquivos e Projetos</h4>
                                       <div className="flex flex-wrap gap-4 mb-4">
                                          <label className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted rounded-lg cursor-pointer transition-colors text-xs font-bold uppercase">
                                             <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => handleFileUpload(e, 'Project')} />
                                             <FolderOpen size={16} /> Anexar Projeto (PDF/Img)
                                          </label>
                                          <label className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted rounded-lg cursor-pointer transition-colors text-xs font-bold uppercase">
                                             <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => handleFileUpload(e, 'CutList')} />
                                             <ListIcon size={16} /> Anexar Plano de Corte
                                          </label>
                                       </div>

                                       {(formData as any).attachments?.length > 0 && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                             {(formData as any).attachments.map((file: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg group">
                                                   <div className="flex items-center gap-3 overflow-hidden">
                                                      <div className={`p-2 rounded-lg ${file.type === 'Project' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                                         {file.type === 'Project' ? <FileText size={16} /> : <Layout size={16} />}
                                                      </div>
                                                      <div className="truncate">
                                                         <p className="text-xs font-bold truncate">{file.name}</p>
                                                         <p className="text-[10px] text-muted-foreground uppercase">{file.type}</p>
                                                      </div>
                                                   </div>
                                                   <div className="flex items-center gap-2">
                                                      <a href={file.url} download={file.name} className="p-1.5 text-muted-foreground hover:text-primary transition-colors"><FolderOpen size={14} /></a>
                                                      <button type="button" onClick={() => removeAttachment(idx)} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                                   </div>
                                                </div>
                                             ))}
                                          </div>
                                       )}
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
                                          {formData.outsourcedServices.map((svc, idx) => (
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
                                                   <div className="flex items-center gap-1">
                                                      <span className="text-xs text-muted-foreground">R$</span>
                                                      <input type="number" placeholder="0.00" className="w-full text-sm font-bold bg-transparent border-b border-border focus:border-primary outline-none" value={svc.value || ''} onChange={e => { const svcs = [...formData.outsourcedServices]; svcs[idx].value = parseFloat(e.target.value); setFormData({ ...formData, outsourcedServices: svcs }); }} />
                                                   </div>
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
                                          {formData.selectedEnvironments.map(envName => (
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
                                                         value={(formData.environmentsDetails[envName] as any).observation || ''}
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
                                                </div>                                                <div className="p-6 md:p-8 space-y-8">

                                                   {/* 1. Finishes & Modules Library - REMOVIDO (Dados vêm do contrato) */}
                                                   <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                                      <h5 className="text-sm font-bold uppercase text-slate-700 flex items-center gap-2 mb-4">
                                                         <Sparkles size={16} className="text-purple-600" /> Módulos do Ambiente (Importados)
                                                      </h5>

                                                      {/* Manual inputs removed. Only listing modules below. */}

                                                      {/* Selected Modules List */}
                                                      <div className="mt-4 space-y-2">
                                                         {((formData.environmentsDetails[envName] as any).modules || []).map((mod: any, idx: number) => (
                                                            <div key={mod.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm group">
                                                               <div>
                                                                  <span className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                                                     {mod.name}
                                                                     {mod.promobId && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">ID: {mod.promobId}</span>}
                                                                  </span>
                                                                  <div className="text-xs text-slate-500">
                                                                     {Object.entries(mod.selectedVariants || {}).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                                                                     {(mod.width || mod.height) ? ` • [${mod.width}x${mod.height}cm]` : ''}
                                                                  </div>
                                                               </div>
                                                               <div className="flex items-center gap-3">
                                                                  <select
                                                                     className={`text-[10px] font-bold uppercase rounded px-2 py-1 border outline-none cursor-pointer ${mod.status === 'Instalado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                                        mod.status === 'Entregue' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                           mod.status === 'Concluído' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                              'bg-slate-100 text-slate-500 border-slate-200'
                                                                        }`}
                                                                     value={mod.status || 'Pendente'}
                                                                     onChange={(e) => {
                                                                        const current = [...((formData.environmentsDetails[envName] as any).modules || [])];
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
                                                                  <button
                                                                     type="button"
                                                                     onClick={() => {
                                                                        const current = [...((formData.environmentsDetails[envName] as any).modules || [])];
                                                                        current.splice(idx, 1);
                                                                        updateMemorial(envName, 'modules' as any, current);
                                                                     }}
                                                                     className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                                                                  >
                                                                     <X size={16} />
                                                                  </button>
                                                               </div>
                                                            </div>
                                                         ))}
                                                      </div>
                                                   </div>

                                                   {/* Raw Materials - HIDDEN BY DEFAULT (User Request) */}
                                                   <details className="mt-8 group">
                                                      <summary className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground cursor-pointer hover:text-primary transition-colors select-none">
                                                         <Settings2 size={14} /> Ver Lista Técnica de Materiais (MDF, Ferragens, Eletros)
                                                         <div className="flex-1 h-px bg-border group-hover:bg-primary/50 transition-colors" />
                                                      </summary>
                                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 animate-in fade-in slide-in-from-top-2">
                                                         {/* Column 1: MDF & Panels */}
                                                         <div className="space-y-4">
                                                            <div className="flex justify-between items-center border-b border-border pb-2">
                                                               <h5 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Boxes size={14} /> MDF & Panels</h5>
                                                               <button type="button" onClick={() => handleAddMdf(envName)} className="text-[10px] font-bold bg-muted hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded transition-colors">+ Add</button>
                                                            </div>
                                                            <div className="space-y-3">
                                                               {formData.environmentsDetails[envName].mdfParts.map((part, idx) => (
                                                                  <div key={part.id} className="bg-muted/20 p-3 rounded-lg border border-border/50 text-sm space-y-2 group relative">
                                                                     <button type="button" onClick={() => { const parts = [...formData.environmentsDetails[envName].mdfParts]; parts.splice(idx, 1); updateMemorial(envName, 'mdfParts', parts); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"><X size={10} /></button>
                                                                     <input className="w-full bg-transparent font-bold outline-none placeholder:text-muted-foreground/50" placeholder="Nome da Peça" value={part.partName} onChange={e => { const parts = [...formData.environmentsDetails[envName].mdfParts]; parts[idx].partName = e.target.value; updateMemorial(envName, 'mdfParts', parts); }} />
                                                                     <div className="grid grid-cols-2 gap-2">
                                                                        <select className="w-full text-xs bg-transparent border-b border-dashed border-border outline-none appearance-none" value={part.brandColor} onChange={e => { const parts = [...formData.environmentsDetails[envName].mdfParts]; parts[idx].brandColor = e.target.value; updateMemorial(envName, 'mdfParts', parts); }}>
                                                                           {materials.filter(m => m.category === 'MDF').map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                                                        </select>
                                                                        <select className="w-full text-xs bg-transparent border-b border-dashed border-border outline-none appearance-none text-right" value={part.thickness} onChange={e => { const parts = [...formData.environmentsDetails[envName].mdfParts]; parts[idx].thickness = e.target.value; updateMemorial(envName, 'mdfParts', parts); }}>
                                                                           <option value="6mm">6mm</option>
                                                                           <option value="15mm">15mm</option>
                                                                           <option value="18mm">18mm</option>
                                                                           <option value="25mm">25mm</option>
                                                                        </select>
                                                                     </div>
                                                                     {/* Value Input */}
                                                                     <div className="flex items-center gap-1 justify-end pt-1 border-t border-dashed border-border/50">
                                                                        <span className="text-[10px] text-muted-foreground">R$</span>
                                                                        <input
                                                                           type="number"
                                                                           className="w-16 bg-transparent text-[10px] font-bold text-right outline-none focus:text-primary"
                                                                           placeholder="0.00"
                                                                           value={part.value || ''}
                                                                           onChange={e => {
                                                                              const parts = [...formData.environmentsDetails[envName].mdfParts];
                                                                              parts[idx].value = parseFloat(e.target.value) || 0;
                                                                              updateMemorial(envName, 'mdfParts', parts);
                                                                           }}
                                                                        />
                                                                     </div>
                                                                  </div>
                                                               ))}
                                                            </div>
                                                         </div>

                                                         {/* Column 2: Hardware */}
                                                         <div className="space-y-4">
                                                            <div className="flex justify-between items-center border-b border-border pb-2">
                                                               <h5 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Settings2 size={14} /> Ferragens</h5>
                                                               <button type="button" onClick={() => handleAddHardware(envName)} className="text-[10px] font-bold bg-muted hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded transition-colors">+ Add</button>
                                                            </div>
                                                            <div className="space-y-3">
                                                               {formData.environmentsDetails[envName].hardwareItems.map((hw, idx) => (
                                                                  <div key={hw.id} className="bg-muted/20 p-3 rounded-lg border border-border/50 text-sm space-y-2 group relative">
                                                                     <button type="button" onClick={() => { const hws = [...formData.environmentsDetails[envName].hardwareItems]; hws.splice(idx, 1); updateMemorial(envName, 'hardwareItems', hws); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"><X size={10} /></button>
                                                                     <div className="flex gap-2">
                                                                        <select className="flex-1 text-xs bg-transparent border-b border-dashed border-border outline-none font-bold" value={hw.category} onChange={e => { const hws = [...formData.environmentsDetails[envName].hardwareItems]; hws[idx].category = e.target.value; updateMemorial(envName, 'hardwareItems', hws); }}>
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
                                                                                 const hws = [...formData.environmentsDetails[envName].hardwareItems];
                                                                                 hws[idx].model = e.target.value;
                                                                                 // Try to find match in registry to auto-fill brand
                                                                                 const match = materials.find(m => m.name === e.target.value);
                                                                                 if (match) {
                                                                                    hws[idx].brand = match.brand || '';
                                                                                 }
                                                                                 setFormData(prev => ({
                                                                                    ...prev,
                                                                                    environmentsDetails: {
                                                                                       ...prev.environmentsDetails[envName],
                                                                                       hardwareItems: hws
                                                                                    }
                                                                                 }));
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

                                                         {/* Column 3: Appliances */}
                                                         <div className="space-y-4">
                                                            <div className="flex justify-between items-center border-b border-border pb-2">
                                                               <h5 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Power size={14} /> Eletros</h5>
                                                               <button type="button" onClick={() => handleAddAppliance(envName)} className="text-[10px] font-bold bg-muted hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded transition-colors">+ Add</button>
                                                            </div>
                                                            <div className="space-y-3">
                                                               {formData.environmentsDetails[envName].appliances.map((app, idx) => (
                                                                  <div key={app.id} className="bg-muted/20 p-3 rounded-lg border border-border/50 text-sm space-y-2 group relative">
                                                                     <button type="button" onClick={() => { const apps = [...formData.environmentsDetails[envName].appliances]; apps.splice(idx, 1); updateMemorial(envName, 'appliances', apps); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"><X size={10} /></button>
                                                                     <input className="w-full bg-transparent font-bold outline-none placeholder:text-muted-foreground/50" placeholder="Nome do Item (Forno, Cooktop...)" value={app.item} onChange={e => { const apps = [...formData.environmentsDetails[envName].appliances]; apps[idx].item = e.target.value; updateMemorial(envName, 'appliances', apps); }} />
                                                                     <input className="w-full text-xs bg-transparent border-b border-dashed border-border outline-none" placeholder="Marca/Modelo" value={app.brand} onChange={e => { const apps = [...formData.environmentsDetails[envName].appliances]; apps[idx].brand = e.target.value; updateMemorial(envName, 'appliances', apps); }} />
                                                                     {/* Value Input */}
                                                                     <div className="flex items-center gap-1 justify-end pt-1 border-t border-dashed border-border/50">
                                                                        <span className="text-[10px] text-muted-foreground">R$</span>
                                                                        <input
                                                                           type="number"
                                                                           className="w-16 bg-transparent text-[10px] font-bold text-right outline-none focus:text-primary"
                                                                           placeholder="0.00"
                                                                           value={app.value || ''}
                                                                           onChange={e => {
                                                                              const apps = [...formData.environmentsDetails[envName].appliances];
                                                                              apps[idx].value = parseFloat(e.target.value) || 0;
                                                                              updateMemorial(envName, 'appliances', apps);
                                                                           }}
                                                                        />
                                                                     </div>
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
                              )}

                              {activeModalTab === 'qualidade' && (
                                 <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                          <div>
                                             <h4 className="text-lg font-black uppercase italic tracking-tight text-slate-800">Checklist Final de Entrega</h4>
                                             <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Auditoria Técnica e Acabamento</p>
                                          </div>

                                          {/* Inspection Data */}
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                   <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Endereço da Obra</label>
                                                   <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                                                      <Building2 size={16} className="text-slate-400" />
                                                      <input
                                                         type="text"
                                                         className="bg-transparent w-full text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
                                                         placeholder="Endereço completo"
                                                         value={formData.workAddress}
                                                         onChange={e => setFormData({ ...formData, workAddress: e.target.value })}
                                                      />
                                                   </div>
                                                </div>
                                                <div>
                                                   <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Link da Pasta (Nuvem)</label>
                                                   <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                                                      <FolderOpen size={16} className="text-blue-400" />
                                                      <input
                                                         type="url"
                                                         className="bg-transparent w-full text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
                                                         placeholder="https://onedrive..."
                                                         value={(formData as any).cloudFolderLink || ''}
                                                         onChange={e => setFormData({ ...formData, cloudFolderLink: e.target.value } as any)}
                                                      />
                                                   </div>
                                                </div>
                                             </div>         <div>
                                                <label className="block text-[10px] font-bold uppercase text-slate-400">Data da Vistoria</label>
                                                <input
                                                   type="date"
                                                   className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg py-1.5 px-3 outline-none focus:border-amber-500"
                                                   value={inspectionDate}
                                                   onChange={e => setInspectionDate(e.target.value)}
                                                />
                                             </div>
                                             <div>
                                                <label className="block text-[10px] font-bold uppercase text-slate-400">Técnico Responsável</label>
                                                <select
                                                   className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg py-1.5 px-3 outline-none focus:border-amber-500"
                                                   value={formData.installerId}
                                                   onChange={e => setFormData({ ...formData, installerId: e.target.value })}
                                                   disabled={formData.currentStatus === 'Finalizada'}
                                                >
                                                   <option value="">Selecione...</option>
                                                   {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                                </select>
                                             </div>
                                          </div>

                                          <div className="text-right w-full md:w-auto">
                                             <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 block whitespace-nowrap">
                                                {formData.checklist.filter(i => i.passed !== null).length}/{formData.checklist.length} Itens Verificados
                                             </span>
                                          </div>
                                       </div>

                                       <div className="space-y-8">
                                          {AXES.map(axis => (
                                             <div key={axis} className="space-y-4">
                                                <h5 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em] border-b border-slate-200 pb-2 italic">{axis}</h5>
                                                <div className="grid grid-cols-1 gap-3">
                                                   {formData.checklist.filter(item => item.axis === axis).map(item => (
                                                      <div key={item.id} className={`flex flex-col p-4 bg-white rounded-xl border transition-all ${item.passed === null ? 'border-slate-100' : (item.passed ? 'border-emerald-500/30 bg-emerald-50/10' : 'border-red-500/30 bg-red-50/10')}`}>
                                                         <div className="flex items-center justify-between mb-3">
                                                            <span className="font-bold text-slate-700 text-sm">{item.label}</span>
                                                            <div className="flex gap-2">
                                                               <button
                                                                  type="button"
                                                                  onClick={() => handleChecklistToggle(item.id, true)}
                                                                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${item.passed === true ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-300 hover:bg-emerald-100 hover:text-emerald-400'}`}
                                                               >
                                                                  <CheckCircle2 size={20} />
                                                               </button>
                                                               <button
                                                                  type="button"
                                                                  onClick={() => handleChecklistToggle(item.id, false)}
                                                                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${item.passed === false ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-300 hover:bg-red-100 hover:text-red-400'}`}
                                                               >
                                                                  <X size={20} />
                                                               </button>
                                                            </div>
                                                         </div>

                                                         {/* Actions: Photo & Obs */}
                                                         {/* Actions: Photo & Obs */}
                                                         <div className="flex gap-2 pt-2 border-t border-dashed border-slate-100">

                                                            {/* Photo Input or Button */}
                                                            {activeInput?.itemId === item.id && activeInput.type === 'photo' ? (
                                                               <div className="flex-1 flex gap-1 animate-in slide-in-from-left-2">
                                                                  <input
                                                                     autoFocus
                                                                     className="flex-1 text-[10px] border border-blue-200 rounded px-2 outline-none focus:border-blue-500"
                                                                     placeholder="URL da Foto..."
                                                                     defaultValue={item.photoUrl || ''}
                                                                     onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                           const val = e.currentTarget.value;
                                                                           setFormData(prev => ({ ...prev, checklist: prev.checklist.map(i => i.id === item.id ? { ...i, photoUrl: val } : i) }));
                                                                           setActiveInput(null);
                                                                        } else if (e.key === 'Escape') setActiveInput(null);
                                                                     }}
                                                                     onBlur={(e) => {
                                                                        const val = e.currentTarget.value;
                                                                        setFormData(prev => ({ ...prev, checklist: prev.checklist.map(i => i.id === item.id ? { ...i, photoUrl: val } : i) }));
                                                                        setActiveInput(null);
                                                                     }}
                                                                  />
                                                               </div>
                                                            ) : (
                                                               <button
                                                                  type="button"
                                                                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${item.photoUrl ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                                  onClick={() => setActiveInput({ itemId: item.id, type: 'photo' })}
                                                               >
                                                                  <Camera size={14} /> {item.photoUrl ? 'Foto Anexada' : 'Adicionar Foto'}
                                                               </button>
                                                            )}

                                                            {/* Observation Input or Button */}
                                                            {activeInput?.itemId === item.id && activeInput.type === 'obs' ? (
                                                               <div className="flex-1 flex gap-1 animate-in slide-in-from-right-2">
                                                                  <input
                                                                     autoFocus
                                                                     className="flex-1 text-[10px] border border-amber-200 rounded px-2 outline-none focus:border-amber-500"
                                                                     placeholder="Observação..."
                                                                     defaultValue={item.observation || ''}
                                                                     onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                           const val = e.currentTarget.value;
                                                                           setFormData(prev => ({ ...prev, checklist: prev.checklist.map(i => i.id === item.id ? { ...i, observation: val } : i) }));
                                                                           setActiveInput(null);
                                                                        } else if (e.key === 'Escape') setActiveInput(null);
                                                                     }}
                                                                     onBlur={(e) => {
                                                                        const val = e.currentTarget.value;
                                                                        setFormData(prev => ({ ...prev, checklist: prev.checklist.map(i => i.id === item.id ? { ...i, observation: val } : i) }));
                                                                        setActiveInput(null);
                                                                     }}
                                                                  />
                                                               </div>
                                                            ) : (
                                                               <button
                                                                  type="button"
                                                                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${item.observation ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                                  onClick={() => setActiveInput({ itemId: item.id, type: 'obs' })}
                                                               >
                                                                  <Edit3 size={14} /> {item.observation ? 'Ver Obs.' : 'Observação'}
                                                               </button>
                                                            )}
                                                         </div>
                                                      </div>
                                                   ))}
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    </div>

                                    {/* Final Status Decision - Redesigned */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                                          <h4 className="font-black text-slate-900 uppercase italic">Status da Qualidade</h4>
                                          <div className="flex items-center gap-4 w-full md:w-auto">
                                             <select
                                                value={auditStatus}
                                                onChange={(e) => setAuditStatus(e.target.value as any)}
                                                className={`flex-1 md:w-48 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider outline-none border transition-all ${auditStatus === 'Aprovado' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                                   auditStatus === 'Reprovado' ? 'bg-red-50 border-red-200 text-red-700' :
                                                      'bg-slate-50 border-slate-200 text-slate-500'
                                                   }`}
                                             >
                                                <option value="Pendente">Pendente</option>
                                                <option value="Aprovado">Aprovado</option>
                                                <option value="Reprovado">Reprovado</option>
                                             </select>
                                          </div>
                                       </div>

                                       {/* Relato Visual - Evidence Upload */}
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-bold uppercase text-slate-400">Relato Visual (Evidências)</label>
                                          <div className="flex items-center gap-4">
                                             <input
                                                type="file"
                                                accept="image/*"
                                                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                                onChange={(e) => {
                                                   if (e.target.files && e.target.files[0]) {
                                                      // Simulate upload by creating a fake URL
                                                      const fakeUrl = URL.createObjectURL(e.target.files[0]);
                                                      setEvidencePhoto(fakeUrl);
                                                   }
                                                }}
                                             />
                                             {evidencePhoto && (
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
                                                   <img src={evidencePhoto} alt="Evidência" className="w-full h-full object-cover" />
                                                </div>
                                             )}
                                          </div>
                                       </div>

                                       {/* Rejection Logic */}
                                       {auditStatus === 'Reprovado' && (
                                          <div className="animate-in slide-in-from-top-2 pt-4 border-t border-slate-100 space-y-4">
                                             <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-4">
                                                <div className="flex gap-4 items-center">
                                                   <AlertTriangle className="text-red-500" size={24} />
                                                   <div className="flex-1">
                                                      <p className="text-red-800 font-bold text-sm uppercase">Reprovação & Assistência</p>
                                                      <p className="text-red-600 text-xs">Descreva o motivo da reprovação para abrir o chamado.</p>
                                                   </div>
                                                </div>

                                                <div className="space-y-1">
                                                   <label className="block text-[10px] font-bold uppercase text-red-400">Descrição do Problema</label>
                                                   <textarea
                                                      className="w-full bg-white border border-red-200 text-red-900 text-sm font-medium rounded-lg p-3 outline-none focus:border-red-500 h-24 resize-none"
                                                      placeholder="Descreva detalhadamente o que precisa ser corrigido..."
                                                      value={problemDescription}
                                                      onChange={e => setProblemDescription(e.target.value)}
                                                   />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                   <div>
                                                      <label className="block text-[10px] font-bold uppercase text-red-400 mb-1">Data de Retorno</label>
                                                      <input
                                                         type="date"
                                                         required
                                                         className="w-full bg-white border border-red-200 text-red-900 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-red-500"
                                                         value={returnDate}
                                                         onChange={e => setReturnDate(e.target.value)}
                                                      />
                                                   </div>
                                                   <div className="flex items-end">
                                                      <button
                                                         type="button"
                                                         onClick={() => {
                                                            if (!problemDescription || !returnDate) {
                                                               alert('Preencha a descrição e a data de retorno para abrir o chamado.');
                                                               return;
                                                            }
                                                            handleFinishInspection(); // Reuse logic but specific for rejection
                                                         }}
                                                         className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs py-3 rounded-lg shadow-lg active:scale-95 transition-all"
                                                      >
                                                         Abrir Chamado
                                                      </button>
                                                   </div>
                                                </div>
                                             </div>
                                          </div>
                                       )}
                                    </div>

                                    {/* Final Action Button */}
                                    {auditStatus === 'Aprovado' && (
                                       <button
                                          type="button"
                                          onClick={handleFinishInspection}
                                          disabled={formData.currentStatus === 'Finalizada' || localStorage.getItem('chamadoAberto') === 'true'}
                                          className="w-full py-6 bg-slate-900 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                       >
                                          {formData.currentStatus === 'Finalizada' ? 'Auditoria Já Finalizada' : 'Finalizar Auditoria & Encerrar Obra'}
                                       </button>
                                    )}

                                    {/* Warning if Blocked */}
                                    {localStorage.getItem('chamadoAberto') === 'true' && auditStatus !== 'Reprovado' && (
                                       <div className="text-center p-4 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 font-bold text-xs uppercase tracking-wide">
                                          ⚠️ Existe um chamado de assistência em aberto. A obra não pode ser finalizada até que seja resolvido.
                                       </div>
                                    )}
                                 </div>
                              )}

                              {activeModalTab === 'financeiro' && (
                                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                    {/* Financial Logic & Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                       {/* Receita */}
                                       <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-col justify-between h-40 relative overflow-hidden group border border-slate-800">
                                          <div className="absolute -right-6 -top-6 text-slate-800 opacity-20 group-hover:opacity-30 transition-opacity transform rotate-12">
                                             <DollarSign size={140} />
                                          </div>
                                          <div><p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Receita Total</p></div>
                                          <div><span className="text-4xl font-black tracking-tight">R$ {revenue.toLocaleString()}</span></div>
                                       </div>

                                       {/* Custo Operacional */}
                                       <div className="p-6 bg-white text-slate-900 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-40 relative overflow-hidden">
                                          <div><p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Custo Operacional Total</p></div>
                                          <div className="flex items-end gap-2">
                                             <span className="text-4xl font-black tracking-tight text-red-600">R$ {totalCost.toLocaleString()}</span>
                                             <div className="mb-2 p-1 bg-red-100 rounded-full text-red-600"><TrendingDown size={16} /></div>
                                          </div>
                                       </div>

                                       {/* Resultado Líquido */}
                                       <div className="p-6 bg-emerald-600 text-white rounded-2xl shadow-xl flex flex-col justify-between h-40 relative overflow-hidden border border-emerald-500">
                                          <div className="absolute -right-6 -top-6 text-emerald-900 opacity-10 transform rotate-12">
                                             <Wallet size={140} />
                                          </div>
                                          <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-100 mb-2">Resultado Líquido</p></div>
                                          <div>
                                             <span className="text-4xl font-black tracking-tight">R$ {profit.toLocaleString()}</span>
                                             <p className="text-sm font-medium text-emerald-100 mt-1">{margin.toFixed(1)}% de Margem Bruta</p>
                                          </div>
                                       </div>
                                    </div>

                                    {/* RELATÓRIO DETALHADO (Merged) */}
                                    <div className="space-y-4 pt-4 border-t border-slate-800/50" id="printable-content">
                                       <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                                          <div className="flex justify-between items-center p-6 border-b border-slate-800">
                                             <h4 className="text-sm font-bold text-white uppercase tracking-widest">Relatório Detalhado de Gastos</h4>

                                             <div className="flex items-center gap-2 no-print">
                                                <button
                                                   type="button"
                                                   onClick={() => window.print()}
                                                   className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                   <Printer size={14} /> Imprimir
                                                </button>

                                                <button
                                                   type="button"
                                                   onClick={() => {
                                                      const newExpense = { id: `exp-${Date.now()}`, description: '', value: 0, date: new Date().toISOString().split('T')[0], category: 'Outros' };
                                                      const currentExpenses = (formData as any).expenses || [];
                                                      setFormData({ ...formData, expenses: [...currentExpenses, newExpense] } as any);
                                                   }}
                                                   className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                   <Plus size={14} /> Adicionar Despesa Extra
                                                </button>
                                             </div>
                                          </div>

                                          <div className="divide-y divide-slate-800/50">
                                             {/* Header */}
                                             <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-900/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <div className="col-span-6">Descrição</div>
                                                <div className="col-span-3 text-right">Valor</div>
                                                <div className="col-span-3 text-right">Categoria</div>
                                             </div>

                                             {/* 1. Purchase Orders (Pedidos) */}
                                             {(purchaseOrders || []).filter(po => po.projectId === editingProjectId).map(po => (
                                                <div key={po.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-900/40 transition-colors group border-l-2 border-transparent hover:border-blue-500">
                                                   <div className="col-span-6 flex items-center gap-3">
                                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${po.status === 'Cotação' ? 'bg-slate-800 text-slate-400' : 'bg-blue-500/10 text-blue-500'}`}>
                                                         <Boxes size={16} />
                                                      </div>
                                                      <div>
                                                         <span className={`font-bold text-sm block ${po.status === 'Cotação' ? 'text-slate-400' : 'text-slate-200'}`}>Pedido de Compra #{po.id.slice(-4)}</span>
                                                         <span className="text-slate-500 text-xs uppercase">{(po.items || []).length} Itens • {po.status}</span>
                                                      </div>
                                                   </div>
                                                   <div className="col-span-3 text-right text-slate-200 font-bold">
                                                      R$ {(po.items || []).reduce((acc, item) => acc + ((item.materialValue || 0) * item.quantity), 0).toLocaleString()}
                                                   </div>
                                                   <div className="col-span-3 text-right">
                                                      <span className={`px-2 py-1 rounded-md text-xs font-bold border ${po.status === 'Cotação' ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-blue-900/30 text-blue-400 border-blue-900/50'}`}>
                                                         Material
                                                      </span>
                                                   </div>
                                                </div>
                                             ))}

                                             {/* 2. Outsourced Services (Parceiros/Terceiros) */}
                                             {(formData.outsourcedServices || []).map(svc => (
                                                <div key={svc.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-900/40 transition-colors group border-l-2 border-transparent hover:border-purple-500">
                                                   <div className="col-span-6 flex items-center gap-3">
                                                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-all"><Users size={16} /></div>
                                                      <div>
                                                         <span className="text-slate-200 font-bold text-sm block">{svc.description || 'Serviço Terceirizado'}</span>
                                                         <span className="text-slate-500 text-xs">{svc.supplierName || 'Fornecedor não definido'} • {svc.category}</span>
                                                      </div>
                                                   </div>
                                                   <div className="col-span-3 text-right text-slate-200 font-bold">R$ {(svc.value || 0).toLocaleString()}</div>
                                                   <div className="col-span-3 text-right"><span className="px-2 py-1 rounded-md bg-purple-900/30 text-purple-400 text-xs font-bold border border-purple-900/50">Serviço</span></div>
                                                </div>
                                             ))}

                                             {/* 3. Extra Expenses & Daily (Diario/Extras) */}
                                             {((formData as any).expenses || []).map((exp: any, idx: number) => (
                                                <div key={exp.id} className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-slate-900/60 transition-colors group bg-slate-900/20 border-l-2 border-transparent hover:border-amber-500">
                                                   <div className="col-span-6 flex items-center gap-3">
                                                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all"><Receipt size={16} /></div>
                                                      <input
                                                         className="flex-1 bg-transparent text-sm text-slate-200 border-none outline-none font-medium placeholder:text-slate-600 focus:text-white"
                                                         placeholder="Descrição da despesa..."
                                                         value={exp.description}
                                                         onChange={e => {
                                                            const newExpenses = [...((formData as any).expenses || [])];
                                                            newExpenses[idx] = { ...newExpenses[idx], description: e.target.value };
                                                            setFormData({ ...formData, expenses: newExpenses } as any);
                                                         }}
                                                      />
                                                   </div>
                                                   <div className="col-span-3 text-right">
                                                      <input
                                                         type="number"
                                                         className="w-full bg-transparent text-right text-sm text-slate-200 font-bold border-none outline-none placeholder:text-slate-600 focus:text-white"
                                                         placeholder="0.00"
                                                         value={exp.value}
                                                         onChange={e => {
                                                            const val = e.target.value;
                                                            const newExpenses = [...((formData as any).expenses || [])];
                                                            // Allow string update temporarily to support decimal typing
                                                            newExpenses[idx] = { ...newExpenses[idx], value: val };
                                                            setFormData({ ...formData, expenses: newExpenses } as any);
                                                         }}
                                                         onBlur={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            const newExpenses = [...((formData as any).expenses || [])];
                                                            newExpenses[idx] = { ...newExpenses[idx], value: val };
                                                            setFormData({ ...formData, expenses: newExpenses } as any);
                                                         }}
                                                      />
                                                   </div>
                                                   <div className="col-span-3 flex justify-end items-center gap-2">
                                                      <span className="px-2 py-1 rounded-md bg-amber-900/30 text-amber-400 text-xs font-bold border border-amber-900/50">{exp.category || 'Extra'}</span>
                                                      <button
                                                         type="button"
                                                         onClick={() => {
                                                            const exps = [...((formData as any).expenses || [])];
                                                            exps.splice(idx, 1);
                                                            setFormData({ ...formData, expenses: exps } as any);
                                                         }}
                                                         className="text-slate-600 hover:text-red-400 p-1"
                                                      >
                                                         <Trash2 size={14} />
                                                      </button>
                                                   </div>
                                                </div>
                                             ))}
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </>
                        );
                     })()}
                  </form >
                  {/* Modal Footer */}
                  < div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3" >
                     <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
                     {
                        formData.currentStatus === 'Finalizada' ? (
                           <button type="button" onClick={() => window.print()} className="px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2">
                              <Printer size={16} /> Imprimir Espelho da OS
                           </button>
                        ) : (
                           <button type="button" onClick={handleSubmitOS} className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                              {editingProjectId ? 'Salvar Alterações' : 'Criar Ordem de Serviço'}
                           </button>
                        )
                     }
                  </div>
               </div>
            </div>
         )
         }

         {/* PRINTABLE REPORT ("Espelho da OS") - Rendered outside modal to ensure fixed positioning works */}
         {
            isModalOpen && (() => {
               // Re-calculate Financials for the Report
               const revenue = parseFloat(formData.value) || 0;
               const projectPOs = (purchaseOrders || []).filter(po => po.projectId === editingProjectId && (po.status === 'Comprado' || po.status === 'Entregue'));
               const poCost = projectPOs.reduce((total, po) => {
                  return total + (po.items || []).reduce((sum, item) => sum + ((item.materialValue || 0) * item.quantity), 0);
               }, 0);

               let dossieMdfCost = 0;
               let dossieHardwareCost = 0;
               let dossieApplianceCost = 0;

               if (formData.environmentsDetails) {
                  Object.values(formData.environmentsDetails).forEach((env: any) => {
                     dossieMdfCost += (env.mdfParts || []).reduce((sum: number, item: any) => sum + (item.value || 0), 0);
                     dossieHardwareCost += (env.hardwareItems || []).reduce((sum: number, item: any) => sum + (item.value || 0), 0);
                     dossieApplianceCost += (env.appliances || []).reduce((sum: number, item: any) => sum + (item.value || 0), 0);
                  });
               }

               const totalMaterialCost = poCost + dossieMdfCost + dossieHardwareCost + dossieApplianceCost;
               const outsourcedCost = (formData.outsourcedServices || []).reduce((acc, curr) => acc + (curr.value || 0), 0);
               const extraExpensesCost = (formData as any).expenses ? ((formData as any).expenses as any[]).reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) : 0;
               const totalCost = totalMaterialCost + outsourcedCost + extraExpensesCost;
               const profit = revenue - totalCost;
               const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

               return (
                  <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-black overflow-visible">
                     <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                        <div>
                           <h1 className="text-2xl font-black uppercase tracking-tighter">Ordem de Serviço</h1>
                           <p className="text-sm font-bold uppercase mt-1">Status: {formData.currentStatus}</p>
                        </div>
                        <div className="text-right">
                           <h2 className="text-xl font-bold">{formData.workName}</h2>
                           <p className="text-sm">Cliente: {clients.find(c => c.id === formData.clientId)?.name}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-8 mb-8">
                        <div>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Data Registro</p>
                           <p className="font-bold text-lg">{formData.contractDate ? new Date(formData.contractDate).toLocaleDateString('pt-BR') : '-'}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Data Prometida</p>
                           <p className="font-bold text-lg">{formData.promisedDate ? new Date(formData.promisedDate).toLocaleDateString('pt-BR') : '-'}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Valor Contrato</p>
                           <p className="font-bold text-lg">R$ {parseFloat(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                     </div>

                     {/* Environments */}
                     <div className="mb-8">
                        <h3 className="text-sm font-black uppercase text-gray-500 border-b border-gray-300 pb-2 mb-4">Ambientes & Especificações</h3>
                        {formData.selectedEnvironments.map(envName => (
                           <div key={envName} className="mb-6 break-inside-avoid">
                              <h4 className="font-bold text-lg mb-2">{envName}</h4>
                              <div className="text-xs space-y-1">
                                 <p><strong>MDF:</strong> {formData.environmentsDetails[envName].mdfParts.map((p: any) => `${p.brandColor}`).join(', ') || 'N/A'}</p>
                                 <p><strong>Ferragens:</strong> {formData.environmentsDetails[envName].hardwareItems.length} itens listados</p>
                              </div>
                           </div>
                        ))}
                     </div>

                     {/* Financial Summary */}
                     <div className="mb-12 break-inside-avoid">
                        <h3 className="text-sm font-black uppercase text-gray-500 border-b border-gray-300 pb-2 mb-4">Resumo Financeiro</h3>
                        <table className="w-full text-sm">
                           <thead>
                              <tr className="border-b border-gray-200">
                                 <th className="text-left py-2">Descrição</th>
                                 <th className="text-right py-2">Valor</th>
                              </tr>
                           </thead>
                           <tbody>
                              <tr className="border-b border-gray-100">
                                 <td className="py-2">Materiais (Compras)</td>
                                 <td className="text-right py-2 font-bold">R$ {poCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr className="border-b border-gray-100">
                                 <td className="py-2">Serviços Terceirizados</td>
                                 <td className="text-right py-2 font-bold">R$ {outsourcedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr className="border-b border-gray-100">
                                 <td className="py-2">Despesas Extras</td>
                                 <td className="text-right py-2 font-bold">R$ {extraExpensesCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr className="bg-gray-100">
                                 <td className="py-3 font-black uppercase">Custo Total</td>
                                 <td className="text-right py-3 font-black">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr>
                                 <td className="py-3 font-black uppercase">Lucro Estimado</td>
                                 <td className="text-right py-3 font-black text-emerald-700">R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({margin.toFixed(1)}%)</td>
                              </tr>
                           </tbody>
                        </table>
                     </div>

                     {/* Signatures */}
                     <div className="mt-20 grid grid-cols-2 gap-20 break-inside-avoid">
                        <div className="border-t border-black pt-2 text-center text-xs uppercase font-bold">
                           {company.name}
                        </div>
                        <div className="border-t border-black pt-2 text-center text-xs uppercase font-bold">
                           {clients.find(c => c.id === formData.clientId)?.name}
                        </div>
                     </div>
                  </div>
               );
            })()
         }

         {/* AI QUOTATION MODAL */}
         <AIQuotationModal
            isOpen={isAIModalOpen}
            onClose={() => setIsAIModalOpen(false)}
            onAddItems={handleAddAIItems}
         />

         {/* CONTRACT MODAL */}
         {
            isContractModalOpen && (
               <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in scale-95">
                     <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="text-amber-600" /> Contrato Gerado (IA)</h3>
                        <div className="flex gap-2">
                           <button onClick={() => { navigator.clipboard.writeText(contractText); alert('Copiado!'); }} className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Copiar Texto</button>
                           <button onClick={() => setIsContractModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
                        </div>
                     </div>
                     <div className="flex-1 p-0 overflow-hidden relative">
                        <textarea
                           className="w-full h-full p-8 resize-none outline-none font-mono text-sm leading-relaxed text-slate-700"
                           value={contractText}
                           onChange={e => setContractText(e.target.value)}
                        ></textarea>
                     </div>
                  </div>
               </div>
            )
         }

      </div >
   );
};

export default ObrasView;
