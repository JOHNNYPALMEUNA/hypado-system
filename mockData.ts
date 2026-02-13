
import { Client, Project, QualityReport, Environment, MemorialDescritivo, Installer } from './types';

export const MOCK_ENVIRONMENTS: Environment[] = [
  { id: 'e1', name: 'Cozinha' },
  { id: 'e2', name: 'Suíte Master' },
  { id: 'e3', name: 'Closet' },
  { id: 'e4', name: 'Home Office' },
  { id: 'e5', name: 'Lavabo' },
  { id: 'e6', name: 'Área Gourmet' },
  { id: 'e7', name: 'Sala de Estar' },
  { id: 'e8', name: 'Área de Serviço' },
  { id: 'e9', name: 'Banheiro Social' },
];

import { StandardModule } from './types';

export const STANDARD_MODULES: StandardModule[] = [
  // COZINHA
  {
    id: 'coz-inf-2p', category: 'Cozinha', name: 'Balcão Inferior 2 Portas',
    description: 'Armário inferior com 2 portas de giro e prateleira interna.',
    variants: [
      { label: 'Espessura Frente', type: 'select', options: ['15mm', '18mm'] },
      { label: 'Puxador', type: 'select', options: ['Gola', 'Cava', 'Externo', 'Fecho Toque'] }
    ]
  },
  {
    id: 'coz-inf-mq', category: 'Cozinha', name: 'Balcão Pia (Giro + Gavetas)',
    description: 'Armário inferior para pia com portas de giro e gaveteiro lateral.',
    variants: [
      { label: 'Lado Gaveteiro', type: 'select', options: ['Esquerdo', 'Direito'] },
      { label: 'Qtd Gavetas', type: 'select', options: ['2 Gavetões', '4 Gavetas', '1 Gaveta + 2 Gavetões'] }
    ]
  },
  {
    id: 'coz-sup-2p', category: 'Cozinha', name: 'Armário Superior 2 Portas',
    description: 'Armário aéreo com 2 portas de giro.',
    variants: [{ label: 'Porta Vidro/Espelho', type: 'boolean' }]
  },
  {
    id: 'coz-sup-basc', category: 'Cozinha', name: 'Armário Superior Basculante',
    description: 'Armário aéreo com porta basculante.',
    variants: [{ label: 'Porta Vidro/Espelho', type: 'boolean' }]
  },
  {
    id: 'coz-torre', category: 'Cozinha', name: 'Torre Quente',
    description: 'Módulo torre para Forno e Microondas.',
    variants: [{ label: 'Nichos Abertos', type: 'boolean' }]
  },

  // QUARTO / CLOSET
  {
    id: 'qt-roup-giro', category: 'Quarto', name: 'Roupeiro Portas de Giro',
    description: 'Armário roupeiro com portas de abrir.',
    variants: [
      { label: 'Qtd Portas', type: 'select', options: ['1', '2', '3', '4', '5', '6'] },
      { label: 'Portas de Espelho', type: 'select', options: ['Nenhuma', '1 Porta', '2 Portas', 'Todas'] },
      { label: 'Espessura Frente', type: 'select', options: ['15mm', '18mm'] }
    ]
  },
  {
    id: 'qt-roup-corr', category: 'Quarto', name: 'Roupeiro Portas de Correr',
    description: 'Armário roupeiro com portas deslizantes e sistema de amortecimento.',
    variants: [
      { label: 'Qtd Portas', type: 'select', options: ['2', '3', '4'] },
      { label: 'Portas de Espelho', type: 'select', options: ['Nenhuma', '1 Porta', '2 Portas', 'Todas'] }
    ]
  },
  {
    id: 'qt-cabeceira', category: 'Quarto', name: 'Cabeceira Painel',
    description: 'Painel de cabeceira liso ou ripado.',
    variants: [{ label: 'Estilo', type: 'select', options: ['Liso', 'Ripado', 'Estofado'] }]
  },

  // SALA
  {
    id: 'sala-home', category: 'Sala', name: 'Home Theater Completo',
    description: 'Painel para TV com Rack inferior.',
    variants: [
      { label: 'Detalhe Painel', type: 'select', options: ['Liso', 'Ripado', 'Mármore'] },
      { label: 'Portas Rack', type: 'select', options: ['Basculante', 'Gavetas', 'Giro'] }
    ]
  },

  // BANHEIRO
  {
    id: 'ban-gab', category: 'Banheiro', name: 'Gabinete Suspenso',
    description: 'Armário suspenso para lavatório.',
    variants: [
      { label: 'Modelo', type: 'select', options: ['1 Gavetão', '2 Portas', '1 Porta + 2 Gavetas'] }
    ]
  },
  {
    id: 'ban-sup', category: 'Banheiro', name: 'Armário Superior Espelho',
    description: 'Armário superior com frente de espelho.',
    variants: [
      { label: 'Tipo Abertura', type: 'select', options: ['Giro', 'Correr'] }
    ]
  }
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'Ana Silva',
    email: 'ana.silva@email.com',
    phone: '(11) 98888-7777',
    address: 'Av. Paulista, 1000 - São Paulo, SP',
    projectsCount: 3,
    averageRating: 9.5,
    lastVisit: '2024-03-15'
  }
];

const DEFAULT_MEMORIAL: MemorialDescritivo = {
  mdfParts: [
    { id: '1', partName: 'Caixaria', brandColor: 'Branco Standard', thickness: '15mm' },
    { id: '2', partName: 'Frentes', brandColor: 'Guararapes Padrão Marcenaria', thickness: '18mm' }
  ],
  fitacao: 'PVC 0.45mm',
  fundo: '6mm Branco Encaixado',
  hardwareItems: [
    { id: 'h1', category: 'Dobradiça', brand: 'Blum', model: 'Clip Top com Amortecimento' },
    { id: 'h2', category: 'Corrediça', brand: 'Blum', model: 'Tandembox Antaro Cinza' },
    { id: 'h3', category: 'Puxador', brand: 'Alumitech', model: 'Perfil Gola Bronze' }
  ],
  appliances: [
    { id: 'ap1', item: 'Forno Elétrico', brandModel: 'Brastemp Gourmand', voltage: '220v', needsVentilation: true, manualConfirmed: true }
  ],
  partsCount: 0
};

// Fix: Added missing 'outsourcedServices' property to comply with Project interface
export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    clientId: 'c1',
    clientName: 'Ana Silva',
    workName: 'Apto 1202 - Ed. Mirante',
    environments: ['Cozinha', 'Área Gourmet'],
    environmentsDetails: [
      { name: 'Cozinha', type: 'Cozinha', memorial: DEFAULT_MEMORIAL, value: 25000 },
      { name: 'Área Gourmet', type: 'Gourmet', memorial: DEFAULT_MEMORIAL, value: 20000 }
    ],
    cloudFolderLink: '', // Added for type compatibility
    contractDate: '2024-01-10',
    promisedDate: '2024-04-10',
    currentStatus: 'Projeto',
    value: 45000,
    team: 'Equipe Alfa',
    workAddress: 'Av. Paulista, 1000 - São Paulo, SP',
    expenses: [],
    history: [
      { status: 'Projeto', timestamp: '2024-01-12T10:00:00Z' }
    ],
    materialsDelivered: false, // Inicia bloqueado para o PCP testar a trava
    outsourcedServices: [],
  }
];

export const AXES = ['Estrutura', 'Funcionamento', 'Portas de Correr', 'Acabamento', 'Limpeza'] as const;

export const INITIAL_CHECKLIST: Omit<QualityReport, 'id' | 'projectId' | 'date' | 'score' | 'bonusAmount' | 'installerId'> = {
  inspectorName: '',
  status: 'Pendente',
  evidencePhotoUrl: '',
  problemDescription: '',
  returnDate: '',
  items: [
    { id: '1', axis: 'Estrutura', label: 'Prumo e Nivelamento', passed: null },
    { id: '2', axis: 'Estrutura', label: 'Fixação de Painéis', passed: null },
    { id: '3', axis: 'Funcionamento', label: 'Regulagem de Dobradiças', passed: null },
    { id: '4', axis: 'Funcionamento', label: 'Amortecimento de Gavetas', passed: null },
    { id: '5', axis: 'Portas de Correr', label: 'Alinhamento de Trilhos', passed: null },
    { id: '6', axis: 'Acabamento', label: 'Colagem de Fitas de Borda', passed: null },
    { id: '7', axis: 'Acabamento', label: 'Siliconamento de Junções', passed: null },
    { id: '8', axis: 'Limpeza', label: 'Remoção de Resíduos de Cola', passed: null },
    { id: '9', axis: 'Limpeza', label: 'Poeira Interna e Externa', passed: null },
    { id: '10', axis: 'Limpeza', label: 'Brilho das Frentes', passed: null },
  ]
};

export const MOCK_INSTALLERS: Installer[] = [
  {
    id: 'i1', name: 'Carlos Eduardo Silva', cpf: '123.456.789-00', phone: '(11) 98888-1111',
    status: 'Ativo', specialty: 'Cozinhas', observations: 'Especialista em ferragens Blum.',
    installationsCount: 47, averageRating: 9.4, totalBonus: 4230, role: 'Montador'
  },
  {
    id: 'i2', name: 'Fernando Costa', cpf: '234.567.890-11', phone: '(11) 96666-3333',
    status: 'Ativo', specialty: 'Móveis Gerais', observations: '',
    installationsCount: 28, averageRating: 9.1, totalBonus: 2450, role: 'Marceneiro'
  },
  {
    id: 'i3', name: 'Roberto Almeida', cpf: '345.678.901-22', phone: '(11) 97777-2222',
    status: 'Ativo', specialty: 'Closets', observations: 'Montador rápido e limpo.',
    installationsCount: 63, averageRating: 8.7, totalBonus: 5280, role: 'Montador'
  }
];
