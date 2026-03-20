
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { Project, MemorialDescritivo, EnvironmentWithDetails, Task } from "./types";

// Initialize the API with the key from Vite environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Estado para evitar spam de requisições se a cota estiver estourada
let quotaExceededUntil = 0;

/**
 * Helper para executar chamadas com Retry e Backoff Exponencial
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 1, delay = 5000): Promise<T> {
  const now = Date.now();
  if (now < quotaExceededUntil) {
    throw new Error("429: Limite de cota atingido. Aguarde a restauração automática em breve.");
  }

  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message || "";
    // Detecta erros de cota (429 ou RESOURCE_EXHAUSTED)
    const isQuotaError = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota');

    if (isQuotaError) {
      // Bloqueia novas tentativas por 60 segundos para respeitar o limite do Google
      quotaExceededUntil = Date.now() + 60000;

      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 2);
      }
    }
    throw error;
  }
}

export async function analyzeProductionBottlenecks(projects: Project[]) {
  // Legacy function kept for compatibility if needed, but Dashboard now uses analyzeBriefing
  return analyzeDailyBriefing(projects, [], []);
}

export async function analyzeDailyBriefing(projects: Project[], events: any[], assistances: any[]) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const today = new Date().toISOString().split('T')[0];

  const relevantProjects = projects.filter(p => p.currentStatus !== 'Finalizada').map(p => ({
    workName: p.workName,
    client: p.clientName,
    status: p.currentStatus,
    promisedDate: p.promisedDate,
    daysUntilDelivery: Math.ceil((new Date(p.promisedDate).getTime() - new Date().getTime()) / (86400000))
  }));

  const todaysEvents = events.filter(e => e.start.startsWith(today)).map(e => ({
    title: e.title,
    time: e.start.split('T')[1].substring(0, 5),
    type: e.type
  }));

  const urgentAssistances = assistances.filter(a => a.status === 'Aberto' || (a.status === 'Agendado' && a.scheduledDate === today)).map(a => ({
    client: a.clientName,
    problem: a.reportedProblem,
    status: a.status
  }));

  const prompt = `
    Atue como um Gerente de Produção Sênior da Marcenaria ("Hypado Planejados").
    Gere um "Resumo Matinal" (Daily Briefing) curto, motivador e direto para mim (O Dono).
    
    DADOS DE HOJE (${today}):
    
    1. AGENDA DO DIA:
    ${JSON.stringify(todaysEvents)}
    
    2. URGÊNCIAS E ASSISTÊNCIAS:
    ${JSON.stringify(urgentAssistances)}
    
    3. STATUS DA PRODUÇÃO (OBRAS ATIVAS):
    ${JSON.stringify(relevantProjects)}
    
    INSTRUÇÕES:
    - Seja DIRETO e OBJETIVO. Ignore saudações longas.
    - Foco total em: Gargalos de Produção, Entregas Próximas (menos de 5 dias) e Assistências em Aberto.
    - Liste no máximo 3 pontos críticos de atenção.
    - Se houver assistências urgentes, destaque como PRIORIDADE ZERO.
    - Use um tom de Gerente de Operações focado em eficiência.
    - Máximo 3 parágrafos curtos. Use emojis apenas se ajudarem na urgência.
  `;

  try {
    const result = await withRetry(() => model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }
    }));

    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Erro Gemini Briefing:", error);
    if (error?.message?.includes('429')) {
      return "⚠️ O limite de cota da IA foi atingido. Tente novamente em 1 minuto.";
    }
    return "Não foi possível gerar o briefing diário no momento.";
  }
}

export async function analyzeReceipt(base64Image: string, context?: string, mimeType: string = "image/jpeg") {
  // Use gemini-2.0-flash which is multimodal and fast
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = `
    Analise esta imagem/PDF de Nota Fiscal ou Recibo.
    Extraia os itens, quantidades e valores unitários.
    Retorne APENAS um JSON no seguinte formato:
    {
      "items": [
        { 
          "name": "Nome do item na nota", 
          "quantity": 0, 
          "unitPrice": 0.00, 
          "totalPrice": 0.00,
          "category": "CHAPAS" | "FERRAGENS" | "PESSOAL" | "OUTROS",
          "unit": "un" | "m" | "par" | "chapa" | "barra"
        }
      ],
      "totalValue": 0.00,
      "description": "Resumo da nota (Fornecedor e data)"
    }
  `;

  if (context) {
    prompt += `
      ATENÇÃO: Tente corresponder os itens da nota com esta lista de itens esperados do pedido:
      ${context}
      
      Se encontrar um item correspondente, use o nome exato da lista de espera no JSON de retorno para facilitar o vínculo.
    `;
  }

  const imagePart: Part = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  try {
    const result = await withRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          imagePart,
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    }));

    const response = await result.response;
    const text = response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro Visão Gemini:", error);
    return null;
  }
}

export async function analyzeBlueprint(base64Image: string, instructions?: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = `
    Analise esta imagem de planta baixa ou desenho técnico de marcenaria.
    Identifique os móveis e estime os materiais necessários (MDF, Ferragens) para a fabricação.
    
    INSTRUÇÕES EXTRAS DO USUÁRIO: ${instructions || "Nenhuma"}

    Retorne APENAS um JSON no seguinte formato:
    {
      "furniture": [
        { "name": "Nome do Móvel", "description": "Descrição breve" }
      ],
      "materials": [
        { "name": "Nome do Material (ex: MDF Branco, Corrediça)", "quantity": 0, "unit": "Chapa/Un/Par", "unitPrice": 0.00 }
      ],
      "technicalNuances": "Observações técnicas relevantes (ex: pontos de atenção, recortes)"
    }
  `;

  const imagePart: Part = {
    inlineData: {
      data: base64Image,
      mimeType: "image/jpeg",
    },
  };

  try {
    const result = await withRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          imagePart,
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    }));

    const response = await result.response;
    const text = response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro Blueprint Gemini:", error);
    throw error;
  }
}



// Interface auxiliar para os dados do contrato
export interface ContractData {
  clientName: string;
  clientCpf: string;
  clientAddress: string;
  clientContact: string;
  value: number;
  contractDate: string;
  promisedDate: string;
  environments: { name: string; description: string }[];
}

export const parseContractData = async (pdfText: string): Promise<ContractData | null> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Analise o texto extraído de um contrato de móveis planejados e extraia os dados para preencher um formulário de OS.
      
      TEXTO DO CONTRATO:
      ${pdfText}

      INSTRUÇÕES:
      1. Extraia dados do cliente: Nome, CPF, Endereço Completo, Contato (Email/Telefone).
      2. Extraia o valor total do contrato (numérico).
      3. Extraia a lista de ambientes e suas descrições técnicas (Anexo 01).
      4. Extraia datas/prazos se houver (Data de Assinatura, Prazo de Entrega, Prazo de Montagem).
      
      SAÍDA ESPERADA (JSON):
      {
        "clientName": "Nome do Cliente",
        "clientCpf": "CPF",
        "clientAddress": "Endereço Completo",
        "clientContact": "Email/Telefone",
        "value": 0.00,
        "contractDate": "YYYY-MM-DD",
        "promisedDate": "YYYY-MM-DD",
        "environments": [
          {
            "name": "Nome do Ambiente (ex: Cozinha)",
            "colors": { "box": "Cor da Caixaria", "front": "Cor das Frentes" },
            "modules": [
              { 
                "name": "Nome do Módulo (ex: Balcão 2 Portas)",
                "description": "Descrição detalhada",
                "dimensions": "Largura x Altura x Profundidade (se houver)",
                "details": "Atributos variantes separados por vírgula (ex: Porta de Espelho, 4 Gavetas, Amortecedor)" 
              }
            ]
          }
        ]
      }
      
      IMPORTANT:
      - Retorne APENAS o JSON válido.
      - Para 'modules', liste item a item conforme descrito no contrato.
      - Em 'details', capture especificidades como "Porta de Espelho", "Vidro", "Perfil Gola", "Led", etc.
      - Se houver cores definidas (ex: "MDF Branco", "Madeirado"), preencha 'colors'.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(text);
  } catch (error) {
    console.error('Error parsing contract:', error);
    throw new Error('Falha ao processar dados do contrato com IA.');
  }
};

// function formatDatehelper
function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR');
}

export async function generateContract(clientName: string, cpfCnpj: string, projectValue: number, deliveryDate: string, itemsDescription: string) {
  const models = ["gemini-1.5-flash", "gemini-2.0-flash"];

  const prompt = `
    PREENCHA O MODELO DE CONTRATO ABAIXO COM OS DADOS FORNECIDOS.
    Mantenha a formatação Markdown.
    
    DADOS:
    - CONTRATANTE: ${clientName} (CPF/CNPJ: ${cpfCnpj})
    - VALOR TOTAL: R$ ${projectValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
    - DESCRIÇÃO DOS MÓVEIS: ${itemsDescription}
    - DATA DE ENTREGA PREVISTA: ${deliveryDate}
    - DATA DE HOJE: ${formatDate(new Date())}

    MODELO DE CONTRATO (USE ESTE TEXTO BASE):
    
    # CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARCENARIA

    Pelo presente instrumento particular, de um lado **HYPADO PLANEJADOS**, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 00.000.000/0001-00, doravante denominada **CONTRATADA**, e de outro lado **{{CLIENT_NAME}}**, inscrito(a) no CPF/CNPJ sob o nº {{CPF_CNPJ}}, doravante denominado(a) **CONTRATANTE**, ajustam entre si o seguinte:

    ## 1. DO OBJETO
    1.1. O presente contrato tem por objeto a fabricação e instalação de móveis planejados, conforme projeto aprovado e memorial descritivo anexo, abrangendo:
    {{ITEMS_DESCRIPTION}}

    ## 2. DO VALOR E FORMA DE PAGAMENTO
    2.1. Pelos serviços contratados, o(a) CONTRATANTE pagará à CONTRATADA a importância total de **{{VALUE}}**.
    2.2. Forma de pagamento: [Preencher manualmente condições de parcelamento/sinal].

    ## 3. DOS PRAZOS
    3.1. A entrega e instalação dos móveis estão previstas para **{{DELIVERY_DATE}}**, contando-se o prazo a partir da aprovação final do projeto executivo e confirmação das medidas no local (medição fina).
    3.2. O prazo poderá ser prorrogado em caso de força maior, alterações no projeto solicitadas pelo cliente ou impedimento de acesso ao local.

    ## 4. DA GARANTIA E ASSISTÊNCIA TÉCNICA
    4.1. A CONTRATADA oferece garantia de **5 (cinco) anos** contra defeitos de fabricação e montagem, contados a partir da data de finalização da instalação.
    4.2. A garantia não cobre danos causados por mau uso, umidade excessiva (infiltrações), produtos de limpeza inadequados, ou alterações feitas por terceiros.
    4.3. Ferragens e acessórios possuem a garantia de seus respectivos fabricantes.

    ## 5. DAS DISPOSIÇÕES GERAIS
    5.1. O local de instalação deverá estar livre, limpo e com as instalações elétricas e hidráulicas concluídas antes do início da montagem.
    5.2. As partes elegem o foro da comarca local para dirimir quaisquer dúvidas oriundas deste contrato.

    Local e Data: ______________________, {{CURRENT_DATE}}

    __________________________________________
    **HYPADO PLANEJADOS**

    __________________________________________
    **{{CLIENT_NAME}}**
  `;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      console.error(`Erro Contrato Gemini (${modelName}):`, error);
      if (modelName === models[models.length - 1]) return "Erro ao gerar contrato. Tente novamente mais tarde.";
      if (error.message?.includes("429")) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return "Erro desconhecido ao gerar contrato.";
}
// Função para Analisar Plano de Corte (Smart CUT / PCP Express)
export async function analyzeCutList(base64Image: string, mimeType: string = "image/jpeg", instructions?: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
      Analise esta imagem de um relatório de plano de corte (Smart CUT / PCP Express).
      O relatório é uma TABELA com colunas geralmente na ordem: Item, Qtd, Descrição, Categoria, Setor.
      
      SEU OBJETIVO É EXTRAIR TODOS OS ITENS LISTADOS (Do item 1 ao último visível).
      
      REGRAS DE EXTRAÇÃO POR CATEGORIA:
      1. **CHAPAS (MDF)**: Categoria 'CHAPAS'. Extraia a Quantidade (UN) e a Descrição (Nome/Cor/Espessura).
      2. **FITAS (TAPES)**: Categoria 'FITAS'. ATENÇÃO: A coluna 'Qtd' para fitas representa METROS LINEARES (ex: "149 ." significa 149 metros). Extraia o valor numérico como 'quantity' e force a unidade 'Metros'.
      3. **FERRAGENS / ALMOXARIFADO / DISPOSITIVOS**: Inclui categorias 'FERRAGENS', 'ALMOXARIFADO', 'DISPOSITIVOS DE LIGAÇÃO', 'DISPOSITIVOS DE ABERTURA'. Extraia a Quantidade e Descrição.
      4. **PERFIS / ALUMÍNIO**: Categoria 'PERFIS' ou 'ALUMÍNIO'. Extraia a Quantidade e Descrição.
      
      INSTRUÇÕES EXTRAS: ${instructions || "Nenhuma"}
      
      Retorne APENAS um JSON no seguinte formato:
      {
        "mdf": [
          { "name": "Nome Completo do Material", "quantity": 0, "dimensions": "Espessura", "color": "Cor" }
        ],
        "tapes": [
          { "name": "Nome da Fita", "quantity": 0, "unit": "Metros" }
        ],
        "hardware": [
          { "name": "Nome Completo do Item", "quantity": 0, "unit": "Un/Kit/Par/Barra" }
        ]
      }
    `;

  const imagePart: Part = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  try {
    const result = await withRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          imagePart,
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    }));

    const response = await result.response;
    const text = response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro CutList Gemini:", error);
    throw error;
  }
}



export async function processVoiceCommand(command: string, context: { projects: Project[], tasks: Task[] }) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Você é o Assistente de Voz da Marcenaria Hypado.
    Sua tarefa é interpretar o comando do usuário e decidir qual ação tomar.
    
    COMANDO DO USUÁRIO: "${command}"
    
    CONTEXTO DO SISTEMA:
    - Obras Ativas: ${JSON.stringify(context.projects.map(p => ({ id: p.id, nome: p.workName, status: p.currentStatus, cliente: p.clientName })))}
    - Tarefas: ${JSON.stringify(context.tasks.map(t => ({ title: t.title, done: t.done })))}
    
    INSTRUÇÕES:
    1. Se o usuário quer CRIAR uma tarefa (ex: "Crie uma tarefa...", "Lembre-me de...", "Agendar pedido..."), retorne uma ação "CREATE_TASK".
    2. Se o usuário quer SABER algo (ex: "Qual obra está em corte?", "Como está a obra Luciana?"), retorne uma ação "ANSWER".
    3. Se for outra coisa, responda educadamente.
    
    SAÍDA ESPERADA (JSON APENAS):
    {
      "action": "CREATE_TASK" | "ANSWER",
      "data": {
        "taskTitle": "Título da tarefa (se for CREATE_TASK)",
        "answerText": "Resposta curta e falada (se for ANSWER ou confirmação)",
        "priority": "Alta" | "Média" | "Baixa"
      }
    }
    
    REGRAS:
    - Para "CREATE_TASK", o taskTitle deve ser claro e incluir o nome da obra se mencionado.
    - Para "ANSWER", seja direto. Ex: "A obra Luciana está em fase de Corte."
    - Retorne APENAS o JSON.
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro Voice Gemini:", error);
    return { action: "ANSWER", data: { answerText: "Desculpe, tive um problema ao processar seu comando." } };
  }
}

export async function searchAddressWithAI(query: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Como assistente da Marcenaria Hypado, ajude a encontrar o endereço completo para este local:
    LOCAL: "${query}"
    
    INSTRUÇÕES:
    1. Pesquise ou use seus conhecimentos para encontrar o CEP, Logradouro, Bairro e Cidade/UF para este local (especialmente se for um condomínio em Goiânia/GO ou região).
    2. Se for um condomínio, tente identificar o endereço oficial.
    3. Retorne APENAS um JSON no seguinte formato:
    
    SAÍDA ESPERADA:
    {
      "addressStreet": "Nome da Rua/Avenida",
      "addressNeighborhood": "Nome do Bairro",
      "addressCity": "Cidade/UF",
      "addressCep": "00000-000",
      "addressComplement": "Informação extra se houver"
    }
    
    REGRAS:
    - Retorne APENAS o JSON.
    - Se não encontrar, retorne os campos vazios.
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro Address Gemini:", error);
    return null;
  }
}
export async function processRefundReceipt(input: string | { base64Image: string, mimeType: string }, context?: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = `
    Atue como um Especialista em Gestão Financeira Profissional Brasileiro.
    
    OBJETIVO: Extrair dados de Recibos, Notas Fiscais e COMPROVANTES DE PIX/TRANSFERÊNCIA (Cora, Nubank, Itaú, Inter, Bradesco, Santander, etc).
    
    INSTRUÇÕES CRÍTICAS DE EXTRAÇÃO:
    1. VALOR TOTAL (amount): 
       - É o valor monetário principal pago. 
       - Se houver "R$ 150,00", retorne o número 150.00.
       - Padrão Cora/Banks: Se vir "Valor" e logo abaixo um número em R$, esse é o valor.
       - IMPORTANTE: Retorne como um NÚMERO no JSON, não como string. Use ponto para decimais.
    2. FAVORECIDO/ESTABELECIMENTO (establishment): 
       - Identifique QUEM RECEBEU o pagamento (Favorecido).
       - Ignore o "De:" ou "Remetente". Use o "Para:".
    3. DATA (date): Extraia no formato YYYY-MM-DD.
    4. CATEGORIA (category): Sugira uma categoria (Alimentação, Transporte, Suprimentos, Ferramentas, Material, Outros).

    EXEMPLO DE RESPOSTA ESPERADA:
    {
      "date": "2026-02-27",
      "establishment": "Nome do Posto ou Pessoa",
      "amount": 150.00,
      "category": "Alimentação",
      "description": "Comprovante de PIX",
      "isRecognitionSuccessful": true
    }
  `;

  if (context) {
    prompt += `
    5. CONTEXTO DO USUÁRIO: O usuário informou que este gasto refere-se a: "${context}".
       - Use esta informação para ajudar a identificar o estabelecimento ou a categoria se a imagem estiver difícil de ler.
    `;
  }

  prompt += `
    Retorne APENAS um JSON:
    {
      "date": "YYYY-MM-DD",
      "establishment": "Nome de quem recebeu o dinheiro (Favorecido)",
      "cnpj": "00.000.000/0001-00 (se houver)",
      "amount": 0.00,
      "category": "Categoria sugerida",
      "description": "Breve descrição resumida",
      "isRecognitionSuccessful": true/false
    }
  `;

  try {
    let result;
    if (typeof input === 'string') {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt + `\n\nTEXTO DA NOTA:\n${input}` }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
    } else {
      const imagePart: Part = {
        inlineData: {
          data: input.base64Image,
          mimeType: input.mimeType,
        },
      };
      result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            imagePart,
            { text: prompt }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      });
    }

    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro Refund AI:", error);
    return null;
  }
}

export async function analyzeBudget(project: any): Promise<string> {
  try {
    if (!project) throw new Error("Dados da obra não encontrados.");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const totalRevenue = Number(project.value || 0);
    const expenses = Array.isArray(project.expenses) ? project.expenses : (project.expenses ? Object.values(project.expenses) : []);
    const totalExpenses = expenses.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0);
    const grossMargin = totalRevenue - totalExpenses;
    const marginPct = totalRevenue > 0 ? ((grossMargin / totalRevenue) * 100).toFixed(1) : "0";

    const expensesByCategory = expenses.reduce((acc: any, curr: any) => {
      const cat = curr.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + (Number(curr.value) || 0);
      return acc;
    }, {});

    const rawEnvs = project.environmentsDetails;
    const environmentsArray = Array.isArray(rawEnvs) ? rawEnvs : (rawEnvs ? Object.values(rawEnvs) : []);
    const environments = environmentsArray.map((e: any) => ({
      nome: e.name || 'Sem nome',
      valor: Number(e.value || 0),
      percentualServico: Number(e.servicePercentage || 0),
      status: e.currentStatus || 'N/A'
    }));

    const prompt = `
      Você é um ANALISTA DE ORÇAMENTO especialista em marcenaria e móveis planejados.
      Analise os dados financeiros desta OS (Ordem de Serviço) e forneça um diagnóstico profissional.
      
      DADOS DA OBRA:
      - Nome da Obra: "${project.workName || 'N/A'}"
      - Cliente: "${project.clientName || 'N/A'}"
      - Status Atual: "${project.currentStatus || 'N/A'}"
      - Receita Total Contratada: R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      - Custo Total Lançado: R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      - Margem Bruta: R$ ${grossMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      - Margem %: ${marginPct}%
      
      CUSTOS POR CATEGORIA:
      ${JSON.stringify(expensesByCategory, null, 2)}
      
      AMBIENTES / MÓDULOS:
      ${JSON.stringify(environments, null, 2)}
      
      INSTRUÇÕES:
      1. **Diagnóstico de Rentabilidade**: A margem de ${marginPct}% é boa, razoável ou crítica para uma marcenaria? Benchmark do setor é 35-50%.
      2. **Pontos de Atenção Financeiros**: Identifique as categorias de custo que mais impactam a margem.
      3. **Projeção de Risco**: Existe risco de prejuízo? A que percentual de estouro de custo isso acontece?
      4. **Recomendações**: 2-3 ações práticas para melhorar ou proteger a margem desta obra.
      5. **Veredicto Final**: Em uma frase clara, dê o veredicto desta OS (🟢 Lucrativa / 🟡 Atenção / 🔴 Crítica).
      
      Formato: Use Markdown com títulos, bullets e emojis. Seja direto e profissional. Max 300 palavras.
    `;

    const result = await withRetry(() => model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5 }
    }), 2);
    
    return result.response.text();
  } catch (error: any) {
    console.error("Erro Budget AI:", error);
    if (error?.message?.includes('429')) {
      return "⚠️ Limite de cota atingido. O Google restringe o uso gratuito. Tente novamente em 1 minuto.";
    }
    return `Não foi possível gerar a análise. Erro: ${error?.message || 'Conexão interrompida'}. Tente novamente.`;
  }
}
