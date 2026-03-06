import React, { useState, useMemo } from 'react';
import { Project, Client, Environment, Company, MemorialDescritivo, MdfPart, ProductionStatus, Appliance, HardwareItem, Installer, OutsourcedService, Material, Quotation, ChecklistItem, TechnicalAssistance, QualityReport, SelectedModule, DailyLog } from '../types';
import { AXES, INITIAL_CHECKLIST, STANDARD_MODULES } from '../mockData';
import { Plus, Trash2, Save, FileText, ChevronDown, ChevronUp, Search, X, FolderOpen, Link2, Calendar, DollarSign, PenTool, Layout, CheckCircle2, AlertTriangle, Package, Share2, Printer, ArrowRight, Layers, Ruler, Sparkles, UserCheck, Settings2, Power, Camera, Edit3, TrendingDown, Wallet, Boxes, Receipt, Users, LayoutGrid, List, Building2, Ban, MapPin, Factory as FactoryIcon, Truck, Clock } from 'lucide-react';
import { generateContract, parseContractData } from '../geminiService';
import { extractTextFromPDF } from '../pdfService';
import AIQuotationModal from './AIQuotationModal';
import ProjectCard from './ProjectCard';
import ProjectModal from './ProjectModal/ProjectModal';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils';

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
   materialCategories: string[];
   purchaseOrders: Quotation[];
   dailyLogs: DailyLog[];
   addAssistance: (assistance: TechnicalAssistance) => Promise<void>;
   assistances: TechnicalAssistance[];
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
   company, installers, materialCategories, purchaseOrders, dailyLogs, addAssistance, assistances
}) => {
   const { addProject, updateProject, deleteProject, addClient, updateClient, deleteClient, materials, userRole } = useData();
   // ... existing code ...


   const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
   const [filterStatus, setFilterStatus] = useState<ProductionStatus | 'Todas'>('Todas');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
   const [activeEnvForm, setActiveEnvForm] = useState<string | null>(null);
   const [activeModalTab, setActiveModalTab] = useState<'geral' | 'memorial' | 'equipe' | 'qualidade' | 'cpc'>('geral');
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
      // Address Fields
      addressCep: '',
      addressCity: '',
      addressStreet: '',
      addressNumber: '',
      addressNeighborhood: '',
      addressComplement: '',
      addressQuadra: '',
      addressLote: '',
      workAddress: '', // Legacy/Calculated
      currentStatus: 'Projeto' as ProductionStatus,
      checklist: [] as ChecklistItem[],
      cloudFolderLink: '', // New field
      projectPdfUrl: '' // PDF Upload
   });

   // CEP Usage
   const handleFetchAddress = async () => {
      const cep = formData.addressCep.replace(/\D/g, '');
      if (cep.length !== 8) {
         alert('CEP inválido');
         return;
      }
      try {
         const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
         const data = await res.json();
         if (data.erro) {
            alert('CEP não encontrado');
            return;
         }
         setFormData(prev => ({
            ...prev,
            addressStreet: data.logradouro,
            addressNeighborhood: data.bairro,
            addressCity: `${data.localidade}/${data.uf}`,
            addressComplement: data.complemento || prev.addressComplement,
            workAddress: `${data.logradouro}, ${prev.addressNumber} - ${data.bairro}, ${data.localidade}/${data.uf}` // Update legacy field too
         }));
      } catch (error) {
         alert('Erro ao buscar CEP');
      }
   };

   const handleCopyClientAddress = () => {
      const client = clients.find(c => c.id === formData.clientId);
      if (client) {
         setFormData(prev => ({
            ...prev,
            workAddress: client.address,
            addressCep: '', // We don't parse client address, just copy full string to legacy for now, or maybe parse if simple?
            // Actually, let's just copy the string to workAddress
            // But if the user wants structured data, they should type it.
            // Let's assume client.address is unstructured string.
         }));
         alert('Endereço copiado para o campo geral. Para usar o endereço estruturado (Google Maps preciso), preencha os campos abaixo.');
      }
   };

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
                     totalSpent: 0,
                     projectsCount: 0,
                     averageRating: 5,
                     lastVisit: new Date().toISOString()
                  };
                  addClient(newClient);
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
      if (filterStatus === 'Todas') {
         // Exclude Finalizada and Cancelada from "Todas" view to clean up the UI
         list = list.filter(p => p.currentStatus !== 'Finalizada' && p.currentStatus !== 'Cancelada');
      } else {
         list = list.filter(p => p.currentStatus === filterStatus);
      }
      return list;
   }, [projects, filterStatus]);

   const openCreateModal = () => {
      setEditingProjectId(null); // FIX: Reset editing state to ensure CREATE mode
      setFormData({
         clientId: '', workName: '', selectedEnvironments: [], environmentsDetails: {}, environmentsValues: {},
         outsourcedServices: [], value: '', contractDate: new Date().toISOString().split('T')[0],
         promisedDate: '', installerId: '', workAddress: '', currentStatus: 'Projeto', expenses: [],
         checklist: INITIAL_CHECKLIST.items.map(i => ({ ...i, passed: null })),
         projectPdfUrl: ''
      });
      setIsModalOpen(true);
      setActiveModalTab('geral');
   };

   const openEditModal = (os: Project) => {
      setEditingProjectId(os.id);
      const envDetails: Record<string, MemorialDescritivo> = {};
      const envValues: Record<string, string> = {};

      // Initialize with existing details
      (os.environmentsDetails || []).forEach(env => {
         if (env && env.name) {
            envDetails[env.name] = env.memorial || INITIAL_MEMORIAL();
            envValues[env.name] = (env.value || 0).toString();
         }
      });

      // Ensure all selected environments have at least an initial memorial
      (os.environments || []).forEach(envName => {
         if (!envDetails[envName]) {
            envDetails[envName] = INITIAL_MEMORIAL();
            envValues[envName] = '0';
         }
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
         // Address Fields
         addressCep: os.addressCep || '',
         addressCity: os.addressCity || '',
         addressStreet: os.addressStreet || '',
         addressNumber: os.addressNumber || '',
         addressNeighborhood: os.addressNeighborhood || '',
         addressComplement: os.addressComplement || '',
         addressQuadra: os.addressQuadra || '',
         addressLote: os.addressLote || '',

         currentStatus: os.currentStatus,

         expenses: os.expenses || [], // FIX: Loading expenses
         cloudFolderLink: os.cloudFolderLink || '',
         attachments: os.attachments || [], // Load attachments
         projectPdfUrl: os.projectPdfUrl || ''
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

   // --- PDF UPLOAD HANDLER ---
   const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Limit to 2MB (Supabase default request size is often 5-6MB, base64 increases size)
      if (file.size > 2 * 1024 * 1024) {
         alert('O arquivo é muito grande! Por favor, envie um PDF com menos de 2MB ou use o link de pasta na nuvem.');
         return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
         const base64 = reader.result as string;
         setFormData(prev => ({ ...prev, projectPdfUrl: base64 }));
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
   const generateWhatsappOrder = (envName: string) => {
      const env = formData.environmentsDetails[envName];
      if (!env) return;

      const client = clients.find(c => c.id === formData.clientId);

      let text = `*PEDIDO DE PRODUÇÃO/MONTAGEM - HYPADO*\n\n`;
      text += `ðŸ¢ *Obra:* ${formData.workName}\n`;
      text += `👤 *Cliente:* ${client?.name || 'Não informado'}\n`;
      text += `ðŸ“ *Ambiente:* ${envName}\n`;
      if (formData.promisedDate) text += `📅 *Entrega:* ${formatDate(formData.promisedDate)}\n`;
      text += `\n*MEMORIAL DESCRITIVO:* \n`;
      text += `• Fita de Borda: ${env.fitacao}\n`;
      text += `• Fundo: ${env.fundo}\n`;
      if (env.observation) text += `\nðŸ“ *Obs:* ${env.observation}\n`;

      text += `\n*MÓDULOS:* \n`;
      (env.modules || []).forEach((m: any) => {
         text += `- ${m.name} (${m.quantity}x) ${m.promobId ? '[ID: ' + m.promobId + ']' : ''}\n`;
      });

      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
   };

   const handleFinishInspection = async () => {
      if (!editingProjectId) return;

      const project = projects.find(p => p.id === editingProjectId);
      if (!project) return;

      if (auditStatus === 'Pendente') {
         alert('Selecione o STATUS DA QUALIDADE (Aprovado ou Reprovado) antes de continuar.');
         return;
      }

      const report: QualityReport = {
         id: `qr-${Date.now()}`,
         projectId: editingProjectId,
         installerId: project.installerId || '',
         date: inspectionDate,
         score: 0,
         bonusAmount: 0,
         inspectorName: inspectorName || 'Admin',
         items: formData.checklist,
         status: auditStatus,
         evidencePhotoUrl: evidencePhoto,
         problemDescription: problemDescription,
         technicianId: project.installerId || '',
         returnDate: returnDate
      };

      if (auditStatus === 'Reprovado') {
         const newTicket: TechnicalAssistance = {
            id: `ta-${Date.now()}`,
            clientId: project.clientId,
            clientName: project.clientName,
            projectId: project.id,
            workName: project.workName,
            requestDate: new Date().toISOString().split('T')[0],
            status: 'Aberto',
            reportedProblem: `REPROVAÇÃO ${inspectorName ? 'POR ' + inspectorName : ''}: ${problemDescription}\n\nITENS REPROVADOS:\n` +
               formData.checklist.filter((i: any) => i.passed === false).map((i: any) => `- ${i.label}`).join('\n'),
            technicianId: project.installerId || '',
            returnDate: returnDate
         };

         await addAssistance(newTicket);
         alert(`AUDITORIA REPROVADA!\n\nChamado de Assistência Técnica aberto com sucesso.\n\nA obra permanece em Vistoria.`);
      }

      if (auditStatus === 'Aprovado') {
         updateProject({
            ...project,
            currentStatus: 'Finalizada',
            qualityReport: report,
            history: [...project.history, { status: 'Finalizada', timestamp: new Date().toISOString() }]
         } as Project);
         setIsModalOpen(false);
         alert('Obra finalizada com sucesso!');
      }
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
         // Address Fields
         addressCep: formData.addressCep,
         addressCity: formData.addressCity,
         addressStreet: formData.addressStreet,
         addressNumber: formData.addressNumber,
         addressNeighborhood: formData.addressNeighborhood,
         addressComplement: formData.addressComplement,
         addressQuadra: formData.addressQuadra,
         addressLote: formData.addressLote,

         currentStatus: formData.currentStatus,
         cloudFolderLink: (formData as any).cloudFolderLink,
         attachments: (formData as any).attachments || [],
         projectPdfUrl: (formData as any).projectPdfUrl,
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
         const existingProject = projects.find(p => p.id === editingProjectId);
         const newHistory = existingProject && existingProject.currentStatus !== projectData.currentStatus
            ? [...existingProject.history, { status: projectData.currentStatus, timestamp: new Date().toISOString() }]
            : (existingProject?.history || []);

         updateProject({ ...projectData, id: editingProjectId, history: newHistory } as Project);
      } else {
         const newOS: Project = {
            id: `os-${Date.now()}`,
            ...projectData as any,
            history: [{ status: projectData.currentStatus, timestamp: new Date().toISOString() }],
            expenses: [],
            materialsDelivered: false
         };
         addProject(newOS);
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
         deleteProject(editingProjectId);
         setIsModalOpen(false);
         setEditingProjectId(null);
      }
   };

   const handleCancel = () => {
      if (!editingProjectId) return;
      if (confirm('Deseja realmente cancelar esta obra? Ela ficará na aba "Canceladas".')) {
         const project = projects.find(p => p.id === editingProjectId);
         if (project) {
            updateProject({ ...project, currentStatus: 'Cancelada' });
         }
         setIsModalOpen(false);
         setEditingProjectId(null);
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
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`} aria-label="Visualização em Grade"><LayoutGrid size={18} /></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`} title="Visualização em Lista"><List size={18} /></button>
               </div>

               <button
                  onClick={openCreateModal}
                  className="bg-card text-primary border border-primary/20 hover:border-primary px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-muted/50 transition-all shadow-sm"
               >
                  <Plus size={18} /> Nova OS (Manual)
               </button>

               <label className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm cursor-pointer">
                  <Sparkles size={18} /> Importar Contrato (IA)
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
         <div className="flex bg-muted p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterStatus('Todas')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap ${filterStatus === 'Todas' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-muted-foreground'}`}>Todas</button>
            {['Venda', 'Projeto', 'Corte', 'Produção', 'Entrega', 'Instalação', 'Vistoria', 'Finalizada', 'Cancelada'].map(status => (
               <button
                  key={status}
                  onClick={() => setFilterStatus(status as ProductionStatus)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap ${filterStatus === status ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-muted-foreground'}`}
               >
                  {status}
               </button>
            ))}
         </div>

         {/* PROJECTS GRID/LIST */}
         {
            viewMode === 'grid' ? (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProjects.map(os => (
                     <ProjectCard
                        key={os.id}
                        project={os}
                        viewMode="grid"
                        onEdit={openEditModal}
                     />
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
                           {userRole === 'owner' && <th className="px-6 py-3 text-right">Valor</th>}
                           <th className="px-6 py-3 w-10"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border">
                        {filteredProjects.map(os => (
                           <ProjectCard
                              key={os.id}
                              project={os}
                              viewMode="list"
                              onEdit={openEditModal}
                           />
                        ))}
                     </tbody>
                  </table>
               </div>
            )
         }


         {/* MODULAR PROJECT MODAL */}
         <ProjectModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSubmitOS}
            editingProject={editingProjectId ? projects.find(p => p.id === editingProjectId) || null : null}
            activeModalTab={activeModalTab}
            setActiveModalTab={setActiveModalTab}
            formData={formData}
            setFormData={setFormData}
            clients={clients}
            installers={installers}
            materials={materials}
            outsourcedCategories={outsourcedCategories}
            materialCategories={materialCategories}
            handlePdfUpload={handlePdfUpload}
            handleDelete={handleDelete}
            handleCancel={handleCancel}
            handleCopyClientAddress={handleCopyClientAddress}
            handleFetchAddress={handleFetchAddress}
            generateWhatsappOrder={generateWhatsappOrder}
            toggleEnvironment={toggleEnvironment}
            updateMemorial={updateMemorial}
            handleAddMdf={handleAddMdf}
            handleAddHardware={handleAddHardware}
            handleAddAppliance={handleAddAppliance}
            auditStatus={auditStatus}
            setAuditStatus={setAuditStatus}
            report={{
               inspectorName,
               inspectionDate,
               problemDescription,
               returnDate,
               evidencePhoto,
               checklist: formData.checklist
            }}
            setReport={(newReport: any) => {
               if (newReport.inspectorName !== undefined) setInspectorName(newReport.inspectorName);
               if (newReport.inspectionDate !== undefined) setInspectionDate(newReport.inspectionDate);
               if (newReport.problemDescription !== undefined) setProblemDescription(newReport.problemDescription);
               if (newReport.returnDate !== undefined) setReturnDate(newReport.returnDate);
               if (newReport.evidencePhoto !== undefined) setEvidencePhoto(newReport.evidencePhoto);
               if (newReport.checklist !== undefined) setFormData(prev => ({ ...prev, checklist: newReport.checklist }));
            }}
            handleSubmitAudit={handleFinishInspection}
         />







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
                  <div className="hidden print:block fixed inset-0 bg-card z-[9999] p-8 text-black overflow-visible">
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
                           <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data Registro</p>
                           <p className="font-bold text-lg">{formData.contractDate ? new Date(formData.contractDate).toLocaleDateString('pt-BR') : '-'}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data Prometida</p>
                           <p className="font-bold text-lg">{formData.promisedDate ? new Date(formData.promisedDate).toLocaleDateString('pt-BR') : '-'}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor Contrato</p>
                           <p className="font-bold text-lg">R$ {parseFloat(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                     </div>

                     {/* Environments */}
                     <div className="mb-8">
                        <h3 className="text-sm font-black uppercase text-muted-foreground border-b border-border pb-2 mb-4">Ambientes & Especificações</h3>
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
                        <h3 className="text-sm font-black uppercase text-muted-foreground border-b border-border pb-2 mb-4">Resumo Financeiro</h3>
                        <table className="w-full text-sm">
                           <thead>
                              <tr className="border-b border-border">
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
                              <tr className="bg-muted">
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
                  <div className="bg-card w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in scale-95">
                     <div className="p-4 border-b border-border flex justify-between items-center bg-muted/50">
                        <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="text-amber-600" /> Contrato Gerado (IA)</h3>
                        <div className="flex gap-2">
                           <button onClick={() => { navigator.clipboard.writeText(contractText); alert('Copiado!'); }} className="px-3 py-1.5 text-xs font-bold bg-card border border-border rounded-lg hover:bg-muted/50" title="Copiar Texto">Copiar Texto</button>
                           <button onClick={() => setIsContractModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full" title="Fechar"><X size={20} /></button>
                        </div>
                     </div>
                     <div className="flex-1 p-0 overflow-hidden relative">
                        <textarea
                           className="w-full h-full p-8 resize-none outline-none font-mono text-sm leading-relaxed text-foreground"
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
