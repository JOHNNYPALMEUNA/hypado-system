
export type ProductionStatus = 'Venda' | 'Projeto' | 'Corte' | 'Produção' | 'Entrega' | 'Instalação' | 'Vistoria' | 'Finalizada';
export type PurchaseStatus = 'Cotação' | 'Comprado' | 'Entregue';
export type SupplierType = 'Material' | 'Serviço (Corte/Fitação)' | 'Montagem (Terceirizado)';
export type OutsourcedStatus = 'Pendente' | 'Pedido' | 'Pronto';
export type TeamRole = 'Montador' | 'Ajudante' | 'Marceneiro' | 'Freteiro' | 'Projetista';

export interface Company {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  logo?: string;
}

export interface Installer {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  role: TeamRole;
  status: 'Ativo' | 'Inativo' | 'Em Obra';
  specialty: string;
  observations: string;
  installationsCount: number;
  averageRating: number;
  totalBonus: number;
  defaultDailyRate?: number;
  avatar?: string;
}

export interface ProjectDiaryEntry {
  id: string;
  projectId: string;
  personId: string;
  date: string;
  value: number;
  description: string;
  role: TeamRole;
}

export interface MdfPart {
  id: string;
  partName: string;
  brandColor: string;
  thickness: string;
  value?: number;
}

export interface Appliance {
  id: string;
  item: string;
  brandModel: string;
  voltage: '110v' | '220v' | 'Bivolt' | 'N/A';
  needsVentilation: boolean;
  manualConfirmed: boolean;
  value?: number;
}

export interface HardwareItem {
  id: string;
  category: string;
  brand: string;
  model: string;
  location?: string;
  description?: string;
  value?: number;
}

export interface OutsourcedService {
  id: string;
  category: string;
  description: string;
  status: OutsourcedStatus;
  location?: string;
  supplierId?: string;
  supplierName?: string;
  value?: number;
  orderDate?: string;
}

export interface ModuleVariant {
  label: string;
  priceCheck?: boolean; // If true, adds cost
  type: 'boolean' | 'select';
  options?: string[];
}

export interface StandardModule {
  id: string;
  category: 'Cozinha' | 'Quarto' | 'Sala' | 'Banheiro' | 'Area Serviço' | 'Outros';
  name: string;
  description: string; // Base description
  defaultDepth?: number;
  defaultHeight?: number;
  variants?: ModuleVariant[];
}

export interface SelectedModule {
  id: string;
  originalId: string;
  standardModuleId?: string;
  name: string;
  description: string;
  width: number;
  height: number;
  depth: number;
  quantity: number;
  selectedVariants: Record<string, any>; // e.g., { "Espelho": true, "Espessura": "18mm" }
  value?: number;
  promobId?: string; // ID from Promob software for tracking
  status?: 'Pendente' | 'Produção' | 'Concluído' | 'Entregue' | 'Instalado';
}

export interface MemorialDescritivo {
  mdfParts: MdfPart[];
  fitacao: string;
  fundo: string;
  hardwareItems: HardwareItem[];
  appliances: Appliance[];
  // New Fields for Contract
  finishExternal?: string;
  finishInternal?: string;
  observation?: string; // New field for specific room identification (e.g. "Quarto Victor")
  modules?: SelectedModule[];
  partsCount?: number;
}

export interface EnvironmentWithDetails {
  name: string;
  type: 'Cozinha' | 'Quarto' | 'Sala' | 'Banheiro' | 'Geral' | 'Lavanderia' | 'Gourmet';
  memorial: MemorialDescritivo;
  value: number;
  assignedInstallerId?: string;
  serviceContractValue?: number;
  servicePercentage?: number;
  manualValueOverride?: boolean;
  isMdoAuthorized?: boolean;
  authorizedMdoValue?: number;
  // Installer Fairness
  difficultyFactor?: number; // 0.8 (Easy) to 1.2 (Hard)
  commissionValue?: number; // Final agreed value
  mdoStatus?: 'Pendente' | 'Enviado' | 'Aceito' | 'Recusado'; // Negotiation Status
}

export interface Expense {
  id: string;
  description: string;
  value: number;
  date: string;
  category: string;
}

export interface Client {
  id: string;
  name: string;
  cpf?: string; // Added field
  email: string;
  phone: string;
  address: string;
  quadra?: string;
  lote?: string;
  description?: string;
  projectsCount: number;
  averageRating: number;
  lastVisit: string;
  isBlocked?: boolean;
  status?: string; // 'Ativo', 'Inativo'
  totalSpent?: number;
}

export interface Environment {
  id: string;
  name: string;
  memorial?: MemorialDescritivo;
}

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  workName: string;
  environments: string[];
  environmentsDetails: EnvironmentWithDetails[];
  contractDate: string;
  promisedDate: string;
  currentStatus: ProductionStatus;
  history: { status: ProductionStatus; timestamp: string }[];
  value: number;
  expenses: Expense[];
  team: string;
  installerId?: string;
  workAddress: string;
  materialsDelivered?: boolean;
  productionCentral?: string;
  outsourcedServices: OutsourcedService[];
  qualityReport?: QualityReport;
  cloudFolderLink?: string; // Link to OneDrive/Cloud folder
  attachments?: { name: string; url: string; type: 'Project' | 'CutList' | 'Other' }[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  unit?: string;
  description?: string;
}

export type Material = Product;

export interface Supplier {
  id: string;
  name: string;
  type: SupplierType;
  contact: string;
  category?: string;
}

export interface QuotationItem {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  materialValue?: number;
  serviceValue?: number;
}

export interface Quotation {
  id: string;
  projectId: string;
  workName: string;
  supplierId: string;
  status: PurchaseStatus;
  items: QuotationItem[];
  date: string;
}

export interface ChecklistItem {
  id: string;
  axis: string;
  label: string;
  passed: boolean | null;
  photoUrl?: string; // New field for evidence
  observation?: string; // New field for notes
}

export interface QualityReport {
  id: string;
  projectId: string;
  installerId: string;
  date: string; // Used as Inspection Date
  score: number;
  bonusAmount: number;
  inspectorName: string;
  items: ChecklistItem[];
  status: 'Pendente' | 'Aprovado' | 'Reprovado';
  evidencePhotoUrl?: string;
  problemDescription?: string;
  technicianId?: string;
  returnDate?: string;
}

export type AssistanceStatus = 'Aberto' | 'Agendado' | 'Retorno Pendente' | 'Finalizado';

export interface TechnicalAssistance {
  id: string;
  clientId: string;
  clientName: string;
  projectId: string; // RefData
  workName: string;

  // Cronograma
  requestDate: string;
  scheduledDate?: string;
  scheduledTime?: string;

  // Diagnóstico
  reportedProblem: string;
  photoUrl?: string;

  // Visita Técnica
  technicianId?: string;
  visitResult?: string;
  pendingIssues?: string;

  // Pós-Visita
  returnDate?: string;
  finalObservations?: string;

  status: AssistanceStatus;
}

export interface Task {
  id: string;
  title: string;
  projectId?: string;
  workName?: string;
  done: boolean;
  dueDate?: string;
  priority: 'Baixa' | 'Média' | 'Alta';
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO String
  end: string;   // ISO String
  type: 'Reunião' | 'Visita' | 'Instalação' | 'Outro';
  projectId?: string;
  description?: string;
  location?: string;
}
